/** node --test test/creator-tag/rank.test.mjs */
import assert from "node:assert/strict";
import { test } from "node:test";
import { brandKey } from "../../lib/creator-tag/rank.ts";
import { filterAndRank, collectCandidates } from "../../lib/creator-tag/rank.ts";

const item = (o) => ({
  title: "Nike 에어 ", link: "https://smartstore.naver.com/shop/products/1", image: "i", lprice: "10000",
  mallName: "m", productId: "1", productType: "2", brand: "나이키", maker: "", ...o,
});

test("브랜드 키 정규화", () => {
  assert.equal(brandKey("NIKE"), "nike");
  assert.equal(brandKey("nike"), "nike");
  assert.equal(brandKey(" Ni-ke "), "nike");
});

test("URL · productType · 빈 값 필터", () => {
  const items = [
    item({ productId: "1" }),
    item({ productId: "2", link: "https://search.shopping.naver.com/catalog/2" }),
    item({ productId: "3", link: "https://brand.naver.com/nike/products/3" }),
    item({ productId: "4", link: "https://smartstore.naver.com/a/products/4", productType: "4" }),
    item({ productId: "5", link: "https://other.com/products/5" }),
    item({ productId: "", link: "https://smartstore.naver.com/a/products/6" }),
    item({ productId: "7", link: "https://smartstore.naver.com/a/products/abc" }),
  ];
  const out = filterAndRank(items, { brandTerms: ["나이키"], styleCode: null });
  assert.deepEqual(out.map((c) => c.productId), ["1", "3"]);
});

test("브랜드 불일치 제외, 품번 포함 우선", () => {
  const items = [
    item({ productId: "1" }),
    item({ productId: "2", brand: "아디다스", title: "adidas" }),
    item({ productId: "3", link: "https://smartstore.naver.com/a/products/3", title: "나이키 AB-123", brand: "" }),
  ];
  const out = filterAndRank(items, { brandTerms: ["나이키", "nike"], styleCode: "ab123" });
  assert.deepEqual(out.map((c) => c.productId), ["3", "1"]);
  assert.equal(out[0].price, 10000);
});

test("호출 3회 상한 · 5개 중단 · 중복 제거", async () => {
  let calls = 0;
  const mk = (n) => item({ productId: String(n), link: `https://smartstore.naver.com/a/products/${n}` });
  const search = async () => { calls++; return [mk(1), mk(2), mk(2), mk(3)]; };
  const r = await collectCandidates({ brandName: "나이키", productName: "x", styleCode: "s", barcode: "b", brandTerms: ["나이키"] }, search);
  assert.equal(calls, 3);
  assert.deepEqual(r.map((c) => c.productId), ["1", "2", "3"]);

  calls = 0;
  const search2 = async () => { calls++; return [1, 2, 3, 4, 5, 6].map(mk); };
  const r2 = await collectCandidates({ brandName: "나이키", productName: "x", styleCode: "s", barcode: "b", brandTerms: ["나이키"] }, search2);
  assert.equal(calls, 1);
  assert.equal(r2.length, 5);
});

test("값 있는 쿼리만", async () => {
  const qs = [];
  await collectCandidates({ brandName: "나이키", productName: null, styleCode: null, barcode: "880", brandTerms: [] }, async (q) => { qs.push(q); return []; });
  assert.deepEqual(qs, ["880"]);
});
