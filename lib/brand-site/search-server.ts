import "server-only";
import { getBrand, toOption } from "@/lib/brand-site/brands-server";
import { pickAdapter } from "@/lib/brand-site/adapter";
import type { BrandSiteAdapter, BrandSiteItem, BrandSiteSearchResponse } from "@/lib/brand-site/types";

/**
 * 브랜드 공식 사이트에서 상품 찾기 — 고른 상품의 브랜드 `brands.api` 로 그 브랜드 사이트를 검색한다.
 * 브랜드 · api 는 [[getBrand]] 가 읽는다(0016 전 DB 면 res/brand-product-apis.json).
 *
 * 사이트 쪽 사실(직접 불러 확인함):
 *  - Shopify 의 `/search/suggest.json` 은 한국 스토어에서 417 "Unsupported buyer locale" 이다.
 *    그래서 `/products.json` 을 몇 쪽 받아 여기서 이름으로 거른다.
 *  - Cafe24 의 `/product/search.html?keyword=` 는 로그인 없이 200 이고, 상품 칸이
 *    `<li id="anchorBoxId_{상품번호}">` 로 온다. 스킨마다 안쪽 모양이 조금씩 달라 넉넉히 읽는다.
 *  - 유니클로 `/kr/api/commerce/v5/ko/products?q=` 는 JSON 으로 검색 결과를 준다.
 *  - 명품 · 대형 브랜드 사이트 대부분은 서버 호출을 403 · 429 로 막는다. 그런 곳은 검색하지 않고
 *    링크만 준다(adapter "none").
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 12_000;
/** 화면에 내려보내는 결과 수 */
const MAX_ITEMS = 24;
/** Shopify products.json 을 받는 쪽 수(쪽당 250개). */
const SHOPIFY_PAGES = 4;
const SHOPIFY_CACHE_MS = 10 * 60_000;
/** 첫 검색어로 못 찾았을 때 낱말 하나씩 다시 찾는 횟수 */
const MAX_RETRY_TOKENS = 3;

export class BrandSiteError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "BrandSiteError";
  }
}

// ── 검색어 ──────────────────────────────────────────────────────────────────

const normalize = (value: string) => value.normalize("NFKC").toLowerCase();

/** 상품명에서 브랜드 이름을 떼어 검색어를 만든다. 사이트 안에서 찾으니 브랜드명은 군더더기다. */
export function queryFromName(name: string, brandNames: string[]): string {
  const drop = new Set(brandNames.filter(Boolean).map((n) => normalize(n).replace(/\s+/g, "")));
  return name
    .replace(/[()[\]{}·,/]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !drop.has(normalize(token)))
    .join(" ")
    .trim();
}

const tokensOf = (query: string) =>
  normalize(query)
    .split(/\s+/)
    .filter((t) => t.length >= 2);

/**
 * 품번 조각을 붙인 것. 네이버 상품명은 "19292 0004" 처럼 띄어 쓰지만 사이트 SKU · 주소는
 * "192920004" 처럼 붙여 쓴다. 숫자가 든 조각이 둘 이상일 때만 만든다.
 */
function joinedCode(query: string): string {
  const parts = query.split(/\s+/).filter((t) => /\d/.test(t) && /^[\w-]+$/.test(t));
  return parts.length >= 2 ? parts.join("").replace(/-/g, "") : "";
}

/** 처음 검색어 → 붙인 품번 → 긴 낱말부터 하나씩. 같은 것은 한 번만. */
function attempts(query: string): string[] {
  const list = [
    query,
    joinedCode(query),
    // 네 자리 이하 숫자("0004")는 SKU 곳곳에 걸려 아무 상품이나 나오니 낱말로 다시 찾지 않는다
    ...tokensOf(query)
      .filter((t) => !/^\d{1,4}$/.test(t))
      .sort((a, b) => b.length - a.length)
      .slice(0, MAX_RETRY_TOKENS),
  ];
  return [...new Set(list.map((q) => q.trim()).filter(Boolean))];
}

