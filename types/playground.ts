/**
 * API 플레이그라운드에서 클라이언트와 프록시 라우트가 주고받는 타입.
 *
 * 브라우저는 외부 API 를 직접 부르지 않는다(CORS · 시크릿 노출). 요청 정의를
 * `/api/playground/request` 에 넘기면 서버가 대신 호출하고 응답 전문을 돌려준다.
 */

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

/** 쿼리 파라미터 · 헤더 편집기의 한 행 */
export interface KeyValueRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  /** 프리셋이 붙여둔 설명 — 편집기 우측에 흐리게 표시된다. */
  note?: string;
}

export type BodyType = "none" | "json" | "form" | "text";

export type AuthMode = "none" | "naver" | "bearer" | "basic";

export interface AuthConfig {
  mode: AuthMode;
  /** mode === "bearer" 일 때 직접 입력한 토큰 */
  token: string;
  username: string;
  password: string;
}

/** 화면에서 편집 중인 요청 한 건 */
export interface RequestDraft {
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyType: BodyType;
  body: string;
  auth: AuthConfig;
}

/**
 * 프록시 라우트가 받는 페이로드.
 *
 * 쿼리 파라미터와 form 바디를 **문자열로 합치지 않고** 배열/줄 단위로 넘긴다.
 * 서버가 `{{clientSecretSign}}` 같은 변수를 채운 뒤에 인코딩해야, base64 서명의
 * `+` `/` `=` 가 제대로 이스케이프되기 때문이다.
 */
export interface ProxyRequestPayload {
  method: HttpMethod;
  url: string;
  params: { key: string; value: string }[];
  headers: Record<string, string>;
  bodyType: BodyType;
  body?: string;
  /** 밀리초. 기본 30초, 최대 120초 */
  timeoutMs?: number;
}

export interface ProxyResponsePayload {
  /** 2xx 여부 */
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  /** 텍스트 본문. 바이너리면 base64 이고 `bodyEncoding === "base64"`. */
  body: string;
  bodyEncoding: "text" | "base64";
  contentType: string | null;
  sizeBytes: number;
  durationMs: number;
  /** 리다이렉트를 따라간 최종 URL */
  finalUrl: string;
  redirected: boolean;
  /** 서버가 치환한 변수 목록 — 무엇이 실제로 나갔는지 확인용(시크릿은 마스킹) */
  resolvedVars?: Record<string, string>;
}

/** 네트워크 자체가 실패했을 때(타임아웃 · DNS 등) 프록시가 돌려주는 형태 */
export interface ProxyErrorPayload {
  error: string;
  /** 실패까지 걸린 시간 */
  durationMs?: number;
}

/** 히스토리 한 줄 */
export interface HistoryEntry {
  id: string;
  at: number;
  method: HttpMethod;
  url: string;
  status: number | null;
  durationMs: number;
  draft: RequestDraft;
}

/** 네이버 커머스 인증 토큰 발급 응답 */
export interface NaverTokenResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  /** 발급 시각(ms) — 만료 카운트다운에 쓴다. */
  issuedAt: number;
  /** 서명에 사용한 값들 — 플레이그라운드에서 그대로 보여준다. */
  debug: {
    clientId: string;
    timestamp: number;
    clientSecretSign: string;
    type: string;
    endpoint: string;
  };
}
