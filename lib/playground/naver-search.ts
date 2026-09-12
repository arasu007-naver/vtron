import "server-only";

/**
 * 네이버 검색 오픈 API — 쇼핑 검색(`/v1/search/shop.json`).
 *
 * 커머스 API 의 카탈로그 모델에는 이미지가 없다(이름·브랜드·카테고리뿐). 그리고
 * search.shopping.naver.com 의 카탈로그 페이지는 서버에서 가져오면 418 로 막힌다.
 * 상품 이미지를 공식적으로 받을 수 있는 곳은 이 검색 API 뿐이다.
 *
 * 커머스 API 와는 **별개의 애플리케이션**이다. developers.naver.com 에서 '검색' API 를
 * 쓰는 애플리케이션을 등록하고 받은 Client ID/Secret 을 넣는다.
 */

export const NAVER_SEARCH_SHOP_URL = "https://openapi.naver.com/v1/search/shop.json";

/** display 상한은 100 이다. */
export const SHOP_SEARCH_MAX = 100;

export interface NaverSearchCredentials {
  clientId: string;
  clientSecret: string;
}

export function getNaverSearchCredentials(): NaverSearchCredentials | null {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export interface ShopItem {
  /** `<b>` 강조 태그를 걷어낸 제목 */
  title: string;
  link: string;
  image: string;
  lprice: string;
  mallName: string;
  /** 카탈로그 상품이면 카탈로그(모델) id 와 같다. */
  productId: string;
  /** 1 = 일반상품 · 가격비교 상품(카탈로그) */
  productType: string;
}

const stripTags = (value: string) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export class NaverSearchError extends Error {
  constructor(
    readonly status: number,
    readonly body: string
  ) {
    super(`네이버 쇼핑 검색 실패 (HTTP ${status})`);
    this.name = "NaverSearchError";
  }
}

export async function searchShopping(
  { clientId, clientSecret }: NaverSearchCredentials,
  query: string,
  display = SHOP_SEARCH_MAX
): Promise<ShopItem[]> {
  const url = new URL(NAVER_SEARCH_SHOP_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(Math.min(Math.max(display, 1), SHOP_SEARCH_MAX)));
  url.searchParams.set("sort", "sim");

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new NaverSearchError(res.status, text);

  const data = JSON.parse(text) as { items?: Partial<ShopItem>[] };
  return (data.items ?? []).map((item) => ({
    title: stripTags(item.title ?? ""),
    link: item.link ?? "",
    image: item.image ?? "",
    lprice: item.lprice ?? "",
    mallName: item.mallName ?? "",
    productId: String(item.productId ?? ""),
    productType: String(item.productType ?? ""),
  }));
}
