/**
 * STMX API 토큰 — `stmx_live_` + 32바이트 난수 base62(43자).
 *
 * DB 에는 sha256 hex(`token_hash`)와 앞부분(`token_prefix`)만 남긴다. 평문은 발급 응답에서 한 번만 보낸다.
 * 서버 전용(node:crypto).
 */
import { createHash, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "stmx_live_";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** 62^43 > 2^256 이므로 32바이트는 43자 안에 들어간다. 길이를 고정하려고 앞을 0 으로 채운다. */
const BODY_LENGTH = 43;
const TOKEN_RE = new RegExp(`^${TOKEN_PREFIX}[0-9A-Za-z]{${BODY_LENGTH}}$`);

function toBase62(bytes: Uint8Array): string {
  let n = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`);
  let out = "";
  while (n > BigInt(0)) {
    out = BASE62[Number(n % BigInt(62))] + out;
    n /= BigInt(62);
  }
  return out.padStart(BODY_LENGTH, "0");
}

export function generateToken(): string {
  return TOKEN_PREFIX + toBase62(randomBytes(32));
}

export function isTokenFormat(token: string): boolean {
  return TOKEN_RE.test(token);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** 화면에서 토큰을 구분하는 앞부분 — `stmx_live_` + 4자 */
export function tokenDisplayPrefix(token: string): string {
  return token.slice(0, TOKEN_PREFIX.length + 4);
}

/** 새 토큰과 DB 에 넣을 값 */
export function issueToken() {
  const token = generateToken();
  return {
    token,
    columns: {
      token_hash: hashToken(token),
      token_prefix: tokenDisplayPrefix(token),
      token_issued_at: new Date().toISOString(),
      token_last_used_at: null,
    },
  };
}
