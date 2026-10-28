/**
 * 흐름도의 단계 태그 → 관찰 프롬프트 안의 자리 (/prompt-dbg).
 *
 * 흐름도(docs/*.html)의 단계 표지는 `.phase > b`(예: "STAGE 2 · B", "G3", "§9", "호출 ①")와 그 옆 제목 `h2`,
 * 부록 요약의 절 제목 `.psec > h3`(프롬프트 절 제목 그대로)이다. 이 모듈은 그 글자로 프롬프트에서 찾을 자리를
 * 차례로 정하고, 처음 맞는 자리를 돌려준다. 모르는 표지(입력 · 계층 · 점검 …)는 null.
 */

export interface Anchor {
  /** 프롬프트 안 시작 위치 */
  index: number;
  /** 맞은 글자 길이 — 그만큼 선택해 보인다 */
  length: number;
  /** 무엇으로 찾았는지 (화면 안내용) */
  via: string;
}

/** 제목(h2) 낱말 → 프롬프트 절 머리. 위에서부터 먼저 맞는 것 */
const TITLE_RULES: [RegExp, RegExp[]][] = [
  [/보조 필드/, [/^\[WHERE THE AUXILIARY FIELDS GO/m]],
  [/PRODUCT CONTEXT/, [/^STAGE 0 —/m]],
  [/카테고리/, [/^\[CANONICAL CATEGORIES/m]],
  [/적용성/, [/^\[NOT APPLICABLE/m, /^\[REQUIRED KEYS/m]],
  [/파라미터 읽기/, [/^\[CANONICAL VALUE DOMAINS/m]],
  [/상태/, [/^\[STATES/m, /^1\. OBSERVATION STATE ENVELOPE/m]],
  [/영역|파이어월/, [/^\[REGIONS\]/m]],
  [/직렬화|JSON/, [/^\[OUTPUT —/m, /^8a\. EXACT OUTPUT SHAPE/m, /^8\. OUTPUT/m, /^OUTPUT OF THIS CALL/m]],
  [/디자인 디테일|디테일 증거|DM/, [/^\[DM DESIGNED DETAIL/m, /^9\. /m]],
  [/descriptor|시각 재구성/, [/^\[TARGET DESCRIPTOR/m]],
  [/완결성/, [/^\[⛔ CONTRACT SELF-CHECK/m, /TRIGGERED-KEY EMISSION FINAL SWEEP/]],
  [/색상/, [/^STAGE 3 —/m, /^4\. COLOUR/m]],
  [/최종 페이로드/, [/^STAGE 5 —/m]],
  [/타깃 식별/, [/^STAGE 1 —/m]],
  [/IDENTIFY|REGISTRY/, [/^=====\[ CALL 1:/m]],
  [/OBSERVE|APPEARANCE/, [/^=====\[ CALL 2:/m]],
  [/CONSTRUCTION/, [/^=====\[ CALL 3:/m]],
];

const CIRCLED: Record<string, string> = { "①": "1", "②": "2", "③": "3" };

/** 프롬프트 전체를 가리키는 표지 — 처음으로 간다 */
const WHOLE_PROMPT = /^(입력|프롬프트|머리말)$/;

/** 단계 표지(b) 글자 → 찾을 자리 */
function tagRules(tag: string): RegExp[] {
  const t = tag.trim();
  if (WHOLE_PROMPT.test(t)) return [/^/];
  const call = /CALL\s*(\d)/.exec(t) ?? /호출\s*([①②③])/.exec(t);
  if (call) return [new RegExp(`^=====\\[ CALL ${CIRCLED[call[1]] ?? call[1]}:`, "m")];
  const g = /^G([1-4])$/.exec(t);
  if (g) return [new RegExp(`^G${g[1]} — `, "m")];
  const sec = /§\s*(\d+[a-e]?)/.exec(t);
  if (sec) return [new RegExp(`^${sec[1]}\\. `, "m")];
  const stage = /STAGE\s*(\d)/.exec(t);
  if (stage) return [new RegExp(`^STAGE ${stage[1]} —`, "m")];
  return [];
}

const firstMatch = (prompt: string, rules: RegExp[], via: string): Anchor | null => {
  for (const re of rules) {
    const m = re.exec(prompt);
    if (m) {
      // 그 줄 끝까지 선택한다 (절 제목 한 줄)
      const end = prompt.indexOf("\n", m.index);
      return { index: m.index, length: (end < 0 ? prompt.length : end) - m.index, via };
    }
  }
  return null;
};

/**
 * 단계 표지 → 자리.
 * "STAGE 2 · B" 처럼 하위 글자가 붙은 표지는 문서마다 글자 뜻이 달라 제목(h2)으로 먼저 찾고, 없으면 STAGE 2 로.
 */
export function anchorForPhase(prompt: string, tag: string, title: string): Anchor | null {
  const sub = /STAGE\s*\d\s*[·-]\s*[A-H]\b/.test(tag);
  const byTitle = TITLE_RULES.filter(([re]) => re.test(title)).flatMap(([, rules]) => rules);
  const byTag = tagRules(tag);
  const order = sub ? [...byTitle, ...byTag] : [...byTag, ...byTitle];
  return firstMatch(prompt, order, sub || !byTag.length ? `제목 "${title}"` : `표지 "${tag}"`);
}

/** 부록의 절 제목(h3) → 프롬프트 안 같은 제목 */
export function anchorForHeading(prompt: string, heading: string): Anchor | null {
  const h = heading.replace(/\s+/g, " ").trim();
  if (WHOLE_PROMPT.test(h.replace(/^\[|\]$/g, ""))) return { index: 0, length: prompt.indexOf("\n"), via: "프롬프트 처음" };
  const tries = [
    h,
    h.replace(/\s*\(.*\)\s*$/, ""), // "[PRESENTATION TYPE] (PRESENTATION_ADDENDUM)" → "[PRESENTATION TYPE]"
    h.replace(/^\[|\].*$/g, ""), // 괄호 없이
    h.slice(0, 32),
  ].filter((x, i, a) => x.length >= 4 && a.indexOf(x) === i);
  for (const t of tries) {
    const i = prompt.indexOf(t);
    if (i >= 0) {
      const end = prompt.indexOf("\n", i);
      return { index: i, length: (end < 0 ? prompt.length : end) - i, via: `절 제목 "${t}"` };
    }
  }
  // 낱말만 맞춘다 — 흐름도가 `None` 의 백틱을 떼거나 " — 계속" 같은 꼬리를 붙인 제목. 제목의 앞부분, 그다음 " — " 뒤 부분
  const words = (x: string) => x.match(/[A-Za-z0-9_⛔★]+/g) ?? [];
  const parts = [h.replace(/ — 계속\]?$/, ""), h.split(" — ").slice(1).join(" — ")];
  for (const part of parts) {
    const w = words(part).slice(0, 5);
    if (w.length < 2) continue;
    const re = new RegExp(w.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^A-Za-z0-9\\n]{1,6}"));
    const m = re.exec(prompt);
    if (m) {
      const start = prompt.lastIndexOf("\n", m.index) + 1;
      const end = prompt.indexOf("\n", m.index);
      return { index: start, length: (end < 0 ? prompt.length : end) - start, via: `제목 낱말 "${w.join(" ")}"` };
    }
  }
  return null;
}
