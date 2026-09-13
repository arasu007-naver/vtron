#!/usr/bin/env node
/**
 * res/korea_fashion_brands.json 의 브랜드를 네이버 쇼핑 커넥트(커머스 API)에서 찾아
 * Supabase brands · brand_groups · brand_group_members · brand_categories · naver_categories 에 넣는다.
 *
 *   npm run sync:brands                      # 네이버 조회 → 스냅샷 저장 → DB 반영
 *   npm run sync:brands -- --dry-run         # 네이버 조회 → 스냅샷만 저장
 *   npm run sync:brands -- --from-snapshot   # 네이버 조회 없이 스냅샷으로 DB 반영
 *   npm run sync:brands -- --only=샤넬,폴로   # 일부만 다시 조회(스냅샷의 나머지는 유지)
 *   npm run sync:brands -- --clothing-only   # 브랜드 매칭은 스냅샷 그대로, 옷 카테고리만 다시 조회
 *
 * 스키마는 supabase/migrations/0002_brands.sql · 0003_brand_clothing.sql · 0004_clothing_etc.sql.
 * 먼저 SQL Editor 에서 실행해 둔다.
 *
 * 네이버 쪽 사실(직접 호출해 확인함):
 *  - 브랜드 조회 `GET /v1/product-brands?name=` 은 [{ id, name }] 만 준다. 토큰/접두 매칭이라
 *    "타임" 을 찾으면 타임존·타임즈…가 같이 오고, 없으면 404 NOT_FOUND 다. 단건 조회 경로는 없다.
 *  - 브랜드가 영문명으로 등록된 경우가 많다(샤넬 → CHANEL, 코스 → COS). 별칭은 res/brand-aliases.json.
 *  - 모델 조회 `GET /v1/product-models?name=` 은 brandCode 파라미터가 없다. 브랜드명으로 찾고
 *    brandCode 로 거른 것만 집계한다.
 *  - 호출을 몰아서 하면 429 GW.RATE_LIMIT 이 난다. 호출 간격을 두고 429 는 기다렸다 다시 부른다.
 *  - 커머스 API 는 등록된 IP(NAVER_SHOPPING_CONNECT_IP)에서만 받는다.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashSync } from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRANDS_FILE = path.join(ROOT, "res/korea_fashion_brands.json");
const ALIASES_FILE = path.join(ROOT, "res/brand-aliases.json");
const SNAPSHOT_FILE = path.join(ROOT, "res/brands-naver-snapshot.json");
const CLOTHING_FILE = path.join(ROOT, "res/clothing-categories.json");
const SECTIONS = ["fashion_brands_120", "accessories_and_shoes_72"];

/** 호출 사이 최소 간격. 이보다 촘촘하면 429 가 난다. */
const MIN_INTERVAL_MS = 550;
/** 브랜드당 받아볼 모델 페이지 수(페이지당 100건). */
const MODEL_PAGES = 3;
const MODEL_PAGE_SIZE = 100;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const DRY_RUN = flag("dry-run");
const FROM_SNAPSHOT = flag("from-snapshot");
const CLOTHING_ONLY = flag("clothing-only");
const ONLY = option("only")?.split(",").map((s) => s.trim()).filter(Boolean);

// ── env ────────────────────────────────────────────────────────────────────
// Next.js 처럼 .env.local 을 읽는다. 시크릿의 `$` 가 `\$` 로 이스케이프돼 있어 푼다.
function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2").replace(/\\\$/g, "$");
    }
  }
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 브랜드명 비교용: 대소문자 · 공백 · 구두점 차이를 없앤다. */
const norm = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s.'’`\-_/·]/g, "");

