-- 상품 Style ID 추출 기록에 대상(target)과 프롬프트 버전(version)을 더한다 — 어느 페이지가 어느 관찰 프롬프트로 연산 · 추출했는지
--
--   target   item = /style-ex 의복별 추출 (지금까지의 모든 행)
--            full = 인덱스(/) · /full-style-id-extraction 의 착장 전체(Full-Look) 추출
--   version  추출에 쓴 관찰 프롬프트의 버전 레이블 (lib/style-ex/prompt-versions.ts versionLabel)
--            프롬프트가 머리에 prompt_version: FULL_LOOK_OBSERVE_V1_1 처럼 버전을 밝히면 그것(v1.1 · v1.2),
--            아니면 버전 표(style_ex_prompt_versions)의 번호(v1 · v2 …), 등록되지 않은(화면에서 고친) 내용이면 custom.
--            기존 행은 observe_prompt_version_id 로 v{번호}를 채우고, 버전 표 전에 저장된 행은 비워 둔다.
--
-- 화면(상품 Style ID)은 사진 오른쪽 아래에 "target:version" 을 보인다.
--
-- 기존 행은 모두 target = 'item' 이 된다. target_id(스타일 아이디를 정한 대표 의복)와는 다른 열이다 — full 행은
-- 대표 의복이 없어 target_id 가 비어 있다.
--
-- product_style_latest 는 상품마다 최신 성공 행 하나였는데, 이제 (상품, target) 마다 하나다 — item 결과와 full 결과가
-- 서로를 덮지 않게. 하나만 원하면 target 으로 거른다.
--
-- 0014 · 0016 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.product_style
  add column if not exists target text not null default 'item';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'product_style_target_check'
       and conrelid = 'public.product_style'::regclass
  ) then
    alter table public.product_style
      add constraint product_style_target_check check (target in ('item', 'full'));
  end if;
end;
$$;

comment on column public.product_style.target is
  'item = /style-ex 의복별 추출 · full = 인덱스(/full-style-id-extraction) 착장 전체 추출';

alter table public.product_style
  add column if not exists version text;

comment on column public.product_style.version is
  '추출에 쓴 관찰 프롬프트 버전 레이블 — v1.1 · v1.2(프롬프트가 밝힌 버전) · v1 · v2(버전 표 번호) · custom(등록 안 한 내용). 버전 표 전 행은 null';

-- 기존 행: 버전 표의 번호로 채운다 (0015 의 observe_prompt_version_id 가 있을 때만)
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'product_style' and column_name = 'observe_prompt_version_id'
  ) then
    update public.product_style ps
       set version = 'v' || v.version
      from public.style_ex_prompt_versions v
     where ps.version is null
       and ps.observe_prompt_version_id = v.id;
  end if;
end;
$$;

create index if not exists product_style_target_time_idx
  on public.product_style (target, created_at desc);

-- select * 라 새 열을 보이려면 다시 만든다. 열 구성이 바뀌므로 지우고 만든다.
drop view if exists public.product_style_latest;
create view public.product_style_latest
  with (security_invoker = true) as
select distinct on (model_id, target) *
  from public.product_style
 where ok
 order by model_id, target, created_at desc;
