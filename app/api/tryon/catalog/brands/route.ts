import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { getCatalogBrands } from "@/lib/tryon/product-catalog-server";

/**
 * 피팅 화면에서 고를 브랜드 — 내재화된 것만.
 *
 * `GET` → `{ brands: CatalogBrand[] }` (가나다순)
 *
 * `/api/playground/brands` 와 다르다. 저쪽은 상품링크에서 **앞으로 내재화할** 옷 브랜드
 * 200건 안팎이고, 이쪽은 `brand_catalog_kinds` 에 행이 있는 — 이미 내재화가 끝나 상품까지
 * 바로 고를 수 있는 브랜드다. 피팅 화면은 즉시 상품이 나와야 하므로 이쪽을 쓴다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    return NextResponse.json({ brands: await getCatalogBrands() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
