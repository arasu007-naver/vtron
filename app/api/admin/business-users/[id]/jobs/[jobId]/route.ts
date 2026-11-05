import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { API_CALL_LOG_TABLE } from "@/lib/business-user/api-call";
import { isUuid, jsonError } from "@/lib/business-user/server";
import { IMAGE_BUCKET, ITEMS_TABLE } from "@/lib/style-id-api/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_URL_TTL_SEC = 600;

/**
 * GET /api/admin/business-users/:id/jobs/:jobId?offset=&limit=&filter=ok|failed
 * 작업 하나의 상품 결과 — 업체 응답(GET /api/v1/style-id/jobs/:id)과 달리 근거(관찰 envelope · 판정 기록 · JEV 결정 · 서버 쪽 사유)까지 준다.
 * 업로드 받은 사진(image_path)은 처리가 끝나면 지우므로 남아 있을 때만 signed URL 을 붙인다.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id, jobId } = await params;
  if (!isUuid(id) || !isUuid(jobId)) return jsonError("작업을 찾을 수 없습니다.", 404);

  const url = req.nextUrl;
  const offset = Math.max(0, Math.trunc(Number(url.searchParams.get("offset") ?? "0")) || 0);
  const limit = Math.min(Math.max(1, Math.trunc(Number(url.searchParams.get("limit") ?? "20")) || 20), 100);

  const supabase = getAdminSupabase();
  const { data: job, error: jobError } = await supabase
    .from(API_CALL_LOG_TABLE)
    .select("id, job_status, item_total, item_done, item_failed, request_meta, created_at, finished_at")
    .eq("id", jobId)
    .eq("business_user_id", id)
    .not("job_status", "is", null)
    .maybeSingle();
  if (jobError) return jsonError(jobError.message, 500);
  if (!job) return jsonError("작업을 찾을 수 없습니다.", 404);

  let query = supabase
    .from(ITEMS_TABLE)
    .select("seq, ref, product, image_url, image_path, status, prime_group, style_id, result, error, error_detail, elapsed_ms, finished_at, observation, scoring, prime_target, prime_region")
    .eq("call_id", jobId)
    .order("seq")
    .range(offset, offset + limit - 1);
  // filter=ok — 실패하지 않은 상품만, filter=failed — 실패한 상품만 (offset · limit 도 거른 목록 기준)
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
    image_src: r.image_url ?? (image_path ? signed.get(image_path) ?? null : null),
  }));

  return NextResponse.json({ job, items, offset, limit }, { headers: { "Cache-Control": "no-store" } });
}
