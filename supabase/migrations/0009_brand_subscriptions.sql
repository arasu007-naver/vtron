-- ShopMy형 브랜드 SaaS 구독
--
-- 0008 이 확장한 public.brands 위에 월 구독(요금제 · 상태 · 청구 주기 · GMV 수수료)을 둔다.
-- commerce_brands 평행 테이블을 만들지 않는다.
--
-- 요금 예 (USD cents)
--   intro ≈ $399/mo  → 39900
--   full  ≈ $2799+/mo → 279900+
-- GMV 수수료 기본 290 bps ≈ 2.9%.
-- Stripe / PayPal 참조는 선택(연동 전 null).
--
-- 서버 라우트는 service role 로 접근하므로 RLS 는 켜두되 정책은 두지 않는다.

create table if not exists public.brand_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                uuid        not null
                            references public.brands (id) on delete cascade,

  -- intro | full | custom
  plan_code               text        not null default 'intro',
  plan_label              text,                         -- 화면용 ("Intro", "Full Access" …)
  status                  text        not null default 'trial'
                            check (status in (
                              'trial', 'active', 'past_due', 'paused', 'cancelled', 'expired'
                            )),

  billing_period          text        not null default 'monthly'
                            check (billing_period in ('monthly', 'annual')),
  amount_cents            integer     not null
                            check (amount_cents >= 0),
  currency                char(3)     not null default 'USD',

  -- 주문 GMV 에 붙는 플랫폼 수수료 (bps). 290 = 2.90%
  gmv_fee_bps             integer     not null default 290
                            check (gmv_fee_bps >= 0 and gmv_fee_bps <= 10000),

  -- 결제 제공자 참조 (선택)
  stripe_customer_id      text,
  stripe_subscription_id  text,
  paypal_subscription_id  text,
  paypal_payer_id         text,

  trial_ends_at           timestamptz,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,

  notes                   text,
  metadata                jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint brand_subscriptions_plan_code_check
    check (plan_code in ('intro', 'full', 'custom'))
);

comment on table public.brand_subscriptions is
  '브랜드 SaaS 구독. brands 소유. intro≈$399/mo, full≈$2799+/mo, GMV fee 기본 2.9%';
comment on column public.brand_subscriptions.amount_cents is
  '청구액(센트). USD 기준 intro 39900, full 279900+';
comment on column public.brand_subscriptions.gmv_fee_bps is
  'GMV 플랫폼 수수료(bps). 기본 290 = 2.90%';

-- 브랜드당 활성/트라이얼 구독은 하나만 (부분 유니크)
create unique index if not exists brand_subscriptions_one_live_uq
  on public.brand_subscriptions (brand_id)
  where status in ('trial', 'active', 'past_due', 'paused');

create index if not exists brand_subscriptions_brand_idx
  on public.brand_subscriptions (brand_id, created_at desc);
create index if not exists brand_subscriptions_status_idx
  on public.brand_subscriptions (status, current_period_end);
create index if not exists brand_subscriptions_stripe_sub_idx
  on public.brand_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists brand_subscriptions_paypal_sub_idx
  on public.brand_subscriptions (paypal_subscription_id)
  where paypal_subscription_id is not null;

drop trigger if exists brand_subscriptions_set_updated_at
  on public.brand_subscriptions;
create trigger brand_subscriptions_set_updated_at
  before update on public.brand_subscriptions
  for each row execute function public.set_updated_at();

alter table public.brand_subscriptions enable row level security;
