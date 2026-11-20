import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { AliasSuggestError, suggestBrandAliases } from "@/lib/brand-site/alias-suggest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 웹 검색을 몇 번 하므로 30초~1분쯤 걸린다. */
export const maxDuration = 300;

/**
 * POST /api/admin/brands/aliases  { id }
 * → { suggestions: [{ alias, reason, source, evidence }], sources: [{ title, url }], droppedCount, model }
 *
 * 브랜드 별칭을 웹 검색으로 찾아 **제안**한다. 검색 결과에 근거가 있는 것만 돌려준다. 저장하지 않는다 — `/admin/brands` 편집 칸에서
 * 사람이 고른 뒤 `PATCH /api/admin/brands { id, aliases }` 로 저장한다.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });
  }

  const { data: brand, error } = await getAdminSupabase()
    .from("brands")
    .select("id, display_name, naver_brand_name, website_url")
    .eq("id", body.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!brand) return NextResponse.json({ error: "브랜드를 찾을 수 없습니다." }, { status: 404 });

  try {
    const result = await suggestBrandAliases({
      displayName: brand.display_name,
      naverBrandName: brand.naver_brand_name ?? null,
      websiteUrl: brand.website_url ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AliasSuggestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("/api/admin/brands/aliases error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
