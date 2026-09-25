import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { CATALOG_PRODUCT_PAGE, isCatalogKind } from "@/lib/tryon/product-catalog";
import { getCatalogProducts } from "@/lib/tryon/product-catalog-server";

/**
 * 고른 브랜드 · 카테고리의 상품 한 쪽(page).
 *
 * `GET ?brandId=&kind=&categoryId=&q=&limit=&offset=`
 *   → `{ products: CatalogProduct[], total }`
 *
 * 한 분류에 900건까지 가므로 좁히는 일은 서버가 한다(브랜드 · 카테고리와 갈리는 점이다).
 * `q` 는 상품명 부분 일치라 초성은 걸리지 않는다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 한 번에 내려보낼 수 있는 상한. 사진 주소가 두 줄씩 붙어 응답이 무거워진다. */
const MAX_LIMIT = 100;

const toCount = (raw: string | null, fallback: number, max: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const params = req.nextUrl.searchParams;
  const brandId = params.get("brandId")?.trim();
  if (!brandId) return NextResponse.json({ error: "brandId 가 필요합니다." }, { status: 400 });

  const kind = params.get("kind");
  if (kind !== null && !isCatalogKind(kind)) {
    return NextResponse.json(
      { error: "kind 는 top · bottom · etc 중 하나여야 합니다." },
      { status: 400 }
    );
  }

  const offsetRaw = Number(params.get("offset"));
  try {
    const page = await getCatalogProducts({
      brandId,
      kind: kind ?? undefined,
      categoryId: params.get("categoryId")?.trim() || undefined,
      q: params.get("q")?.trim() || undefined,
      limit: toCount(params.get("limit"), CATALOG_PRODUCT_PAGE, MAX_LIMIT),
      offset: Number.isInteger(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0,
    });
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
