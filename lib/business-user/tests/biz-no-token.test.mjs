/**
 * 사업자번호 검증 · 정규화 (lib/business-user/biz-no.ts) · API 토큰 생성 · 해시 (lib/business-user/token.ts)
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test lib/business-user/tests/biz-no-token.test.mjs
 *
 * Node 22.18+ 는 .ts 의 타입을 지우고 바로 읽는다. 외부 호출 없음.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  formatBizNo,
  isBizNoFormat,
  isValidBizNo,
  normalizeBizNo,
  normalizeBusinessName,
} from "../biz-no.ts";
import {
  TOKEN_PREFIX,
  generateToken,
  hashToken,
  isTokenFormat,
  issueToken,
  tokenDisplayPrefix,
} from "../token.ts";

// 검증식을 통과하는 번호(마지막 자리를 직접 계산해 만든 표본)
const VALID = ["1048137225", "2208162517", "1208147521"];

/** 앞 9자리로 검증 자리를 계산한다 — 표본이 맞는지 테스트 안에서도 확인 */
const checkDigit = (nine) => {
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(nine[i]) * w[i];
  s += Math.floor((Number(nine[8]) * 5) / 10);
  return (10 - (s % 10)) % 10;
};

test("체크섬: 정상 표본 통과", () => {
  for (const n of VALID) {
    assert.equal(checkDigit(n.slice(0, 9)), Number(n[9]), `표본 ${n} 자체가 틀렸다`);
    assert.equal(isValidBizNo(n), true, n);
  }
});

test("체크섬: 하이픈 · 공백이 있어도 통과", () => {
  assert.equal(isValidBizNo("104-81-37225"), true);
  assert.equal(isValidBizNo(" 104 81 37225 "), true);
});

test("체크섬: 마지막 자리를 바꾸면 실패", () => {
  for (const n of VALID) {
    const wrong = n.slice(0, 9) + ((Number(n[9]) + 1) % 10);
    assert.equal(isValidBizNo(wrong), false, wrong);
  }
});

test("체크섬: 자릿수가 틀리면 실패", () => {
  assert.equal(isValidBizNo("104813722"), false);
  assert.equal(isValidBizNo("10481372250"), false);
  assert.equal(isValidBizNo(""), false);
  assert.equal(isValidBizNo("abcdefghij"), false);
});

test("형식: 숫자 10자리", () => {
  assert.equal(isBizNoFormat("123-45-67890"), true);
  assert.equal(isBizNoFormat("123-45-6789"), false);
});

test("정규화 · 표시", () => {
  assert.equal(normalizeBizNo("123-45-67890"), "1234567890");
  assert.equal(formatBizNo("1234567890"), "123-45-67890");
  assert.equal(formatBizNo("12345"), "12345");
  assert.equal(formatBizNo(null), "");
});

test("상호 정규화: 앞뒤 공백만 걷고 (주) · 주식회사 표기는 그대로", () => {
  assert.equal(normalizeBusinessName("  (주)스타일매치  "), "(주)스타일매치");
  assert.equal(normalizeBusinessName("주식회사   스타일매치"), "주식회사 스타일매치");
  assert.equal(normalizeBusinessName(undefined), "");
});

test("토큰: stmx_live_ + base62 43자, 매번 다르다", () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const t = generateToken();
    assert.ok(t.startsWith(TOKEN_PREFIX));
    assert.equal(t.length, TOKEN_PREFIX.length + 43);
    assert.match(t.slice(TOKEN_PREFIX.length), /^[0-9A-Za-z]{43}$/);
    assert.equal(isTokenFormat(t), true);
    seen.add(t);
  }
  assert.equal(seen.size, 200);
});

test("토큰 형식 검사: 접두어 · 길이 · 글자", () => {
  const t = generateToken();
  assert.equal(isTokenFormat(t.replace("stmx_live_", "stmx_test_")), false);
  assert.equal(isTokenFormat(t.slice(0, -1)), false);
  assert.equal(isTokenFormat(t.slice(0, -1) + "-"), false);
  assert.equal(isTokenFormat(""), false);
});

test("해시: sha256 hex, 같은 토큰은 같은 해시", () => {
  const t = generateToken();
  const h = hashToken(t);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, createHash("sha256").update(t).digest("hex"));
  assert.equal(hashToken(t), h);
  assert.notEqual(hashToken(generateToken()), h);
});

test("발급: DB 열에는 평문이 없고 해시로 검증된다", () => {
  const { token, columns } = issueToken();
  assert.equal(columns.token_hash, hashToken(token));
  assert.equal(columns.token_prefix, tokenDisplayPrefix(token));
  assert.equal(columns.token_prefix.length, TOKEN_PREFIX.length + 4);
  assert.equal(columns.token_last_used_at, null);
  for (const v of Object.values(columns)) {
    assert.ok(v === null || !String(v).includes(token.slice(TOKEN_PREFIX.length)), "평문이 열에 남았다");
  }
  // 재발급하면 이전 해시와 겹치지 않는다(이전 토큰 무효)
  const next = issueToken();
  assert.notEqual(next.columns.token_hash, columns.token_hash);
  assert.notEqual(hashToken(token), next.columns.token_hash);
});
