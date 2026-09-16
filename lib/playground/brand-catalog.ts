import { authFetch } from "@/lib/auth-client";
import type { ClothingBrand, ClothingKind, ClothingKindDef } from "@/lib/playground/clothing";
import { buildCatalogLink, type CatalogModel } from "@/lib/playground/product-link";

/**
 * 브랜드 내재화 — 브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품.
 *
 * `/brand-integration` 에서 확정한 것을 우리 DB(brand_catalog_*)에 넣고 다시 읽는 형식.
 * 서버 라우트(`/api/playground/brand-catalog`)와 브라우저가 같이 쓴다.
 *
 * 왜 내재화하나: 지금은 브랜드를 고를 때마다 네이버 커머스 API 를 키워드 수만큼 부른다.
 * 429 를 피하려 호출 사이에 0.55 초를 쉬므로 한 분류에 3~6 초가 걸리고, 같은 브랜드를 다시
 * 봐도 매번 반복한다. 한 번 확정한 계층을 우리가 들고 있으면 그 뒤로는 부를 일이 없다.
 */

/**
 * 먼저 내재화하기로 한 브랜드. `/brand-integration` 3단계 위에 빠른 선택으로 깔린다.
 * 나머지 브랜드는 같은 화면에서 하나씩 이어서 한다 — 목록이 아니라 출발점이다.
 * 이름은 brands.display_name 과 같아야 한다(res/brands-naver-snapshot.json 기준).
 */
export const BRAND_INTEGRATION_TARGETS = [
  "디올",
  "루이비통",
  "룰루레몬",
  "리바이스",
  "랄프로렌",
  "캘빈클라인",
] as const;

/** 내재화할 최하위 카테고리 한 건 — 상품링크 4단계의 '걸러내기' 토글 하나. */
export interface BrandCatalogCategoryInput {
  categoryId: string;
  wholeCategoryName: string;
  modelCount: number;
}

/** `POST /api/playground/brand-catalog` 본문. 브랜드 × 최상위 카테고리 하나씩 보낸다. */
export interface BrandCatalogPayload {
  /** 브랜드를 찾는 키. brands.naver_brand_id 로 우리 쪽 브랜드를 짚는다. */
  naverBrandId: number;
  displayName: string;
  kind: ClothingKind;
  kindLabel: string;
  /** 모델 조회에 실제로 쓴 브랜드 이름. */
  searchNames: string[];
  categories: BrandCatalogCategoryInput[];
  models: CatalogModel[];
}

/** 내재화된 최상위 카테고리 하나(조회 결과). */
export interface BrandCatalogKind {
  kind: ClothingKind;
  label: string;
  categoryCount: number;
  modelCount: number;
  syncedAt: string | null;
}

/** 내재화된 최하위 카테고리 하나(조회 결과). */
export interface BrandCatalogCategory {
  categoryId: string;
  /** "패션의류>여성의류>원피스" */
  wholeCategoryName: string;
  /** 경로의 마지막 마디 — "원피스". */
  name: string;
  modelCount: number;
}

/** `GET /api/playground/brand-catalog?naverBrandId=` 응답. */
export interface BrandCatalogSummary {
  brandId: string | null;
  naverBrandId: number;
  displayName: string | null;
  catalogSyncedAt: string | null;
  kinds: BrandCatalogKind[];
  /** 내재화 표가 아직 없다(마이그레이션 0005 미실행). */
  missingTables?: boolean;
}

/** `&kind=` 를 붙여 부른 응답 — 그 최상위 카테고리의 최하위 카테고리와 상품까지. */
export interface BrandCatalogKindDetail extends BrandCatalogSummary {
  kind: ClothingKind;
  categories: BrandCatalogCategory[];
  models: CatalogModel[];
}

export interface BrandCatalogSaveOutcome {
  error?: string;
  /** 넣은 최하위 카테고리 수. */
  categoryCount?: number;
  /** 넣은 상품 수. */
  modelCount?: number;
  /** 이번에 사라져 지운 상품 수. */
  removedCount?: number;
  warnings: string[];
}