// ── 네이버 커머스 API ───────────────────────────────────────────────────────
class NaverCommerce {
  constructor({ baseUrl, clientId, clientSecret }) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.lastCallAt = 0;
    this.calls = 0;
  }

  async issueToken() {
    const timestamp = Date.now();
    const sign = Buffer.from(
      hashSync(`${this.clientId}_${timestamp}`, this.clientSecret),
      "utf-8"
    ).toString("base64");
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        timestamp: String(timestamp),
        client_secret_sign: sign,
        grant_type: "client_credentials",
        type: "SELF",
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`토큰 발급 실패 HTTP ${res.status}: ${text.slice(0, 300)}`);
    this.token = JSON.parse(text).access_token;
  }

  /** GET → { status, data }. 429 는 물러났다 재시도, 401 은 토큰을 새로 받아 한 번 더. */
  async get(pathname, params) {
    const url = new URL(`${this.baseUrl}${pathname}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, String(value));
    }
    if (!this.token) await this.issueToken();

    let refreshed = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const wait = this.lastCallAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastCallAt = Date.now();
      this.calls++;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
      const text = await res.text();

      if (res.status === 429) {
        await sleep(1000 * 2 ** Math.min(attempt, 4));
        continue;
      }
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        await this.issueToken();
        continue;
      }
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { status: res.status, data };
    }
    throw new Error(`계속 429 입니다: ${url}`);
  }

  /** 브랜드 검색. 없으면 404 NOT_FOUND 라서 빈 배열로 돌린다. */
  async searchBrands(name) {
    const { status, data } = await this.get("/v1/product-brands", { name });
    if (status === 404) return [];
    if (status !== 200 || !Array.isArray(data)) {
      throw new Error(`브랜드 조회 실패 [${name}] HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return data.filter((b) => b && b.id != null && typeof b.name === "string");
  }

  async searchModels(name, page) {
    const { status, data } = await this.get("/v1/product-models", {
      name,
      page,
      size: MODEL_PAGE_SIZE,
    });
    if (status === 404) return { contents: [], totalElements: 0, last: true };
    if (status !== 200 || !Array.isArray(data?.contents)) {
      throw new Error(`모델 조회 실패 [${name}] HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return data;
  }
}

// ── 원천 파일 ──────────────────────────────────────────────────────────────
/** 브랜드 파일 → 묶음 목록 + 브랜드별 소속 묶음 (등장 순서 유지, 중복 제거). */
function readSource() {
  const source = readJson(BRANDS_FILE);
  const groups = [];
  const brands = new Map();
  let groupOrder = 0;

  for (const section of SECTIONS) {
    const block = source[section];
    if (!block) continue;
    for (const [key, names] of Object.entries(block.categories ?? {})) {
      groups.push({
        section,
        section_description: block.description ?? null,
        key,
        label: key.replace(/_/g, " "),
        sort_order: groupOrder++,
      });
      names.forEach((raw, index) => {
        const displayName = raw.trim();
        if (!brands.has(displayName)) brands.set(displayName, { displayName, groups: [] });
        brands.get(displayName).groups.push({ section, key, sortOrder: index });
      });
    }
  }
  return { groups, brands: [...brands.values()] };
}

/** "왁(WAAC)" → ["왁(WAAC)", "왁", "WAAC"] + 별칭 파일. */
function queriesFor(displayName, aliases) {
  const terms = [displayName];
  const paren = displayName.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (paren) terms.push(paren[1], paren[2]);
  terms.push(...(aliases[displayName] ?? []));
  const seen = new Set();
  return terms.filter((t) => {
    const k = norm(t);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── 네이버 조회 ────────────────────────────────────────────────────────────
async function resolveBrand(naver, brand, aliasConfig) {
  const queries = queriesFor(brand.displayName, aliasConfig.aliases ?? {});
  // 괄호 표기는 괄호 앞 이름도 "원래 이름" 으로 친다(왁(WAAC) → 왁 은 exact).
  const ownNames = new Set(queries.slice(0, brand.displayName.includes("(") ? 3 : 1).map(norm));
  const pinnedId = aliasConfig.naverBrandId?.[brand.displayName];

  const candidates = new Map();
  let hit = null;

  for (const query of queries) {
    const list = await naver.searchBrands(query);
    for (const b of list.slice(0, 30)) {
      if (!candidates.has(b.id)) candidates.set(b.id, { id: b.id, name: b.name, query });
    }
    const found = pinnedId
      ? list.find((b) => String(b.id) === String(pinnedId))
      : list.find((b) => norm(b.name) === norm(query)) ??
        list.find((b) => ownNames.has(norm(b.name)));
    if (found) {
      hit = { brand: found, query };
      break;
    }
  }

  if (!hit && pinnedId) {
    // 이름 검색으로 안 걸리는 고정 id — id 만이라도 믿고 쓴다.
    hit = { brand: { id: Number(pinnedId), name: null }, query: null };
  }

  return {
    displayName: brand.displayName,
    aliases: queries.slice(1),
    groups: brand.groups,
    naverBrandId: hit ? Number(hit.brand.id) : null,
    naverBrandName: hit?.brand.name ?? null,
    matchStatus: !hit
      ? "unresolved"
      : pinnedId
        ? "manual"
        : ownNames.has(norm(hit.brand.name))
          ? "exact"
          : "alias",
    matchedQuery: hit?.query ?? null,
    candidates: [...candidates.values()].slice(0, 40),
  };
}

/**
 * 브랜드명으로 모델을 받아 brandCode 가 맞는 것만 집계한다.
 * 브랜드명이 흔한 단어면(갤럭시 → 휴대폰) catalogQueries 의 검색어들로 대신 찾는다.
 */
async function collectCatalog(naver, resolved, aliasConfig) {
  const empty = {
    catalog: { queryTotal: null, sampleSize: 0, modelCount: 0, query: null },
    manufacturers: [],
    categories: [],
    sampleModels: [],
  };
  if (!resolved.naverBrandId) return empty;

  const queries = aliasConfig.catalogQueries?.[resolved.displayName] ?? [
    resolved.naverBrandName ?? resolved.displayName,
  ];
  // 같은 brandCode 에 동명 상품이 섞인 브랜드(온 → 브로치, 혜인서 → 건강식품)는 카테고리 경로로 거른다.
  const prefixes = aliasConfig.categoryPrefixes?.[resolved.displayName];
  const inCategory = (m) =>
    !prefixes || prefixes.some((p) => (m.wholeCategoryName ?? "").startsWith(p));
  const models = [];
  const seenModel = new Set();
  let queryTotal = 0;
  let sampleSize = 0;

  for (const query of queries) {
    for (let page = 1; page <= MODEL_PAGES; page++) {
      const result = await naver.searchModels(query, page);
      if (page === 1) queryTotal += result.totalElements ?? 0;
      sampleSize += result.contents.length;
      for (const m of result.contents) {
        if (String(m.brandCode) !== String(resolved.naverBrandId) || seenModel.has(m.id)) continue;
        if (!inCategory(m)) continue;
        seenModel.add(m.id);
        models.push(m);
      }
      if (result.last || result.contents.length < MODEL_PAGE_SIZE) break;
    }
  }
  const query = queries.join(" | ");

  const manufacturers = new Map();
  const categories = new Map();
  for (const m of models) {
    if (m.manufacturerCode && m.manufacturerName) {
      const cur = manufacturers.get(m.manufacturerCode) ?? {
        code: m.manufacturerCode,
        name: m.manufacturerName,
        count: 0,
      };
      cur.count++;
      manufacturers.set(m.manufacturerCode, cur);
    }
    if (m.categoryId) {
      const cur = categories.get(m.categoryId) ?? {
        id: String(m.categoryId),
        wholeCategoryName: m.wholeCategoryName ?? "",
        count: 0,
      };
      cur.count++;
      categories.set(m.categoryId, cur);
    }
  }
  const byCount = (a, b) => b.count - a.count;

  return {
    catalog: { queryTotal, sampleSize, modelCount: models.length, query },
    manufacturers: [...manufacturers.values()].sort(byCount),
    categories: [...categories.values()].sort(byCount),
    sampleModels: models
      .slice(0, 5)
      .map((m) => ({ id: m.id, name: m.name, categoryId: String(m.categoryId ?? "") })),
  };
}

/** 옷 카테고리 id → 분류(top · bottom · etc). */
const clothingKindIndex = (config) =>
  new Map(
    Object.entries(config.kinds).flatMap(([kind, { categoryIds }]) =>
      categoryIds.map((id) => [String(id), kind])
    )
  );

/**
 * 브랜드 × 옷(상의·하의·기타) 카테고리.
 *
 * 브랜드명만으로 모델을 찾으면 주력 상품(나이키 → 신발, 구찌 → 가방)만 잡힌다.
 * 그래서 "브랜드명 + 옷 키워드" 로 여러 번 찾고 brandCode 와 옷 카테고리 id 로 거른다.
 * 개수는 키워드마다 받은 표본에서 센 값이라 전체 수가 아니다. 네이버 카탈로그의 분류 잡음
 * (나이키 청바지 같은)을 줄이려 minModelCount 미만 카테고리는 버린다.
 */
async function collectClothing(naver, row, config) {
  if (!row.naverBrandId) return null;
  const kindOf = clothingKindIndex(config);
  const keywords = [...new Set(Object.values(config.kinds).flatMap((kind) => kind.keywords))];
  // "왁(WAAC)" 은 괄호 앞 이름으로 찾는다. 한글명으로 하나도 안 걸리면 네이버 등록명(CHANEL …)으로 한 번 더.
  const names = [
    ...new Set([row.displayName.replace(/\s*\(.*\)\s*$/, ""), row.naverBrandName].filter(Boolean)),
  ];

  let best = null;
  for (const name of names) {
    const seen = new Set();
    const counts = new Map();
    let sampleSize = 0;
    for (const keyword of keywords) {
      for (let page = 1; page <= config.pagesPerKeyword; page++) {
        const result = await naver.searchModels(`${name} ${keyword}`, page);
        sampleSize += result.contents.length;
        for (const m of result.contents) {
          const categoryId = String(m.categoryId ?? "");
          if (String(m.brandCode) !== String(row.naverBrandId)) continue;
          if (seen.has(m.id) || !kindOf.has(categoryId)) continue;
          seen.add(m.id);
          const cur = counts.get(categoryId) ?? {
            id: categoryId,
            kind: kindOf.get(categoryId),
            wholeCategoryName: m.wholeCategoryName ?? "",
            count: 0,
          };
          cur.count++;
          counts.set(categoryId, cur);
        }
        if (result.last || result.contents.length < MODEL_PAGE_SIZE) break;
      }
    }
    const categories = [...counts.values()]
      .filter((c) => c.count >= config.minModelCount)
      .sort((a, b) => b.count - a.count);
    best = {
      query: name,
      sampleSize,
      rawModelCount: seen.size,
      modelCount: categories.reduce((sum, c) => sum + c.count, 0),
      categories,
    };
    if (best.rawModelCount > 0) break;
  }
  return best;
}

const clothingSummary = (clothing) => {
  if (!clothing) return "옷 -";
  const byKind = {};
  for (const c of clothing.categories) byKind[c.kind] = (byKind[c.kind] ?? 0) + c.count;
  const parts = Object.entries(byKind).map(([kind, count]) => `${kind} ${count}`);
  return `옷 ${clothing.modelCount} (${parts.join(" · ") || "없음"})`;
};

async function fetchFromNaver(source, previous, persist) {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("NAVER_COMMERCE_CLIENT_ID · NAVER_COMMERCE_CLIENT_SECRET 이 없습니다.");
  }
  const naver = new NaverCommerce({
    baseUrl:
      process.env.NAVER_COMMERCE_BASE_URL?.replace(/\/+$/, "") ||
      "https://api.commerce.naver.com/external",
    clientId,
    clientSecret,
  });
  const aliasConfig = readJson(ALIASES_FILE);
  const clothingConfig = readJson(CLOTHING_FILE);
  const prevByName = new Map((previous?.brands ?? []).map((b) => [b.displayName, b]));

  const out = [];
  const total = source.brands.length;
  for (const [index, brand] of source.brands.entries()) {
    const label = `[${String(index + 1).padStart(3)}/${total}] ${brand.displayName}`;
    const prev = prevByName.get(brand.displayName);
    if (ONLY && !ONLY.includes(brand.displayName) && prev) {
      // 소속 묶음은 원천 파일 기준으로 다시 맞춘다.
      out.push({ ...prev, groups: brand.groups });
      continue;
    }
    try {
      let row;
      if (CLOTHING_ONLY && prev) {
        // 브랜드 매칭 · 모델 집계는 스냅샷 그대로 두고 옷 카테고리만 다시 모은다.
        row = { ...prev, groups: brand.groups };
      } else {
        const resolved = await resolveBrand(naver, brand, aliasConfig);
        row = { ...resolved, ...(await collectCatalog(naver, resolved, aliasConfig)) };
      }
      row.clothing = await collectClothing(naver, row, clothingConfig);
      out.push(row);
      console.log(
        `${label} → ${row.naverBrandName ?? "?"} (${row.naverBrandId ?? "-"}) ${row.matchStatus}` +
          ` · 모델 ${row.catalog.modelCount}/${row.catalog.sampleSize}` +
          ` · ${clothingSummary(row.clothing)}`
      );
      // 오래 걸리므로 브랜드마다 스냅샷을 저장한다. 끊기면 --only 로 남은 브랜드만 이어서 돌린다.
      persist([
        ...out,
        ...source.brands
          .slice(index + 1)
          .map((b) => prevByName.get(b.displayName))
          .filter(Boolean),
      ]);
    } catch (error) {
      console.error(`${label} ✗ ${error.message}`);
      throw error;
    }
  }
  console.log(`\n네이버 호출 ${naver.calls}회`);
  return out;
}

// ── 같은 네이버 브랜드로 모인 표기 합치기 ──────────────────────────────────
// 예: "발렌티노가라바니" 가 별칭 "발렌티노" 로 찾아지면 발렌티노 한 행에 합친다.
function mergeByNaverId(rows) {
  const byId = new Map();
  const merged = [];
  for (const row of rows) {
    const existing = row.naverBrandId ? byId.get(row.naverBrandId) : null;
    if (!existing) {
      const copy = { ...row, aliases: [...row.aliases], groups: [...row.groups], mergedFrom: [] };
      if (row.naverBrandId) byId.set(row.naverBrandId, copy);
      merged.push(copy);
      continue;
    }
    existing.mergedFrom.push(row.displayName);
    for (const alias of [row.displayName, ...row.aliases]) {
      if (alias !== existing.displayName && !existing.aliases.includes(alias)) {
        existing.aliases.push(alias);
      }
    }
    for (const g of row.groups) {
      if (!existing.groups.some((e) => e.section === g.section && e.key === g.key)) {
        existing.groups.push(g);
      }
    }
  }
  return merged;
}

// ── Supabase 반영 ──────────────────────────────────────────────────────────
const chunk = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}${error.details ? ` (${error.details})` : ""}`);
  return data;
}

function latestCategoryFile() {
  const files = fs
    .readdirSync(path.join(ROOT, "res"))
    .filter((f) => /^naver-categories-.*\.json$/.test(f))
    .sort();
  return files.length ? path.join(ROOT, "res", files.at(-1)) : null;
}

async function writeToSupabase(snapshot) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 없습니다.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // head 요청은 본문이 없어 테이블이 없어도 error 가 비어 온다. 실제로 한 행을 읽어본다.
  const probe = await db.from("brands").select("id").limit(1);
  if (probe.error) {
    throw new Error(
      `brands 테이블을 읽을 수 없습니다(${probe.error.message}). ` +
        "supabase/migrations/0002_brands.sql 을 Supabase SQL Editor 에서 먼저 실행하세요."
    );
  }
  const clothingProbe = await db.from("brand_clothing_categories").select("brand_id").limit(1);
  if (clothingProbe.error) {
    throw new Error(
      `brand_clothing_categories 테이블을 읽을 수 없습니다(${clothingProbe.error.message}). ` +
        "supabase/migrations/0003_brand_clothing.sql 을 Supabase SQL Editor 에서 먼저 실행하세요."
    );
  }
  const queryProbe = await db.from("brands").select("clothing_query").limit(1);
  if (queryProbe.error) {
    throw new Error(
      `brands.clothing_query 를 읽을 수 없습니다(${queryProbe.error.message}). ` +
        "supabase/migrations/0004_clothing_etc.sql 을 Supabase SQL Editor 에서 먼저 실행하세요."
    );
  }

  const now = new Date().toISOString();
  const brands = mergeByNaverId(snapshot.brands);
  // 분류는 스냅샷에 적힌 값(예전 dress)이 아니라 지금 설정으로 다시 매긴다. 설정에서 빠진 카테고리는 버린다.
  const kindOf = clothingKindIndex(readJson(CLOTHING_FILE));
  const clothingOf = (b) =>
    (b.clothing?.categories ?? [])
      .map((c) => ({ ...c, kind: kindOf.get(String(c.id)) }))
      .filter((c) => c.kind);

  // 1) 카테고리 — 파일 전체 + 모델에서 처음 본 것
  const categoryRows = new Map();
  const categoryFile = latestCategoryFile();
  if (categoryFile) {
    for (const c of readJson(categoryFile)) {
      categoryRows.set(String(c.id), {
        id: String(c.id),
        name: c.name,
        whole_category_name: c.wholeCategoryName,
        last: c.last ?? true,
      });
    }
  }
  for (const b of brands) {
    for (const c of b.categories) {
      if (!categoryRows.has(c.id)) {
        categoryRows.set(c.id, {
          id: c.id,
          name: c.wholeCategoryName.split(">").at(-1) || c.id,
          whole_category_name: c.wholeCategoryName || c.id,
          last: true,
        });
      }
    }
  }
  for (const part of chunk([...categoryRows.values()], 500)) {
    await must(db.from("naver_categories").upsert(part, { onConflict: "id" }), "naver_categories upsert");
  }
  console.log(`naver_categories ${categoryRows.size}건 (${categoryFile ? path.basename(categoryFile) : "파일 없음"})`);

  // 2) 브랜드 묶음
  const groupRows = await must(
    db.from("brand_groups").upsert(snapshot.groups, { onConflict: "section,key" }).select("id, section, key"),
    "brand_groups upsert"
  );
  const groupId = new Map(groupRows.map((g) => [`${g.section}/${g.key}`, g.id]));
  console.log(`brand_groups ${groupRows.length}건`);

  // 3) 브랜드
  // 다시 돌릴 때 매칭이 바뀌어 naver_brand_id 가 다른 행으로 옮겨가면 unique 에 걸린다.
  // 이번에 쓸 id 를 가진 기존 행을 먼저 비워둔다.
  const incomingIds = brands.map((b) => b.naverBrandId).filter(Boolean);
  const names = brands.map((b) => b.displayName);
  const holders = await must(
    db.from("brands").select("id, display_name, naver_brand_id").in("naver_brand_id", incomingIds),
    "brands 조회"
  );
  const wanted = new Map(brands.map((b) => [b.displayName, b.naverBrandId]));
  const stale = holders.filter((h) => wanted.get(h.display_name) !== h.naver_brand_id).map((h) => h.id);
  if (stale.length) {
    await must(db.from("brands").update({ naver_brand_id: null }).in("id", stale), "brands naver_brand_id 비우기");
  }

  const brandRows = brands.map((b) => ({
    display_name: b.displayName,
    aliases: b.aliases,
    naver_brand_id: b.naverBrandId,
    naver_brand_name: b.naverBrandName,
    match_status: b.matchStatus,
    matched_query: b.matchedQuery,
    naver_candidates: b.candidates,
    catalog_query_total: b.catalog.queryTotal,
    catalog_sample_size: b.catalog.sampleSize,
    catalog_model_count: b.catalog.modelCount,
    manufacturers: b.manufacturers,
    category_roots: [...new Set(b.categories.map((c) => c.wholeCategoryName.split(">")[0]).filter(Boolean))],
    primary_category_id: b.categories[0]?.id ?? null,
    sample_models: b.sampleModels,
    clothing_kinds: [...new Set(clothingOf(b).map((c) => c.kind))],
    clothing_model_count: clothingOf(b).reduce((sum, c) => sum + c.count, 0),
    clothing_query: b.clothing?.query ?? null,
    clothing_synced_at: b.clothing ? (snapshot.generatedAt ?? now) : null,
    source: "res/korea_fashion_brands.json",
    synced_at: snapshot.generatedAt ?? now,
  }));
  const saved = [];
  for (const part of chunk(brandRows, 100)) {
    saved.push(
      ...(await must(
        db.from("brands").upsert(part, { onConflict: "display_name" }).select("id, display_name"),
        "brands upsert"
      ))
    );
  }
  const brandId = new Map(saved.map((b) => [b.display_name, b.id]));
  console.log(`brands ${saved.length}건`);

  // 합쳐진 표기가 예전에 따로 저장돼 있었다면 지운다.
  const mergedAway = brands.flatMap((b) => b.mergedFrom);
  if (mergedAway.length) {
    await must(db.from("brands").delete().in("display_name", mergedAway), "합쳐진 브랜드 정리");
  }

  // 4) 묶음 소속 — 이번 묶음들은 통째로 다시 쓴다.
  await must(
    db.from("brand_group_members").delete().in("group_id", [...groupId.values()]),
    "brand_group_members 정리"
  );
  const memberRows = [];
  const seenMember = new Set();
  for (const b of brands) {
    for (const g of b.groups) {
      const gid = groupId.get(`${g.section}/${g.key}`);
      const k = `${gid}/${brandId.get(b.displayName)}`;
      if (!gid || seenMember.has(k)) continue;
      seenMember.add(k);
      memberRows.push({ group_id: gid, brand_id: brandId.get(b.displayName), sort_order: g.sortOrder });
    }
  }
  for (const part of chunk(memberRows, 500)) {
    await must(db.from("brand_group_members").insert(part), "brand_group_members insert");
  }
  console.log(`brand_group_members ${memberRows.length}건`);

  // 5) 브랜드 × 카테고리
  const ids = names.map((n) => brandId.get(n)).filter(Boolean);
  for (const part of chunk(ids, 100)) {
    await must(db.from("brand_categories").delete().in("brand_id", part), "brand_categories 정리");
  }
  const bcRows = brands.flatMap((b) =>
    b.categories.map((c) => ({
      brand_id: brandId.get(b.displayName),
      category_id: c.id,
      model_count: c.count,
    }))
  );
  for (const part of chunk(bcRows, 500)) {
    await must(db.from("brand_categories").insert(part), "brand_categories insert");
  }
  console.log(`brand_categories ${bcRows.length}건`);

  // 6) 브랜드 × 옷 카테고리
  for (const part of chunk(ids, 100)) {
    await must(
      db.from("brand_clothing_categories").delete().in("brand_id", part),
      "brand_clothing_categories 정리"
    );
  }
  const clothingRows = brands.flatMap((b) =>
    clothingOf(b).map((c) => ({
      brand_id: brandId.get(b.displayName),
      category_id: c.id,
      clothing_kind: c.kind,
      model_count: c.count,
    }))
  );
  for (const part of chunk(clothingRows, 500)) {
    await must(db.from("brand_clothing_categories").insert(part), "brand_clothing_categories insert");
  }
  console.log(`brand_clothing_categories ${clothingRows.length}건`);
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();
  const source = readSource();
  const previous = fs.existsSync(SNAPSHOT_FILE) ? readJson(SNAPSHOT_FILE) : null;
  console.log(`원천: 브랜드 ${source.brands.length}개 · 묶음 ${source.groups.length}개`);

  let snapshot;
  if (FROM_SNAPSHOT) {
    if (!previous) throw new Error(`스냅샷이 없습니다: ${SNAPSHOT_FILE}`);
    snapshot = previous;
  } else {
    const generatedAt = new Date().toISOString();
    const persist = (brands) => {
      snapshot = { generatedAt, groups: source.groups, brands };
      // 수집 중에 --from-snapshot 이 같은 파일을 읽을 수 있다. 쓰다 만 JSON 을 읽지 않게 임시 파일에 쓰고 바꿔 끼운다.
      const tmp = `${SNAPSHOT_FILE}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(snapshot, null, 2)}\n`);
      fs.renameSync(tmp, SNAPSHOT_FILE);
    };
    persist(await fetchFromNaver(source, previous, persist));
    console.log(`스냅샷 저장: ${path.relative(ROOT, SNAPSHOT_FILE)}`);
  }

  const counts = snapshot.brands.reduce((acc, b) => ({ ...acc, [b.matchStatus]: (acc[b.matchStatus] ?? 0) + 1 }), {});
  console.log("매칭:", counts);
  const unresolved = snapshot.brands.filter((b) => b.matchStatus === "unresolved");
  if (unresolved.length) {
    console.log("못 찾은 브랜드:");
    for (const b of unresolved) {
      console.log(`  - ${b.displayName}: ${b.candidates.slice(0, 6).map((c) => `${c.name}(${c.id})`).join(", ") || "후보 없음"}`);
    }
  }

  if (DRY_RUN) {
    console.log("--dry-run: DB 에는 쓰지 않았습니다.");
    return;
  }
  await writeToSupabase(snapshot);
  console.log("완료");
}

main().catch((error) => {
  console.error(`\n실패: ${error.message}`);
  process.exit(1);
});
