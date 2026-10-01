-- STMX 계약/신청 폼 스키마
--
-- 세 가지 플로우:
--   1) stmx_creator  — 플랫폼(STMX) ↔ 크리에이터 계약 신청
--   2) stmx_brand    — 플랫폼(STMX) ↔ 브랜드 계약 신청
--   3) creator_brand — 크리에이터 ↔ 브랜드 직접 연결 신청
--                      (제출 시 알림 수신자 목록도 함께 저장·유지)
--
-- vtron 자체 Supabase(NEXT_PUBLIC_SUPABASE_URL)에 둔다.
-- 서버 라우트는 service role 키로 접근하므로 RLS 를 우회한다.
-- 브라우저 직접 조회는 없으므로 RLS 는 켜두되 정책은 두지 않는다.

create extension if not exists "pgcrypto";

-- 1) 계약/신청 제출 --------------------------------------------------------
create table if not exists public.stmx_contract_applications (
  id                   uuid primary key default gen_random_uuid(),
  flow_type            text        not null
                         check (flow_type in ('stmx_creator', 'stmx_brand', 'creator_brand')),
  status               text        not null default 'pending'
                         check (status in ('pending', 'reviewing', 'approved', 'rejected', 'cancelled')),

  -- 신청자(작성자) 공통
  applicant_name       text        not null,
  applicant_email      text        not null,
  applicant_phone      text,
  applicant_company    text,

  -- 크리에이터 측
  creator_name         text,
  creator_sns_url      text,
  creator_channel_type text,
  creator_followers    text,

  -- 브랜드 측
  brand_name           text,
  brand_website        text,
  brand_category       text,
  brand_contact_name   text,

  -- 계약/캠페인
  proposed_start_date  date,
  proposed_end_date    date,
  budget_range         text,
  campaign_goal        text,
  notes                text,

  etc                  jsonb       not null default '{}'::jsonb,
  submitted_by         uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists stmx_contract_applications_flow_idx
  on public.stmx_contract_applications (flow_type, created_at desc);
create index if not exists stmx_contract_applications_status_idx
  on public.stmx_contract_applications (status, created_at desc);
create index if not exists stmx_contract_applications_email_idx
  on public.stmx_contract_applications (applicant_email);

comment on table public.stmx_contract_applications is
  'STMX 계약/신청 폼 제출 내역 (플랫폼-크리에이터, 플랫폼-브랜드, 크리에이터-브랜드 직접 연결)';

-- 2) 알림 수신자 디렉터리 (유지 목록) --------------------------------------
-- creator↔brand 직접 연결 시 알릴 사람들의 마스터 목록.
-- 폼에서 추가/비활성화하며 유지한다.
create table if not exists public.stmx_contract_notify_directory (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null,
  role       text,
  phone      text,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stmx_contract_notify_directory_email_key unique (email)
);

create index if not exists stmx_contract_notify_directory_active_idx
  on public.stmx_contract_notify_directory (is_active, name);

comment on table public.stmx_contract_notify_directory is
  '크리에이터↔브랜드 직접 연결 신청 시 알림을 받을 사용자 마스터 목록';

-- 3) 신청별 알림 수신자 스냅샷 --------------------------------------------
create table if not exists public.stmx_contract_application_recipients (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid        not null
                   references public.stmx_contract_applications (id) on delete cascade,
  name           text        not null,
  email          text        not null,
  role           text,
  phone          text,
  directory_id   uuid
                   references public.stmx_contract_notify_directory (id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint stmx_contract_application_recipients_email_uq
    unique (application_id, email)
);

create index if not exists stmx_contract_application_recipients_app_idx
  on public.stmx_contract_application_recipients (application_id);

comment on table public.stmx_contract_application_recipients is
  '크리에이터↔브랜드 직접 연결 신청에 첨부된 알림 수신자 스냅샷';

-- 4) updated_at 트리거 -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stmx_contract_applications_set_updated_at
  on public.stmx_contract_applications;
create trigger stmx_contract_applications_set_updated_at
  before update on public.stmx_contract_applications
  for each row execute function public.set_updated_at();

drop trigger if exists stmx_contract_notify_directory_set_updated_at
  on public.stmx_contract_notify_directory;
create trigger stmx_contract_notify_directory_set_updated_at
  before update on public.stmx_contract_notify_directory
  for each row execute function public.set_updated_at();

-- 5) RLS -------------------------------------------------------------------
alter table public.stmx_contract_applications           enable row level security;
alter table public.stmx_contract_notify_directory       enable row level security;
alter table public.stmx_contract_application_recipients enable row level security;
