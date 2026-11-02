import "server-only";
import { extractStyle, visionModel } from "@/lib/style-ex/extract";
import { resolvePrompt } from "@/lib/style-ex/prompt-versions";
import { productAddendum, type ProductContext } from "@/lib/style-ex/product-context";
import { resolvePrimeTarget, type PrimeTarget } from "@/lib/style-ex/prime-target";

/**
 * 외부 API(/api/v1/style-id · /api/v1/style-id/jobs)의 Style ID 추출 — 상품 사진 1장 → 업체에게 줄 결과.
 *
 * /style-ex 의 [상품 Style ID 추출]과 같다: 상품 정보가 있으면 JEV 로 대표 의복을 확정하고(prime-target.ts)
 * 그 상품 정보를 활성 관찰 프롬프트(item) 끝에 붙여 Vision 관찰 → 엔진 · TC 규칙 판정.
 * 관찰 원문 · 엔진 점수는 내보내지 않는다 — 업체에게는 스타일 아이디 · 후보 · 축 글자만.
 * 근거(관찰 envelope · 판정 기록 · JEV 결정 전체)는 evidence 로 돌려준다 — 서버에 남기는 용도(api_call_items).
 */

/** Anthropic 이미지 입력 한도 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Obj = Record<string, unknown>;

/** 바이트로 형식을 본다(확장자 · Content-Type 은 믿지 않는다) — 엔진이 받는 네 가지 */
export function sniffImage(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString("latin1"))) return "image/gif";
  return null;
}

const styleOf = (s: Obj | null | undefined) =>
  s ? { name: s.name ?? null, sub_title: s.subTitle ?? null, definition: s.definition ?? null } : null;

export interface ApiStyleIdSuccess {
  ok: true;
  style_id: string;
  style: ReturnType<typeof styleOf>;
  /** 중립 축의 양쪽 글자를 조합한 후보 전부 (첫 번째 = style_id) */
  candidates: { style_id: string; style: ReturnType<typeof styleOf> }[];
  axes: Record<string, { letter: unknown; letters: unknown; source: unknown }>;
}

export interface ApiStyleIdFailure {
  ok: false;
  /** 업체에게 돌려주는 사유 */
  error: string;
  /** 서버 쪽 사유 */
  detail: string;
}

export interface ApiStyleIdRun {
  result: ApiStyleIdSuccess | ApiStyleIdFailure;
  /** JEV 로 확정한 대표 의복 — 상품 정보가 없으면 null */
  primeTarget: Pick<PrimeTarget, "category" | "choice" | "confidence" | "reason"> | null;
  visionModel: string;
  observePromptVersion: number | null;
  elapsedMs: number;
  /** 서버에 남길 근거 — 업체 응답에는 넣지 않는다 */
  evidence: {
    observation: unknown;
    scoring: unknown;
    primeTarget: PrimeTarget | null;
  };
}

export async function runApiStyleId({
  image,
  fileName,
  product,
  primeTarget,
}: {
  image: Buffer;
  fileName: string;
  /** 상품명이 있을 때만 — 사진에 옷이 여럿일 때 이 상품인 의복을 대표로 고른다 */
  product: ProductContext | null;
  /** 이미 정한 대표 의복 (대량 작업의 대표 의복 단계). 주지 않으면(undefined) 여기서 JEV 를 부른다 */
  primeTarget?: PrimeTarget | null;
}): Promise<ApiStyleIdRun> {
  const started = performance.now();
  const [observe, prime] = await Promise.all([
    resolvePrompt("observe", null, "item"),
    !product ? Promise.resolve(null) : primeTarget !== undefined ? Promise.resolve(primeTarget) : resolvePrimeTarget(product),
  ]);
  const addendum = product ? productAddendum(product, prime?.category ?? null) : "";

  const extracted = await extractStyle({ image, fileName, prompt: observe.content + addendum, provider: "claude" });
  const base = {
    primeTarget: prime && { category: prime.category, choice: prime.choice, confidence: prime.confidence, reason: prime.reason },
    visionModel: extracted.visionModel || visionModel(),
    observePromptVersion: observe.version?.version ?? null,
    elapsedMs: Math.round(performance.now() - started),
    evidence: { observation: extracted.observation ?? null, scoring: extracted.scoring ?? null, primeTarget: prime },
  };

  const styleId = extracted.styleId as Obj | null;
  if (!styleId || styleId.ok !== true) {
    const observation = extracted.observation as Obj | undefined;
    const detail =
      (styleId?.error as string | undefined) ??
      (observation?.ok === false ? JSON.stringify(observation.error ?? "observation failed") : "스타일 아이디를 정하지 못했습니다.");
    return { ...base, result: { ok: false, error: "사진에서 스타일 아이디를 판정할 의복을 찾지 못했습니다.", detail } };
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
  return {
    ...base,
    result: {
      ok: true,
      style_id: String(styleId.style_id),
      style: styleOf(styleId.style as Obj | null),
      candidates,
      axes,
    },
  };
}
