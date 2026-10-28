import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Full-Look 3회 비전 호출 프로토타입 ("3+ vision").
 *
 *   ① REGISTRY      G1 — 프레임 · 참여 물체 등록(c1…) · 정체 · 물체마다 위치 설명(where)
 *   ② APPEARANCE    G2 — 색 · 색의 field/point · 외관 6사실 · 디자인 디테일 시스템(§9)       ┐ ①의 등록을 입력으로 받아
 *   ③ CONSTRUCTION  G3 + G4 — 형태 · 어깨/앞판/포켓 영역 · 지배 상의 · 레이어 · 조임 · 노출   ┘ 동시에 부른다
 *
 * 세 프롬프트는 v1.2(prompts/FULL_LOOK_OBSERVE_PROMPT_V1_2_THREE_CALL.txt, 버전 표 target='full' "비전 호출 3+")에 있다.
 * 따로 단추를 두지 않는다 — 관찰 프롬프트로 이 버전을 고르면 [추출]이 비전 3회로 돈다. v1.1 의 절을 그대로 잘라 붙인 것이라
 * 규칙 문장은 단일 호출과 같고, 호출마다 범위(SCOPE)와 출력 모양만 다르다. 세 결과는 merge() 가 v1.1 §8a 모양의 객체 하나로 합치므로, 그 뒤의 정리 · 동결 추출 엔진 ·
 * 채점 엔진은 단일 호출과 같다. G3 와 G4 를 한 호출에 두는 것은 지배 상의의 어깨 값을 G3 의 어깨 관찰에서 가져오기
 * 때문이다(같은 어깨를 두 번 읽지 않게).
 */

/** 3회 방식 프롬프트 v1.2 원본 — v1.1 의 절을 호출 셋으로 나눈 것. 버전 표에 target='full' 로 등록돼 있고, 서버는 고른 버전의 내용을 쓴다. */
const V1_2_FILE = path.join(process.cwd(), "lib/full-style-ex/prompts/FULL_LOOK_OBSERVE_PROMPT_V1_2_THREE_CALL.txt");
/** ①의 등록이 들어갈 자리 (②③) */
export const REGISTRY_PLACEHOLDER = "{{REGISTERED_COMPONENTS_JSON}}";
const CALL_HEADER = /^=====\[ CALL (\d): (\w+) \]=====$/m;

type Obj = Record<string, unknown>;

/** 외관 6사실 — ② 가 답하고, 나머지 의복 사실은 ③ 이 답한다 */
export const APPEARANCE_FACTS = ["pattern", "graphic", "surface", "material", "decorative_detail", "attachment"] as const;
const APPEARANCE = new Set<string>(APPEARANCE_FACTS);

/** 3회 방식 프롬프트인가 — 관찰 프롬프트 버전이 이것이면 [추출]이 비전 3회로 돈다 */
export const isThreeCallPrompt = (text: string) => text.includes(REGISTRY_PLACEHOLDER) && CALL_HEADER.test(text);

/**
 * 3회 방식 프롬프트 → { version, calls: [①, ②, ③] }. 비우면 저장소의 v1.2 파일.
 * 머리 줄의 prompt_version 을 run_record 에 쓴다.
 */
export function threeCallPrompts(text: string = readFileSync(V1_2_FILE, "utf8")) {
  const parts = text.split(/^=====\[ CALL \d: \w+ \]=====$/m).map((p) => p.trim());
  const names = [...text.matchAll(new RegExp(CALL_HEADER.source, "gm"))].map((m) => m[2]);
  if (parts.length !== 4 || names.join(",") !== "REGISTRY,APPEARANCE,CONSTRUCTION") {
    throw new Error("3회 프롬프트의 호출 구분(=====[ CALL n: REGISTRY | APPEARANCE | CONSTRUCTION ]=====)이 올바르지 않습니다.");
  }
  if (!parts[2].includes(REGISTRY_PLACEHOLDER) || !parts[3].includes(REGISTRY_PLACEHOLDER)) {
    throw new Error(`3회 프롬프트의 ②③ 에 ${REGISTRY_PLACEHOLDER} 자리가 없습니다.`);
  }
  const version = /^prompt_version:\s*(\S+)/m.exec(parts[0])?.[1] ?? "UNREGISTERED_THREE_CALL";
  return { text, version, calls: [parts[1], parts[2], parts[3]] as const };
}

/** ②③ 의 자리에 ①의 등록을 넣는다 */
export const fillRegistry = (prompt: string, registry: Obj) => prompt.replace(REGISTRY_PLACEHOLDER, JSON.stringify(registry, null, 1));

