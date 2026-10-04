import "server-only";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

// 관찰: 현재 production Vision Producer V1_3 (37개 파라미터 + DM 디테일 관찰층).
//   SR · DM 엔진이 V1_3 에 묶여 있고, EI 는 V1_1 과 같은 37개 파라미터를 V1_3 에서 그대로 읽는다.
import { governEnvelope } from "./scoring/01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/producer_controller_v1.js";
import { runOneCall } from "./scoring/01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/producer_model_adapter_v1.js";
import { buildPrompt as buildProducerPrompt } from "./scoring/01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/producer_prompt_v1.js";
// 색상 관찰(Colour V1)과 결합 프롬프트 — 엔진 스냅샷의 원본을 그대로 쓴다.
import { validateColorObservation } from "./engine/run/color_recovery/color_contract_v1.js";
import { buildCombinedPromptV2 } from "./engine/run/onecall_prototype/onecall_prototype_v1.js";
import { buildPrompt as buildRootPrompt } from "./engine/producer_prompt_v1.js";
import { imageToBlock } from "./engine/run/anthropic_vision_fn.js";
import { anthropicClientOptions } from "./api-key";
import { judgeStyleId } from "./judge";
import {
  ENGINE_AXES,
  axisScoreOf,
  letterOf,
  runScoring,
  scoringRequestOf,
  type EngineAxis,
} from "./scoring";
import { STYLE_IDS } from "./style-ids";

/**
 * 의류 스타일 추출 (style-ex).
 *
 * 1. 관찰  : 이미지 1장 → Vision 호출 1회 → 의복별 37개 파라미터 + DM 디테일 + 색상 + 연출 유형
 * 2. 스코어링: EI · SR · DM 은 STMX ITEM SCORING ENGINE V1 (scoring.ts)
 * 3. 판정  : TC 와 엔진 점수가 없는 축은 LLM 판정 (judge.ts)
 * 4. 조합  : 대표 의복의 네 글자 → 스타일 아이디
 */

/** Vision 호출 제한 시간 — 프롬프트가 크고 출력(관찰 + DM + 색상)도 길다 */
const TIMEOUT_MS = 300_000;
/** 관찰 출력이 잘리면 JSON 이 깨지므로 엔진 기본값(8192)보다 넉넉히 준다 */
const VISION_MAX_TOKENS = 32_000;
/** 엔진 anthropic_vision_fn 의 기본 모델과 같다 (precision-first) */
const DEFAULT_VISION_MODEL = "claude-opus-4-8";

// 색상 관찰 지시문 — onecall 프로토타입의 Sequential One-Call V2 추가 지시를 그대로 떼어 쓴다.
// (결합 프롬프트 = 루트 Producer 프롬프트 + 추가 지시. 앞부분을 잘라내면 추가 지시만 남는다.)
const COLOUR_ADDENDUM = (() => {
  const base = buildRootPrompt();
  const combined = buildCombinedPromptV2();
  if (!combined.startsWith(base)) throw new Error("onecall 결합 프롬프트 구조가 바뀌었습니다");
  return combined.slice(base.length);
})();

// SR 판정 가능 여부를 정하는 연출 유형. 파라미터가 아니라 색상처럼 target 의 형제 메타데이터다.
// 값은 SR 레지스트리의 presentation_type 과 같다.
const PRESENTATION_ADDENDUM = `

═══════════════════════════════════════════════════════════════
PRESENTATION TYPE (metadata — NOT a garment parameter; it must not change any observation).
For EACH eligible target ALSO add "presentation_type" as a sibling of "observations":
  "WORN"         = the garment is worn on a visible real human body, so its relationship to the body can be seen
  "FLAT_LAY"     = the garment is laid flat on a surface, with no wearer
  "PRODUCT_ONLY" = the garment is shown without a real wearer: on a hanger, ghost / invisible mannequin, mannequin or body form, or a packshot of the product alone
Choose exactly one token.`;

/** Vision 모델에 보내는 기본 관찰 프롬프트 */
export const defaultPrompt = (): string => buildProducerPrompt() + COLOUR_ADDENDUM + PRESENTATION_ADDENDUM;

