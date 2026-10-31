import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicClientOptions, geminiApiKey, MISSING_GEMINI_KEY_MESSAGE } from "./api-key";
import { styleIdCandidates, STYLE_IDS } from "./style-ids";

/**
 * 판정 함수 V2 — STMX Item Scoring V2 · Integrated Runtime R4 (ITEM-V2-INTEGRATED-FINAL-FREEZE-V1-2026-10-29).
 *
 * 관찰 envelope(Item Vision V1.3)과 사진으로 스타일 아이디를 정한다. 판정 규칙은 모두 엔진 코드가 갖는다 —
 * 이 파일은 엔진을 부르고(①–④) 엔진의 방향 토큰을 스타일 아이디 글자로 옮기기만 한다(⑤).
 *
 *   ① 채점 단위 — 상품 정보로 고정된 의복(product_match)이 있으면 그 의복을 사용자 선택(ITEM)으로 넘긴다.
 *      없으면 엔진의 자동 Primary 선택. 자동 선택이 동률(UNRESOLVED)이면 representativeOf 로 고른 의복을 넘긴다.
 *   ② 대상 지정 색상 — 엔진이 만든 그 단위의 대상 목록(manifest)으로 색상 요청문을 만들고 Vision 을 1회 더 부른다
 *      (Target-Aware Colour V1 · ONE_CALL). 요청문은 동결 Colour V1 프롬프트를 바이트 그대로 담는다 — 고칠 수 없다.
 *      응답은 Colour V1 검증기로 검사해 패킷(TARGET_AWARE_COLOUR_PACKET_V1)으로 묶는다. 실패해도 판정은 한다(EI 는 색상 미확인).
 *   ③ R4 — 패킷이 사진 · envelope 와 맞는지 검사하고, 그 단위 의복의 색만 붙여 R3 → 동결 EI · TC · SR · DM V2 로 보낸다.
 *   ④ 결과 — 축마다 방향 토큰 하나와 한국어 근거(reason). 점수 · 강도 · 스타일 아이디는 엔진이 내지 않는다.
 *   ⑤ 글자 — E · I / CLASSIC → C · TRANSFORMATIVE → T / S · R / D · M. EI NEUTRAL 은 양쪽 글자(E/I, OR).
 *      방향이 없는 축은 기본 글자(RULE_DEFAULT)로 채우고 그 이유를 남긴다.
 *
 * 엔진은 lib/style-ex/scoring-v2/ 에 백업 폴더(05_INTEGRATED_ITEM_SCORING_RUNTIME_V2)와 같은 상대 경로로 둔다 —
 * 로드할 때 봉인된 파일의 SHA-256 을 모두 다시 검사하므로(어긋나면 예외) 그 폴더의 파일은 고치지 않는다.
 */

type Obj = Record<string, unknown>;
export type JudgeProvider = "claude" | "gemini";

/** 대표 의복을 고른 근거 */
export type RepresentativeBasis = "PRODUCT_MATCH" | "DOMINANT" | "FIRST_ELIGIBLE" | "ENGINE_AUTOMATIC";

/**
 * 대표 의복 — 상품 정보로 고정된 의복(product_match), 없으면 prominence 가 dominant 인 첫 의복, 그것도 없으면
 * 첫 적격 의복. V2 판정에서는 엔진의 자동 선택이 동률일 때만 쓴다.
 */
export function representativeOf(targets: Obj[]): { target: Obj; basis: Exclude<RepresentativeBasis, "ENGINE_AUTOMATIC"> } | null {
  const eligible = targets.filter((t) => t.eligible && t.record);
  const byProduct = eligible.find((t) => t.product_match === true);
  if (byProduct) return { target: byProduct, basis: "PRODUCT_MATCH" };
  const dominant = eligible.find((t) => t.prominence === "dominant");
  if (dominant) return { target: dominant, basis: "DOMINANT" };
  return eligible[0] ? { target: eligible[0], basis: "FIRST_ELIGIBLE" } : null;
}

