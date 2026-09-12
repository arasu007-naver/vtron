import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { fetchLoox, getStmxWebCredentials } from "@/lib/playground/stmx-loox";

/**
 * stmx-web 의 최근 LOOX 게시물(이미지 · 착장 상품 포함).
 *
 * `GET ?limit=<1..20>` — 기본 1건. 상품링크 모달의 'Loox 목록' 단계가 쓴다.
 * `GET ?postId=<uuid>` — 그 한 건. 상품을 붙인 뒤 같은 게시물을 다시 읽을 때.
 * stmx-web 은 다른 Supabase 프로젝트라 자격 증명은 서버에만 둔다.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 20;

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const raw = Number(req.nextUrl.searchParams.get("limit") ?? "1");
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), MAX_LIMIT) : 1;
  const postId = req.nextUrl.searchParams.get("postId")?.trim() || undefined;
  if (postId && !UUID.test(postId)) {
    return NextResponse.json({ error: "postId 는 uuid 여야 합니다." }, { status: 400 });
  }

  const creds = getStmxWebCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        error:
          "stmx-web Supabase 자격 증명이 없습니다. .env.local 에 STMX_WEB_SUPABASE_URL · " +
          "STMX_WEB_SUPABASE_KEY(stmx-web 의 NEXT_PUBLIC_SUPABASE_URL · PUBLISHABLE_KEY 값)를 " +
          "넣은 뒤 dev 서버를 재시작하세요.",
      },
      { status: 503 }
    );
  }

  try {
    const posts = await fetchLoox(creds, { limit, postId });
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
