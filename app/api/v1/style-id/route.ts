import { NextResponse } from "next/server";
import { anthropicApiKey } from "@/lib/style-ex/api-key";
import { extractStyle, visionModel } from "@/lib/style-ex/extract";
import { resolvePrompt } from "@/lib/style-ex/prompt-versions";
import { productAddendum } from "@/lib/style-ex/product-context";
import { withBusinessApi } from "@/lib/business-user/api-call";

// Vision 호출 + 스코어링(자식 프로세스)까지 수십 초 ~ 수 분 걸린다 — /api/style-ex 와 같다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

/** Anthropic 이미지 입력 한도 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 200;

type Obj = Record<string, unknown>;

/** 바이트로 형식을 본다(확장자 · Content-Type 은 믿지 않는다) — 엔진이 받는 네 가지 */
function sniffImage(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString("latin1"))) return "image/gif";
  return null;
}

const styleOf = (s: Obj | null | undefined) =>
  s ? { name: s.name ?? null, sub_title: s.subTitle ?? null, definition: s.definition ?? null } : null;

/**
 * POST /api/v1/style-id — 상품 사진 → STMX 스타일 아이디 (외부 업체용)
 *
 *   Authorization: Bearer stmx_live_…
 *   Content-Type: multipart/form-data
 *     image             상품 사진 (필수 · JPG/PNG/WEBP/GIF · 5MB 이하)
 *     product_name      상품명 (선택) — 사진에 옷이 여럿일 때 이 상품인 의복을 대표로 고른다
 *     product_category  상품 분류 (선택, 예: "패션의류>여성의류>코트")
 *
 * 추출은 /style-ex 와 같다 — 활성 관찰 프롬프트로 Vision 관찰 → 엔진 · TC 규칙 판정(대표 의복 1벌).
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

  const started = performance.now();
  const observe = await resolvePrompt("observe");
  const addendum = productName ? productAddendum({ name: productName, category: productCategory || null }) : "";

  let extracted: Awaited<ReturnType<typeof extractStyle>>;
  try {
    extracted = await extractStyle({
      image: bytes,
      fileName: image.name || `image.${mime.split("/")[1]}`,
      prompt: observe.content + addendum,
      provider: "claude",
    });
  } catch (e) {
    return fail(422, "이미지를 처리하지 못했습니다.", e instanceof Error ? e.message : String(e));
  }
  const elapsedMs = Math.round(performance.now() - started);

  const styleId = extracted.styleId as Obj | null;
  ctx.log.response = {
    vision_model: extracted.visionModel || visionModel(),
    observe_prompt_version: observe.version?.version ?? null,
    elapsed_ms: elapsedMs,
  };

  if (!styleId || styleId.ok !== true) {
    const observation = extracted.observation as Obj | undefined;
    const why =
      (styleId?.error as string | undefined) ??
      (observation?.ok === false ? JSON.stringify(observation.error ?? "observation failed") : "스타일 아이디를 정하지 못했습니다.");
    ctx.log.response.ok = false;
    return fail(422, "사진에서 스타일 아이디를 판정할 의복을 찾지 못했습니다.", why);
  }

  const axes = Object.fromEntries(
    Object.entries((styleId.axes as Record<string, Obj>) ?? {}).map(([k, a]) => [
      k,
      { letter: a.letter ?? null, letters: a.letters ?? [], source: a.source ?? null },
    ])
  );
  const candidates = ((styleId.candidates as { style_id: string; style: Obj | null }[]) ?? []).map((c) => ({
    style_id: c.style_id,
    style: styleOf(c.style),
  }));

  ctx.log.response = {
    ...ctx.log.response,
    ok: true,
    style_id: styleId.style_id,
    candidates: candidates.map((c) => c.style_id),
  };

  return NextResponse.json({
    request_id: ctx.request_id,
    ok: true,
    style_id: styleId.style_id,
    style: styleOf(styleId.style as Obj | null),
    candidates,
    axes,
    elapsed_ms: elapsedMs,
  });
});
