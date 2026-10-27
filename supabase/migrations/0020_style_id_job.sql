-- 외부 API 스타일 아이디 비동기 작업 큐 — POST /api/v1/style-id/jobs 가 쌓고 scripts/style-id-worker.mjs 가 처리한다.
--
--   queued    → 워커가 집기를 기다린다(next_run_at 이 지나야 집는다 — 재시도 대기도 이 상태)
--   running   → 워커가 처리 중. locked_by · locked_until(lease)을 워커가 주기적으로 늘린다(heartbeat)
--               워커가 죽어 lease 가 지나면 다른 워커가 다시 집는다
--   succeeded → result = 동기 엔드포인트(POST /api/v1/style-id) 200 응답과 같은 모양(request_id 제외)
--   failed    → 재시도해도 같은 결과인 실패(의복 미검출 등). result = { ok: false, error }
--   dead      → 일시 오류(Anthropic 429 · 529 · 5xx · 타임아웃 등)가 max_attempts 번 이어졌다
--
-- 이미지는 비공개 버킷 style-id-jobs 의 image_path 에 둔다. succeeded · failed 는 끝나는 대로 워커가 지운다.
-- dead 는 관리자가 다시 실행할 수 있도록(requeue_style_id_job) 보존 기간 동안 남기고, 지난 뒤 워커가 지운다
-- (claim_dead_style_id_job_images). 지운 작업은 image_deleted_at 이 찍히고 다시 실행할 수 없다.
-- 같은 업체가 같은 idempotency_key 로 다시 등록하면 새 작업을 만들지 않고 기존 작업을 돌려준다.
--
-- 0017 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).
-- RLS 는 켜두되 정책은 두지 않는다 — 서버 라우트와 워커만 service role 로 읽고 쓴다.

-- 1) 작업 표 ------------------------------------------------------------------
create table if not exists public.style_id_job (
  id                uuid        primary key default gen_random_uuid(),
  business_user_id  uuid        not null references public.business_user (id) on delete cascade,
  idempotency_key   text        not null check (char_length(idempotency_key) between 1 and 200),
  status            text        not null default 'queued'
                                check (status in ('queued', 'running', 'succeeded', 'failed', 'dead')),
  image_path        text        not null,
  image_sha256      text        not null,
  image_type        text,
  image_deleted_at  timestamptz,
  product_name      text,
  product_category  text,
  attempts          integer     not null default 0,
  max_attempts      integer     not null default 5 check (max_attempts >= 1),
  next_run_at       timestamptz not null default now(),
  locked_by         text,
  locked_until      timestamptz,
  last_error        text,
  result            jsonb,
  callback_url      text,
  request_id        uuid,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  finished_at       timestamptz,
  constraint style_id_job_idempotency_key unique (business_user_id, idempotency_key)
);

comment on table public.style_id_job is
  '외부 API 스타일 아이디 비동기 작업 큐. 워커가 claim_style_id_jobs() 로 집는다';
-- 앞선 0020(이 열이 없던 판)을 이미 실행한 DB 용
alter table public.style_id_job add column if not exists image_deleted_at timestamptz;

comment on column public.style_id_job.image_deleted_at is 'Storage 이미지를 지운 시각 — 찍혀 있으면 다시 실행할 수 없다';
comment on column public.style_id_job.last_error is '서버 쪽 사유(업체에게는 result.error 의 일반화한 문구만 보인다)';
comment on column public.style_id_job.request_id is '작업을 등록한 호출의 api_call_log.id';
comment on column public.style_id_job.callback_url is '완료 웹훅 주소 — 아직 쓰지 않는다(다음 단계)';

-- 워커가 집을 작업 — 업체별로 next_run_at 순서
create index if not exists style_id_job_ready_idx
  on public.style_id_job (business_user_id, next_run_at)
  where status in ('queued', 'running');

-- lease 가 지난 running 작업 찾기
create index if not exists style_id_job_running_lease_idx
  on public.style_id_job (locked_until)
  where status = 'running';

-- 보존 기간이 지난 dead 작업 이미지 찾기
create index if not exists style_id_job_dead_image_idx
  on public.style_id_job (finished_at)
  where status = 'dead' and image_deleted_at is null;

create index if not exists style_id_job_business_user_idx
  on public.style_id_job (business_user_id, created_at desc);

alter table public.style_id_job enable row level security;
revoke all on public.style_id_job from anon, authenticated;