type Obj = Record<string, unknown>;
type Source = "ENGINE" | "ENGINE_NEUTRAL_FIXED" | "LLM" | "LLM_FALLBACK";

export interface ExtractInput {
  image: Buffer;
  fileName: string;
  /** 비어 있으면 기본 관찰 프롬프트를 쓴다 */
  prompt?: string;
  /** 비어 있으면 판정 기본 프롬프트를 쓴다 */
  judgePrompt?: string;
}

/** Vision 호출 → 관찰 envelope (+ 대상별 색상 · 연출 유형) */
async function observe(image: Buffer, fileName: string, prompt: string) {
  const model = process.env.STYLE_EX_MODEL || DEFAULT_VISION_MODEL;
  const client = new Anthropic(anthropicClientOptions());
  // 엔진의 주입 지점(visionFn). 엔진 anthropic_vision_fn 과 같은 요청(이미지 + 프롬프트, 1회)을 SDK 로 보낸다 —
  // 워크스페이스 헤더(anthropic-workspace-id)를 붙일 수 있게 하기 위해서다. 이미지 블록은 엔진의
  // imageToBlock 이 파일 바이트로 미디어 타입을 판별해 만든다. 프롬프트는 엔진 것 대신 style-ex 프롬프트를 쓴다.
  // 출력이 길어 스트리밍으로 받는다 (긴 비스트리밍 요청은 HTTP 타임아웃 위험).
  const visionFn = async (_enginePrompt: string, img: unknown) => {
    const message = await client.messages
      .stream({
        model,
        max_tokens: VISION_MAX_TOKENS,
        messages: [
          {
            role: "user",
            // imageToBlock 은 JS 라 타입이 넓게 추론된다 — 실제 모양은 { type: "image", source: { type: "base64", … } }
            content: [imageToBlock(img) as Anthropic.ImageBlockParam, { type: "text", text: prompt }],
          },
        ],
      })
      .finalMessage();
    if (message.stop_reason === "max_tokens") throw new Error("관찰 출력이 max_tokens 에서 잘렸습니다.");
    return message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  };

  // 미디어 타입은 확장자가 아니라 파일 바이트로 판별한다(엔진 D5 규칙).
  // 엔진의 판별기는 파일 경로 입력에서만 동작하므로 임시 파일로 넘긴다.
  const tmp = path.join(tmpdir(), `style-ex-${randomUUID()}${path.extname(fileName)}`);
  await writeFile(tmp, image);
  let call;
  try {
    call = await runOneCall(tmp, { visionFn, timeoutMs: TIMEOUT_MS });
  } finally {
    await unlink(tmp).catch(() => {});
  }
  if (!call.ok) return { ok: false as const, error: { stage: "model_call", code: call.code, detail: call.detail, attempts: call.attempts }, raw: call.raw };

  // role · extraction_depth · 검증은 엔진의 단일 권위(governEnvelope)가 정한다.
  const governed = governEnvelope(call.pkg, { imageId: fileName, model, visionCalls: call.attempts });
  const envelope = governed.envelope as { targets: Obj[] };
  // 대상별 형제 메타데이터만 덧붙인다 (onecall 프로토타입의 governCombinedPackage 와 같은 방식).
  // governEnvelope 는 candidates 순서대로 target 을 하나씩 만들므로 인덱스가 맞는다.
  const candidates = (call.pkg as { targets: Obj[] }).targets;
  envelope.targets.forEach((t, i) => {
    if (!t.eligible) return;
    const cand = candidates[i] ?? {};
    const colour = cand.color_observation ?? null;
    t.color_observation = colour;
    t.color_validation = colour ? validateColorObservation(colour) : { contract_errors: ["COLOR_MISSING"] };
    t.presentation_type = cand.presentation_type ?? null;
  });
  return { ok: true as const, envelope, contract_valid: governed.contract_valid };
}

