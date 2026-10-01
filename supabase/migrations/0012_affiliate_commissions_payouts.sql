-- 최소 제휴 주문·커미션 + 주간(금요일) 크리에이터 페이아웃
--
-- stmx-web draft(15_shopmy_commerce.sql) 의 affiliate_orders / commissions 는
-- commerce_brands 를 가리키므로, vtron 에는 public.brands 를 소유자로 하는 최소 테이블을 둔다.
-- affiliate_links / clicks 풀스택은 아직 없고 — order 행만으로 커미션·페이아웃을 붙일 수 있게 한다.
-- (나중에 links 를 추가하면 affiliate_orders.affiliate_link_id 에 연결)
--
-- payouts        — 금요일 배치 헤더 (PayPal / Stripe)
-- payout_items   — 배치 안 크리에이터 지급 줄 (commission 또는 collaboration 연결)
--
-- 서버 라우트는 service role 로 접근하므로 RLS 는 켜두되 정책은 두지 않는다.

-- 1) commission_status enum (draft 와 동일) ----------------------------------
do $$ begin
  create type public.commission_status as enum ('pending', 'locked', 'paid', 'reversed');
exception when duplicate_object then null;
end $$;

-- 2) affiliate_orders (최소) -------------------------------------------------
create table if not exists public.affiliate_orders (
  id                  uuid primary key default gen_random_uuid(),
  external_order_id   text        not null,
  brand_id            uuid        not null
                        references public.brands (id) on delete restrict,
  creator_id          uuid        not null
                        references public.profiles (id) on delete cascade,
  -- 향후 affiliate_links 연결용 (지금은 스키마만 예약, FK 없음)
  affiliate_link_id   uuid,
  style_code          varchar(4)
                        references public.style_codes (style_code) on delete set null,

  gmv_cents           integer     not null check (gmv_cents >= 0),
  currency            char(3)     not null default 'KRW',
  -- 구독의 gmv_fee_bps 스냅샷 (정산 시점 고정)
  gmv_fee_bps         integer
                        check (gmv_fee_bps is null or (gmv_fee_bps >= 0 and gmv_fee_bps <= 10000)),
  gmv_fee_cents       integer
                        check (gmv_fee_cents is null or gmv_fee_cents >= 0),

  attributed_at       timestamptz,
  purchased_at        timestamptz not null,
  metadata            jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),

  unique (brand_id, external_order_id)
);

comment on table public.affiliate_orders is
  '리테일러 전환 주문(최소). brands 소유. affiliate_link_id 는 추후 links 연동 예약';
comment on column public.affiliate_orders.gmv_fee_bps is
  '정산 시점 GMV 수수료(bps) 스냅샷. brand_subscriptions.gmv_fee_bps 에서 복사';

create index if not exists affiliate_orders_creator_idx
  on public.affiliate_orders (creator_id, purchased_at desc);
create index if not exists affiliate_orders_brand_idx
  on public.affiliate_orders (brand_id, purchased_at desc);
create index if not exists affiliate_orders_style_idx
  on public.affiliate_orders (style_code, purchased_at desc)
  where style_code is not null;

alter table public.affiliate_orders enable row level security;

-- 3) commissions -------------------------------------------------------------
create table if not exists public.commissions (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid        not null unique
                        references public.affiliate_orders (id) on delete cascade,
  creator_id          uuid        not null
                        references public.profiles (id) on delete cascade,
  brand_id            uuid        not null
                        references public.brands (id) on delete restrict,
  style_code          varchar(4)
                        references public.style_codes (style_code) on delete set null,

  gmv_cents           integer     not null check (gmv_cents >= 0),
  rate_bps            integer     not null check (rate_bps >= 0 and rate_bps <= 10000),
  platform_cut_bps    integer     not null check (platform_cut_bps >= 0 and platform_cut_bps <= 10000),
  gross_cents         integer     not null check (gross_cents >= 0),
  platform_cut_cents  integer     not null check (platform_cut_cents >= 0),
  creator_net_cents   integer     not null check (creator_net_cents >= 0),
  currency            char(3)     not null default 'KRW',

  status              public.commission_status not null default 'pending',
  pending_until       timestamptz,
  locked_at           timestamptz,
  paid_at             timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint commissions_split_adds_up
    check (platform_cut_cents + creator_net_cents = gross_cents)
);

