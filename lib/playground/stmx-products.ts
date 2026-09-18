import "server-only";
import {
  StmxWebWriteError,
  connectStmx,
  type StmxWebCredentials,
} from "@/lib/playground/stmx-loox";

/**
 * 상품 페이지(/products)의 stmx-web 상품 마스터(products) 조회 · 수정.
 *
 * products 에는 카테고리 컬럼이 없다. 카테고리는 카탈로그 모델
 * (brand_catalog_models.whole_category_name)에 있고, `products.naver_product_id`
 * 가 곧 그 표의 `id` 다. 두 표 사이에 FK 가 없어 PostgREST 임베딩이 안 되므로
 * 모델 표를 한 번 읽어 메모리 지도로 들고 조인한다([[catalogMap]]).
 *
 * 품번(model_code)은 실측상 늘 상품명 끝에 붙어 있어(2026-09 기준 model_code 가
 * 있는 1,730건 전부) 품번 조회는 조인 없이 `name ilike` 로 한다. 카탈로그에 없는
 * 상품도 품번으로 찾힌다.
 */

type StmxClient = ReturnType<typeof connectStmx>;

const failed = (step: string, error: { message: string }) =>
  new StmxWebWriteError(502, `${step}: ${error.message}`);

/** PostgREST 한 번에 오는 최대 행 수. 전수 조회는 이만큼씩 끊어 읽는다. */
const PAGE = 1000;

const COLUMNS =
  "id, brand_name, name, image_url, sale_price, original_price, discount_rate, " +
  "currency, naver_url, naver_product_id, is_sold_out, is_active, created_at, updated_at";

export type ProductSort = "recent" | "oldest";

export interface ProductRow {
  id: string;
  brandName: string;
  name: string;
  imageUrl: string | null;
  salePrice: number;
  originalPrice: number | null;
  /** DB 가 계산하는 generated column. 정가가 없으면 null. */
  discountRate: number | null;
  currency: string;
  naverUrl: string;
  naverProductId: string | null;
  isSoldOut: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** 카탈로그 모델의 `패션의류>여성의류>…` 전체 경로. 모델이 없으면 null. */
  category: string | null;
  /** 카탈로그 모델의 품번. 없으면 null. */
  modelCode: string | null;
}

export interface ProductFilters {
  /** products.brand_name 과 정확히 같은 값(목록에서 고른 것). */
  brand?: string;
  /** brand_catalog_models.whole_category_name 전체 경로. */
  category?: string;
  /** 상품명 부분 일치. */
  name?: string;
  /** 품번 부분 일치 — 상품명 안에서 찾는다. */
  modelCode?: string;
}

export interface ProductPage {
  products: ProductRow[];
  /** 조건에 드는 전체 상품 수. */
  total: number;
  page: number;
  pageSize: number;
  sort: ProductSort;
}

export interface ProductFacets {
  /** 상품이 하나라도 있는 브랜드 — 많은 순. */
  brands: { value: string; count: number }[];
  /** 상품이 하나라도 있는 카테고리 경로 — 많은 순. */
  categories: { value: string; count: number }[];
  /** 카탈로그 모델을 찾지 못해 카테고리를 모르는 상품 수. */
  uncategorized: number;
}

interface RawProduct {
  id: string;
  brand_name: string;
  name: string;
  image_url: string | null;
  sale_price: number;
  original_price: number | null;
  discount_rate: number | null;
  currency: string;
  naver_url: string;
  naver_product_id: string | null;
  is_sold_out: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CatalogMeta {
  category: string | null;
  modelCode: string | null;
}

/**
 * `%` · `,` · 괄호는 PostgREST 필터 문법과 겹친다. 조회어에서는 빼고 쓴다 —
 * 상품명 · 품번에 쓸 일이 없는 글자다.
 */
const safeTerm = (value: string) => value.replace(/[%,()*\\]/g, "").trim();

/** 카탈로그 모델 지도 — 5분 캐시. 모델은 배치 동기화라 이 사이에 거의 안 바뀐다. */
const CATALOG_TTL_MS = 5 * 60_000;
let catalogCache: { at: number; map: Map<string, CatalogMeta> } | null = null;
/** 캐시가 비었을 때 목록 · 선택지 요청이 겹쳐 8천 행을 두 번 읽지 않도록. */
let catalogPending: Promise<Map<string, CatalogMeta>> | null = null;

function catalogMap(client: StmxClient): Promise<Map<string, CatalogMeta>> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return Promise.resolve(catalogCache.map);
  }
  catalogPending ??= readCatalog(client).finally(() => {
    catalogPending = null;
  });
  return catalogPending;
}