// ── 어댑터 ──────────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  return { status: res.status, text: await res.text() };
}

const absolute = (href: string, origin: string) => {
  if (href.startsWith("//")) return `https:${href}`;
  try {
    return new URL(href, origin).toString();
  } catch {
    return href;
  }
};

const decodeEntities = (value: string) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Shopify ------------------------------------------------------------------

interface ShopifyProduct {
  title: string;
  handle: string;
  product_type?: string;
  tags?: string[] | string;
  images?: { src: string }[];
  variants?: { price?: string; sku?: string | null }[];
}

const shopifyCache = new Map<string, { at: number; products: ShopifyProduct[] }>();

async function shopifyProducts(origin: string): Promise<ShopifyProduct[]> {
  const cached = shopifyCache.get(origin);
  if (cached && Date.now() - cached.at < SHOPIFY_CACHE_MS) return cached.products;

  const products: ShopifyProduct[] = [];
  for (let page = 1; page <= SHOPIFY_PAGES; page++) {
    const { status, text } = await fetchText(`${origin}/products.json?limit=250&page=${page}`);
    if (status !== 200) {
      if (page === 1) throw new BrandSiteError(502, `브랜드 사이트가 HTTP ${status} 를 돌려줬습니다.`);
      break;
    }
    const batch = (JSON.parse(text) as { products?: ShopifyProduct[] }).products ?? [];
    products.push(...batch);
    if (batch.length < 250) break;
  }
  shopifyCache.set(origin, { at: Date.now(), products });
  return products;
}

function searchShopify(products: ShopifyProduct[], query: string, origin: string): BrandSiteItem[] {
  const tokens = tokensOf(query);
  if (!tokens.length) return [];
  return products
    .map((p) => {
      const tags = Array.isArray(p.tags) ? p.tags.join(" ") : (p.tags ?? "");
      // 주소(handle) · SKU 에 품번이 들어 있다 — 붙인 꼴과 하이픈 뺀 꼴을 다 넣는다
      const skus = (p.variants ?? []).map((v) => v.sku ?? "").join(" ");
      const hay = normalize(
        `${p.title} ${p.product_type ?? ""} ${tags} ${p.handle.replace(/-/g, " ")} ${p.handle.replace(/-/g, "")} ${skus}`
      );
      const score = tokens.filter((t) => hay.includes(t)).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    // 낱말을 다 맞춘 것만 결과로 친다 — 하나만 맞은 것을 섞으면 "셔츠" 로 셔츠 전부가 나온다
    .filter((x) => x.score === tokens.length)
    .slice(0, MAX_ITEMS)
    .map(({ p }) => ({
      title: p.title,
      url: `${origin}/products/${p.handle}`,
      image: p.images?.[0]?.src ?? null,
      price: p.variants?.[0]?.price ?? null,
    }));
}

// Cafe24 -------------------------------------------------------------------

/** 상품 칸 안의 아이콘 그림(관심상품 · 품절 · SALE …)의 alt 는 이름이 아니다. */
const ICON_ALT = /관심상품|장바구니|옵션|품절|sold\s*out|sale|new|best|icon|아이콘|미리보기|확대/i;

/** 상품 링크 — `/product/detail.html?product_no=123` 또는 `/product/{이름}/123/…`. 메뉴의 `/collection.html?product_no=` 는 뺀다. */
const PRODUCT_LINK = /href="([^"]*\/product\/(?:[^"]*[?&]product_no=(\d+)|[^"/?]+\/(\d+)\/)[^"]*)"/g;

/** 칸 안에서 사람이 읽는 이름. `name` 칸의 글을 먼저, 없으면 상품 사진의 alt. */
function cafe24Title(body: string): string {
  const nameHtml = body.match(/class="[^"]*\b(?:name|product_name|prd_name)\b[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|strong|li)>/)?.[1];
  if (nameHtml) {
    // "상품명 :" 처럼 숨긴 머리글을 뗀다
    const text = decodeEntities(nameHtml.replace(/<span[^>]*displaynone[^>]*>[\s\S]*?<\/span>/g, "")).replace(/^[^:]{0,8}:\s*/, "");
    if (text) return text;
  }
  for (const m of body.matchAll(/<img[^>]+alt="([^"]+)"/g)) {
    const alt = decodeEntities(m[1]);
    if (alt && !ICON_ALT.test(alt)) return alt.replace(/\s*제품\s*이미지$/, "");
  }
  return "";
}

