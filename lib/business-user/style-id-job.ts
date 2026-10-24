/**
 * 스타일 아이디 비동기 작업(style_id_job, supabase/migrations/0020_style_id_job.sql) — 라우트 쪽 헬퍼.
 * 작업 처리는 scripts/style-id-worker.mjs 가 한다.
 */
export const JOB_TABLE = "style_id_job";
export const JOB_BUCKET = "style-id-jobs";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";
export const TERMINAL_STATUSES: readonly JobStatus[] = ["succeeded", "failed", "dead"];

/** 업체별 미완료(queued · running) 작업 상한 */
export const DEFAULT_MAX_PENDING_JOBS = 1000;

/** 응답에 싣는 열 — last_error · locked_by · image_path 는 빠진다 */
export const JOB_PUBLIC_COLUMNS =
  "id, status, image_sha256, product_name, product_category, attempts, max_attempts, next_run_at, result, created_at, started_at, finished_at";

export interface JobRow {
  id: string;
  status: JobStatus;
  image_sha256: string;
  product_name: string | null;
  product_category: string | null;
  attempts: number;
  max_attempts: number;
  next_run_at: string;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

/** Idempotency-Key — 보이는 ASCII 1–200자 */
export const isIdempotencyKey = (v: string) => /^[\x21-\x7e]{1,200}$/.test(v);

export const DEAD_ERROR = "일시적인 오류가 계속돼 처리하지 못했습니다. 작업을 다시 등록해 주세요.";

/** 작업 이미지 Storage 경로 — 업체별 폴더 */
export const jobImagePath = (businessUserId: string, jobId: string, mime: string) =>
  `${businessUserId}/${jobId}.${mime.split("/")[1] ?? "bin"}`;

/**
 * GET /api/v1/style-id/jobs/:id 응답 본문(request_id 제외)
 *   result = succeeded 일 때 동기 엔드포인트 200 응답과 같은 모양(request_id 제외)
 *   error  = failed · dead 일 때 업체에게 보이는 문구
 */
export function jobView(job: JobRow) {
  const result = job.status === "succeeded" ? job.result : null;
  const error =
    job.status === "failed"
      ? ((job.result?.error as string | undefined) ?? "작업을 처리하지 못했습니다.")
      : job.status === "dead"
        ? DEAD_ERROR
        : null;
  return {
    job_id: job.id,
    status: job.status,
    attempts: job.attempts,
    max_attempts: job.max_attempts,
    product_name: job.product_name,
    product_category: job.product_category,
    image_sha256: job.image_sha256,
    created_at: job.created_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
    /** 재시도 대기 중이면 다음 실행 예정 시각 */
    next_run_at: job.status === "queued" && job.attempts > 0 ? job.next_run_at : null,
    result,
    error,
  };
}
