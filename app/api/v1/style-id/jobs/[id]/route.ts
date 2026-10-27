import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { withBusinessApi } from "@/lib/business-user/api-call";
import { isUuid } from "@/lib/business-user/server";
import { JOB_PUBLIC_COLUMNS, JOB_TABLE, TERMINAL_STATUSES, jobView, type JobRow } from "@/lib/business-user/style-id-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 처리 중인 작업을 다시 조회하기까지 권하는 간격 */
const POLL_AFTER_SEC = 5;

/**
 * GET /api/v1/style-id/jobs/:id — 비동기 작업 상태 · 결과 (본인 업체 작업만)
 *
 * 200 { request_id, job_id, status: queued|running|succeeded|failed|dead, attempts, max_attempts,
 *       created_at, started_at, finished_at, next_run_at,
 *       result,   // succeeded — 동기 엔드포인트 200 응답과 같은 모양 { ok, style_id, style, candidates, axes, elapsed_ms }
 *       error }   // failed(판정 실패 등) · dead(일시 오류가 계속됨)
 *     끝나지 않은 작업이면 Retry-After(초)로 다음 조회 시점을 권한다.
 * 404 없는 작업 · 다른 업체의 작업
 */
export const GET = withBusinessApi(async (_req, ctx, { params }: Params) => {
  const { id } = await params;
  const notFound = () => {
    ctx.log.error = "job_not_found";
    return NextResponse.json({ request_id: ctx.request_id, error: "작업을 찾을 수 없습니다." }, { status: 404 });
  };
  ctx.log.request = { job_id: id };
  if (!isUuid(id)) return notFound();

  const { data, error } = await getAdminSupabase()
    .from(JOB_TABLE)
    .select(JOB_PUBLIC_COLUMNS)
    .eq("id", id)
    .eq("business_user_id", ctx.business_user_id)
    .maybeSingle();
  if (error) throw new Error(`${JOB_TABLE} 조회 실패: ${error.message}`);
  if (!data) return notFound();

  const job = data as JobRow;
  ctx.log.response = { status: job.status, attempts: job.attempts };
  const done = TERMINAL_STATUSES.includes(job.status);
  return NextResponse.json(
    { request_id: ctx.request_id, ...jobView(job) },
    { headers: done ? undefined : { "Retry-After": String(POLL_AFTER_SEC) } }
  );
});
