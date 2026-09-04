import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 쿠키 세션에서 현재 사용자와 최신 access token 을 돌려준다.
 *
 * access token 은 만료되므로 클라이언트는 메모리에만 들고 있다가,
 * 없거나 401 을 받으면 이 엔드포인트로 다시 받아온다.
 * `createRouteClient` 가 필요하면 refresh token 으로 갱신하고 쿠키도 갱신한다.
 */
export async function GET() {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = await createRouteClient();

  // getUser() 는 Auth 서버에 토큰을 검증시킨다(만료 시 갱신도 함께 일어난다).
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "세션이 없습니다.", requiresAuth: true },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json(
      { error: "세션이 없습니다.", requiresAuth: true },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  return NextResponse.json({
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
    user: { id: user.id, email: user.email },
  });
}
