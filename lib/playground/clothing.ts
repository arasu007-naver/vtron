import config from "@/res/clothing-categories.json";
import { hangulMatchIndex } from "@/lib/hangul";
import type { CatalogModel } from "@/lib/playground/product-link";

/**
 * 상품링크의 옷 분류 — 상의 · 하의 · 기타.
 *
 * 설정은 res/clothing-categories.json 한 곳이고 scripts/sync-brands.mjs 도 같은 파일을 읽는다.
 * 카탈로그 모델 조회는 브랜드 id · 카테고리 id 를 받지 않으므로(무시된다) "브랜드명 + 옷 키워드" 로
 * 찾고, 응답의 brandCode 와 categoryId 로 거른다.
 */

export const CLOTHING_KIND_KEYS = ["top", "bottom", "etc"] as const;
export type ClothingKind = (typeof CLOTHING_KIND_KEYS)[number];

export interface ClothingKindDef {
  key: ClothingKind;
  label: string;
  /** 브랜드명 뒤에 붙여 모델을 찾는 검색어. */
  keywords: string[];
  categoryIds: ReadonlySet<string>;
}

export const CLOTHING_KINDS: ClothingKindDef[] = CLOTHING_KIND_KEYS.map((key) => ({
  key,
  label: config.kinds[key].label,
  keywords: config.kinds[key].keywords,
  categoryIds: new Set(config.kinds[key].categoryIds),
}));

export const isClothingKind = (value: string): value is ClothingKind =>
  (CLOTHING_KIND_KEYS as readonly string[]).includes(value);

/** 상품링크에 나오는 브랜드 묶음(`section/key`). 잡화 · 슈즈 · 아이웨어 묶음은 뺐다. */
export const CLOTHING_BRAND_GROUPS: ReadonlySet<string> = new Set(config.brandGroups);

/** `GET /api/playground/brands` 의 한 건. */
export interface ClothingBrand {
  id: string;
  displayName: string;
  aliases: string[];
  naverBrandId: number;
  naverBrandName: string | null;
  /** 옷 동기화에서 모델이 걸린 브랜드 검색어. 동기화 전이면 null. */
  clothingQuery: string | null;
  /** 동기화 표본에서 센 분류별 모델 수 — 전체 수가 아니다. 옷 동기화 전이면 0. */
  counts: Record<ClothingKind, number>;
}

/** 모델 검색에 넣을 브랜드 이름. 앞의 것으로 하나도 안 걸리면 다음 것으로 찾는다. */
export function brandSearchNames(brand: ClothingBrand): string[] {
  const names = [
    brand.clothingQuery,
    brand.displayName.replace(/\s*\(.*\)\s*$/, ""),
    brand.naverBrandName,
  ]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
}

/**
 * 초성 · 네이버 등록명 · 별칭까지 훑어 고른다. 앞에서 맞을수록 위, 같으면 가나다순.
 * 검색어가 비면 전체.
 */
export function searchBrands(brands: ClothingBrand[], query: string): ClothingBrand[] {
  if (!query.trim()) return brands;
  return brands
    .map((brand) => {
      const hits = [brand.displayName, brand.naverBrandName ?? "", ...brand.aliases]
        .map((name) => hangulMatchIndex(name, query))
        .filter((index) => index >= 0);
      return { brand, rank: hits.length ? Math.min(...hits) : -1 };
    })
    .filter((entry) => entry.rank >= 0)
    .sort(
      (a, b) => a.rank - b.rank || a.brand.displayName.localeCompare(b.brand.displayName, "ko")
    )
    .map((entry) => entry.brand);
}

/** 한 페이지에서 고른 브랜드 · 분류에 맞는 모델만. seen 으로 키워드 사이의 중복을 뺀다. */
export function pickClothingModels(
  models: CatalogModel[],
  naverBrandId: number,
  kind: ClothingKindDef,
  seen: Set<string>
): CatalogModel[] {
  return models.filter((model) => {
    const key = String(model.id);
    if (seen.has(key)) return false;
    if (String(model.brandCode ?? "") !== String(naverBrandId)) return false;
    if (!kind.categoryIds.has(String(model.categoryId ?? ""))) return false;
    seen.add(key);
    return true;
  });
}
