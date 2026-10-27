import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { hashToken, isTokenFormat } from "@/lib/business-user/token";
import { hasSmtpEnv, isEmail, sendTokenMail } from "@/lib/business-user/mailer";
import { TABLE, audit, isUuid, jsonError } from "@/lib/business-user/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/business-users/:id/send-token   body: { token, to }
 * 방금 발급 · 재발급한 평문 토큰을 담당자에게 메일로 보낸다. 서버는 평문을 갖고 있지 않으므로 화면이 넘겨준다.
 * 넘어온 토큰이 이 업체의 **현재** 토큰(해시 일치)일 때만 보낸다 — 아무 문자열이나, 재발급 전 토큰은 보내지 않는다.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!isTokenFormat(token)) return jsonError("토큰 형식이 올바르지 않습니다.", 400);
  if (!isEmail(to)) return jsonError("받는 이메일 주소가 올바르지 않습니다.", 400);
  if (!hasSmtpEnv()) return jsonError("메일 발송 설정(SMTP_*)이 없습니다.", 503);

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, business_name, status, token_hash, token_prefix")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError("업체를 찾을 수 없습니다.", 404);
    if (data.status !== "active") return jsonError("활성 업체에만 보낼 수 있습니다.", 409);
    if (!data.token_hash || !sameHash(data.token_hash, hashToken(token))) {
      return jsonError("이 업체의 현재 토큰이 아닙니다. 재발급됐거나 폐기된 토큰입니다.", 409);
    }

    try {
      await sendTokenMail(to, data.business_name, token);
    } catch (err) {
      // SMTP 오류 메시지에 본문이 섞이지 않게 코드 · 응답 코드만 남긴다
      const e = err as { code?: string; responseCode?: number };
      console.error("[api-mng] token mail failed:", e.code ?? "", e.responseCode ?? "");
      await audit(supabase, auth, "send_token_failed", id, { to, token_prefix: data.token_prefix, code: e.code ?? null });
      return jsonError("메일을 보내지 못했습니다. SMTP 설정을 확인하세요.", 502);
    }

    await audit(supabase, auth, "send_token", id, { to, token_prefix: data.token_prefix });
    return NextResponse.json({ ok: true, to });
  } catch (error) {
    console.error("send-token error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}
