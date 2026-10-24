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
import {
  anthropicApiKey,
  anthropicClientOptions,
  geminiApiKey,
  MISSING_GEMINI_KEY_MESSAGE,
} from "./api-key";
import {
  ENGINE_AXES,
  axisScoreOf,
  letterOf,
  letterOfDirection,
  runScoring,
  scoringRequestOf,
  type EngineAxis,
} from "./scoring";
import { STYLE_IDS, styleIdCandidates } from "./style-ids";
import { splitProductContext } from "./product-context";
import { judgeTcRules, tcSummaryOf, type TcRuleResult } from "./tc-rules";

/**
 * 의류 스타일 추출 (style-ex).
 *
 * 1. 관찰  : 이미지 1장 → Vision 호출 1회(Claude 또는 Gemini 3.8 Flash) → 의복별 37개 파라미터 + DM 디테일 + 색상 + 연출 유형
 * 2. 스코어링: EI · SR · DM 은 STMX ITEM SCORING ENGINE V1 (scoring.ts), TC 는 규칙 판정 (tc-rules.ts)
 * 3. 미결  : 엔진 · 규칙이 글자를 정하지 못한 축은 엔진 방향이 있으면 그 글자, 없으면 기본 글자(DEFAULT_LETTER)
 * 4. 조합  : 대표 의복의 네 글자 → 스타일 아이디
 *
 * LLM 판정(judge.ts)은 부르지 않는다 — 판정 프롬프트의 규칙은
 * 2. 의 엔진(EI · SR · DM)과 tc-rules.ts(TC)가 코드로 갖고 있다.
 */

export type StyleExProvider = "claude" | "gemini";

/** Vision 호출 제한 시간 — 프롬프트가 크고 출력(관찰 + DM + 색상)도 길다 */
const TIMEOUT_MS = 300_000;
/** 관찰 출력이 잘리면 JSON 이 깨지므로 엔진 기본값(8192)보다 넉넉히 준다 */
const VISION_MAX_TOKENS = 32_000;
/** 엔진 anthropic_vision_fn 의 기본 모델과 같다 (precision-first) */
const DEFAULT_VISION_MODEL = "claude-opus-4-8";
/** Gemini 선택 시 사용할 기본 모델 */
const DEFAULT_GEMINI_VISION_MODEL = "gemini-3.8-flash";

/** 관찰에 쓰는 Claude Vision 모델 */
export const visionModel = (): string => process.env.STYLE_EX_MODEL || DEFAULT_VISION_MODEL;

/** 관찰에 쓰는 Gemini Vision 모델 */
export const geminiVisionModel = (): string =>
  process.env.STYLE_EX_GEMINI_MODEL || DEFAULT_GEMINI_VISION_MODEL;

/**
 * 관찰 단계의 Gemini 추론(Thinking) 설정.
 * 사용자의 지시에 따라 추론(Thinking) 모드를 기본 활성화합니다.
 * (환경변수 STYLE_EX_GEMINI_THINKING_BUDGET=0 으로 명시 지정된 경우에만 비활성화)
 */
export const geminiThinkingConfig = (): { thinkingBudget?: number } | undefined => {
  const envVal = process.env.STYLE_EX_GEMINI_THINKING_BUDGET;
  if (envVal === "0") {
    return { thinkingBudget: 0 };
  }
  if (envVal !== undefined && envVal !== "" && Number.isFinite(parseInt(envVal, 10))) {
    return { thinkingBudget: parseInt(envVal, 10) };
  }
  // 기본값: 추론(Thinking) 켬 (thinkingConfig 미지정 시 Gemini 네이티브 CoT 추론 모드 가동)
  return undefined;
};

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
type Source = "ENGINE" | "ENGINE_NEUTRAL" | "ENGINE_NEUTRAL_FIXED" | "ENGINE_DIRECTION" | "RULE_DEFAULT" | "LLM" | "LLM_FALLBACK";

