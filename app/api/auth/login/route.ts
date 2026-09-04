import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

/**
 * 이메일/비밀번호 로그인.
 *
 * 브라우저가 Supabase SDK 를 직접 호출하지 않도록 서버에서 대신 로그인하고,
 * - 세션 쿠키를 구워 페이지 가드(`proxy.ts`)가 쓰게 하고
 * - access token 을 본문으로 돌려줘 이후 API 호출의 Bearer 토큰으로 쓰게 한다.
 */
export async function POST(req: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = await req.json());
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 }
    );
  }

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 모두 입력하세요." },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    // Supabase 는 계정 없음/비밀번호 불일치를 구분하지 않는다(계정 열거 방지).
    const message =
      error?.message === "Invalid login credentials"
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : error?.message || "로그인에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  return NextResponse.json({
    accessToken: data.session.access_token,
    expiresAt: data.session.expires_at ?? null,
    user: { id: data.user?.id, email: data.user?.email },
  });
}
