import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { STYLE_IDS, styleIdCandidates } from "@/lib/style-ex/style-ids";
import { catalogPath, isCatalogKind, type CatalogProduct } from "@/lib/tryon/product-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 12;

/**
 * GET /api/product-style?page=1&pageSize=12 — 저장된 상품 Style ID 추출 결과(product_style), 최신 먼저.
 *   응답: { rows, total, page, pageSize }
 *   row: { id, created_at, model_id, image_url, styleId, judgement, scoring, observation, vision_model, judge_model,
 *          elapsed_ms, product } — styleId 는 /api/style-ex 응답의 styleId 와 같은 모양으로 되살린다.
 *          product 는 카탈로그(brand_catalog_models)에서 찾은 상품 정보, 못 찾으면 null.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const url = req.nextUrl;
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
  const rawPageSize = Math.trunc(Number(url.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, rawPageSize), 50);

  const supabase = getAdminSupabase();
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("product_style")
    .select(
      "id, created_at, model_id, image_url, ok, style_id, target_id, axes, error, scoring, judgement, observation, vision_model, judge_model, elapsed_ms",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const modelIds = [...new Set(rows.map((r) => String(r.model_id)))];
  const productOf = new Map<string, CatalogProduct>();
  if (modelIds.length) {
    const [models, images] = await Promise.all([
      supabase
        .from("brand_catalog_models")
        .select("id, name, naver_brand_name, category_id, clothing_kind, whole_category_name, catalog_url")
        .in("id", modelIds),
      supabase.from("products").select("naver_product_id, thumbnail, image_url").in("naver_product_id", modelIds),
    ]);
    if (models.error) return NextResponse.json({ error: models.error.message }, { status: 500 });
    const imageOf = new Map((images.data ?? []).map((p) => [String(p.naver_product_id), p]));
    for (const m of models.data ?? []) {
      if (!isCatalogKind(m.clothing_kind)) continue;
      const img = imageOf.get(String(m.id));
      productOf.set(String(m.id), {
        id: String(m.id),
        name: String(m.name),
        brandName: m.naver_brand_name ?? null,
        categoryId: String(m.category_id),
        kind: m.clothing_kind,
        path: catalogPath(String(m.whole_category_name ?? "")),
        catalogUrl: String(m.catalog_url),
        imageUrl: img?.thumbnail ? String(img.thumbnail) : img?.image_url ? String(img.image_url) : null,
        originalImageUrl: img?.image_url ? String(img.image_url) : null,
      });
    }
  }

  return NextResponse.json({
    page,
    pageSize,
    total: count ?? rows.length,
    rows: rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      model_id: r.model_id,
      image_url: r.image_url,
      styleId: r.ok
        ? {
            ok: true,
            style_id: r.style_id,
            style: STYLE_IDS[r.style_id] ?? null,
            // 중립 축의 양쪽 글자를 조합한 후보 — axes 에서 되살린다 (예전 저장분의 중립 고정도 양쪽으로)
            candidates: styleIdCandidates(r.axes),
            target_id: r.target_id,
            axes: r.axes,
          }
        : { ok: false, error: r.error, target_id: r.target_id, axes: r.axes ?? undefined },
      judgement: r.judgement,
      scoring: r.scoring,
      observation: r.observation,
      vision_model: r.vision_model,
      judge_model: r.judge_model,
      elapsed_ms: r.elapsed_ms,
      product: productOf.get(String(r.model_id)) ?? null,
    })),
  });
}
