import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AXES, STYLE_IDS, type AxisKey } from "./style-ids";

/**
 * LLM 스타일 판정 (style-ex).
 *
 * 관찰값만 보고 4개 축의 글자를 고른다. 이미지는 다시 보지 않는다 —
 * 관찰(Observation)과 소비(Consumption)를 나눈 엔진 원칙을 그대로 따른다.
 *
 * 쓰임 (extract.ts):
 *   TC        — 항상 이 판정을 쓴다. TC 엔진은 학습 코퍼스의 anchor_id 만 받아 새 사진에 쓸 수 없다.
 *   EI·SR·DM — 스코어링 엔진이 점수를 내지 못했을 때만 대신 쓴다.
 */

const MODEL = process.env.STYLE_EX_JUDGE_MODEL || "claude-opus-5-5";

const STRENGTHS = ["strong", "moderate", "weak"] as const;

const axisSchema = (letters: readonly [string, string]) =>
  z.object({
    letter: z.enum(letters),
    strength: z.enum(STRENGTHS),
    evidence: z.array(z.string()),
    rationale: z.string(),
  });

const JudgeSchema = z.object({
  EI: axisSchema(["E", "I"]),
  TC: axisSchema(["T", "C"]),
  SR: axisSchema(["S", "R"]),
  DM: axisSchema(["D", "M"]),
  summary: z.string(),
});

export type JudgeOutput = z.infer<typeof JudgeSchema>;

/** 구조화 출력용 JSON Schema — 위 zod 스키마와 같은 모양 */
const axisJsonSchema = (letters: readonly [string, string]) => ({
  type: "object",
  properties: {
    letter: { type: "string", enum: [...letters] },
    strength: { type: "string", enum: [...STRENGTHS] },
    evidence: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
  },
  required: ["letter", "strength", "evidence", "rationale"],
  additionalProperties: false,
});

const JUDGE_JSON_SCHEMA = {
  type: "object",
  properties: {
    EI: axisJsonSchema(["E", "I"]),
    TC: axisJsonSchema(["T", "C"]),
    SR: axisJsonSchema(["S", "R"]),
    DM: axisJsonSchema(["D", "M"]),
    summary: { type: "string" },
  },
  required: ["EI", "TC", "SR", "DM", "summary"],
  additionalProperties: false,
};

const axisLines = AXES.map(({ key, poles }) => {
  const [a, b] = Object.entries(poles);
  return `- ${key} 축\n  · ${a[0]}: ${a[1]}\n  · ${b[0]}: ${b[1]}`;
}).join("\n");

