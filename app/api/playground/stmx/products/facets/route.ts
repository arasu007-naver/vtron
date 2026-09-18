import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { StmxWebWriteError, getStmxWebAdminCredentials } from "@/lib/playground/stmx-loox";
import { productFacets } from "@/lib/playground/stmx-products";

/**
 * 상품 페이지(/products) 조회 상자의 선택지.
 *
 * `GET` → `{ brands: [{ value, count }], categories: [{ value, count }], uncategorized }`
 *
 * 상품이 하나라도 있는 브랜드 · 카테고리만 준다. 카테고리는 카탈로그 모델
 * (brand_catalog_models)에서 온다 — products 에는 카테고리 컬럼이 없다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getStmxWebAdminCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        error:
          "stmx-web 에 쓸 수 있는 키가 없습니다. .env.local 의 " +
          "STMX_WEB_SUPABASE_SECRET_KEY(sb_secret_…)를 확인하세요.",
      },
      { status: 503 }
    );
  }

  try {
    return NextResponse.json(await productFacets(creds));
  } catch (error) {
    return error instanceof StmxWebWriteError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
  }
}