/**
 * 걸러낸 모델을 최하위 카테고리별로 묶어 보낼 형식으로 만든다.
 *
 * 카테고리 경로(`wholeCategoryName`)가 비어 있는 모델은 계층에 끼울 자리가 없어 뺀다.
 * 상품링크 4단계의 토글도 경로를 값으로 쓰므로 어차피 걸러지지 않는 항목이다.
 */
export function buildBrandCatalogPayload(
  brand: ClothingBrand,
  kind: ClothingKindDef,
  models: CatalogModel[],
  searchNames: string[]
): { payload: BrandCatalogPayload; skipped: CatalogModel[] } {
  const byCategory = new Map<string, BrandCatalogCategoryInput>();
  const kept: CatalogModel[] = [];
  const skipped: CatalogModel[] = [];

  for (const model of models) {
    const categoryId = String(model.categoryId ?? "").trim();
    const wholeCategoryName = (model.wholeCategoryName ?? "").trim();
    if (!categoryId || !wholeCategoryName) {
      skipped.push(model);
      continue;
    }
    const current = byCategory.get(categoryId) ?? {
      categoryId,
      wholeCategoryName,
      modelCount: 0,
    };
    current.modelCount++;
    byCategory.set(categoryId, current);
    kept.push(model);
  }

  return {
    payload: {
      naverBrandId: brand.naverBrandId,
      displayName: brand.displayName,
      kind: kind.key,
      kindLabel: kind.label,
      searchNames,
      categories: [...byCategory.values()].sort((a, b) => b.modelCount - a.modelCount),
      models: kept,
    },
    skipped,
  };
}

/** 모델 → brand_catalog_models 한 행. 라우트와 스크립트가 같은 모양을 쓰도록 여기서 만든다. */
export const toCatalogModelRow = (
  model: CatalogModel,
  brandId: string,
  naverBrandId: number,
  kind: ClothingKind
) => ({
  id: String(model.id),
  brand_id: brandId,
  category_id: String(model.categoryId ?? ""),
  clothing_kind: kind,
  name: model.name,
  naver_brand_id: naverBrandId,
  naver_brand_name: model.brandName ?? null,
  manufacturer_code: model.manufacturerCode ?? null,
  manufacturer_name: model.manufacturerName ?? null,
  whole_category_name: model.wholeCategoryName ?? null,
  catalog_url: buildCatalogLink(model.id),
  synced_at: new Date().toISOString(),
});

// ── 브라우저 → 라우트 ───────────────────────────────────────────────────────

/** 브랜드 × 최상위 카테고리 하나를 내재화한다. */
export async function saveBrandCatalog(
  payload: BrandCatalogPayload
): Promise<BrandCatalogSaveOutcome> {
  try {
    const res = await authFetch("/api/playground/brand-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    const warnings = Array.isArray(data?.warnings) ? (data.warnings as string[]) : [];
    if (!res.ok) return { error: data?.error ?? `HTTP ${res.status}`, warnings };
    return {
      categoryCount: Number(data?.categoryCount ?? 0),
      modelCount: Number(data?.modelCount ?? 0),
      removedCount: Number(data?.removedCount ?? 0),
      warnings,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), warnings: [] };
  }
}

/** 이 브랜드가 이미 무엇을 내재화했는지. */
export async function fetchBrandCatalog(
  naverBrandId: number
): Promise<{ value: BrandCatalogSummary } | { error: string }> {
  try {
    const res = await authFetch(
      `/api/playground/brand-catalog?naverBrandId=${encodeURIComponent(naverBrandId)}`
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.kinds)) {
      return { error: data?.error ?? `HTTP ${res.status}` };
    }
    return { value: data as BrandCatalogSummary };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 내재화한 한 분류를 통째로 — 최하위 카테고리와 상품.
 * 아직 내재화하지 않은 분류면 `categories` · `models` 가 빈 배열로 온다(오류가 아니다).
 */
export async function fetchBrandCatalogKind(
  naverBrandId: number,
  kind: ClothingKind
): Promise<{ value: BrandCatalogKindDetail } | { error: string }> {
  const params = new URLSearchParams({ naverBrandId: String(naverBrandId), kind });
  try {
    const res = await authFetch(`/api/playground/brand-catalog?${params}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.models)) {
      return { error: data?.error ?? `HTTP ${res.status}` };
    }
    return { value: data as BrandCatalogKindDetail };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
