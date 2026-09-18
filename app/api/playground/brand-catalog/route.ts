import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { getAdminSupabase } from "@/lib/supabase/server";
import {
  toCatalogModelRow,
  type BrandCatalogCategory,
  type BrandCatalogCategoryInput,
  type BrandCatalogPayload,
} from "@/lib/playground/brand-catalog";
import { CLOTHING_KINDS, isClothingKind, type ClothingKind } from "@/lib/playground/clothing";
import type { CatalogModel } from "@/lib/playground/product-link";

/**
 * 브랜드 내재화 — 브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품.
 *
 * `GET  ?naverBrandId=14298`            → `{ brandId, naverBrandId, displayName, catalogSyncedAt, kinds[] }`
 * `GET  ?naverBrandId=14298&kind=top`   → 위에 더해 `{ kind, categories[], models[] }`
 * `GET  ?naverBrandId=14298&categories=1` → 위에 더해 `{ categories[] }` (세 분류 전부)
 * `POST BrandCatalogPayload`            → `{ categoryCount, modelCount, removedCount, warnings }`
 *
 * `kind` 를 주면 그 최상위 카테고리의 최하위 카테고리와 상품을 통째로 돌려준다. 드릴다운
 * 검색(`/brand-integration` 3단계)이 이걸로 네이버를 부르지 않고 바로 내려간다 — 내재화의
 * 값어치가 여기서 나온다. 상품은 `CatalogModel` 모양이라 네이버에서 온 것과 섞어 쓸 수 있다.
 *
 * 브랜드는 `brands.naver_brand_id` 로 짚는다. 브랜드 목록은 DB 가 비면 스냅샷
 * (res/brands-naver-snapshot.json)으로 폴백하는데 그때 `id` 가 uuid 가 아니라서,
 * 브라우저가 보낸 `id` 를 그대로 믿으면 안 된다.
 *
 * POST 는 그 브랜드 × 분류를 **통째로 갈아끼운다**. 이번 목록에 없는 카테고리 · 상품은
 * 지운다 — 화면에서 걸러낸 결과가 그대로 확정값이어야 하기 때문이다.
 *
 * 표는 supabase/migrations/0005_brand_catalog.sql 이 만든다. 아직 실행하지 않았으면
 * GET 은 `missingTables: true` 로 조용히 비어 오고, POST 는 그 사실을 오류로 알린다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 표가 없을 때 PostgREST 가 주는 코드.
 * 42P01 은 Postgres 의 undefined_table, PGRST205 는 스키마 캐시에 그 이름이 없을 때다.
 * 마이그레이션을 안 돌린 상태에서 실제로 오는 것은 PGRST205 쪽이다.
 */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);
const isMissingTable = (code?: string) => Boolean(code && MISSING_TABLE_CODES.has(code));
/**
 * 열이 없을 때의 코드 — 42703 은 Postgres 의 undefined_column, PGRST204 는 쓰려는 열이
 * 스키마 캐시에 없을 때다. `model_code`(0006)를 아직 안 더한 DB 를 견디려고 본다.
 */
const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);
const isMissingColumn = (code?: string) => Boolean(code && MISSING_COLUMN_CODES.has(code));
const MODEL_CODE_HINT =
  "품번(model_code) 열이 없어 품번 없이 다뤘습니다. Supabase SQL Editor 에서" +
  " supabase/migrations/0006_model_code.sql 을 실행하세요.";
const MIGRATION_HINT =
  "브랜드 내재화 표가 없습니다. Supabase SQL Editor 에서 supabase/migrations/0005_brand_catalog.sql 을 실행하세요.";

/** 한 번에 보내는 행 수. 상품이 수백 건이라 나눠 넣는다. */
const CHUNK = 500;

const chunk = <T,>(rows: T[], size = CHUNK): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const toBrandId = (value: unknown): number | null => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
};

