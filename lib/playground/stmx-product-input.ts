import "server-only";
import {
  getNaverSearchCredentials,
  searchShopping,
  type ShopItem,
} from "@/lib/playground/naver-search";
import { buildCatalogLink } from "@/lib/playground/product-link";
import type { ProductMasterInput } from "@/lib/playground/stmx-loox";

/**
 * 카탈로그 모델 → stmx-web 상품 마스터(products) 행 입력.
 * 'Loox에 붙이기'(`/api/playground/stmx/loox/products`)와 '등록'(`.../products/image`)이 같이 쓴다.
 *
 * 커머스 API 모델에는 이미지 · 가격이 없다. 네이버 쇼핑 검색으로 같은 카탈로그를 찾아
 * 채우고, 못 찾으면 이미지 없이 0원으로 넣은 뒤 경고를 돌려준다.
 */

/** products.naver_product_id 는 varchar(40). */
const MODEL_ID = /^[\w-]{1,40}$/;

export interface CatalogModelRef {
  id: string;
  name: string;
  /** brandName, 없으면 manufacturerName. 둘 다 없으면 빈 문자열. */
  brand: string;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** 요청 본문의 `model` → 검증된 참조. 형식이 아니면 null. */
export function parseModelRef(value: unknown): CatalogModelRef | null {
  const model = value as {
    id?: unknown;
    name?: unknown;
    brandName?: unknown;
    manufacturerName?: unknown;
  } | null;
  const rawId = model?.id;
  const id = typeof rawId === "number" ? String(rawId) : text(rawId);
  const name = text(model?.name);
  if (!MODEL_ID.test(id) || !name) return null;
  return { id, name, brand: text(model?.brandName) || text(model?.manufacturerName) };
}

/** 쇼핑 검색에서 이 카탈로그 한 건. 같은 productId 가 없으면 첫 결과(exact=false). */
async function lookupShopItem(
  query: string,
  modelId: string
): Promise<{ item: ShopItem | null; exact: boolean; reason?: string }> {
  const creds = getNaverSearchCredentials();
  if (!creds) return { item: null, exact: false, reason: "NAVER_SEARCH_* 자격 증명이 없습니다" };
  try {
    const items = await searchShopping(creds, query, 20);
    const exact = items.find((item) => item.productId === modelId);
    return { item: exact ?? items[0] ?? null, exact: Boolean(exact) };
  } catch (error) {
    return {
      item: null,
      exact: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** stmx-web 은 https 페이지라 http 이미지는 섞인 콘텐츠로 막힌다. */
const toHttps = (url: string | undefined) =>
  url && /^https?:\/\//i.test(url) ? url.replace(/^http:/i, "https:") : null;

/** 모델 → 상품 마스터 입력 + 쇼핑 검색으로 채우지 못한 것에 대한 경고. */
export async function productInputFromModel(
  model: CatalogModelRef
): Promise<{ input: ProductMasterInput; warnings: string[] }> {
  // 모달의 미리보기와 같은 검색어 — 모델명에 브랜드가 빠져 있으면 붙인다.
  const query =
    model.brand && !model.name.includes(model.brand) ? `${model.brand} ${model.name}` : model.name;
  const { item, exact, reason } = await lookupShopItem(query, model.id);

  const warnings: string[] = [];
  if (!item) {
    warnings.push(
      `쇼핑 검색 결과를 받지 못해 이미지 없이 0원으로 넣었습니다${reason ? ` (${reason})` : ""}.`
    );
  } else if (!exact) {
    warnings.push("같은 카탈로그의 쇼핑 결과가 없어 첫 검색 결과의 이미지 · 가격을 썼습니다.");
  }

  const price = Number.parseInt(item?.lprice ?? "", 10);
  return {
    input: {
      naverProductId: model.id,
      naverUrl: buildCatalogLink(model.id),
      brandName: (model.brand || item?.mallName || "브랜드 미상").slice(0, 100),
      name: model.name.slice(0, 300),
      imageUrl: toHttps(item?.image),
      salePrice: Number.isFinite(price) && price >= 0 ? price : 0,
    },
    warnings,
  };
}
