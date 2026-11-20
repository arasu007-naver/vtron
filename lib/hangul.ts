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

/**
 * 비교용 정규화 — NFC, 소문자, 공백 · 구두점 제거.
 *
 * NFKC 는 호환 자모(ㄱ)를 첫가끝 자모로 바꿔 초성 비교가 깨지므로 NFC 만 쓴다.
 * DB 의 `catalog_search_normalize()`(supabase/migrations/0026)와 stmx-web 의 `@stmx/core/hangul` 도
 * 같은 규칙이다 — 하나를 고치면 셋 다 고친다(갈리면 앱에서 친 글이 서버 컬럼에 안 걸린다).
 */
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s.,'’`\-_/·()&+]/g, "");

const normalize = normalizeSearch;

/** 쌍자음 → 평음. 검색 컬럼은 접어서 저장하므로 검색어도 똑같이 접는다(`ㄱ` 으로 `ㄲ` 도 찾게). */
const FOLD: Record<string, string> = { ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" };

const foldChoseong = (char: string) => FOLD[char] ?? char;

/**
 * 정규화한 글의 한글 음절을 초성으로 바꾼다(쌍자음은 접는다). 음절이 아닌 글자는 그대로 둔다.
 * DB 의 `search_choseong` 컬럼(`catalog_search_choseong()`)과 같은 결과를 낸다.
 */
export function toSearchChoseong(value: string): string {
  return [...normalizeSearch(value)].map((char) => foldChoseong(choseongOf(char) ?? char)).join("");
}

/** 초성 자모(ㄱ~ㅎ)로만 된 글인가. 빈 글은 아니다. */
export function isChoseongOnly(value: string): boolean {
  const chars = [...normalizeSearch(value)];
  return chars.length > 0 && chars.every((char) => CHOSEONG.includes(char));
}

/** 초성으로만 된 검색어를 `search_choseong` 과 비교할 꼴로 — 정규화하고 쌍자음을 접는다. */
export const foldChoseongQuery = (value: string) =>
  [...normalizeSearch(value)].map(foldChoseong).join("");

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

