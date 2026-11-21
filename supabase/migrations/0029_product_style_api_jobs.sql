-- 외부 API 대량 작업(api_call_items)의 결과도 product_style 에 남긴다
--
-- 지금까지 product_style 은 /style-ex · /full-style-ex 가 카탈로그 상품(brand_catalog_models) 사진으로 추출한 것만 받았다.
-- API 작업(/admin/api-log 의 CSV 입력 · POST /api/v1/style-id/jobs)은 업체 상품이라 카탈로그에 없을 수 있다.
--
--   model_id           이제 비어도 된다 — 업체 상품 id(api_call_items.ref)가 카탈로그 모델 id 와 같을 때만 채운다
--   image_url          이제 비어도 된다 — 업체가 사진을 파일로 올린 상품(버킷에 잠시 두고 지운다)은 주소가 없다
--   api_call_item_id   이 결과를 낸 작업 상품 (api_call_items.id) — 상품 하나에 한 행. 다시 진행하면 그 행을 고친다(upsert)
--   business_user_id   그 작업의 업체
--   product            업체가 준 상품 정보 그대로 (브랜드 · 상품명 · 분류 …, api_call_items.product 와 같다)
--
-- target 은 'item' 이다 — API 작업은 /style-ex 와 같은 의복별 관찰 프롬프트(item) · 판정 함수로 추출한다.
-- style_ids(0016 생성 열)도 axes 에서 그대로 계산된다.
--
-- product_style_latest 는 (상품, target) 마다 최신 성공 행 하나다. 카탈로그 상품이 아닌 API 결과(model_id 없음)는
-- 작업 상품마다 따로 본다 — 서로 하나로 묶이지 않게.
--
-- 0021 · 0023 · 0028 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.product_style alter column model_id drop not null;
alter table public.product_style alter column image_url drop not null;

alter table public.product_style
  add column if not exists api_call_item_id uuid references public.api_call_items (id) on delete set null;
alter table public.product_style
  add column if not exists business_user_id uuid references public.business_user (id) on delete set null;
alter table public.product_style
  add column if not exists product jsonb;

-- upsert(on conflict api_call_item_id) 용 — null 끼리는 겹치지 않으므로 /style-ex 행에는 영향이 없다
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'product_style_api_call_item_id_key'
       and conrelid = 'public.product_style'::regclass
  ) then
    alter table public.product_style
      add constraint product_style_api_call_item_id_key unique (api_call_item_id);
  end if;
end;
$$;

create index if not exists product_style_business_user_idx
  on public.product_style (business_user_id, created_at desc)
  where business_user_id is not null;

comment on column public.product_style.model_id is
  '카탈로그 모델 id (brand_catalog_models). API 작업 결과는 업체 상품 id 가 카탈로그에 있을 때만 채운다';
comment on column public.product_style.image_url is
  '추출에 쓴 상품 원본 사진. API 작업에서 사진을 파일로 받은 상품은 비어 있다';
comment on column public.product_style.api_call_item_id is
  '이 결과를 낸 API 작업 상품 (api_call_items.id). /style-ex · /full-style-ex 결과는 null';
comment on column public.product_style.business_user_id is 'API 작업의 업체 (business_user.id)';
comment on column public.product_style.product is
  'API 작업에서 업체가 준 상품 정보 (브랜드 · 상품명 · 분류 …, api_call_items.product 와 같다)';

-- select * 라 새 열을 보이려면 다시 만든다. 열 구성이 바뀌므로 지우고 만든다.
drop view if exists public.product_style_latest;
create view public.product_style_latest
  with (security_invoker = true) as
select distinct on (coalesce(model_id, 'api:' || api_call_item_id::text, 'row:' || id::text), target) *
  from public.product_style
 where ok
 order by coalesce(model_id, 'api:' || api_call_item_id::text, 'row:' || id::text), target, created_at desc;
