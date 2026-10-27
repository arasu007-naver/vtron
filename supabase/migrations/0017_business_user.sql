-- STMX API 키 발급 대상 업체 — /admin/api-mng (specs/stmx-api-mng-spec.md)
--
-- 업체가 낸 사업자등록증에서 사업자등록번호 · 상호를 뽑아(CLOVA OCR) 관리자가 확인하고 저장한다.
-- 활성(active)으로 저장하면 API 토큰(stmx_live_…)을 발급한다. 평문 토큰은 발급 응답에서 한 번만 보이고
-- 여기에는 sha256 해시와 앞부분(prefix)만 남는다.
--
--   status          pending_review = 추출 실패 · 검증 실패 등으로 사람 확인 대기(토큰 없음)
--                   active         = 토큰 사용 가능
--                   suspended      = 정지 — 토큰은 남아 있지만 API 가 403 을 준다
--                   rejected       = 반려(토큰 없음)
--   status_reason   pending_review · rejected · suspended 로 둔 사유
--   nts_status      국세청 상태조회 결과 — 예약 컬럼, 지금은 쓰지 않는다(null)
--   deleted_at      soft delete. 지우면 토큰도 폐기한다. 지운 뒤에는 같은 번호를 다시 등록할 수 있다.
--
-- 등록증 원본은 비공개 버킷 business-docs 에 무기한 보관한다(soft delete 후에도 유지).
--
-- 0001 과 같은 이유로 RLS 는 켜두되 정책은 두지 않는다 — anon · authenticated 는 아무것도 보지 못하고
-- 서버 라우트만 service role 로 읽고 쓴다. 관리자 판별은 라우트의 authenticate()(profiles.is_admin)가 한다.
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

create extension if not exists "pgcrypto";

-- 1) 업체 -----------------------------------------------------------------
create table if not exists public.business_user (
  id                  uuid        primary key default gen_random_uuid(),
  business_name       text        not null check (length(btrim(business_name)) > 0),  -- 상호(회사명)
  business_number     char(10)    not null check (business_number ~ '^[0-9]{10}$'),   -- 하이픈 없는 10자리
  status              text        not null default 'active'
                        check (status in ('pending_review', 'active', 'suspended', 'rejected')),
  status_reason       text,
  doc_path            text,                         -- business-docs 버킷 안의 경로
  ocr_raw             jsonb,                        -- 추출 원문 · 신뢰도
  nts_status          text,                         -- 예약(미사용)
  token_hash          text        unique,           -- sha256(token) hex
  token_prefix        text,                         -- 'stmx_live_ab12' — 화면에서 구분용
  token_issued_at     timestamptz,
  token_last_used_at  timestamptz,
  memo                text,
  created_by          uuid        references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

comment on table public.business_user is
  'STMX API 키 발급 업체. 토큰은 해시만 저장(평문은 발급 응답에서 한 번만)';

-- 지우지 않은 행끼리는 사업자번호가 겹치지 않는다
create unique index if not exists business_user_number_active_uq
  on public.business_user (business_number)
  where deleted_at is null;

create index if not exists business_user_created_at_idx
  on public.business_user (created_at desc)
  where deleted_at is null;

create or replace function public.business_user_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- 토큰 사용 시각만 바뀐 갱신(Bearer 인증)은 수정으로 치지 않는다
  if new.token_last_used_at is distinct from old.token_last_used_at
     and (to_jsonb(new) - 'token_last_used_at' - 'updated_at')
       = (to_jsonb(old) - 'token_last_used_at' - 'updated_at') then
    return new;
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists business_user_touch_updated_at on public.business_user;
create trigger business_user_touch_updated_at
  before update on public.business_user
  for each row execute function public.business_user_touch_updated_at();

alter table public.business_user enable row level security;
revoke all on public.business_user from anon, authenticated;

-- 2) 관리자 감사 로그 -------------------------------------------------------
-- 모든 변경을 남긴다. diff 에 토큰 평문 · 해시는 넣지 않는다(prefix 만).
create table if not exists public.admin_audit_log (
  id            uuid        primary key default gen_random_uuid(),
  actor         text        not null,               -- auth.users.id 또는 'service-role-admin'
  action        text        not null,               -- 예: business_user.create, business_user.rotate_token
  target_table  text        not null,
  target_id     uuid,
  diff          jsonb,
  at            timestamptz not null default now()
);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_table, target_id, at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- 3) 사업자등록증 보관 버킷(비공개) -------------------------------------------
-- 정책을 두지 않으므로 service role 만 읽고 쓴다. 화면은 60초 signed URL 로 본다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-docs',
  'business-docs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
