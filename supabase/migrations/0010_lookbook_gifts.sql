-- ShopMy형 Lookbook 기프트 — 크리에이터가 브랜드 제품을 요청하고 수락/거절 · $0 풀필먼트
--
-- brands + profiles 기준. 상품은 brand_catalog_models(네이버 카탈로그) 또는 products(LOOX) 를
-- 선택적으로 참조하고, 둘 다 없으면 product_name/sku 로만 적는다.
-- Shopify 는 $0 draft/order 로 발송 추적 필드를 남긴다.
--
-- 서버 라우트는 service role 로 접근하므로 RLS 는 켜두되 정책은 두지 않는다.

create table if not exists public.lookbook_gifts (
  id                        uuid primary key default gen_random_uuid(),
  brand_id                  uuid        not null
                              references public.brands (id) on delete cascade,
  creator_id                uuid        not null
                              references public.profiles (id) on delete cascade,

  -- 상품 참조 (모두 선택 — 어느 쪽 카탈로그든 / 수동 입력도 OK)
  catalog_model_id          text
                              references public.brand_catalog_models (id) on delete set null,
  product_id                uuid
                              references public.products (id) on delete set null,
  product_name              text,
  product_sku               text,
  variant_title             text,
  product_image_url         text,
  quantity                  integer     not null default 1
                              check (quantity > 0),

  status                    text        not null default 'requested'
                              check (status in (
                                'requested', 'accepted', 'rejected',
                                'fulfilling', 'shipped', 'delivered',
                                'cancelled'
                              )),
  request_note              text,
  brand_note                text,
  reject_reason             text,
  decided_at                timestamptz,
  decided_by                uuid        -- profiles.id 또는 운영자
                              references public.profiles (id) on delete set null,

  -- Shopify $0 fulfillment 추적
  shopify_draft_order_id    text,
  shopify_order_id          text,
  shopify_fulfillment_id    text,
  shopify_order_name        text,       -- "#1042" 등
  shopify_financial_status  text,       -- paid / pending / … ($0 이면 paid)
  fulfillment_status        text,       -- unfulfilled | partial | fulfilled | …
  tracking_company          text,
  tracking_number           text,
  tracking_url              text,
  shipped_at                timestamptz,
  delivered_at              timestamptz,

  -- 배송지 (크리에이터 제공)
  shipping_name             text,
  shipping_phone            text,
  shipping_address          jsonb,      -- {line1,line2,city,province,zip,country}

  -- ROI: 기프트 COGS
  cogs_cents                integer
                              check (cogs_cents is null or cogs_cents >= 0),
  currency                  char(3)     not null default 'USD',

  requested_at              timestamptz not null default now(),
  accepted_at               timestamptz,
  fulfilled_at              timestamptz,
  metadata                  jsonb       not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.lookbook_gifts is
  '크리에이터→브랜드 Lookbook 기프트 요청. accept/reject 및 Shopify $0 발송 추적';
comment on column public.lookbook_gifts.cogs_cents is
  '기프트 원가(센트). brand_campaign_spend gift_cogs 집계용';
comment on column public.lookbook_gifts.shopify_order_id is
  'Shopify $0 주문 id. draft → order 전환 후 채움';

create index if not exists lookbook_gifts_brand_status_idx
  on public.lookbook_gifts (brand_id, status, requested_at desc);
create index if not exists lookbook_gifts_creator_idx
  on public.lookbook_gifts (creator_id, requested_at desc);
create index if not exists lookbook_gifts_shopify_order_idx
  on public.lookbook_gifts (shopify_order_id)
  where shopify_order_id is not null;
create index if not exists lookbook_gifts_catalog_model_idx
  on public.lookbook_gifts (catalog_model_id)
  where catalog_model_id is not null;

drop trigger if exists lookbook_gifts_set_updated_at
  on public.lookbook_gifts;
create trigger lookbook_gifts_set_updated_at
  before update on public.lookbook_gifts
  for each row execute function public.set_updated_at();

alter table public.lookbook_gifts enable row level security;
