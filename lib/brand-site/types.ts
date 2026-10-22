/**
 * `/product-details` — 왼쪽 브랜드 · 상품 고르기와 오른쪽 브랜드 공식 사이트 검색이 같이 쓰는 모양.
 *
 * 검색 주소는 `brands.api`(원천 res/brand-product-apis.json) 다. 사이트마다 검색 방식이 달라
 * 서버가 주소 모양으로 어댑터를 고른다.
 *
 *   shopify   `/products.json` — 검색 파라미터가 없어 상품을 몇 쪽 받아 이름으로 거른다
 *   cafe24    `/product/search.html?keyword=` — 검색 결과 HTML 의 상품 칸을 읽는다
 *   uniqlo    공식 상품 API 의 `q=`
 *   none      자동 검색을 못 하는 사이트(봇 차단 · 그룹몰 · 자체 검색 API 없음). 링크만 준다
 */

export type BrandSiteAdapter = "shopify" | "cafe24" | "uniqlo" | "none";

export type BrandApiStatus = "verified" | "blocked" | "homepage" | "unverified" | "fallback";

export interface BrandSiteItem {
  title: string;
  /** 브랜드 사이트의 상품 페이지 */
  url: string;
  image: string | null;
  /** 사이트가 보여 준 그대로의 가격 글 ("168,000", "₩129,000") */
  price: string | null;
}

/** `/product-details` 에서 고를 수 있는 브랜드 — 네이버 브랜드와 매칭된 161개. */
export interface BrandOption {
  /** brands.id (uuid) */
  id: string;
  naverBrandId: number;
  displayName: string;
  naverBrandName: string | null;
  /** 초성 검색에 같이 쓴다("CHANEL" 로도 샤넬이 걸리게) */
  aliases: string[];
  api: string | null;
  apiStatus: BrandApiStatus | null;
  apiStatusNote: string | null;
  /** api 로 자동 검색할 수 있는 방식 */
  adapter: BrandSiteAdapter;
}

export type BrandSiteBrand = Omit<BrandOption, "aliases">;

/** 네이버 카탈로그 모델 하나 — 왼쪽 상품 목록의 줄. 사진 · 가격은 없다. */
export interface NaverModel {
  id: string;
  name: string;
  categoryId: string;
  /** "패션의류>여성의류>니트" */
  wholeCategoryName: string;
  /** 네이버 카탈로그 페이지 */
  catalogUrl: string;
}

export interface BrandModelsResponse {
  brand: BrandOption;
  models: NaverModel[];
  /** 네이버에 보낸 검색어("마뗑킴 니트"). 못 찾았으면 null. */
  usedQuery: string | null;
}

export interface BrandSiteSearchResponse {
  brand: BrandSiteBrand;
  adapter: BrandSiteAdapter;
  /** 화면이 보낸(또는 서버가 상품명에서 만든) 검색어 */
  query: string;
  /** 결과를 낸 검색어. 처음 검색어로 못 찾으면 낱말 하나씩 줄여 다시 찾는다. */
  usedQuery: string | null;
  items: BrandSiteItem[];
  /** 사람이 열어볼 브랜드 사이트 검색 페이지(만들 수 있을 때) */
  searchPageUrl: string | null;
  /** 자동 검색을 못 했거나 실패한 이유 */
  note: string | null;
}

export const BRAND_API_STATUS_LABEL: Record<BrandApiStatus, string> = {
  verified: "확인됨",
  blocked: "봇 차단",
  homepage: "스토어 첫 화면",
  unverified: "미확인",
  fallback: "대체 주소",
};

export const ADAPTER_LABEL: Record<BrandSiteAdapter, string> = {
  shopify: "Shopify products.json",
  cafe24: "Cafe24 검색",
  uniqlo: "유니클로 상품 API",
  none: "자동 검색 미지원",
};
