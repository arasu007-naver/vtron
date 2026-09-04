import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_PUBLIC_KEY,
  SUPABASE_URL,
  hasSupabaseEnv,
} from "@/lib/supabase/env";

/**
 * 세션 가드.
 *
 * `/login` 을 제외한 모든 페이지는 유효한 Supabase 세션이 있어야 접근할 수 있고,
 * 없으면 `/login` 으로 리다이렉트한다. 반대로 이미 로그인한 사용자가 `/login`
 * 에 오면 스튜디오로 돌려보낸다.
 *
 * Next 16 에서 `middleware.ts` 는 deprecated 이므로 `proxy.ts` 규약을 쓴다.
 */

/** 세션 없이 접근할 수 있는 경로 */
const PUBLIC_PATHS = ["/login"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const redirectTo = (
  request: NextRequest,
  pathname: string,
  params?: Record<string, string>
) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  return NextResponse.redirect(url);
};

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  // 환경 변수가 없으면 세션을 검증할 수 없다. 통과시키지 않고(fail closed)
  // 로그인 페이지가 설정 오류를 안내하도록 한다.
  if (!hasSupabaseEnv) {
    return isPublic
      ? NextResponse.next()
      : redirectTo(request, "/login", { error: "config" });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getSession() 은 쿠키를 그대로 신뢰하므로 가드에 쓰면 안 된다.
  // getUser() 는 Auth 서버에 토큰 검증을 요청한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    // 로그인 후 원래 가려던 곳으로 돌려보내기 위해 경로를 넘긴다.
    return redirectTo(
      request,
      "/login",
      pathname === "/" ? undefined : { next: `${pathname}${search}` }
    );
  }

  if (user && isPublic) {
    return redirectTo(request, "/");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 요청에 적용한다:
     * - /api/*        (API 라우트 — 페이지 가드 대상이 아님)
     * - _next/static, _next/image, favicon
     * - 정적 파일 확장자 (public/ 의 예제 이미지·폰트 등)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf|txt|xml)$).*)",
  ],
};
