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

