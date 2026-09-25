import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import {
  CATALOG_KINDS,
  catalogPath,
  isCatalogKind,
  type CatalogBrand,
  type CatalogCategory,
  type CatalogKind,
  type CatalogProduct,
  type CatalogProductQuery,
} from "@/lib/tryon/product-catalog";

/**
 * 내재화된 상품 카탈로그 조회 — `brand_catalog_kinds` · `brand_catalog_categories` ·
 * `brand_catalog_models`, 그리고 사진을 붙일 상품 마스터 `products`.
 *
 * 표는 `/brand-integration` 이 채운다(스키마는 supabase/migrations/0005_brand_catalog.sql).
 * 여기서는 읽기만 한다 — 가격도 사진도 이 자리에서 넣지 않는다.
 *
 * service role 로 읽는다. 세 표는 RLS 를 켜 두고 정책을 두지 않았다(사용자 데이터가 아니라
 * 상품 목록이라 사용자별로 갈릴 것이 없다). 대신 라우트가 [[authenticate]] 로 로그인부터 본다.
 */

/** PostgREST 는 한 번에 1000행까지 준다. 잎은 브랜드당 40개 안팎이라 한 번으로 끝난다. */
const MAX_ROWS = 1000;

interface KindRow {
  brand_id: string;
  clothing_kind: string;
  label: string;
  category_count: number | null;
  model_count: number | null;
  brands: {
    id: string;
    display_name: string;
    naver_brand_name: string | null;
    aliases: string[] | null;
  } | null;
}

/**
 * 고를 수 있는 브랜드 — 내재화된 것만.
 *
 * `brand_catalog_kinds` 에 행이 있다는 것이 곧 '이 브랜드는 내재화됐다' 는 뜻이다. 그래서
 * brands(162건)를 훑지 않고 이쪽에서 시작해 브랜드를 끌어온다.
 */
