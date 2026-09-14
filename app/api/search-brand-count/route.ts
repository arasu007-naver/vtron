import { NextRequest, NextResponse } from "next/server";
import { searchBrands, type ClothingBrand } from "@/lib/playground/clothing";
import { getAllClothingBrands } from "@/lib/playground/brands-service";
import { authenticate, unauthorized } from "@/lib/supabase/route";

/**
 * 브랜드 검색 결과 개수 조회 API (초성 및 브랜드명 검색 지원)
 *
 * `GET /api/search-brand-count?q=ㄴㅇㅋ`
 * `GET /api/search-brand-count?query=나이키`
 * `POST /api/search-brand-count` { "query": "ㄴㅇㅋ" }
 *
 * 응답: `{ query: string, count: number }`
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function parseQuery(req: NextRequest, bodyJson?: Record<string, unknown> | null): string {
  const url = req.nextUrl;
  const qParam =
    url.searchParams.get("q") ??
    url.searchParams.get("query") ??
    url.searchParams.get("term") ??
    url.searchParams.get("name") ??
    url.searchParams.get("chosung") ??
    (bodyJson?.q as string | undefined) ??
    (bodyJson?.query as string | undefined) ??
    (bodyJson?.term as string | undefined) ??
    (bodyJson?.name as string | undefined) ??
    (bodyJson?.chosung as string | undefined) ??
    "";

  return typeof qParam === "string" ? qParam.trim() : "";
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const query = parseQuery(req);
    const allBrands = await getAllClothingBrands();
    const matches: ClothingBrand[] = searchBrands(allBrands, query);

    return NextResponse.json(
      {
        query,
        count: matches.length,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        query: "",
        count: 0,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const query = parseQuery(req, body);
    const allBrands = await getAllClothingBrands();
    const matches: ClothingBrand[] = searchBrands(allBrands, query);

    return NextResponse.json(
      {
        query,
        count: matches.length,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        query: "",
        count: 0,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