// ── 엔진 로드 ──────────────────────────────────────────────────────────────────────────
// scoring.ts 와 같은 이유로 번들하지 않고 디스크의 원본을 Node require 로 읽는다(엔진이 __dirname 기준으로 봉인을 검사한다).
const V2_ROOT = path.join(process.cwd(), "lib", "style-ex", "scoring-v2");
const R4_ENTRY = path.join(
  V2_ROOT, "01_ENGINES", "ITEM_SCORING_ENGINE", "STMX_CLEAN_ENGINE", "04_CLEAN_ENGINE_CODE", "src", "item_v2_r4", "item_v2_r4_entry.js"
);

/** Order Q 호출 설정(STMX_ITEM_VISION_V1_3_INVOCATION_CONFIG_FQ_V2) — 색상 호출은 8,192 */
const COLOUR_MAX_TOKENS = 8192;
const TIMEOUT_MS = 300_000;

interface ColourSuccessor {
  acquireTargetAwareColour(p: { manifest: Obj; image: unknown; mode: "ONE_CALL" | "PER_TARGET"; transport: Transport; model?: string }): Promise<Obj>;
}
interface R4Runtime {
  id: string;
  scoreItemV2R4(input: Obj): Obj;
  planColourAcquisition(input: Obj): Obj;
  colourSuccessor: ColourSuccessor;
}
type Transport = (prompt: string, image: unknown, opts: { model?: string }) => Promise<string>;

let runtime: R4Runtime | null = null;

function loadR4(): R4Runtime {
  if (!runtime) {
    const { createRequire } = process.getBuiltinModule("module") as typeof import("node:module");
    const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
    const { createItemV2R4Runtime } = nodeRequire(R4_ENTRY) as { createItemV2R4Runtime: () => R4Runtime };
    runtime = createItemV2R4Runtime();
  }
  return runtime;
}

// ── 색상 호출 (②) ──────────────────────────────────────────────────────────────────────

/** 이미지 바이트 → 미디어 타입. 엔진처럼 확장자가 아니라 바이트로 판별하고, 모르면 거절한다. */
function mediaTypeOf(b: Buffer): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString("latin1"))) return "image/gif";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  throw new Error("색상 호출: 지원하지 않는 이미지 바이트입니다 (JPG · PNG · GIF · WEBP).");
}

/** 엔진 전송 함수(run/anthropic_vision_fn.js)와 같은 모양 — 이미지 블록 다음에 요청문 */
const claudeTransport = (model: string): Transport => async (prompt, image) => {
  const img = image as Buffer;
  const message = await new Anthropic(anthropicClientOptions()).messages.create(
    {
      model,
      max_tokens: COLOUR_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaTypeOf(img), data: img.toString("base64") } },
            { type: "text", text: prompt },
          ],
        },
      ],
    },
    { timeout: TIMEOUT_MS }
  );
  console.info(`[style-ex] Claude 색상 usage — 입력 ${message.usage.input_tokens} · 출력 ${message.usage.output_tokens}`);
  if (message.stop_reason === "max_tokens") throw new Error("색상 출력이 max_tokens 에서 잘렸습니다.");
  return message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
};

const geminiTransport = (model: string): Transport => async (prompt, image) => {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error(MISSING_GEMINI_KEY_MESSAGE);
  const img = image as Buffer;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mediaTypeOf(img), data: img.toString("base64") } }, { text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: COLOUR_MAX_TOKENS, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini 색상 호출 실패 (${model}, HTTP ${res.status}): ${await res.text().catch(() => "")}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
};

// ── 방향 → 글자 (⑤) ────────────────────────────────────────────────────────────────────

const AXES = ["EI", "TC", "SR", "DM"] as const;
type Axis = (typeof AXES)[number];

/** 엔진 방향 토큰(item_v2_contracts CUSTOMER_TOKENS) → 글자들. 첫 글자가 대표 글자 */
const DIRECTION_LETTERS: Record<Axis, Record<string, string[]>> = {
  EI: { E: ["E"], I: ["I"], NEUTRAL: ["E", "I"] },
  TC: { TRANSFORMATIVE: ["T"], CLASSIC: ["C"] },
  SR: { S: ["S"], R: ["R"] },
  DM: { D: ["D"], M: ["M"] },
};

