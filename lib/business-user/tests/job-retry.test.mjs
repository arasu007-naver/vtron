/**
 * 스타일 아이디 작업 재시도 규칙 (lib/business-user/job-retry.ts) · 동기 엔드포인트 세마포어 (lib/business-user/semaphore.ts)
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test lib/business-user/tests/job-retry.test.mjs
 *
 * Node 22.18+ 는 .ts 의 타입을 지우고 바로 읽는다. 외부 호출 없음.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backoffMs,
  classifyFailure,
  errorInfoOf,
  parseRetryAfter,
  statusFromMessage,
} from "../job-retry.ts";
import { createSemaphore } from "../semaphore.ts";

// ── 오류 분류 ────────────────────────────────────────────────────────────────

test("Anthropic 429 · 529 · 5xx · 408 · 409 는 재시도", () => {
  for (const status of [429, 529, 500, 502, 503, 504, 408, 409]) {
    assert.equal(classifyFailure({ status }).retryable, true, `status ${status}`);
  }
});

test("4xx 입력 오류는 재시도하지 않는다 (401 · 403 은 우리 키 설정 문제라 재시도)", () => {
  for (const status of [400, 404, 413, 415, 422]) {
    assert.equal(classifyFailure({ status }).retryable, false, `status ${status}`);
  }
  assert.equal(classifyFailure({ status: 401 }).retryable, true);
  assert.equal(classifyFailure({ status: 403 }).retryable, true);
});

test("엔진이 문자열로 바꾼 SDK 오류 — 메시지 앞 HTTP 상태를 읽는다", () => {
  assert.equal(statusFromMessage('429 {"type":"error","error":{"type":"rate_limit_error"}}'), 429);
  assert.equal(statusFromMessage("관찰 출력이 잘렸습니다"), null);
  assert.equal(
    classifyFailure({ code: "VISION_CALL_FAILED", message: '529 {"type":"error","error":{"type":"overloaded_error"}}' }).retryable,
    true
  );
  assert.equal(
    classifyFailure({ code: "VISION_CALL_FAILED", message: '400 {"type":"error","error":{"type":"invalid_request_error"}}' })
      .retryable,
    false
  );
});

test("타임아웃 · 네트워크 오류는 재시도", () => {
  assert.deepEqual(classifyFailure({ code: "VISION_TIMEOUT", message: "vision timeout" }), {
    retryable: true,
    reason: "timeout",
  });
  for (const code of ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_SOCKET"]) {
    assert.equal(classifyFailure({ code }).retryable, true, code);
  }
  for (const name of ["APIConnectionError", "APIConnectionTimeoutError", "RateLimitError", "InternalServerError"]) {
    assert.equal(classifyFailure({ name }).retryable, true, name);
  }
  assert.equal(classifyFailure({ code: "VISION_CALL_FAILED", message: "Connection error." }).retryable, true);
  assert.equal(classifyFailure({ code: "VISION_CALL_FAILED", message: "Request timed out." }).retryable, true);
  assert.equal(classifyFailure({ message: "TypeError: fetch failed" }).retryable, true);
});

test("관찰 출력이 잘리거나 깨진 것 · 알 수 없는 오류는 재시도하지 않는다", () => {
  assert.equal(
    classifyFailure({ code: "VISION_CALL_FAILED", message: "관찰 출력이 max_tokens 에서 잘렸습니다." }).retryable,
    false
  );
  assert.deepEqual(classifyFailure({ code: "UNPARSEABLE_RESPONSE", message: "model output not parseable as JSON" }), {
    retryable: false,
    reason: "permanent_UNPARSEABLE_RESPONSE",
  });
  assert.equal(classifyFailure({ message: "Cannot read properties of undefined" }).retryable, false);
});

test("우리 쪽 인프라 오류(infra)는 늘 재시도", () => {
  assert.deepEqual(classifyFailure({ infra: true, status: 400 }), { retryable: true, reason: "infra" });
});

test("errorInfoOf — APIError 모양(status · headers · 클래스 이름)과 Node 오류(cause.code)", () => {
  class RateLimitError extends Error {
    constructor() {
      super('429 {"type":"error"}');
      this.status = 429;
      this.headers = new Headers({ "retry-after": "12" });
    }
  }
  const info = errorInfoOf(new RateLimitError());
  assert.equal(info.status, 429);
  assert.equal(info.name, "RateLimitError");
  assert.equal(info.retryAfterMs, 12_000);
  assert.equal(classifyFailure(info).retryable, true);

  const net = errorInfoOf(Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }));
  assert.equal(net.code, "ECONNRESET");
  assert.equal(net.name, "TypeError");
  assert.equal(classifyFailure(net).retryable, true);

  assert.equal(errorInfoOf("boom").message, "boom");
  assert.equal(errorInfoOf(new Error("x")).name, "Error");
});

// ── retry-after ──────────────────────────────────────────────────────────────

test("parseRetryAfter — 초 · 소수 초 · HTTP 날짜 · retry-after-ms 우선 · 못 읽으면 null", () => {
  assert.equal(parseRetryAfter("30"), 30_000);
  assert.equal(parseRetryAfter("1.5"), 1_500);
  assert.equal(parseRetryAfter("30", "250"), 250);
  const now = Date.parse("2026-10-24T00:00:00Z");
  assert.equal(parseRetryAfter("Sat, 24 Oct 2026 00:00:45 GMT", null, now), 45_000);
  assert.equal(parseRetryAfter("Fri, 23 Oct 2026 00:00:00 GMT", null, now), 0);
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter(""), null);
  assert.equal(parseRetryAfter("soon"), null);
  assert.equal(parseRetryAfter("-5"), null);
});

// ── 백오프 ───────────────────────────────────────────────────────────────────

const opts = (r) => ({ baseMs: 1000, capMs: 60_000, random: () => r });

test("지수 백오프 — 지터 범위는 [exp/2, exp]", () => {
  // exp = 1000, 2000, 4000, 8000 …
  assert.equal(backoffMs(1, null, opts(0)), 500);
  assert.equal(backoffMs(1, null, opts(0.999999)), 1000);
  assert.equal(backoffMs(2, null, opts(0)), 1000);
  assert.equal(backoffMs(3, null, opts(0.5)), 3000);
  assert.equal(backoffMs(4, null, opts(0)), 4000);
});

test("백오프 상한 — 큰 attempt 도 cap 을 넘지 않는다", () => {
  assert.equal(backoffMs(7, null, opts(0.999999)), 60_000);
  assert.equal(backoffMs(100, null, opts(0.999999)), 60_000);
  assert.equal(backoffMs(100, null, opts(0)), 30_000);
});

test("attempt 가 0 · 음수 · 소수면 1 로 본다", () => {
  assert.equal(backoffMs(0, null, opts(0)), 500);
  assert.equal(backoffMs(-3, null, opts(0)), 500);
  assert.equal(backoffMs(2.7, null, opts(0)), 1000);
});

test("retry-after 를 존중한다 — 백오프보다 길면 retry-after, 짧으면 백오프. cap·4 를 넘지 않는다", () => {
  assert.equal(backoffMs(1, 20_000, opts(0)), 20_000);
  assert.equal(backoffMs(4, 100, opts(0)), 4000);
  assert.equal(backoffMs(1, 10 * 60 * 60_000, opts(0)), 240_000);
  assert.equal(backoffMs(1, 0, opts(0)), 500);
});

test("기본값 — base 30초 · cap 15분", () => {
  const r = () => 0;
  assert.equal(backoffMs(1, null, { random: r }), 15_000);
  assert.equal(backoffMs(20, null, { random: r }), 450_000);
});

test("지터 — 같은 attempt 라도 값이 흩어진다", () => {
  const seen = new Set(Array.from({ length: 50 }, () => backoffMs(3, null, { baseMs: 1000, capMs: 60_000 })));
  assert.ok(seen.size > 10);
  for (const v of seen) assert.ok(v >= 2000 && v <= 4000, String(v));
});

// ── 세마포어 ─────────────────────────────────────────────────────────────────

test("세마포어 — 상한까지만 잡히고, release 는 한 번만 반영된다", () => {
  const sem = createSemaphore(2);
  const a = sem.tryAcquire();
  const b = sem.tryAcquire();
  assert.ok(a && b);
  assert.equal(sem.tryAcquire(), null);
  assert.equal(sem.inUse, 2);
  a();
  a();
  assert.equal(sem.inUse, 1);
  const c = sem.tryAcquire();
  assert.ok(c);
  assert.equal(sem.tryAcquire(), null);
  b();
  c();
  assert.equal(sem.inUse, 0);
  assert.equal(createSemaphore(0).limit, 1);
});