interface BrandRow {
  id: string;
  display_name: string;
  naver_brand_id: number;
  catalog_synced_at?: string | null;
}

/** naver_brand_id 로 우리 brands 행을 찾는다. 없으면 왜 없는지 알려준다. */
async function findBrand(
  supabase: ReturnType<typeof getAdminSupabase>,
  naverBrandId: number
): Promise<{ row: BrandRow } | { error: string; status: number }> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, display_name, naver_brand_id, catalog_synced_at")
    .eq("naver_brand_id", naverBrandId)
    .maybeSingle();

  if (error) {
    // catalog_synced_at 은 0005 가 더한 열이다. 아직이면 그 열만 빼고 다시 읽는다.
    const { data: fallback, error: fallbackError } = await supabase
      .from("brands")
      .select("id, display_name, naver_brand_id")
      .eq("naver_brand_id", naverBrandId)
      .maybeSingle();
    if (fallbackError) return { error: fallbackError.message, status: 500 };
    if (!fallback) return { error: brandMissing(naverBrandId), status: 404 };
    return { row: { ...(fallback as BrandRow), catalog_synced_at: null } };
  }
  if (!data) return { error: brandMissing(naverBrandId), status: 404 };
  return { row: data as BrandRow };
}

/** PostgREST 는 한 번에 1000행까지 준다. 한 분류의 상품이 그보다 많을 수 있어 나눠 읽는다. */
const PAGE = 1000;

async function readAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[] } | { error: string }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) return { error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { rows };
  }
}

interface CategoryRow {
  category_id: string;
  whole_category_name: string;
  name: string;
  model_count: number;
}

/** 세 분류를 통틀어 그 브랜드의 최하위 카테고리 전부. 드릴다운이 한 번에 고르려고 쓴다. */
async function readAllCategories(
  supabase: ReturnType<typeof getAdminSupabase>,
  brandId: string
): Promise<{ categories: BrandCatalogCategory[] } | { error: string }> {
  const rows = await readAllRows<CategoryRow & { clothing_kind: string }>((from, to) =>
    supabase
      .from("brand_catalog_categories")
      .select("category_id, clothing_kind, whole_category_name, name, model_count")
      .eq("brand_id", brandId)
      .order("model_count", { ascending: false })
      .range(from, to)
  );
  if ("error" in rows) return rows;
  return {
    categories: rows.rows.filter((row) => isClothingKind(row.clothing_kind)).map((row) => ({
      kind: row.clothing_kind as ClothingKind,
      categoryId: row.category_id,
      wholeCategoryName: row.whole_category_name,
      name: row.name,
      modelCount: row.model_count ?? 0,
    })),
  };
}

interface ModelRow {
  id: string;
  name: string;
  /** 0006 이 더한 열. 이름에 품번이 없던 상품은 null 이다. */
  model_code: string | null;
  category_id: string;
  naver_brand_name: string | null;
  manufacturer_code: number | null;
  manufacturer_name: string | null;
  whole_category_name: string | null;
}

