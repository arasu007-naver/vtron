import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { BrandLookupError } from "@/lib/brand-site/brands-server";
import { BrandSiteError, searchBrandSite } from "@/lib/brand-site/search-server";

/**
 * 고른 상품을 그 브랜드 공식 사이트(`brands.api`)에서 찾는다 — `/product-details` 오른쪽 칸.
 *
 * `GET ?brandId=&name=&q=`   brandId = brands.id, name = 고른 상품명
 *   → `BrandSiteSearchResponse` (lib/brand-site/types.ts)
 *
 * `q` 가 없으면 상품명에서 브랜드명을 뗀 검색어로 찾고, 못 찾으면 붙인 품번 · 낱말 하나씩으로 다시 찾는다.
 * `q` 를 주면 그 검색어로 한 번만 찾는다. 사이트가 막혀 있거나 검색을 못 하는 사이트면 200 에
 * `items: []` 와 `note` 로 이유를 준다(화면은 링크를 띄운다).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const params = req.nextUrl.searchParams;
  const brandId = params.get("brandId")?.trim();
  const name = params.get("name")?.trim();
  if (!brandId || !name) return NextResponse.json({ error: "brandId 와 name 이 필요합니다." }, { status: 400 });

  try {
    return NextResponse.json(await searchBrandSite(brandId, name, params.get("q") ?? undefined));
  } catch (error) {
    const status =
      error instanceof BrandSiteError || error instanceof BrandLookupError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
