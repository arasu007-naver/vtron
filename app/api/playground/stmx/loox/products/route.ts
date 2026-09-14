import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { parseModelRef, productInputFromModel } from "@/lib/playground/stmx-product-input";
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
 * 상품 마스터 행의 값은 `lib/playground/stmx-product-input.ts` 가 네이버 쇼핑 검색으로 채운다.
 * 사람이 입력한 가격 · 이미지로 상품 마스터를 올리는 것은 `/api/playground/stmx/products` 다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const writeError = (error: unknown) =>
  error instanceof StmxWebWriteError
    ? NextResponse.json({ error: error.message }, { status: error.status })
    : NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getStmxWebAdminCredentials();
  if (!creds) return missingAdmin();

  const body = (await req.json().catch(() => null)) as {
    postId?: unknown;
    model?: unknown;
  } | null;

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const model = parseModelRef(body?.model);
  if (!UUID.test(postId) || !model) {
    return NextResponse.json(
      { error: "postId(uuid) · model.id · model.name 이 필요합니다." },
      { status: 400 }
    );
  }

  const { input, warnings } = await productInputFromModel(model);

  try {
    const result = await attachProduct(creds, { ...input, postId });
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
