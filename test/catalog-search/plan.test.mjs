/**
 * `node --test test/catalog-search/plan.test.mjs` — Node 24 는 가져온 .ts 의 타입을 벗겨 바로 돌린다.
 * `@/` 별칭이 없어 상대 경로로 읽는다.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSearch, toSearchChoseong, isChoseongOnly } from "../../lib/hangul.ts";

test("검색 컬럼 — 설계 4.1 의 예", () => {
  const text = normalizeSearch("[리바이스] 트러커 재킷 85748-0289");
  assert.equal(text, "[리바이스]트러커재킷857480289");
  assert.equal(normalizeSearch("리바이스 트러커 재킷 85748-0289"), "리바이스트러커재킷857480289");
  assert.equal(toSearchChoseong("리바이스 트러커 재킷 85748-0289"), "ㄹㅂㅇㅅㅌㄹㅋㅈㅋ857480289");
});

test("쌍자음은 평음으로 접는다", () => {
  assert.equal(toSearchChoseong("까사 떡볶이"), "ㄱㅅㄷㅂㅇ");
});

test("품번 — 하이픈 · 대소문자 무시", () => {
  assert.equal(normalizeSearch("CW2288-111"), normalizeSearch("cw2288111"));
});

test("자모로만 된 토큰", () => {
  assert.equal(isChoseongOnly("ㅇㅇㅍㅅ"), true);
  assert.equal(isChoseongOnly("에ㅇㅍㅅ"), false);
  assert.equal(isChoseongOnly("ㅇ1"), false);
});
