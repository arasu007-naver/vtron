import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getAdminSupabase } from "@/lib/supabase/server";
import { NAVER_COMMERCE_BASE_URL, getNaverCredentials, issueNaverToken } from "@/lib/playground/naver";
import { buildCatalogLink } from "@/lib/playground/product-link";
import { pickAdapter } from "@/lib/brand-site/adapter";
import type { BrandApiStatus, BrandOption, NaverModel } from "@/lib/brand-site/types";

/**
 * `/product-details` 의 브랜드 · 상품 — 네이버 브랜드와 매칭된 브랜드 전부(161개)와 그 브랜드의
 * 네이버 카탈로그 모델.
 *
 * 내재화(`brand_catalog_models`)된 몇 브랜드만이 아니라 전부를 다루므로 상품은 네이버 커머스
 * `GET /v1/product-models?name=` 을 그때그때 부른다. 이 조회는 brandCode 파라미터가 없어
 * "브랜드명 + 검색어" 로 찾고 응답의 brandCode 로 이 브랜드 것만 남긴다
 * (scripts/lib/naver-commerce.mjs 에 적은 사실과 같다). 커머스 API 는 등록된 IP 에서만 받는다.
 *
 * `brands.api` · `api_status` 는 0016 이 채운다. 그 전 DB 면 res/brand-product-apis.json 으로 채운다.
 */

export class BrandLookupError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "BrandLookupError";
  }
}

// ── 브랜드 ──────────────────────────────────────────────────────────────────

interface BrandRow {
  id: string;
  display_name: string;
  naver_brand_name: string | null;
  naver_brand_id: number | null;
  aliases: string[] | null;
  clothing_query?: string | null;
  api?: string | null;
  api_status?: string | null;
  api_status_note?: string | null;
}

interface ApiFileRow {
  naverBrandId: number;
  api: string;
  status: BrandApiStatus;
  note: string;
}

let apiFile: Map<number, ApiFileRow> | null = null;

/** 마이그레이션 전 DB 를 위한 원천 파일. */
function apiFromFile(naverBrandId: number | null): ApiFileRow | null {
  if (naverBrandId == null) return null;
  if (!apiFile) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "res/brand-product-apis.json"), "utf8")
    ) as { brands: ApiFileRow[] };
    apiFile = new Map(raw.brands.map((b) => [Number(b.naverBrandId), b]));
  }
  return apiFile.get(Number(naverBrandId)) ?? null;
}

export interface BrandRecord extends BrandOption {
  /** 모델 검색에 쓴 브랜드 검색어(옷 동기화가 찾아 둔 것). 없으면 null. */
  clothingQuery: string | null;
}

const BASE_COLUMNS = "id, display_name, naver_brand_name, naver_brand_id, aliases";

function toRecord(row: BrandRow, withoutApi: boolean): BrandRecord {
  const file = withoutApi ? apiFromFile(row.naver_brand_id) : null;
  const api = (withoutApi ? file?.api : row.api) ?? null;
  return {
    id: row.id,
    naverBrandId: Number(row.naver_brand_id),
    displayName: row.display_name,
    naverBrandName: row.naver_brand_name,
    aliases: row.aliases ?? [],
    api,
    apiStatus: ((withoutApi ? file?.status : row.api_status) ?? null) as BrandApiStatus | null,
    apiStatusNote: (withoutApi ? file?.note : row.api_status_note) ?? null,
    adapter: pickAdapter(api),
    clothingQuery: row.clothing_query ?? null,
  };
}

/**
 * 브랜드 행을 읽는다 — `id` 를 주면 그 하나, 없으면 네이버 브랜드와 매칭된 전부.
 * 열이 없는 DB(0004 · 0016 전)에서도 읽도록 있는 열로 다시 고른다.
 */
async function selectBrands(id?: string): Promise<BrandRecord[]> {
  const db = getAdminSupabase();
  const tries = [
    { columns: `${BASE_COLUMNS}, clothing_query, api, api_status, api_status_note`, withoutApi: false },
    { columns: `${BASE_COLUMNS}, clothing_query`, withoutApi: true },
    { columns: BASE_COLUMNS, withoutApi: true },
  ];
  let lastError = "";
  for (const t of tries) {
    const base = db.from("brands").select(t.columns);
    const { data, error } = id ? await base.eq("id", id).limit(1) : await base.not("naver_brand_id", "is", null);
    if (!error) return ((data ?? []) as unknown as BrandRow[]).map((row) => toRecord(row, t.withoutApi));
    lastError = error.message;
  }
  throw new BrandLookupError(500, `브랜드 조회 실패: ${lastError}`);
}

/** 화면에 내려보내는 모양 — 서버만 쓰는 clothingQuery 를 뺀다. */
export const toOption = (r: BrandRecord): BrandOption => ({
  id: r.id,
  naverBrandId: r.naverBrandId,
  displayName: r.displayName,
  naverBrandName: r.naverBrandName,
  aliases: r.aliases,
  api: r.api,
  apiStatus: r.apiStatus,
  apiStatusNote: r.apiStatusNote,
  adapter: r.adapter,
});

