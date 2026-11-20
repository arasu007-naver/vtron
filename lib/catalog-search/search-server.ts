import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import { normalizeSearch, toSearchChoseong } from "@/lib/hangul";
import { catalogPath, isCatalogKind, type CatalogKind } from "@/lib/tryon/product-catalog";
import { getCatalogBrands, imageUrlByModelId } from "@/lib/tryon/product-catalog-server";
import {
  planSearch,
  type ProductSearchV2Query,
  type ProductSearchV2Response,
  type SearchPlan,
} from "./plan";

/**
 * 착장 상품 검색 v2 — 카테고리를 거치지 않고 검색 칸 하나로 브랜드 · 상품명(초성 포함) · 품번을 찾는다.
 *
 * 설계: stmx-web `docs/product-search.md`. 검색어를 조건으로 푸는 일은 [[planSearch]] 가 하고,
 * 여기서는 그 조건으로 `brand_catalog_models` 를 읽는다.
 *
 * 맞추는 곳이 둘이다.
 *  - `columns` — `search_text` · `search_choseong` 컬럼에 LIKE. 0026 마이그레이션 뒤의 본래 길.
 *  - `memory`  — 컬럼이 아직 없으면(42703 undefined_column) 전 상품을 읽어 같은 규칙으로 메모리에서
 *    맞춘다. 마이그레이션 전에도 시험할 수 있게 둔 것이고, 두 길의 결과가 같아야 한다
 *    (`?mode=memory` 로 일부러 고를 수도 있다 — 컬럼 결과와 견줘 볼 때).
 */

const MODEL_COLUMNS =
  "id, brand_id, name, naver_brand_name, category_id, clothing_kind, whole_category_name, catalog_url";

/** PostgREST 는 한 번에 1000행까지 준다. */
const PAGE_ROWS = 1000;

interface ModelRow {
  id: string;
  brand_id: string;
  name: string;
  naver_brand_name: string | null;
  category_id: string;
  clothing_kind: string;
  whole_category_name: string | null;
  catalog_url: string;
}

/** `%` · `_` · `\` 는 LIKE 의 특수 글자다. 사람이 친 글에서는 글자로 다뤄야 한다. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const isUndefinedColumn = (error: { code?: string } | null) => error?.code === "42703";

/** 브랜드 목록은 수십 건이라 잠깐 들고 있는다. 검색마다 다시 읽을 까닭이 없다. */
const BRAND_TTL_MS = 60_000;
let brandCache: { at: number; brands: Awaited<ReturnType<typeof getCatalogBrands>> } | null = null;

async function cachedBrands() {
  if (brandCache && Date.now() - brandCache.at < BRAND_TTL_MS) return brandCache.brands;
  const brands = await getCatalogBrands();
  brandCache = { at: Date.now(), brands };
  return brands;
}

export class ProductSearchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function searchCatalogProducts(
  input: ProductSearchV2Query & { mode?: "auto" | "memory" }
): Promise<ProductSearchV2Response> {
  const started = Date.now();
  const brands = await cachedBrands();

  if (input.brandId && !brands.some((brand) => brand.id === input.brandId)) {
    throw new ProductSearchError("내재화된 브랜드가 아닙니다.", 404);
  }

  const plan = planSearch(input.q, brands, input.brandId);

  let page: { rows: ModelRow[]; total: number } | null = null;
  let mode: ProductSearchV2Response["mode"] = "columns";
  if (input.mode !== "memory") page = await searchByColumns(plan, input);
  if (!page) {
    mode = "memory";
    page = await searchInMemory(plan, input);
  }

  const rows = page.rows.filter((row) => isCatalogKind(row.clothing_kind));
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

  return { products, total: page.total, plan, mode, tookMs: Date.now() - started };
}