/**
 * 엔진 · 규칙이 미결로 남긴 축의 기본 글자. 판정 프롬프트는 미결이면 "가장 그럴듯한 쪽"을 고르게 했는데(LLM),
 * 코드에서는 중립 고정 글자(E · S · D)와 같은 쪽으로 둔다. TC 는 중립이 없고, 미결은 T 근거(TRUE)를 찾지 못한
 * 경우라 C 로 둔다. 출처는 RULE_DEFAULT("규칙 기본값")로 남겨 엔진이 정한 글자와 구분한다.
 */
const DEFAULT_LETTER = { EI: "E", TC: "C", SR: "S", DM: "D" } as const;

export interface ExtractInput {
  image: Buffer;
  fileName: string;
  /**
   * 관찰 프롬프트 — 버전 관리(prompt-versions.ts)가 정한 내용. 비어 있으면 코드 기본값.
   * 끝에 상품 정보(product-context.ts)가 붙어 있으면 떼어 캐시 블록 뒤에 따로 보내고, 그 상품인 의복을 대표 의복으로 고정한다.
   */
  prompt?: string;
  /** 사용할 Vision 모델 공급자 ('claude' | 'gemini', 기본값 'claude') */
  provider?: StyleExProvider;
}

/** Gemini 모델은 최대 65,536 출력 토큰 및 1,048,576 입력 컨텍스트 윈도우를 지원한다 */
const GEMINI_MAX_OUTPUT_TOKENS = 65_536;

