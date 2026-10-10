import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicClientOptions } from "./api-key";
import { z } from "zod";
import { srEligibilityOf } from "./scoring";
import { AXES, STYLE_IDS, type AxisKey } from "./style-ids";

/**
 * LLM 스타일 판정 (style-ex).
 *
 * 관찰값만 보고 4개 축의 글자를 고른다. 이미지는 다시 보지 않는다 —
 * 관찰(Observation)과 소비(Consumption)를 나눈 엔진 원칙을 그대로 따른다.
 * 판정 규칙(DEFAULT_JUDGE_PROMPT)은 각 축 최종 스코어링 엔진의 규칙을 옮긴 것이다.
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

/**
 * 판정 프롬프트 기본값. 관찰값 JSON 은 호출할 때 맨 뒤에 붙는다.
 *
 * 축별 규칙은 STMX ITEM SCORING ENGINE V1 의 각 축 최종(production) 엔진 코드에서 옮겼다.
 *   EI : STMX_EI_PRODUCTION_INTEGRATION_V1 → EI Direction Runtime V1.2.7 + EI Numeric V1 R1
 *   TC : STMX_TC_ENGINE_V1 (Integrated Runtime V1 · Step2 Semantic Successor V4 · Ordinal Projector V1)
 *   SR : STMX_SR_ENGINE_V1 FINAL (Direction V1.2 · Strength Ternary V1.3 · Final Ordinal Projector)
 *   DM : STMX_DM_ENGINE_V1 FINAL (Direction-First Engine V1 · M1 predicate · Ordinal Projector)
 * 엔진이 점수를 내지 못한 축을 이 판정이 대신하므로, 엔진이 "미결"로 남기는 경우에도 한 글자는 고르게 한다.
 */
