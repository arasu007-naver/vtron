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
import {
  ENGINE_AXES,
  axisScoreOf,
  letterOf,
  letterOfDirection,
  runScoring,
  scoringRequestOf,
  type EngineAxis,
} from "./scoring";
import { STYLE_IDS } from "./style-ids";
import { judgeTcRules, tcSummaryOf, type TcRuleResult } from "./tc-rules";

/**
 * 의류 스타일 추출 (style-ex).
 *
 * 1. 관찰  : 이미지 1장 → Vision 호출 1회 → 의복별 37개 파라미터 + DM 디테일 + 색상 + 연출 유형
 * 2. 스코어링: EI · SR · DM 은 STMX ITEM SCORING ENGINE V1 (scoring.ts), TC 는 규칙 판정 (tc-rules.ts)
 * 3. 미결  : 엔진 · 규칙이 글자를 정하지 못한 축은 엔진 방향이 있으면 그 글자, 없으면 기본 글자(DEFAULT_LETTER)
 * 4. 조합  : 대표 의복의 네 글자 → 스타일 아이디
 *
 * Claude API 는 1. 관찰에서 한 번만 부른다. LLM 판정(judge.ts)은 부르지 않는다 — 판정 프롬프트의 규칙은
 * 2. 의 엔진(EI · SR · DM)과 tc-rules.ts(TC)가 코드로 갖고 있다.
 */

/** Vision 호출 제한 시간 — 프롬프트가 크고 출력(관찰 + DM + 색상)도 길다 */
const TIMEOUT_MS = 300_000;
/** 관찰 출력이 잘리면 JSON 이 깨지므로 엔진 기본값(8192)보다 넉넉히 준다 */
const VISION_MAX_TOKENS = 32_000;
/** 엔진 anthropic_vision_fn 의 기본 모델과 같다 (precision-first) */
const DEFAULT_VISION_MODEL = "claude-opus-4-8";

/** 관찰에 쓰는 Vision 모델 */
export const visionModel = (): string => process.env.STYLE_EX_MODEL || DEFAULT_VISION_MODEL;

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

/** 상품 사진으로 추출할 때 그 상품의 카탈로그 정보 — 대표 의복(primary)을 고르는 데만 쓴다 */
export interface ProductContext {
  name: string;
  /** brand_catalog_models.whole_category_name (예: 패션의류>여성의류>아우터>재킷) */
  category: string | null;
}

// 상품 정보로 대표 의복을 고정하는 지시. 상품마다 다르므로 버전 관리되는 관찰 프롬프트(캐시 블록)에 넣지 않고
// 그 뒤에 따로 붙인다 — 캐시 prefix 는 그대로 맞는다. 관찰값 자체는 바꾸지 못하게 막는다.
const productAddendum = ({ name, category }: ProductContext) => `
═══════════════════════════════════════════════════════════════
PRODUCT CONTEXT (catalog metadata for THIS image — NOT an observation).
This photo is the listing image of one catalog product:
  product name : ${name.slice(0, 200)}
  category     : ${category?.slice(0, 200) || "(unknown)"}
If the product name and category let you tell WHICH visible garment is the product being sold, that garment is FIXED as the primary target:
  - give it "prominence": "dominant" and give every other garment "secondary" or "minor", even when another garment is larger or more eye-catching;
  - ALSO add "product_match": true as a sibling of "observations" on that one garment, and on no other garment.
If they do not let you tell (no visible garment matches, or more than one could), set prominence from the image as usual and add "product_match" to no garment.
⛔ This context only chooses the primary garment. It must not change any observation, category, eligibility, colour or presentation type — observe every garment exactly as you see it.`;

type Obj = Record<string, unknown>;
type Source = "ENGINE" | "ENGINE_NEUTRAL_FIXED" | "ENGINE_DIRECTION" | "RULE_DEFAULT" | "LLM" | "LLM_FALLBACK";

/**
 * 엔진 · 규칙이 미결로 남긴 축의 기본 글자. 판정 프롬프트는 미결이면 "가장 그럴듯한 쪽"을 고르게 했는데(LLM),
 * 코드에서는 중립 고정 글자(E · S · D)와 같은 쪽으로 둔다. TC 는 중립이 없고, 미결은 T 근거(TRUE)를 찾지 못한
 * 경우라 C 로 둔다. 출처는 RULE_DEFAULT("규칙 기본값")로 남겨 엔진이 정한 글자와 구분한다.
 */
