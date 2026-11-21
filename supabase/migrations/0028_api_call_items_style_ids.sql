-- api_call_items.style_id 를 스타일 아이디 배열(text[])로 바꾼다
--
-- 판정에서 축이 중립이면 그 축은 양쪽 글자를 모두 가지고, 스타일 아이디는 그 글자들을 나머지 축과 조합한
-- 후보 전부가 된다 (2026-10-19 결정 · 0016_product_style_ids.sql 과 같은 규칙).
--   예: EI 중립 · TC=C · SR=S · DM 중립 → {ECSD, ECSM, ICSD, ICSM}
-- 지금까지 api_call_items.style_id 는 대표 조합 하나(text)만 남겨, 중립 상품의 나머지 후보가 열에 없었다.
--
--   style_id   text[] — 후보 전부. 순서는 각 축의 글자 순서(대표 글자 먼저)라 첫 번째가 예전의 대표 style_id 와 같다.
--              성공하지 못한 행은 null.
--   기존 행     result.candidates[].style_id 로 채운다. 후보가 없으면 예전 값 하나로 둔다.
--   finish_api_call_item(p_style_id text[]) — 워커(lib/style-id-api/worker.ts)가 후보 전부를 넘긴다.
--
-- 후보로 찾기:  select * from api_call_items where style_id @> array['ICSM'];
--
-- 0023 · 0025 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

-- 1) 열을 text → text[] 로 (ALTER … TYPE … USING 에는 서브쿼리를 쓸 수 없어 새 열로 옮긴다) -------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'api_call_items' and column_name = 'style_id' and data_type = 'text'
  ) then
    alter table public.api_call_items add column style_id_list text[];

    update public.api_call_items
       set style_id_list = case
             when jsonb_typeof(result -> 'candidates') = 'array' and jsonb_array_length(result -> 'candidates') > 0
               then array(select c ->> 'style_id' from jsonb_array_elements(result -> 'candidates') c where c ->> 'style_id' is not null)
             else array[style_id]
           end
     where style_id is not null;

    alter table public.api_call_items drop column style_id;
    alter table public.api_call_items rename column style_id_list to style_id;
  end if;
end;
$$;

comment on column public.api_call_items.style_id is
  '스타일 아이디 후보 전부 — 중립 축의 양쪽 글자(OR)를 다른 축과 조합한 것. 첫 번째 = 대표 조합. 성공하지 못한 행은 null';

-- 후보 검색(@>) 용
create index if not exists api_call_items_style_id_idx
  on public.api_call_items using gin (style_id)
  where style_id is not null;

-- 2) 결과를 남긴다 — p_style_id 를 배열로 받는다 (그 밖에는 0023 과 같다) --------------------------------
drop function if exists public.finish_api_call_item(uuid, text, text, jsonb, text, text, integer);

create or replace function public.finish_api_call_item(
  p_id            uuid,
  p_status        text,
  p_style_id      text[]  default null,
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
         style_id     = nullif(p_style_id, '{}'::text[]),
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

revoke all on function public.finish_api_call_item(uuid, text, text[], jsonb, text, text, integer) from public, anon, authenticated;
