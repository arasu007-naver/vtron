import { createServerClient } from "@supabase/ssr";
import { createClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./env";

/**
 * API 라우트에서 쓰는 Supabase 헬퍼.
 *
 * - `createRouteClient()` — 쿠키 세션에 묶인 클라이언트. `/api/auth/*` 가
 *   로그인/로그아웃으로 세션 쿠키를 굽고 갱신하는 데 쓴다. 페이지 가드(`proxy.ts`)가
 *   읽는 것도 이 쿠키다.
 * - `authenticate()` — `Authorization: Bearer <access_token>` 헤더를 검증한다.
 *   브라우저는 Supabase SDK 를 직접 호출하지 않고 이 토큰으로 API 를 호출한다.
 */

export async function createRouteClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // 쿠키를 쓸 수 없는 컨텍스트(Server Component 등)에서는 무시한다.
          // 세션 갱신은 proxy.ts 가 담당한다.
        }
      },
    },
  });
}

export const getBearerToken = (req: Request): string | null => {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
};

export interface AuthContext {
  user: User;
  token: string;
}

/**
 * Bearer 토큰을 Auth 서버에 검증시킨다.
 * 토큰이 없거나 유효하지 않으면 null.
 */
export async function authenticate(req: Request): Promise<AuthContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return { user: data.user, token };
}

/**
 * 세션 인증 실패 401.
 *
 * `WWW-Authenticate: Bearer` 를 붙여 **애플리케이션 레벨 401**(예: FASHN API 키
 * 문제로 /api/tryon 이 돌려주는 401)과 구분한다. 클라이언트의 `authFetch()` 는
 * 이 헤더가 있을 때만 토큰을 갱신하고 로그인 페이지로 보낸다.
 */
export const unauthorized = (message = "인증이 필요합니다. 다시 로그인하세요.") =>
  NextResponse.json(
    { error: message, requiresAuth: true },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
  );