/** 스타일 아이디를 정할 대표 의복 — prominence 가 dominant 인 첫 의복, 없으면 첫 적격 의복 */
function representativeOf(targets: Obj[]) {
  const eligible = targets.filter((t) => t.eligible && t.record);
  return eligible.find((t) => t.prominence === "dominant") ?? eligible[0] ?? null;
}

export async function extractStyle({ image, fileName, prompt, judgePrompt }: ExtractInput) {
  const custom = prompt?.trim() ? prompt : null;
  const observation = await observe(image, fileName, custom ?? defaultPrompt());
  if (!observation.ok) return { customPrompt: custom !== null, styleId: null, scoring: null, judgement: null, observation };

  const targets = observation.envelope.targets;
  const rep = representativeOf(targets);
  if (!rep) {
    return {
      customPrompt: custom !== null,
      styleId: { ok: false, error: "판정할 의복이 없습니다 (적격 target 0개)." },
      scoring: null,
      judgement: null,
      observation,
    };
  }

  // 엔진 스코어링 — 적격 의복 전부 (대표 의복만 스타일 아이디에 쓰고, 나머지는 참고로 보여 준다)
  const eligible = targets.filter((t) => t.eligible && t.record);
  const built = eligible.map((t) => scoringRequestOf(t, fileName));
  let scoring: Obj[] | { error: string };
  try {
    const results = runScoring(built.map((b) => b.request));
    scoring = eligible.map((t, i) => ({
      target_id: t.target_id,
      category: (t.record as Obj).category,
      prominence: t.prominence,
      sr_evidence_eligibility: built[i].srEligibility,
      axes: Object.fromEntries(ENGINE_AXES.map((a) => [a, axisScoreOf(results[i], a)])),
      item_result: results[i],
    }));
  } catch (e) {
    scoring = { error: e instanceof Error ? e.message : String(e) };
  }

  // LLM 판정 — 대표 의복의 관찰값만 본다. TC 는 항상, 나머지 축은 엔진 점수가 없을 때만 쓴다.
  const judgement = await judgeStyleId({ targets: [rep], prompt: judgePrompt });

  const repScore = Array.isArray(scoring) ? scoring.find((s) => s.target_id === rep.target_id) : null;
  const axes: Record<string, { letter: string | null; source: Source | null; label: string | null; detail: string | null }> = {};
  for (const axis of ["EI", "TC", "SR", "DM"] as const) {
    const llm = judgement.ok ? judgement.axes[axis] : null;
    if (axis === "TC") {
      axes.TC = { letter: llm?.letter ?? null, source: llm ? "LLM" : null, label: null, detail: llm?.rationale ?? null };
      continue;
    }
    const s = (repScore?.axes as Record<EngineAxis, ReturnType<typeof axisScoreOf>> | undefined)?.[axis];
    const fromEngine = letterOf(axis, s?.score ?? null);
    if (fromEngine) {
      axes[axis] = {
        letter: fromEngine.letter,
        source: fromEngine.neutralFixed ? "ENGINE_NEUTRAL_FIXED" : "ENGINE",
        label: s?.label ?? null,
        detail: fromEngine.neutralFixed ? `${s?.label} 중립 → ${fromEngine.letter} 로 고정` : null,
      };
    } else {
      // 엔진이 점수를 내지 못한 축(입력 부족 · 판정 불가 등)은 LLM 판정으로 메운다
      axes[axis] = {
        letter: llm?.letter ?? null,
        source: llm ? "LLM_FALLBACK" : null,
        label: null,
        detail: `엔진 점수 없음 (${[s?.status, s?.reason].filter(Boolean).join(" · ") || "스코어링 실패"})`,
      };
    }
  }

  const letters = ["EI", "TC", "SR", "DM"].map((a) => axes[a].letter);
  const id = letters.every(Boolean) ? letters.join("") : null;
  const styleId = id
    ? { ok: true, style_id: id, style: STYLE_IDS[id] ?? null, target_id: rep.target_id, axes }
    : { ok: false, error: "네 축 중 글자를 정하지 못한 축이 있습니다.", target_id: rep.target_id, axes };

  return { customPrompt: custom !== null, styleId, scoring, judgement, observation };
}
