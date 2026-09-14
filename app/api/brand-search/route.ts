import { NextRequest, NextResponse } from "next/server";
import { searchBrands, type ClothingBrand } from "@/lib/playground/clothing";
import { getAllClothingBrands } from "@/lib/playground/brands-service";
import { authenticate, unauthorized } from "@/lib/supabase/route";

/**
 * 브랜드 검색 API (초성 검색 및 브랜드명/별칭/네이버 등록명 검색 지원)
 *
 * `GET /api/brand-search?q=ㄴㅇㅋ`
 * `GET /api/brand-search?query=나이키&limit=10`
 * `POST /api/brand-search` { "query": "ㄴㅇㅋ", "limit": 20 }
 *
 * 응답: `{ query: string, total: number, count: number, brands: ClothingBrand[] }`
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

function parseQueryAndLimit(req: NextRequest, bodyJson?: Record<string, unknown> | null): {
  query: string;
  limit: number | null;
} {
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

  const rawLimit =
    url.searchParams.get("limit") ??
    (bodyJson?.limit !== undefined ? String(bodyJson.limit) : null);
  const limitNum = rawLimit !== null ? Number(rawLimit) : null;
  const limit = limitNum && Number.isFinite(limitNum) && limitNum > 0 ? Math.trunc(limitNum) : null;

  return {
    query: typeof qParam === "string" ? qParam.trim() : "",
    limit,
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const { query, limit } = parseQueryAndLimit(req);
    const allBrands = await getAllClothingBrands();
    let matches: ClothingBrand[] = searchBrands(allBrands, query);

    const total = matches.length;
    if (limit !== null && limit > 0) {
      matches = matches.slice(0, limit);
    }

    return NextResponse.json(
      {
        query,
        total,
        count: matches.length,
        brands: matches,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        total: 0,
        count: 0,
        brands: [],
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
    const { query, limit } = parseQueryAndLimit(req, body);
    const allBrands = await getAllClothingBrands();
    let matches: ClothingBrand[] = searchBrands(allBrands, query);

    const total = matches.length;
    if (limit !== null && limit > 0) {
      matches = matches.slice(0, limit);
    }

    return NextResponse.json(
      {
        query,
        total,
        count: matches.length,
        brands: matches,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        total: 0,
        count: 0,
        brands: [],
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