const DEFAULT_LETTER = { EI: "E", TC: "C", SR: "S", DM: "D" } as const;

export interface ExtractInput {
  image: Buffer;
  fileName: string;
  /** 관찰 프롬프트 — 버전 관리(prompt-versions.ts)가 정한 내용. 비어 있으면 코드 기본값 */
  prompt?: string;
  /** 상품 사진이면 그 상품의 이름 · 분류 — 있으면 맞는 의복을 대표 의복으로 고정한다 */
  product?: ProductContext | null;
}

/** Vision 호출 → 관찰 envelope (+ 대상별 색상 · 연출 유형) */
async function observe(image: Buffer, fileName: string, prompt: string, product: ProductContext | null) {
  const model = visionModel();
  const client = new Anthropic(anthropicClientOptions());
  // 엔진의 주입 지점(visionFn). 엔진 anthropic_vision_fn 과 같은 요청(이미지 + 프롬프트, 1회)을 SDK 로 보낸다 —
  // 워크스페이스 헤더(anthropic-workspace-id)를 붙일 수 있게 하기 위해서다. 이미지 블록은 엔진의
  // imageToBlock 이 파일 바이트로 미디어 타입을 판별해 만든다. 프롬프트는 엔진 것 대신 style-ex 프롬프트를 쓴다.
  // 출력이 길어 스트리밍으로 받는다 (긴 비스트리밍 요청은 HTTP 타임아웃 위험).
  //
  // 프롬프트 캐싱: 관찰 프롬프트(약 68,000 토큰)는 요청마다 같고 입력 비용의 대부분이다. 캐시는 요청 앞부분이
  // 같을 때만 맞으므로 프롬프트를 이미지 **앞에** 두고 거기에 cache_control 을 단다 — 5분 안의 다음 추출은
  // 이 부분을 캐시 읽기(정가의 0.1배)로 낸다. (docs/product-style-id-extraction-price.md)
  const visionFn = async (_enginePrompt: string, img: unknown) => {
    const message = await client.messages
      .stream({
        model,
        max_tokens: VISION_MAX_TOKENS,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt, cache_control: { type: "ephemeral" } },
              ...(product ? [{ type: "text" as const, text: productAddendum(product) }] : []),
              // imageToBlock 은 JS 라 타입이 넓게 추론된다 — 실제 모양은 { type: "image", source: { type: "base64", … } }
              imageToBlock(img) as Anthropic.ImageBlockParam,
            ],
          },
        ],
      })
      .finalMessage();
    const { input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens } = message.usage;
    console.info(
      `[style-ex] 관찰 usage — 입력 ${input_tokens} · 캐시 쓰기 ${cache_creation_input_tokens ?? 0} · ` +
        `캐시 읽기 ${cache_read_input_tokens ?? 0} · 출력 ${output_tokens}`
    );
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
    if (product) t.product_match = cand.product_match === true;
  });
  return { ok: true as const, envelope, contract_valid: governed.contract_valid };
}

/**
 * 스타일 아이디를 정할 대표 의복 — 상품 정보로 고정된 의복(product_match), 없으면 prominence 가 dominant 인
 * 첫 의복, 그것도 없으면 첫 적격 의복
 */
function representativeOf(targets: Obj[]) {
  const eligible = targets.filter((t) => t.eligible && t.record);
  return (
    eligible.find((t) => t.product_match === true) ??
    eligible.find((t) => t.prominence === "dominant") ??
    eligible[0] ??
    null
  );
}

/**
 * 추출 = 관찰(Claude API 1회) → 판정 함수(judgeStyleIdByRules, API 호출 없음).
 * judgement 는 LLM 판정을 하지 않으므로 늘 null — 응답 · product_style 모양을 지키려고 남겨 둔다.
 */