/**
 * Cafe24 검색 결과 HTML 의 상품 칸.
 *
 * 스킨 대부분은 칸을 `<li id="anchorBoxId_{번호}">` 로 감싸지만, 그렇지 않은 스킨도 있다(글로니 ·
 * 우영미). 그래서 상품 번호가 든 링크가 처음 나오는 자리를 칸의 시작으로 보고, 다음 상품의 첫 링크
 * 직전까지를 그 칸으로 읽는다. 사진 링크가 이름 링크보다 앞에 오므로 칸 안에 사진이 들어온다.
 */
function parseCafe24(html: string, origin: string): BrandSiteItem[] {
  // 검색 결과 영역이 표시돼 있으면 그 안만 본다(머리 · 추천 영역의 상품을 빼려고)
  const resultAt = html.search(/xans-search-result|anchorBoxId_/);
  const scope = resultAt > 0 ? html.slice(Math.max(0, resultAt - 200)) : html;

  const firsts: { no: string; at: number; href: string }[] = [];
  const seen = new Set<string>();
  for (const m of scope.matchAll(PRODUCT_LINK)) {
    const no = m[2] ?? m[3];
    if (!no || seen.has(no)) continue;
    seen.add(no);
    firsts.push({ no, at: m.index ?? 0, href: m[1] });
  }

  const items: BrandSiteItem[] = [];
  for (const [i, { at, href }] of firsts.entries()) {
    const body = scope.slice(at, Math.min(firsts[i + 1]?.at ?? scope.length, at + 6000));
    const title = cafe24Title(body);
    if (!title) continue;
    const img =
      body.match(/(?:ec-data-src|data-src|data-original)="([^"]+)"/)?.[1] ??
      body.match(/<img[^>]+src="([^"]*\/(?:web\/product|ec\d+)\/[^"]+)"/)?.[1] ??
      null;
    const price =
      body.match(/class="[^"]*product-price[^"]*"[^>]*>([^<]+)</)?.[1] ??
      body.match(/rel="판매가"[\s\S]*?>\s*([\d,]{3,}\s*원?)\s*</)?.[1] ??
      body.match(/([\d,]{3,}\s*원)/)?.[1] ??
      null;
    items.push({
      title,
      url: absolute(decodeEntities(href), origin),
      image: img ? absolute(img, origin) : null,
      price: price ? decodeEntities(price) : null,
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

async function searchCafe24(origin: string, query: string): Promise<BrandSiteItem[]> {
  const { status, text } = await fetchText(`${origin}/product/search.html?keyword=${encodeURIComponent(query)}`);
  if (status !== 200) throw new BrandSiteError(502, `브랜드 사이트가 HTTP ${status} 를 돌려줬습니다.`);
  return parseCafe24(text, origin);
}

// Uniqlo -------------------------------------------------------------------

interface UniqloItem {
  name: string;
  productId: string;
  prices?: { base?: { value?: number }; promo?: { value?: number } | null };
  images?: { main?: Record<string, { image?: string }> };
}

async function searchUniqlo(query: string): Promise<BrandSiteItem[]> {
  const url = `https://www.uniqlo.com/kr/api/commerce/v5/ko/products?q=${encodeURIComponent(query)}&limit=${MAX_ITEMS}`;
  const { status, text } = await fetchText(url);
  if (status !== 200) throw new BrandSiteError(502, `유니클로 API 가 HTTP ${status} 를 돌려줬습니다.`);
  const items = (JSON.parse(text) as { result?: { items?: UniqloItem[] } }).result?.items ?? [];
  return items.map((it) => {
    const value = it.prices?.promo?.value ?? it.prices?.base?.value;
    return {
      title: it.name,
      url: `https://www.uniqlo.com/kr/ko/products/${it.productId}`,
      image: Object.values(it.images?.main ?? {})[0]?.image ?? null,
      price: value != null ? `${value.toLocaleString("ko-KR")}원` : null,
    };
  });
}

// ── 진입점 ──────────────────────────────────────────────────────────────────

function searchPageUrl(adapter: BrandSiteAdapter, origin: string | null, query: string): string | null {
  const q = encodeURIComponent(query);
  if (adapter === "shopify" && origin) return `${origin}/search?q=${q}&type=product`;
  if (adapter === "cafe24" && origin) return `${origin}/product/search.html?keyword=${q}`;
  if (adapter === "uniqlo") return `https://www.uniqlo.com/kr/ko/search?q=${q}`;
  return null;
}

/**
 * 고른 상품 하나를 그 브랜드 사이트에서 찾는다.
 * `query` 를 주지 않으면 상품명(`productName`)에서 브랜드명을 뗀 것으로 찾는다.
 */
export async function searchBrandSite(
  brandId: string,
  productName: string,
  query?: string
): Promise<BrandSiteSearchResponse> {
  const { aliases, ...brand } = toOption(await getBrand(brandId));

  const q =
    (query ?? "").trim() ||
    queryFromName(productName, [brand.displayName, brand.naverBrandName ?? "", ...aliases]) ||
    productName;
  const adapter = pickAdapter(brand.api);
  let origin: string | null = null;
  try {
    origin = brand.api ? new URL(brand.api).origin : null;
  } catch {
    origin = null;
  }

  const base: BrandSiteSearchResponse = {
    brand,
    adapter,
    query: q,
    usedQuery: null,
    items: [],
    searchPageUrl: searchPageUrl(adapter, origin, q),
    note: null,
  };

  if (!brand.api) return { ...base, note: "이 브랜드에는 공식 사이트 주소(brands.api)가 없습니다." };
  if (adapter === "none" || !origin) {
    return {
      ...base,
      note: "이 브랜드 사이트는 자동 검색을 지원하지 않습니다(봇 차단 · 그룹몰 · 검색 API 없음). 브랜드 상품 페이지를 직접 여세요.",
    };
  }

  try {
    const shopify = adapter === "shopify" ? await shopifyProducts(origin) : null;
    // 처음 검색어 → 품번 → 낱말 하나씩. 결과가 나온 첫 검색어에서 멈춘다.
    for (const attempt of query?.trim() ? [q] : attempts(q)) {
      const items =
        adapter === "shopify"
          ? searchShopify(shopify ?? [], attempt, origin)
          : adapter === "cafe24"
            ? await searchCafe24(origin, attempt)
            : await searchUniqlo(attempt);
      if (items.length) {
        return { ...base, usedQuery: attempt, items, searchPageUrl: searchPageUrl(adapter, origin, attempt) };
      }
    }
    return { ...base, note: "브랜드 사이트에서 맞는 상품을 찾지 못했습니다. 검색어를 바꿔 보세요." };
  } catch (error) {
    const message =
      error instanceof BrandSiteError
        ? error.message
        : error instanceof Error && error.name === "TimeoutError"
          ? "브랜드 사이트가 제때 응답하지 않았습니다."
          : `브랜드 사이트 검색 실패: ${error instanceof Error ? error.message : String(error)}`;
    return { ...base, note: message };
  }
}
