-- 상품 Style ID 후보 — 중립 축의 양쪽 글자(OR)를 다른 축과 조합한 스타일 아이디 전부
--
-- 판정에서 축이 중립(엔진 점수 5, 또는 엔진 방향 NEUTRAL)이면 그 축은 양쪽 글자를 모두 가진다.
-- 스타일 아이디는 그 글자들을 나머지 축과 조합한 후보 전부가 된다 (2026-10-19 결정).
--   예: EI 중립 · TC=C · SR=S · DM 중립 → {ECSD, ECSM, ICSD, ICSM}
-- style_id 는 예전처럼 대표 조합 하나(중립이면 E · S · D 쪽)로 남고, 후보 첫 번째와 같다.
--
--   style_ids   axes 에서 계산되는 생성 열(generated column) — 앱은 쓰지 않는다. ok 가 아니면 null.
--               기존 행도 이 파일을 실행하는 순간 채워진다(backfill 이 따로 필요 없다).
--
-- 축별 글자 규칙 (lib/style-ex/style-ids.ts 의 styleIdCombos 와 같다 — 한쪽을 고치면 다른 쪽도 고친다):
--   axes.<축>.letters 가 있으면 그 글자들
--   없으면(2026-10-19 전 저장분) letter 하나 — 단 source 가 ENGINE_NEUTRAL_FIXED(중립을 한쪽으로 고정했던
--   예전 결과)면 지금 규칙대로 양쪽 글자로 되살린다
--   글자를 정하지 못한 축이 있으면 후보 없음({})
--
-- 후보로 찾기:  select * from product_style_latest where style_ids @> array['ICSM'];
--
-- 0014 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

-- 한 축이 가질 수 있는 글자들 (대표 글자 먼저)
create or replace function public.style_axis_letters(axis jsonb, poles text[])
returns text[]
language sql
immutable
as $$
  select case
    when jsonb_typeof(axis -> 'letters') = 'array' and jsonb_array_length(axis -> 'letters') > 0
      then array(select jsonb_array_elements_text(axis -> 'letters'))
    when nullif(axis ->> 'letter', '') is null
      then '{}'::text[]
    when axis ->> 'source' = 'ENGINE_NEUTRAL_FIXED'
      then array[axis ->> 'letter'] || array(select p from unnest(poles) p where p <> axis ->> 'letter')
    else array[axis ->> 'letter']
  end
$$;

-- 네 축(EI · TC · SR · DM)의 글자를 조합한 스타일 아이디 후보. 순서는 각 축의 글자 순서를 따른다.
create or replace function public.style_id_combos(axes jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(ei.l || tc.l || sr.l || dm.l order by ei.i, tc.i, sr.i, dm.i), '{}'::text[])
    from unnest(public.style_axis_letters(axes -> 'EI', array['E', 'I'])) with ordinality ei(l, i)
   cross join unnest(public.style_axis_letters(axes -> 'TC', array['T', 'C'])) with ordinality tc(l, i)
   cross join unnest(public.style_axis_letters(axes -> 'SR', array['S', 'R'])) with ordinality sr(l, i)
   cross join unnest(public.style_axis_letters(axes -> 'DM', array['D', 'M'])) with ordinality dm(l, i)
$$;

alter table public.product_style
  add column if not exists style_ids text[]
    generated always as (case when ok then public.style_id_combos(axes) end) stored;

comment on column public.product_style.style_ids is
  '스타일 아이디 후보 — 중립 축의 양쪽 글자(OR)를 다른 축과 조합한 전부. axes 에서 계산(생성 열), ok 가 아니면 null';
comment on column public.product_style.axes is
  '축별 { letter, letters, source: ENGINE | ENGINE_NEUTRAL | ENGINE_NEUTRAL_FIXED | ENGINE_DIRECTION | RULE_DEFAULT | LLM | LLM_FALLBACK, label, detail }';

-- 후보 검색(@>) 용
create index if not exists product_style_style_ids_idx
  on public.product_style using gin (style_ids)
  where ok;

-- product_style_latest 는 select * 라 새 열을 보이려면 다시 만든다
create or replace view public.product_style_latest
  with (security_invoker = true) as
select distinct on (model_id) *
  from public.product_style
 where ok
 order by model_id, created_at desc;
