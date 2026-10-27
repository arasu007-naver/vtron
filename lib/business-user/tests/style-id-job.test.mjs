/**
 * 스타일 아이디 작업 헬퍼 (lib/business-user/style-id-job.ts) — 이미지 삭제 시점 · 응답 모양 · Idempotency-Key
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test lib/business-user/tests/style-id-job.test.mjs
 *
 * Node 22.18+ 는 .ts 의 타입을 지우고 바로 읽는다. 외부 호출 없음.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEAD_ERROR,
  DEFAULT_DEAD_IMAGE_RETENTION_DAYS,
  TERMINAL_STATUSES,
  deletesImageNow,
  isIdempotencyKey,
  jobImagePath,
  jobView,
} from "../style-id-job.ts";

test("succeeded · failed 는 이미지를 바로 지우고, dead 는 다시 실행할 수 있도록 남긴다", () => {
  assert.equal(deletesImageNow("succeeded"), true);
  assert.equal(deletesImageNow("failed"), true);
  assert.equal(deletesImageNow("dead"), false);
  assert.equal(deletesImageNow("queued"), false);
  assert.equal(deletesImageNow("running"), false);
  assert.ok(TERMINAL_STATUSES.includes("dead"));
  assert.equal(DEFAULT_DEAD_IMAGE_RETENTION_DAYS, 7);
});

const row = (over) => ({
  id: "11111111-1111-1111-1111-111111111111",
  status: "queued",
  image_sha256: "abc",
  product_name: null,
  product_category: null,
  attempts: 0,
  max_attempts: 5,
  next_run_at: "2026-10-27T00:00:00Z",
  result: null,
  created_at: "2026-10-27T00:00:00Z",
  started_at: null,
  finished_at: null,
  ...over,
});

test("jobView — succeeded 는 result, failed 는 result.error, dead 는 일반 문구", () => {
  const body = { ok: true, style_id: "ETSM" };
  assert.deepEqual(jobView(row({ status: "succeeded", result: body })).result, body);
  assert.equal(jobView(row({ status: "succeeded", result: body })).error, null);

  const failed = jobView(row({ status: "failed", result: { ok: false, error: "의복 없음" } }));
  assert.equal(failed.result, null);
  assert.equal(failed.error, "의복 없음");

  assert.equal(jobView(row({ status: "dead", result: { secret: 1 } })).result, null);
  assert.equal(jobView(row({ status: "dead" })).error, DEAD_ERROR);
});

test("jobView — 재시도 대기 중일 때만 next_run_at 을 보인다", () => {
  assert.equal(jobView(row({ attempts: 0 })).next_run_at, null);
  assert.equal(jobView(row({ attempts: 2 })).next_run_at, "2026-10-27T00:00:00Z");
  assert.equal(jobView(row({ status: "running", attempts: 2 })).next_run_at, null);
});

test("Idempotency-Key — 보이는 ASCII 1–200자", () => {
  assert.equal(isIdempotencyKey("order-123_A:b"), true);
  assert.equal(isIdempotencyKey("x".repeat(200)), true);
  assert.equal(isIdempotencyKey("x".repeat(201)), false);
  assert.equal(isIdempotencyKey(""), false);
  assert.equal(isIdempotencyKey("has space"), false);
  assert.equal(isIdempotencyKey("한글"), false);
});

test("작업 이미지 경로 — 업체 폴더 / 작업 id . 확장자", () => {
  assert.equal(jobImagePath("biz", "job", "image/webp"), "biz/job.webp");
});
