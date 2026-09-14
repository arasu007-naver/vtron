import { authFetch } from "@/lib/auth-client";
import type { CatalogModel } from "@/lib/playground/product-link";
import type { LooxPost, LooxSort } from "@/lib/playground/stmx-loox";

/**
 * 브라우저 → `/api/playground/stmx/loox*`. 상품링크 모달과 /products-2-link 페이지가 같이 쓴다.
 * stmx-web 자격 증명은 서버에만 있다.
 */

export type { LooxSort };

export type LooxState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "done"; post: LooxPost | null };

/** postId 가 없으면 가장 최근 공개 게시물. */
export async function fetchLoox(postId?: string): Promise<LooxState> {
  const query = postId ? `postId=${encodeURIComponent(postId)}` : "limit=1";
  try {
    const res = await authFetch(`/api/playground/stmx/loox?${query}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.posts)) {
      return { state: "error", error: data?.error ?? `HTTP ${res.status}` };
    }
    return { state: "done", post: (data.posts[0] as LooxPost | undefined) ?? null };
  } catch (e) {
    return { state: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

export interface LooxPage {
  posts: LooxPost[];
  /** 정렬 기준에 드는 게시물 전체 수. */
  total: number;
  page: number;
  pageSize: number;
  sort: LooxSort;
  /** visits 정렬의 집계 시작 시각(ISO). recent 면 null. */
  since: string | null;
  /** visits 정렬일 때 이 페이지 게시물의 7일 클릭 수. recent 면 null. */
  weeklyVisits: Record<string, number> | null;
  /** 누적 방문자수(post.visits)를 못 읽은 사유. */
  visitsError: string | null;
}

/** 게시물 한 페이지(page 는 1부터). */
export async function fetchLooxPage(
  sort: LooxSort,
  page: number,
  pageSize: number
): Promise<{ value: LooxPage } | { error: string }> {
  const params = new URLSearchParams({
    sort,
    page: String(page),
    pageSize: String(pageSize),
  });
  try {
    const res = await authFetch(`/api/playground/stmx/loox?${params}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.posts)) {
      return { error: data?.error ?? `HTTP ${res.status}` };
    }
    return { value: data as LooxPage };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export interface AttachOutcome {
  error?: string;
  alreadyAttached?: boolean;
  warnings: string[];
}

/** 등록할 때 사람이 입력한 가격(원). 할인율은 stmx-web DB 가 계산한다. */
export interface ProductPrice {
  salePrice: number;
  /** 정가. 할인이 없거나 모르면 null. 판매가보다 작을 수 없다. */
  originalPrice: number | null;
}

export interface RegisterOutcome {
  error?: string;
  productId?: string;
  /** 새로 만들었다(false 면 같은 카탈로그의 기존 상품을 갱신했다). */
  created?: boolean;
}

/**
 * 링크의 카탈로그 상품을 상품 마스터(stmx-web products)에 등록한다. Loox 와는 잇지 않는다.
 * `imageUrl` 을 안 주면 기존 이미지를 둔다.
 */
export async function registerProduct(
  model: CatalogModel,
  price: ProductPrice,
  imageUrl?: string | null
): Promise<RegisterOutcome> {
  try {
    const res = await authFetch("/api/playground/stmx/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: {
          id: model.id,
          name: model.name,
          brandName: model.brandName,
          manufacturerName: model.manufacturerName,
        },
        price,
        imageUrl,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error ?? `HTTP ${res.status}` };
    return { productId: data?.productId, created: Boolean(data?.created) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** 카탈로그 모델을 stmx-web 게시물에 건다 — '착장 확인하기' 목록에 나온다. */
export async function attachToLoox(postId: string, model: CatalogModel): Promise<AttachOutcome> {
  try {
    const res = await authFetch("/api/playground/stmx/loox/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        model: {
          id: model.id,
          name: model.name,
          brandName: model.brandName,
          manufacturerName: model.manufacturerName,
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error ?? `HTTP ${res.status}`, warnings: [] };
    return {
      alreadyAttached: Boolean(data?.alreadyAttached),
      warnings: Array.isArray(data?.warnings) ? (data.warnings as string[]) : [],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), warnings: [] };
  }
}

export interface ImageRegisterOutcome {
  error?: string;
  /** 등록한 상품 마스터 id. 이미지만 실패했어도 행을 만들었으면 온다. */
  productId?: string;
  /** 이번에 products 행을 새로 만들었다. */
  createdProduct?: boolean;
  /** 새 products.image_url(Storage 공개 URL). */
  imageUrl?: string;
  warnings: string[];
}

/** 이미지 등록 — image_url 을 채운다. product-crop 이 페이지를 열어 잘라 오느라 수 초 ~ 수십 초 걸린다. */
async function postRegisterImage(body: object): Promise<ImageRegisterOutcome> {
  try {
    const res = await authFetch("/api/playground/stmx/loox/products/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    const base = {
      productId: typeof data?.productId === "string" ? (data.productId as string) : undefined,
      createdProduct: Boolean(data?.createdProduct),
      warnings: Array.isArray(data?.warnings) ? (data.warnings as string[]) : [],
    };
    if (!res.ok || typeof data?.imageUrl !== "string") {
      return { ...base, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { ...base, imageUrl: data.imageUrl as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), warnings: [] };
  }
}

/** 이미 있는 상품 마스터 행의 이미지를 (다시) 채운다. */
export const registerProductImage = (productId: string, naverUrl: string) =>
  postRegisterImage({ productId, naverUrl });

/** 게시물에서 상품을 뗀다. 실패하면 오류 문구, 성공하면 null. */
export async function detachFromLoox(postId: string, productId: string): Promise<string | null> {
  const params = new URLSearchParams({ postId, productId });
  try {
    const res = await authFetch(`/api/playground/stmx/loox/products?${params}`, {
      method: "DELETE",
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? `HTTP ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
