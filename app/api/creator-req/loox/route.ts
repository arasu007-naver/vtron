import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  fetchAuthorLooxPage,
  getStmxWebAdminCredentials,
} from "@/lib/playground/stmx-loox";

/**
 * GET /api/creator-req/loox?userId=<uuid>&page=<1..>&pageSize=<1..50>
 * Creator 신청자(user_biz_request.user_id)가 올린 Loox 게시물을 최근 발행 순으로 한 페이지.
 * 응답 `{ posts, total, page, pageSize, totalPages }`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const admin = getStmxWebAdminCredentials();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "stmx-web secret 키가 없습니다. .env.local 에 STMX_WEB_SUPABASE_SECRET_KEY 를 넣은 뒤 dev 서버를 재시작하세요.",
      },
      { status: 503 }
    );
  }

  const params = req.nextUrl.searchParams;
  const userId = params.get("userId")?.trim() ?? "";
  if (!UUID.test(userId)) {
    return NextResponse.json({ error: "userId(uuid) 가 필요합니다." }, { status: 400 });
  }

  const page = Math.max(Math.trunc(Number(params.get("page") ?? "1")) || 1, 1);
  const rawSize = Math.trunc(Number(params.get("pageSize") ?? DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(rawSize, 1), MAX_PAGE_SIZE);

  try {
    const { posts, total } = await fetchAuthorLooxPage(admin, { authorId: userId, page, pageSize });
    return NextResponse.json({
      posts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