-- 2) 작업 집기 ------------------------------------------------------------------
-- queued 이면서 next_run_at 이 지난 작업과 lease 가 지난 running 작업을 n 개까지 집어 running 으로 바꾼다.
-- 업체마다 오래된 순서로 줄을 세우고 각 업체의 1번째 → 2번째 … 순으로 번갈아 고른다(fair share) —
-- 한 업체가 수천 건을 쌓아도 다른 업체의 작업이 그 뒤로 밀리지 않는다.
-- FOR UPDATE SKIP LOCKED 라 워커 여럿이 동시에 불러도 같은 작업을 두 번 집지 않는다.
-- lease 가 지났는데 이미 max_attempts 번 집힌 작업(워커를 계속 죽이는 작업)은 집지 않고 dead 로 둔다.
create or replace function public.claim_style_id_jobs(worker text, n integer, lease interval)
returns setof public.style_id_job
language plpgsql
set search_path = public
as $$
begin
  if worker is null or n is null or n < 1 or lease is null or lease <= interval '0' then
    raise exception 'claim_style_id_jobs: worker · n(>=1) · lease(>0) 가 필요합니다';
  end if;

  update public.style_id_job j
     set status       = 'dead',
         locked_by    = null,
         locked_until = null,
         finished_at  = now(),
         last_error   = coalesce(j.last_error || ' | ', '') || 'lease expired after max attempts (worker died)'
   where j.id in (
           select s.id from public.style_id_job s
            where s.status = 'running' and s.locked_until < now() and s.attempts >= s.max_attempts
            for update skip locked
         );

  return query
  with ready_biz as (
    select distinct s.business_user_id
      from public.style_id_job s
     where (s.status = 'queued' and s.next_run_at <= now())
        or (s.status = 'running' and s.locked_until < now())
  ),
  candidates as (
    select c.id, c.business_user_id, c.next_run_at, c.created_at
      from ready_biz b
      cross join lateral (
        select s.id, s.business_user_id, s.next_run_at, s.created_at
          from public.style_id_job s
         where s.business_user_id = b.business_user_id
           and ((s.status = 'queued' and s.next_run_at <= now())
             or (s.status = 'running' and s.locked_until < now()))
         order by s.next_run_at, s.created_at
         limit n
           for update skip locked
      ) c
  ),
  picked as (
    select r.id
      from (
        select c.id, c.next_run_at, c.created_at,
               row_number() over (partition by c.business_user_id order by c.next_run_at, c.created_at) as turn
          from candidates c
      ) r
     order by r.turn, r.next_run_at, r.created_at
     limit n
  )
  update public.style_id_job j
     set status       = 'running',
         locked_by    = worker,
         locked_until = now() + lease,
         attempts     = j.attempts + 1,
         started_at   = coalesce(j.started_at, now())
    from picked
   where j.id = picked.id
  returning j.*;
end;
$$;

-- 3) lease 늘리기(heartbeat) ----------------------------------------------------
-- 그 워커가 아직 쥐고 있을 때만 늘린다. false = lease 를 잃었다(다른 워커가 이어받았거나 작업이 끝났다).
create or replace function public.renew_style_id_job_lease(p_id uuid, p_worker text, p_lease interval)
returns boolean
language sql
set search_path = public
as $$
  with renewed as (
    update public.style_id_job
       set locked_until = now() + p_lease
     where id = p_id and status = 'running' and locked_by = p_worker
    returning 1
  )
  select exists (select 1 from renewed);
$$;

-- 4) 작업 끝내기 ----------------------------------------------------------------
--   p_outcome = 'succeeded' | 'failed' | 'retry'
--   retry 는 attempts 가 max_attempts 에 닿았으면 dead, 아니면 p_retry_in 뒤에 다시 queued.
-- 그 워커가 아직 쥐고 있을 때만 바꾼다. 바뀐 상태를 돌려주고, lease 를 잃었으면 null.
create or replace function public.finish_style_id_job(
  p_id uuid,
  p_worker text,
  p_outcome text,
  p_result jsonb default null,
  p_error text default null,
  p_retry_in interval default null
)
returns text
language plpgsql
set search_path = public
as $$
declare
  next_status text;
