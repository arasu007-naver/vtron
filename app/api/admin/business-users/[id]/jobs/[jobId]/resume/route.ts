import { after, NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { anthropicApiKey } from "@/lib/style-ex/api-key";
import { audit, isUuid, jsonError } from "@/lib/business-user/server";
import { getJob, resumeJob } from "@/lib/style-id-api/jobs";
import { drainStyleIdQueue } from "@/lib/style-id-api/worker";

// 응답 뒤(after)에 큐를 돌기 시작한다 — POST /api/admin/business-users/:id/jobs 와 같다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

const AFTER_BUDGET_MS = 740_000;

/**
 * POST /api/admin/business-users/:id/jobs/:jobId/resume — 끝나지 않은(실패 · 일부 실패 · 멈춘) 작업을 다시 진행한다.
 * 실패한 상품을 큐로 되돌리고(lib/style-id-api/jobs.ts resumeJob) 큐를 돌린다. 대기 중인 상품만 남은 작업은 큐만 다시 돌린다.
 * 200 { job_id, reprimed, requeued, skipped }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id, jobId } = await params;
  if (!isUuid(id) || !isUuid(jobId)) return jsonError("작업을 찾을 수 없습니다.", 404);
  if (!anthropicApiKey()) return jsonError("Anthropic API 키가 없어 다시 진행할 수 없습니다.", 503);

  const job = await getJob(jobId, id);
  if (!job) return jsonError("작업을 찾을 수 없습니다.", 404);
  if (job.job_status === "done") return jsonError("이미 모두 끝난 작업입니다.", 409);

  let counts: Awaited<ReturnType<typeof resumeJob>>;
  try {
    counts = await resumeJob(jobId);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
  await audit(getAdminSupabase(), auth, "style_id_job_resume", id, { job_id: jobId, ...counts });

  after(() => drainStyleIdQueue({ budgetMs: AFTER_BUDGET_MS }));

  return NextResponse.json({ job_id: jobId, ...counts });
}
