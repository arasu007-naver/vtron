-- 브랜드 × 옷(상의·하의·원피스) 카테고리
--
-- 0002 의 brand_categories 는 브랜드명만으로 찾은 모델 300건에서 뽑아서 브랜드 주력 상품
-- (나이키 → 신발, 구찌 → 가방) 쪽으로 쏠린다. 옷 카테고리는 "브랜드명 + 옷 키워드" 로 따로 찾고
-- brandCode · 카테고리로 거른 결과를 여기에 둔다. 채우는 곳: scripts/sync-brands.mjs
-- (설정: res/clothing-categories.json — 카테고리 id 를 바꾸면 아래 update 도 맞춘다)
--
-- 0002 실행 후 SQL Editor 에서 실행한다.

-- 1) 네이버 카테고리에 옷 분류 ------------------------------------------------
--   top = 상의 · bottom = 하의 · dress = 원피스.  나머지(아우터·속옷 …)는 null
alter table public.naver_categories
  add column if not exists clothing_kind text
    check (clothing_kind in ('top', 'bottom', 'dress'));

update public.naver_categories
set clothing_kind = case
  when id in ('50021299', '50021319', '50021260', '50021261', '50000803', '50000804',
              '50021579', '50021599', '50021600', '50021619', '50000830', '50000833') then 'top'
  when id in ('50000810', '50000809', '50000808', '50000812', '50000836', '50000835') then 'bottom'
  when id in ('50000807') then 'dress'
end
where clothing_kind is not null
   or id in ('50021299', '50021319', '50021260', '50021261', '50000803', '50000804',
             '50021579', '50021599', '50021600', '50021619', '50000830', '50000833',
             '50000810', '50000809', '50000808', '50000812', '50000836', '50000835',
             '50000807');

create index if not exists naver_categories_clothing_kind_idx
  on public.naver_categories (clothing_kind)
  where clothing_kind is not null;

-- 2) 브랜드 요약 ------------------------------------------------------------
alter table public.brands
  add column if not exists clothing_kinds       text[]      not null default '{}',  -- ["top","bottom","dress"]
  add column if not exists clothing_model_count integer     not null default 0,     -- 표본에서 센 옷 모델 수
  add column if not exists clothing_synced_at   timestamptz;

create index if not exists brands_clothing_kinds_idx
  on public.brands using gin (clothing_kinds);

-- 3) 브랜드 × 옷 카테고리 -----------------------------------------------------
-- model_count 는 키워드마다 받은 표본(최대 200건)에서 센 값이라 전체 수가 아니다.
-- 브랜드 안에서 카테고리 비중을 비교하는 용도. 분류 잡음을 줄이려 3건 미만은 넣지 않는다.
create table if not exists public.brand_clothing_categories (
  brand_id      uuid    not null references public.brands (id) on delete cascade,
  category_id   text    not null references public.naver_categories (id) on delete cascade,
  clothing_kind text    not null check (clothing_kind in ('top', 'bottom', 'dress')),
  model_count   integer not null default 0,
  primary key (brand_id, category_id)
);

create index if not exists brand_clothing_categories_category_idx
  on public.brand_clothing_categories (category_id, model_count desc);
create index if not exists brand_clothing_categories_kind_idx
  on public.brand_clothing_categories (clothing_kind, model_count desc);

alter table public.brand_clothing_categories enable row level security;
