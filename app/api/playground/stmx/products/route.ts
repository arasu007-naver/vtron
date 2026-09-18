import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { buildCatalogLink } from "@/lib/playground/product-link";
import {
  StmxWebWriteError,
  getStmxWebAdminCredentials,
  registerProduct,
} from "@/lib/playground/stmx-loox";
import { listProducts, type ProductSort } from "@/lib/playground/stmx-products";

/**
 * 상품 마스터 등록 — /products-2-link 링크 목록의 '등록'.
 *
 * `POST { model: { id, name, brandName?, manufacturerName? }, price: { salePrice, originalPrice? }, imageUrl? }`
 *   → `{ productId, created }`
 *
 * stmx-web products 에 올리기만 하고 Loox(post_products)와는 잇지 않는다 — 잇는 것은
 * `/api/playground/stmx/loox/products` 의 'Loox에 붙이기' 다. 같은 카탈로그가 있으면 가격
 * (과 준 경우 이미지)만 바꾼다. 가격은 새 탭의 판매 페이지를 보고 사람이 입력한 값이고,
 * 이미지는 services/product-crop 의 save-product-image 가 돌려준 URL 이다.
 *
 * 목록은 상품 페이지(/products)가 쓴다.
 *
 * `GET ?brand=&category=&name=&modelCode=&sort=recent|oldest&page=1&pageSize=24`
 *   → `{ products, total, page, pageSize, sort }`
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** products.naver_product_id 는 varchar(40). */
const MODEL_ID = /^[\w-]{1,40}$/;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** 0 이상의 정수 원화. 아니면 null. */
const toWon = (value: unknown) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
};

/**
 * 가격 검사 — stmx-web products 의 제약과 같게: sale_price ≥ 0 필수,
 * original_price 는 null 이거나 sale_price 이상.
 */
function parsePrice(
  raw: unknown
): { value: { salePrice: number; originalPrice: number | null } } | { error: string } {
  if (raw == null || typeof raw !== "object") {
    return { error: "price 는 { salePrice, originalPrice? } 여야 합니다." };
  }
  const { salePrice: rawSale, originalPrice: rawOriginal } = raw as {
    salePrice?: unknown;
    originalPrice?: unknown;
  };
  const salePrice = toWon(rawSale);
  if (salePrice === null) return { error: "price.salePrice 는 0 이상의 정수(원)여야 합니다." };
  if (rawOriginal == null || rawOriginal === "") return { value: { salePrice, originalPrice: null } };
  const originalPrice = toWon(rawOriginal);
  if (originalPrice === null) {
    return { error: "price.originalPrice 는 0 이상의 정수(원)이거나 비어 있어야 합니다." };
  }
  if (originalPrice < salePrice) return { error: "정가는 판매가보다 작을 수 없습니다." };
  return { value: { salePrice, originalPrice } };
}

/** 이미지: 안 보냈으면 undefined(기존 유지), null 이면 비움, 문자열이면 https URL 만. */
function parseImageUrl(raw: unknown): { value: string | null | undefined } | { error: string } {
  if (raw === undefined) return { value: undefined };
  if (raw === null) return { value: null };
  const url = text(raw);
  if (!/^https:\/\//i.test(url)) {
    return { error: "imageUrl 은 https URL 이어야 합니다(stmx-web 은 https 페이지라 http 이미지는 막힌다)." };
  }
  return { value: url };
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getStmxWebAdminCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        error:
          "stmx-web 에 쓸 수 있는 키가 없습니다. 상품 등록은 RLS 상 secret 키로만 쓸 수 있습니다. " +
          ".env.local 의 STMX_WEB_SUPABASE_SECRET_KEY(sb_secret_…)를 확인하세요.",
      },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    model?: { id?: unknown; name?: unknown; brandName?: unknown; manufacturerName?: unknown };
    price?: unknown;
    imageUrl?: unknown;
  } | null;

  const rawId = body?.model?.id;
  const modelId = typeof rawId === "number" ? String(rawId) : text(rawId);
  const name = text(body?.model?.name);
  if (!MODEL_ID.test(modelId) || !name) {
    return NextResponse.json({ error: "model.id · model.name 이 필요합니다." }, { status: 400 });
  }

  const price = parsePrice(body?.price);
  if ("error" in price) return NextResponse.json({ error: price.error }, { status: 400 });
  const image = parseImageUrl(body?.imageUrl);
  if ("error" in image) return NextResponse.json({ error: image.error }, { status: 400 });

  const brand = text(body?.model?.brandName) || text(body?.model?.manufacturerName);

  try {
    const result = await registerProduct(creds, {
      naverProductId: modelId,
      naverUrl: buildCatalogLink(modelId),
      brandName: (brand || "브랜드 미상").slice(0, 100),
      name: name.slice(0, 300),
      salePrice: price.value.salePrice,
      originalPrice: price.value.originalPrice,
      imageUrl: image.value,
    });
    return NextResponse.json(result);
  } catch (error) {
    return error instanceof StmxWebWriteError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
  }
}

/** 쓰기 · 목록 모두 secret 키가 있어야 한다 — products 에는 익명 읽기 정책이 없다. */
const noCredentials = () =>
  NextResponse.json(
    {
      error:
        "stmx-web 에 쓸 수 있는 키가 없습니다. 상품 조회 · 등록은 RLS 상 secret 키로만 할 수 있습니다. " +
        ".env.local 의 STMX_WEB_SUPABASE_SECRET_KEY(sb_secret_…)를 확인하세요.",
    },
    { status: 503 }
  );

/** 1 이상의 정수. 아니면 기본값. */
const toCount = (raw: string | null, fallback: number, max: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getStmxWebAdminCredentials();
  if (!creds) return noCredentials();

  const params = req.nextUrl.searchParams;
  const sort: ProductSort = params.get("sort") === "oldest" ? "oldest" : "recent";

  try {
    const page = await listProducts(
      creds,
      {
        brand: params.get("brand") ?? undefined,
        category: params.get("category") ?? undefined,
        name: params.get("name") ?? undefined,
        modelCode: params.get("modelCode") ?? undefined,
      },
      sort,
      toCount(params.get("page"), 1, 100_000),
      toCount(params.get("pageSize"), 24, 100)
    );
    return NextResponse.json(page);
  } catch (error) {
    return error instanceof StmxWebWriteError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
  }
}
