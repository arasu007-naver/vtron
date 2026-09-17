import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { parseModelRef, productInputFromModel } from "@/lib/playground/stmx-product-input";
import {
  StmxWebWriteError,
  ensureProduct,
  getStmxWebAdminCredentials,
} from "@/lib/playground/stmx-loox";

/**
 * 상품 등록 — 상품 마스터(products) 행의 image_url 을 채운다. Loox 에 붙이지 않아도 된다.
 * 이미지가 채워진 상품은 stmx-web 의 Loox 편집에서 이미지를 보며 고를 수 있다.
 *
 * `POST { model: { id, name, brandName?, manufacturerName? } }`  상품링크 목록의 카탈로그 모델.
 *   products 에 그 카탈로그 행이 없으면 네이버 쇼핑 검색 값으로 만든다('Loox에 붙이기' 와 같은
 *   행이라 나중에 붙이면 이 행 · 이미지를 그대로 쓴다).
 * `POST { productId, naverUrl }`  이미 있는 상품 마스터 행(붙일 Loox 의 상품 칩).
 *
 * 이미지는 product-crop 서버(`POST /save-product-image`)가 디버그 Chrome 으로 naverUrl 을 열어
 * 잘라 stmx-web Storage(product-images 버킷)에 올리고 image_url 을 그 공개 URL 로 바꾼다.
 * 캡처는 한 건씩 줄을 서서 수 초 ~ 수십 초 걸린다.
 *
 * product-crop 주소는 `PRODUCT_CROP_API_URL`(기본 http://127.0.0.1:8930).
 * 인증은 로그인한 사용자의 access token 을 `Authorization: Bearer` 로 그대로 넘긴다 —
 * vtron 과 product-crop 이 같은 Supabase 프로젝트라 product-crop 이 Supabase Auth 로 검증한다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** stmx-web products.naver_url CHECK 와 같은 규칙. */
const NAVER_URL = /^https:\/\/([a-z0-9-]+\.)*naver\.(com|me)(\/|$)/i;
/** product-crop 의 페이지 대기(45초) + 업로드를 넉넉히 덮는다. */
const TIMEOUT_MS = 120_000;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const cropApiBase = () =>
  (process.env.PRODUCT_CROP_API_URL?.trim() || "http://127.0.0.1:8930").replace(/\/+$/, "");

interface CropResult {
  ok: boolean;
  imageUrl: string | null;
  sourceImageUrl: string | null;
  error: string | null;
}

/** product-crop 에 한 건을 맡긴다. 실패는 사람이 읽을 문구로. */
async function cropProductImage(
  productId: string,
  naverUrl: string,
  accessToken: string
): Promise<{ imageUrl: string; sourceImageUrl: string | null } | { error: string }> {
  const base = cropApiBase();

  let res: Response;
  try {
    res = await fetch(`${base}/save-product-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify([{ id: productId, naverUrl }]),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      error:
        `product-crop 서버(${base})에 연결하지 못했습니다 — ${reason}. ` +
        "services/product-crop 에서 `npm run crop:dev` 로 서버를 띄웠는지 확인하세요.",
    };
  }

  const data = (await res.json().catch(() => null)) as {
    detail?: unknown;
    results?: CropResult[];
  } | null;

  if (res.status === 401) {
    const detail = typeof data?.detail === "string" ? data.detail : "unauthorized";
    return {
      error:
        `product-crop 이 로그인 토큰을 거절했습니다(${detail}). ` +
        "product-crop .env 의 SUPABASE_URL 이 vtron 로그인과 같은 Supabase 프로젝트인지 확인하세요.",
    };
  }
  if (!res.ok) {
    const detail =
      typeof data?.detail === "string" ? data.detail : JSON.stringify(data?.detail ?? data);
    return { error: `product-crop HTTP ${res.status} · ${detail}` };
  }

  const result = data?.results?.[0];
  if (!result) return { error: "product-crop 응답 형식이 다릅니다." };
  if (!result.ok || !result.imageUrl) {
    return { error: `이미지 등록 실패: ${result.error ?? "알 수 없는 오류"}` };
  }
  return { imageUrl: result.imageUrl, sourceImageUrl: result.sourceImageUrl };
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = (await req.json().catch(() => null)) as {
    model?: unknown;
    productId?: unknown;
    naverUrl?: unknown;
  } | null;

  let productId: string;
  let naverUrl: string;
  let createdProduct = false;
  const warnings: string[] = [];

  if (body?.model !== undefined) {
    const model = parseModelRef(body.model);
    if (!model) {
      return NextResponse.json({ error: "model.id · model.name 이 필요합니다." }, { status: 400 });
    }
    const creds = getStmxWebAdminCredentials();
    if (!creds) {
      return NextResponse.json(
        {
          error:
            "stmx-web 에 쓸 수 있는 키가 없습니다. .env.local 의 STMX_WEB_SUPABASE_SECRET_KEY(sb_secret_…)를 넣고 dev 서버를 재시작하세요.",
        },
        { status: 503 }
      );
    }
    const prepared = await productInputFromModel(model);
    try {
      const ensured = await ensureProduct(creds, prepared.input);
      productId = ensured.productId;
      naverUrl = ensured.naverUrl;
      createdProduct = !ensured.reusedProduct;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: error instanceof StmxWebWriteError ? error.status : 500 }
      );
    }
    // 이미 있던 행이면 쇼핑 검색 값은 쓰지 않았다 — 그 경고는 새로 만든 행에만 맞다.
    if (createdProduct) warnings.push(...prepared.warnings);
  } else {
    productId = text(body?.productId);
    naverUrl = text(body?.naverUrl);
    if (!UUID.test(productId) || !NAVER_URL.test(naverUrl)) {
      return NextResponse.json(
        { error: "model 또는 productId(uuid) · naverUrl(https 네이버 주소) 가 필요합니다." },
        { status: 400 }
      );
    }
  }

  const crop = await cropProductImage(productId, naverUrl, auth.token);
  if ("error" in crop) {
    // product-crop 쪽 실패는 502 — 401 을 그대로 넘기면 authFetch 가 세션 만료로 오해한다.
    return NextResponse.json(
      {
        error: createdProduct ? `상품은 등록했지만 이미지를 채우지 못했습니다 — ${crop.error}` : crop.error,
        productId,
        createdProduct,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    productId,
    createdProduct,
    imageUrl: crop.imageUrl,
    sourceImageUrl: crop.sourceImageUrl,
    warnings,
  });
}