/** 판정 프롬프트 기본값. 관찰값 JSON 은 호출할 때 맨 뒤에 붙는다. */
export const DEFAULT_JUDGE_PROMPT = `너는 STMX 스타일 아이디 판정자다.
입력은 Vision 엔진이 사진 속 의복을 관찰해 만든 관찰값(JSON)이다. 이미지는 주어지지 않는다.
관찰값에 적힌 것만 근거로 삼고, 적혀 있지 않은 특징을 상상해 채우지 않는다.

[판정 단위]
targets[] 에 있는 의복이다 (보통 사진 속 대표 의복 1벌). 그 의복이 드러내는 스타일로 판정한다.

[4개 축 — 각 축에서 반드시 한 글자를 고른다]
${axisLines}
스타일 아이디는 EI·TC·SR·DM 순서로 고른 글자 4개다. 네 축은 서로 독립이다 —
한 축의 판정이 다른 축의 판정을 끌고 가지 않게 축마다 따로 판단한다.

[축별로 주로 볼 관찰값]
- EI (존재감의 강도): surface(광택·투명·퀼팅·레이스 등과 그 coverage·finish_realization),
  pattern(visual_dominance), graphic(coverage), exposure_opening(Class A 노출 부위),
  material=Fur, 장식·부착물이 시선을 끄는 정도, shoulder_connection(어깨 노출).
- TC (새로움 ↔ 클래식): asymmetry, Class B 절개(Open Back·Cutout), cuff_scale·collar_scale·sleeve_volume 의
  Enlarged·Voluminous, 특이한 neckline/collar → T 쪽.
  grammar=Tailored, collar=Shirt·Notched·Peak, closure_type=Double Breasted, trouser_distinction=Tailored → C 쪽.
- SR (실루엣 ↔ 여유): fit(Slim·Regular → S, Relaxed·Oversized → R), fabric_behavior(Structured → S, Fluid → R),
  waist_definition(Defined·Cinched → S), shoulder_structure(Strong → S), shoulder_drop=Dropped → R, hood·rib_hem → R 쪽.
- DM (디테일 포인트의 수와 다양성): decorative_detail·attachment 값의 개수와 종류, pockets[] 인스턴스 수와 Applied·Projected,
  ruffle, slit, 장식적인 collar(Ruffle·Sailor·Tie), 눈에 띄는 closure.

[이중 반영 금지 — EI 와 DM]
같은 장식이 두 축의 근거가 될 수 있지만 서로 다른 속성으로만 쓴다.
EI 는 "얼마나 강하게 시선을 끄는가"(coverage, dominance, 대비, 광택, 노출)만 본다.
DM 은 "디테일 포인트가 몇 개, 몇 종류인가"만 본다.
톤온톤의 작은 디테일이 여러 개면 D 이면서 I 일 수 있고, 장식 없이 실루엣·소재만으로 강한 인상이면 E 이면서 M 일 수 있다.

[근거가 약할 때]
- NOT_VISIBLE / UNKNOWN 상태는 근거가 아니다.
- 표현 요소가 관찰되지 않으면 EI 는 I, TC 는 C, DM 은 M 쪽이다.
- 그래도 반드시 한 글자를 고르고, strength 를 weak 로 둔다.

[출력]
- evidence: 판정에 쓴 관찰값을 "파라미터=값 → 글자" 형태로 짧게 적는다. 예: "fit=Oversized → R"
- rationale: 한두 문장.
- summary: 의복 스타일에 대한 한두 문장 요약.
모두 한국어로 쓴다.`;

export interface JudgeInput {
  /** governEnvelope 가 만든 envelope 의 target 들 (판정할 의복) */
  targets: Array<Record<string, unknown>>;
  /** 비어 있으면 DEFAULT_JUDGE_PROMPT */
  prompt?: string | null;
}

/** 판정에 넘길 관찰값 — 진단·검증 메타데이터와 DM 블록은 빼고 의복별 관찰만 남긴다 */
function observationsOf(targets: JudgeInput["targets"]) {
  return targets
    .filter((t) => t.eligible && t.record)
    .map((t) => {
      const record = t.record as Record<string, unknown>;
      return {
        target_id: t.target_id,
        prominence: t.prominence,
        descriptor: t.descriptor,
        category: record.category,
        observations: record.observations,
        derived: record.derived,
      };
    });
}

export type JudgeResult =
  | {
      ok: true;
      style_id: string;
      style: (typeof STYLE_IDS)[string] | null;
      axes: JudgeOutput;
      model: string;
    }
  | { ok: false; error: string; model: string };

export async function judgeStyleId({ targets: input, prompt }: JudgeInput): Promise<JudgeResult> {
  const targets = observationsOf(input);
  if (!targets.length) {
    return { ok: false, error: "판정할 의복 관찰값이 없습니다 (적격 target 0개).", model: MODEL };
  }

  const instructions = prompt?.trim() ? prompt : DEFAULT_JUDGE_PROMPT;
  const content = `${instructions}\n\n[관찰값]\n${JSON.stringify({ targets }, null, 2)}`;

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // 거절 시 서버가 권장 모델로 다시 실행한다
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: JUDGE_JSON_SCHEMA },
      },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: `모델이 판정을 거절했습니다: ${response.stop_details?.explanation ?? ""}`, model: response.model };
    }
    if (response.stop_reason === "max_tokens") {
      return { ok: false, error: "출력이 max_tokens 에서 잘렸습니다.", model: response.model };
    }

    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = JudgeSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return { ok: false, error: `판정 출력이 스키마와 다릅니다: ${parsed.error.message}`, model: response.model };
    }

    const axes = parsed.data;
    const styleId = (["EI", "TC", "SR", "DM"] as AxisKey[]).map((k) => axes[k].letter).join("");
    return { ok: true, style_id: styleId, style: STYLE_IDS[styleId] ?? null, axes, model: response.model };
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return { ok: false, error: `Anthropic ${e.status ?? ""}: ${e.message}`, model: MODEL };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e), model: MODEL };
  }
}