/** 내재화한 한 분류 — 최하위 카테고리와 그 상품. 상품은 CatalogModel 모양으로 돌려준다. */
async function readKind(
  supabase: ReturnType<typeof getAdminSupabase>,
  brandId: string,
  brandCode: number,
  kind: string
): Promise<{ categories: BrandCatalogCategory[]; models: CatalogModel[] } | { error: string }> {
  const categories = await readAllRows<CategoryRow>((from, to) =>
    supabase
      .from("brand_catalog_categories")
      .select("category_id, whole_category_name, name, model_count")
      .eq("brand_id", brandId)
      .eq("clothing_kind", kind)
      .order("model_count", { ascending: false })
      .range(from, to)
  );
  if ("error" in categories) return categories;

  const columns =
    "id, name, category_id, naver_brand_name, manufacturer_code, manufacturer_name, whole_category_name";
  const readModels = (select: string) =>
    readAllRows<ModelRow>((from, to) =>
      supabase
        .from("brand_catalog_models")
        .select(select)
        .eq("brand_id", brandId)
        .eq("clothing_kind", kind)
        .order("name")
        .range(from, to)
        .overrideTypes<ModelRow[]>()
    );

  // 0006 을 아직 안 돌렸으면 model_code 열이 없다. 품번만 빼고 읽는다 — 목록까지 막을 일은 아니다.
  let models = await readModels(`${columns}, model_code`);
  if ("error" in models) {
    const retry = await readModels(columns);
    if ("error" in retry) return models;
    models = retry;
  }

  return {
    categories: categories.rows.map((row) => ({
      categoryId: row.category_id,
      wholeCategoryName: row.whole_category_name,
      name: row.name,
      modelCount: row.model_count ?? 0,
    })),
    models: models.rows.map((row) => ({
      id: row.id,
      name: row.name,
      modelCode: row.model_code,
      brandCode,
      brandName: row.naver_brand_name ?? undefined,
      manufacturerCode: row.manufacturer_code ?? undefined,
      manufacturerName: row.manufacturer_name ?? undefined,
      categoryId: row.category_id,
      wholeCategoryName: row.whole_category_name ?? undefined,
    })),
  };
}

