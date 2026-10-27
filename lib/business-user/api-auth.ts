/**
 * 외부 API 인증 — `Authorization: Bearer stmx_live_…` (업체 API 키).
 *
 *   토큰 형식이 틀리거나 · 없는 토큰 · 지운 업체   → 401
 *   업체가 active 가 아님(정지 등)                 → 403
 *   통과하면 token_last_used_at 을 갱신한다(1분 디바운스).
 *
 * 관리자 세션용 `authenticate()`(lib/supabase/route.ts)와 별개다. 레이트리밋은 두지 않는다(스펙 결정).
 * 라우트는 이 함수를 직접 쓰지 않고 호출 내역까지 남기는 `withBusinessApi()`(api-call.ts)로 감싼다.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { getBearerToken } from "@/lib/supabase/route";
import { hashToken, isTokenFormat, tokenDisplayPrefix } from "./token";
import { TABLE } from "./server";

export interface BusinessAuthContext {
  business_user_id: string;
  business_name: string;
  token_prefix: string;
}

export type BusinessAuthResult =
  | { ok: true; context: BusinessAuthContext }
  | {
      ok: false;
      response: NextResponse;
      /** 호출 내역용 — 403(정지)처럼 업체를 알 때만 */
      business_user_id: string | null;
      token_prefix: string | null;
      reason: string;
    };

const LAST_USED_DEBOUNCE_MS = 60_000;

const deny = (
  status: 401 | 403 | 500,
  message: string,
  reason: string,
  token_prefix: string | null = null,
  business_user_id: string | null = null
) => ({
  ok: false as const,
  response: NextResponse.json(
    { error: message },
    { status, headers: status === 401 ? { "WWW-Authenticate": 'Bearer realm="stmx"' } : undefined }
  ),
  business_user_id,
  token_prefix,
  reason,
});

export async function authenticateBusiness(
  req: Request,
  supabase: SupabaseClient = getAdminSupabase()
): Promise<BusinessAuthResult> {
  const token = getBearerToken(req);
  if (!token) return deny(401, "유효한 API 키가 필요합니다.", "no_token");
  if (!isTokenFormat(token)) return deny(401, "유효한 API 키가 필요합니다.", "bad_format");
  const prefix = tokenDisplayPrefix(token);

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, business_name, status, deleted_at, token_last_used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) {
    console.error("[api-auth] business_user lookup failed:", error.message);
    return deny(500, "인증 서버 오류", `lookup_failed: ${error.message}`, prefix);
  }
  if (!data) return deny(401, "유효한 API 키가 필요합니다.", "unknown_token", prefix);
  if (data.deleted_at) return deny(401, "유효한 API 키가 필요합니다.", "deleted_business", prefix, data.id);
  if (data.status !== "active") {
    return deny(403, "사용이 정지된 API 키입니다.", `status_${data.status}`, prefix, data.id);
  }

  const last = data.token_last_used_at ? Date.parse(data.token_last_used_at) : 0;
  if (Date.now() - last >= LAST_USED_DEBOUNCE_MS) {
    const { error: touchError } = await supabase
      .from(TABLE)
      .update({ token_last_used_at: new Date().toISOString() })
      .eq("id", data.id);
    if (touchError) console.error("[api-auth] token_last_used_at update failed:", touchError.message);
  }

  return {
    ok: true,
    context: { business_user_id: data.id, business_name: data.business_name, token_prefix: prefix },
  };
}