/** Vision 호출 → 관찰 envelope (+ 대상별 색상 · 연출 유형) */
async function observe(
  image: Buffer,
  fileName: string,
  prompt: string,
  productContext: string | null,
  provider: StyleExProvider = "claude"
) {
  const isGemini = provider === "gemini";
  let activeModel = isGemini ? geminiVisionModel() : visionModel();

  // 1) Claude Vision 호출 함수
  const claudeVisionFn = async (_enginePrompt: string, img: unknown) => {
    const client = new Anthropic(anthropicClientOptions());
    const message = await client.messages
      .stream({
        model: activeModel,
        max_tokens: VISION_MAX_TOKENS,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt, cache_control: { type: "ephemeral" } },
              ...(productContext ? [{ type: "text" as const, text: productContext }] : []),
              imageToBlock(img) as Anthropic.ImageBlockParam,
            ],
          },
        ],
      })
      .finalMessage();
    const { input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens } = message.usage;
    console.info(
      `[style-ex] Claude 관찰 usage — 입력 ${input_tokens} · 캐시 쓰기 ${cache_creation_input_tokens ?? 0} · ` +
        `캐시 읽기 ${cache_read_input_tokens ?? 0} · 출력 ${output_tokens}`
    );
    if (message.stop_reason === "max_tokens") throw new Error("관찰 출력이 max_tokens 에서 잘렸습니다.");
    return message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  };

  // 2) Google Gemini Vision 호출 함수 (gemini-3.8-flash, 1M 입력/65k 출력 Context Window)
  //   - 방대한 37개 파라미터 관찰 프롬프트(4만+ 토큰)는 systemInstruction 블록에 배치하여
  //     어텐션 유실(Lost-in-the-middle) 없이 지시사항 전체를 100% 소화하도록 보장합니다.
  //   - maxOutputTokens 는 Gemini 최대 한도인 65,536으로 확장하여 thinking 및 대용량 JSON 출력이 잘리지 않게 합니다.
  const geminiVisionFn = async (_enginePrompt: string, img: unknown) => {
    const apiKey = geminiApiKey();
    if (!apiKey) throw new Error(MISSING_GEMINI_KEY_MESSAGE);

    const block = imageToBlock(img) as {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

    const payload = {
      systemInstruction: {
        parts: [{ text: prompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: block.source.media_type,
                data: block.source.data,
              },
            },
            ...(productContext
              ? [{ text: productContext }]
              : [
                  {
                    text: "Observe all visible garments in this image and output the complete JSON targets package strictly adhering to all 37 parameters in the system instructions. Do not omit any parameters.",
                  },
                ]),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
        ...(geminiThinkingConfig() ? { thinkingConfig: geminiThinkingConfig() } : {}),
      },
    };

    let res: Response | null = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.ok) break;

      // 503 (High Demand) 또는 429 시 지수 백오프로 재시도
      if ((res.status === 503 || res.status === 429) && attempt < maxAttempts) {
        console.warn(
          `[style-ex] Gemini ${activeModel} HTTP ${res.status} (고부하 발생), 2초 후 재시도 (${attempt}/${maxAttempts})...`
        );
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      // 503 지속 시 안정적인 최신 Flash 모델(gemini-2.5-flash)로 1회 전환 폴백
      if (res.status === 503 && activeModel === "gemini-3.8-flash") {
        console.warn(`[style-ex] gemini-3.8-flash 503 지속으로 안정적인 gemini-2.5-flash로 전환 폴백합니다.`);
        activeModel = "gemini-2.5-flash";
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        res = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) break;
      }

      const errBody = await res.text().catch(() => "");
      throw new Error(`Gemini API 호출 실패 (${activeModel}, HTTP ${res.status}): ${errBody}`);
    }

    if (!res || !res.ok) {
      throw new Error(`Gemini API 호출 응답을 받지 못했습니다.`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
        thoughtsTokenCount?: number;
      };
    };

    const usage = data.usageMetadata;
    console.info(
      `[style-ex] Gemini (${activeModel}) 관찰 usage — 입력 ${usage?.promptTokenCount ?? 0} · 출력 ${usage?.candidatesTokenCount ?? 0} · 사고 ${usage?.thoughtsTokenCount ?? 0}`
    );

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text || "").join("\n") || "";
    if (!text.trim()) {
      throw new Error(`Gemini API가 빈 응답을 반환했습니다. finishReason=${candidate?.finishReason}`);
    }
    return text;
  };

  // 엔진 runOneCall 은 던져진 오류를 문자열(detail)로만 남긴다 — 재시도 판단(429 · 5xx · retry-after)에 쓰도록 마지막 오류를 따로 잡아 둔다.
  let lastCallError: unknown = null;
  const visionFn = async (enginePrompt: string, img: unknown) => {
    try {
      return await (isGemini ? geminiVisionFn : claudeVisionFn)(enginePrompt, img);
    } catch (e) {
      lastCallError = e;
      throw e;
    }
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
  if (!call.ok) {
    return {
      ok: false as const,
      error: { stage: "model_call", code: call.code, detail: call.detail, attempts: call.attempts, upstream: upstreamOf(lastCallError) },
      raw: call.raw,
    };
  }

  // role · extraction_depth · 검증은 엔진의 단일 권위(governEnvelope)가 정한다.
  const governed = governEnvelope(call.pkg, { imageId: fileName, model: activeModel, visionCalls: call.attempts });
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
    if (productContext) t.product_match = cand.product_match === true;
  });
  return { ok: true as const, envelope, contract_valid: governed.contract_valid, visionModel: activeModel };
}

