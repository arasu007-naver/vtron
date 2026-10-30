import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { STYLE_IDS, styleIdCandidates } from "@/lib/style-ex/style-ids";
import { catalogPath, isCatalogKind, type CatalogProduct } from "@/lib/tryon/product-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 12;

/** product_style 에서 읽는 열 — target 은 0021 전이면 없다 */
interface ProductStyleDbRow {
  id: string;
  created_at: string;
  model_id: string;
  image_url: string;
  ok: boolean;
  style_id: string;
  target_id: string | null;
  axes: Parameters<typeof styleIdCandidates>[0];
  error: string | null;
  scoring: unknown;
  judgement: unknown;
  observation: unknown;
  vision_model: string | null;
  judge_model: string | null;
  elapsed_ms: number | null;
  target?: string;
  version?: string | null;
}

/**
 * GET /api/product-style?page=1&pageSize=12 — 저장된 상품 Style ID 추출 결과(product_style), 최신 먼저.
 *   응답: { rows, total, page, pageSize }
 *   row: { id, created_at, model_id, image_url, target, styleId, judgement, scoring, observation, vision_model, judge_model,
 *          elapsed_ms, product }
 *          target 은 어느 페이지가 추출했는지 — item = /style-ex · full = 인덱스(/full-style-ex). 0021 전이면 item.
 *          version 은 추출에 쓴 관찰 프롬프트 버전 레이블(v1.1 · v2 · custom), 모르면 null. — styleId 는 /api/style-ex 응답의 styleId 와 같은 모양으로 되살린다.
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
  const COLUMNS =
    "id, created_at, model_id, image_url, ok, style_id, target_id, axes, error, scoring, judgement, observation, vision_model, judge_model, elapsed_ms";
  const query = (columns: string) =>
    supabase
      .from("product_style")
      .select(columns, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
  // target · version 열(0021)이 없으면 그 둘 없이 다시 읽는다 — 그때는 모든 행이 item, 버전은 모름
  let res = await query(`${COLUMNS}, target, version`);
  if (res.error && /\b(target|version)\b/.test(res.error.message)) res = await query(COLUMNS);
  const { data, error, count } = res as unknown as {
    data: ProductStyleDbRow[] | null;
    error: { message: string } | null;
    count: number | null;
  };
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

  // 대표 의복을 고른 근거 — 저장된 관찰(envelope.targets)에서 그 의복의 product_match · prominence 로 되살린다
  const basisOf = (r: (typeof rows)[number]) => {
    const targets = (r.observation as { envelope?: { targets?: Record<string, unknown>[] } } | null)?.envelope?.targets;
    const t = targets?.find((x) => x.target_id === r.target_id);
    if (!t) return undefined;
    return t.product_match === true ? "PRODUCT_MATCH" : t.prominence === "dominant" ? "DOMINANT" : "FIRST_ELIGIBLE";
  };

  return NextResponse.json({
    page,
    pageSize,
    total: count ?? rows.length,
    rows: rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      model_id: r.model_id,
      image_url: r.image_url,
      target: r.target === "full" ? "full" : "item",
      version: r.version ?? null,
      styleId: r.ok
        ? {
            ok: true,
            style_id: r.style_id,
            style: STYLE_IDS[r.style_id] ?? null,
            // 중립 축의 양쪽 글자를 조합한 후보 — axes 에서 되살린다 (예전 저장분의 중립 고정도 양쪽으로)
            candidates: styleIdCandidates(r.axes),
            target_id: r.target_id,
            target_basis: basisOf(r),
            axes: r.axes,
          }
        : { ok: false, error: r.error, target_id: r.target_id, target_basis: basisOf(r), axes: r.axes ?? undefined },
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
