import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { normalizeBizNo, normalizeBusinessName } from "@/lib/business-user/biz-no";
import { isEmail } from "@/lib/business-user/mailer";
import {
  DETAIL_COLUMNS,
  REVOKED_TOKEN_COLUMNS,
  TABLE,
  audit,
  bizNoProblem,
  checkBizNo,
  diffOf,
  isUuid,
  jsonError,
} from "@/lib/business-user/server";
import { BUSINESS_USER_STATUSES, type BusinessUserStatus } from "@/types/business-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 토큰을 가질 수 없는 상태 — 이 상태로 바꾸면 토큰을 폐기한다 */
const TOKENLESS: BusinessUserStatus[] = ["pending_review", "rejected"];

/** GET /api/admin/business-users/:id — 상세(토큰은 prefix 만) */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("업체를 찾을 수 없습니다.", 404);
  return NextResponse.json({ item: data });
}

/**
 * PATCH /api/admin/business-users/:id
 * body: { business_name?, business_number?, contact_email?, status?, status_reason?, memo? }
 * 번호를 바꾸거나 활성으로 바꾸면 형식 · 체크섬 · 중복을 다시 본다.
 * 검토 대기 · 반려로 바꾸면 토큰을 폐기한다(정지는 토큰을 남기고 API 만 403).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const supabase = getAdminSupabase();
    const { data: current, error: readError } = await supabase
      .from(TABLE)
      .select("id, business_name, business_number, contact_email, status, status_reason, memo, token_prefix")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError) return jsonError(readError.message, 500);
    if (!current) return jsonError("업체를 찾을 수 없습니다.", 404);

    const patch: Record<string, unknown> = {};
    if (typeof body.business_name === "string") {
      const name = normalizeBusinessName(body.business_name);
      if (!name) return jsonError("상호를 입력하세요.", 400);
      patch.business_name = name;
    }
    if (typeof body.business_number === "string") {
      patch.business_number = normalizeBizNo(body.business_number);
    }
    if (typeof body.status === "string") {
      if (!BUSINESS_USER_STATUSES.includes(body.status as BusinessUserStatus)) {
        return jsonError("status 가 올바르지 않습니다.", 400);
      }
      patch.status = body.status;
    }
    if ("status_reason" in body) {
      patch.status_reason = typeof body.status_reason === "string" ? body.status_reason.trim() || null : null;
    }
    if ("contact_email" in body) {
      const email = typeof body.contact_email === "string" ? body.contact_email.trim() || null : null;
      if (email && !isEmail(email)) return jsonError("담당자 이메일 형식이 올바르지 않습니다.", 400);
      patch.contact_email = email;
    }
    if ("memo" in body) {
      patch.memo = typeof body.memo === "string" ? body.memo.trim() || null : null;
    }

    const changes = diffOf(current, patch);
    if (!Object.keys(changes).length) return NextResponse.json({ item: current, changed: false });

    const nextStatus = (patch.status ?? current.status) as BusinessUserStatus;
    const nextNumber = (patch.business_number ?? current.business_number) as string;
    const nextEmail = ("contact_email" in patch ? patch.contact_email : current.contact_email) as string | null;
    if (nextStatus === "active" && !nextEmail && (changes.status || changes.contact_email)) {
      return jsonError("활성 업체는 담당자 이메일이 필요합니다.", 400);
    }
    if (changes.business_number || (changes.status && nextStatus === "active")) {
      const checks = await checkBizNo(supabase, nextNumber, id);
      const problem = bizNoProblem(checks, nextStatus);
      if (problem) return jsonError(problem, checks.duplicate ? 409 : 422, { checks });
    }

    const revoke = Boolean(changes.status && TOKENLESS.includes(nextStatus) && current.token_prefix);
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, ...(revoke ? REVOKED_TOKEN_COLUMNS : {}) })
      .eq("id", id)
      .is("deleted_at", null)
      .select(DETAIL_COLUMNS)
      .maybeSingle();

    if (error) {
      if (error.code === "23505") return jsonError("같은 사업자등록번호로 등록된 업체가 이미 있습니다.", 409);
      return jsonError(error.message, 500);
    }
    if (!data) return jsonError("업체를 찾을 수 없습니다.", 404);

    await audit(supabase, auth, "update", id, {
      ...changes,
      ...(revoke ? { token_revoked: { from: current.token_prefix, to: null } } : {}),
    });
    return NextResponse.json({ item: data, changed: true });
  } catch (error) {
    console.error("/api/admin/business-users/[id] PATCH error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}

/** DELETE /api/admin/business-users/:id — soft delete + 토큰 폐기. 등록증 원본은 남긴다. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString(), ...REVOKED_TOKEN_COLUMNS })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id, business_name, business_number, status")
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError("업체를 찾을 수 없습니다.", 404);

    await audit(supabase, auth, "delete", id, {
      business_name: data.business_name,
      business_number: data.business_number,
      status: data.status,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/admin/business-users/[id] DELETE error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
