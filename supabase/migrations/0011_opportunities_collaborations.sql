-- ShopMy형 Opportunities(고정 보너스 성과 캠페인) + Collaborations(유료 파트너십)
--
-- opportunities  — 브랜드가 예산·기간을 걸고 여는 성과 캠페인 (fixed bonus)
-- collaborations — 브랜드↔크리에이터 유료 파트너십 (opportunity 또는 직접 계약)
--
-- FK: public.brands, public.profiles.
-- 선택적으로 stmx_contract_applications 에 연결(이미 0007 존재).
--
-- 서버 라우트는 service role 로 접근하므로 RLS 는 켜두되 정책은 두지 않는다.

-- 1) Opportunities -----------------------------------------------------------
create table if not exists public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            uuid        not null
                        references public.brands (id) on delete cascade,

  title               text        not null,
  description         text,
  status              text        not null default 'draft'
                        check (status in (
                          'draft', 'open', 'paused', 'closed', 'cancelled'
                        )),

  -- 캠페인 총 예산 / 크리에이터당 고정 보너스
  budget_cents        integer     not null default 0
                        check (budget_cents >= 0),
  bonus_cents         integer     not null default 0
                        check (bonus_cents >= 0),
  currency            char(3)     not null default 'USD',

  starts_at           timestamptz,
  ends_at             timestamptz,
  max_creators        integer
                        check (max_creators is null or max_creators > 0),
  target_style_codes  text[]      not null default '{}',

  requirements        jsonb       not null default '{}'::jsonb,  -- deliverables 조건 등
  metadata            jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint opportunities_window
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

comment on table public.opportunities is
  '브랜드 고정보너스 성과 캠페인. budget/bonus + 기간 + brand_id';
comment on column public.opportunities.bonus_cents is
  '크리에이터 1인당 고정 보너스(센트). 성과 달성 시 지급';
comment on column public.opportunities.budget_cents is
  '캠페인 총 예산(센트). ROI ledger opportunity_budget 원천';

create index if not exists opportunities_brand_status_idx
  on public.opportunities (brand_id, status, starts_at desc);
create index if not exists opportunities_open_window_idx
  on public.opportunities (status, starts_at, ends_at)
  where status = 'open';
create index if not exists opportunities_style_codes_idx
  on public.opportunities using gin (target_style_codes);

drop trigger if exists opportunities_set_updated_at
  on public.opportunities;
create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

alter table public.opportunities enable row level security;

-- 2) Collaborations ----------------------------------------------------------
create table if not exists public.collaborations (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                uuid        not null
                            references public.brands (id) on delete cascade,
  creator_id              uuid        not null
                            references public.profiles (id) on delete cascade,
  opportunity_id          uuid
                            references public.opportunities (id) on delete set null,
  contract_application_id uuid
                            references public.stmx_contract_applications (id) on delete set null,

  title                   text,
  description             text,
  status                  text        not null default 'proposed'
                            check (status in (
                              'proposed', 'accepted', 'in_progress',
                              'completed', 'cancelled', 'disputed'
                            )),

  fee_cents               integer     not null default 0
                            check (fee_cents >= 0),
  currency                char(3)     not null default 'USD',
  deliverables            jsonb       not null default '[]'::jsonb,

  starts_at               timestamptz,
  ends_at                 timestamptz,
  accepted_at             timestamptz,
  completed_at            timestamptz,

  notes                   text,
  metadata                jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint collaborations_window
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

comment on table public.collaborations is
  '브랜드↔크리에이터 유료 파트너십. opportunity 또는 직접 계약에서 파생';
comment on column public.collaborations.fee_cents is
  '크리에이터 지급 보수(센트). payouts / ROI collaboration_fee 연동';

create index if not exists collaborations_brand_status_idx
  on public.collaborations (brand_id, status, created_at desc);
create index if not exists collaborations_creator_idx
  on public.collaborations (creator_id, status, created_at desc);
create index if not exists collaborations_opportunity_idx
  on public.collaborations (opportunity_id)
  where opportunity_id is not null;

drop trigger if exists collaborations_set_updated_at
  on public.collaborations;
create trigger collaborations_set_updated_at
  before update on public.collaborations
  for each row execute function public.set_updated_at();

alter table public.collaborations enable row level security;
