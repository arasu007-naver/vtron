import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { normalizeBizNo, normalizeBusinessName } from "@/lib/business-user/biz-no";
import { issueToken } from "@/lib/business-user/token";
import { isEmail } from "@/lib/business-user/mailer";
import {
  DETAIL_COLUMNS,
  LIST_COLUMNS,
  TABLE,
  actorUserId,
  audit,
  bizNoProblem,
  checkBizNo,
  jsonError,
  sanitizeSearch,
} from "@/lib/business-user/server";
import { BUSINESS_USER_STATUSES, type BusinessUserStatus } from "@/types/business-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/business-users?q=&status=&page=&pageSize=
 * 지우지 않은 업체 목록. q 는 상호(부분 일치) 또는 사업자번호(숫자 부분 일치).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const url = req.nextUrl;
    const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
    const rawPageSize = Math.trunc(Number(url.searchParams.get("pageSize") ?? "20")) || 20;
    const pageSize = Math.min(Math.max(1, rawPageSize), 100);
    const status = url.searchParams.get("status")?.trim() || "all";
    const q = sanitizeSearch(url.searchParams.get("q") ?? "");

    const supabase = getAdminSupabase();
    let query = supabase
      .from(TABLE)
      .select(LIST_COLUMNS, { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (BUSINESS_USER_STATUSES.includes(status as BusinessUserStatus)) {
      query = query.eq("status", status);
    }
    if (q) {
      const digits = normalizeBizNo(q);
      query = digits
        ? query.or(`business_name.ilike.%${q}%,business_number.like.%${digits}%`)
        : query.ilike("business_name", `%${q}%`);
    }

    const from = (page - 1) * pageSize;
    const { data, count, error } = await query.range(from, from + pageSize - 1);
    if (error) return jsonError(error.message, 500, { items: [], total: 0 });

    const total = count || 0;
    return NextResponse.json({
      items: data || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("/api/admin/business-users GET error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500, { items: [], total: 0 });
  }
}

/**
 * POST /api/admin/business-users
 * 관리자가 확인한 추출 결과를 저장한다. status 가 active 면 토큰을 발급해 평문을 이 응답에서 한 번만 돌려준다.
 * body: { business_name, business_number, contact_email(활성이면 필수), status?, status_reason?, doc_path?, ocr_raw?, memo? }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const businessName = normalizeBusinessName(typeof body.business_name === "string" ? body.business_name : "");
  const businessNumber = normalizeBizNo(typeof body.business_number === "string" ? body.business_number : "");
  const status = (typeof body.status === "string" ? body.status : "active") as BusinessUserStatus;
  const statusReason = typeof body.status_reason === "string" ? body.status_reason.trim() || null : null;
  const docPath = typeof body.doc_path === "string" ? body.doc_path.trim() || null : null;
  const memo = typeof body.memo === "string" ? body.memo.trim() || null : null;
  const contactEmail = typeof body.contact_email === "string" ? body.contact_email.trim() || null : null;

  if (!businessName) return jsonError("상호를 입력하세요.", 400);
  if (contactEmail && !isEmail(contactEmail)) return jsonError("담당자 이메일 형식이 올바르지 않습니다.", 400);
  if (status === "active" && !contactEmail) return jsonError("활성(API 키 발급)으로 저장하려면 담당자 이메일이 필요합니다.", 400);
  if (!BUSINESS_USER_STATUSES.includes(status)) return jsonError("status 가 올바르지 않습니다.", 400);
  if (status === "suspended") return jsonError("새 업체를 정지 상태로 만들 수 없습니다.", 400);
  if (docPath && (docPath.includes("..") || docPath.startsWith("/"))) {
    return jsonError("doc_path 가 올바르지 않습니다.", 400);
  }

  try {
    const supabase = getAdminSupabase();
    const checks = await checkBizNo(supabase, businessNumber);
    const problem = bizNoProblem(checks, status);
    if (problem) return jsonError(problem, checks.duplicate ? 409 : 422, { checks });

    const issued = status === "active" ? issueToken() : null;
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        business_name: businessName,
        business_number: businessNumber,
        contact_email: contactEmail,
        status,
        status_reason: statusReason,
        doc_path: docPath,
        ocr_raw: body.ocr_raw ?? null,
        memo,
        created_by: actorUserId(auth),
        ...(issued?.columns ?? {}),
      })
      .select(DETAIL_COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonError("같은 사업자등록번호로 등록된 업체가 이미 있습니다.", 409);
      }
      return jsonError(error.message, 500);
    }

    await audit(supabase, auth, "create", data.id, {
      business_name: businessName,
      business_number: businessNumber,
      contact_email: contactEmail,
      status,
      status_reason: statusReason,
      doc_path: docPath,
      token_prefix: issued?.columns.token_prefix ?? null,
    });

    return NextResponse.json({ item: data, token: issued?.token ?? null }, { status: 201 });
  } catch (error) {
    console.error("/api/admin/business-users POST error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
