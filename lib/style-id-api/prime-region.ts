import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { anthropicApiKey, anthropicClientOptions, geminiApiKey, MISSING_KEY_MESSAGE } from "@/lib/style-ex/api-key";
import { geminiVisionModel } from "@/lib/style-ex/extract";

/**
 * 대표 의복 영역 (api_call_items.prime_region) — 판정에 쓴 대표 의복이 사진의 어디에 있는지 박스 하나.
 * /admin/api-log · /test-demo 가 사진 위에 그린다(components/api-log/ItemCard.tsx).
 *
 *   Vision 호출 1회 → 사진 전체를 0–1000 으로 본 박스
 *     Gemini 키(GEMINI_API_KEY · GOOGLE_API_KEY)가 있으면 Gemini(box_2d [ymin, xmin, ymax, xmax]),
 *     없으면 Claude(lib/style-ex/crop.ts 의 부위 찾기와 같은 [x0, y0, x1, y1] · JSON 스키마) — 모델은 STYLE_ID_PRIME_REGION_MODEL
 *   → { box: { xmin, ymin, xmax, ymax }, box_px: { x, y, width, height }, image: { width, height }, category, model }
 *
 * 박스는 사람이 확인하는 용도다 — 관찰 · 판정에는 쓰지 않는다(관찰 계약은 좌표를 금지한다).
 * 사진은 EXIF 방향을 적용한 뒤 보낸다 — 브라우저가 보이는 방향과 좌표가 맞게.
 * STYLE_ID_PRIME_REGION=off 이면 부르지 않는다.
 */

export interface PrimeRegion {
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
  box_px: { x: number; y: number; width: number; height: number };
  image: { width: number; height: number };
  category: string | null;
  model: string;
}

const TIMEOUT_MS = 60_000;

type Obj = Record<string, unknown>;

export const primeRegionEnabled = () => (process.env.STYLE_ID_PRIME_REGION ?? "").toLowerCase() !== "off";

/** 관찰 envelope 에서 판정에 쓴 대표 의복(target_id) — 없으면 첫 적격 의복 */
export function primeGarmentOf(observation: unknown, targetId: unknown): { category: string | null; descriptor: string | null } | null {
  const targets = ((observation as { envelope?: { targets?: Obj[] } } | null)?.envelope?.targets ?? []) as Obj[];
  const t = targets.find((x) => x.target_id === targetId) ?? targets.find((x) => x.eligible) ?? null;
  if (!t) return null;
  // 관찰 레코드의 category 는 { state, value } (예: { state: "OBSERVED", value: "Trouser" })
  const raw = (t.record as Obj | undefined)?.category;
  const category = typeof raw === "string" ? raw : (raw as Obj | undefined)?.value;
  return {
    category: typeof category === "string" && category ? category : null,
    descriptor: typeof t.descriptor === "string" ? t.descriptor : null,
  };
}

const clamp = (n: number) => Math.min(Math.max(Math.round(n), 0), 1000);

const describe = (category: string | null, descriptor: string | null, productName: string | null) =>
  [category && `category: ${category}`, productName && `product name: ${productName}`, descriptor && `description: ${descriptor}`]
    .filter(Boolean)
    .join("\n");

/** Gemini — box_2d [ymin, xmin, ymax, xmax] → [x0, y0, x1, y1] */
async function boxByGemini(image: Buffer, what: string, apiKey: string) {
  const model = process.env.STYLE_ID_PRIME_REGION_MODEL || geminiVisionModel();
  const prompt =
    "Find the single main garment in this product photo and return its bounding box.\n" +
    (what ? `The garment:\n${what}\n` : "") +
    'Return JSON only: {"box_2d": [ymin, xmin, ymax, xmax]} with coordinates normalized to 0-1000 over the whole image. ' +
    'Cover the whole garment tightly (not the model, not other items). If it is not visible, return {"box_2d": null}.';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: "image/jpeg", data: image.toString("base64") } }, { text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini 대표 의복 영역 호출 실패 (${model}, HTTP ${res.status}): ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  let raw: unknown;
  try {
    raw = (JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as Obj).box_2d;
  } catch {
    throw new Error(`대표 의복 영역 응답을 읽지 못했습니다: ${text.slice(0, 200)}`);
  }
  if (!Array.isArray(raw) || raw.length !== 4) return { box: null, model };
  const [ymin, xmin, ymax, xmax] = raw as number[];
  return { box: [xmin, ymin, xmax, ymax], model };
}

const CLAUDE_BOX_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    box: { type: "array", items: { type: "integer" } },
  },
  required: ["found", "box"],
  additionalProperties: false,
};

/** Claude — [x0, y0, x1, y1] (crop.ts 의 부위 찾기와 같은 형식) */
async function boxByClaude(image: Buffer, what: string) {
  const model = process.env.STYLE_ID_PRIME_REGION_MODEL || process.env.STYLE_EX_CROP_MODEL || "claude-opus-5-5";
  const client = new Anthropic(anthropicClientOptions());
  const response = await client.beta.messages.create(
    {
      model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: CLAUDE_BOX_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image.toString("base64") } },
            {
              type: "text",
              text:
                "Find the single main garment in this product photo and return its tight bounding box.\n" +
                (what ? `The garment:\n${what}\n` : "") +
                "Coordinates: [x0, y0, x1, y1] as integers from 0 to 1000, relative to the FULL image width and height " +
                "(0,0 = top-left, 1000,1000 = bottom-right). x0 < x1 and y0 < y1. Cover the whole garment, not the model or other items.\n" +
                'If it is not visible, set "found": false and "box": [0, 0, 0, 0]. Do not guess.',
            },
          ],
        },
      ],
    },
    { timeout: TIMEOUT_MS }
  );
  if (response.stop_reason === "refusal") throw new Error("모델이 대표 의복 영역 찾기를 거절했습니다.");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as { found?: boolean; box?: number[] };
  return { box: parsed.found && Array.isArray(parsed.box) && parsed.box.length === 4 ? parsed.box : null, model: response.model };
}

export async function locatePrimeRegion({
  image,
  category,
  descriptor,
  productName,
}: {
  image: Buffer;
  category: string | null;
  descriptor: string | null;
  productName: string | null;
}): Promise<PrimeRegion | null> {
  const gemini = geminiApiKey();
  if (!gemini && !anthropicApiKey()) throw new Error(MISSING_KEY_MESSAGE);

  // EXIF 방향을 적용한 사진으로 찾는다 — 브라우저가 보이는 방향과 좌표가 맞게
  const { data: oriented, info } = await sharp(image).rotate().jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  const what = describe(category, descriptor, productName);
  const { box: raw, model } = gemini ? await boxByGemini(oriented, what, gemini) : await boxByClaude(oriented, what);

  if (!raw || !raw.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const [xmin, ymin, xmax, ymax] = raw.map(clamp);
  if (xmax <= xmin || ymax <= ymin) return null;

  const W = info.width;
  const H = info.height;
  const x = Math.round((xmin / 1000) * W);
  const y = Math.round((ymin / 1000) * H);
  return {
    box: { xmin, ymin, xmax, ymax },
    box_px: { x, y, width: Math.round((xmax / 1000) * W) - x, height: Math.round((ymax / 1000) * H) - y },
    image: { width: W, height: H },
    category,
    model,
  };
}
