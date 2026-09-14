import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { getStmxWebAdminCredentials } from "@/lib/playground/stmx-loox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getAdminClient = () => {
  const creds = getStmxWebAdminCredentials();
  const url = creds?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STMX_WEB_SUPABASE_URL;
  const key =
    creds?.key ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STMX_WEB_SUPABASE_SECRET_KEY;

  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/**
 * GET /api/creator-req
 * user_biz_request 목록 페이지네이션 및 각 항목별 user_favorite_brands / profiles 데이터 조회
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase 관리자 자격 증명이 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  try {
    const url = req.nextUrl;
    const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
    const rawPageSize = Math.trunc(Number(url.searchParams.get("pageSize") ?? "10")) || 10;
    const pageSize = Math.min(Math.max(1, rawPageSize), 100);
    const status = url.searchParams.get("status")?.trim() || "all";
    const code = url.searchParams.get("code")?.trim() || "all";

    // 1. user_biz_request 목록 조회
    let query = client
      .from("user_biz_request")
      .select("id, user_id, code, reason, status, etc, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (code && code !== "all") {
      query = query.eq("code", code);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: requests, count, error: reqError } = await query.range(from, to);

    if (reqError) {
      console.error("user_biz_request fetch error:", reqError);
      return NextResponse.json(
        { error: reqError.message, requests: [], total: 0, page, pageSize, totalPages: 0 },
        { status: 500 }
      );
    }

    const safeRequests = requests || [];
    const userIds = Array.from(new Set(safeRequests.map((r) => r.user_id).filter(Boolean)));

    // 2. user_favorite_brands 조회
    const favMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: favRows, error: favError } = await client
        .from("user_favorite_brands")
        .select("user_id, brands, etc, created_at, updated_at")
        .in("user_id", userIds);

      if (!favError && favRows) {
        for (const row of favRows) {
          let parsedBrands: any[] = [];
          if (typeof row.brands === "string") {
            try {
              parsedBrands = JSON.parse(row.brands);
            } catch {
              parsedBrands = [];
            }
          } else if (Array.isArray(row.brands)) {
            parsedBrands = row.brands;
          }

          favMap.set(row.user_id, {
            brands: parsedBrands,
            rawBrands: row.brands,
            etc: row.etc,
            updatedAt: row.updated_at,
          });
        }
      }
    }

    // 3. profiles 조회 (닉네임, 스타일 코드 등)
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profileRows, error: profError } = await client
        .from("profiles")
        .select("id, nickname, style_code, gender, ages, avatar_url, updated_at")
        .in("id", userIds);

      if (!profError && profileRows) {
        for (const p of profileRows) {
          profileMap.set(p.id, p);
        }
      }
    }

    // 4. 결과 합성
    const items = safeRequests.map((r) => {
      const userFav = favMap.get(r.user_id) || { brands: [], rawBrands: "", etc: null };
      const profile = profileMap.get(r.user_id) || null;

      return {
        ...r,
        profile,
        favoriteBrands: userFav.brands,
        favoriteBrandsCount: userFav.brands.length,
        favoriteBrandsUpdatedAt: userFav.updatedAt || null,
      };
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      requests: items,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("/api/creator-req GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error), requests: [], total: 0 },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/creator-req
 * user_biz_request 상태 업데이트 (pending, approved, rejected 등)
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase 관리자 자격 증명이 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, status } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "status가 필요합니다." }, { status: 400 });
    }

    const { data, error } = await client
      .from("user_biz_request")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (error) {
    console.error("/api/creator-req PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
