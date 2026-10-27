-- 외부 API 호출 내역 — /api/v1/* (업체 API 키 stmx_live_… 로 부른 것)
--
-- 인증에 실패한 호출도 남긴다(401 은 업체를 모르니 business_user_id 가 비고, 403 은 정지된 업체 id 가 남는다).
-- 이미지 · 토큰 · 응답 원문은 남기지 않는다. request_meta · response_meta 에는 크기 · 형식 · 결과 요약만.
--
--   id              = 응답 헤더 X-Request-Id · 응답 본문 request_id 와 같다(업체 문의 때 이 값으로 찾는다)
--   token_prefix    = 보낸 키의 앞부분('stmx_live_ab12'). 형식이 틀린 키면 null
--   error           = 서버 쪽 사유(업체에게는 일반화한 문구만 돌려준다)
--
-- 0017 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).
-- RLS 는 켜두되 정책은 두지 않는다 — 서버 라우트만 service role 로 읽고 쓴다.

create table if not exists public.api_call_log (
  id                uuid        primary key default gen_random_uuid(),
  business_user_id  uuid        references public.business_user (id) on delete set null,
  token_prefix      text,
  method            text        not null,
  path              text        not null,
  status_code       integer     not null,
  duration_ms       integer     not null,
  error             text,
  request_meta      jsonb,
  response_meta     jsonb,
  ip                text,
  user_agent        text,
  created_at        timestamptz not null default now()
);

comment on table public.api_call_log is
  '외부 API(/api/v1/*) 호출 내역. 이미지 · 토큰 원문은 남기지 않는다';

create index if not exists api_call_log_business_user_idx
  on public.api_call_log (business_user_id, created_at desc);

create index if not exists api_call_log_created_at_idx
  on public.api_call_log (created_at desc);

alter table public.api_call_log enable row level security;
revoke all on public.api_call_log from anon, authenticated;
