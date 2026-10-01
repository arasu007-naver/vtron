-- ShopMy형 제휴 커머스 — 기존 brands 테이블 확장
--
-- stmx-web draft(15_shopmy_commerce.sql) 의 commerce_brands + brand_commission_rates 를
-- 평행 테이블로 두지 않고, vtron 에 이미 있는 public.brands 를 확장한다.
--
--   brands                      네이버 카탈로그 브랜드 (0002) + ShopMy 제휴 메타
--     └ brand_commission_rates  카테고리별 · 기간별 수수료율 (brands.id 참조)
--
-- style_code 는 STMX 16종(public.style_codes) 과 느슨히 연결한다.
--   preferred_style_codes text[]  — 브랜드가 타깃하는 스타일 코드 목록(FK 배열은 PG 미지원)
--
-- 커미션 숫자는 정수 bps. rate_bps 1500 = 15.00%.
-- platform_cut_bps 기본 1800 = ShopMy 82/18 의 플랫폼 몫.
--
-- 서버 라우트는 service role 로 접근하므로 RLS 는 켜두되 정책은 두지 않는다.

-- 1) brands 에 ShopMy / 제휴 컬럼 ------------------------------------------------
alter table public.brands
  add column if not exists slug text,
  add column if not exists commerce_status text not null default 'draft',
  add column if not exists affiliate_ready boolean not null default false,
  add column if not exists default_commission_rate_bps integer,
  add column if not exists default_platform_cut_bps integer not null default 1800,
  add column if not exists preferred_style_codes text[] not null default '{}',
  add column if not exists website_url text,
  add column if not exists contact_email text,
  add column if not exists contact_name text,
  add column if not exists commerce_notes text;

-- slug 유니크 (null 허용 — 아직 제휴 준비 안 된 브라우징 전용 브랜드)
create unique index if not exists brands_slug_uq
  on public.brands (slug)
  where slug is not null;

-- 기존 행 slug 백필 (영문 naver_brand_name 우선, 없으면 display_name)
update public.brands
set slug = lower(
  regexp_replace(
    trim(both '-' from regexp_replace(
      coalesce(nullif(trim(naver_brand_name), ''), display_name),
      '[^a-zA-Z0-9가-힣]+', '-', 'g'
    )),
    '-{2,}', '-', 'g'
  )
)
where slug is null
  and coalesce(nullif(trim(naver_brand_name), ''), display_name) is not null;

-- 충돌 시 id 접미사로 유일화
with dups as (
  select id, slug,
    row_number() over (partition by slug order by created_at) as rn
  from public.brands
  where slug is not null
)
update public.brands b
set slug = b.slug || '-' || left(replace(b.id::text, '-', ''), 8)
from dups d
where b.id = d.id and d.rn > 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'brands_commerce_status_check'
  ) then
    alter table public.brands
      add constraint brands_commerce_status_check
      check (commerce_status in ('draft', 'active', 'paused', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'brands_default_commission_rate_bps_check'
  ) then
    alter table public.brands
      add constraint brands_default_commission_rate_bps_check
      check (
        default_commission_rate_bps is null
        or (default_commission_rate_bps >= 0 and default_commission_rate_bps <= 10000)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'brands_default_platform_cut_bps_check'
  ) then
    alter table public.brands
      add constraint brands_default_platform_cut_bps_check
      check (default_platform_cut_bps >= 0 and default_platform_cut_bps <= 10000);
  end if;
end $$;

create index if not exists brands_commerce_status_idx
  on public.brands (commerce_status);
create index if not exists brands_affiliate_ready_idx
  on public.brands (affiliate_ready)
  where affiliate_ready = true;
create index if not exists brands_preferred_style_codes_idx
  on public.brands using gin (preferred_style_codes);

comment on column public.brands.slug is
  '제휴/공개 URL 용 슬러그. commerce_brands.slug 대응';
comment on column public.brands.commerce_status is
  '제휴 운영 상태: draft | active | paused | archived (네이버 match_status 와 별개)';
comment on column public.brands.affiliate_ready is
  '제휴 트래킹·커미션 정산 준비 완료 여부';
comment on column public.brands.default_commission_rate_bps is
  '브랜드 기본 제휴율(bps). null 이면 brand_commission_rates 또는 캠페인 단가 필수';
comment on column public.brands.default_platform_cut_bps is
  'STMX 플랫폼 몫(bps). 기본 1800 = 18%';
comment on column public.brands.preferred_style_codes is
  '브랜드가 타깃하는 STMX style_code 목록 (style_codes.style_code 값)';

-- 2) 카테고리·기간별 수수료율 (commerce draft 의 brand_commission_rates → brands 참조) --
create table if not exists public.brand_commission_rates (
  id                uuid primary key default gen_random_uuid(),
  brand_id          uuid not null references public.brands (id) on delete cascade,
  category          text,                          -- null = 브랜드 기본율 오버라이드 창
  rate_bps          integer not null
                      check (rate_bps >= 0 and rate_bps <= 10000),
  platform_cut_bps  integer not null default 1800
                      check (platform_cut_bps >= 0 and platform_cut_bps <= 10000),
  effective_from    timestamptz not null default now(),
  effective_to      timestamptz,
  created_at        timestamptz not null default now(),
  constraint brand_commission_window
    check (effective_to is null or effective_to > effective_from)
);

comment on table public.brand_commission_rates is
  '브랜드 수수료율 이력. brands 를 소유자로 두고 카테고리·기간별 요율을 보관';
comment on column public.brand_commission_rates.rate_bps is
  '브랜드가 지급하는 제휴율(bps). 화면 표시율은 platform cut 반영 전 총액 기준';
comment on column public.brand_commission_rates.platform_cut_bps is
  'STMX 플랫폼 몫(bps). 크리에이터 실수령 = gross * (10000 - cut) / 10000';

create index if not exists brand_commission_rates_brand_idx
  on public.brand_commission_rates (brand_id, effective_from desc);

alter table public.brand_commission_rates enable row level security;