async function readCatalog(client: StmxClient): Promise<Map<string, CatalogMeta>> {
  const map = new Map<string, CatalogMeta>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("brand_catalog_models")
      .select("id, whole_category_name, model_code")
      .range(from, from + PAGE - 1);
    if (error) throw failed("카탈로그 모델 조회 실패", error);
    const rows = (data ?? []) as {
      id: string;
      whole_category_name: string | null;
      model_code: string | null;
    }[];
    for (const row of rows) {
      map.set(row.id, { category: row.whole_category_name, modelCode: row.model_code });
    }
    if (rows.length < PAGE) break;
  }

  catalogCache = { at: Date.now(), map };
  return map;
}

const toRow = (raw: RawProduct, meta: CatalogMeta | undefined): ProductRow => ({
  id: raw.id,
  brandName: raw.brand_name,
  name: raw.name,
  imageUrl: raw.image_url,
  salePrice: raw.sale_price,
  originalPrice: raw.original_price,
  discountRate: raw.discount_rate,
  currency: raw.currency,
  naverUrl: raw.naver_url,
  naverProductId: raw.naver_product_id,
  isSoldOut: raw.is_sold_out,
  isActive: raw.is_active,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  category: meta?.category ?? null,
  modelCode: meta?.modelCode ?? null,
});