/** 방향이 없는 축의 기본 글자 — V1 판정(extract.ts DEFAULT_LETTER)과 같다 */
const DEFAULT_LETTER: Record<Axis, string> = { EI: "E", TC: "C", SR: "S", DM: "D" };

export type V2Source = "ENGINE_V2" | "ENGINE_V2_NEUTRAL" | "RULE_DEFAULT";

export interface V2AxisResult {
  letter: string;
  letters: string[];
  source: V2Source;
  /** 엔진 방향 토큰 (예: TRANSFORMATIVE) — 방향이 없으면 null */
  label: string | null;
  /** 엔진의 한국어 근거, 방향이 없으면 그 이유 */
  detail: string | null;
}

function axisOf(axis: Axis, out: { direction?: string | null; reason?: string | null } | undefined, missing: Obj | undefined): V2AxisResult {
  const direction = out?.direction ?? null;
  const letters = direction ? DIRECTION_LETTERS[axis][direction] : undefined;
  if (letters) {
    const neutral = letters.length > 1;
    return {
      letter: letters[0],
      letters,
      source: neutral ? "ENGINE_V2_NEUTRAL" : "ENGINE_V2",
      label: direction,
      detail: (neutral ? `중립 → ${letters.join(" 또는 ")} (양쪽 모두) · ` : "") + (out?.reason ?? ""),
    };
  }
  const why = missing ? [missing.outcome, missing.code].filter(Boolean).join(" · ") : direction ? `알 수 없는 방향 ${direction}` : "방향 없음";
  return {
    letter: DEFAULT_LETTER[axis],
    letters: [DEFAULT_LETTER[axis]],
    source: "RULE_DEFAULT",
    label: null,
    detail: `엔진 방향 없음 (${why}) → 기본값 ${DEFAULT_LETTER[axis]}`,
  };
}

// ── 판정 ───────────────────────────────────────────────────────────────────────────────

/** 관찰 envelope 에서 style-ex 가 덧붙인 대상별 메타데이터를 뺀다 — 엔진에는 V1.3 envelope 그대로 보낸다 */
const STYLE_EX_KEYS = ["color_observation", "color_validation", "presentation_type", "product_match"];
const visionEnvelopeOf = (envelope: Obj): Obj => ({
  ...envelope,
  targets: ((envelope.targets as Obj[]) ?? []).map((t) => Object.fromEntries(Object.entries(t).filter(([k]) => !STYLE_EX_KEYS.includes(k)))),
});

const itemSelection = (targetId: unknown) => ({ product_identity: { merchandise_type: "ITEM", primary_target_id: String(targetId) } });

export interface JudgeV2Input {
  /** governEnvelope 가 만든 관찰 envelope (style-ex 메타데이터가 붙어 있어도 된다) */
  envelope: Obj;
  /** 관찰에 쓴 사진 바이트 — 색상 호출과 image_sha256 에 쓴다 */
  image: Buffer;
  provider: JudgeProvider;
  /** 색상 호출에 쓸 Vision 모델 — 관찰과 같은 모델 */
  model: string;
}

/**
 * 판정 함수 V2. 색상 호출(Vision 1회)을 하므로 async 다.
 * 응답 모양은 V1 판정(judgeStyleIdByRules)과 같다 — styleId { ok, style_id, style, candidates, target_id, target_basis, axes } · scoring.
 */
