import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { BrandLookupError, listBrands } from "@/lib/brand-site/brands-server";

/**
 * `/product-details` 의 브랜드 목록 — 네이버 브랜드와 매칭된 브랜드 전부(내재화 여부와 무관).
 *
 * `GET` → `{ brands: BrandOption[] }` (이름순, api · 확인 상태 · 검색 방식 포함)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    return NextResponse.json({ brands: await listBrands() });
  } catch (error) {
    const status = error instanceof BrandLookupError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status });
  }
}
