/**
 * API 키 메일 본문 (lib/business-user/mailer.ts) — 실제 발송은 하지 않는다.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test lib/business-user/tests/mailer.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTokenMail, isEmail } from "../mailer.ts";
import { generateToken } from "../token.ts";

test("본문에 토큰과 Authorization 헤더 예시가 실린다", () => {
  const token = generateToken();
  const { subject, text, html } = buildTokenMail("(주)스타일매치", token);
  assert.equal(subject, "[STMX] (주)스타일매치 API 키 안내");
  assert.ok(text.includes(`API 키: ${token}`));
  assert.ok(text.includes(`Authorization: Bearer ${token}`));
  assert.ok(html.includes(token));
  assert.ok(text.trimEnd().endsWith("STMX Service Manager"));
});

test("상호의 HTML 은 이스케이프하고, 제목의 줄바꿈은 걷는다(헤더 주입 방지)", () => {
  const { subject, html } = buildTokenMail('<b>A&B</b>\r\nBcc: x@evil.test', generateToken());
  assert.ok(!/[\r\n]/.test(subject));
  assert.ok(html.includes("&lt;b&gt;A&amp;B&lt;/b&gt;"));
  assert.ok(!html.includes("<b>A&B</b>"));
});

test("이메일 형식", () => {
  assert.equal(isEmail("dev@stmx.co.kr"), true);
  assert.equal(isEmail("dev@stmx"), false);
  assert.equal(isEmail("a b@stmx.co.kr"), false);
  assert.equal(isEmail(""), false);
});
