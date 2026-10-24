/**
 * 외부 API 스타일 아이디 판정 — 동기 엔드포인트(POST /api/v1/style-id)와 비동기 작업 워커(scripts/style-id-worker.mjs)가
 * 같이 쓴다. 입력 검사(parseStyleIdForm) · 판정(runStyleId) · 응답 모양(StyleIdBody)이 한 곳에서 나온다.
 *
 * 추출은 /style-ex 와 같다 — 활성 관찰 프롬프트(+ 상품 정보)로 Vision 관찰 → 엔진 · TC 규칙 판정(대표 의복 1벌).
 * 관찰 원문 · 엔진 점수는 내보내지 않는다.
 */
import "server-only";
import { extractStyle, visionModel } from "@/lib/style-ex/extract";
import { resolvePrompt } from "@/lib/style-ex/prompt-versions";
import { productAddendum } from "@/lib/style-ex/product-context";
import { parseRetryAfter, type FailureInfo } from "./job-retry";

/** Anthropic 이미지 입력 한도 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 200;

type Obj = Record<string, unknown>;

/** 바이트로 형식을 본다(확장자 · Content-Type 은 믿지 않는다) — 엔진이 받는 네 가지 */
export function sniffImage(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString("latin1"))) return "image/gif";
  return null;
}

export interface StyleIdInput {
  image: Buffer;
  /** sniffImage 결과 */
  mime: string;
  fileName: string;
  productName: string | null;
  productCategory: string | null;
}

export type ParsedStyleIdForm =
  | { ok: true; input: StyleIdInput; logRequest: Obj }
  | { ok: false; status: 400 | 413 | 415; error: string; logRequest: Obj };

/**
 * multipart/form-data 입력 검사
 *   image             상품 사진 (필수 · JPG/PNG/WEBP/GIF · 5MB 이하)
 *   product_name      상품명 (선택)
 *   product_category  상품 분류 (선택)
 * logRequest = api_call_log.request_meta 에 남길 요약(이미지 원문 없음)
 */
export async function parseStyleIdForm(req: Request): Promise<ParsedStyleIdForm> {
  const logRequest: Obj = {};
  const bad = (status: 400 | 413 | 415, error: string) => ({ ok: false as const, status, error, logRequest });

  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    return bad(415, "multipart/form-data 로 image 파일을 보내 주세요.");
  }
  const form = await req.formData().catch(() => null);
  const text = (key: string) => {
    const v = form?.get(key);
    return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) : "";
  };
  const image = form?.get("image");
  if (!(image instanceof File) || image.size === 0) return bad(400, "image 파일이 필요합니다.");

  const productName = text("product_name") || null;
  const productCategory = text("product_category") || null;
  Object.assign(logRequest, { image_bytes: image.size, product_name: productName, product_category: productCategory });

  if (image.size > MAX_IMAGE_BYTES) return bad(413, "이미지는 5MB 이하만 지원합니다.");
  const bytes = Buffer.from(await image.arrayBuffer());
  const mime = sniffImage(bytes);
  logRequest.image_type = mime;
  if (!mime) return bad(415, "JPG · PNG · WEBP · GIF 이미지만 지원합니다.");

  return {
    ok: true,
    input: {
      image: bytes,
      mime,
      fileName: image.name || `image.${mime.split("/")[1]}`,
      productName,
      productCategory,
    },
    logRequest,
  };
}

const styleOf = (s: Obj | null | undefined) =>
  s ? { name: s.name ?? null, sub_title: s.subTitle ?? null, definition: s.definition ?? null } : null;

type StyleSummary = ReturnType<typeof styleOf>;

/** 성공 응답 본문(request_id 제외) — 동기 200 응답과 작업 result 가 같은 모양이다 */
export interface StyleIdBody {
  ok: true;
  style_id: string;
  style: StyleSummary;
  candidates: { style_id: string; style: StyleSummary }[];
  axes: Record<string, { letter: unknown; letters: unknown; source: unknown }>;
  elapsed_ms: number;
}

/** api_call_log.response_meta 에 남길 요약 */
export interface StyleIdMeta {
  vision_model: string;
  observe_prompt_version: number | null;
  elapsed_ms: number;
  ok?: boolean;
  style_id?: unknown;
  candidates?: string[];
}

export type StyleIdRun =
  | { ok: true; body: StyleIdBody; meta: StyleIdMeta }
  /** 판정 실패(의복 미검출 등) — 다시 해도 같다 */
  | { ok: false; kind: "judgement"; error: string; internal: string; meta: StyleIdMeta }
  /** Vision 호출 자체가 실패 — failure 로 재시도 여부를 가린다(job-retry.ts classifyFailure) */
  | { ok: false; kind: "vision_call"; error: string; internal: string; failure: FailureInfo; meta: StyleIdMeta };

export const NO_GARMENT_ERROR = "사진에서 스타일 아이디를 판정할 의복을 찾지 못했습니다.";
export const PROCESS_ERROR = "이미지를 처리하지 못했습니다.";

/**
 * 판정 한 번. Vision 호출 · 판정 실패는 결과로 돌려주고, 그 밖의 예외(임시 파일 · 엔진 로드 등)는 던진다.
 */
export async function runStyleId(input: StyleIdInput): Promise<StyleIdRun> {
  const started = performance.now();
  const observe = await resolvePrompt("observe");
  const addendum = input.productName
    ? productAddendum({ name: input.productName, category: input.productCategory })
    : "";

  const extracted = await extractStyle({
    image: input.image,
    fileName: input.fileName,
    prompt: observe.content + addendum,
    provider: "claude",
  });
  const elapsedMs = Math.round(performance.now() - started);

  const meta: StyleIdMeta = {
    vision_model: extracted.visionModel || visionModel(),
    observe_prompt_version: observe.version?.version ?? null,
    elapsed_ms: elapsedMs,
  };

  const observation = extracted.observation as Obj | undefined;
  const obsError = observation?.ok === false ? (observation.error as Obj | undefined) : undefined;
  if (obsError?.stage === "model_call") {
    const upstream = (obsError.upstream as Obj | null | undefined) ?? null;
    const detail = typeof obsError.detail === "string" ? obsError.detail : null;
    return {
      ok: false,
      kind: "vision_call",
      error: PROCESS_ERROR,
      internal: JSON.stringify({ code: obsError.code, detail, upstream }),
      failure: {
        status: typeof upstream?.status === "number" ? upstream.status : null,
        code: typeof obsError.code === "string" ? obsError.code : null,
        name: typeof upstream?.error_type === "string" ? upstream.error_type : null,
        message: detail,
        retryAfterMs: parseRetryAfter(
          (upstream?.retry_after as string | null | undefined) ?? null,
          (upstream?.retry_after_ms as string | null | undefined) ?? null
        ),
      },
      meta: { ...meta, ok: false },
    };
  }

  const styleId = extracted.styleId as Obj | null;
  if (!styleId || styleId.ok !== true) {
    const why =
      (styleId?.error as string | undefined) ??
      (obsError ? JSON.stringify(obsError) : "스타일 아이디를 정하지 못했습니다.");
    return { ok: false, kind: "judgement", error: NO_GARMENT_ERROR, internal: why, meta: { ...meta, ok: false } };
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
    ok: true,
    body: {
      ok: true,
      style_id: styleId.style_id as string,
      style: styleOf(styleId.style as Obj | null),
      candidates,
      axes,
      elapsed_ms: elapsedMs,
    },
    meta: { ...meta, ok: true, style_id: styleId.style_id, candidates: candidates.map((c) => c.style_id) },
  };
}
