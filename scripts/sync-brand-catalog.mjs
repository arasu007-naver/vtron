#!/usr/bin/env node
/**
 * 브랜드 내재화 — 브랜드 → 최상위 카테고리(상의·하의·기타) → 최하위 카테고리 → 상품 을
 * 네이버 카탈로그에서 모아 Supabase brand_catalog_kinds · brand_catalog_categories ·
 * brand_catalog_models 에 넣는다.
 *
 *   npm run sync:brand-catalog                       # 먼저 내재화하기로 한 브랜드 전부
 *   npm run sync:brand-catalog -- --only=디올,리바이스  # 일부만
 *   npm run sync:brand-catalog -- --kinds=top,bottom  # 일부 최상위 카테고리만 (기본 전부)
 *   npm run sync:brand-catalog -- --dry-run           # 조회만 하고 DB 에 쓰지 않는다
 *
 * 화면(`/brand-integration` 의 '브랜드 등록')이 하는 일과 같다. 다른 것은 사람이 4단계에서
 * 카테고리를 걸러낼 수 없다는 점뿐이라, 여기서는 res/clothing-categories.json 의 분류에
 * 드는 카테고리를 모두 넣는다. 화면에서 다시 등록하면 그때 걸러낸 것으로 갈아끼워진다.
 *
 * 스키마는 supabase/migrations/0005_brand_catalog.sql 과 품번 열을 더하는 0006_model_code.sql.
 * 먼저 SQL Editor 에서 실행해 둔다.
 * 브랜드 자체(brands 행)는 npm run sync:brands 가 먼저 채워 둬야 한다.
 */

import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  MODEL_PAGE_SIZE,
  NaverCommerce,
  ROOT,
  loadEnv,
  readJson,
} from "./lib/naver-commerce.mjs";
// 품번 규칙은 화면과 한 곳에서 나와야 한다 — 노드가 타입만 걷어내고 그대로 읽는다.
import { modelCodeOf } from "../lib/playground/product-link.ts";

const CLOTHING_FILE = path.join(ROOT, "res/clothing-categories.json");
const SNAPSHOT_FILE = path.join(ROOT, "res/brands-naver-snapshot.json");

/**
 * 먼저 내재화하기로 한 브랜드. lib/playground/brand-catalog.ts 의 BRAND_INTEGRATION_TARGETS
 * 와 같아야 한다 — 화면의 '먼저' 빠른 선택이 같은 목록을 쓴다.
 */
const DEFAULT_TARGETS = ["디올", "루이비통", "룰루레몬", "리바이스", "랄프로렌", "캘빈클라인"];

/** 키워드마다 받아볼 페이지 수. 화면은 1페이지만 보지만 스크립트는 좀 더 깊이 판다. */
const PAGES_PER_KEYWORD = 2;
/** 한 번에 보내는 행 수. */
const CHUNK = 500;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const list = (name) => option(name)?.split(",").map((s) => s.trim()).filter(Boolean);

const DRY_RUN = flag("dry-run");
const ONLY = list("only") ?? DEFAULT_TARGETS;
const KINDS = list("kinds");

const chunk = (rows, size = CHUNK) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

const buildCatalogLink = (modelId) => `https://search.shopping.naver.com/catalog/${modelId}`;

// ── 브랜드 고르기 ───────────────────────────────────────────────────────────

/**
 * 이름 → { displayName, naverBrandId, searchNames }.
 *
 * 네이버 브랜드 id 는 스냅샷(res/brands-naver-snapshot.json)에서 가져온다. sync-brands 가
 * 이미 찾아 둔 값이라 브랜드 조회를 다시 할 이유가 없다. 스냅샷에 없으면 그때만 조회한다.
 */
function resolveTargets(names) {
  const snapshot = readJson(SNAPSHOT_FILE);
  const byName = new Map((snapshot.brands ?? []).map((b) => [b.displayName, b]));
  const found = [];
  const missing = [];

  for (const name of names) {
    const row = byName.get(name);
    if (!row?.naverBrandId) {
      missing.push(name);
      continue;
    }
    // 모델 조회에 쓸 이름 — 화면의 brandSearchNames() 와 같은 순서다.
    const searchNames = [
      row.clothing?.query,
      row.displayName.replace(/\s*\(.*\)\s*$/, ""),
      row.naverBrandName,
    ]
      .map((n) => n?.trim())
      .filter(Boolean);
    found.push({
      displayName: row.displayName,
      naverBrandId: Number(row.naverBrandId),
      searchNames: [...new Set(searchNames)],
    });
  }
  return { found, missing };
}

// ── 네이버 조회 ─────────────────────────────────────────────────────────────

