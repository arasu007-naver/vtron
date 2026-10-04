import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicClientOptions } from "./api-key";
import sharp from "sharp";
import { z } from "zod";

/**
 * 부위 크롭 (style-ex).
 *
 * Producer 관찰값 중 "어느 부위에 있는지"가 정해진 값(예: surface = Glossy @ Collar/Edge)마다
 * 이미지에서 그 부위를 찾아 256×256 으로 잘라 로컬 폴더에 저장한다.
 *
 *   ① 관찰값 → 크롭 항목 (값 · 부위 · 질의문)
 *   ② Claude 별도 호출 1회 → 항목별 박스 (이미지 대비 0–1000 정규화 좌표)
 *   ③ 박스 → 256×256 크롭 → PNG 저장 + manifest.json
 *
 * ⛔ Producer 계약은 좌표를 금지한다("no coordinate qualifiers"). 그래서 이 단계는 Producer 밖에서
 *    관찰값을 읽기만 하고, 박스는 관찰 레코드에 넣지 않고 크롭 결과에만 기록한다.
 * ⛔ 크롭은 "그 부위"를 담을 뿐 관찰이 맞다는 증거가 아니다 — 사람이 확인하는 용도다.
 */

const MODEL = process.env.STYLE_EX_CROP_MODEL || "claude-opus-5-5";
const SIZE = 256;
/** 박스가 256 보다 크면 여백을 더해 정사각형으로 자른 뒤 256 으로 줄인다 */
const MARGIN = 1.1;

type Obj = Record<string, unknown>;
interface Observation {
  state?: string;
  value?: string | null;
  values?: Array<{ value?: string; locations?: Array<{ component?: string; descriptor?: string }> }>;
  pockets?: Array<{ location?: string }>;
}

export interface CropItem {
  id: string;
  target_id: string;
  param: string;
  value: string;
  component: string | null;
  descriptor: string | null;
  /** 박스를 찾을 때 Claude 에게 주는 설명 */
  query: string;
}

// 부위 정보(locations[])를 가질 수 있는 MULTI 파라미터 — Producer 규칙의 LOCATION_ELIGIBLE 과 같다
const LOCATION_PARAMS = ["material", "surface", "decorative_detail", "attachment"];
// 그 자체가 특정 부품인 파라미터. 값이 None 이면 자를 대상이 없다.
const COMPONENT_PARAMS: Record<string, string> = {
  collar: "collar",
  hood: "hood",
  cuff_type: "cuff",
  closure_type: "front closure",
  graphic: "graphic print",
  slit: "slit",
  ruffle: "ruffle",
};

const isObserved = (o?: Observation) => o?.state === "OBSERVED";

/** 관찰 envelope → 크롭 항목. 부위를 특정할 수 없는 값은 skipped 로 돌려준다. */
export function cropItemsOf(envelope: { targets?: Obj[] }) {
  const items: CropItem[] = [];
  const skipped: Array<{ target_id: string; param: string; value: string; reason: string }> = [];

  for (const t of envelope.targets ?? []) {
    if (!t.eligible || !t.record) continue;
    const tid = String(t.target_id);
    const record = t.record as Obj;
    const garment = (record.category as Observation | undefined)?.value ?? "garment";
    const obs = (record.observations ?? {}) as Record<string, Observation>;
    const push = (param: string, value: string, component: string | null, descriptor: string | null, what: string) =>
      items.push({
        id: `${tid}#${items.length + 1}`,
        target_id: tid,
        param,
        value,
        component,
        descriptor,
        query: `${what} on the ${garment} (${tid})`,
      });

    // ① 부위가 적힌 MULTI 값 — 값 하나에 부위가 여러 개면 부위마다 하나씩
    for (const p of LOCATION_PARAMS) {
      const o = obs[p];
      if (!isObserved(o)) continue;
      for (const v of o?.values ?? []) {
        if (!v.value) continue;
        if (!v.locations?.length) {
          skipped.push({ target_id: tid, param: p, value: v.value, reason: "부위(locations) 없음 — 의복 전체 값" });
          continue;
        }
        for (const loc of v.locations) {
          const where = [loc.component, loc.descriptor?.toLowerCase()].filter(Boolean).join(" ") || "garment edge";
          push(p, v.value, loc.component ?? null, loc.descriptor ?? null, `the "${v.value}" ${p.replace("_", " ")} at the ${where}`);
        }
      }
    }

    // ② 부품 파라미터
    for (const [p, noun] of Object.entries(COMPONENT_PARAMS)) {
      const o = obs[p];
      if (!isObserved(o) || !o?.value || o.value === "None") continue;
      push(p, o.value, null, null, o.value === "Present" ? `the ${noun}` : `the ${o.value} ${noun}`);
    }

    // ③ 포켓 인스턴스 — pocket.pockets[]
    if (isObserved(obs.pocket) && obs.pocket?.value === "Present") {
      for (const inst of obs.pocket.pockets ?? []) {
        push("pocket", "Present", inst.location ?? null, null, `the pocket at the ${inst.location ?? "garment"}`);
      }
    }

    // ④ 노출 부위 · 설계된 개구부
    const ex = obs.exposure_opening;
    if (isObserved(ex)) {
      for (const v of ex?.values ?? []) {
        if (v.value) push("exposure_opening", v.value, null, null, `the exposed / opened "${v.value}" area`);
      }
    }
  }
  return { items, skipped };
}

// ── 박스 찾기 (Claude) ────────────────────────────────────────────────────────────────

const BoxSchema = z.object({
  boxes: z.array(
    z.object({ id: z.string(), found: z.boolean(), box: z.array(z.number()) })
  ),
});