export async function extractStyle({ image, fileName, prompt, product }: ExtractInput) {
  const observation = await observe(image, fileName, prompt?.trim() ? prompt : defaultPrompt(), product ?? null);
  if (!observation.ok) return { styleId: null, scoring: null, judgement: null, observation };
  const { styleId, scoring } = judgeStyleIdByRules(observation.envelope.targets, fileName);
  return { styleId, scoring, judgement: null, observation };
}

/**
 * 판정 함수 — 관찰 envelope 의 targets 만으로 스타일 아이디를 정한다. Claude API 를 부르지 않는다.
 * 판정 프롬프트(judge.ts DEFAULT_JUDGE_PROMPT)의 축별 규칙을 코드로 가진 것:
 *   EI · SR · DM = STMX ITEM SCORING ENGINE V1 (scoring.ts) · TC = tc-rules.ts
 * 저장된 관찰(product_style.observation.envelope.targets)로 다시 판정할 때도 이것을 부른다.
 */
export function judgeStyleIdByRules(targets: Obj[], fileName: string) {
  const rep = representativeOf(targets);
  if (!rep) return { styleId: { ok: false, error: "판정할 의복이 없습니다 (적격 target 0개)." }, scoring: null };

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

  // 판정 — EI · SR · DM 은 스코어링 엔진 점수, TC 는 규칙 판정(tc-rules.ts). 대표 의복만 본다. API 호출 없음.
  const repScore = Array.isArray(scoring) ? scoring.find((s) => s.target_id === rep.target_id) : null;
  const tcRules = judgeTcRules(rep);
  const fromEngine = Object.fromEntries(
    ENGINE_AXES.map((axis) => {
      const s = (repScore?.axes as Record<EngineAxis, ReturnType<typeof axisScoreOf>> | undefined)?.[axis];
      return [axis, { s, letter: letterOf(axis, s?.score ?? null) }];
    })
  ) as Record<EngineAxis, { s: ReturnType<typeof axisScoreOf> | undefined; letter: ReturnType<typeof letterOf> }>;

  const axes: Record<
    string,
    { letter: string | null; source: Source | null; label: string | null; detail: string | null; rules?: TcRuleResult }
  > = {};
  for (const axis of ["EI", "TC", "SR", "DM"] as const) {
    if (axis === "TC") {
      axes.TC = tcRules.letter
        ? { letter: tcRules.letter, source: "ENGINE", label: tcRules.range, detail: tcSummaryOf(tcRules), rules: tcRules }
        : {
            letter: DEFAULT_LETTER.TC,
            source: "RULE_DEFAULT",
            label: null,
            detail: `규칙 미결 (${tcSummaryOf(tcRules)}) → 기본값 ${DEFAULT_LETTER.TC}`,
            rules: tcRules,
          };
      continue;
    }
    const { s, letter } = fromEngine[axis];
    if (letter) {
      axes[axis] = {
        letter: letter.letter,
        source: letter.neutralFixed ? "ENGINE_NEUTRAL_FIXED" : "ENGINE",
        label: s?.label ?? null,
        detail: letter.neutralFixed ? `${s?.label} 중립 → ${letter.letter} 로 고정` : null,
      };
    } else {
      // 엔진이 점수를 내지 못한 축(입력 부족 · 판정 불가 등) — 방향이 확정됐으면 그 글자, 아니면 기본 글자
      const why = `엔진 점수 없음 (${[s?.status, s?.reason].filter(Boolean).join(" · ") || "스코어링 실패"})`;
      const byDirection = letterOfDirection(axis, s?.direction ?? null);
      axes[axis] = byDirection
        ? { letter: byDirection, source: "ENGINE_DIRECTION", label: null, detail: `${why} → 방향 ${s?.direction}` }
        : { letter: DEFAULT_LETTER[axis], source: "RULE_DEFAULT", label: null, detail: `${why} → 기본값 ${DEFAULT_LETTER[axis]}` };
    }
  }

  const letters = ["EI", "TC", "SR", "DM"].map((a) => axes[a].letter);
  const id = letters.every(Boolean) ? letters.join("") : null;
  const styleId = id
    ? { ok: true, style_id: id, style: STYLE_IDS[id] ?? null, target_id: rep.target_id, axes }
    : { ok: false, error: "네 축 중 글자를 정하지 못한 축이 있습니다.", target_id: rep.target_id, axes };

  return { styleId, scoring };
}