/** 컬럼으로 찾는다. 컬럼이 아직 없으면 null(→ 메모리로). */
async function searchByColumns(
  plan: SearchPlan,
  input: ProductSearchV2Query
): Promise<{ rows: ModelRow[]; total: number } | null> {
  // search_text 를 늘 같이 읽는다 — 토큰이 브랜드뿐이어도 컬럼이 없으면 여기서 알아채 mode 가 정직하게 나온다.
  let query = getAdminSupabase()
    .from("brand_catalog_models")
    .select(`${MODEL_COLUMNS}, search_text`, { count: "exact" });

  if (plan.brandIds) {
    query = plan.brandIds.length === 1 ? query.eq("brand_id", plan.brandIds[0]) : query.in("brand_id", plan.brandIds);
  }
  // 잎을 주면 그것이 분류까지 정한다. 둘 다 주면 잎이 이긴다.
  if (input.categoryId) query = query.eq("category_id", input.categoryId);
  else if (input.kind) query = query.eq("clothing_kind", input.kind);

  for (const token of plan.choseongTokens) query = query.like("search_choseong", `%${escapeLike(token)}%`);
  for (const token of plan.textTokens) query = query.like("search_text", `%${escapeLike(token)}%`);

  const { data, error, count } = await query
    .order("name")
    .order("id")
    .range(input.offset, input.offset + input.limit - 1);
  if (isUndefinedColumn(error)) return null;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as ModelRow[];
  return { rows, total: count ?? rows.length };
}

// ---------------------------------------------------------------------------
// 메모리 — 컬럼이 생기기 전의 대체 길
// ---------------------------------------------------------------------------

interface IndexedRow extends ModelRow {
  searchText: string;
  searchChoseong: string;
}

/** 전 상품(8천여 건)을 읽는 데 9번 오간다. 시험용 길이라 1분만 들고 있는다. */
const MODEL_TTL_MS = 60_000;
let modelCache: { at: number; rows: IndexedRow[] } | null = null;

async function allModels(): Promise<IndexedRow[]> {
  if (modelCache && Date.now() - modelCache.at < MODEL_TTL_MS) return modelCache.rows;

  const admin = getAdminSupabase();
  const rows: IndexedRow[] = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await admin
      .from("brand_catalog_models")
      .select(MODEL_COLUMNS)
      .order("id")
      .range(from, from + PAGE_ROWS - 1);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as unknown as ModelRow[]) {
      // DB 생성 컬럼과 같은 식 — 0026 의 search_text · search_choseong.
      const searchText = normalizeSearch(`${row.naver_brand_name ?? ""} ${row.name}`);
      rows.push({ ...row, searchText, searchChoseong: toSearchChoseong(searchText) });
    }
    if (!data || data.length < PAGE_ROWS) break;
  }

  modelCache = { at: Date.now(), rows };
  return rows;
}

/** PostgreSQL 의 `order by name, id` 에 가깝게 — 코드 포인트 순. */
const byNameThenId = (a: ModelRow, b: ModelRow) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

async function searchInMemory(
  plan: SearchPlan,
  input: ProductSearchV2Query
): Promise<{ rows: ModelRow[]; total: number }> {
  const brandIds = plan.brandIds ? new Set(plan.brandIds) : null;

  const hits = (await allModels()).filter((row) => {
    if (brandIds && !brandIds.has(row.brand_id)) return false;
    if (input.categoryId) {
      if (row.category_id !== input.categoryId) return false;
    } else if (input.kind && row.clothing_kind !== input.kind) return false;
    return (
      plan.choseongTokens.every((token) => row.searchChoseong.includes(token)) &&
      plan.textTokens.every((token) => row.searchText.includes(token))
    );
  });

  hits.sort(byNameThenId);
  const rows: ModelRow[] = hits.slice(input.offset, input.offset + input.limit).map((row) => ({
    id: row.id,
    brand_id: row.brand_id,
    name: row.name,
    naver_brand_name: row.naver_brand_name,
    category_id: row.category_id,
    clothing_kind: row.clothing_kind,
    whole_category_name: row.whole_category_name,
    catalog_url: row.catalog_url,
  }));
  return { rows, total: hits.length };
}
