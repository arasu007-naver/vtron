import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  NAVER_COMMERCE_BASE_URL,
  NaverTokenError,
  getNaverCredentials,
  isBcryptSalt,
  issueNaverToken,
  maskMiddle,
} from "@/lib/playground/naver";

/**
 * 네이버 커머스 액세스 토큰 발급.
 *
 * `GET` — 서버에 자격 증명이 설정돼 있는지만 알려준다(시크릿은 내려보내지 않는다).
 * `POST` — 토큰을 발급한다. 본문에 clientId/clientSecret 을 주면 그걸 쓰고,
 *          없으면 서버 환경변수를 쓴다.
 *
 * 커머스 API 가 거절하면 그 응답 본문을 그대로 전달한다. 무엇이 잘못됐는지
 * (IP 미등록 · 시크릿 불일치 · 인증 기한 만료) 원문에 다 들어 있다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const creds = getNaverCredentials();
  return NextResponse.json({
    configured: Boolean(creds),
    clientId: creds?.clientId ?? null,
    baseUrl: NAVER_COMMERCE_BASE_URL,
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const input = (await req.json().catch(() => ({}))) as {
    clientId?: string;
    clientSecret?: string;
    type?: "SELF" | "SELLER";
    accountId?: string;
  };

  const envCreds = getNaverCredentials();
  const clientId = input.clientId?.trim() || envCreds?.clientId;
  const clientSecret = input.clientSecret?.trim() || envCreds?.clientSecret;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "애플리케이션 ID/시크릿이 없습니다. .env.local 의 NAVER_COMMERCE_CLIENT_ID · NAVER_COMMERCE_CLIENT_SECRET 을 채우거나 화면에서 직접 입력하세요.",
      },
      { status: 400 }
    );
  }

  // 시크릿이 곧 bcrypt salt 다. 형태가 다르면 서명 단계에서 에러가 나므로 먼저 잡는다.
  if (!isBcryptSalt(clientSecret)) {
    return NextResponse.json(
      {
        error:
          "애플리케이션 시크릿 형식이 아닙니다. `$2a$04$` 로 시작하는 29자 문자열이어야 합니다. " +
          ".env 에 넣을 때는 `$` 를 `\\$` 로 이스케이프하세요(작은따옴표로 감싸도 Next 는 변수로 확장합니다). " +
          ".env 수정 후에는 dev 서버를 재시작해야 반영됩니다.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await issueNaverToken({
      clientId,
      clientSecret,
      type: input.type ?? "SELF",
      accountId: input.accountId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NaverTokenError) {
      return NextResponse.json(
        {
          error: error.message,
          status: error.status,
          // 커머스 API 원문. JSON 이면 파싱해서, 아니면 문자열 그대로.
          response: safeJson(error.body),
          clientId: maskMiddle(clientId, 4),
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error: `토큰 발급 중 오류: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