begin
  if p_outcome not in ('succeeded', 'failed', 'retry') then
    raise exception 'finish_style_id_job: 알 수 없는 outcome %', p_outcome;
  end if;

  update public.style_id_job j
     set status       = case
                          when p_outcome <> 'retry' then p_outcome
                          when j.attempts >= j.max_attempts then 'dead'
                          else 'queued'
                        end,
         result       = case when p_outcome = 'retry' then j.result else p_result end,
         last_error   = left(p_error, 4000),
         next_run_at  = case
                          when p_outcome = 'retry' then now() + coalesce(p_retry_in, interval '30 seconds')
                          else j.next_run_at
                        end,
         locked_by    = null,
         locked_until = null,
         finished_at  = case
                          when p_outcome <> 'retry' or j.attempts >= j.max_attempts then now()
                          else null
                        end
   where j.id = p_id and j.status = 'running' and j.locked_by = p_worker
  returning j.status into next_status;

  return next_status;
end;
$$;

-- 5) dead 작업 다시 실행 -------------------------------------------------------
-- 관리자가 부른다. dead 이고 이미지가 아직 남아 있을 때만 queued 로 되돌리고 attempts 를 0 으로 둔다.
-- last_error 는 앞 사유를 남긴 채 둔다(다음 실패 때 덮어쓴다). p_max_attempts 를 주면 그 값으로 바꾼다.
--   P0002 = 없는 작업 · 55000 = dead 가 아니거나 이미지를 이미 지움
create or replace function public.requeue_style_id_job(p_id uuid, p_max_attempts integer default null)
returns public.style_id_job
language plpgsql
set search_path = public
as $$
declare
  job public.style_id_job;
begin
  select * into job from public.style_id_job where id = p_id for update;
  if not found then
    raise exception 'style_id_job % 이 없습니다', p_id using errcode = 'P0002';
  end if;
  if job.status <> 'dead' then
    raise exception 'dead 작업만 다시 실행할 수 있습니다 (지금 %)', job.status using errcode = '55000';
  end if;
  if job.image_deleted_at is not null then
    raise exception '보존 기간이 지나 이미지를 지운 작업입니다 (%)', job.image_deleted_at using errcode = '55000';
  end if;
  if p_max_attempts is not null and p_max_attempts < 1 then
    raise exception 'p_max_attempts 는 1 이상이어야 합니다';
  end if;

  update public.style_id_job
     set status       = 'queued',
         attempts     = 0,
         max_attempts = coalesce(p_max_attempts, max_attempts),
         next_run_at  = now(),
         locked_by    = null,
         locked_until = null,
         result       = null,
         started_at   = null,
         finished_at  = null
   where id = p_id
  returning * into job;
  return job;
end;
$$;

-- 6) 보존 기간이 지난 dead 작업 이미지 지우기 ------------------------------------
-- 워커가 주기적으로 부른다. finished_at 이 p_retention 보다 오래된 dead 작업 n 개에 image_deleted_at 을 먼저 찍고
-- 그 image_path 를 돌려준다 — 워커가 Storage 에서 지운다. 먼저 찍으므로 지우는 사이에 requeue 가 끼어들지 못한다.
create or replace function public.claim_dead_style_id_job_images(p_retention interval, n integer)
returns table (id uuid, image_path text)
language sql
set search_path = public
as $$
  update public.style_id_job j
     set image_deleted_at = now()
   where j.id in (
           select s.id from public.style_id_job s
            where s.status = 'dead' and s.image_deleted_at is null
              and s.finished_at < now() - p_retention
            order by s.finished_at
            limit n
            for update skip locked
         )
  returning j.id, j.image_path;
$$;

-- 서버 라우트 · 워커(service role)만 부른다
revoke all on function public.claim_style_id_jobs(text, integer, interval) from public, anon, authenticated;
revoke all on function public.renew_style_id_job_lease(uuid, text, interval) from public, anon, authenticated;
revoke all on function public.finish_style_id_job(uuid, text, text, jsonb, text, interval) from public, anon, authenticated;
revoke all on function public.requeue_style_id_job(uuid, integer) from public, anon, authenticated;
revoke all on function public.claim_dead_style_id_job_images(interval, integer) from public, anon, authenticated;

-- 7) 작업 이미지 버킷(비공개) ---------------------------------------------------
-- 정책을 두지 않으므로 service role 만 읽고 쓴다. 지우는 시점은 맨 위 설명 참고.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'style-id-jobs',
  'style-id-jobs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
