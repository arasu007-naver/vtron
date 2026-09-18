import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { StmxWebWriteError, getStmxWebAdminCredentials } from "@/lib/playground/stmx-loox";
import { updateProduct, type ProductPatch } from "@/lib/playground/stmx-products";

/**
 * 상품 한 건 수정 — 상품 페이지(/products) '갱신' 모달이 저장하는 곳.
 *
 * `PATCH { brandName?, name?, salePrice?, originalPrice?, imageUrl?, isSoldOut?, isActive? }`
 *   → 고친 상품 한 건
 *
 * 값 검사는 stmx-web products 의 제약과 같게 한다 — sale_price ≥ 0,
 * original_price 는 null 이거나 sale_price 이상. 할인율은 DB 가 계산한다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** 0 이상의 정수 원화. 아니면 null. */
const toWon = (value: unknown) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
};

interface Body {
  brandName?: unknown;
  name?: unknown;
  salePrice?: unknown;
  originalPrice?: unknown;
  imageUrl?: unknown;
  isSoldOut?: unknown;
  isActive?: unknown;
}

function parsePatch(body: Body): { value: ProductPatch } | { error: string } {
  const patch: ProductPatch = {};

  if (body.brandName !== undefined) {
    const brand = text(body.brandName);
    if (!brand) return { error: "브랜드는 비워 둘 수 없습니다." };
    patch.brandName = brand.slice(0, 100);
  }

  if (body.name !== undefined) {
    const name = text(body.name);
    if (!name) return { error: "상품명은 비워 둘 수 없습니다." };
    patch.name = name.slice(0, 300);
  }

  if (body.salePrice !== undefined) {
    const salePrice = toWon(body.salePrice);
    if (salePrice === null) return { error: "판매가는 0 이상의 정수(원)여야 합니다." };
    patch.salePrice = salePrice;
  }

  if (body.originalPrice !== undefined) {
    if (body.originalPrice === null || body.originalPrice === "") {
      patch.originalPrice = null;
    } else {
      const originalPrice = toWon(body.originalPrice);
      if (originalPrice === null) {
        return { error: "정가는 0 이상의 정수(원)이거나 비어 있어야 합니다." };
      }
      // 판매가를 같이 보내지 않으면 DB 의 행에 있는 값과 견줘야 해서 여기서는 못 막는다.
      if (patch.salePrice !== undefined && originalPrice < patch.salePrice) {
        return { error: "정가는 판매가보다 작을 수 없습니다." };
      }
      patch.originalPrice = originalPrice;
    }
  }

  if (body.imageUrl !== undefined) {
    if (body.imageUrl === null || body.imageUrl === "") {
      patch.imageUrl = null;
    } else {
      const url = text(body.imageUrl);
      if (!/^https:\/\//i.test(url)) {
        return {
          error:
            "이미지 URL 은 https 여야 합니다(stmx-web 은 https 페이지라 http 이미지는 막힌다).",
        };
      }
      patch.imageUrl = url;
    }
  }

  if (body.isSoldOut !== undefined) {
    if (typeof body.isSoldOut !== "boolean") return { error: "품절은 true · false 여야 합니다." };
    patch.isSoldOut = body.isSoldOut;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return { error: "노출은 true · false 여야 합니다." };
    patch.isActive = body.isActive;
  }

  if (Object.keys(patch).length === 0) return { error: "바꿀 값이 없습니다." };
  return { value: patch };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getStmxWebAdminCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        error:
          "stmx-web 에 쓸 수 있는 키가 없습니다. 상품 수정은 RLS 상 secret 키로만 할 수 있습니다. " +
          ".env.local 의 STMX_WEB_SUPABASE_SECRET_KEY(sb_secret_…)를 확인하세요.",
      },
      { status: 503 }
    );
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "상품 id 가 올바르지 않습니다." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "본문이 없습니다." }, { status: 400 });
  }

  const patch = parsePatch(body);
  if ("error" in patch) return NextResponse.json({ error: patch.error }, { status: 400 });

  try {
    return NextResponse.json({ product: await updateProduct(creds, id, patch.value) });
  } catch (error) {
    return error instanceof StmxWebWriteError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
  }
}
