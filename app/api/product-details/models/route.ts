import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { BrandLookupError, searchBrandModels } from "@/lib/brand-site/brands-server";

/**
 * 브랜드 하나의 네이버 카탈로그 모델 — `/product-details` 왼쪽 상품 목록.
 *
 * `GET ?brandId=&q=` → `BrandModelsResponse`
 *
 * 네이버 커머스 `/v1/product-models?name={브랜드명} {q}` 를 부르고 brandCode 로 이 브랜드 것만
 * 남긴다. 내재화하지 않은 브랜드도 찾는다. 커머스 API 는 등록된 IP 에서만 받는다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const params = req.nextUrl.searchParams;
  const brandId = params.get("brandId")?.trim();
  if (!brandId) return NextResponse.json({ error: "brandId 가 필요합니다." }, { status: 400 });

  try {
    return NextResponse.json(await searchBrandModels(brandId, params.get("q") ?? ""));
  } catch (error) {
    const status = error instanceof BrandLookupError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status });
  }
}
