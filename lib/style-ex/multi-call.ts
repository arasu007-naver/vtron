import "server-only";
import {
  ALL_PARAMS,
  CATEGORIES,
  POCKET_SCALAR_MORPHOLOGY,
  UNIVERSAL,
  domainFor,
  operationalClass,
} from "./scoring/01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/producer_rules_v1.js";

/**
 * 아이템 관찰 다회 비전 호출 ("식별 → 의복별 병렬").
 *
 *   ① IDENTIFY   이미지 전체 1회 — 타깃 · identity · readability · prominence · 카테고리 · product_match · where(위치 설명)
 *   ② OBSERVE    적격 의복마다 1회, 동시에 — 그 의복 하나의 37개 파라미터 · DM 디테일 · 색상 · 연출 유형
 *
 * 프롬프트는 관찰 프롬프트 버전 하나에 들어 있다: 공통 규칙(첫 구분 줄 앞) + `=====[ CALL 1: IDENTIFY ]=====` 절 +
 * `=====[ CALL 2: OBSERVE ]=====` 절. 공통 규칙은 모든 호출에서 맨 앞 블록이라 ①이 쓴 프롬프트 캐시를 ②들이 읽는다.
 * ②의 TARGET FOCUS 에는 그 의복의 카테고리로 엔진 규칙(producer_rules_v1)에서 뽑은 필수 · 조건부 · 해당 없음 키를 넣는다 —
 * 모델이 37개 중 그 카테고리에 해당하는 키만 정확히 내게 한다.
 * 결과는 merge() 가 1회 호출과 같은 { targets, cross_target_visual_relations } 하나로 합치므로, 그 뒤의 governEnvelope ·
 * 검증 · 스코어링은 1회 호출과 같다. 구분 줄이 없는 프롬프트(v1–v3)는 지금처럼 1회로 돈다.
 */

/** ②의 자리에 TARGET FOCUS 가 들어간다 */
export const FOCUS_PLACEHOLDER = "{{TARGET_FOCUS_JSON}}";
const CALL_HEADER = /^=====\[ CALL (\d): (\w+) \]=====$/m;

type Obj = Record<string, unknown>;

/** 다회 호출 프롬프트인가 — 관찰 프롬프트 버전이 이것이면 [추출]이 식별 1회 + 의복별 병렬로 돈다 */
export const isMultiCallPrompt = (text: string) => text.includes(FOCUS_PLACEHOLDER) && CALL_HEADER.test(text);

/** 다회 호출 프롬프트 → { shared, identify, observe } */
export function multiCallPrompts(text: string) {
  const parts = text.split(/^=====\[ CALL \d: \w+ \]=====$/m);
  const names = [...text.matchAll(new RegExp(CALL_HEADER.source, "gm"))].map((m) => m[2]);
  if (parts.length !== 3 || names.join(",") !== "IDENTIFY,OBSERVE") {
    throw new Error("다회 호출 프롬프트의 구분 줄(=====[ CALL 1: IDENTIFY ]===== · =====[ CALL 2: OBSERVE ]=====)이 올바르지 않습니다.");
  }
  if (!parts[2].includes(FOCUS_PLACEHOLDER)) throw new Error(`다회 호출 프롬프트의 OBSERVE 절에 ${FOCUS_PLACEHOLDER} 자리가 없습니다.`);
  return { shared: parts[0].trimEnd(), identify: parts[1].trim(), observe: parts[2].trim() };
}

/** 형태(construction · projection)는 pocket.pockets[] 안에서만 답한다 — 최상위 키 목록에서 뺀다 */
const RETIRED = new Set<string>((POCKET_SCALAR_MORPHOLOGY as string[] | undefined) ?? ["pocket_construction", "pocket_projection"]);

/**
 * 확인된 없음을 semantic "None" 으로 답하는 키 — 값 도메인에 None 이 있는 키(SV-5). 그 밖의 키는 ABSENT 로 답한다.
 * 엔진 검증기의 isNoneDomain 과 같은 판단이다.
 */
const noneKeys = (keys: string[], category: string | null) =>
  keys.filter((p) => {
    const d = domainFor(p, category) as unknown;
    return Array.isArray(d) && d.includes("None");
  });