/** 모델 텍스트 → JSON 객체 (펜스 · 앞뒤 글은 걷어 낸다 — 엄격 판정은 합친 뒤 동결 변환기가 따로 한다) */
export function parseJsonObject(text: string): Obj {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("JSON 객체를 찾지 못했습니다.");
  const obj = JSON.parse(t.slice(a, b + 1));
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("JSON 객체가 아닙니다.");
  return obj as Obj;
}

/** ① 의 결과 → ②③ 에 넘길 등록 (참여 물체만 + 제외 수) */
export function registryOf(r1: Obj): Obj {
  const objects = Array.isArray(r1.objects) ? (r1.objects as Obj[]) : [];
  return {
    frame: r1.frame ?? null,
    components: objects
      .filter((o) => o.participates !== false)
      .map(({ ref, identity, where, product_family, subtype, attached_to }) => ({ ref, identity, where, product_family, subtype, attached_to })),
    excluded_count: objects.filter((o) => o.participates === false).length,
  };
}

/** 착장이 아니거나 참여 물체가 없으면 ②③ 을 부르지 않는다 */
export function skipRest(r1: Obj): string | null {
  const limits = ((r1.frame as Obj | undefined)?.limits ?? []) as unknown[];
  if (limits.includes("not_a_worn_look")) return "not_a_worn_look";
  const objects = Array.isArray(r1.objects) ? (r1.objects as Obj[]) : [];
  if (!objects.some((o) => o.participates !== false)) return "no_participants";
  return null;
}

export interface MergeLog {
  action: string;
  where: string;
  note?: string;
}

/**
 * ①②③ → v1.1 §8a 모양의 객체 하나. 관찰값은 바꾸지 않는다.
 * 사실은 소유한 호출의 것만 받는다 — 외관 6 은 ②, 그 밖은 ③. 남의 범위 사실 · 등록되지 않은 ref 는 버리고 기록한다.
 */
export function merge(r1: Obj, r2: Obj | null, r3: Obj | null) {
  const log: MergeLog[] = [];
  const objects = (Array.isArray(r1.objects) ? (r1.objects as Obj[]) : []).map((o) => {
    const { where, ...rest } = o;
    void where; // 위치 설명은 ②③ 에 넘기는 용도 — 계약 필드가 아니다
    return rest;
  });
  const refs = new Set(objects.filter((o) => o.participates !== false).map((o) => String(o.ref)));
  const facts: Record<string, Obj> = {};
  const take = (src: Obj | null, call: string, owns: (fact: string) => boolean) => {
    const f = (src?.facts ?? {}) as Record<string, Obj>;
    for (const [ref, kv] of Object.entries(f)) {
      if (!refs.has(ref)) {
        log.push({ action: "DROP_UNKNOWN_REF", where: `${call}.facts.${ref}` });
        continue;
      }
      for (const [fact, val] of Object.entries(kv ?? {})) {
        if (!owns(fact)) {
          log.push({ action: "DROP_OUT_OF_SCOPE", where: `${call}.facts.${ref}.${fact}` });
          continue;
        }
        (facts[ref] ??= {})[fact] = val;
      }
    }
  };
  take(r2, "call2", (f) => APPEARANCE.has(f));
  take(r3, "call3", (f) => !APPEARANCE.has(f));
  const keepRefs = <T extends Obj>(arr: unknown, call: string, key: string, refKeys: string[]): T[] =>
    (Array.isArray(arr) ? (arr as T[]) : []).filter((x) => {
      const bad = refKeys.map((k) => x[k]).flat().filter((r) => r != null && r !== "UNKNOWN" && !refs.has(String(r)));
      if (bad.length) log.push({ action: "DROP_UNKNOWN_REF", where: `${call}.${key}`, note: bad.join(",") });
      return !bad.length;
    });
  const merged: Obj = {
    frame: r1.frame ?? { state: "UNKNOWN", limits: [] },
    objects,
    front_state: r3?.front_state ?? {},
    layer_relations: keepRefs(r3?.layer_relations, "call3", "layer_relations", ["over", "under"]),
    securing_relations: keepRefs(r3?.securing_relations, "call3", "securing_relations", ["securing", "affected"]),
    colour_areas: keepRefs(r2?.colour_areas, "call2", "colour_areas", ["carrier"]),
    upper: r3?.upper ?? {
      governing_ref: null,
      relation: { value: null, state: "NOT_VISIBLE" },
      shoulder: { value: null, state: "NOT_VISIBLE" },
      shape: { value: null, state: "NOT_VISIBLE" },
    },
    exposure_supplement: keepRefs(r3?.exposure_supplement, "call3", "exposure_supplement", ["carrier_refs"]),
    facts,
    detail_systems: keepRefs(r2?.detail_systems, "call2", "detail_systems", ["carrier_refs"]),
  };
  return { merged, log };
}
