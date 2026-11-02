-- 대량 Style ID 작업 — 대표 의복(prime target) 단계를 관찰보다 먼저 작업 전체에 돈다
--
--   작업을 받으면 상품은 모두 status = prime 으로 들어간다(상품명이 없는 것은 바로 queued · no_product).
--   ① 대표 의복 단계  워커가 claim_api_call_prime_items 로 여러 개씩 꺼내 JEV 로 대표 의복을 정하고
--                    finish_api_call_primes 로 prime_target · prime_group 을 남긴 뒤 queued 로 넘긴다.
--   ② 관찰 단계      작업의 모든 상품이 ①을 마친 뒤에만 꺼낸다(claim_api_call_items). 그룹마다 모아서 —
--                    found(대표 의복 확정) → not_found(못 정함, 이미지로 고른다) → no_product(상품명 없음) 순으로.
--
--   api_call_items.prime_group   found · not_found · no_product
--   api_call_log.job_status      priming = ① 중 (queued → priming → running → done · partial · failed)
--
-- 0023 · 0024 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.api_call_items add column if not exists prime_group text;

alter table public.api_call_items drop constraint if exists api_call_items_status_check;
alter table public.api_call_items
  add constraint api_call_items_status_check check (status in ('prime', 'queued', 'running', 'done', 'failed'));

alter table public.api_call_items drop constraint if exists api_call_items_prime_group_check;
alter table public.api_call_items
  add constraint api_call_items_prime_group_check check (prime_group in ('found', 'not_found', 'no_product'));

alter table public.api_call_log drop constraint if exists api_call_log_job_status_check;
alter table public.api_call_log
  add constraint api_call_log_job_status_check
  check (job_status in ('queued', 'priming', 'running', 'done', 'partial', 'failed'));

comment on column public.api_call_items.prime_group is
  '대표 의복 단계 결과 — found(JEV 로 확정) · not_found(못 정함 → 이미지로 고른다) · no_product(상품명 없음)';

create index if not exists api_call_items_prime_idx
  on public.api_call_items (call_id)
  where status = 'prime';

-- 진행 수 · 상태 — 대표 의복 단계(priming)를 더한다
create or replace function public.api_call_job_refresh(p_call_id uuid)
returns void
language sql
as $$
  update public.api_call_log l
     set item_done   = c.done,
         item_failed = c.failed,
         job_status  = case
                         when c.done + c.failed < c.total then
                           case
                             when c.priming > 0 then 'priming'
                             when c.started > 0 then 'running'
                             else 'queued'
                           end
                         when c.failed = 0 then 'done'
                         when c.done = 0 then 'failed'
                         else 'partial'
                       end,
         finished_at = case when c.done + c.failed = c.total then coalesce(l.finished_at, now()) end
    from (
      select count(*)::int                                          as total,
             count(*) filter (where status = 'done')::int           as done,
             count(*) filter (where status = 'failed')::int         as failed,
             count(*) filter (where status = 'prime')::int          as priming,
             count(*) filter (where started_at is not null)::int    as started
        from public.api_call_items
       where call_id = p_call_id
    ) c
   where l.id = p_call_id;
$$;

-- ① 대표 의복 단계 — prime 상품을 여러 개씩 꺼낸다. status 는 prime 그대로, lease 동안 이 워커의 것
create or replace function public.claim_api_call_prime_items(
  p_limit          integer default 50,
  p_lease_seconds  integer default 300
)
returns setof public.api_call_items
language plpgsql
as $$
declare
  v_calls uuid[];
begin
  return query
  with picked as (
    select i.id
      from public.api_call_items i
      join public.api_call_log l on l.id = i.call_id
     where i.status = 'prime'
       and (i.locked_until is null or i.locked_until < now())
     order by l.created_at, i.seq
     for update of i skip locked
     limit greatest(p_limit, 1)
  ), claimed as (
    update public.api_call_items i
       set locked_until = now() + make_interval(secs => p_lease_seconds)
      from picked
     where i.id = picked.id
    returning i.*
  ), parents as (
    update public.api_call_log l
       set job_status = 'priming'
     where l.id in (select call_id from claimed)
       and l.job_status = 'queued'
    returning l.id
  )
  select * from claimed;
end;
$$;

-- ① 결과를 한꺼번에 남긴다 — p_items = [{ "id", "prime_target", "prime_group" }]. prime 인 행만 queued 로 넘긴다
create or replace function public.finish_api_call_primes(p_items jsonb)
returns integer
language plpgsql
as $$
declare
  v_calls uuid[];
  v_count integer;
begin
  with input as (
    select (x ->> 'id')::uuid as id, x -> 'prime_target' as prime_target, x ->> 'prime_group' as prime_group
      from jsonb_array_elements(p_items) as x
  ), done as (
    update public.api_call_items i
       set status = 'queued',
           locked_until = null,
           prime_target = nullif(input.prime_target, 'null'::jsonb),
           prime_group = input.prime_group
      from input
     where i.id = input.id
       and i.status = 'prime'
    returning i.call_id
  )
  select array_agg(distinct call_id), count(*)::int into v_calls, v_count from done;

  if v_calls is not null then
    perform public.api_call_job_refresh(c) from unnest(v_calls) as c;
  end if;
  return coalesce(v_count, 0);
end;
$$;

-- ② 관찰 단계 — 작업의 모든 상품이 ①을 마친 뒤에만, 그룹마다 모아서(found → not_found → no_product) 꺼낸다
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
    select i.id
      from public.api_call_items i
      join public.api_call_log l on l.id = i.call_id
     where (i.status = 'queued' or (i.status = 'running' and i.locked_until < now()))
       and i.attempts < p_max_attempts
       and not exists (
         select 1 from public.api_call_items p
          where p.call_id = i.call_id and p.status = 'prime'
       )
     order by l.created_at,
              case i.prime_group when 'found' then 0 when 'not_found' then 1 else 2 end,
              i.seq
     for update of i skip locked
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
       and l.job_status in ('queued', 'priming')
    returning l.id
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_api_call_prime_items(integer, integer) from public, anon, authenticated;
revoke all on function public.finish_api_call_primes(jsonb) from public, anon, authenticated;
