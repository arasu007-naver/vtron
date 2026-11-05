import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { API_CALL_LOG_TABLE } from "@/lib/business-user/api-call";
import { isUuid, jsonError } from "@/lib/business-user/server";
import { IMAGE_BUCKET, ITEMS_TABLE } from "@/lib/style-id-api/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_URL_TTL_SEC = 600;

/**
 * GET /api/public/test-demo?requestId=&offset=&limit=&filter=ok|failed — 로그인 없이 보는 대량 Style ID 작업 결과(/test-demo).
 *
 * requestId(= api_call_log.id, 추측할 수 없는 UUID)를 아는 사람에게만 보이는 공개 링크다.
 * /api/admin/business-users/:id/jobs/:jobId 와 같은 상품 결과를 주되, 업체 정보(business_user_id · 토큰 · ip)와
 * 서버 쪽 사유(error_detail) · 업로드 사진의 버킷 경로는 내보내지 않는다.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const requestId = url.searchParams.get("requestId") ?? "";
  if (!isUuid(requestId)) return jsonError("결과를 찾을 수 없습니다.", 404);

  const offset = Math.max(0, Math.trunc(Number(url.searchParams.get("offset") ?? "0")) || 0);
  const limit = Math.min(Math.max(1, Math.trunc(Number(url.searchParams.get("limit") ?? "20")) || 20), 100);

  const supabase = getAdminSupabase();
  const { data: row, error: jobError } = await supabase
    .from(API_CALL_LOG_TABLE)
    .select("id, job_status, item_total, item_done, item_failed, request_meta, created_at, finished_at")
    .eq("id", requestId)
    .not("job_status", "is", null)
    .maybeSingle();
  if (jobError) return jsonError(jobError.message, 500);
  if (!row) return jsonError("결과를 찾을 수 없습니다.", 404);
  const meta = (row.request_meta ?? {}) as { file_name?: unknown; format?: unknown };
  const job = {
    ...row,
    request_meta: {
      file_name: typeof meta.file_name === "string" ? meta.file_name : undefined,
      format: typeof meta.format === "string" ? meta.format : undefined,
    },
  };

  let query = supabase
    .from(ITEMS_TABLE)
    .select("seq, ref, product, image_url, image_path, status, prime_group, style_id, result, error, elapsed_ms, finished_at, observation, scoring, prime_target, prime_region")
    .eq("call_id", requestId)
    .order("seq")
    .range(offset, offset + limit - 1);
  const filter = url.searchParams.get("filter");
  if (filter === "ok") query = query.neq("status", "failed");
  else if (filter === "failed") query = query.eq("status", "failed");
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  const rows = data ?? [];
  const paths = rows.map((r) => r.image_path).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, IMAGE_URL_TTL_SEC);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  const items = rows.map(({ image_path, ...r }) => ({
    ...r,
    error_detail: null,
    image_src: r.image_url ?? (image_path ? signed.get(image_path) ?? null : null),
  }));

  return NextResponse.json({ job, items, offset, limit }, { headers: { "Cache-Control": "no-store" } });
}