/** Vision 호출 오류의 HTTP 상태 · retry-after (Anthropic APIError 는 status · headers 를 갖는다). 직렬화할 수 있는 값만. */
function upstreamOf(e: unknown) {
  if (!e || typeof e !== "object") return null;
  const err = e as { status?: unknown; headers?: { get?: (k: string) => string | null }; constructor?: { name?: string } };
  const header = (k: string) => (typeof err.headers?.get === "function" ? err.headers.get(k) : null);
  return {
    status: typeof err.status === "number" ? err.status : null,
    error_type: err.constructor?.name ?? null,
    retry_after: header("retry-after"),
    retry_after_ms: header("retry-after-ms"),
  };
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
 * 추출 = 관찰(Claude 또는 Gemini 3.8 Flash) → 판정 함수(judgeStyleIdByRules, API 호출 없음).
 * judgement 는 LLM 판정을 하지 않으므로 늘 null — 응답 · product_style 모양을 지키려고 남겨 둔다.
 */
export async function extractStyle({ image, fileName, prompt, provider = "claude" }: ExtractInput) {
  const { base, addendum } = splitProductContext(prompt ?? "");
  const observation = await observe(image, fileName, base.trim() ? base : defaultPrompt(), addendum, provider);
  const activeModel = observation.visionModel || (provider === "gemini" ? geminiVisionModel() : visionModel());
  if (!observation.ok) return { styleId: null, scoring: null, judgement: null, observation, provider, visionModel: activeModel };
  const { styleId, scoring } = judgeStyleIdByRules(observation.envelope.targets, fileName);
  return { styleId, scoring, judgement: null, observation, provider, visionModel: activeModel };
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

  // letters = 이 축이 가질 수 있는 글자 전부 (중립이면 양쪽 두 글자 · OR). letter = 대표 글자.
  const axes: Record<
    string,
    {
      letter: string | null;
      letters: string[];
      source: Source | null;
      label: string | null;
      detail: string | null;
      rules?: TcRuleResult;
    }
  > = {};
  for (const axis of ["EI", "TC", "SR", "DM"] as const) {
    if (axis === "TC") {
      axes.TC = tcRules.letter
        ? {
            letter: tcRules.letter,
            letters: [tcRules.letter],
            source: "ENGINE",
            label: tcRules.range,
            detail: tcSummaryOf(tcRules),
            rules: tcRules,
          }
        : {
            letter: DEFAULT_LETTER.TC,
            letters: [DEFAULT_LETTER.TC],
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
        letters: letter.letters,
        source: letter.neutral ? "ENGINE_NEUTRAL" : "ENGINE",
        label: s?.label ?? null,
        detail: letter.neutral ? `${s?.label} 중립 → ${letter.letters.join(" 또는 ")} (양쪽 모두)` : null,
      };
    } else {
      // 엔진이 점수를 내지 못한 축(입력 부족 · 판정 불가 등) — 방향이 확정됐으면 그 글자, 아니면 기본 글자
      const why = `엔진 점수 없음 (${[s?.status, s?.reason].filter(Boolean).join(" · ") || "스코어링 실패"})`;
      const byDirection = letterOfDirection(axis, s?.direction ?? null);
      axes[axis] = byDirection
        ? {
            letter: byDirection.letter,
            letters: byDirection.letters,
            source: "ENGINE_DIRECTION",
            label: null,
            detail: `${why} → 방향 ${s?.direction}${byDirection.neutral ? ` → ${byDirection.letters.join(" 또는 ")} (양쪽 모두)` : ""}`,
          }
        : {
            letter: DEFAULT_LETTER[axis],
            letters: [DEFAULT_LETTER[axis]],
            source: "RULE_DEFAULT",
            label: null,
            detail: `${why} → 기본값 ${DEFAULT_LETTER[axis]}`,
          };
    }
  }

  // style_id = 대표 글자 조합 하나 (예전과 같음). candidates = 중립 축의 양쪽 글자를 다른 축과 조합한 후보 전부.
  const letters = ["EI", "TC", "SR", "DM"].map((a) => axes[a].letter);
  const id = letters.every(Boolean) ? letters.join("") : null;
  const styleId = id
    ? { ok: true, style_id: id, style: STYLE_IDS[id] ?? null, candidates: styleIdCandidates(axes), target_id: rep.target_id, axes }
    : { ok: false, error: "네 축 중 글자를 정하지 못한 축이 있습니다.", target_id: rep.target_id, axes };

  return { styleId, scoring };
}
