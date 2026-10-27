/**
 * 사업자등록번호 · 상호 — 정규화와 검증. 서버와 화면이 같이 쓴다(외부 의존 없음).
 */

/** 숫자만 남긴다. `123-45-67890` → `1234567890` */
export function normalizeBizNo(input: string): string {
  return String(input ?? "").replace(/\D/g, "");
}

/** 숫자 10자리인지(체크섬은 보지 않는다) */
export function isBizNoFormat(input: string): boolean {
  return /^\d{10}$/.test(normalizeBizNo(input));
}

/** 국세청 사업자등록번호 검증식 */
export function isValidBizNo(input: string): boolean {
  const d = normalizeBizNo(input);
  if (d.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(d[i]) * w[i];
  s += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (s % 10)) % 10 === Number(d[9]);
}

/** 화면 표시용 `XXX-XX-XXXXX`. 10자리가 아니면 받은 그대로. */
export function formatBizNo(input: string | null | undefined): string {
  const d = normalizeBizNo(input ?? "");
  if (d.length !== 10) return input ?? "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 상호 정규화 — 앞뒤 공백만 걷고 안쪽 연속 공백을 하나로. `(주)` · `주식회사` 표기는 그대로 둔다. */
export function normalizeBusinessName(input: string | null | undefined): string {
  return String(input ?? "").replace(/\s+/g, " ").trim();
}
