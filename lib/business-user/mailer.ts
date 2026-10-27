/**
 * API 키 메일 — Supabase Auth 의 사용자 지정 SMTP 와 같은 계정으로 보낸다.
 *
 * Supabase 대시보드 → Authentication → Emails → SMTP Settings 의 값을 서버 환경변수로 옮겨 둔다.
 *   SMTP_HOST · SMTP_PORT(기본 465) · SMTP_USER · SMTP_PASS · SMTP_FROM(예: "STMX Service Manager <no-reply-stmx@qoolla.com>")
 *   SMTP_SECURE  465 가 아닌 포트에서 TLS 로 바로 붙어야 하면 "true"(587 은 STARTTLS 라 비워 둔다)
 *
 * 토큰 평문이 메일 본문에 실린다 — 스펙의 "평문은 발급 응답에서 한 번만" 에 대한 예외로, 관리자가 버튼으로
 * 보낼 때만 쓴다. 로그에 본문 · 토큰을 찍지 않는다.
 */
import nodemailer, { type Transporter } from "nodemailer";

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const hasSmtpEnv = () =>
  Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.SMTP_FROM?.trim()
  );

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // 메시지에 파일 · URL 을 끌어오지 않는다
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transporter;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildTokenMail(businessName: string, token: string) {
  const subject = `[STMX] ${businessName.replace(/[\r\n]+/g, " ")} API 키 안내`;
  const text = [
    `${businessName} 담당자님, 안녕하세요.`,
    "",
    "STMX API 키를 발급해 드립니다.",
    "",
    `API 키: ${token}`,
    "",
    "요청 헤더에 아래처럼 넣어 호출하세요.",
    `  Authorization: Bearer ${token}`,
    "",
    "· 이 키는 비밀번호처럼 다뤄 주세요. 코드 저장소 · 공개된 곳에 올리지 마세요.",
    "· STMX 는 키를 다시 보여 드릴 수 없습니다. 잃어버리면 재발급을 요청해 주세요(이전 키는 즉시 무효).",
    "· 이 메일을 받은 뒤 안전한 곳에 옮기고 메일은 지우시길 권합니다.",
    "",
    "STMX Service Manager",
  ].join("\n");

  const name = escapeHtml(businessName);
  const html = `<div style="font-family:Pretendard,-apple-system,'Apple SD Gothic Neo',sans-serif;color:#101317;font-size:14px;line-height:1.6;max-width:560px">
  <p>${name} 담당자님, 안녕하세요.</p>
  <p>STMX API 키를 발급해 드립니다.</p>
  <div style="margin:16px 0;padding:14px 16px;border-radius:10px;background:#101317;color:#F8F9FA;font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all">${escapeHtml(token)}</div>
  <p>요청 헤더에 아래처럼 넣어 호출하세요.</p>
  <pre style="padding:10px 12px;border-radius:8px;background:#F8F9FA;border:1px solid #E0E3E8;font-size:12px;white-space:pre-wrap;word-break:break-all">Authorization: Bearer ${escapeHtml(token)}</pre>
  <ul style="padding-left:18px;color:#555A64;font-size:13px">
    <li>이 키는 비밀번호처럼 다뤄 주세요. 코드 저장소 · 공개된 곳에 올리지 마세요.</li>
    <li>STMX 는 키를 다시 보여 드릴 수 없습니다. 잃어버리면 재발급을 요청해 주세요(이전 키는 즉시 무효).</li>
    <li>이 메일을 받은 뒤 안전한 곳에 옮기고 메일은 지우시길 권합니다.</li>
  </ul>
  <p style="color:#717680">STMX Service Manager</p>
</div>`;

  return { subject, text, html };
}

export async function sendTokenMail(to: string, businessName: string, token: string): Promise<void> {
  if (!hasSmtpEnv()) throw new Error("SMTP_HOST · SMTP_USER · SMTP_PASS · SMTP_FROM 환경변수가 없습니다.");
  const mail = buildTokenMail(businessName, token);
  await getTransporter().sendMail({ from: process.env.SMTP_FROM, to, ...mail });
}
