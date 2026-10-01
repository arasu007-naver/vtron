-- 브랜드 ROI 비용 원장 (subscription / opportunity / gift COGS / GMV fee / collab)
--
-- 브랜드가 "쓴 돈"을 한곳에서 모아 ROI = GMV / spend 를 계산한다.
-- 원천 행(구독·기회·기프트·주문·콜라보)을 nullable FK 로 남겨 추적을 유지한다.
--
-- 서버 라우트는 service role 로 접근하므로 RLS 는 켜두되 정책은 두지 않는다.

create table if not exists public.brand_campaign_spend (
  id                    uuid primary key default gen_random_uuid(),
  brand_id              uuid        not null
                          references public.brands (id) on delete cascade,

  spend_type            text        not null
                          check (spend_type in (
                            'subscription_fee',
                            'opportunity_budget',
                            'gift_cogs',
                            'gmv_fee',
                            'collaboration_fee',
                            'other'
                          )),
  amount_cents          integer     not null check (amount_cents >= 0),
  currency              char(3)     not null default 'USD',
  occurred_at           timestamptz not null default now(),

  -- 원천 참조 (해당되면 채움)
  subscription_id       uuid
                          references public.brand_subscriptions (id) on delete set null,
  opportunity_id        uuid
                          references public.opportunities (id) on delete set null,
  lookbook_gift_id      uuid
                          references public.lookbook_gifts (id) on delete set null,
  affiliate_order_id    uuid
                          references public.affiliate_orders (id) on delete set null,
  collaboration_id      uuid
                          references public.collaborations (id) on delete set null,

  description           text,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

comment on table public.brand_campaign_spend is
  '브랜드 ROI 비용 원장. 구독료·기회예산·기프트 COGS·GMV fee·콜라보비';
comment on column public.brand_campaign_spend.spend_type is
  'subscription_fee | opportunity_budget | gift_cogs | gmv_fee | collaboration_fee | other';

create index if not exists brand_campaign_spend_brand_time_idx
  on public.brand_campaign_spend (brand_id, occurred_at desc);
create index if not exists brand_campaign_spend_type_idx
  on public.brand_campaign_spend (brand_id, spend_type, occurred_at desc);
create index if not exists brand_campaign_spend_subscription_idx
  on public.brand_campaign_spend (subscription_id)
  where subscription_id is not null;
create index if not exists brand_campaign_spend_opportunity_idx
  on public.brand_campaign_spend (opportunity_id)
  where opportunity_id is not null;

alter table public.brand_campaign_spend enable row level security;
