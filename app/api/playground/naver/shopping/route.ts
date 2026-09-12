import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  NaverSearchError,
  getNaverSearchCredentials,
  searchShopping,
} from "@/lib/playground/naver-search";

/**
 * 카탈로그 모델 → 쇼핑 검색 결과(이미지 · 제목).
 *
 * `GET ?query=<모델명>&id=<모델 id>` — 모델명으로 쇼핑 검색을 돌리고, productId 가
 * 모델 id 와 같은 항목(바로 그 카탈로그)을 맨 앞에 둔다.
 *
 * 커머스 API 모델에는 이미지가 없고 카탈로그 페이지는 서버 fetch 가 418 로 막혀서,
 * 이미지는 네이버 검색 오픈 API 로만 받는다. 자격 증명은 서버에만 둔다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const query = req.nextUrl.searchParams.get("query")?.trim();
  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "query 가 필요합니다." }, { status: 400 });
  }

  const creds = getNaverSearchCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        error:
          "네이버 검색 API 자격 증명이 없습니다. developers.naver.com 에서 '검색' API 애플리케이션을 등록하고 " +
          ".env.local 에 NAVER_SEARCH_CLIENT_ID · NAVER_SEARCH_CLIENT_SECRET 을 넣은 뒤 dev 서버를 재시작하세요. " +
          "(커머스 API 모델에는 이미지가 없어 이 API 가 필요합니다.)",
      },
      { status: 503 }
    );
  }

  try {
    const items = await searchShopping(creds, query);
    // 바로 그 카탈로그를 앞으로. sort 는 안정 정렬이라 나머지는 검색 순서를 지킨다.
    const sorted = id
      ? [...items].sort(
          (a, b) => Number(b.productId === id) - Number(a.productId === id)
        )
      : items;
    return NextResponse.json({ query, items: sorted });
  } catch (error) {
    if (error instanceof NaverSearchError) {
      return NextResponse.json(
        { error: `${error.message} · ${error.body.slice(0, 300)}` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error: `쇼핑 검색 중 오류: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