/** 카테고리의 키 목록 — 엔진 적용성 규칙에서 그대로 뽑는다 (손으로 쓴 두 번째 목록을 두지 않는다) */
export function keysOf(category: string | null) {
  const k = applicability(category);
  return { ...k, absent_as_none: noneKeys([...k.required, ...k.conditional], category) };
}

function applicability(category: string | null) {
  const all = (ALL_PARAMS as string[]).filter((p) => p !== "category" && !RETIRED.has(p));
  if (!category || !(CATEGORIES as string[]).includes(category)) {
    // 카테고리 UNKNOWN — 범용 키만 (엔진의 UNKNOWN 라우팅과 같다)
    const universal = new Set(UNIVERSAL as string[]);
    return { required: all.filter((p) => universal.has(p)), conditional: [], not_applicable: all.filter((p) => !universal.has(p)) };
  }
  const cls = (p: string) => operationalClass(p, category) as "U" | "M" | "C" | "N";
  return {
    required: all.filter((p) => cls(p) === "U" || cls(p) === "M"),
    conditional: all.filter((p) => cls(p) === "C"),
    not_applicable: all.filter((p) => cls(p) === "N"),
  };
}

/** 적격 타깃 — identity ∧ readability (엔진 governEnvelope 의 C2 ∧ C3 와 같은 판단) */
export function isEligible(t: Obj) {
  const identity = (t.identity as Obj | undefined)?.value === true;
  const r = (t.readability as Obj | undefined) ?? {};
  return identity && r.value === true && r.basis === "RECONSTRUCTABLE";
}

/** ① 의 타깃 하나 → ②의 TARGET FOCUS */
export function focusOf(t: Obj) {
  const cat = (t.category as Obj | undefined) ?? {};
  const category = cat.state === "OBSERVED" && typeof cat.value === "string" ? cat.value : null;
  return {
    target_id: t.target_id,
    where: t.where ?? null,
    descriptor: typeof t.descriptor === "string" && t.descriptor.trim() ? t.descriptor : null,
    category: { state: category ? "OBSERVED" : "UNKNOWN", value: category },
    prominence: t.prominence ?? null,
    keys: keysOf(category),
  };
}

export const fillFocus = (observe: string, focus: Obj) => observe.replace(FOCUS_PLACEHOLDER, JSON.stringify(focus, null, 1));

/** ① 의 타깃에 target_1, target_2 … 를 배열 순서로 다시 매긴다 (엔진 governEnvelope 의 id 와 같게) */
export function numberTargets(targets: Obj[]) {
  return targets.map((t, i) => ({ ...t, target_id: `target_${i + 1}` }));
}

/**
 * ① + ②들 → 1회 호출과 같은 모양의 패키지. 관찰값은 바꾸지 않는다.
 * 식별 사실(identity · readability · prominence · product_match · 카테고리)은 ① 의 것, 관찰 · DM · 색상 · 연출 유형은 ② 의 것만 받는다.
 * where 는 ②에 넘기는 용도라 계약 필드가 아니다 — 뺀다.
 */
export function merge(identified: Obj[], relations: unknown, observed: Map<string, Obj>, withProduct: boolean) {
  const targets = identified.map((t) => {
    const { where, product_match, ...base } = t;
    void where;
    const pm = withProduct && product_match === true ? { product_match: true } : {};
    const o = observed.get(String(t.target_id));
    if (!o) return { ...base, ...pm };
    const cat = (base.category as Obj | undefined) ?? {};
    const productContext = cat.product_context ?? (o.category as Obj | undefined)?.product_context;
    return {
      ...base,
      ...pm,
      category: { ...cat, ...(productContext != null ? { product_context: productContext } : {}) },
      observations: o.observations ?? {},
      ...(o.dm_designed_detail_evidence !== undefined ? { dm_designed_detail_evidence: o.dm_designed_detail_evidence } : {}),
      color_observation: o.color_observation ?? null,
      presentation_type: o.presentation_type ?? null,
    };
  });
  return { targets, ...(Array.isArray(relations) ? { cross_target_visual_relations: relations } : {}) };
}
