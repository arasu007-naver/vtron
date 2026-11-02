-- 외부 API 대량 Style ID 추출 — 작업 목록(api_call_log) + 작업 큐(api_call_items)
--
--   POST /api/v1/style-id/jobs 로 상품 여러 개(JSON 배열 · CSV)를 받으면
--     1) api_call_log 에 그 요청을 작업 한 건(job_status = queued, item_total)으로 먼저 저장하고
--     2) 상품 하나 = api_call_items 한 행(status = queued)으로 큐에 넣은 뒤 202 를 돌려준다.
--   워커(lib/style-id-api/worker.ts)가 claim_api_call_items 로 큐에서 꺼내 추출하고
--   finish_api_call_item 으로 결과를 남긴다 — 그때마다 api_call_log 의 진행 수 · job_status 가 갱신된다.
--
--   api_call_log.job_status   null = 작업이 아닌 호출(/api/v1/style-id · /me · 조회 등)
--                             queued → running → done(모두 성공) · partial(일부 실패) · failed(모두 실패)
--   api_call_items.status     queued → running → done · failed
--                             running 인데 locked_until 이 지나면(워커가 죽음) 다시 꺼낸다 — attempts 가 한도에 닿으면 failed
--   이미지                    image_url(업체가 준 주소, 처리 때 받는다) 또는 image_path(업로드 받은 바이트 —
--                             비공개 버킷 api-call-images, 처리가 끝나면 지운다) 중 하나
--
-- 0019 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).
-- RLS 는 켜두되 정책은 두지 않는다 — 서버 라우트만 service role 로 읽고 쓴다.

-- 1) 작업 목록 — api_call_log 의 작업 열 --------------------------------------
alter table public.api_call_log add column if not exists job_status  text;
alter table public.api_call_log add column if not exists item_total  integer;
alter table public.api_call_log add column if not exists item_done   integer not null default 0;
alter table public.api_call_log add column if not exists item_failed integer not null default 0;
alter table public.api_call_log add column if not exists finished_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'api_call_log_job_status_check'
       and conrelid = 'public.api_call_log'::regclass
  ) then
    alter table public.api_call_log
      add constraint api_call_log_job_status_check
      check (job_status in ('queued', 'running', 'done', 'partial', 'failed'));
  end if;
end;
$$;

comment on column public.api_call_log.job_status is
  '대량 작업(POST /api/v1/style-id/jobs)의 상태 — queued · running · done · partial · failed. 작업이 아닌 호출은 null';
comment on column public.api_call_log.item_total is '작업의 상품 수 (api_call_items 행 수)';
comment on column public.api_call_log.item_done is '추출을 마친(성공) 상품 수';
comment on column public.api_call_log.item_failed is '실패로 끝난 상품 수';
comment on column public.api_call_log.finished_at is '모든 상품이 끝난 시각';

create index if not exists api_call_log_jobs_idx
  on public.api_call_log (business_user_id, created_at desc)
  where job_status is not null;

-- 2) 작업 큐 — 상품 하나 = 한 행 ---------------------------------------------
create table if not exists public.api_call_items (
  id                uuid        primary key default gen_random_uuid(),
  call_id           uuid        not null references public.api_call_log (id) on delete cascade,
  business_user_id  uuid        references public.business_user (id) on delete set null,
  seq               integer     not null,                -- 요청 안의 순서(0부터) — 결과도 이 순서로 준다
  ref               text,                                -- 업체 쪽 상품 id (product.id)
  product           jsonb       not null,                -- 받은 상품 정보 { name, category, … }
  image_url         text,
  image_path        text,                                -- 버킷 api-call-images 안의 경로
  status            text        not null default 'queued'
                      check (status in ('queued', 'running', 'done', 'failed')),
  attempts          integer     not null default 0,
  locked_until      timestamptz,
  style_id          text,
  result            jsonb,                               -- { style_id, style, candidates, axes, prime_target, … }
  error             text,                                -- 업체에게 돌려주는 사유
  error_detail      text,                                -- 서버 쪽 사유
  elapsed_ms        integer,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  finished_at       timestamptz,
  unique (call_id, seq),
  check (image_url is not null or image_path is not null)
);

comment on table public.api_call_items is
  '대량 Style ID 작업의 상품별 큐 · 결과. 작업 = api_call_log 한 행(job_status 가 있는 행)';

create index if not exists api_call_items_queue_idx
  on public.api_call_items (created_at, seq)
  where status in ('queued', 'running');

