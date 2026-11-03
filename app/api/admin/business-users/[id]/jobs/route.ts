import { randomUUID } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { API_CALL_LOG_TABLE, type BusinessApiContext } from "@/lib/business-user/api-call";
import { TABLE, audit, isUuid, jsonError } from "@/lib/business-user/server";
import { JobInputError, readJobInput } from "@/lib/style-id-api/job-input";
import { createJob } from "@/lib/style-id-api/jobs";
import { drainStyleIdQueue } from "@/lib/style-id-api/worker";

// POST 는 응답 뒤(after)에 큐를 돌기 시작한다 — /api/v1/style-id/jobs 와 같다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

const AFTER_BUDGET_MS = 740_000;

/**
 * GET /api/admin/business-users/:id/jobs?page=&pageSize=
 * 그 업체의 대량 Style ID 작업(api_call_log 중 job_status 가 있는 행) — 최근 순. /admin/api-log 의 호출 목록.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  const url = req.nextUrl;
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
  const pageSize = Math.min(Math.max(1, Math.trunc(Number(url.searchParams.get("pageSize") ?? "30")) || 30), 100);
  const from = (page - 1) * pageSize;

  const { data, count, error } = await getAdminSupabase()
    .from(API_CALL_LOG_TABLE)
    .select("id, path, status_code, job_status, item_total, item_done, item_failed, request_meta, created_at, finished_at", {
      count: "exact",
    })
    .eq("business_user_id", id)
    .not("job_status", "is", null)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) return jsonError(error.message, 500, { items: [], total: 0 });
  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize });
}

/**
 * POST /api/admin/business-users/:id/jobs — multipart { csv } (형식은 POST /api/v1/style-id/jobs 와 같다)
 * 관리자 화면에서 그 업체 이름으로 대량 Style ID 작업을 넣는다. 평문 API 키는 서버에 없으므로(해시만 보관)
 * 키 대신 업체를 골라 같은 작업 큐에 넣는다 — 작업은 그 업체(business_user_id · token_prefix)의 것으로 남고
 * request_meta.via = "admin" 으로 구분한다. 활성(active) 업체만.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const started = performance.now();
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  const supabase = getAdminSupabase();
  const { data: biz, error: bizError } = await supabase
    .from(TABLE)
    .select("id, business_name, status, token_prefix")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (bizError) return jsonError(bizError.message, 500);
  if (!biz) return jsonError("업체를 찾을 수 없습니다.", 404);
  if (biz.status !== "active" || !biz.token_prefix) return jsonError("API 키가 활성인 업체만 작업을 넣을 수 있습니다.", 403);

  let input: Awaited<ReturnType<typeof readJobInput>>;
  try {
    input = await readJobInput(req);
  } catch (e) {
    if (e instanceof JobInputError) return jsonError(e.message, e.status);
    throw e;
  }
  const { items, format, file_name } = input;

  const ctx: BusinessApiContext = {
    business_user_id: biz.id,
    business_name: biz.business_name,
    token_prefix: biz.token_prefix,
    request_id: randomUUID(),
    log: {
      request: {
        format,
        ...(file_name && { file_name }),
        items: items.length,
        uploaded_images: items.filter((it) => it.image).length,
        with_product_name: items.filter((it) => it.name).length,
        via: "admin",
      },
    },
  };

  try {
    await createJob(req, ctx, items, format);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
  await supabase
    .from(API_CALL_LOG_TABLE)
    .update({ duration_ms: Math.round(performance.now() - started), response_meta: { job_status: "queued", total: items.length } })
    .eq("id", ctx.request_id);
  await audit(supabase, auth, "style_id_job", biz.id, { job_id: ctx.request_id, file_name: file_name ?? null, items: items.length });

  after(() => drainStyleIdQueue({ budgetMs: AFTER_BUDGET_MS }));

  return NextResponse.json({ job_id: ctx.request_id, status: "queued", total: items.length }, { status: 202 });
}
