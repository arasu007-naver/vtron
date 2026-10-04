import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";

/**
 * 4개 축 스코어링 (style-ex 2단계 · 엔진).
 *
 * 관찰 결과(V1_3 envelope)에서 축별 입력을 만들어 STMX ITEM SCORING ENGINE V1 의 Item Entry 에 넘긴다.
 * 엔진은 lib/style-ex/scoring/ 에 원본 그대로 있고, 자식 프로세스(scoring-runner.cjs)에서 실행된다.
 *
 *   EI : { category, observations, color_observation }        → EI1–EI9
 *   SR : { record, meta: { sr_evidence_eligibility } }         → SR1–SR9
 *   DM : record.dm_designed_detail_evidence                    → DM1–DM9
 *   TC : 엔진이 코퍼스 anchor_id 만 받으므로 새 사진에는 쓸 수 없다 → LLM 판정(judge.ts)이 맡는다.
 *
 * 점수 → 글자: 1–4 낮은 쪽(I · R · M), 6–9 높은 쪽(E · S · D).
 * 중립 5 는 E · S · D 로 고정한다 (2026-10-04 결정).
 */

export const ENGINE_AXES = ["EI", "SR", "DM"] as const;
export type EngineAxis = (typeof ENGINE_AXES)[number];

const LETTERS: Record<EngineAxis, { low: string; high: string; neutral: string }> = {
  EI: { low: "I", high: "E", neutral: "E" },
  SR: { low: "R", high: "S", neutral: "S" },
  DM: { low: "M", high: "D", neutral: "D" },
};

/** 엔진 점수 → 스타일 아이디 글자. 점수가 없으면 null. */
export function letterOf(axis: EngineAxis, score: number | null) {
  if (score == null) return null;
  if (score === 5) return { letter: LETTERS[axis].neutral, neutralFixed: true };
  return { letter: score < 5 ? LETTERS[axis].low : LETTERS[axis].high, neutralFixed: false };
}

type Obj = Record<string, unknown>;
interface Observation { state?: string; value?: unknown }

// ── SR 판정 가능 여부 — 관찰 결과로 자동 결정 (2026-10-04 결정) ─────────────────────────────
// 원본 SR 레지스트리는 사람이 이미지를 보고 presentation_type(WORN / FLAT_LAY / PRODUCT_ONLY)과
// 몸과의 관계가 보이는지로 정했다. 여기서는 Vision 이 함께 내는 presentation_type 과 관찰값으로 같은 판단을 한다.
//   FLAT_LAY · PRODUCT_ONLY                                   → NOT_ADJUDICABLE_FLAT_PRODUCT
//   WORN 이지만 fit 을 읽지 못했거나 필수 형태가 가려짐(PARTIAL) → WORN_BUT_INSUFFICIENT
//   WORN 이고 fit 관찰됨                                       → ADJUDICABLE_WORN
//   그 밖(presentation_type 누락 등)                           → UNRESOLVED
// ⛔ 이 규칙은 STMX 거버넌스가 정한 것이 아니다 — 엔진 쪽 미결 과제(SR-ING-1)를 임시로 메운 것이다.
export function srEligibilityOf(target: Obj) {
  const record = target.record as Obj | undefined;
  const obs = (record?.observations ?? {}) as Record<string, Observation>;
  const presentation = target.presentation_type;
  if (presentation === "FLAT_LAY" || presentation === "PRODUCT_ONLY") {
    return { state: "NOT_ADJUDICABLE_FLAT_PRODUCT", basis: `presentation_type=${presentation}` };
  }
  if (presentation !== "WORN") {
    return { state: "UNRESOLVED", basis: `presentation_type=${String(presentation ?? "누락")}` };
  }
  if (obs.fit?.state !== "OBSERVED") {
    return { state: "WORN_BUT_INSUFFICIENT", basis: `WORN · fit=${obs.fit?.state ?? "누락"}` };
  }
  if (target.extraction_depth === "PARTIAL") {
    return { state: "WORN_BUT_INSUFFICIENT", basis: "WORN · 필수 형태 일부 판독 불가(PARTIAL)" };
  }
  return { state: "ADJUDICABLE_WORN", basis: "WORN · fit 관찰됨" };
}

/** 의복 target 1개 → Item Entry 요청 */
export function scoringRequestOf(target: Obj, imageId: string) {
  const record = target.record as Obj;
  const category = record.category as Observation | undefined;
  const sr = srEligibilityOf(target);
  const inputs: Obj = {
    // EI 런타임은 category 를 문자열로 받는다(114 코퍼스의 DIRECT_37 형식). Producer 레코드는
    // { state, value } 이므로 값만 꺼낸다. UNKNOWN 이면 null 을 넘겨 EI 입력 검증이 거절하게 둔다.
    EI: {
      unit: {
        scoring_unit_type: "GARMENT",
        input: {
          category: category?.state === "OBSERVED" ? category.value : null,
          observations: record.observations,
          color_observation: target.color_observation ?? null,
        },
      },
    },
    SR: { record, meta: { sr_evidence_eligibility: sr.state } },
  };
  // DM 블록이 없으면 네임스페이스를 비워 엔진이 MISSING_REQUIRED_INPUT 으로 답하게 한다
  if (record.dm_designed_detail_evidence !== undefined) {
    inputs.DM = { dm_designed_detail_evidence: record.dm_designed_detail_evidence };
  }
  return {
    request: {
      item_identity: `${imageId}#${String(target.target_id)}`,
      requested_axes: [...ENGINE_AXES],
      inputs,
    },
    srEligibility: sr,
  };
}

const RUNNER = path.join(process.cwd(), "lib", "style-ex", "scoring-runner.cjs");

/** Item Entry 를 자식 프로세스에서 실행한다 */
export function runScoring(requests: Obj[]): Promise<Obj[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RUNNER], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8").on("data", (d) => (out += d));
    child.stderr.setEncoding("utf8").on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", () => {
      try {
        const parsed = JSON.parse(out);
        if (parsed.error) reject(new Error(`스코어링 엔진 오류: ${parsed.error}`));
        else resolve(parsed.results);
      } catch {
        reject(new Error(`스코어링 러너 출력 해석 실패: ${err || out}`.slice(0, 1000)));
      }
    });
    child.stdin.end(JSON.stringify({ requests }));
  });
}

/** Item Entry 결과에서 축별 점수와 상태를 꺼낸다 */
export function axisScoreOf(result: Obj, axis: EngineAxis) {
  const ar = (result.axis_results as Obj | undefined)?.[axis] as Obj | undefined;
  const semantic = (ar?.envelope as Obj | undefined)?.semantic as Obj | undefined;
  let score: number | null = null;
  if (semantic) {
    if (axis === "EI") score = typeof semantic.ei_numeric === "number" ? semantic.ei_numeric : null;
    if (axis === "DM") score = typeof semantic.ordinal_tier === "number" ? semantic.ordinal_tier : null;
    if (axis === "SR" && typeof semantic.score === "string") {
      const n = parseInt(semantic.score.replace(/^SR/, ""), 10);
      score = Number.isNaN(n) ? null : n;
    }
  }
  const status =
    (semantic?.numeric_status as string | undefined) ??
    (semantic?.tier_status as string | undefined) ??
    (semantic?.direction as string | undefined) ??
    (ar?.axis_outcome as string | undefined) ??
    null;
  const reason =
    (semantic?.numeric_blocker as string | undefined) ??
    (semantic?.reason as string | undefined) ??
    (ar?.detail as string | undefined) ??
    null;
  return { score, label: score == null ? null : `${axis}${score}`, outcome: ar?.axis_outcome ?? null, status, reason };
}
