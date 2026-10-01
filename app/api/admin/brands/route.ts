import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import type { AdminBrandUpdate, BrandCommerceStatus } from "@/types/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMMERCE_STATUSES: BrandCommerceStatus[] = [
  "draft",
  "active",
  "paused",
  "archived",
];

const BRAND_COLUMNS =
  "id, display_name, aliases, slug, naver_brand_id, naver_brand_name, match_status, is_active, commerce_status, affiliate_ready, default_commission_rate_bps, default_platform_cut_bps, preferred_style_codes, website_url, contact_email, contact_name, commerce_notes, catalog_model_count, clothing_model_count, synced_at, created_at, updated_at";

/**
 * GET /api/admin/brands
 * 브랜드 목록 (ShopMy 제휴 필드 포함). q · commerceStatus · affiliateReady 필터.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const supabase = getAdminSupabase();
    const url = req.nextUrl;
    const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
    const rawPageSize = Math.trunc(Number(url.searchParams.get("pageSize") ?? "30")) || 30;
    const pageSize = Math.min(Math.max(1, rawPageSize), 100);
    const q = url.searchParams.get("q")?.trim() || "";
    const commerceStatus = url.searchParams.get("commerceStatus")?.trim() || "all";
    const affiliateReady = url.searchParams.get("affiliateReady")?.trim() || "all";

    let query = supabase
      .from("brands")
      .select(BRAND_COLUMNS, { count: "exact" })
      .order("display_name", { ascending: true });

    if (q) {
      query = query.or(
        `display_name.ilike.%${q}%,naver_brand_name.ilike.%${q}%,slug.ilike.%${q}%`
      );
    }
    if (
      commerceStatus !== "all" &&
      COMMERCE_STATUSES.includes(commerceStatus as BrandCommerceStatus)
    ) {
      query = query.eq("commerce_status", commerceStatus);
    }
    if (affiliateReady === "1" || affiliateReady === "true") {
      query = query.eq("affiliate_ready", true);
    } else if (affiliateReady === "0" || affiliateReady === "false") {
      query = query.eq("affiliate_ready", false);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error("admin brands fetch error:", error);
      return NextResponse.json(
        { error: error.message, brands: [], total: 0, page, pageSize, totalPages: 0 },
        { status: 500 }
      );
    }

    const total = count || 0;
    return NextResponse.json({
      brands: data || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("/api/admin/brands GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        brands: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/brands
 * ShopMy 제휴 메타 갱신 (slug · 상태 · 수수료 · 스타일 코드 등).
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as AdminBrandUpdate;
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if ("slug" in body) {
      const slug =
        body.slug === null || body.slug === undefined
          ? null
          : String(body.slug).trim().toLowerCase() || null;
      if (slug && !/^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/.test(slug)) {
        return NextResponse.json(
          { error: "slug 형식이 올바르지 않습니다. (소문자·숫자·하이픈)" },
          { status: 400 }
        );
      }
      patch.slug = slug;
    }
    if (
      body.commerce_status &&
      COMMERCE_STATUSES.includes(body.commerce_status)
    ) {
      patch.commerce_status = body.commerce_status;
    }
    if (typeof body.affiliate_ready === "boolean") {
      patch.affiliate_ready = body.affiliate_ready;
    }
    if ("default_commission_rate_bps" in body) {
      const v = body.default_commission_rate_bps;
      if (v !== null && v !== undefined) {
        const n = Math.trunc(Number(v));
        if (!Number.isFinite(n) || n < 0 || n > 10000) {
          return NextResponse.json(
            { error: "default_commission_rate_bps 는 0–10000 이어야 합니다." },
            { status: 400 }
          );
        }
        patch.default_commission_rate_bps = n;
      } else {
        patch.default_commission_rate_bps = null;
      }
    }
    if ("default_platform_cut_bps" in body && body.default_platform_cut_bps !== undefined) {
      const n = Math.trunc(Number(body.default_platform_cut_bps));
      if (!Number.isFinite(n) || n < 0 || n > 10000) {
        return NextResponse.json(
          { error: "default_platform_cut_bps 는 0–10000 이어야 합니다." },
          { status: 400 }
        );
      }
      patch.default_platform_cut_bps = n;
    }
    if (Array.isArray(body.preferred_style_codes)) {
      patch.preferred_style_codes = body.preferred_style_codes
        .map((c) => String(c).trim().toUpperCase())
        .filter(Boolean);
    }
    if ("website_url" in body) {
      patch.website_url = body.website_url?.trim() || null;
    }
    if ("contact_email" in body) {
      patch.contact_email = body.contact_email?.trim().toLowerCase() || null;
    }
    if ("contact_name" in body) {
      patch.contact_name = body.contact_name?.trim() || null;
    }
    if ("commerce_notes" in body) {
      patch.commerce_notes = body.commerce_notes?.trim() || null;
    }
    if (typeof body.is_active === "boolean") {
      patch.is_active = body.is_active;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("brands")
      .update(patch)
      .eq("id", id)
      .select(BRAND_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error("admin brands update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "브랜드를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ brand: data });
  } catch (error) {
    console.error("/api/admin/brands PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
