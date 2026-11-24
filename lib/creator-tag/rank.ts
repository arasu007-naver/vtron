/**
 * 크리에이터 태그 — 후보 필터 · 정렬 · 검색 순서 (순수 로직, 외부 호출 없음).
 * 네이버 호출은 `search` 함수로 주입받는다.
 */
import type { ShopItem } from "../playground/naver-search";

export const MAX_CANDIDATES = 5;
export const MAX_SEARCH_CALLS = 3;

/** NFKC → 소문자 → 문자·숫자 외 제거. */
export const brandKey = (value: string): string =>
  value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const PURCHASE_URL = /^https:\/\/(?:smartstore|brand)\.naver\.com\/[^/?#]+\/products\/\d+(?:[/?#].*)?$/;

export interface TagCandidate {
  productId: string;
  title: string;
  brandName: string | null;
  imageUrl: string | null;
  price: number;
  mallName: string;
  purchaseUrl: string;
}

export interface RankOptions {
  /** 등록 브랜드의 표시명 · 네이버 브랜드명 · 별칭 (미등록이면 입력 브랜드명). 비면 브랜드 필터를 건너뛴다. */
  brandTerms: string[];
  styleCode: string | null;
}

const includesAny = (haystack: string, keys: string[]) => keys.some((k) => haystack.includes(k));

export function filterAndRank(items: ShopItem[], { brandTerms, styleCode }: RankOptions): TagCandidate[] {
  const keys = [...new Set(brandTerms.map(brandKey).filter(Boolean))];
  const codeKey = styleCode ? brandKey(styleCode) : "";

  const scored: { c: TagCandidate; code: number; field: number; idx: number }[] = [];
  items.forEach((it, idx) => {
    const type = Number(it.productType);
    if (!PURCHASE_URL.test(it.link)) return;
    if (!(type >= 1 && type <= 3)) return;
    if (!it.productId.trim() || !it.title.trim()) return;

    const fieldKey = `${brandKey(it.brand ?? "")}|${brandKey(it.maker ?? "")}`;
    const fieldHit = keys.length > 0 && includesAny(fieldKey, keys);
    if (keys.length > 0 && !fieldHit && !includesAny(brandKey(it.title), keys)) return;

    const price = Number.parseInt(it.lprice, 10);
    scored.push({
      c: {
        productId: it.productId,
        title: it.title,
        brandName: it.brand?.trim() || it.maker?.trim() || null,
        imageUrl: it.image || null,
        price: Number.isFinite(price) && price > 0 ? price : 0,
        mallName: it.mallName,
        purchaseUrl: it.link,
      },
      code: codeKey && brandKey(it.title).includes(codeKey) ? 0 : 1,
      field: fieldHit ? 0 : 1,
      idx,
    });
  });

  scored.sort((a, b) => a.code - b.code || a.field - b.field || a.idx - b.idx);
  const seen = new Set<string>();
  const out: TagCandidate[] = [];
  for (const { c } of scored) {
    if (seen.has(c.productId)) continue;
    seen.add(c.productId);
    out.push(c);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

export interface CandidateInput {
  brandName: string;
  productName: string | null;
  styleCode: string | null;
  barcode: string | null;
  brandTerms: string[];
}

/** 브랜드+품번 → 브랜드+상품명 → 바코드 순. 후보 5개면 중단, 최대 3회 호출. */
export async function collectCandidates(
  input: CandidateInput,
  search: (query: string) => Promise<ShopItem[]>
): Promise<TagCandidate[]> {
  const brand = input.brandName.trim();
  const queries = [
    input.styleCode?.trim() && `${brand} ${input.styleCode.trim()}`.trim(),
    input.productName?.trim() && `${brand} ${input.productName.trim()}`.trim(),
    input.barcode?.trim(),
  ].filter((q): q is string => Boolean(q));

  const pool: ShopItem[] = [];
  let result: TagCandidate[] = [];
  for (const q of queries.slice(0, MAX_SEARCH_CALLS)) {
    pool.push(...(await search(q)));
    result = filterAndRank(pool, { brandTerms: input.brandTerms, styleCode: input.styleCode });
    if (result.length >= MAX_CANDIDATES) break;
  }
  return result;
}