/** 네이버 브랜드와 매칭된 브랜드 전부 — 이름순. */
export async function listBrands(): Promise<BrandOption[]> {
  const rows = await selectBrands();
  return rows
    .map(toOption)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

export async function getBrand(brandId: string): Promise<BrandRecord> {
  const rows = await selectBrands(brandId);
  const brand = rows[0];
  if (!brand) throw new BrandLookupError(404, "브랜드를 찾지 못했습니다.");
  if (!brand.naverBrandId) throw new BrandLookupError(400, "네이버 브랜드와 매칭되지 않은 브랜드입니다.");
  return brand;
}

// ── 네이버 카탈로그 모델 ──────────────────────────────────────────────────────

/** size 상한은 100 이다(500·1000 은 400). */
const MODEL_PAGE_SIZE = 100;
/** 호출 사이 최소 간격. 이보다 촘촘하면 429 가 난다. */
const MIN_INTERVAL_MS = 550;
/** 화면에 내려보내는 모델 수 */
const MAX_MODELS = 60;

let token: { value: string; expiresAt: number } | null = null;
let lastCallAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function accessToken(force = false): Promise<string> {
  if (!force && token && Date.now() < token.expiresAt) return token.value;
  const creds = getNaverCredentials();
  if (!creds) throw new BrandLookupError(500, "NAVER_COMMERCE_CLIENT_ID · NAVER_COMMERCE_CLIENT_SECRET 이 없습니다.");
  const issued = await issueNaverToken(creds);
  // 만료 1분 전에 새로 받는다
  token = { value: issued.accessToken, expiresAt: issued.issuedAt + (issued.expiresIn - 60) * 1000 };
  return token.value;
}

interface RawModel {
  id: number | string;
  name: string;
  brandCode?: number | string;
  categoryId?: string;
  wholeCategoryName?: string;
}

/** 모델 한 쪽. 429 는 물러났다 다시, 401 은 토큰을 새로 받아 한 번 더. */
async function fetchModels(name: string): Promise<RawModel[]> {
  const url = new URL(`${NAVER_COMMERCE_BASE_URL}/v1/product-models`);
  url.searchParams.set("name", name);
  url.searchParams.set("page", "1");
  url.searchParams.set("size", String(MODEL_PAGE_SIZE));

  let refreshed = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${await accessToken()}` },
      cache: "no-store",
    });
    if (res.status === 429) {
      await sleep(1000 * 2 ** Math.min(attempt, 3));
      continue;
    }
    if (res.status === 401 && !refreshed) {
      refreshed = true;
      await accessToken(true);
      continue;
    }
    if (res.status === 404) return [];
    const text = await res.text();
    if (!res.ok) throw new BrandLookupError(502, `네이버 모델 조회 실패 HTTP ${res.status}: ${text.slice(0, 200)}`);
    return (JSON.parse(text) as { contents?: RawModel[] }).contents ?? [];
  }
  throw new BrandLookupError(503, "네이버 커머스가 계속 429 를 돌려줍니다. 잠시 뒤 다시 찾으세요.");
}

/** 모델 검색에 넣을 브랜드 이름 — 앞의 것으로 하나도 안 걸리면 다음 것으로. */
function brandNames(brand: BrandRecord): string[] {
  return [
    ...new Set(
      [brand.clothingQuery, brand.displayName.replace(/\s*\(.*\)\s*$/, ""), brand.naverBrandName]
        .map((n) => n?.trim())
        .filter((n): n is string => Boolean(n))
    ),
  ];
}

/**
 * 브랜드의 카탈로그 모델. `q` 는 상품명 일부(예: "니트"). 비면 브랜드명만으로 찾는다.
 * 네이버 응답에서 이 브랜드(brandCode) 것만 남긴다.
 */
export async function searchBrandModels(brandId: string, q: string): Promise<{ brand: BrandOption; models: NaverModel[]; usedQuery: string | null }> {
  const record = await getBrand(brandId);
  const brand = toOption(record);
  const query = q.trim();

  for (const name of brandNames(record)) {
    const term = query ? `${name} ${query}` : name;
    const seen = new Set<string>();
    const models: NaverModel[] = [];
    for (const m of await fetchModels(term)) {
      const id = String(m.id);
      if (String(m.brandCode) !== String(record.naverBrandId) || seen.has(id)) continue;
      seen.add(id);
      models.push({
        id,
        name: m.name,
        categoryId: m.categoryId ?? "",
        wholeCategoryName: m.wholeCategoryName ?? "",
        catalogUrl: buildCatalogLink(id),
      });
      if (models.length >= MAX_MODELS) break;
    }
    if (models.length) return { brand, models, usedQuery: term };
  }
  return { brand, models: [], usedQuery: null };
}
