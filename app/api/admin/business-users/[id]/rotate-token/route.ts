import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { issueToken } from "@/lib/business-user/token";
import { DETAIL_COLUMNS, TABLE, audit, isUuid, jsonError } from "@/lib/business-user/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/business-users/:id/rotate-token
 * 새 토큰을 발급한다(처음 발급도 이것). 기존 토큰은 해시가 바뀌는 순간 무효가 된다. 평문은 이 응답에서 한 번만.
 * 활성 업체만 발급한다.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  try {
    const supabase = getAdminSupabase();
    const { data: current, error: readError } = await supabase
      .from(TABLE)
      .select("id, status, token_prefix")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError) return jsonError(readError.message, 500);
    if (!current) return jsonError("업체를 찾을 수 없습니다.", 404);
    if (current.status !== "active") return jsonError("활성 업체에만 토큰을 발급할 수 있습니다.", 409);

    const issued = issueToken();
    const { data, error } = await supabase
      .from(TABLE)
      .update(issued.columns)
      .eq("id", id)
      .eq("status", "active")
      .is("deleted_at", null)
      .select(DETAIL_COLUMNS)
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError("업체 상태가 바뀌어 발급하지 못했습니다. 새로고침하세요.", 409);

    await audit(supabase, auth, current.token_prefix ? "rotate_token" : "issue_token", id, {
      token_prefix: { from: current.token_prefix, to: issued.columns.token_prefix },
    });
    return NextResponse.json({ item: data, token: issued.token });
  } catch (error) {
    console.error("rotate-token error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
