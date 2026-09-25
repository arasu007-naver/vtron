import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { getCatalogCategories } from "@/lib/tryon/product-catalog-server";

/**
 * 한 브랜드의 최하위 카테고리 전부 — 세 분류(상의 · 하의 · 기타)를 통틀어 한 번에.
 *
 * `GET ?brandId=<uuid>` → `{ categories: CatalogCategory[] }` (상품 많은 순)
 *
 * 브랜드당 40개 안팎이라 통째로 내려보낸다. 좁히는 것은 브라우저가 초성까지 봐서 한다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const brandId = req.nextUrl.searchParams.get("brandId")?.trim();
  if (!brandId) return NextResponse.json({ error: "brandId 가 필요합니다." }, { status: 400 });

  try {
    return NextResponse.json({ categories: await getCatalogCategories(brandId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
