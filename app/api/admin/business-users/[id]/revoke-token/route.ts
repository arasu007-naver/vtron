import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  DETAIL_COLUMNS,
  REVOKED_TOKEN_COLUMNS,
  TABLE,
  audit,
  isUuid,
  jsonError,
} from "@/lib/business-user/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/business-users/:id/revoke-token — 토큰 폐기(업체 상태는 그대로) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  try {
    const supabase = getAdminSupabase();
    const { data: current, error: readError } = await supabase
      .from(TABLE)
      .select("id, token_prefix")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError) return jsonError(readError.message, 500);
    if (!current) return jsonError("업체를 찾을 수 없습니다.", 404);
    if (!current.token_prefix) return jsonError("폐기할 토큰이 없습니다.", 409);

    const { data, error } = await supabase
      .from(TABLE)
      .update(REVOKED_TOKEN_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .select(DETAIL_COLUMNS)
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError("업체를 찾을 수 없습니다.", 404);

    await audit(supabase, auth, "revoke_token", id, {
      token_prefix: { from: current.token_prefix, to: null },
    });
    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("revoke-token error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