const brandMissing = (naverBrandId: number) =>
  `brands 에 네이버 브랜드 ${naverBrandId} 가 없습니다. npm run sync:brands 로 브랜드를 먼저 채우세요.`;

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const naverBrandId = toBrandId(req.nextUrl.searchParams.get("naverBrandId"));
  if (naverBrandId === null) {
    return NextResponse.json({ error: "naverBrandId 가 필요합니다." }, { status: 400 });
  }
  const wantCategories = req.nextUrl.searchParams.get("categories") === "1";
  const kindParam = req.nextUrl.searchParams.get("kind");
  if (kindParam !== null && !isClothingKind(kindParam)) {
    return NextResponse.json(
      { error: "kind 는 top · bottom · etc 중 하나여야 합니다." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminSupabase();
    const found = await findBrand(supabase, naverBrandId);
    if ("error" in found) {
      // 브랜드가 아직 DB 에 없어도 화면은 떠야 한다 — 내재화한 게 없다고만 알린다.
      return NextResponse.json({
        brandId: null,
        naverBrandId,
        displayName: null,
        catalogSyncedAt: null,
        kinds: [],
        ...(kindParam ? { kind: kindParam, categories: [], models: [] } : {}),
        warning: found.error,
      });
    }

    const { data, error } = await supabase
      .from("brand_catalog_kinds")
      .select("clothing_kind, label, category_count, model_count, synced_at")
      .eq("brand_id", found.row.id);

    if (error) {
      if (isMissingTable(error.code)) {
        return NextResponse.json({
          brandId: found.row.id,
          naverBrandId,
          displayName: found.row.display_name,
          catalogSyncedAt: null,
          kinds: [],
          ...(kindParam ? { kind: kindParam, categories: [], models: [] } : {}),
          missingTables: true,
          warning: MIGRATION_HINT,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const order = CLOTHING_KINDS.map((k) => k.key);
    const kinds = (data ?? [])
      .filter((row) => isClothingKind(row.clothing_kind))
      .map((row) => ({
        kind: row.clothing_kind,
        label: row.label,
        categoryCount: row.category_count ?? 0,
        modelCount: row.model_count ?? 0,
        syncedAt: row.synced_at ?? null,
      }))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

    const summary = {
      brandId: found.row.id,
      naverBrandId,
      displayName: found.row.display_name,
      catalogSyncedAt: found.row.catalog_synced_at ?? null,
      kinds,
    };
    if (!kindParam) {
      if (!wantCategories) return NextResponse.json(summary);
      const all = await readAllCategories(supabase, found.row.id);
      if ("error" in all) return NextResponse.json({ error: all.error }, { status: 500 });
      return NextResponse.json({ ...summary, ...all });
    }

    // 아직 내재화하지 않은 분류면 조회할 것이 없다 — 화면은 네이버로 넘어간다.
    if (!kinds.some((k) => k.kind === kindParam)) {
      return NextResponse.json({ ...summary, kind: kindParam, categories: [], models: [] });
    }
    const detail = await readKind(supabase, found.row.id, naverBrandId, kindParam);
    if ("error" in detail) return NextResponse.json({ error: detail.error }, { status: 500 });
    return NextResponse.json({ ...summary, kind: kindParam, ...detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ── POST ───────────────────────────────────────────────────────────────────

/** 본문 검사. 통과하면 쓸 수 있는 모양으로 좁혀 돌려준다. */
function parsePayload(raw: unknown): { value: BrandCatalogPayload } | { error: string } {
  if (raw == null || typeof raw !== "object") return { error: "본문이 없습니다." };
  const body = raw as Partial<BrandCatalogPayload>;

  const naverBrandId = toBrandId(body.naverBrandId);
  if (naverBrandId === null) return { error: "naverBrandId 가 필요합니다." };

  const kind = text(body.kind);
  if (!isClothingKind(kind)) return { error: "kind 는 top · bottom · etc 중 하나여야 합니다." };

  if (!Array.isArray(body.categories) || body.categories.length === 0) {
    return { error: "내재화할 최하위 카테고리가 없습니다. 4단계에서 걸러낸 결과를 확인하세요." };
  }
  if (!Array.isArray(body.models) || body.models.length === 0) {
    return { error: "내재화할 상품이 없습니다." };
  }

  const categories: BrandCatalogCategoryInput[] = [];
  for (const entry of body.categories) {
    const categoryId = text((entry as BrandCatalogCategoryInput)?.categoryId);
    const wholeCategoryName = text((entry as BrandCatalogCategoryInput)?.wholeCategoryName);
    if (!categoryId || !wholeCategoryName) {
      return { error: "카테고리마다 categoryId 와 wholeCategoryName 이 있어야 합니다." };
    }
    categories.push({
      categoryId,
      wholeCategoryName,
      modelCount: Number((entry as BrandCatalogCategoryInput)?.modelCount ?? 0) || 0,
    });
  }

  const known = new Set(categories.map((c) => c.categoryId));
  const models: CatalogModel[] = [];
  for (const entry of body.models) {
    const model = entry as CatalogModel;
    const id = text(String(model?.id ?? ""));
    const categoryId = text(String(model?.categoryId ?? ""));
    if (!id || !model?.name) return { error: "상품마다 id 와 name 이 있어야 합니다." };
    if (!known.has(categoryId)) {
      return { error: `상품 ${id} 의 categoryId(${categoryId || "없음"}) 가 카테고리 목록에 없습니다.` };
    }
    models.push(model);
  }

  const kindLabel =
    text(body.kindLabel) || CLOTHING_KINDS.find((k) => k.key === kind)?.label || kind;

  return {
    value: {
      naverBrandId,
      displayName: text(body.displayName),
      kind,
      kindLabel,
      searchNames: Array.isArray(body.searchNames)
        ? body.searchNames.map(text).filter(Boolean)
        : [],
      categories,
      models,
    },
  };
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const parsed = parsePayload(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const payload = parsed.value;

  try {
    const supabase = getAdminSupabase();
    const found = await findBrand(supabase, payload.naverBrandId);
    if ("error" in found) {
      return NextResponse.json({ error: found.error }, { status: found.status });
    }
    const brandId = found.row.id;
    const warnings: string[] = [];
    const now = new Date().toISOString();

    // 1) 최상위 카테고리 — 자식(카테고리 · 상품)이 참조하므로 먼저 있어야 한다.
    const kindUpsert = await supabase.from("brand_catalog_kinds").upsert(
      {
        brand_id: brandId,
        clothing_kind: payload.kind,
        label: payload.kindLabel,
        naver_brand_id: payload.naverBrandId,
        category_count: payload.categories.length,
        model_count: payload.models.length,
        search_names: payload.searchNames,
        source: "brand-integration",
        synced_at: now,
      },
      { onConflict: "brand_id,clothing_kind" }
    );
    if (kindUpsert.error) {
      const missing = isMissingTable(kindUpsert.error.code);
      const status = missing ? 503 : 500;
      const message = missing ? MIGRATION_HINT : kindUpsert.error.message;
      return NextResponse.json({ error: message }, { status });
    }

    // 2) 이번에 빠진 상품 · 카테고리를 먼저 지운다. 카테고리를 지우면 그 상품도 함께 사라진다.
    const keptCategoryIds = new Set(payload.categories.map((c) => c.categoryId));
    const keptModelIds = new Set(payload.models.map((m) => String(m.id)));

    const existingCategories = await supabase
      .from("brand_catalog_categories")
      .select("category_id")
      .eq("brand_id", brandId)
      .eq("clothing_kind", payload.kind);
    if (existingCategories.error) {
      return NextResponse.json({ error: existingCategories.error.message }, { status: 500 });
    }
    const staleCategories = (existingCategories.data ?? [])
      .map((row) => String(row.category_id))
      .filter((id) => !keptCategoryIds.has(id));

    const existingModels = await supabase
      .from("brand_catalog_models")
      .select("id")
      .eq("brand_id", brandId)
      .eq("clothing_kind", payload.kind);
    if (existingModels.error) {
      return NextResponse.json({ error: existingModels.error.message }, { status: 500 });
    }
    const staleModels = (existingModels.data ?? [])
      .map((row) => String(row.id))
      .filter((id) => !keptModelIds.has(id));

    for (const ids of chunk(staleModels)) {
      const { error } = await supabase.from("brand_catalog_models").delete().in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const ids of chunk(staleCategories)) {
      const { error } = await supabase
        .from("brand_catalog_categories")
        .delete()
        .eq("brand_id", brandId)
        .in("category_id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3) 최하위 카테고리 → 상품 차례로 넣는다(상품이 카테고리를 참조한다).
    for (const rows of chunk(
      payload.categories.map((category) => ({
        brand_id: brandId,
        category_id: category.categoryId,
        clothing_kind: payload.kind,
        whole_category_name: category.wholeCategoryName,
        model_count: category.modelCount,
        synced_at: now,
      }))
    )) {
      const { error } = await supabase
        .from("brand_catalog_categories")
        .upsert(rows, { onConflict: "brand_id,category_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 품번(model_code)은 0006 이 더한 열이다. 아직이면 그 칸만 빼고 다시 넣고 경고를 남긴다.
    let dropModelCode = false;
    for (const rows of chunk(
      payload.models.map((model) =>
        toCatalogModelRow(model, brandId, payload.naverBrandId, payload.kind)
      )
    )) {
      const send = (withCode: boolean) =>
        supabase.from("brand_catalog_models").upsert(
          withCode
            ? rows
            : rows.map((row) => {
                const without: Partial<typeof row> = { ...row };
                delete without.model_code;
                return without;
              }),
          { onConflict: "id" }
        );
      let { error } = await send(!dropModelCode);
      if (error && !dropModelCode && isMissingColumn(error.code)) {
        dropModelCode = true;
        warnings.push(MODEL_CODE_HINT);
        ({ error } = await send(false));
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4) 브랜드에 내재화 시각. 0005 를 안 돌렸으면 열이 없으니 경고만 남긴다.
    const stamped = await supabase
      .from("brands")
      .update({ catalog_synced_at: now })
      .eq("id", brandId);
    if (stamped.error) warnings.push(`brands.catalog_synced_at 은 갱신하지 못했습니다 — ${stamped.error.message}`);

    return NextResponse.json({
      categoryCount: payload.categories.length,
      modelCount: payload.models.length,
      removedCount: staleModels.length,
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
