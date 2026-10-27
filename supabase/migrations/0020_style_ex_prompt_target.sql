-- style-ex 프롬프트 버전에 대상(target)을 더한다 — 의복별(item) · 착장 전체(full)
--
--   target  item = /style-ex 의 의복별 프롬프트 (지금까지의 모든 행)
--           full = /full-style-id-extraction 의 Full-Look 관찰 프롬프트 (승인 프롬프트 V2 에서 시작)
--
-- 버전 번호 · 내용 중복 · 활성 버전은 이제 (target, kind) 마다 따로 센다. 기존 행은 모두 target = 'item' 이 된다.
-- full 에 행이 하나도 없으면 서버가 코드 기본 프롬프트(Full-Look Vision Extractor 의 승인 프롬프트 V2 원문)를
-- v1 로 등록하고 활성화한다 (lib/style-ex/prompt-versions.ts).
--
-- 0015 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.style_ex_prompt_versions
  add column if not exists target text not null default 'item';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'style_ex_prompt_versions_target_check'
       and conrelid = 'public.style_ex_prompt_versions'::regclass
  ) then
    alter table public.style_ex_prompt_versions
      add constraint style_ex_prompt_versions_target_check check (target in ('item', 'full'));
  end if;
end;
$$;

comment on column public.style_ex_prompt_versions.target is
  'item = /style-ex 의복별 프롬프트 · full = /full-style-id-extraction 착장 전체 프롬프트';
comment on table public.style_ex_prompt_versions is
  'style-ex 관찰(observe) · 판정(judge) 프롬프트 버전. 고칠 때마다 한 행, (target, kind) 마다 활성 버전 하나';

-- 유일 조건을 (target, kind) 단위로 바꾼다
alter table public.style_ex_prompt_versions drop constraint if exists style_ex_prompt_versions_kind_version_key;
alter table public.style_ex_prompt_versions drop constraint if exists style_ex_prompt_versions_kind_content_sha256_key;
drop index if exists public.style_ex_prompt_versions_active_idx;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'style_ex_prompt_versions_target_kind_version_key') then
    alter table public.style_ex_prompt_versions
      add constraint style_ex_prompt_versions_target_kind_version_key unique (target, kind, version);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'style_ex_prompt_versions_target_kind_content_sha256_key') then
    alter table public.style_ex_prompt_versions
      add constraint style_ex_prompt_versions_target_kind_content_sha256_key unique (target, kind, content_sha256);
  end if;
end;
$$;

-- (target, kind) 마다 활성 버전은 하나
create unique index if not exists style_ex_prompt_versions_target_active_idx
  on public.style_ex_prompt_versions (target, kind)
  where is_active;

-- 새 버전 등록 — 0015 의 함수에 p_target 을 더한다. 인자 이름으로 부를 때 헷갈리지 않게 옛 함수는 지운다.
drop function if exists public.create_style_ex_prompt_version(text, text, text, boolean, uuid);

create or replace function public.create_style_ex_prompt_version(
  p_kind       text,
  p_content    text,
  p_note       text,
  p_activate   boolean,
  p_created_by uuid,
  p_target     text default 'item'
) returns public.style_ex_prompt_versions
language plpgsql
as $$
declare
  next_version integer;
  created      public.style_ex_prompt_versions;
begin
  -- 같은 (target, kind) 를 동시에 등록하면 버전 번호가 겹치므로 그 단위로 줄 세운다
  perform pg_advisory_xact_lock(hashtext('style_ex_prompt_versions:' || p_target || ':' || p_kind));

  select coalesce(max(version), 0) + 1 into next_version
    from public.style_ex_prompt_versions
   where target = p_target and kind = p_kind;

  if p_activate then
    update public.style_ex_prompt_versions
       set is_active = false
     where target = p_target and kind = p_kind and is_active;
  end if;

  insert into public.style_ex_prompt_versions
    (target, kind, version, content, content_sha256, note, is_active, activated_at, created_by)
  values
    (p_target, p_kind, next_version, p_content, encode(sha256(convert_to(p_content, 'UTF8')), 'hex'),
     nullif(btrim(p_note), ''), p_activate, case when p_activate then now() end, p_created_by)
  returning * into created;

  return created;
end;
$$;

-- 버전 활성화(롤백 포함) — 같은 (target, kind) 의 다른 활성 버전을 끄고 이 버전을 켠다
create or replace function public.activate_style_ex_prompt_version(p_id uuid)
returns public.style_ex_prompt_versions
language plpgsql
as $$
declare
  target_row public.style_ex_prompt_versions;
begin
  select * into target_row from public.style_ex_prompt_versions where id = p_id;
  if not found then
    raise exception 'style_ex_prompt_versions % 가 없습니다', p_id using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtext('style_ex_prompt_versions:' || target_row.target || ':' || target_row.kind));

  update public.style_ex_prompt_versions
     set is_active = false
   where target = target_row.target and kind = target_row.kind and is_active and id <> p_id;

  update public.style_ex_prompt_versions
     set is_active = true, activated_at = now()
   where id = p_id
  returning * into target_row;

  return target_row;
end;
$$;

-- 서버 라우트(service role)만 부른다
revoke all on function public.create_style_ex_prompt_version(text, text, text, boolean, uuid, text) from public, anon, authenticated;
revoke all on function public.activate_style_ex_prompt_version(uuid) from public, anon, authenticated;