/**
 * 브랜드 × 최상위 카테고리의 모델.
 *
 * 모델 조회는 브랜드 id · 카테고리 id 를 받지 않는다(무시된다). "브랜드명 + 옷 키워드" 로
 * 키워드마다 부르고, 섞여 든 다른 브랜드 · 카테고리는 brandCode · categoryId 로 거른다.
 * 앞 이름으로 하나도 안 걸리면 다음 이름(네이버 등록명 등)으로 다시 찾는다.
 */
async function collectKind(naver, brand, kindKey, kindDef) {
  const categoryIds = new Set(kindDef.categoryIds.map(String));

  for (const name of brand.searchNames) {
    const seen = new Set();
    const models = [];
    for (const keyword of kindDef.keywords) {
      for (let page = 1; page <= PAGES_PER_KEYWORD; page++) {
        const result = await naver.searchModels(`${name} ${keyword}`, page);
        for (const m of result.contents) {
          const categoryId = String(m.categoryId ?? "");
          if (String(m.brandCode) !== String(brand.naverBrandId)) continue;
          if (seen.has(String(m.id)) || !categoryIds.has(categoryId)) continue;
          seen.add(String(m.id));
          models.push(m);
        }
        if (result.last || result.contents.length < MODEL_PAGE_SIZE) break;
      }
    }
    if (models.length > 0) return { searchName: name, kind: kindKey, label: kindDef.label, models };
  }
  return { searchName: brand.searchNames[0] ?? null, kind: kindKey, label: kindDef.label, models: [] };
}

/** 모델 목록 → 최하위 카테고리 목록. 경로가 없는 모델은 계층에 끼울 자리가 없어 뺀다. */
function groupByCategory(models) {
  const categories = new Map();
  const kept = [];
  let skipped = 0;
  for (const m of models) {
    const categoryId = String(m.categoryId ?? "").trim();
    const wholeCategoryName = String(m.wholeCategoryName ?? "").trim();
    if (!categoryId || !wholeCategoryName) {
      skipped++;
      continue;
    }
    const current = categories.get(categoryId) ?? { categoryId, wholeCategoryName, modelCount: 0 };
    current.modelCount++;
    categories.set(categoryId, current);
    kept.push(m);
  }
  return {
    categories: [...categories.values()].sort((a, b) => b.modelCount - a.modelCount),
    models: kept,
    skipped,
  };
}

// ── Supabase ───────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STMX_WEB_SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 없습니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** 표가 없을 때 PostgREST 가 주는 코드(스키마 캐시 · undefined_table). */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

