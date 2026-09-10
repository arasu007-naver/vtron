import "server-only";
import { hashSync } from "bcryptjs";
import type { NaverTokenResult } from "@/types/playground";

/**
 * 네이버 커머스 API(커머스 API 센터) 인증.
 *
 * 커머스 API 는 애플리케이션 시크릿을 그대로 보내지 않는다. 대신
 *
 *   sign = base64( bcrypt("<애플리케이션ID>_<timestamp>", <애플리케이션시크릿>) )
 *
 * 를 만들어 `client_secret_sign` 으로 넘긴다. 시크릿(`$2a$04$...` 29자)이 곧
 * bcrypt salt 라서 별도의 salt 생성 없이 해시 입력으로 그대로 쓴다.
 *
 * 서명은 시크릿을 알아야 만들 수 있으므로 **항상 서버에서만** 계산한다.
 * 브라우저에는 시크릿도, 시크릿 원문도 내려보내지 않는다.
 */

export const NAVER_COMMERCE_BASE_URL =
  process.env.NAVER_COMMERCE_BASE_URL?.replace(/\/+$/, "") ||
  "https://api.commerce.naver.com/external";

export const NAVER_TOKEN_PATH = "/v1/oauth2/token";

export interface NaverCredentials {
  clientId: string;
  clientSecret: string;
}

/** 서버 환경변수에 등록된 자격 증명. 하나라도 비면 null. */
export function getNaverCredentials(): NaverCredentials | null {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** `$2a$04$xxxx...` 22자 salt 형태인지 — 잘못 붙여넣은 시크릿을 일찍 잡는다. */
export const isBcryptSalt = (secret: string) =>
  /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{22}/.test(secret);

/** 커머스 API 서명 생성. timestamp 는 epoch ms. */
export function signClientSecret(
  clientId: string,
  clientSecret: string,
  timestamp: number
): string {
  const hashed = hashSync(`${clientId}_${timestamp}`, clientSecret);
  return Buffer.from(hashed, "utf-8").toString("base64");
}

export interface IssueTokenOptions extends NaverCredentials {
  /** SELF = 자체 개발(내 스토어), SELLER = 솔루션 개발(판매자 위임) */
  type?: "SELF" | "SELLER";
  /** type === "SELLER" 일 때 위임받은 판매자 계정 ID */
  accountId?: string;
}

/**
 * 액세스 토큰 발급.
 * 커머스 API 가 200 이 아닌 응답을 주면 본문을 그대로 담아 throw 한다 —
 * 플레이그라운드는 실패 응답도 보여줘야 하므로 메시지를 지어내지 않는다.
 */
export async function issueNaverToken({
  clientId,
  clientSecret,
  type = "SELF",
  accountId,
}: IssueTokenOptions): Promise<NaverTokenResult> {
  const timestamp = Date.now();
  const clientSecretSign = signClientSecret(clientId, clientSecret, timestamp);
  const endpoint = `${NAVER_COMMERCE_BASE_URL}${NAVER_TOKEN_PATH}`;

  const form = new URLSearchParams({
    client_id: clientId,
    timestamp: String(timestamp),
    client_secret_sign: clientSecretSign,
    grant_type: "client_credentials",
    type,
  });
  if (type === "SELLER" && accountId) form.set("account_id", accountId);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new NaverTokenError(res.status, text);
  }

  const data = JSON.parse(text) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    issuedAt: Date.now(),
    debug: { clientId, timestamp, clientSecretSign, type, endpoint },
  };
}

export class NaverTokenError extends Error {
  constructor(
    readonly status: number,
    readonly body: string
  ) {
    super(`네이버 커머스 토큰 발급 실패 (HTTP ${status})`);
    this.name = "NaverTokenError";
  }
}

/**
 * 프록시가 서버에서 채우는 `{{변수}}` 들.
 * `timestamp` 와 `clientSecretSign` 은 반드시 같은 시각에서 나와야 하므로 한 번에 만든다.
 */
export function serverVars(): {
  vars: Record<string, string>;
  /** 화면에 보여줄 값 — 시크릿 파생값은 앞뒤만 남긴다. */
  masked: Record<string, string>;
} {
  const creds = getNaverCredentials();
  const timestamp = Date.now();

  const vars: Record<string, string> = {
    baseUrl: NAVER_COMMERCE_BASE_URL,
    timestamp: String(timestamp),
  };
  if (creds) {
    vars.clientId = creds.clientId;
    vars.clientSecretSign = signClientSecret(
      creds.clientId,
      creds.clientSecret,
      timestamp
    );
  }

  const masked = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [
      k,
      k === "clientSecretSign" ? maskMiddle(v) : v,
    ])
  );

  return { vars, masked };
}

export const maskMiddle = (value: string, keep = 6) =>
  value.length <= keep * 2
    ? "*".repeat(value.length)
    : `${value.slice(0, keep)}…${value.slice(-keep)}`;
