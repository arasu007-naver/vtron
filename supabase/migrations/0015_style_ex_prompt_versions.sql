-- style-ex 프롬프트 버전 — /style-ex 의 관찰 · 판정 프롬프트
--
-- 두 프롬프트를 버전으로 쌓아 관리한다. 고칠 때마다 새 버전이 한 행으로 늘고, 지난 버전은 지우거나
-- 덮어쓰지 않는다. 종류(kind)마다 활성 버전이 하나 있고, 추출(POST /api/style-ex)은 프롬프트를
-- 따로 받지 않으면 활성 버전을 쓴다. 지난 버전을 다시 활성화하면 롤백이다.
--
--   kind     observe = 관찰 프롬프트(이미지 → 37개 파라미터) · judge = 판정 프롬프트(관찰값 → 스타일 아이디)
--   version  종류마다 1, 2, 3 … (create_style_ex_prompt_version 이 매긴다)
--
-- 종류에 행이 하나도 없으면 서버가 코드의 기본 프롬프트(lib/style-ex/extract.ts · judge.ts)를
-- v1 로 등록하고 활성화한다. 이 표가 없거나 읽지 못하면 코드 기본 프롬프트로 추출한다.
--
-- product_style 에 추출에 쓴 버전을 남겨, 어느 결과가 어느 프롬프트에서 나왔는지 거슬러 갈 수 있게 한다.
-- 등록되지 않은(화면에서 고치고 저장하지 않은) 프롬프트로 추출하면 비운다.
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다). product_style 의 열은
-- 0014 가 실행돼 있을 때만 붙는다 — 0014 를 나중에 실행했으면 이 파일을 다시 실행한다. 0001 과 같은 이유로
-- RLS 는 켜두되 정책은 두지 않는다(서버 라우트가 service role 로 읽고 쓴다).

create table if not exists public.style_ex_prompt_versions (
  id              uuid        primary key default gen_random_uuid(),
  kind            text        not null check (kind in ('observe', 'judge')),
  version         integer     not null check (version > 0),
  content         text        not null check (length(btrim(content)) > 0),
  content_sha256  text        not null,                  -- 같은 내용을 두 번 등록하지 않게, 추출에 쓴 내용으로 버전을 찾게
  note            text,                                  -- 무엇을 왜 바꿨는지
  is_active       boolean     not null default false,
  activated_at    timestamptz,                           -- 마지막으로 활성화된 때
  created_by      uuid        references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),

  unique (kind, version),
  unique (kind, content_sha256)
);

comment on table public.style_ex_prompt_versions is
  '/style-ex 관찰(observe) · 판정(judge) 프롬프트 버전. 고칠 때마다 한 행, 종류마다 활성 버전 하나';

-- 종류마다 활성 버전은 하나
create unique index if not exists style_ex_prompt_versions_active_idx
  on public.style_ex_prompt_versions (kind)
  where is_active;

alter table public.style_ex_prompt_versions enable row level security;

-- 새 버전 등록 — 버전 번호 매기기와 (선택) 활성화를 한 트랜잭션으로 한다.
-- 같은 내용이 이미 있으면 unique 위반(23505)으로 거절한다.
create or replace function public.create_style_ex_prompt_version(
  p_kind       text,
  p_content    text,
  p_note       text,
  p_activate   boolean,
  p_created_by uuid
) returns public.style_ex_prompt_versions
language plpgsql
as $$
declare
  next_version integer;
  created      public.style_ex_prompt_versions;
begin
  -- 같은 종류를 동시에 등록하면 버전 번호가 겹치므로 종류 단위로 줄 세운다
  perform pg_advisory_xact_lock(hashtext('style_ex_prompt_versions:' || p_kind));

  select coalesce(max(version), 0) + 1 into next_version
    from public.style_ex_prompt_versions
   where kind = p_kind;

  if p_activate then
    update public.style_ex_prompt_versions
       set is_active = false
     where kind = p_kind and is_active;
  end if;

  insert into public.style_ex_prompt_versions
    (kind, version, content, content_sha256, note, is_active, activated_at, created_by)
  values
    (p_kind, next_version, p_content, encode(sha256(convert_to(p_content, 'UTF8')), 'hex'),
     nullif(btrim(p_note), ''), p_activate, case when p_activate then now() end, p_created_by)
  returning * into created;

  return created;
end;
$$;

-- 버전 활성화(롤백 포함) — 같은 종류의 다른 활성 버전을 끄고 이 버전을 켠다
create or replace function public.activate_style_ex_prompt_version(p_id uuid)
returns public.style_ex_prompt_versions
language plpgsql
as $$
declare
  target public.style_ex_prompt_versions;
begin
  select * into target from public.style_ex_prompt_versions where id = p_id;
  if not found then
    raise exception 'style_ex_prompt_versions % 가 없습니다', p_id using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtext('style_ex_prompt_versions:' || target.kind));

  update public.style_ex_prompt_versions
     set is_active = false
   where kind = target.kind and is_active and id <> p_id;

  update public.style_ex_prompt_versions
     set is_active = true, activated_at = now()
   where id = p_id
  returning * into target;

  return target;
end;
$$;

-- 서버 라우트(service role)만 부른다
revoke all on function public.create_style_ex_prompt_version(text, text, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.activate_style_ex_prompt_version(uuid) from public, anon, authenticated;

-- 추출 결과에 쓴 프롬프트 버전 — product_style(0014)이 있을 때만.
-- 0014 를 아직 실행하지 않았으면 건너뛴다. 0014 를 실행한 뒤 이 파일을 다시 실행하면 열이 붙는다
-- (이 파일은 여러 번 실행해도 된다).
do $$
begin
  if to_regclass('public.product_style') is null then
    raise notice 'product_style 이 없어 버전 열을 건너뜁니다. 0014 실행 후 0015 를 다시 실행하세요.';
    return;
  end if;

  alter table public.product_style
    add column if not exists observe_prompt_version_id uuid
      references public.style_ex_prompt_versions (id) on delete set null,
    add column if not exists judge_prompt_version_id uuid
      references public.style_ex_prompt_versions (id) on delete set null;

  comment on column public.product_style.observe_prompt_version_id is
    '추출에 쓴 관찰 프롬프트 버전. 등록되지 않은 프롬프트였으면 null';
  comment on column public.product_style.judge_prompt_version_id is
    '추출에 쓴 판정 프롬프트 버전. 등록되지 않은 프롬프트였으면 null';

  -- product_style_latest 는 select * 라 새 열을 보이려면 다시 만든다
  create or replace view public.product_style_latest
    with (security_invoker = true) as
  select distinct on (model_id) *
    from public.product_style
   where ok
   order by model_id, created_at desc;
end;
$$;
