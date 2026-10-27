/**
 * business_user 서버 헬퍼 — /api/admin/business-users/* 가 같이 쓴다. service role 클라이언트 전용.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/supabase/route";
import type { BizNoChecks, BusinessUserStatus } from "@/types/business-user";
import { isBizNoFormat, isValidBizNo, normalizeBizNo } from "./biz-no";

export const TABLE = "business_user";
export const DOC_BUCKET = "business-docs";
export const SIGNED_URL_TTL_SEC = 60;

/** 응답에 싣는 열 — token_hash · ocr_raw 는 빠진다 */
export const LIST_COLUMNS =
  "id, business_name, business_number, contact_email, status, status_reason, doc_path, nts_status, token_prefix, token_issued_at, token_last_used_at, memo, created_by, created_at, updated_at";
export const DETAIL_COLUMNS = `${LIST_COLUMNS}, ocr_raw`;

/** 토큰 폐기 시 비우는 열 */
export const REVOKED_TOKEN_COLUMNS = {
  token_hash: null,
  token_prefix: null,
  token_issued_at: null,
  token_last_used_at: null,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/** created_by 에 넣을 사용자 id — 서버 키로 부른 경우(service-role-admin)는 null */
export const actorUserId = (auth: AuthContext) => (isUuid(auth.user.id) ? auth.user.id : null);

export const jsonError = (message: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: message, ...extra }, { status });

/** 번호 형식 · 체크섬 · 중복(지우지 않은 다른 행) */
export async function checkBizNo(
  supabase: SupabaseClient,
  input: string,
  excludeId?: string
): Promise<BizNoChecks> {
  const number = normalizeBizNo(input);
  const format = isBizNoFormat(number);
  const checks: BizNoChecks = { format, checksum: format && isValidBizNo(number), duplicate: false, duplicate_of: null };
  if (!format) return checks;

  let query = supabase
    .from(TABLE)
    .select("id, business_name, status")
    .eq("business_number", number)
    .is("deleted_at", null)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new Error(`중복 확인 실패: ${error.message}`);
  const hit = data?.[0] as { id: string; business_name: string; status: BusinessUserStatus } | undefined;
  if (hit) {
    checks.duplicate = true;
    checks.duplicate_of = hit;
  }
  return checks;
}

/** 저장 가능한지 — 활성(토큰 발급)으로 두려면 체크섬까지 통과해야 한다 */
export function bizNoProblem(checks: BizNoChecks, status: BusinessUserStatus): string | null {
  if (!checks.format) return "사업자등록번호는 숫자 10자리여야 합니다.";
  if (checks.duplicate) return "같은 사업자등록번호로 등록된 업체가 이미 있습니다.";
  if (status === "active" && !checks.checksum) {
    return "사업자등록번호 검증식을 통과하지 못해 활성으로 둘 수 없습니다. 검토 대기 · 반려로 저장하세요.";
  }
  return null;
}

/**
 * 감사 로그 — 실패해도 본 작업은 되돌리지 않고 서버 로그만 남긴다.
 * diff 에 토큰 평문 · 해시를 넣지 않는다(호출하는 쪽 책임, 여기서도 한 번 걷는다).
 */
export async function audit(
  supabase: SupabaseClient,
  auth: AuthContext,
  action: string,
  targetId: string | null,
  diff?: Record<string, unknown>
) {
  const safeDiff = diff ? stripSecrets(diff) : null;
  const { error } = await supabase.from("admin_audit_log").insert({
    actor: auth.user.id,
    action: `business_user.${action}`,
    target_table: TABLE,
    target_id: targetId,
    diff: safeDiff,
  });
  if (error) console.error(`[api-mng] audit log failed (${action}):`, error.message);
}

function stripSecrets(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k]) => k !== "token" && k !== "token_hash" && k !== "ocr_raw")
      .map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? stripSecrets(v as Record<string, unknown>) : v])
  );
}

/** before → after 중 바뀐 키만 { from, to } 로 */
export function diffOf(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    if (before[k] !== after[k]) out[k] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return out;
}

/** PostgREST or() 필터를 깨는 글자를 걷는다 */
export const sanitizeSearch = (q: string) => q.replace(/[,()*\\%]/g, " ").trim();
