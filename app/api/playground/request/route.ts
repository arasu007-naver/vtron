import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { serverVars } from "@/lib/playground/naver";
import { substitute } from "@/lib/playground/vars";
import type {
  ProxyRequestPayload,
  ProxyResponsePayload,
} from "@/types/playground";

/**
 * 플레이그라운드 프록시.
 *
 * 브라우저 대신 서버가 외부 API 를 호출한다. 이유는 둘이다.
 *
 * 1. CORS — 커머스 API 는 브라우저 오리진을 허용하지 않는다.
 * 2. 시크릿 — 애플리케이션 시크릿과 그 파생 서명은 서버에만 둔다.
 *    요청 정의에 남아 있는 `{{clientId}}` · `{{clientSecretSign}}` · `{{timestamp}}`
 *    는 여기서 채운다.
 *
 * 응답은 상태·헤더·본문·소요시간을 **가공 없이** 돌려준다. 4xx/5xx 도 그대로
 * 보여주는 게 이 페이지의 목적이므로, 실패를 성공처럼 감싸지 않는다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
/** 본문이 이보다 크면 잘라서 돌려준다(브라우저가 죽지 않게). */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

/** 클라우드 메타데이터 등 나가면 안 되는 목적지 */
const BLOCKED_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.goog",
]);

/** fetch 가 직접 관리하는 헤더 — 사용자가 넣어도 무시한다. */
const FORBIDDEN_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "expect",
]);

const isTextual = (contentType: string | null) => {
  if (!contentType) return true;
  const ct = contentType.toLowerCase();
  return (
    ct.startsWith("text/") ||
    ct.includes("json") ||
    ct.includes("xml") ||
    ct.includes("javascript") ||
    ct.includes("x-www-form-urlencoded") ||
    ct.includes("csv")
  );
};

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  let payload: ProxyRequestPayload;
  try {
    payload = (await req.json()) as ProxyRequestPayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { vars, masked } = serverVars();
  const resolve = (value: string) => substitute(value, vars);

  const rawUrl = resolve(payload.url ?? "").trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "URL 을 입력하세요." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { error: `URL 을 해석할 수 없습니다: ${rawUrl}` },
      { status: 400 }
    );
  }

  // 변수를 채운 뒤에 인코딩한다 — 서명 값의 `+` `/` `=` 가 살아남아야 한다.
  for (const { key, value } of payload.params ?? []) {
    if (!key.trim()) continue;
    target.searchParams.append(key.trim(), resolve(value ?? ""));
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json(
      { error: `지원하지 않는 프로토콜입니다: ${target.protocol}` },
      { status: 400 }
    );
  }
  if (BLOCKED_HOSTS.has(target.hostname)) {
    return NextResponse.json(
      { error: `차단된 호스트입니다: ${target.hostname}` },
      { status: 400 }
    );
  }

  const method = (payload.method ?? "GET").toUpperCase();

  const headers = new Headers();
  for (const [key, value] of Object.entries(payload.headers ?? {})) {
    if (!key.trim() || FORBIDDEN_HEADERS.has(key.trim().toLowerCase())) continue;
    try {
      headers.set(key.trim(), resolve(value));
    } catch {
      return NextResponse.json(
        { error: `헤더 값이 올바르지 않습니다: ${key}` },
        { status: 400 }
      );
    }
  }

  const hasBody =
    method !== "GET" &&
    method !== "HEAD" &&
    payload.bodyType !== "none" &&
    payload.body != null;

  let body: string | undefined;
  if (hasBody) {
    const raw = payload.body as string;
    if (payload.bodyType === "form") {
      // `key=value` 줄들 → 변수 치환 후 x-www-form-urlencoded 로 인코딩
      const form = new URLSearchParams();
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        const key = eq === -1 ? trimmed : trimmed.slice(0, eq);
        const value = eq === -1 ? "" : trimmed.slice(eq + 1);
        form.append(key.trim(), resolve(value));
      }
      body = form.toString();
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/x-www-form-urlencoded");
      }
    } else {
      body = resolve(raw);
      if (!headers.has("content-type") && payload.bodyType === "json") {
        headers.set("content-type", "application/json");
      }
    }
  }

  const timeoutMs = Math.min(
    Math.max(payload.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000),
    MAX_TIMEOUT_MS
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(target, {
      method,
      headers,
      body,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    const buffer = Buffer.from(await res.arrayBuffer());
    const durationMs = Date.now() - startedAt;
    const contentType = res.headers.get("content-type");
    const truncated = buffer.subarray(0, MAX_BODY_BYTES);
    const textual = isTextual(contentType);

    const result: ProxyResponsePayload = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: textual
        ? truncated.toString("utf-8") +
          (buffer.length > MAX_BODY_BYTES ? "\n… (본문이 잘렸습니다)" : "")
        : truncated.toString("base64"),
      bodyEncoding: textual ? "text" : "base64",
      contentType,
      sizeBytes: buffer.length,
      durationMs,
      finalUrl: res.url || target.toString(),
      redirected: res.redirected,
      resolvedVars: masked,
    };

    return NextResponse.json(result);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? `${timeoutMs}ms 안에 응답이 없어 중단했습니다.`
          : `요청에 실패했습니다: ${
              error instanceof Error ? error.message : String(error)
            }`,
        durationMs,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
