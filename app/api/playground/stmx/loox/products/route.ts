import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  getNaverSearchCredentials,
  searchShopping,
  type ShopItem,
} from "@/lib/playground/naver-search";
import { buildCatalogLink } from "@/lib/playground/product-link";
import {
  StmxWebWriteError,
  attachProduct,
  detachProduct,
  getStmxWebAdminCredentials,
} from "@/lib/playground/stmx-loox";

/**
 * stmx-web 게시물 ↔ 착장 상품.
 *
 * `POST { postId, model: { id, name, brandName?, manufacturerName? } }`
 *   카탈로그 모델을 게시물에 건다. stmx-web 의 '착장 확인하기' 목록에 나온다.
 * `DELETE ?postId=&productId=`
 *   게시물에서 뗀다. 상품 마스터는 남긴다.
 *
 * 커머스 API 모델에는 이미지 · 가격이 없다. 네이버 쇼핑 검색으로 같은 카탈로그를 찾아
 * 채우고, 못 찾으면 이미지 없이 0원으로 건 뒤 경고를 돌려준다.
 * 사람이 입력한 가격 · 이미지로 상품 마스터를 올리는 것은 `/api/playground/stmx/products` 다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** products.naver_product_id 는 varchar(40). */
const MODEL_ID = /^[\w-]{1,40}$/;

const missingAdmin = () =>
  NextResponse.json(
    {
      error:
        "stmx-web 에 쓸 수 있는 키가 없습니다. 상품 연결은 RLS 상 secret 키로만 쓸 수 있습니다 " +
        "(stmx-web sqls/phase2/11_products.sql). Supabase 대시보드(stmx-web 프로젝트) → Project Settings → " +
        "API Keys → Secret keys 의 sb_secret_… 키를 .env.local 의 STMX_WEB_SUPABASE_SECRET_KEY 에 넣은 뒤 " +
        "dev 서버를 재시작하세요. (sb_publishable_… 키로는 쓸 수 없습니다.)",
    },
    { status: 503 }
  );

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const writeError = (error: unknown) =>
  error instanceof StmxWebWriteError
    ? NextResponse.json({ error: error.message }, { status: error.status })
    : NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );

/** 쇼핑 검색에서 이 카탈로그 한 건. 같은 productId 가 없으면 첫 결과(exact=false). */
async function lookupShopItem(
  query: string,
  modelId: string
): Promise<{ item: ShopItem | null; exact: boolean; reason?: string }> {
  const creds = getNaverSearchCredentials();
  if (!creds) return { item: null, exact: false, reason: "NAVER_SEARCH_* 자격 증명이 없습니다" };
  try {
    const items = await searchShopping(creds, query, 20);
    const exact = items.find((item) => item.productId === modelId);
    return { item: exact ?? items[0] ?? null, exact: Boolean(exact) };
  } catch (error) {
    return {
      item: null,
      exact: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** stmx-web 은 https 페이지라 http 이미지는 섞인 콘텐츠로 막힌다. */
const toHttps = (url: string | undefined) =>
  url && /^https?:\/\//i.test(url) ? url.replace(/^http:/i, "https:") : null;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getStmxWebAdminCredentials();
  if (!creds) return missingAdmin();

  const body = (await req.json().catch(() => null)) as {
    postId?: unknown;
    model?: { id?: unknown; name?: unknown; brandName?: unknown; manufacturerName?: unknown };
  } | null;

  const postId = text(body?.postId);
  const rawId = body?.model?.id;
  const modelId = typeof rawId === "number" ? String(rawId) : text(rawId);
  const name = text(body?.model?.name);
  if (!UUID.test(postId) || !MODEL_ID.test(modelId) || !name) {
    return NextResponse.json(
      { error: "postId(uuid) · model.id · model.name 이 필요합니다." },
      { status: 400 }
    );
  }

  const brand = text(body?.model?.brandName) || text(body?.model?.manufacturerName);
  // 모달의 미리보기와 같은 검색어 — 모델명에 브랜드가 빠져 있으면 붙인다.
  const query = brand && !name.includes(brand) ? `${brand} ${name}` : name;
  const { item, exact, reason } = await lookupShopItem(query, modelId);

  const warnings: string[] = [];
  if (!item) {
    warnings.push(
      `쇼핑 검색 결과를 받지 못해 이미지 없이 0원으로 붙였습니다${reason ? ` (${reason})` : ""}.`
    );
  } else if (!exact) {
    warnings.push("같은 카탈로그의 쇼핑 결과가 없어 첫 검색 결과의 이미지 · 가격을 썼습니다.");
  }

  const price = Number.parseInt(item?.lprice ?? "", 10);

  try {
    const result = await attachProduct(creds, {
      postId,
      naverProductId: modelId,
      naverUrl: buildCatalogLink(modelId),
      brandName: (brand || item?.mallName || "브랜드 미상").slice(0, 100),
      name: name.slice(0, 300),
      imageUrl: toHttps(item?.image),
      salePrice: Number.isFinite(price) && price >= 0 ? price : 0,
    });
    if (result.reusedProduct) {
      warnings.push("이미 등록된 상품이라 기존 이미지 · 가격을 그대로 썼습니다.");
    }
    return NextResponse.json({ ...result, warnings });
  } catch (error) {
    return writeError(error);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getStmxWebAdminCredentials();
  if (!creds) return missingAdmin();

  const postId = req.nextUrl.searchParams.get("postId")?.trim() ?? "";
  const productId = req.nextUrl.searchParams.get("productId")?.trim() ?? "";
  if (!UUID.test(postId) || !UUID.test(productId)) {
    return NextResponse.json({ error: "postId · productId(uuid) 가 필요합니다." }, { status: 400 });
  }

  try {
    await detachProduct(creds, postId, productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return writeError(error);
  }
}
