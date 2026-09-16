/**
 * 네이버 쇼핑 커넥트(커머스 API) 클라이언트와 스크립트 공통 잡일.
 *
 * scripts/sync-brands.mjs (브랜드 매칭 · 분포)와 scripts/sync-brand-catalog.mjs
 * (브랜드 내재화)가 같이 쓴다.
 *
 * 네이버 쪽 사실(직접 호출해 확인함):
 *  - 브랜드 조회 `GET /v1/product-brands?name=` 은 [{ id, name }] 만 준다. 토큰/접두 매칭이라
 *    "타임" 을 찾으면 타임존·타임즈…가 같이 오고, 없으면 404 NOT_FOUND 다. 단건 조회 경로는 없다.
 *  - 모델 조회 `GET /v1/product-models?name=` 은 brandCode 파라미터가 없다. 브랜드명으로 찾고
 *    brandCode 로 거른 것만 쓴다.
 *  - 호출을 몰아서 하면 429 GW.RATE_LIMIT 이 난다. 호출 간격을 두고 429 는 기다렸다 다시 부른다.
 *  - 커머스 API 는 등록된 IP(NAVER_SHOPPING_CONNECT_IP)에서만 받는다.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashSync } from "bcryptjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** 호출 사이 최소 간격. 이보다 촘촘하면 429 가 난다. */
export const MIN_INTERVAL_MS = 550;
/** size 상한은 100 이다(500·1000 은 400). */
export const MODEL_PAGE_SIZE = 100;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/** Next.js 처럼 .env · .env.local 을 읽는다. 시크릿의 `$` 가 `\$` 로 이스케이프돼 있어 푼다. */
export function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2").replace(/\\\$/g, "$");
    }
  }
}

export class NaverCommerce {
  constructor({ baseUrl, clientId, clientSecret }) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.lastCallAt = 0;
    this.calls = 0;
  }

  /** 환경 변수에서 바로 만든다. 자격 증명이 없으면 던진다. */
  static fromEnv() {
    const clientId = process.env.NAVER_COMMERCE_CLIENT_ID?.trim();
    const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error("NAVER_COMMERCE_CLIENT_ID · NAVER_COMMERCE_CLIENT_SECRET 이 없습니다.");
    }
    return new NaverCommerce({
      baseUrl:
        process.env.NAVER_COMMERCE_BASE_URL?.replace(/\/+$/, "") ||
        "https://api.commerce.naver.com/external",
      clientId,
      clientSecret,
    });
  }

  async issueToken() {
    const timestamp = Date.now();
    const sign = Buffer.from(
      hashSync(`${this.clientId}_${timestamp}`, this.clientSecret),
      "utf-8"
    ).toString("base64");
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        timestamp: String(timestamp),
        client_secret_sign: sign,
        grant_type: "client_credentials",
        type: "SELF",
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`토큰 발급 실패 HTTP ${res.status}: ${text.slice(0, 300)}`);
    this.token = JSON.parse(text).access_token;
  }

  /** GET → { status, data }. 429 는 물러났다 재시도, 401 은 토큰을 새로 받아 한 번 더. */
  async get(pathname, params) {
    const url = new URL(`${this.baseUrl}${pathname}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, String(value));
    }
    if (!this.token) await this.issueToken();

    let refreshed = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const wait = this.lastCallAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastCallAt = Date.now();
      this.calls++;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
      const text = await res.text();

      if (res.status === 429) {
        await sleep(1000 * 2 ** Math.min(attempt, 4));
        continue;
      }
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        await this.issueToken();
        continue;
      }
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { status: res.status, data };
    }
    throw new Error(`계속 429 입니다: ${url}`);
  }

  /** 브랜드 검색. 없으면 404 NOT_FOUND 라서 빈 배열로 돌린다. */
  async searchBrands(name) {
    const { status, data } = await this.get("/v1/product-brands", { name });
    if (status === 404) return [];
    if (status !== 200 || !Array.isArray(data)) {
      throw new Error(`브랜드 조회 실패 [${name}] HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return data.filter((b) => b && b.id != null && typeof b.name === "string");
  }

  async searchModels(name, page) {
    const { status, data } = await this.get("/v1/product-models", {
      name,
      page,
      size: MODEL_PAGE_SIZE,
    });
    if (status === 404) return { contents: [], totalElements: 0, last: true };
    if (status !== 200 || !Array.isArray(data?.contents)) {
      throw new Error(`모델 조회 실패 [${name}] HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return data;
  }
}