export async function judgeStyleIdByEngineV2({ envelope, image, provider, model }: JudgeV2Input) {
  const targets = (envelope.targets as Obj[]) ?? [];
  if (!targets.some((t) => t.eligible && t.record)) {
    return { styleId: { ok: false, error: "판정할 의복이 없습니다 (적격 target 0개)." }, scoring: null };
  }

  let rt: R4Runtime;
  try {
    rt = loadR4();
  } catch (e) {
    // 봉인 검사 실패 등 — V1 로 돌아가지 않는다 (엔진 원칙: fail closed)
    const error = `V2 판정 엔진을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`;
    return { styleId: { ok: false, error }, scoring: { error } };
  }

  // ① 채점 단위
  const request: Obj = { vision_envelope: visionEnvelopeOf(envelope), image_sha256: createHash("sha256").update(image).digest("hex") };
  const byProduct = targets.find((t) => t.eligible && t.record && t.product_match === true);
  let basis: RepresentativeBasis = "ENGINE_AUTOMATIC";
  if (byProduct) {
    request.user_selection = itemSelection(byProduct.target_id);
    basis = "PRODUCT_MATCH";
  }
  let plan = rt.planColourAcquisition(request);
  let selectionNote: string | null = null;
  if (!plan.ok && plan.state === "UNRESOLVED") {
    const rep = representativeOf(targets);
    if (rep) {
      request.user_selection = itemSelection(rep.target.target_id);
      basis = rep.basis;
      selectionNote = `엔진 자동 선택이 동률이라 ${String(rep.target.target_id)} 를 사용자 선택으로 넘김`;
      plan = rt.planColourAcquisition(request);
    }
  }

  // ② 대상 지정 색상
  let packet: Obj | null = null;
  let colourError: string | null = null;
  if (plan.ok) {
    // 엔진은 전송 예외를 코드(TRANSPORT_FAILURE)로만 남기므로 원문 메시지를 따로 잡아 둔다
    const send = provider === "gemini" ? geminiTransport(model) : claudeTransport(model);
    let transportError: string | null = null;
    const transport: Transport = (prompt, img, opts) =>
      send(prompt, img, opts).catch((e) => {
        transportError = e instanceof Error ? e.message : String(e);
        throw e;
      });
    try {
      packet = await rt.colourSuccessor.acquireTargetAwareColour({ manifest: plan.manifest as Obj, image, mode: "ONE_CALL", transport, model });
      // 전송 실패 · 응답 거절은 예외가 아니라 패킷의 요청 기록(response_error)에 남는다
      const failed = (((packet.acquisition as Obj | undefined)?.requests as Obj[] | undefined) ?? []).filter((r) => r.response_error);
      if (failed.length) colourError = [...failed.map((r) => JSON.stringify(r.response_error)), transportError].filter(Boolean).join(" · ");
    } catch (e) {
      colourError = e instanceof Error ? e.message : String(e);
    }
  } else {
    colourError = `색상 대상 목록을 만들지 못했습니다 (${String(plan.state ?? "")}${plan.detail ? ` · ${String(plan.detail)}` : ""})`;
  }
  if (colourError) console.warn(`[style-ex] V2 색상 없이 판정합니다: ${colourError}`);

  // ③ R4
  const result = rt.scoreItemV2R4(packet ? { ...request, target_colour_packet: packet } : request);
  const internal = (result.internal as Obj | undefined) ?? {};
  const unit = (internal.colour_association as Obj | undefined)?.scoring_unit as { type: string; target_ids: string[] } | null | undefined;
  const scoring = {
    engine: rt.id,
    result_status: result.result_status,
    input_issue: result.input_issue ?? null,
    scoring_unit: unit ?? null,
    selection_note: selectionNote,
    colour: {
      mode: "ONE_CALL",
      error: colourError,
      per_target: (internal.colour_association as Obj | undefined)?.per_target ?? null,
      packet,
    },
    item_result: result,
  };

  if (!unit?.target_ids?.length) {
    const issue = result.input_issue as Obj | null | undefined;
    const why = issue ? `${String(issue.issue ?? "")} ${String(issue.detail ?? "")}`.trim() : String(result.result_status ?? "");
    return { styleId: { ok: false, error: `V2 엔진이 판정할 의복을 정하지 못했습니다 (${why}).` }, scoring };
  }

  // ④ · ⑤ 방향 → 글자
  const out = (result.customer_output as Record<Axis, { direction: string | null; reason: string | null }> | undefined) ?? undefined;
  const missing = (result.incomplete_axes as Obj[] | undefined) ?? [];
  const axes = Object.fromEntries(
    AXES.map((a) => [a, axisOf(a, out?.[a], missing.find((m) => m.axis === a))])
  ) as Record<Axis, V2AxisResult>;
  const id = AXES.map((a) => axes[a].letter).join("");
  return {
    styleId: {
      ok: true,
      style_id: id,
      style: STYLE_IDS[id] ?? null,
      candidates: styleIdCandidates(axes),
      target_id: unit.target_ids[0],
      target_basis: basis,
      axes,
    },
    scoring,
  };
}