alter table public.api_call_items enable row level security;
revoke all on public.api_call_items from anon, authenticated;

-- 3) 작업의 진행 수 · 상태를 다시 센다 ----------------------------------------
create or replace function public.api_call_job_refresh(p_call_id uuid)
returns void
language sql
as $$
  update public.api_call_log l
     set item_done   = c.done,
         item_failed = c.failed,
         job_status  = case
                         when c.done + c.failed < c.total then
                           case when c.started > 0 then 'running' else 'queued' end
                         when c.failed = 0 then 'done'
                         when c.done = 0 then 'failed'
                         else 'partial'
                       end,
         finished_at = case when c.done + c.failed = c.total then coalesce(l.finished_at, now()) end
    from (
      select count(*)::int                                          as total,
             count(*) filter (where status = 'done')::int           as done,
             count(*) filter (where status = 'failed')::int         as failed,
             count(*) filter (where started_at is not null)::int    as started
        from public.api_call_items
       where call_id = p_call_id
    ) c
   where l.id = p_call_id;
$$;

-- 4) 큐에서 꺼낸다 — 여러 워커가 동시에 불러도 같은 행을 두 번 꺼내지 않는다 ----------
--   p_lease_seconds 동안 그 워커의 것이다. 그 안에 finish 하지 못하면(워커가 죽음) 다시 꺼낼 수 있다.
--   attempts 가 p_max_attempts 에 닿은 채 lease 가 지난 행은 failed 로 닫는다.
create or replace function public.claim_api_call_items(
  p_limit          integer default 1,
  p_lease_seconds  integer default 900,
  p_max_attempts   integer default 3
)
returns setof public.api_call_items
language plpgsql
as $$
declare
  v_calls uuid[];
begin
  with dead as (
    update public.api_call_items
       set status = 'failed',
           locked_until = null,
           finished_at = now(),
           error = coalesce(error, '처리 시간이 초과되었습니다.'),
           error_detail = coalesce(error_detail, 'lease expired after max attempts')
     where status = 'running'
       and locked_until < now()
       and attempts >= p_max_attempts
    returning call_id
  )
  select array_agg(distinct call_id) into v_calls from dead;

  if v_calls is not null then
    perform public.api_call_job_refresh(c) from unnest(v_calls) as c;
  end if;

  return query
  with picked as (
    select id
      from public.api_call_items
     where (status = 'queued' or (status = 'running' and locked_until < now()))
       and attempts < p_max_attempts
     order by created_at, seq
     for update skip locked
     limit greatest(p_limit, 1)
  ), claimed as (
    update public.api_call_items i
       set status = 'running',
           attempts = i.attempts + 1,
           locked_until = now() + make_interval(secs => p_lease_seconds),
           started_at = coalesce(i.started_at, now())
      from picked
     where i.id = picked.id
    returning i.*
  ), parents as (
    update public.api_call_log l
       set job_status = 'running'
     where l.id in (select call_id from claimed)
       and l.job_status = 'queued'
    returning l.id
  )
  select * from claimed;
end;
$$;

-- 5) 결과를 남긴다 — p_status 'queued' 는 다시 시도(일시적 오류) -----------------
--   그 행을 지금 들고 있는 워커만 쓸 수 있다(status = running).
create or replace function public.finish_api_call_item(
  p_id            uuid,
  p_status        text,
  p_style_id      text    default null,
  p_result        jsonb   default null,
  p_error         text    default null,
  p_error_detail  text    default null,
  p_elapsed_ms    integer default null
)
returns boolean
language plpgsql
as $$
declare
  v_call uuid;
begin
  if p_status not in ('done', 'failed', 'queued') then
    raise exception 'finish_api_call_item: status % 는 쓸 수 없습니다', p_status;
  end if;

  update public.api_call_items
     set status       = p_status,
         locked_until = null,
         style_id     = p_style_id,
         result       = p_result,
         error        = p_error,
         error_detail = p_error_detail,
         elapsed_ms   = p_elapsed_ms,
         finished_at  = case when p_status = 'queued' then null else now() end
   where id = p_id
     and status = 'running'
  returning call_id into v_call;

  if v_call is null then
    return false;
  end if;
  perform public.api_call_job_refresh(v_call);
  return true;
end;
$$;

revoke all on function public.api_call_job_refresh(uuid) from public, anon, authenticated;
revoke all on function public.claim_api_call_items(integer, integer, integer) from public, anon, authenticated;
revoke all on function public.finish_api_call_item(uuid, text, text, jsonb, text, text, integer) from public, anon, authenticated;
