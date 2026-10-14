import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 관리자 게이트 — vtron 은 직원 전용이다.
 *
 * stmx-web 과 **같은 Supabase 프로젝트**라서, 앱 사용자(크리에이터 포함)도 같은 계정으로 vtron 에
 * 로그인할 수 있다. 그래서 로그인만으로는 들이지 않고 `profiles.is_admin` 이 true 인 계정만 들인다.
 * stmx-web 의 관리자 화면(`/manager/*`)과 같은 기준이다.
 *
 * 검사하는 곳은 셋이다.
 *  - `/api/auth/login`  — 관리자가 아니면 세션을 만들지 않고 403.
 *  - `proxy.ts`         — 이미 세션이 있는 비관리자는 로그아웃시키고 `/login?error=forbidden` 으로.
 *  - `authenticate()`   — API 에 온 사용자 토큰도 관리자만 통과(예외 라우트는 `allowNonAdmin`).
 *
 * 이 파일은 로그인 화면(클라이언트)도 문구를 가져다 쓰므로 서버 전용 모듈을 import 하지 않는다.
 */

export const NOT_ADMIN_MESSAGE = "관리자 계정만 사용할 수 있습니다.";

/** 로그인 화면으로 보낼 때 붙이는 `?error=` 값. */
export const NOT_ADMIN_ERROR = "forbidden";

/**
 * `client` 의 권한으로 본인 profiles 행을 읽어 `is_admin` 을 본다(본인 행은 RLS 가 허용한다).
 * 읽지 못하면 관리자가 아닌 것으로 본다(fail closed).
 */
export async function isAdmin(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin-gate] profiles.is_admin read failed:", error.message);
    return false;
  }
  return data?.is_admin === true;
}
