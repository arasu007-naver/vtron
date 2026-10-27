/**
 * 스타일 아이디 작업(style_id_job) 재시도 규칙 — 오류 분류 · 백오프 계산. 워커(scripts/style-id-worker.mjs)가 쓴다.
 *
 *   일시 오류  → 재시도: Anthropic 429 · 529 · 5xx · 408 · 409, 타임아웃, 네트워크 오류, 우리 쪽 인프라 오류
 *   영구 실패  → 재시도하지 않는다: 의복 미검출 같은 판정 실패, 4xx 입력 오류, 관찰 출력이 잘리거나 깨짐
 *
 * 다음 실행까지의 대기 = 지수 백오프(base · 2^(attempt-1), cap 까지) + 지터(절반은 고정, 절반은 무작위).
 * 서버가 retry-after 를 주면 그보다 일찍 다시 부르지 않는다.
 *
 * 외부 의존이 없다 — Node 가 타입만 지우고 바로 읽는다(lib/business-user/tests/job-retry.test.mjs).
 */

/** 실패 하나를 설명하는 값 — 던져진 오류(errorInfoOf)나 관찰 실패(observation.error)에서 만든다 */
export interface FailureInfo {
  /** HTTP 상태(Anthropic APIError.status 등) */
  status?: number | null;
  /** 엔진 코드(TIMEOUT · CALL_FAILED · PARSE …)나 Node 오류 코드(ECONNRESET …) */
  code?: string | null;
  /** 오류 클래스 이름(RateLimitError · APIConnectionTimeoutError …) */
  name?: string | null;
  message?: string | null;
  /** 서버가 준 retry-after(ms) */
  retryAfterMs?: number | null;
  /** 우리 쪽 인프라(Storage · DB) 오류 — 늘 재시도 */
  infra?: boolean;
}

export interface Classification {
  retryable: boolean;
  /** 로그 · last_error 에 남기는 짧은 사유 */
  reason: string;
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 529]);

