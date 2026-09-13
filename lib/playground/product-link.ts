/**
 * 카탈로그 모델 → 상품 링크.
 *
 * 커머스 API 는 링크를 직접 주지 않는다. 모델 id 로 조립해야 한다.
 * 형식은 한 곳에만 두고 여기서 고친다.
 */

export interface CatalogModel {
  id: number | string;
  name: string;
  brandCode?: number;
  brandName?: string;
  manufacturerCode?: number;
  manufacturerName?: string;
  categoryId?: string;
  wholeCategoryName?: string;
}

export interface ModelPage {
  contents: CatalogModel[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
}

/**
 * ⚠️ 이 형식은 **검증하지 못했다.** search.shopping.naver.com 이 개발 환경의
 * 브라우징 정책에서 차단돼 열어볼 수 없었다. 실제 형식이 다르면 여기만 고치면 된다.
 */
export const CATALOG_LINK_BASE = "https://search.shopping.naver.com/catalog";

export const buildCatalogLink = (modelId: number | string) =>
  `${CATALOG_LINK_BASE}/${modelId}`;

/** 모델 조회 응답 본문 → 페이지 객체. 형식이 아니면 null. */
export function parseModelPage(body: string): ModelPage | null {
  try {
    const value = JSON.parse(body) as ModelPage;
    return Array.isArray(value?.contents) ? value : null;
  } catch {
    return null;
  }
}

export interface Facet {
  value: string;
  count: number;
}

/**
 * 토글 버튼을 만들 값 목록.
 *
 * `name` 검색은 토큰 분해 매칭이라 무관한 항목이 섞인다(동명이 리프, 다른 브랜드).
 * 그래서 받아온 뒤 카테고리·브랜드로 걸러 확정하는 절차가 필요하고, 그 재료가 이것이다.
 */
export function facetsOf(
  models: CatalogModel[],
  key: "wholeCategoryName" | "brandName"
): Facet[] {
  const counts = new Map<string, number>();
  for (const model of models) {
    const value = (model[key] ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** 켜진 카테고리가 하나도 없으면 거르지 않는다(전체). */
export function applyFacets(models: CatalogModel[], categories: Set<string>): CatalogModel[] {
  if (!categories.size) return models;
  return models.filter((model) => categories.has((model.wholeCategoryName ?? "").trim()));
}
