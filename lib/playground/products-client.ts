import { authFetch } from "@/lib/auth-client";
import type {
  ProductFacets,
  ProductFilters,
  ProductPage,
  ProductPatch,
  ProductRow,
  ProductSort,
} from "@/lib/playground/stmx-products";

/**
 * 브라우저 → `/api/playground/stmx/products*`. 상품 페이지(/products)가 쓴다.
 * stmx-web 자격 증명은 서버에만 있다.
 */

export type { ProductFacets, ProductFilters, ProductPage, ProductPatch, ProductRow, ProductSort };

const fail = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 상품 한 페이지(page 는 1부터). */
export async function fetchProducts(
  filters: ProductFilters,
  sort: ProductSort,
  page: number,
  pageSize: number
): Promise<{ value: ProductPage } | { error: string }> {
  const params = new URLSearchParams({ sort, page: String(page), pageSize: String(pageSize) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  try {
    const res = await authFetch(`/api/playground/stmx/products?${params}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.products)) {
      return { error: data?.error ?? `HTTP ${res.status}` };
    }
    return { value: data as ProductPage };
  } catch (e) {
    return { error: fail(e) };
  }
}

/** 조회 상자의 브랜드 · 카테고리 선택지. */
export async function fetchProductFacets(): Promise<{ value: ProductFacets } | { error: string }> {
  try {
    const res = await authFetch("/api/playground/stmx/products/facets");
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.brands)) {
      return { error: data?.error ?? `HTTP ${res.status}` };
    }
    return { value: data as ProductFacets };
  } catch (e) {
    return { error: fail(e) };
  }
}

/** '갱신' 모달의 저장 — 고친 상품 한 건을 돌려준다. */
export async function updateProduct(
  id: string,
  patch: ProductPatch
): Promise<{ value: ProductRow } | { error: string }> {
  try {
    const res = await authFetch(`/api/playground/stmx/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.product) return { error: data?.error ?? `HTTP ${res.status}` };
    return { value: data.product as ProductRow };
  } catch (e) {
    return { error: fail(e) };
  }
}