export async function getCatalogBrands(): Promise<CatalogBrand[]> {
  const { data, error } = await getAdminSupabase()
    .from("brand_catalog_kinds")
    .select(
      "brand_id, clothing_kind, label, category_count, model_count, brands(id, display_name, naver_brand_name, aliases)"
    )
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  const byBrand = new Map<string, CatalogBrand>();
  for (const row of (data ?? []) as unknown as KindRow[]) {
    const brand = row.brands;
    if (!brand || !isCatalogKind(row.clothing_kind)) continue;

    let entry = byBrand.get(brand.id);
    if (!entry) {
      entry = {
        id: brand.id,
        displayName: brand.display_name,
        naverBrandName: brand.naver_brand_name,
        aliases: brand.aliases ?? [],
        kinds: [],
        modelCount: 0,
      };
      byBrand.set(brand.id, entry);
    }
    entry.kinds.push({
      kind: row.clothing_kind,
      label: row.label,
      categoryCount: row.category_count ?? 0,
      modelCount: row.model_count ?? 0,
    });
    entry.modelCount += row.model_count ?? 0;
  }

  for (const brand of byBrand.values()) {
    brand.kinds.sort((a, b) => CATALOG_KINDS.indexOf(a.kind) - CATALOG_KINDS.indexOf(b.kind));
  }
  return [...byBrand.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

/**
 * 한 브랜드의 최하위 카테고리 전부 — 세 분류를 통틀어 한 번에.
 *
 * 화면이 `상의 · 여성의류>티셔츠` 처럼 최상위와 최하위를 한 칩으로 고르게 하려는 것이다.
 * 분류 이름(label)은 `brand_catalog_kinds` 가 들고 있어 따로 읽어 붙인다.
 */
export async function getCatalogCategories(brandId: string): Promise<CatalogCategory[]> {
  const admin = getAdminSupabase();

  const kinds = await admin
    .from("brand_catalog_kinds")
    .select("clothing_kind, label")
    .eq("brand_id", brandId);
  if (kinds.error) throw new Error(kinds.error.message);
  const labelOf = new Map(
    (kinds.data ?? []).map((row) => [String(row.clothing_kind), String(row.label)])
  );

  const { data, error } = await admin
    .from("brand_catalog_categories")
    .select("category_id, clothing_kind, whole_category_name, model_count")
    .eq("brand_id", brandId)
    .order("model_count", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => isCatalogKind(row.clothing_kind))
    .map((row) => ({
      categoryId: String(row.category_id),
      kind: row.clothing_kind as CatalogKind,
      kindLabel: labelOf.get(String(row.clothing_kind)) ?? String(row.clothing_kind),
      wholeCategoryName: String(row.whole_category_name),
      path: catalogPath(String(row.whole_category_name)),
      modelCount: row.model_count ?? 0,
    }));
}

/** `%` · `_` 는 ILIKE 의 와일드카드다. 사람이 친 글에서는 글자로 다뤄야 한다. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * 모델 id → 상품 사진. 목록용(`thumb`)은 축소본이 있으면 축소본을, 없으면 원본을 준다.
 * 피팅에 넣을 원본(`original`)도 함께 싣는다 — 주소 한 줄이라 응답이 거의 늘지 않는다.
 *
 * 카탈로그 표에는 사진이 없다. 상품 마스터(`products`)에 올려 둔 것을 `naver_product_id`
 * (= 카탈로그 모델 id, UNIQUE)로 찾아 붙인다. 아직 마스터에 없는 모델은 지도에서 빠지고
 * 화면은 빈 자리로 두며 고를 수 없게 막는다(사진 없이는 피팅할 수 없다).
 */
async function imageUrlByModelId(
  modelIds: string[]
): Promise<Map<string, { thumb: string | null; original: string | null }>> {
  if (modelIds.length === 0) return new Map();

  const { data, error } = await getAdminSupabase()
    .from("products")
    .select("naver_product_id, thumbnail, image_url")
    .in("naver_product_id", modelIds);
  if (error) throw new Error(error.message);

  const map = new Map<string, { thumb: string | null; original: string | null }>();
  for (const row of data ?? []) {
    const original = row.image_url ? String(row.image_url) : null;
    const thumb = row.thumbnail ? String(row.thumbnail) : original;
    if (thumb || original) map.set(String(row.naver_product_id), { thumb, original });
  }
  return map;
}

/**
 * 상품 한 쪽(page).
 *
 * 한 분류에 900건까지 가므로 좁히는 일은 서버가 한다. 상품명 검색은 ILIKE 라 **초성이 안
 * 걸린다** — 브랜드 · 카테고리처럼 목록을 통째로 내려보낼 수 없어서다.
 */
export async function getCatalogProducts(
  input: CatalogProductQuery & { limit: number; offset: number }
): Promise<{ products: CatalogProduct[]; total: number }> {
  let query = getAdminSupabase()
    .from("brand_catalog_models")
    .select(
      "id, name, naver_brand_name, category_id, clothing_kind, whole_category_name, catalog_url",
      { count: "exact" }
    )
    .eq("brand_id", input.brandId);

  // 잎을 주면 그것이 분류까지 정한다. 둘 다 주면 잎이 이긴다.
  if (input.categoryId) query = query.eq("category_id", input.categoryId);
  else if (input.kind) query = query.eq("clothing_kind", input.kind);

  const q = input.q?.trim();
  if (q) query = query.ilike("name", `%${escapeLike(q)}%`);

  const { data, error, count } = await query
    .order("name")
    .range(input.offset, input.offset + input.limit - 1);
  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter((row) => isCatalogKind(row.clothing_kind));
  const imageOf = await imageUrlByModelId(rows.map((row) => String(row.id)));

  const products = rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    brandName: row.naver_brand_name ?? null,
    categoryId: String(row.category_id),
    kind: row.clothing_kind as CatalogKind,
    path: catalogPath(String(row.whole_category_name ?? "")),
    catalogUrl: String(row.catalog_url),
    imageUrl: imageOf.get(String(row.id))?.thumb ?? null,
    originalImageUrl: imageOf.get(String(row.id))?.original ?? null,
  }));

  return { products, total: count ?? products.length };
}
