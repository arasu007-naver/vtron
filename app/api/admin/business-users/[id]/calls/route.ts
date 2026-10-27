import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { API_CALL_LOG_TABLE } from "@/lib/business-user/api-call";
import { isUuid, jsonError } from "@/lib/business-user/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/business-users/:id/calls?page=&pageSize=
 * 그 업체의 외부 API 호출 내역(api_call_log) — 최근 순. 지운 업체도 볼 수 있다.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  const url = req.nextUrl;
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
  const pageSize = Math.min(Math.max(1, Math.trunc(Number(url.searchParams.get("pageSize") ?? "20")) || 20), 100);
  const from = (page - 1) * pageSize;

  const { data, count, error } = await getAdminSupabase()
    .from(API_CALL_LOG_TABLE)
    .select("id, method, path, status_code, duration_ms, error, request_meta, response_meta, ip, token_prefix, created_at", {
      count: "exact",
    })
    .eq("business_user_id", id)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) return jsonError(error.message, 500, { items: [], total: 0 });
  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize });
}
