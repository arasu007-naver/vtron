import { NextResponse } from "next/server";
import { anthropicApiKey } from "@/lib/style-ex/api-key";
import { withBusinessApi } from "@/lib/business-user/api-call";
import { classifyFailure, errorInfoOf } from "@/lib/business-user/job-retry";
import { createSemaphore, envInt, type Semaphore } from "@/lib/business-user/semaphore";
import { PROCESS_ERROR, parseStyleIdForm, runStyleId } from "@/lib/business-user/style-id";

// Vision 호출 + 스코어링(자식 프로세스)까지 수십 초 ~ 수 분 걸린다 — /api/style-ex 와 같다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

/** 동시 실행 상한 — 프로세스 하나 기준. 넘치면 기다리지 않고 429 */
const SYNC_CONCURRENCY = envInt("STYLE_ID_SYNC_CONCURRENCY", 4);
const BUSY_RETRY_AFTER_SEC = 30;
const UPSTREAM_RETRY_AFTER_SEC = 60;
const JOBS_ENDPOINT = "/api/v1/style-id/jobs";

// dev 의 HMR 로 모듈이 다시 읽혀도 같은 세마포어를 쓴다
const g = globalThis as { __styleIdSyncSemaphore?: Semaphore };
const semaphore = (g.__styleIdSyncSemaphore ??= createSemaphore(SYNC_CONCURRENCY));

/**
 * POST /api/v1/style-id — 상품 사진 → STMX 스타일 아이디 (외부 업체용, 동기)
 *
 *   Authorization: Bearer stmx_live_…
 *   Content-Type: multipart/form-data
 *     image             상품 사진 (필수 · JPG/PNG/WEBP/GIF · 5MB 이하)
 *     product_name      상품명 (선택) — 사진에 옷이 여럿일 때 이 상품인 의복을 대표로 고른다
 *     product_category  상품 분류 (선택, 예: "패션의류>여성의류>코트")
 *
 * 추출은 /style-ex 와 같다 — 활성 관찰 프롬프트로 Vision 관찰 → 엔진 · TC 규칙 판정(대표 의복 1벌).
 * 대량 처리는 비동기 작업(POST /api/v1/style-id/jobs)을 쓴다 — 이 엔드포인트는 동시 실행 상한이 있다.
 *
 * 200 { request_id, ok: true, style_id, style: { name, sub_title, definition },
 *       candidates: [{ style_id, style }],   // 중립 축의 양쪽 글자를 조합한 후보 전부(첫 번째 = style_id)
 *       axes: { EI|TC|SR|DM: { letter, letters, source } }, elapsed_ms }
 * 422 { request_id, ok: false, error }        // 사진에서 판정할 의복을 찾지 못함 등
 * 429 { request_id, ok: false, error, jobs_endpoint } + Retry-After   // 동시 실행 상한 초과
 * 503 + Retry-After                          // 추출 엔진(Anthropic) 일시 오류 · 설정 없음
 * 400 · 413 · 415 입력 오류, 401 키 없음 · 틀림, 403 정지
 *
 * 관찰 원문 · 엔진 점수는 내보내지 않는다. 호출마다 api_call_log 에 남는다(이미지는 남기지 않는다).
 */
export const POST = withBusinessApi(async (req, ctx) => {
  const fail = (status: number, error: string, internal?: string, extra?: { retryAfter?: number; body?: object }) => {
    ctx.log.error = internal ?? error;
    return NextResponse.json(
      { request_id: ctx.request_id, ok: false, error, ...extra?.body },
      { status, headers: extra?.retryAfter ? { "Retry-After": String(extra.retryAfter) } : undefined }
    );
  };

  const parsed = await parseStyleIdForm(req);
  ctx.log.request = parsed.logRequest;
  if (!parsed.ok) return fail(parsed.status, parsed.error);

  if (!anthropicApiKey()) return fail(503, "스타일 추출을 잠시 사용할 수 없습니다.", "CLAUDE_API_KEY 없음");

  const release = semaphore.tryAcquire();
  if (!release) {
    return fail(
      429,
      `동시에 처리할 수 있는 요청 수를 넘었습니다. 잠시 후 다시 시도하거나, 대량 처리는 ${JOBS_ENDPOINT} 로 작업을 등록해 주세요.`,
      `sync_concurrency_limit (${semaphore.limit})`,
      { retryAfter: BUSY_RETRY_AFTER_SEC, body: { jobs_endpoint: JOBS_ENDPOINT } }
    );
  }

  try {
    let run: Awaited<ReturnType<typeof runStyleId>>;
    try {
      run = await runStyleId(parsed.input);
    } catch (e) {
      const info = errorInfoOf(e);
      if (classifyFailure(info).retryable) {
        return fail(503, "스타일 추출을 잠시 사용할 수 없습니다.", info.message ?? undefined, {
          retryAfter: UPSTREAM_RETRY_AFTER_SEC,
        });
      }
      return fail(422, PROCESS_ERROR, info.message ?? undefined);
    }

    ctx.log.response = { ...run.meta };
    if (!run.ok) {
      if (run.kind === "vision_call" && classifyFailure(run.failure).retryable) {
        const retryAfter = Math.max(
          UPSTREAM_RETRY_AFTER_SEC,
          Math.ceil((run.failure.retryAfterMs ?? 0) / 1000)
        );
        return fail(503, "스타일 추출을 잠시 사용할 수 없습니다.", run.internal, { retryAfter });
      }
      return fail(422, run.error, run.internal);
    }

    return NextResponse.json({ request_id: ctx.request_id, ...run.body });
  } finally {
    release();
  }
});