const fail = (error, what) => {
  if (!error) return;
  if (MISSING_TABLE_CODES.has(error.code)) {
    throw new Error(
      `${what}: 브랜드 내재화 표가 없습니다.` +
        " Supabase SQL Editor 에서 supabase/migrations/0005_brand_catalog.sql 을 먼저 실행하세요."
    );
  }
  throw new Error(`${what}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
};

/** 브랜드 × 분류 하나를 통째로 갈아끼운다. 라우트의 POST 와 같은 순서다. */
async function writeKind(supabase, brandId, brand, collected) {
  const now = new Date().toISOString();
  const { categories, models, skipped } = groupByCategory(collected.models);

  // 1) 최상위 카테고리 — 자식이 참조하므로 먼저.
  fail(
    (
      await supabase.from("brand_catalog_kinds").upsert(
        {
          brand_id: brandId,
          clothing_kind: collected.kind,
          label: collected.label,
          naver_brand_id: brand.naverBrandId,
          category_count: categories.length,
          model_count: models.length,
          search_names: collected.searchName ? [collected.searchName] : [],
          source: "sync-brand-catalog",
          synced_at: now,
        },
        { onConflict: "brand_id,clothing_kind" }
      )
    ).error,
    "brand_catalog_kinds upsert"
  );

  // 2) 이번에 빠진 것을 먼저 지운다. 카테고리를 지우면 그 상품도 함께 사라진다.
  const keptCategoryIds = new Set(categories.map((c) => c.categoryId));
  const keptModelIds = new Set(models.map((m) => String(m.id)));

  const existingModels = await supabase
    .from("brand_catalog_models")
    .select("id")
    .eq("brand_id", brandId)
    .eq("clothing_kind", collected.kind);
  fail(existingModels.error, "brand_catalog_models 조회");
  const staleModels = (existingModels.data ?? [])
    .map((r) => String(r.id))
    .filter((id) => !keptModelIds.has(id));
  for (const ids of chunk(staleModels)) {
    fail((await supabase.from("brand_catalog_models").delete().in("id", ids)).error, "상품 삭제");
  }

  const existingCategories = await supabase
    .from("brand_catalog_categories")
    .select("category_id")
    .eq("brand_id", brandId)
    .eq("clothing_kind", collected.kind);
  fail(existingCategories.error, "brand_catalog_categories 조회");
  const staleCategories = (existingCategories.data ?? [])
    .map((r) => String(r.category_id))
    .filter((id) => !keptCategoryIds.has(id));
  for (const ids of chunk(staleCategories)) {
    fail(
      (
        await supabase
          .from("brand_catalog_categories")
          .delete()
          .eq("brand_id", brandId)
          .in("category_id", ids)
      ).error,
      "카테고리 삭제"
    );
  }

  // 3) 최하위 카테고리 → 상품 차례로(상품이 카테고리를 참조한다).
  for (const rows of chunk(
    categories.map((c) => ({
      brand_id: brandId,
      category_id: c.categoryId,
      clothing_kind: collected.kind,
      whole_category_name: c.wholeCategoryName,
      model_count: c.modelCount,
      synced_at: now,
    }))
  )) {
    fail(
      (
        await supabase
          .from("brand_catalog_categories")
          .upsert(rows, { onConflict: "brand_id,category_id" })
      ).error,
      "카테고리 upsert"
    );
  }

  for (const rows of chunk(
    models.map((m) => ({
      id: String(m.id),
      brand_id: brandId,
      category_id: String(m.categoryId),
      clothing_kind: collected.kind,
      name: m.name,
      // 품번은 있으면 담고, 없으면 null 로 둔다.
      model_code: modelCodeOf(m.name),
      naver_brand_id: brand.naverBrandId,
      naver_brand_name: m.brandName ?? null,
      manufacturer_code: m.manufacturerCode ?? null,
      manufacturer_name: m.manufacturerName ?? null,
      whole_category_name: m.wholeCategoryName ?? null,
      catalog_url: buildCatalogLink(m.id),
      synced_at: now,
    }))
  )) {
    fail(
      (await supabase.from("brand_catalog_models").upsert(rows, { onConflict: "id" })).error,
      "상품 upsert"
    );
  }

  fail(
    (await supabase.from("brands").update({ catalog_synced_at: now }).eq("id", brandId)).error,
    "brands.catalog_synced_at"
  );

  return { categories: categories.length, models: models.length, removed: staleModels.length, skipped };
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const clothing = readJson(CLOTHING_FILE);
  const kindKeys = (KINDS ?? Object.keys(clothing.kinds)).filter((k) => clothing.kinds[k]);
  if (kindKeys.length === 0) throw new Error(`--kinds 가 잘못됐습니다: ${KINDS?.join(",")}`);

  const { found, missing } = resolveTargets(ONLY);
  if (missing.length > 0) {
    console.warn(
      `스냅샷에 없어 건너뜁니다: ${missing.join(", ")}` +
        " — npm run sync:brands 로 먼저 브랜드를 찾으세요."
    );
  }
  if (found.length === 0) throw new Error("내재화할 브랜드가 없습니다.");

  console.log(
    `브랜드 ${found.length}개 × 분류 ${kindKeys.length}개` + (DRY_RUN ? " (dry-run)" : "")
  );

  const naver = NaverCommerce.fromEnv();
  const supabase = DRY_RUN ? null : getSupabase();

  for (const brand of found) {
    let brandId = null;
    if (supabase) {
      const { data, error } = await supabase
        .from("brands")
        .select("id")
        .eq("naver_brand_id", brand.naverBrandId)
        .maybeSingle();
      fail(error, `brands 조회 [${brand.displayName}]`);
      if (!data) {
        console.warn(
          `${brand.displayName} ✗ brands 에 네이버 브랜드 ${brand.naverBrandId} 가 없습니다.` +
            " npm run sync:brands 를 먼저 돌리세요."
        );
        continue;
      }
      brandId = data.id;
    }

    for (const kindKey of kindKeys) {
      const kindDef = clothing.kinds[kindKey];
      const collected = await collectKind(naver, brand, kindKey, kindDef);
      const label = `${brand.displayName} · ${kindDef.label}`;
      if (collected.models.length === 0) {
        console.log(`${label} → 모델 0건, 건너뜁니다.`);
        continue;
      }
      if (!supabase) {
        const grouped = groupByCategory(collected.models);
        console.log(
          `${label} → 카테고리 ${grouped.categories.length} · 상품 ${grouped.models.length}` +
            ` (검색어 '${collected.searchName}')`
        );
        continue;
      }
      const written = await writeKind(supabase, brandId, brand, collected);
      console.log(
        `${label} → 카테고리 ${written.categories} · 상품 ${written.models}` +
          (written.removed ? ` · 지움 ${written.removed}` : "") +
          (written.skipped ? ` · 경로 없어 뺌 ${written.skipped}` : "") +
          ` (검색어 '${collected.searchName}')`
      );
    }
  }

  console.log(`\n네이버 호출 ${naver.calls}회`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
