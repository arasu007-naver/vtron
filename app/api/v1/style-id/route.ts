import { NextResponse } from "next/server";
import { anthropicApiKey } from "@/lib/style-ex/api-key";
import { withBusinessApi } from "@/lib/business-user/api-call";
import { MAX_IMAGE_BYTES, runApiStyleId, sniffImage } from "@/lib/style-id-api/extract";

// Vision 호출 + 스코어링(자식 프로세스)까지 수십 초 ~ 수 분 걸린다 — /api/style-ex 와 같다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

const MAX_TEXT = 200;

/**
 * POST /api/v1/style-id — 상품 사진 → STMX 스타일 아이디 (외부 업체용)
 *
 *   Authorization: Bearer stmx_live_…
 *   Content-Type: multipart/form-data
 *     image             상품 사진 (필수 · JPG/PNG/WEBP/GIF · 5MB 이하)
 *     product_name      상품명 (선택) — 사진에 옷이 여럿일 때 이 상품인 의복을 대표로 고른다
 *     product_category  상품 분류 (선택, 예: "패션의류>여성의류>코트")
 *
 * 추출은 /style-ex 의 [상품 Style ID 추출]과 같다 — 상품명이 있으면 JEV 로 대표 의복을 확정하고, 활성 관찰 프롬프트로
 * Vision 관찰 → 엔진 · TC 규칙 판정(대표 의복 1벌). 여러 상품은 POST /api/v1/style-id/jobs (큐).
 *
 * 200 { request_id, ok: true, style_id, style: { name, sub_title, definition },
 *       candidates: [{ style_id, style }],   // 중립 축의 양쪽 글자를 조합한 후보 전부(첫 번째 = style_id)
 *       axes: { EI|TC|SR|DM: { letter, letters, source } }, elapsed_ms }
 * 422 { request_id, ok: false, error }        // 사진에서 판정할 의복을 찾지 못함 등
 * 400 · 413 · 415 입력 오류, 401 키 없음 · 틀림, 403 정지, 503 추출 엔진 설정 없음
 *
 * 관찰 원문 · 엔진 점수는 내보내지 않는다. 호출마다 api_call_log 에 남는다(이미지는 남기지 않는다).
 */
export const POST = withBusinessApi(async (req, ctx) => {
  const fail = (status: number, error: string, internal?: string) => {
    ctx.log.error = internal ?? error;
    return NextResponse.json({ request_id: ctx.request_id, ok: false, error }, { status });
  };

  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    return fail(415, "multipart/form-data 로 image 파일을 보내 주세요.");
  }
  const form = await req.formData().catch(() => null);
  const text = (key: string) => {
    const v = form?.get(key);
    return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) : "";
  };
  const image = form?.get("image");
  if (!(image instanceof File) || image.size === 0) return fail(400, "image 파일이 필요합니다.");

  const productName = text("product_name");
  const productCategory = text("product_category");
  ctx.log.request = {
    image_bytes: image.size,
    product_name: productName || null,
    product_category: productCategory || null,
  };

  if (image.size > MAX_IMAGE_BYTES) return fail(413, "이미지는 5MB 이하만 지원합니다.");
  const bytes = Buffer.from(await image.arrayBuffer());
  const mime = sniffImage(bytes);
  ctx.log.request.image_type = mime;
  if (!mime) return fail(415, "JPG · PNG · WEBP · GIF 이미지만 지원합니다.");

  if (!anthropicApiKey()) return fail(503, "스타일 추출을 잠시 사용할 수 없습니다.", "CLAUDE_API_KEY 없음");

  let run: Awaited<ReturnType<typeof runApiStyleId>>;
  try {
    run = await runApiStyleId({
      image: bytes,
      fileName: image.name || `image.${mime.split("/")[1]}`,
      product: productName ? { name: productName, category: productCategory || null } : null,
    });
  } catch (e) {
    return fail(422, "이미지를 처리하지 못했습니다.", e instanceof Error ? e.message : String(e));
  }

  const { result } = run;
  ctx.log.response = {
    vision_model: run.visionModel,
    observe_prompt_version: run.observePromptVersion,
    prime_target: run.primeTarget?.category ?? null,
    elapsed_ms: run.elapsedMs,
    ok: result.ok,
    ...(result.ok && { style_id: result.style_id, candidates: result.candidates.map((c) => c.style_id) }),
  };
  if (!result.ok) return fail(422, result.error, result.detail);

  return NextResponse.json({
    request_id: ctx.request_id,
    ok: true,
    style_id: result.style_id,
    style: result.style,
    candidates: result.candidates,
    axes: result.axes,
    elapsed_ms: run.elapsedMs,
  });
});
