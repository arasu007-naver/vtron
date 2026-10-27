/** STMX API 키 발급 업체 — business_user (supabase/migrations/0017_business_user.sql) */

export type BusinessUserStatus = "pending_review" | "active" | "suspended" | "rejected";

export const BUSINESS_USER_STATUSES: BusinessUserStatus[] = [
  "pending_review",
  "active",
  "suspended",
  "rejected",
];

export const BUSINESS_USER_STATUS_LABELS: Record<BusinessUserStatus, string> = {
  pending_review: "검토 대기",
  active: "활성",
  suspended: "정지",
  rejected: "반려",
};

/** 화면 · API 응답에 싣는 열 — token_hash 는 절대 내보내지 않는다 */
export interface BusinessUser {
  id: string;
  business_name: string;
  business_number: string;
  /** 담당자 이메일 — API 키 메일 기본 수신 주소 */
  contact_email: string | null;
  status: BusinessUserStatus;
  status_reason: string | null;
  doc_path: string | null;
  nts_status: string | null;
  token_prefix: string | null;
  token_issued_at: string | null;
  token_last_used_at: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** 상세에서만 */
  ocr_raw?: unknown;
}

export interface BizNoChecks {
  /** 숫자 10자리 */
  format: boolean;
  /** 국세청 검증식 */
  checksum: boolean;
  /** 지우지 않은 다른 업체가 같은 번호를 쓰는지 */
  duplicate: boolean;
  duplicate_of?: { id: string; business_name: string; status: BusinessUserStatus } | null;
}

export interface ExtractResponse {
  doc_path: string;
  extraction: {
    business_number: string | null;
    business_name: string | null;
    representative: string | null;
    opening_date: string | null;
    confidence: number | null;
  };
  ocr_raw: unknown;
  /** OCR 을 못 했을 때 사유(수동 입력으로 진행) */
  ocr_error: string | null;
  checks: BizNoChecks;
  /** 추출 · 검증 결과로 본 권장 상태와 그 사유 */
  suggested_status: BusinessUserStatus;
  reasons: string[];
}
