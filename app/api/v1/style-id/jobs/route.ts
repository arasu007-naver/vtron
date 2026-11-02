import { after, NextResponse } from "next/server";
import { withBusinessApi } from "@/lib/business-user/api-call";
import { JobInputError, MAX_ITEMS, readJobInput } from "@/lib/style-id-api/job-input";
import { createJob, jobView, listJobs } from "@/lib/style-id-api/jobs";
import { drainStyleIdQueue } from "@/lib/style-id-api/worker";

// 응답 뒤(after)에 이 서버가 큐를 돌기 시작한다 — 함수가 살아 있는 동안만 돈다. 남은 것은 큐 워커가 이어 받는다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

/** after 에서 큐를 돌 시간 — maxDuration 보다 여유를 둔다 */
const AFTER_BUDGET_MS = 740_000;

/**
 * POST /api/v1/style-id/jobs — 상품 여러 개 → 대량 Style ID 추출 작업 (외부 업체용)
 *
 *   Authorization: Bearer stmx_live_…
 *   Content-Type: application/json      { "items": [ { "product": {…} | "<JSON 문자열>", "image_url": "https://…" | "image": "<base64>" } ] }
 *                 text/csv              머리 줄: product(JSON) 또는 id,name,whole_category_name  +  image_url
 *                 multipart/form-data   csv(파일) | items(JSON 글) | product + image 를 같은 수만큼
 *   상품 정보는 내부 상품 정보와 같은 이름 — id(결과의 ref) · name · whole_category_name(category)
 *   자세한 형식은 lib/style-id-api/job-input.ts
 *
 * 요청을 작업 목록(api_call_log, job_status = queued)에 먼저 남기고 상품마다 큐(api_call_items)에 넣은 뒤 바로 답한다.
 * 처리는 두 단계다 (lib/style-id-api/worker.ts):
 *   ① 모든 상품의 대표 의복을 JEV 로 먼저 정해 found(확정) · not_found(못 정함) · no_product(상품명 없음)로 나눈다
 *   ② 그다음 그룹마다 모아서 관찰 · 판정한다 — found 는 그 의복만 관찰, not_found · no_product 는 이미지로 대표 의복을 고른다
 *
 * 202 { request_id, job_id, status: "queued", total, status_url }   // job_id = request_id
 * 400 · 413 · 415 입력 오류 (하나라도 틀리면 작업 전체를 받지 않는다 — error 에 위치가 있다)
 *
 * GET /api/v1/style-id/jobs?limit= — 이 업체의 최근 작업 (최대 100)
 */
export const POST = withBusinessApi(async (req, ctx) => {
  const fail = (status: number, error: string, internal?: string) => {
    ctx.log.error = internal ?? error;
    return NextResponse.json({ request_id: ctx.request_id, ok: false, error }, { status });
  };

  let input: Awaited<ReturnType<typeof readJobInput>>;
  try {
    input = await readJobInput(req);
  } catch (e) {
    if (e instanceof JobInputError) return fail(e.status, e.message);
    throw e;
  }
  const { items, format } = input;
  ctx.log.request = {
    format,
    items: items.length,
    uploaded_images: items.filter((it) => it.image).length,
    with_product_name: items.filter((it) => it.name).length,
  };

  await createJob(req, ctx, items, format);
  ctx.log.response = { job_status: "queued", total: items.length };

  after(() => drainStyleIdQueue({ budgetMs: AFTER_BUDGET_MS }));

  return NextResponse.json(
    {
      request_id: ctx.request_id,
      ok: true,
      job_id: ctx.request_id,
      status: "queued",
      total: items.length,
      max_items: MAX_ITEMS,
      status_url: `/api/v1/style-id/jobs/${ctx.request_id}`,
    },
    { status: 202 }
  );
});

export const GET = withBusinessApi(async (req, ctx) => {
  const limit = Math.min(Math.max(1, Math.trunc(Number(new URL(req.url).searchParams.get("limit") ?? "20")) || 20), 100);
  const jobs = await listJobs(ctx.business_user_id, limit);
  ctx.log.response = { jobs: jobs.length };
  return NextResponse.json({ request_id: ctx.request_id, jobs: jobs.map(jobView) });
});
