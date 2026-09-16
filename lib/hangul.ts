/**
 * 한글 초성 검색.
 *
 * 자모만 친 자리는 그 초성으로 시작하는 음절과, 나머지는 글자 그대로 맞춘다 —
 * "ㄴㅇㅋ" · "나ㅇㅋ" · "나이키" 가 모두 나이키에 걸린다. 대소문자 · 공백 · 구두점은
 * 무시한다("h&m" 과 "H & M").
 */

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
/** 초성 하나에 딸린 음절 수 = 중성 21 × 종성 28. */
const PER_CHOSEONG = 21 * 28;

/** 완성형 음절의 초성. 음절이 아니면 null. */
export function choseongOf(char: string): string | null {
  const code = char.codePointAt(0) ?? 0;
  if (code < SYLLABLE_FIRST || code > SYLLABLE_LAST) return null;
  return CHOSEONG[Math.floor((code - SYLLABLE_FIRST) / PER_CHOSEONG)];
}

/** NFKC 는 호환 자모(ㄱ)를 첫가끝 자모로 바꿔 초성 비교가 깨지므로 NFC 만 쓴다. */
const normalize = (value: string) =>
  value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s.,'’`\-_/·()&+]/g, "");

const COMPAT_CHOSEONG: Record<string, string[]> = {
  ㄱ: ["ㄱ", "ㄲ"],
  ㄲ: ["ㄱ", "ㄲ"],
  ㄷ: ["ㄷ", "ㄸ"],
  ㄸ: ["ㄷ", "ㄸ"],
  ㅂ: ["ㅂ", "ㅃ"],
  ㅃ: ["ㅂ", "ㅃ"],
  ㅅ: ["ㅅ", "ㅆ"],
  ㅆ: ["ㅅ", "ㅆ"],
  ㅈ: ["ㅈ", "ㅉ"],
  ㅉ: ["ㅈ", "ㅉ"],
};

export function isChoseongMatch(targetChoseong: string, queryChoseong: string): boolean {
  if (targetChoseong === queryChoseong) return true;
  const compat = COMPAT_CHOSEONG[queryChoseong];
  return compat ? compat.includes(targetChoseong) : false;
}

/**
 * query 에서 prefix 만큼을 떼어낸 나머지. prefix 로 시작하지 않으면 null.
 * 공백 · 구두점 · 대소문자는 무시하고 맞추되, 돌려주는 나머지는 원문 그대로다.
 *
 * 드릴다운 검색이 쓴다. `"디올 상의 티셔츠 린넨"` 에서 경로(`"디올 상의 티셔츠"`)를 떼면
 * `" 린넨"` 이 남고, 그것이 상품 검색어가 된다. 초성은 보지 않는다 — 여기 오는 prefix 는
 * 사람이 목록에서 골라 넣은 완성된 이름이다.
 */
export function stripLoosePrefix(query: string, prefix: string): string | null {
  const wanted = normalize(prefix);
  if (wanted.length === 0) return query;

  const chars = [...query];
  let at = 0;
  for (let i = 0; i < chars.length; i++) {
    const piece = normalize(chars[i]);
    if (!piece) continue; // 공백 · 구두점은 건너뛴다
    if (wanted.slice(at, at + piece.length) !== piece) return null;
    at += piece.length;
    if (at >= wanted.length) return chars.slice(i + 1).join("");
  }
  return null;
}

/**
 * query 가 prefix 로 시작하는가 — 공백 · 구두점 · 대소문자는 무시한다.
 *
 * `"디올 상의 티"` 는 `"디올 상의"` 로 시작하므로 그 선택을 그대로 두고, `"디올 ㅎ"` 은
 * 아니므로 최상위 카테고리 선택을 물린다.
 */
export const startsWithLoose = (query: string, prefix: string) =>
  stripLoosePrefix(query, prefix) !== null;

/** query 가 target 안에서 맞는 첫 위치. 안 맞으면 -1, query 가 비면 0. */
export function hangulMatchIndex(target: string, query: string): number {
  const t = [...normalize(target)];
  const q = [...normalize(query)];
  if (q.length === 0) return 0;
  for (let i = 0; i + q.length <= t.length; i++) {
    const hit = q.every((qc, j) => {
      const tc = t[i + j];
      if (qc === tc) return true;
      if (CHOSEONG.includes(qc)) {
        const targetC = choseongOf(tc);
        if (targetC && isChoseongMatch(targetC, qc)) return true;
      }
      return false;
    });
    if (hit) return i;
  }
  return -1;
}

