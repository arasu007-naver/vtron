import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { normalizeSearch } from "@/lib/hangul";
import { isCatalogKind } from "@/lib/tryon/product-catalog";
import { MIN_QUERY_LENGTH, SEARCH_PAGE, SEARCH_PAGE_MAX } from "@/lib/catalog-search/plan";
import { ProductSearchError, searchCatalogProducts } from "@/lib/catalog-search/search-server";

/**
 * 착장 상품 검색 v2 — 브랜드 · 상품명(초성 포함) · 품번을 검색 칸 하나로.
 *
 * `GET ?q=&brandId=&kind=&categoryId=&limit=&offset=&mode=`
 *   → `ProductSearchV2Response` (lib/catalog-search/plan.ts)
 *
 *  - `brandId` 는 선택이다. 없으면 `q` 가 정규화 뒤 2자 이상이어야 한다(아니면 400).
 *  - `brandId` · `kind` · `categoryId` 를 주면 그 안에서만 찾는다.
 *  - `mode=memory` 는 검색 컬럼을 건너뛰고 메모리에서 맞춘다(두 길의 결과를 견줘 볼 때).
 *
 * 설계: stmx-web `docs/product-search.md`. 기존 `/api/tryon/catalog/products` 는 그대로 둔다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toCount = (raw: string | null, fallback: number, max: number, min = 1) => {
  const n = Number(raw);
  return raw !== null && Number.isInteger(n) && n >= min ? Math.min(n, max) : fallback;
};

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";

  const brandId = params.get("brandId")?.trim() || undefined;
  if (brandId && !UUID.test(brandId)) return bad("brandId 는 uuid 여야 합니다.");
  if (!brandId && normalizeSearch(q).length < MIN_QUERY_LENGTH) {
    return bad(`brandId 가 없으면 q 는 ${MIN_QUERY_LENGTH}자 이상이어야 합니다.`);
  }

  const kind = params.get("kind")?.trim() || undefined;
  if (kind !== undefined && !isCatalogKind(kind)) return bad("kind 는 top · bottom · etc 중 하나여야 합니다.");

  const mode = params.get("mode") === "memory" ? "memory" : "auto";

  try {
    const result = await searchCatalogProducts({
      q,
      brandId,
      kind,
      categoryId: params.get("categoryId")?.trim() || undefined,
      limit: toCount(params.get("limit"), SEARCH_PAGE, SEARCH_PAGE_MAX),
      offset: toCount(params.get("offset"), 0, Number.MAX_SAFE_INTEGER, 0),
      mode,
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ProductSearchError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status });
  }
}
