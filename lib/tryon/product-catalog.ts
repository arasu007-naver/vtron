/**
 * 가상 피팅에서 쓰는 상품 카탈로그 — 타입과 순수 함수. 서버 · 브라우저가 같이 읽는다.
 *
 * 라우트(Bearer 필수)
 *  - `GET /api/tryon/catalog/brands`                     → [[CatalogBrandsResponse]]
 *  - `GET /api/tryon/catalog/categories?brandId=`         → [[CatalogCategoriesResponse]]
 *  - `GET /api/tryon/catalog/products?brandId=&…`         → [[CatalogProductsResponse]]
 *
 * 계층은 **브랜드 → 최상위 카테고리(상의·하의·기타) → 최하위 카테고리 → 상품** 이다.
 * `/brand-integration` 이 네이버에서 모아 `brand_catalog_*` 에 넣어 둔 것을 읽기만 한다 —
 * 피팅 화면에서 네이버를 부르지 않으므로 즉답이고 커머스 토큰도 필요 없다.
 *
 * **내재화된 브랜드만 나온다.** `brand_catalog_kinds` 에 행이 있는 것이 곧 내재화됐다는 뜻이다.
 *
 * 검색이 어디서 일어나는지가 갈린다.
 *  - 브랜드 · 최하위 카테고리는 수가 적어(브랜드 여섯, 한 브랜드의 잎 40개 안팎) 목록을 통째로
 *    내려보내고 브라우저가 [[hangulMatchIndex]] 로 좁힌다. 그래야 "ㄷㅇ" 같은 초성이 걸린다.
 *  - 상품은 한 분류에 900건까지 가므로 서버가 좁힌다. 대신 **초성이 안 걸린다** — 낱말 일부를
 *    맞춘다.
 *
 * stmx-web 의 `packages/core/src/api/loox-product-catalog.ts` 와 같은 모양이다. 같은 표를 읽고
 * 같은 화면(모바일 앱의 착장 상품 찾기)을 옮겨 온 것이라 응답이 달라지면 안 된다.
 */

/** 옷의 최상위 카테고리. `res/clothing-categories.json` 의 kinds 키와 같다. */
export type CatalogKind = "top" | "bottom" | "etc";

export const CATALOG_KINDS: readonly CatalogKind[] = ["top", "bottom", "etc"];

export const isCatalogKind = (value: unknown): value is CatalogKind =>
  typeof value === "string" && (CATALOG_KINDS as readonly string[]).includes(value);

/** 내재화된 브랜드가 가진 최상위 카테고리 하나. */
export interface CatalogBrandKind {
  kind: CatalogKind;
  /** "상의" · "하의" · "기타" */
  label: string;
  categoryCount: number;
  modelCount: number;
}

/** 고를 수 있는 브랜드. 브라우저가 초성으로 좁히려고 별칭까지 받는다. */
export interface CatalogBrand {
  /** brands.id (uuid) */
  id: string;
  displayName: string;
  /** 네이버 등록명. "dior" 로도 걸리게 검색에 같이 쓴다. */
  naverBrandName: string | null;
  aliases: string[];
  kinds: CatalogBrandKind[];
  /** 세 분류를 합친 상품 수. */
  modelCount: number;
}

export interface CatalogBrandsResponse {
  brands: CatalogBrand[];
}

/**
 * 최하위 카테고리 하나. 최상위와 함께 오므로 화면은 `상의 · 여성의류>티셔츠` 처럼 한 줄로
 * 보여 주고 한 번에 고르게 한다.
 */
export interface CatalogCategory {
  categoryId: string;
  kind: CatalogKind;
  /** 최상위 이름 — "상의". */
  kindLabel: string;
  /** 전체 경로 — "패션의류>여성의류>티셔츠". */
  wholeCategoryName: string;
  /**
   * 화면에 낼 경로 — 첫 마디(늘 "패션의류")를 뗀 "여성의류>티셔츠".
   *
   * 끝 마디만 쓰면 서로 다른 것이 같아 보인다. 디올의 "베스트" 는 여성·남성 × 아우터·니트 밑에
   * 넷이다. 첫 마디만 떼면 한 브랜드 안에서 경로가 유일하므로 라벨도 유일하다.
   */
  path: string;
  modelCount: number;
}

export interface CatalogCategoriesResponse {
  categories: CatalogCategory[];
}

/** 고른 상품 하나 — 이 상품의 사진이 곧 피팅에 넣을 가먼트 이미지다. */
export interface CatalogProduct {
  /** 네이버 카탈로그 모델 id. `brand_catalog_models.id`. */
  id: string;
  name: string;
  /** 응답의 brandName — 표기가 displayName 과 다를 수 있다. */
  brandName: string | null;
  categoryId: string;
  kind: CatalogKind;
  /** 첫 마디를 뗀 경로. [[CatalogCategory.path]] 와 같은 규칙. */
  path: string;
  /** 판매 페이지. */
  catalogUrl: string;
  /**
   * 목록에 놓을 만큼 줄인 상품 사진(`products.thumbnail`, 200px WebP). 축소본이 없으면
   * 원본으로 되돌아간다. 카탈로그 표에는 사진이 없어 상품 마스터(`products`)에서 붙인다.
   */
  imageUrl: string | null;
  /**
   * 원본 사진(`products.image_url`, 550~640px). **피팅에 넣는 것은 이쪽이다** — 목록용 200px
   * 를 그대로 보내면 가먼트가 뭉개진다.
   */
  originalImageUrl: string | null;
}

export interface CatalogProductsResponse {
  products: CatalogProduct[];
  /** 좁힌 조건에 맞는 전체 수. `products` 는 그중 한 쪽(page)이다. */
  total: number;
}

/** `GET /api/tryon/catalog/products` 의 검색 조건. */
export interface CatalogProductQuery {
  brandId: string;
  /** 최상위로 좁힌다. 없으면 세 분류 전부. */
  kind?: CatalogKind;
  /** 최하위로 좁힌다. 주면 kind 는 무시해도 된다(잎이 분류를 정한다). */
  categoryId?: string;
  /** 상품명에서 찾을 글. 낱말 일부를 맞춘다(초성은 안 걸린다). */
  q?: string;
  limit?: number;
  offset?: number;
}

/** 한 번에 내려보내는 상품 수. */
export const CATALOG_PRODUCT_PAGE = 30;

/** 경로에서 첫 마디를 뗀다. 라우트와 화면이 같은 라벨을 쓰도록 여기 둔다. */
export function catalogPath(wholeCategoryName: string): string {
  const parts = wholeCategoryName.split(">");
  return parts.length <= 2 ? wholeCategoryName : parts.slice(1).join(">");
}
