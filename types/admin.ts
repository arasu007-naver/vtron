/** 관리자 — 크리에이터 · 브랜드(ShopMy) */

import type { ContractApplication, ContractStatus } from "./contracts";

export type BrandCommerceStatus = "draft" | "active" | "paused" | "archived";

export interface AdminBrand {
  id: string;
  display_name: string;
  aliases: string[];
  slug: string | null;
  naver_brand_id: number | null;
  naver_brand_name: string | null;
  match_status: string;
  is_active: boolean;
  commerce_status: BrandCommerceStatus;
  affiliate_ready: boolean;
  default_commission_rate_bps: number | null;
  default_platform_cut_bps: number;
  preferred_style_codes: string[];
  website_url: string | null;
  contact_email: string | null;
  contact_name: string | null;
  commerce_notes: string | null;
  catalog_model_count: number;
  clothing_model_count: number | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminBrandUpdate {
  id: string;
  slug?: string | null;
  commerce_status?: BrandCommerceStatus;
  affiliate_ready?: boolean;
  default_commission_rate_bps?: number | null;
  default_platform_cut_bps?: number;
  preferred_style_codes?: string[];
  website_url?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  commerce_notes?: string | null;
  is_active?: boolean;
}

export interface BrandCommissionRate {
  id: string;
  brand_id: string;
  category: string | null;
  rate_bps: number;
  platform_cut_bps: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

/** 크리에이터 관리 목록 행 — STMX↔크리에이터 계약 신청 기반 */
export type AdminCreator = ContractApplication;

export type AdminCreatorStatus = ContractStatus;

export const COMMERCE_STATUS_LABELS: Record<BrandCommerceStatus, string> = {
  draft: "초안",
  active: "운영중",
  paused: "일시중지",
  archived: "보관",
};

export const STYLE_CODE_OPTIONS = [
  "ECSD", "ETRD", "ECRM", "ITSM", "ICSD", "ICSM",
  "ETRM", "ITSD", "ETSM", "ETSD", "ECSM", "ICRD",
  "ECRD", "ITRD", "ICRM", "ITRM",
] as const;

/* ── ShopMy 0009–0013 ─────────────────────────────────────────────── */

export type BrandSubscriptionPlan = "intro" | "full" | "custom";
export type BrandSubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired";
export type BillingPeriod = "monthly" | "annual";

export interface BrandSubscription {
  id: string;
  brand_id: string;
  plan_code: BrandSubscriptionPlan;
  plan_label: string | null;
  status: BrandSubscriptionStatus;
  billing_period: BillingPeriod;
  amount_cents: number;
  currency: string;
  gmv_fee_bps: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  paypal_subscription_id: string | null;
  paypal_payer_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type LookbookGiftStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "fulfilling"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface LookbookGift {
  id: string;
  brand_id: string;
  creator_id: string;
  catalog_model_id: string | null;
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  variant_title: string | null;
  product_image_url: string | null;
  quantity: number;
  status: LookbookGiftStatus;
  request_note: string | null;
  brand_note: string | null;
  reject_reason: string | null;
  decided_at: string | null;
  decided_by: string | null;
  shopify_draft_order_id: string | null;
  shopify_order_id: string | null;
  shopify_fulfillment_id: string | null;
  shopify_order_name: string | null;
  shopify_financial_status: string | null;
  fulfillment_status: string | null;
  tracking_company: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: Record<string, unknown> | null;
  cogs_cents: number | null;
  currency: string;
  requested_at: string;
  accepted_at: string | null;
  fulfilled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type OpportunityStatus = "draft" | "open" | "paused" | "closed" | "cancelled";

export interface Opportunity {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  status: OpportunityStatus;
  budget_cents: number;
  bonus_cents: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  max_creators: number | null;
  target_style_codes: string[];
  requirements: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CollaborationStatus =
  | "proposed"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface Collaboration {
  id: string;
  brand_id: string;
  creator_id: string;
  opportunity_id: string | null;
  contract_application_id: string | null;
  title: string | null;
  description: string | null;
  status: CollaborationStatus;
  fee_cents: number;
  currency: string;
  deliverables: unknown[];
  starts_at: string | null;
  ends_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CommissionStatus = "pending" | "locked" | "paid" | "reversed";

export interface AffiliateOrder {
  id: string;
  external_order_id: string;
  brand_id: string;
  creator_id: string;
  affiliate_link_id: string | null;
  style_code: string | null;
  gmv_cents: number;
  currency: string;
  gmv_fee_bps: number | null;
  gmv_fee_cents: number | null;
  attributed_at: string | null;
  purchased_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Commission {
  id: string;
  order_id: string;
  creator_id: string;
  brand_id: string;
  style_code: string | null;
  gmv_cents: number;
  rate_bps: number;
  platform_cut_bps: number;
  gross_cents: number;
  platform_cut_cents: number;
  creator_net_cents: number;
  currency: string;
  status: CommissionStatus;
  pending_until: string | null;
  locked_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PayoutStatus =
  | "draft"
  | "processing"
  | "paid"
  | "partial"
  | "failed"
  | "cancelled";
export type PayoutProvider = "paypal" | "stripe" | "manual";
export type PayoutItemStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "reversed";

export interface Payout {
  id: string;
  payout_friday: string;
  period_start: string;
  period_end: string;
  status: PayoutStatus;
  provider: PayoutProvider;
  currency: string;
  item_count: number;
  total_cents: number;
  stripe_payout_id: string | null;
  paypal_batch_id: string | null;
  provider_ref: string | null;
  processed_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PayoutItem {
  id: string;
  payout_id: string;
  creator_id: string;
  commission_id: string | null;
  collaboration_id: string | null;
  amount_cents: number;
  currency: string;
  status: PayoutItemStatus;
  stripe_transfer_id: string | null;
  paypal_transaction_id: string | null;
  provider_ref: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type BrandSpendType =
  | "subscription_fee"
  | "opportunity_budget"
  | "gift_cogs"
  | "gmv_fee"
  | "collaboration_fee"
  | "other";

export interface BrandCampaignSpend {
  id: string;
  brand_id: string;
  spend_type: BrandSpendType;
  amount_cents: number;
  currency: string;
  occurred_at: string;
  subscription_id: string | null;
  opportunity_id: string | null;
  lookbook_gift_id: string | null;
  affiliate_order_id: string | null;
  collaboration_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
