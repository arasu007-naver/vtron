"use client";

/**
 * 클라이언트에서 API 를 호출하는 유일한 경로.
 *
 * 브라우저는 Supabase SDK 를 직접 호출하지 않는다. 로그인은 `/api/auth/login`
 * 이 대신 수행하고, 이후 모든 API 호출에는 `Authorization: Bearer <access_token>`
 * 을 붙인다.
 *
 * access token 은 XSS 노출 면을 줄이기 위해 **메모리에만** 둔다. 새로고침 후에는
 * 쿠키 세션을 근거로 `/api/auth/session` 에서 다시 받아온다.
 */

let accessToken: string | null = null;
let inFlightRefresh: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

/** 쿠키 세션에서 최신 access token 을 받아온다. 동시 호출은 하나로 합친다. */
async function refreshAccessToken(): Promise<string | null> {
  inFlightRefresh ??= (async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const data = await res.json();
      accessToken = typeof data.accessToken === "string" ? data.accessToken : null;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

/**
 * 세션 인증 실패인지 판별한다.
 *
 * 401 이라고 모두 세션 문제는 아니다. 예를 들어 `/api/tryon` 은 FASHN API 키가
 * 없거나 잘못됐을 때도 401 을 돌려준다. 그때 로그인 페이지로 튕기면 원인을 알 수
 * 없게 되므로, 서버가 `WWW-Authenticate: Bearer` 를 붙인 401 만 세션 문제로 본다.
 */
const isSessionExpired = (res: Response) =>
  res.status === 401 &&
  (res.headers.get("www-authenticate") ?? "").toLowerCase().includes("bearer");

export interface AuthFetchOptions extends RequestInit {
  /** 401 이 끝까지 해소되지 않을 때 /login 으로 보낼지 여부 (기본 true) */
  redirectOnUnauthorized?: boolean;
}

/**
 * Bearer 토큰을 붙여 API 를 호출한다.
 * 401 을 받으면 토큰을 한 번 갱신해 재시도하고, 그래도 실패하면 로그인 페이지로 보낸다.
 */
export async function authFetch(
  input: string,
  { redirectOnUnauthorized = true, ...init }: AuthFetchOptions = {}
): Promise<Response> {
  const call = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  const token = accessToken ?? (await refreshAccessToken());
  let res = await call(token);

  if (isSessionExpired(res)) {
    const fresh = await refreshAccessToken();
    if (fresh && fresh !== token) {
      res = await call(fresh);
    }
  }

  if (isSessionExpired(res) && redirectOnUnauthorized) {
    accessToken = null;
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href =
      next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
  }

  return res;
}

/** 로그인 — 성공하면 세션 쿠키가 구워지고 access token 을 메모리에 보관한다. */
export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "로그인에 실패했습니다.");
  }

  setAccessToken(data.accessToken ?? null);
  return data;
}

/** 로그아웃 — 세션 쿠키를 정리하고 메모리의 토큰도 버린다. */
export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}
