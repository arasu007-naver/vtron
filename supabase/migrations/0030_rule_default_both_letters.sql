-- 엔진이 방향을 내지 못한 축(RULE_DEFAULT)도 양쪽 글자(OR)를 모두 갖는다 (2026-11-20 결정)
--
-- 지금까지 방향이 없는 축은 기본 글자 하나(E · C · S · D)로 채워, 판정하지 못한 상품도 스타일 아이디 하나(예: ECSD)로 남았다.
-- 이제 그 축은 어느 쪽인지 모르므로 중립과 같이 양쪽 글자를 갖고, 스타일 아이디는 그 글자들을 조합한 후보 전부가 된다.
--   예: 네 축 모두 방향 없음 → 16개 후보 (첫 번째 = ECSD)
--
-- 새 결과는 앱(lib/style-ex/judge-v2.ts · extract.ts)이 letters 에 두 글자를 넣는다.
-- 예전 결과(letters 가 한 글자인 RULE_DEFAULT)는 아래 규칙으로 양쪽 글자로 되살린다 — lib/style-ex/style-ids.ts lettersOf 와 같다.
--
--   1) style_axis_letters  RULE_DEFAULT 면 letter 를 먼저 둔 양쪽 글자
--   2) product_style       style_ids(생성 열)를 다시 계산한다 — RULE_DEFAULT 축이 있는 행만 다시 쓴다
--   3) api_call_items      style_id(text[], 0028)를 result.axes 로 다시 계산한다
--
-- 0016 · 0028 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

-- 1) 한 축이 가질 수 있는 글자들 (대표 글자 먼저)
create or replace function public.style_axis_letters(axis jsonb, poles text[])
returns text[]
language sql
immutable
as $$
  select case
    when axis ->> 'source' = 'RULE_DEFAULT' and nullif(axis ->> 'letter', '') is not null
      then array[axis ->> 'letter'] || array(select p from unnest(poles) p where p <> axis ->> 'letter')
    when jsonb_typeof(axis -> 'letters') = 'array' and jsonb_array_length(axis -> 'letters') > 0
      then array(select jsonb_array_elements_text(axis -> 'letters'))
    when nullif(axis ->> 'letter', '') is null
      then '{}'::text[]
    when axis ->> 'source' = 'ENGINE_NEUTRAL_FIXED'
      then array[axis ->> 'letter'] || array(select p from unnest(poles) p where p <> axis ->> 'letter')
    else array[axis ->> 'letter']
  end
$$;

-- 2) product_style — 생성 열은 행을 고칠 때 다시 계산된다
update public.product_style
   set axes = axes
 where ok
   and jsonb_path_exists(axes, '$.* ? (@.source == "RULE_DEFAULT")');

-- 3) api_call_items — 성공한 상품의 후보를 축 글자로 다시 조합한다
update public.api_call_items
   set style_id = nullif(public.style_id_combos(result -> 'axes'), '{}'::text[])
 where status = 'done'
   and result ? 'axes'
   and jsonb_path_exists(result -> 'axes', '$.* ? (@.source == "RULE_DEFAULT")');
