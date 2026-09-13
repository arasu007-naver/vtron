import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  fetchLoox,
  fetchLooxPage,
  fetchLooxPageByWeeklyVisits,
  fetchVisitStats,
  getStmxWebAdminCredentials,
  getStmxWebCredentials,
  type LooxPost,
  type LooxSort,
} from "@/lib/playground/stmx-loox";

/**
 * stmx-web 의 최근 LOOX 게시물(이미지 · 착장 상품 · 방문자수 포함).
 *
 * `GET ?limit=<1..20>` — 기본 1건. 상품링크 모달의 'Loox 목록' 단계가 쓴다.
 * `GET ?postId=<uuid>` — 그 한 건. 상품을 붙인 뒤 같은 게시물을 다시 읽을 때.
 * stmx-web 은 다른 Supabase 프로젝트라 자격 증명은 서버에만 둔다.
 *
 * 응답 `{ posts, visitsError }`. 방문자수(`post.visits`)는 secret 키로만 읽히므로 키가 없거나
 * stmx-web 에 12_post_action_clicks.sql 을 아직 돌리지 않았으면 게시물은 그대로 주고
 * `visits` 는 null, 사유는 `visitsError` 에 담는다.
 *
 * `GET ?page=<1..>&pageSize=<1..50>&sort=recent|visits` — /products-2-link 의 Loox 목록 페이지.
 *   응답 `{ posts, total, page, pageSize, sort, since, weeklyVisits, visitsError }`.
 *   recent : 최근 발행 순.
 *   visits : 최근 7일 방문자수(게시물 상세 액션 버튼 클릭 수) 큰 순. 클릭 로그는 secret 키로만
 *            읽히므로 키가 없거나 12 단계 전이면 오류로 돌려준다. `weeklyVisits` = 게시물별 7일 클릭 수.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 20;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const isSort = (value: string): value is LooxSort => value === "recent" || value === "visits";

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

  const admin = getStmxWebAdminCredentials();

  /** 누적 방문자수(post.visits)를 채운다. 못 읽으면 게시물은 그대로 두고 사유를 돌려준다. */
  const fillVisits = async (posts: LooxPost[]): Promise<string | null> => {
    if (!admin) {
      return "방문자수는 secret 키로만 읽힙니다. .env.local 에 STMX_WEB_SUPABASE_SECRET_KEY 를 넣으세요.";
    }
    try {
      const stats = await fetchVisitStats(admin, posts.map((post) => post.id));
      for (const post of posts) post.visits = stats.get(post.id) ?? null;
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

  const pageParam = req.nextUrl.searchParams.get("page");
  if (pageParam !== null) {
    const page = Math.max(Math.trunc(Number(pageParam)) || 1, 1);
    const rawSize = Number(req.nextUrl.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);
    const pageSize = Number.isFinite(rawSize)
      ? Math.min(Math.max(Math.trunc(rawSize), 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const sort = req.nextUrl.searchParams.get("sort") ?? "recent";
    if (!isSort(sort)) {
      return NextResponse.json({ error: "sort 는 recent 또는 visits 입니다." }, { status: 400 });
    }

    try {
      if (sort === "recent") {
        const { posts, total } = await fetchLooxPage(creds, { page, pageSize });
        const visitsError = await fillVisits(posts);
        return NextResponse.json({
          posts,
          total,
          page,
          pageSize,
          sort,
          since: null,
          weeklyVisits: null,
          visitsError,
        });
      }

      if (!admin) {
        return NextResponse.json(
          {
            error:
              "일주일간 방문자수는 클릭 로그를 secret 키로만 읽을 수 있습니다. .env.local 에 STMX_WEB_SUPABASE_SECRET_KEY 를 넣으세요.",
          },
          { status: 503 }
        );
      }
      const since = new Date(Date.now() - WEEK_MS);
      const { posts, total, weeklyVisits } = await fetchLooxPageByWeeklyVisits(creds, admin, {
        page,
        pageSize,
        since,
      });
      const visitsError = await fillVisits(posts);
      return NextResponse.json({
        posts,
        total,
        page,
        pageSize,
        sort,
        since: since.toISOString(),
        weeklyVisits,
        visitsError,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 502 }
      );
    }
  }

  try {
    const posts = await fetchLoox(creds, { limit, postId });
    const visitsError = await fillVisits(posts);
    return NextResponse.json({ posts, visitsError });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
