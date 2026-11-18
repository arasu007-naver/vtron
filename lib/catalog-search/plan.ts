/**
 * 착장 상품 검색 v2 — 검색어를 조건으로 푸는 순수 함수. 서버 · 브라우저 · 테스트가 같이 읽는다.
 *
 * 설계: stmx-web `docs/product-search.md` 4.2. 라우트는 `GET /api/product-search-v2`.
 *
 *   "ㄴㅇㅋ ㅇㅇㅍㅅ"  →  브랜드 [나이키]       + 초성 토큰 ["ㅇㅇㅍㅅ"]
 *   "나이키 에어포스"   →  브랜드 [나이키]       + 글자 토큰 ["에어포스"]
 *   "ㅇㅇㅍㅅ"         →  브랜드 조건 없음       + 초성 토큰 ["ㅇㅇㅍㅅ"]
 *   "cw2288-111"      →  브랜드 조건 없음       + 글자 토큰 ["cw2288111"]  (품번)
 *
 * 1. 검색어를 공백으로 나눠 토큰으로 만든다.
 * 2. 앞에서부터 토큰(이어 붙인 여러 토큰 포함 — "루이 비통")을 브랜드 목록에 맞춰 본다. 표시명 ·
 *    네이버 브랜드명 · 별칭에 **앞에서부터** 맞으면([[hangulMatchIndex]] === 0) 브랜드 조건이 된다.
 *    글자+초성 혼합("나ㅇㅋ")과 별칭("ck")도 여기서 풀린다.
 * 3. 남은 토큰은 정규화한다. 자모로만 된 토큰은 `search_choseong`, 그 밖은 `search_text` 에
 *    부분 일치로 맞춘다. 토큰끼리는 AND 다.
 */

import { foldChoseongQuery, hangulMatchIndex, isChoseongOnly, normalizeSearch } from "@/lib/hangul";
import type { CatalogBrand, CatalogKind, CatalogProduct } from "@/lib/tryon/product-catalog";

/** 브랜드 없이 찾을 때 검색어의 최소 글자 수(정규화한 뒤). 이보다 짧으면 400. */
export const MIN_QUERY_LENGTH = 2;

/** 한 쪽(page) 기본 · 최대 건수. */
export const SEARCH_PAGE = 30;
export const SEARCH_PAGE_MAX = 100;

export type BrandMatchInput = Pick<CatalogBrand, "id" | "displayName" | "naverBrandName" | "aliases">;

/** 브랜드로 풀린 토큰 하나. */
export interface BrandToken {
  /** 사용자가 친 그대로(여러 토큰이면 공백으로 이은 것). */
  token: string;
  brands: { id: string; displayName: string }[];
}

export interface SearchPlan {
  /** 브랜드 조건. null 이면 전체 브랜드. */
  brandIds: string[] | null;
  brandTokens: BrandToken[];
  /** `search_choseong LIKE '%토큰%'` — 정규화 · 쌍자음 접기를 마친 값. */
  choseongTokens: string[];
  /** `search_text LIKE '%토큰%'` — 정규화를 마친 값. 품번이 여기 걸린다. */
  textTokens: string[];
}

const brandMatches = (brand: BrandMatchInput, query: string) =>
  [brand.displayName, brand.naverBrandName ?? "", ...brand.aliases].some(
    (name) => name && hangulMatchIndex(name, query) === 0
  );

/**
 * 검색어 → 조건.
 *
 * `brandId` 를 주면 그 브랜드 안에서만 찾는다. 이때도 브랜드 토큰을 풀지만, 그 토큰이 주어진
 * 브랜드를 가리킬 때만 브랜드 토큰으로 치고(그래서 "리바이스 트러커" 를 리바이스 안에서 쳐도
 * 된다), 아니면 글자 토큰으로 남긴다.
 */
export function planSearch(q: string, brands: BrandMatchInput[], brandId?: string): SearchPlan {
  const raw = q.split(/\s+/).filter((token) => normalizeSearch(token).length > 0);

  let brandIds: string[] | null = brandId ? [brandId] : null;
  const brandTokens: BrandToken[] = [];
  const rest: string[] = [];

  let i = 0;
  while (i < raw.length) {
    // 가장 길게 이어 붙여 맞는 브랜드를 찾는다 — "루이 비통" 이 "루이" 보다 먼저.
    let taken = 0;
    let hit: BrandMatchInput[] = [];
    for (let j = raw.length; j > i; j--) {
      const joined = raw.slice(i, j).join(" ");
      // 한 글자는 브랜드로 보지 않는다 — "ㅋ" 가 캘빈클라인 · 크리스찬디올을 다 잡아 버린다.
      if (normalizeSearch(joined).length < 2) continue;
      const candidates = brands.filter((brand) => brandMatches(brand, joined));
      const allowed = brandIds ? candidates.filter((brand) => brandIds!.includes(brand.id)) : candidates;
      if (allowed.length > 0) {
        taken = j - i;
        hit = allowed;
        break;
      }
    }

    if (taken === 0) {
      rest.push(raw[i]);
      i += 1;
      continue;
    }

    brandIds = hit.map((brand) => brand.id);
    brandTokens.push({
      token: raw.slice(i, i + taken).join(" "),
      brands: hit.map((brand) => ({ id: brand.id, displayName: brand.displayName })),
    });
    i += taken;
  }

  const choseongTokens: string[] = [];
  const textTokens: string[] = [];
  for (const token of rest) {
    if (isChoseongOnly(token)) choseongTokens.push(foldChoseongQuery(token));
    else textTokens.push(normalizeSearch(token));
  }

  return { brandIds, brandTokens, choseongTokens, textTokens };
}

/** `GET /api/product-search-v2` 의 응답. */
export interface ProductSearchV2Response {
  products: CatalogProduct[];
  /** 조건에 맞는 전체 수. `products` 는 그중 한 쪽이다. */
  total: number;
  /** 검색어를 어떻게 풀었나 — 시험 화면이 보여 준다. */
  plan: SearchPlan;
  /**
   * 어디서 맞췄나.
   *  - `columns` — DB 의 `search_text` · `search_choseong` 컬럼(0026 마이그레이션 후)
   *  - `memory`  — 컬럼이 아직 없어 전 상품을 읽어 서버 메모리에서 맞춘 것. 결과는 같지만 느리다.
   */
  mode: "columns" | "memory";
  tookMs: number;
}

export interface ProductSearchV2Query {
  q: string;
  brandId?: string;
  kind?: CatalogKind;
  categoryId?: string;
  limit: number;
  offset: number;
}
