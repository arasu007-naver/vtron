/** node --test test/creator-tag/core.test.mjs */
import assert from "node:assert/strict";
import { test } from "node:test";
import { bearerMatches, checkImage, isUnreadable, matchBrand, parseSearchBody } from "../../lib/creator-tag/core.ts";

test("인증: 헤더 없음 / 틀린 Bearer / secret 미설정 → false", () => {
  assert.equal(bearerMatches(null, "s3cret"), false);
  assert.equal(bearerMatches("Bearer wrong", "s3cret"), false);
  assert.equal(bearerMatches("Bearer s3cret", undefined), false);
  assert.equal(bearerMatches("Bearer s3cret", ""), false);
  assert.equal(bearerMatches("Bearer s3cret", "s3cret"), true);
});

test("이미지: 5MB 초과 413, 형식 오류 415", () => {
  assert.deepEqual(checkImage({ size: 5 * 1024 * 1024 + 1, type: "image/png" }).status, 413);
  assert.equal(checkImage({ size: 10, type: "image/gif" }).status, 415);
  assert.equal(checkImage({ size: 10, type: "image/jpeg" }).ok, true);
});

test("422: 네 필드가 모두 null 이면 판독 불가", () => {
  const none = { brandName: null, productName: null, styleCode: null, barcode: null };
  assert.equal(isUnreadable(none), true);
  assert.equal(isUnreadable({ ...none, barcode: "123" }), false);
});

test("findBrand 매칭: aliases · is_active=false 브랜드", () => {
  const rows = [
    { id: "1", display_name: "Other" },
    { id: "2", display_name: "나이키", naver_brand_name: "NIKE", aliases: ["Nike Korea"], is_active: false },
  ];
  assert.equal(matchBrand(rows, " Ni-ke ")?.id, "2");
  assert.equal(matchBrand(rows, "nike-korea")?.id, "2");
  assert.equal(matchBrand(rows, "adidas"), null);
});

test("/search 검증: 필수 필드와 길이 제한", () => {
  assert.equal(parseSearchBody({ brandName: "Nike" }).ok, false);
  assert.equal(parseSearchBody({ brandName: "Nike", productName: " ", styleCode: null }).ok, false);
  assert.equal(parseSearchBody({ brandName: "", productName: "x" }).ok, false);
  assert.equal(parseSearchBody({ brandName: "a".repeat(101), productName: "x" }).ok, false);
  assert.equal(parseSearchBody({ brandName: "a", productName: "x".repeat(301) }).ok, false);
  assert.equal(parseSearchBody({ brandName: "a", styleCode: "x".repeat(65) }).ok, false);
  assert.equal(parseSearchBody({ brandName: "a", barcode: "x".repeat(65) }).ok, false);
  assert.equal(parseSearchBody({ brandName: "a", barcode: "880" }).ok, true);
});
