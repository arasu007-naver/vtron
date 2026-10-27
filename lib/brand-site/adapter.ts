import type { BrandSiteAdapter } from "@/lib/brand-site/types";

/**
 * `brands.api` 주소 모양으로 브랜드 사이트 검색 방식을 고른다. 서버(검색)와 화면(배지)이 같이 쓴다.
 *
 *   `/products.json`                         → shopify
 *   `uniqlo.com/kr/api/`                     → uniqlo
 *   `/product/list.html` · `/category/x/N/`   → cafe24
 *   그 밖                                     → none (링크만)
 */
export function pickAdapter(api: string | null): BrandSiteAdapter {
  if (!api) return "none";
  if (/\/products\.json(\?|$)/.test(api)) return "shopify";
  if (/uniqlo\.com\/kr\/api\//.test(api)) return "uniqlo";
  if (/\/product\/(bn-)?list\.html|\/category\/[^/]+\/\d+\/?$/.test(api)) return "cafe24";
  return "none";
}