const BOX_JSON_SCHEMA = {
  type: "object",
  properties: {
    boxes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          found: { type: "boolean" },
          box: { type: "array", items: { type: "integer" } },
        },
        required: ["id", "found", "box"],
        additionalProperties: false,
      },
    },
  },
  required: ["boxes"],
  additionalProperties: false,
};

const boxPrompt = (items: CropItem[]) => `You locate garment regions in this image.
For each item below, return the tight bounding box of the region where that item is visible.

Coordinates: [x0, y0, x1, y1] as integers from 0 to 1000, relative to the FULL image width and height
(0,0 = top-left corner, 1000,1000 = bottom-right corner). x0 < x1 and y0 < y1.
If the item is not visible in the image, set "found": false and "box": [0, 0, 0, 0]. Do not guess.
Return one entry per item, using the item's id.

Items:
${items.map((i) => `- id "${i.id}": ${i.query}`).join("\n")}`;

const MEDIA: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

async function locate(image: Buffer, format: string, items: CropItem[]) {
  const client = new Anthropic(anthropicClientOptions());
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: BOX_JSON_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: MEDIA[format], data: image.toString("base64") } },
          { type: "text", text: boxPrompt(items) },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("모델이 부위 찾기를 거절했습니다.");
  if (response.stop_reason === "max_tokens") throw new Error("부위 찾기 출력이 max_tokens 에서 잘렸습니다.");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return { boxes: BoxSchema.parse(JSON.parse(text)).boxes, model: response.model };
}

// ── 크롭 · 저장 ──────────────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** 0–1000 정규화 박스 → 픽셀 박스 → 잘라낼 정사각형 영역 */
function cropRectOf(box: number[], W: number, H: number) {
  const [nx0, ny0, nx1, ny1] = box.map((v) => clamp(v, 0, 1000));
  const x0 = (Math.min(nx0, nx1) / 1000) * W;
  const x1 = (Math.max(nx0, nx1) / 1000) * W;
  const y0 = (Math.min(ny0, ny1) / 1000) * H;
  const y1 = (Math.max(ny0, ny1) / 1000) * H;
  const bw = x1 - x0;
  const bh = y1 - y0;
  // 256 안에 들어가면 원본 해상도 그대로 256 창, 크면 여백을 더한 정사각형을 잘라 256 으로 줄인다
  const side = Math.round(bw <= SIZE && bh <= SIZE ? SIZE : Math.max(bw, bh) * MARGIN);
  const width = Math.min(side, W);
  const height = Math.min(side, H);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return {
    box_px: [x0, y0, x1, y1].map(Math.round),
    left: Math.round(clamp(cx - width / 2, 0, W - width)),
    top: Math.round(clamp(cy - height / 2, 0, H - height)),
    width,
    height,
  };
}

const safe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40);

export interface CropInput {
  image: Buffer;
  fileName: string;
  envelope: { targets?: Obj[] };
}

export async function cropObservedRegions({ image, fileName, envelope }: CropInput) {
  const { items, skipped } = cropItemsOf(envelope);
  if (!items.length) return { ok: false as const, error: "부위를 특정할 수 있는 관찰값이 없습니다.", skipped };

  // EXIF 회전을 먼저 적용해, Claude 가 보는 이미지와 자르는 이미지를 같은 방향으로 맞춘다
  const oriented = await sharp(image).rotate().toBuffer();
  const meta = await sharp(oriented).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!meta.format || !MEDIA[meta.format] || !W || !H) {
    return { ok: false as const, error: `지원하지 않는 이미지 형식입니다 (${meta.format ?? "알 수 없음"}).`, skipped };
  }

  const { boxes, model } = await locate(oriented, meta.format, items);
  const byId = new Map(boxes.map((b) => [b.id, b]));

  const root = process.env.STYLE_EX_CROP_DIR || path.join(process.cwd(), ".style-ex-crops");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(root, `${stamp}_${safe(path.parse(fileName).name) || "image"}`);
  await mkdir(dir, { recursive: true });

  const crops = [];
  for (const [i, item] of items.entries()) {
    const b = byId.get(item.id);
    if (!b?.found || b.box.length !== 4) {
      crops.push({ ...item, found: false, file: null, data_url: null });
      continue;
    }
    const rect = cropRectOf(b.box, W, H);
    if (rect.box_px[2] - rect.box_px[0] < 1 || rect.box_px[3] - rect.box_px[1] < 1) {
      crops.push({ ...item, found: false, file: null, data_url: null });
      continue;
    }
    const png = await sharp(oriented)
      .extract({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
      .resize(SIZE, SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();
    const name = `${String(i + 1).padStart(2, "0")}_${safe(item.target_id)}_${safe(item.param)}_${safe(item.value)}${
      item.component ? `_${safe(item.component)}` : ""
    }${item.descriptor ? `_${safe(item.descriptor)}` : ""}.png`;
    await writeFile(path.join(dir, name), png);
    crops.push({
      ...item,
      found: true,
      box_norm: b.box,
      box_px: rect.box_px,
      crop_rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      file: name,
      data_url: `data:image/png;base64,${png.toString("base64")}`,
    });
  }

  const manifest = {
    image: fileName,
    image_size: { width: W, height: H },
    created_at: new Date().toISOString(),
    locate_model: model,
    crop_size: SIZE,
    crops: crops.map(({ data_url: _dataUrl, ...rest }) => (void _dataUrl, rest)),
    skipped,
  };
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));

  return { ok: true as const, dir, model, crops, skipped };
}
