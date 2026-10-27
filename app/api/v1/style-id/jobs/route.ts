import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { withBusinessApi } from "@/lib/business-user/api-call";
import { envInt } from "@/lib/business-user/semaphore";
import { parseStyleIdForm } from "@/lib/business-user/style-id";
import {
  DEFAULT_MAX_PENDING_JOBS,
  JOB_BUCKET,
  JOB_PUBLIC_COLUMNS,
  JOB_TABLE,
  TERMINAL_STATUSES,
  isIdempotencyKey,
  jobImagePath,
  type JobRow,
} from "@/lib/business-user/style-id-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PENDING_JOBS = envInt("STYLE_ID_MAX_PENDING_JOBS", DEFAULT_MAX_PENDING_JOBS);
const FULL_RETRY_AFTER_SEC = 60;
/** 처리 중인 작업을 다시 조회하기까지 권하는 간격 */
const POLL_AFTER_SEC = 5;

const jobUrl = (id: string) => `/api/v1/style-id/jobs/${id}`;

/**
 * POST /api/v1/style-id/jobs — 스타일 아이디 비동기 작업 등록 (외부 업체용, 대량 처리)
 *
 *   Authorization: Bearer stmx_live_…
 *   Idempotency-Key: <업체가 정한 값, 보이는 ASCII 1–200자>   (권장 — 같은 값으로 다시 보내면 새로 만들지 않는다)
 *   Content-Type: multipart/form-data — 동기 엔드포인트(POST /api/v1/style-id)와 같다
 *     image · product_name · product_category
 *
 * 202 { request_id, job_id, status: "queued", status_url }   + Location
 *     같은 Idempotency-Key 의 작업이 이미 있으면 그 작업을 돌려준다(Idempotent-Replayed: true,
 *     끝난 작업이면 200). 같은 키로 다른 이미지를 보내면 409.
 * 429 + Retry-After  업체의 미완료 작업이 상한(STYLE_ID_MAX_PENDING_JOBS, 기본 1000)에 닿음
 * 400 · 413 · 415 입력 오류, 401 · 403 인증
 *
 * 결과는 GET /api/v1/style-id/jobs/:id 로 받는다. 이미지는 처리가 끝나면 지운다.
 */
export const POST = withBusinessApi(async (req, ctx) => {
  const fail = (status: number, error: string, internal?: string, headers?: Record<string, string>) => {
    ctx.log.error = internal ?? error;
    return NextResponse.json({ request_id: ctx.request_id, ok: false, error }, { status, headers });
  };

  const rawKey = req.headers.get("idempotency-key")?.trim() ?? "";
  if (rawKey && !isIdempotencyKey(rawKey)) {
    return fail(400, "Idempotency-Key 는 공백 없는 ASCII 1–200자여야 합니다.");
  }

  const parsed = await parseStyleIdForm(req);
  ctx.log.request = { ...parsed.logRequest, idempotency_key: rawKey || null };
  if (!parsed.ok) return fail(parsed.status, parsed.error);
  const { input } = parsed;

  const db = getAdminSupabase();
  const sha256 = createHash("sha256").update(input.image).digest("hex");
  const idempotencyKey = rawKey || `auto:${randomUUID()}`;

  const replay = (job: JobRow) => {
    if (job.image_sha256 !== sha256) {
      return fail(409, "같은 Idempotency-Key 로 다른 이미지의 작업이 이미 등록돼 있습니다.", `idempotency_conflict ${job.id}`);
    }
    ctx.log.response = { job_id: job.id, status: job.status, replayed: true };
    return NextResponse.json(
      { request_id: ctx.request_id, job_id: job.id, status: job.status, status_url: jobUrl(job.id) },
      {
        status: TERMINAL_STATUSES.includes(job.status) ? 200 : 202,
        headers: { Location: jobUrl(job.id), "Idempotent-Replayed": "true" },
      }
    );
  };

  const findExisting = async () => {
    const { data, error } = await db
      .from(JOB_TABLE)
      .select(JOB_PUBLIC_COLUMNS)
      .eq("business_user_id", ctx.business_user_id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (error) throw new Error(`${JOB_TABLE} 조회 실패: ${error.message}`);
    return data as JobRow | null;
  };

  if (rawKey) {
    const existing = await findExisting();
    if (existing) return replay(existing);
  }

  const { count, error: countError } = await db
    .from(JOB_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("business_user_id", ctx.business_user_id)
    .in("status", ["queued", "running"]);
  if (countError) throw new Error(`${JOB_TABLE} 개수 조회 실패: ${countError.message}`);
  if ((count ?? 0) >= MAX_PENDING_JOBS) {
    return fail(
      429,
      `처리를 기다리는 작업이 ${MAX_PENDING_JOBS}건을 넘었습니다. 작업이 끝난 뒤 다시 등록해 주세요.`,
      `pending_job_limit ${count}/${MAX_PENDING_JOBS}`,
      { "Retry-After": String(FULL_RETRY_AFTER_SEC) }
    );
  }

  const jobId = randomUUID();
  const imagePath = jobImagePath(ctx.business_user_id, jobId, input.mime);
  const upload = await db.storage
    .from(JOB_BUCKET)
    .upload(imagePath, input.image, { contentType: input.mime, upsert: false });
  if (upload.error) throw new Error(`작업 이미지 업로드 실패: ${upload.error.message}`);

  const { data: inserted, error: insertError } = await db
    .from(JOB_TABLE)
    .insert({
      id: jobId,
      business_user_id: ctx.business_user_id,
      idempotency_key: idempotencyKey,
      image_path: imagePath,
      image_sha256: sha256,
      image_type: input.mime,
      product_name: input.productName,
      product_category: input.productCategory,
      request_id: ctx.request_id,
    })
    .select(JOB_PUBLIC_COLUMNS)
    .single();

  if (insertError) {
    await db.storage.from(JOB_BUCKET).remove([imagePath]).catch(() => {});
    // 같은 키로 동시에 두 번 들어왔다 — 먼저 들어간 작업을 돌려준다
    if (insertError.code === "23505") {
      const existing = await findExisting();
      if (existing) return replay(existing);
    }
    throw new Error(`${JOB_TABLE} 등록 실패: ${insertError.message}`);
  }

  const job = inserted as JobRow;
  ctx.log.response = { job_id: job.id, status: job.status };
  return NextResponse.json(
    { request_id: ctx.request_id, job_id: job.id, status: job.status, status_url: jobUrl(job.id) },
    { status: 202, headers: { Location: jobUrl(job.id), "Retry-After": String(POLL_AFTER_SEC) } }
  );
});