const NETWORK_CODES = new Set([
  "TIMEOUT",
  "VISION_TIMEOUT",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

const RETRYABLE_NAMES = new Set([
  "RateLimitError",
  "InternalServerError",
  "APIConnectionError",
  "APIConnectionTimeoutError",
  "TimeoutError",
  "AbortError",
]);

/** 메시지로만 알 수 있는 일시 오류 — SDK 가 상태를 잃고 문자열만 남긴 경우(엔진 runOneCall 이 오류를 문자열로 바꾼다) */
const TRANSIENT_MESSAGE =
  /overloaded|rate[_ ]limit|timed? ?out|timeout|connection error|socket hang up|fetch failed|network|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|temporarily unavailable|service unavailable|bad gateway|gateway timeout/i;

/** "429 {…}" 처럼 SDK 오류 메시지 앞에 붙은 HTTP 상태 */
export function statusFromMessage(message: string | null | undefined): number | null {
  const m = message?.match(/^\s*(\d{3})\b/);
  return m ? Number(m[1]) : null;
}

export function classifyFailure(f: FailureInfo): Classification {
  if (f.infra) return { retryable: true, reason: "infra" };

  const status = f.status ?? statusFromMessage(f.message);
  if (status != null) {
    if (RETRYABLE_STATUS.has(status) || status >= 500) return { retryable: true, reason: `http_${status}` };
    // 401 · 403 = 우리 API 키 · 워크스페이스 설정 문제 — 고치면 같은 작업이 성공하므로 재시도한다(결국 dead 로 끝날 수 있다)
    if (status === 401 || status === 403) return { retryable: true, reason: `http_${status}_auth` };
    if (status >= 400) return { retryable: false, reason: `http_${status}` };
  }

  if (f.code && NETWORK_CODES.has(f.code)) return { retryable: true, reason: /TIMEOUT$/.test(f.code) ? "timeout" : `network_${f.code}` };
  if (f.name && RETRYABLE_NAMES.has(f.name)) return { retryable: true, reason: f.name };
  if (f.message && TRANSIENT_MESSAGE.test(f.message)) return { retryable: true, reason: "transient_message" };

  return { retryable: false, reason: f.code ? `permanent_${f.code}` : "permanent" };
}

/**
 * retry-after 헤더 → ms. 초(정수 · 소수)나 HTTP 날짜. retry-after-ms 가 있으면 그것을 먼저 본다.
 * 읽을 수 없거나 음수면 null.
 */
export function parseRetryAfter(
  retryAfter: string | null | undefined,
  retryAfterMs?: string | null,
  now: number = Date.now()
): number | null {
  if (retryAfterMs != null && retryAfterMs.trim() !== "") {
    const ms = Number(retryAfterMs);
    if (Number.isFinite(ms) && ms >= 0) return Math.round(ms);
  }
  if (retryAfter == null || retryAfter.trim() === "") return null;
  const s = retryAfter.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 1000);
  if (/^[+-]?\d/.test(s)) return null; // 음수 · 숫자 꼴인데 초가 아님 — Date.parse("-5") 같은 오해를 막는다
  const at = Date.parse(s);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}

export interface BackoffOptions {
  /** 첫 재시도 기준 대기(ms) */
  baseMs?: number;
  /** 대기 상한(ms) — retry-after 도 이 값의 4배를 넘기지 않는다 */
  capMs?: number;
  /** [0, 1) 난수 — 테스트에서 고정한다 */
  random?: () => number;
}

export const DEFAULT_BACKOFF_BASE_MS = 30_000;
export const DEFAULT_BACKOFF_CAP_MS = 15 * 60_000;

/**
 * attempt 번째 실패 뒤 다음 실행까지 대기(ms). attempt 는 1부터(첫 실패 = 1).
 *   exp   = min(cap, base · 2^(attempt-1))
 *   delay = exp/2 + random · exp/2          (equal jitter — 0 으로 몰리지 않고 워커들이 흩어진다)
 *   retry-after 가 있으면 max(delay, retry-after)
 */
export function backoffMs(attempt: number, retryAfterMs?: number | null, opts: BackoffOptions = {}): number {
  const base = opts.baseMs ?? DEFAULT_BACKOFF_BASE_MS;
  const cap = opts.capMs ?? DEFAULT_BACKOFF_CAP_MS;
  const random = opts.random ?? Math.random;
  const n = Math.max(1, Math.floor(attempt));
  const exp = Math.min(cap, base * 2 ** Math.min(n - 1, 30));
  const delay = exp / 2 + random() * (exp / 2);
  const hint = retryAfterMs != null && retryAfterMs > 0 ? Math.min(retryAfterMs, cap * 4) : 0;
  return Math.round(Math.max(delay, hint));
}

/** SDK 오류 클래스 이름(RateLimitError …) — 평범한 Error · 객체면 null */
const classNameOf = (e: object): string | null => {
  const name = (e as { constructor?: { name?: unknown } }).constructor?.name;
  return typeof name === "string" && name !== "Object" && name !== "Error" ? name : null;
};

/** 던져진 오류 → FailureInfo. Anthropic APIError(status · headers) · Node 오류(code) · cause 를 본다. */
export function errorInfoOf(e: unknown): FailureInfo {
  if (e == null || typeof e !== "object") return { message: String(e) };
  const err = e as {
    status?: unknown;
    code?: unknown;
    name?: unknown;
    message?: unknown;
    headers?: unknown;
    cause?: unknown;
  };
  const headers = err.headers as { get?: (k: string) => string | null } | Record<string, string> | undefined;
  const header = (k: string): string | null => {
    if (!headers) return null;
    if (typeof (headers as { get?: unknown }).get === "function") return (headers as { get: (k: string) => string | null }).get(k);
    return (headers as Record<string, string>)[k] ?? null;
  };
  const cause = err.cause as { code?: unknown } | undefined;
  const code = typeof err.code === "string" ? err.code : typeof cause?.code === "string" ? cause.code : null;
  return {
    status: typeof err.status === "number" ? err.status : null,
    code,
    name: classNameOf(e) ?? (typeof err.name === "string" ? err.name : null),
    message: typeof err.message === "string" ? err.message : String(e),
    retryAfterMs: parseRetryAfter(header("retry-after"), header("retry-after-ms")),
  };
}