/** 카테고리 말고 products 에서 바로 거를 수 있는 조건들. */
function applyFilters<T>(query: T, filters: ProductFilters): T {
  // supabase-js 의 필터는 같은 빌더를 돌려주지만 제네릭으로는 좁히기 어려워 any 로 잇는다.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let q: any = query;
  const brand = filters.brand?.trim();
  const name = filters.name ? safeTerm(filters.name) : "";
  const code = filters.modelCode ? safeTerm(filters.modelCode) : "";
  if (brand) q = q.eq("brand_name", brand);
  if (name) q = q.ilike("name", `%${name}%`);
  if (code) q = q.ilike("name", `%${code}%`);
  return q as T;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** 카테고리로 거를 때 쓰는 전수 조회 — 정렬 · 페이지 자르기는 메모리에서 한다. */
async function scanIds(
  client: StmxClient,
  filters: ProductFilters
): Promise<{ id: string; naver_product_id: string | null; created_at: string }[]> {
  const out: { id: string; naver_product_id: string | null; created_at: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const query = applyFilters(
      client.from("products").select("id, naver_product_id, created_at"),
      filters
    ).range(from, from + PAGE - 1);
    const { data, error } = await query;
    if (error) throw failed("상품 조회 실패", error);
    const rows = (data ?? []) as typeof out;
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** id 목록 그대로의 차례로 상품을 읽는다. */
async function rowsByIds(
  client: StmxClient,
  ids: string[],
  catalog: Map<string, CatalogMeta>
): Promise<ProductRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client.from("products").select(COLUMNS).in("id", ids);
  if (error) throw failed("상품 조회 실패", error);
  const raws = (data ?? []) as unknown as RawProduct[];
  const byId = new Map(raws.map((raw) => [raw.id, raw]));
  return ids
    .map((id) => byId.get(id))
    .filter((raw): raw is RawProduct => Boolean(raw))
    .map((raw) => toRow(raw, raw.naver_product_id ? catalog.get(raw.naver_product_id) : undefined));
}

/**
 * 상품 한 페이지(page 는 1부터).
 *
 * 카테고리 조건이 없으면 DB 가 세고 · 정렬하고 · 잘라 준다(빠른 길).
 * 있으면 조건에 드는 id 를 전부 읽어 카탈로그 지도와 교집합을 낸 뒤 메모리에서 자른다.
 */
export async function listProducts(
  creds: StmxWebCredentials,
  filters: ProductFilters,
  sort: ProductSort,
  page: number,
  pageSize: number
): Promise<ProductPage> {
  const client = connectStmx(creds);
  const ascending = sort === "oldest";
  const offset = (page - 1) * pageSize;
  const category = filters.category?.trim();

  if (!category) {
    const catalog = await catalogMap(client);
    const query = applyFilters(
      client.from("products").select(COLUMNS, { count: "exact" }),
      filters
    )
      // created_at 이 같은 행끼리도 차례가 흔들리지 않게 id 를 덧붙인다.
      .order("created_at", { ascending })
      .order("id", { ascending })
      .range(offset, offset + pageSize - 1);
    const { data, error, count } = await query;
    if (error) throw failed("상품 조회 실패", error);
    const products = ((data ?? []) as unknown as RawProduct[]).map((raw) =>
      toRow(raw, raw.naver_product_id ? catalog.get(raw.naver_product_id) : undefined)
    );
    return { products, total: count ?? products.length, page, pageSize, sort };
  }

  const catalog = await catalogMap(client);
  const scanned = await scanIds(client, filters);
  const hit = scanned.filter((row) => {
    const meta = row.naver_product_id ? catalog.get(row.naver_product_id) : undefined;
    return meta?.category === category;
  });
  hit.sort((a, b) => {
    const diff = a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
    return ascending ? diff : -diff;
  });
  const products = await rowsByIds(
    client,
    hit.slice(offset, offset + pageSize).map((row) => row.id),
    catalog
  );
  return { products, total: hit.length, page, pageSize, sort };
}

/** 조회 상자의 브랜드 · 카테고리 목록 — 상품이 실제로 있는 값만. */
export async function productFacets(creds: StmxWebCredentials): Promise<ProductFacets> {
  const client = connectStmx(creds);
  const catalog = await catalogMap(client);

  const brands = new Map<string, number>();
  const categories = new Map<string, number>();
  let uncategorized = 0;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("products")
      .select("brand_name, naver_product_id")
      .range(from, from + PAGE - 1);
    if (error) throw failed("상품 조회 실패", error);
    const rows = (data ?? []) as { brand_name: string; naver_product_id: string | null }[];
    for (const row of rows) {
      brands.set(row.brand_name, (brands.get(row.brand_name) ?? 0) + 1);
      const category = row.naver_product_id ? catalog.get(row.naver_product_id)?.category : null;
      if (category) categories.set(category, (categories.get(category) ?? 0) + 1);
      else uncategorized += 1;
    }
    if (rows.length < PAGE) break;
  }

  const sorted = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ko"));

  return { brands: sorted(brands), categories: sorted(categories), uncategorized };
}

export interface ProductPatch {
  brandName?: string;
  name?: string;
  salePrice?: number;
  originalPrice?: number | null;
  imageUrl?: string | null;
  isSoldOut?: boolean;
  isActive?: boolean;
}

/**
 * 상품 한 건 수정 — '갱신' 모달이 저장하는 것.
 *
 * 판매가 · 정가는 `sale_price <= original_price` 제약이 중간 상태에 걸리지 않도록
 * 한 문장으로 같이 보낸다(부른 쪽이 둘 중 하나만 바꿔도 다른 하나를 함께 넣는다).
 */
export async function updateProduct(
  creds: StmxWebCredentials,
  id: string,
  patch: ProductPatch
): Promise<ProductRow> {
  const client = connectStmx(creds);
  const changes: Record<string, unknown> = {};
  if (patch.brandName !== undefined) changes.brand_name = patch.brandName;
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.salePrice !== undefined) changes.sale_price = patch.salePrice;
  if (patch.originalPrice !== undefined) changes.original_price = patch.originalPrice;
  if (patch.imageUrl !== undefined) changes.image_url = patch.imageUrl;
  if (patch.isSoldOut !== undefined) changes.is_sold_out = patch.isSoldOut;
  if (patch.isActive !== undefined) changes.is_active = patch.isActive;

  if (Object.keys(changes).length === 0) {
    throw new StmxWebWriteError(400, "바꿀 값이 없습니다.");
  }

  const { data, error } = await client
    .from("products")
    .update(changes)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw failed("상품 수정 실패", error);
  if (!data) throw new StmxWebWriteError(404, "그 상품이 없습니다.");

  const raw = data as unknown as RawProduct;
  const catalog = await catalogMap(client);
  return toRow(raw, raw.naver_product_id ? catalog.get(raw.naver_product_id) : undefined);
}
