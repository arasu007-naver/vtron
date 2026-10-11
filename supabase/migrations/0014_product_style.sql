-- 상품 Style ID — /style-ex 의 '상품 Style ID 추출' 결과
--
-- 등록된 상품(카탈로그 모델)의 원본 사진으로 스타일 아이디를 추출한 결과를 남긴다.
-- 추출 한 번 = 한 행. 같은 상품을 다시 추출하면 행이 쌓이고, 최신 결과는 product_style_latest 가 준다.
--
--   brand_catalog_models (0005)   상품 = 네이버 카탈로그 모델
--     └ product_style             그 상품 사진의 스타일 아이디 추출 결과
--
-- 채우는 곳: POST /api/style-ex 가 modelId 와 함께 오면(상품 사진으로 추출) 결과를 저장한다.
-- 파일을 직접 골라 추출한 결과는 상품이 없으므로 저장하지 않는다.
--
-- 0013 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다. 0001 과 같은 이유로
-- RLS 는 켜두되 정책은 두지 않는다(서버 라우트가 service role 로 읽고 쓴다).

create table if not exists public.product_style (
  id              uuid        primary key default gen_random_uuid(),
  model_id        text        not null
                    references public.brand_catalog_models (id) on delete cascade,
  image_url       text        not null,                  -- 추출에 쓴 상품 원본 사진

  -- 결과 — 네 축 글자를 모두 정했으면 ok, style_id 가 채워진다
  ok              boolean     not null,
  style_id        text        check (style_id ~ '^[EI][TC][SR][DM]$'),
  target_id       text,                                  -- 스타일 아이디를 정한 대표 의복
  axes            jsonb,                                 -- 축별 { letter, source, label, detail }
  error           text,                                  -- ok=false 일 때 이유

  -- 근거 — 응답 그대로
  scoring         jsonb,                                 -- 적격 의복별 EI · SR · DM 엔진 결과
  judgement       jsonb,                                 -- LLM 판정
  observation     jsonb,                                 -- 관찰 envelope

  custom_prompt   boolean     not null default false,    -- 관찰 · 판정 프롬프트를 기본값에서 고쳤는지
  vision_model    text,
  judge_model     text,
  elapsed_ms      integer,
  created_by      uuid        references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),

  check (not ok or style_id is not null)
);

comment on table public.product_style is
  '상품(카탈로그 모델) 사진으로 추출한 스타일 아이디. 추출 한 번 = 한 행';
comment on column public.product_style.axes is
  '축별 { letter, source: ENGINE | ENGINE_NEUTRAL_FIXED | LLM | LLM_FALLBACK, label, detail }';

create index if not exists product_style_model_time_idx
  on public.product_style (model_id, created_at desc);
create index if not exists product_style_style_id_idx
  on public.product_style (style_id)
  where ok;

alter table public.product_style enable row level security;

-- 상품마다 가장 최근의 성공한 결과
create or replace view public.product_style_latest
  with (security_invoker = true) as
select distinct on (model_id) *
  from public.product_style
 where ok
 order by model_id, created_at desc;