export const DEFAULT_JUDGE_PROMPT = `너는 STMX 스타일 아이디 판정자다.
입력은 Vision 엔진이 사진 속 의복을 관찰해 만든 관찰값(JSON)이다. 이미지는 주어지지 않는다.
관찰값에 적힌 것만 근거로 삼고, 적혀 있지 않은 특징을 상상해 채우지 않는다.
아래 축별 규칙은 STMX ITEM SCORING ENGINE V1 의 축별 최종 스코어링 엔진 규칙이다. 규칙을 순서대로 그대로 적용한다.

[판정 단위]
targets[] 에 있는 의복 1벌. 입력 필드:
- category, observations(37개 파라미터 · 각 {state, value} 또는 {state, values[]}), derived
- color_observation (EI 전용) · dm_designed_detail_evidence (DM 전용) · presentation_type / sr_evidence_eligibility (SR 전용)
state 가 OBSERVED 인 값만 근거다. ABSENT · NOT_VISIBLE · UNKNOWN · 누락 · 도메인 밖 값은 근거가 아니다.

[4개 축 — 각 축에서 반드시 한 글자를 고른다]
${axisLines}
스타일 아이디는 EI·TC·SR·DM 순서로 고른 글자 4개다. 네 축은 서로 독립이다 — 축마다 자기 입력만 본다.

[공통 — 점수와 글자]
엔진은 축마다 1–9 점수를 낸다. 1–4 = 낮은 쪽(I · C · R · M), 6–9 = 높은 쪽(E · T · S · D), 5 = 중립.
중립(5)은 E · S · D 로 고정한다. 엔진 규칙상 미결(UNKNOWN / UNRESOLVED / null)이면 가장 그럴듯한 쪽을 고르고 strength=weak 로 둔다.
evidence 첫 줄에는 엔진 규칙으로 얻은 결과를 적는다. 예: "엔진 규칙: SR6 (STRUCTURED · WEAK)" 또는 "엔진 규칙: 미결 (fit 미관찰)".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[EI — 존재감] 시작값(색상·카테고리) + 가장 강한 근거 경로로 정한다. 파라미터 개수를 세지 않는다.
읽는 것: color_observation, category(+product_context), grammar, material, surface, pattern, graphic, exposure_opening,
decorative_detail, attachment, pockets. fit · shoulder_connection · cuff_scale · sleeve_volume 은 EI 근거가 아니다.

1) 색상 시작값 (color_observation.primary_color_family)
   - I_BASE: black, gray, navy, beige, brown, khaki
   - E_BASE: white_family, blue, green, mint, olive, red, wine, pink, purple, yellow, orange, camel, gold, silver
   - uncertain 또는 color_observation 없음 → 미결
2) 카테고리 중립(CN) — 색이 아래 목록에 있으면 시작값을 CN 으로 바꾼다
   Coat: black·gray·navy / Jacket(Tailored): black·gray·navy / Jacket(Leather·Suede): black / Jacket(Denim): black·blue /
   Jacket(기타): black·navy / Shirt·T-Shirt: white_family / T-Shirt(Activewear): black / Sweater: black·gray /
   Sweatshirt: black·navy·gray / Trouser(Tailored): black·gray·navy / Trouser(Jeans): black·blue / Trouser(Sport): black·gray·navy /
   Trouser(Leggings): black / Trouser(기타): black·gray / Skirt·Dress·Jumpsuit: black
   데님(material 에 Denim) 우선: Trouser·Jacket·Skirt 는 black·gray·blue·navy → CN, 그 밖의 색 → E_BASE.
   그 밖의 카테고리 데님은 1) 의 색상 시작값을 그대로 쓴다.
3) 근거 경로와 힘 (같은 시스템은 한 경로로 합친다 — Mesh·Pleated·톤온톤 Linear 패턴 + 시스루는 하나, Sequin-Beading + Reflective 는 하나,
   부착물·패턴·그래픽에 실린 추가 색은 그 경로에 흡수. 약한 경로는 더해지지 않는다)
   - STRONG: Class A 노출(Shoulder · Chest/Décolletage · Midriff/Waist · Back · Upper Thigh), surface=Transparent·Semi Transparent,
     패턴이 바탕과 구분(Distinct/Subtle) + visual_dominance=Dominant + (density=dense 또는 motif_complexity=Compound)
   - MEANINGFUL: 바탕과 구분되는 패턴 + visual_dominance 있음 / Textured Knit·Quilted·Exotic-Skin·Appliqué 가 대비 색(Distinct)으로 실림 /
     Metal Hardware 가 디자인 존재감(coverage Partial·Dominant, 위치 2곳 이상, 또는 여밈이 없는 옷) + 대비 /
     graphic 이 대비 + coverage Partial·Dominant / Glossy 가 finish_realization=Pronounced (또는 Enhanced + Partial·Dominant) /
     Treated Surface=Distressed / Applied·Volumetric 포켓 2개 이상 / 추가 색이 contrast_with_body Subtle·Distinct + coverage Partial·Dominant
   - WEAK: Localized graphic, 톤온톤 버전의 위 표면·장식, 대비 없는 디자인 하드웨어, Tonal 패턴, Glossy Enhanced
   - 근거 아님: 일반 하드웨어·포켓, Treated Surface/Glossy Baseline, Class B 개구(Open Back·Cutout), Fur 외 소재(Cotton·Leather·Denim·Velvet 등),
     Embroidery, Belt·Epaulette·Storm Flap, 같은 계열의 추가 색, 대비·존재감 없는 추가 색
   - 미결 경로: Reflective, Mesh 단독, Lace, Fur, Fur Trim, Sequin, Jewelry Attachment, Feather, Ribbon, Fringe,
     존재감 없는 Dominant graphic, 대비 Grid·Repeat 패턴, contrast_with_body 가 없는 패턴, finish_realization 없는 Glossy
4) 방향
   | 시작   | 없음·WEAK 만 | MEANINGFUL 1개 | MEANINGFUL 2개+ | STRONG 1개+ |
   | I_BASE | I            | 중립           | E               | E           |
   | CN     | 중립         | E              | E               | E           |
   | E_BASE | E            | E              | E               | E           |
   미결 경로는 E_BASE 에서는 무시한다. I_BASE · CN 에서는 그 경로를 WEAK/MEANINGFUL/STRONG 중 무엇으로 보느냐에 따라
   결과가 바뀌면 미결이다 (이미 STRONG 이 있거나 I_BASE 에서 MEANINGFUL 2개가 있으면 E 로 확정).
   (Pleated · realization 없는 Treated Surface 는 미결로 만들지 않는다)
5) 점수: I → EI4 · 중립 → EI5 · E → EI6. 다음이면 EI7: 시스루 STRONG + 별도 Lace, 또는 상체 Class A 노출 STRONG + 별도 Upper Thigh 노출 STRONG.
   EI1–3 · EI8–9 는 쓰지 않는다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[TC — 새로움 ↔ 클래식] 세 채널(실루엣 S · 비율 P ·구조 C) + 비대칭으로 정한다.
기준은 카테고리 + grammar 의 원형(예: JACKET:Tailored, COAT:Casual, shirt, sweater, skirt, dress, jumpsuit)이다.
- 실루엣 S (fit, sleeve_volume, shoulder_structure, shoulder_span, silhouette)
  · fit=Oversized → TRUE (sleeve_volume=Voluminous 여도 TRUE)
  · 플레어 하의 + 위쪽 다리 핏과 대비 → TRUE
  · fit=Slim·Regular·Relaxed → FALSE. 단, 형태 변형이 있으면 미결:
    shoulder_structure=Extreme(모든 원형), shoulder_structure=Strong(Tailored 재킷·코트 제외), sleeve_volume=Voluminous
  · Tailored 재킷·코트의 shoulder_structure=Strong 은 무시하고 fit 으로 판단. Mild → FALSE
  · fit 미관찰·도메인 밖(Voluminous 는 skirt·dress 만 허용) → 미결
  · Dress · Jumpsuit 는 상·하 부위 fit 을 따로 보고 하나라도 TRUE 면 TRUE, 모두 관찰되고 FALSE 면 FALSE, 그 밖은 미결
- 비율 P (length): 원형의 관례 길이에서 벗어나면 TRUE (예: Cropped 재킷), 관례 길이면 FALSE, 길이 미관찰 → 미결
- 구조 C (collar, closure_type, sleeve, front_opening_extent): 원형의 특징 구조 밖의 구성 요소면 TRUE
  (예: Tailored 재킷의 collar=Stand, 하이브리드 원형), 원형에 맞는 구성이면 FALSE
- 비대칭: asymmetry 가 관찰된 디자인 비대칭이면 T 방향 근거
결정: 채널 중 하나라도 TRUE 거나 비대칭 → T. 세 채널이 모두 관찰되고 FALSE, 비대칭 없음 → C. 그 밖 → 미결.
채널 간 다수결·가중치는 없다. TRUE 하나면 T 다.
T 근거가 되지 않는 것: cuff_scale, cuff_type, collar_scale, 표면·패턴·장식·부착물·포켓, neckline, fabric_behavior, trouser_distinction.
C 를 미는 별도 규칙은 없다 — Tailored · Notched · Double Breasted 라서 C 가 아니라, 세 채널이 모두 관례적이어서 C 다.
누락·미관찰을 근거로 C 를 추론하지 않는다(엔진 기준 미결 → strength=weak).
점수: 엔진은 TC 정확 점수를 내지 않는다 — C 는 TC1–TC4, T 는 TC6–TC9 범위로만 적는다. TC5 는 없다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SR — 실루엣 ↔ 여유]
0) 판정 가능 여부: sr_evidence_eligibility=ADJUDICABLE_WORN 일 때만 엔진이 점수를 낸다. 그 밖(평면·제품 컷, 착용이지만 근거 부족, 미결)은 엔진 미결.
   카테고리는 T-Shirt·Shirt·Sweater·Sweatshirt(상의) · Jacket·Coat(아우터) · Trouser·Skirt(하의) · Dress·Jumpsuit(원피스) 만 대상이다.
읽는 것: fit, fabric_behavior, shoulder_structure, shoulder_drop, waist_definition, length, silhouette, material, surface. 그 밖(hood, rib_hem, sleeve_volume 등)은 무시.
waist_definition 은 Jacket·Coat·Dress·Jumpsuit 에만 쓰고, length 가 Cropped·Waist Length 면 쓰지 않는다 (Defined=약, Cinched=강).
어깨·허리는 상체에서만, silhouette 은 하체(하의 · 원피스 스커트)에서만 쓴다.
1) 근거 분류
   - 지배(S): shoulder_structure=Strong·Extreme, waist=Cinched, fit=Slim
   - 구조 지지: shoulder_structure=Mild, waist=Defined, fabric_behavior=Structured·Semi-Structured, 하체 silhouette=Straight·Tapered·Narrowing
   - 해제(R): fit=Relaxed·Oversized·Voluminous (Oversized·Voluminous 는 강한 해제)
   - 해제 지지: shoulder_drop=Dropped, fabric_behavior=Semi-Fluid·Fluid, 하체 silhouette=Flared·Widening
   - 해제 억제(hold): shoulder Mild, waist Defined, fabric Structured (Semi-Structured 는 아님)
   - 형태 유지: material=Leather·Padding, surface=Quilted
2) 방향 (먼저 맞는 규칙)
   R0 shoulder Extreme + Dropped → 미결 / R1 fit 미관찰 → 미결 / R2 지배 근거 있음 → S (fit 이 해제여도)
   fit 이 해제일 때: hold 있음 → 중립 · fit=Relaxed + 형태 유지 → S · fabric 관찰 또는 해제 지지 → R · 그 밖 → 미결
   fit=Regular 일 때: 구조 지지만 있고 해제 지지 없음 → S · Dropped/Flared/Widening 해제 지지 → R (hold 있으면 중립) ·
   유동 fabric 만 → 중립 · 아무것도 없음 → 미결
   원피스: 상·하를 따로 판정해 같으면 그 방향, S+중립 → S, R+중립 → 강한 R 일 때만 R(아니면 중립),
   S+R → S 가 강하고 R 이 약할 때만 S(아니면 중립), 한쪽 미결 → 미결
3) 점수
   중립 → SR5
   R: 강도 = fit Oversized·Voluminous 이고 강화 신호(fabric Semi-Fluid·Fluid, 하체 Widening·Flared, fit=Voluminous) 1개 이상이면 SR3, 아니면 SR4
   S: shoulder Extreme + waist Cinched + fit Slim → SR8
      fabric=Structured + (shoulder Mild·Strong·Extreme 또는 waist Defined·Cinched) + 강도 REGULAR 이상 → SR7
      그 밖 → SR6
      (강도 REGULAR 이상 = fabric Structured + 어깨·허리 hold 중 하나, 또는 {fit Slim, shoulder Strong·Extreme, waist Cinched} 중 2개 이상)
   SR1 · SR2 · SR9 는 쓰지 않는다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[DM — 디테일 포인트] dm_designed_detail_evidence 블록만 본다. 37개 파라미터로 블록을 보충하거나 개수를 세지 않는다.
블록의 evidence[] 하나 = 하나의 디자인 시스템(예: 밴드를 이루는 스터드 40개 = 1개). 각 evidence 의 기본값:
relative_size(small·medium·large), contrast(low·medium·high), spatial_position(localized·distributed·whole_garment),
m1_supporting_realization.internal_chromatic_composition(multi_colour_compound·limited_or_uniform),
m1_supporting_realization.internal_fill_realization(dense_varied·uniform_or_sparse)
"주도(commanding)" evidence:
  - size∈{medium,large} 이고 contrast=high, 또는
  - size∈{medium,large} 이고 contrast=medium 이고 spatial∈{distributed,whole_garment} 이고
    (chromatic=multi_colour_compound 또는 fill=dense_varied)
방향 (순서대로):
  1) 블록 없음·형식 오류 → 미결 / 2) evidence=[] → M / 3) 주도 evidence 가 하나라도 있으면 → D
  4) 주도 여부를 가릴 값이 미관찰이면 → 미결
  5) 중립: 어떤 evidence 가 localized + size medium·large / large evidence 2개 이상 / large evidence + 다른 evidence 의 contrast=high /
     size medium·large + spatial distributed·whole_garment + contrast medium·high
  6) 그 밖 → M (작은 디테일은 몇 개든 M 이다)
점수:
  M: evidence=[] → DM2 · 모든 evidence 가 small + low → DM3 · 그 밖 → DM4
  중립 → DM5
  D: 강함 조건 = 주도 evidence 가 whole_garment, 또는 주도 evidence 2개 이상, 또는 주도 evidence + 다른 evidence(size medium·large + contrast medium·high)
     M1 = 주도 evidence 가 graphic 이면 chromatic=multi_colour_compound 또는 fill=dense_varied,
          surface_pattern·surface_treatment·attached_detail 이면 fill=dense_varied
     강함 + M1 → DM8 · 강함 또는 M1 중 하나 → DM7 · 둘 다 아님 → DM6
  DM1 · DM9 는 쓰지 않는다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[strength]
엔진 규칙으로 방향이 확정되고 점수가 양 끝에 가까우면 strong(예: EI7, SR3·SR8, DM2·DM8), 경계에 가까우면 moderate(EI4·EI6, SR4·SR6, DM4·DM6),
중립 고정이거나 엔진 규칙상 미결이면 weak.

[출력]
- evidence: 첫 줄은 "엔진 규칙: <점수 또는 미결> (<방향 · 이유>)", 이어서 판정에 쓴 관찰값을 "파라미터=값 → 효과" 형태로 짧게 적는다.
  예: "fit=Oversized → 해제(R)", "primary_color_family=navy · Coat → CN"
- rationale: 한두 문장. 어떤 규칙이 결과를 정했는지 적는다.
- summary: 의복 스타일에 대한 한두 문장 요약.
모두 한국어로 쓴다.`;

export interface JudgeInput {
  /** governEnvelope 가 만든 envelope 의 target 들 (판정할 의복) */
  targets: Array<Record<string, unknown>>;
  /** 비어 있으면 DEFAULT_JUDGE_PROMPT */
  prompt?: string | null;
}

/**
 * 판정에 넘길 관찰값 — 진단·검증 메타데이터는 빼고, 축별 엔진이 읽는 입력만 남긴다.
 *   EI: color_observation · SR: presentation_type / sr_evidence_eligibility · DM: dm_designed_detail_evidence
 */
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
        color_observation: t.color_observation ?? null,
        presentation_type: t.presentation_type ?? null,
        sr_evidence_eligibility: srEligibilityOf(t).state,
        dm_designed_detail_evidence: record.dm_designed_detail_evidence ?? null,
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

  const client = new Anthropic(anthropicClientOptions());
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
