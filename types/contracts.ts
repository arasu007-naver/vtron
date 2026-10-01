/** STMX 계약/신청 폼 타입 */

export type ContractFlowType = "stmx_creator" | "stmx_brand" | "creator_brand";

export type ContractStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "cancelled";

export interface NotifyRecipientInput {
  name: string;
  email: string;
  role?: string | null;
  phone?: string | null;
  directoryId?: string | null;
}

export interface NotifyDirectoryEntry {
  id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractApplicationRecipient {
  id: string;
  application_id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  directory_id: string | null;
  created_at: string;
}

export interface ContractApplication {
  id: string;
  flow_type: ContractFlowType;
  status: ContractStatus;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  applicant_company: string | null;
  creator_name: string | null;
  creator_sns_url: string | null;
  creator_channel_type: string | null;
  creator_followers: string | null;
  brand_name: string | null;
  brand_website: string | null;
  brand_category: string | null;
  brand_contact_name: string | null;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  budget_range: string | null;
  campaign_goal: string | null;
  notes: string | null;
  etc: Record<string, unknown>;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  recipients?: ContractApplicationRecipient[];
}

export interface ContractApplicationPayload {
  flowType: ContractFlowType;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  applicantCompany?: string | null;
  creatorName?: string | null;
  creatorSnsUrl?: string | null;
  creatorChannelType?: string | null;
  creatorFollowers?: string | null;
  brandName?: string | null;
  brandWebsite?: string | null;
  brandCategory?: string | null;
  brandContactName?: string | null;
  proposedStartDate?: string | null;
  proposedEndDate?: string | null;
  budgetRange?: string | null;
  campaignGoal?: string | null;
  notes?: string | null;
  etc?: Record<string, unknown>;
  /** creator_brand 전용 — 알림 수신자 (디렉터리에 upsert 후 스냅샷 저장) */
  notifyRecipients?: NotifyRecipientInput[];
}

export const FLOW_LABELS: Record<ContractFlowType, string> = {
  stmx_creator: "STMX ↔ 크리에이터",
  stmx_brand: "STMX ↔ 브랜드",
  creator_brand: "크리에이터 ↔ 브랜드 직접 연결",
};

export const CHANNEL_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "blog", label: "블로그" },
  { value: "other", label: "기타" },
] as const;

export const BRAND_CATEGORY_OPTIONS = [
  { value: "fashion", label: "패션/의류" },
  { value: "beauty", label: "뷰티/코스메틱" },
  { value: "lifestyle", label: "라이프스타일" },
  { value: "sports", label: "스포츠/아웃도어" },
  { value: "fmcg", label: "소비재" },
  { value: "other", label: "기타" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "under_100", label: "100만 원 미만" },
  { value: "100_300", label: "100–300만 원" },
  { value: "300_500", label: "300–500만 원" },
  { value: "500_1000", label: "500–1,000만 원" },
  { value: "over_1000", label: "1,000만 원 이상" },
  { value: "negotiate", label: "협의" },
] as const;
