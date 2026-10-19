import { NextResponse } from "next/server";
import {
  MISSING_KEY_MESSAGE,
  MISSING_GEMINI_KEY_MESSAGE,
  anthropicApiKey,
  geminiApiKey,
} from "@/lib/style-ex/api-key";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  extractStyle,
  visionModel,
  geminiVisionModel,
  type StyleExProvider,
} from "@/lib/style-ex/extract";
import { productContextOf, saveProductStyle } from "@/lib/style-ex/product-style";
import { resolvePrompt } from "@/lib/style-ex/prompt-versions";
import { productAddendum, splitProductContext } from "@/lib/style-ex/product-context";

// Vision 호출 + 스코어링(자식 프로세스) + LLM 판정까지 수 분이 걸릴 수 있으므로 Node 런타임에서 실행한다.
export const runtime = "nodejs";
export const maxDuration = 600;

/** Anthropic / Gemini 이미지 입력 한도(5MB)에 맞춘다 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** brand_catalog_models.id — 네이버 카탈로그 모델 id */
const MODEL_ID = /^[\w-]{1,40}$/;

/**
 * GET /api/style-ex — 기본 프롬프트 (관찰 · 판정) = 각 종류의 활성 버전
 *   응답: { prompt, judgePrompt, versions: { prompt, judgePrompt } } — version 이 null 이면
 *         버전 표를 읽지 못해 코드 기본값을 준 것이다.
 * GET /api/style-ex?modelId=… — 그 상품의 상품 정보(관찰 프롬프트 끝에 붙일 글, product-context.ts)
 *   응답: { productContext } — 카탈로그에서 상품을 못 찾으면 null
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  const modelId = new URL(request.url).searchParams.get("modelId")?.trim();
  if (modelId) {
    if (!MODEL_ID.test(modelId)) return NextResponse.json({ error: "modelId 가 올바르지 않습니다." }, { status: 400 });
    const product = await productContextOf(modelId);
    return NextResponse.json({ productContext: product ? productAddendum(product) : null });
  }
  // 판정은 코드(엔진 · tc-rules)가 하므로 판정 프롬프트는 내려보내지 않는다.
  const observe = await resolvePrompt("observe");
  return NextResponse.json({ prompt: observe.content, versions: { prompt: observe.version } });
}

/**
 * POST /api/style-ex — multipart/form-data
 *   image       : 이미지 파일 (필수)
 *   provider    : 'claude' | 'gemini' (선택 — 비우면 'claude')
 *   prompt      : 관찰 프롬프트 (선택 — 비우면 활성 버전). 끝에 상품 정보(GET ?modelId= 가 준 글)가 붙어 있으면
 *                 떼어 낸 앞부분으로 버전을 찾고, 상품 정보는 관찰에 따로 넘겨 그 상품인 의복을 대표 의복으로 고정한다.
 *   judgePrompt : 판정 프롬프트 (선택 — 비우면 활성 버전. 관찰값 JSON 은 서버가 뒤에 붙인다)
 *   modelId     : 상품 사진으로 추출할 때 그 상품의 카탈로그 모델 id (선택 — 있으면 결과를 product_style 에 저장한다)
 *   imageUrl    : 그 상품 사진의 원본 URL (modelId 와 함께)
 *
 * 응답: { styleId: 대표 의복의 스타일 아이디(축별 글자 · 출처 · TC 규칙 판정), scoring: 의복별 EI·SR·DM 엔진 결과,
 *        judgement: LLM 판정(엔진 · TC 규칙이 미결인 축이 있을 때만, 없으면 null), observation: 관찰 envelope,
 *        provider: 'claude' | 'gemini', visionModel: 모델명,
 *        customPrompt: 관찰 프롬프트(상품 정보 뺀 앞부분)를 따로 보냈는지, productContext: 상품 정보가 붙어 있었는지,
 *        promptVersions: 추출에 쓴 버전 { prompt, judgePrompt }
 *          (등록되지 않은 내용이면 null),
 *        saved?: { id } | { error } — modelId 가 왔을 때만 }
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const form = await request.formData().catch(() => null);
  const text = (key: string) => {
    const v = form?.get(key);
    return typeof v === "string" ? v : undefined;
  };

  const provider: StyleExProvider =
    text("provider")?.toLowerCase() === "gemini" ? "gemini" : "claude";

  if (provider === "gemini") {
    if (!geminiApiKey()) {
      return NextResponse.json(
        { error: MISSING_GEMINI_KEY_MESSAGE },
        { status: 500 }
      );
    }
  } else {
    if (!anthropicApiKey()) {
      return NextResponse.json(
        { error: MISSING_KEY_MESSAGE },
        { status: 500 }
      );
    }
  }

  const image = form?.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "image 파일이 필요합니다." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "이미지는 5MB 이하만 지원합니다." }, { status: 400 });
  }

  const modelId = text("modelId")?.trim() || null;
  const imageUrl = text("imageUrl")?.trim() || null;
  if (modelId && (!MODEL_ID.test(modelId) || !imageUrl || !/^https:\/\//i.test(imageUrl))) {
    return NextResponse.json({ error: "modelId 와 함께 상품 사진의 https imageUrl 이 필요합니다." }, { status: 400 });
  }

  try {
    const started = performance.now();
    // 상품 정보는 버전 관리 밖이다 — 떼어 낸 관찰 프롬프트로 버전을 찾고, 상품 정보는 뒤에 다시 붙여 넘긴다
    const { base, addendum } = splitProductContext(text("prompt") ?? "");
    const observePrompt = await resolvePrompt("observe", base);
    const extracted = await extractStyle({
      image: Buffer.from(await image.arrayBuffer()),
      fileName: image.name || "image",
      prompt: observePrompt.content + (addendum ?? ""),
      provider,
    });
    const activeVisionModel =
      extracted.visionModel ||
      (provider === "gemini" ? geminiVisionModel() : visionModel());
    const out = {
      ...extracted,
      provider,
      visionModel: activeVisionModel,
      customPrompt: Boolean(base.trim()),
      productContext: Boolean(addendum),
      // 판정 프롬프트는 쓰지 않는다 (판정은 코드) — product_style.judge_prompt_version_id 는 비운다
      promptVersions: { prompt: observePrompt.version, judgePrompt: null },
    };
    if (!modelId || !imageUrl) return NextResponse.json(out);

    // 상품 사진의 결과는 실패한 것도 남긴다. 저장이 실패해도 추출 결과는 돌려준다.
    let saved: { id: string } | { error: string };
    try {
      saved = await saveProductStyle({
        modelId,
        imageUrl,
        result: out,
        visionModel: activeVisionModel,
        elapsedMs: performance.now() - started,
        userId: auth.user.id,
      });
    } catch (e) {
      saved = { error: e instanceof Error ? e.message : String(e) };
    }
    return NextResponse.json({ ...out, saved });
  } catch (e) {
    // 엔진은 지원하지 않는 이미지 바이트를 추측하지 않고 예외로 거절한다.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}