comment on table public.commissions is
  '주문 1건당 커미션 1행. pending→locked→paid|reversed. payout_items 로 금요일 배치에 묶음';

create index if not exists commissions_creator_status_idx
  on public.commissions (creator_id, status);
create index if not exists commissions_brand_status_idx
  on public.commissions (brand_id, status);
create index if not exists commissions_locked_pay_idx
  on public.commissions (status, locked_at)
  where status = 'locked';

drop trigger if exists commissions_set_updated_at on public.commissions;
create trigger commissions_set_updated_at
  before update on public.commissions
  for each row execute function public.set_updated_at();

alter table public.commissions enable row level security;

-- 4) payouts — 주간 금요일 배치 ---------------------------------------------
create table if not exists public.payouts (
  id                    uuid primary key default gen_random_uuid(),
  -- 이 배치가 겨냥하는 금요일 (Asia/Seoul 기준 날짜를 앱이 넣음)
  payout_friday         date        not null,
  period_start          timestamptz not null,
  period_end            timestamptz not null,

  status                text        not null default 'draft'
                          check (status in (
                            'draft', 'processing', 'paid', 'partial', 'failed', 'cancelled'
                          )),
  provider              text        not null default 'paypal'
                          check (provider in ('paypal', 'stripe', 'manual')),
  currency              char(3)     not null default 'USD',

  item_count            integer     not null default 0 check (item_count >= 0),
  total_cents           integer     not null default 0 check (total_cents >= 0),

  stripe_payout_id      text,
  paypal_batch_id       text,
  provider_ref          text,

  processed_at          timestamptz,
  notes                 text,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint payouts_period_window
    check (period_end > period_start)
);

comment on table public.payouts is
  '크리에이터 주간(금요일) 지급 배치. PayPal/Stripe. payout_items 로 commission 연결';

create unique index if not exists payouts_friday_provider_uq
  on public.payouts (payout_friday, provider)
  where status <> 'cancelled';
create index if not exists payouts_status_idx
  on public.payouts (status, payout_friday desc);

drop trigger if exists payouts_set_updated_at on public.payouts;
create trigger payouts_set_updated_at
  before update on public.payouts
  for each row execute function public.set_updated_at();

alter table public.payouts enable row level security;

-- 5) payout_items ------------------------------------------------------------
create table if not exists public.payout_items (
  id                      uuid primary key default gen_random_uuid(),
  payout_id               uuid        not null
                            references public.payouts (id) on delete cascade,
  creator_id              uuid        not null
                            references public.profiles (id) on delete cascade,

  -- 둘 중 하나(또는 둘 다) — 커미션 정산 / 콜라보 보수
  commission_id           uuid
                            references public.commissions (id) on delete restrict,
  collaboration_id        uuid
                            references public.collaborations (id) on delete restrict,

  amount_cents            integer     not null check (amount_cents >= 0),
  currency                char(3)     not null default 'USD',
  status                  text        not null default 'pending'
                            check (status in (
                              'pending', 'processing', 'paid', 'failed', 'reversed'
                            )),

  stripe_transfer_id      text,
  paypal_transaction_id   text,
  provider_ref            text,
  failure_reason          text,
  paid_at                 timestamptz,

  metadata                jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint payout_items_source_present
    check (commission_id is not null or collaboration_id is not null)
);

comment on table public.payout_items is
  '페이아웃 배치의 크리에이터 지급 줄. commission 및/또는 collaboration 에 연결';

create unique index if not exists payout_items_commission_uq
  on public.payout_items (commission_id)
  where commission_id is not null;
create index if not exists payout_items_payout_idx
  on public.payout_items (payout_id, status);
create index if not exists payout_items_creator_idx
  on public.payout_items (creator_id, created_at desc);

drop trigger if exists payout_items_set_updated_at on public.payout_items;
create trigger payout_items_set_updated_at
  before update on public.payout_items
  for each row execute function public.set_updated_at();

alter table public.payout_items enable row level security;
