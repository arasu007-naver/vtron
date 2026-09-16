-- 브랜드 내재화 — 브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품
--
-- 지금까지 상품링크(/products-2-link)는 브랜드를 고를 때마다 네이버 커머스 API 를 불러
-- 카탈로그 모델을 찾았다. 같은 브랜드를 다시 봐도 매번 수십 번씩 부르고(키워드 × 페이지),
-- 429 를 피하려 호출 사이에 0.55 초를 쉰다. 그래서 한 번 확정한 결과를 우리 DB 에 둔다.
--
--   brands                      브랜드                      (0002)
--     └ brand_catalog_kinds     브랜드의 최상위 카테고리      상의 · 하의 · 기타
--         └ brand_catalog_categories  최하위 카테고리         네이버 카테고리 id (상품링크 4단계의 '걸러내기' 값)
--             └ brand_catalog_models  상품                   네이버 카탈로그 모델
--
-- 채우는 곳
--   - /brand-integration 페이지의 '브랜드 등록'  → POST /api/playground/brand-catalog
--   - scripts/sync-brand-catalog.mjs             → npm run sync:brand-catalog
--
-- 0002 의 brand_clothing_categories 와 겹쳐 보이지만 다른 것이다. 저쪽은 sync-brands.mjs 가
-- 표본에서 센 '분포'(전체 수가 아님)이고, 이쪽은 사람이 화면에서 걸러 확정한 '목록'이다.
-- 섞이면 어느 쪽이 확정값인지 알 수 없어 표를 따로 둔다.
--
-- 0004 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다. 0001 과 같은 이유로
-- RLS 는 켜두되 정책은 두지 않는다(서버 라우트가 service role 로 읽고 쓴다).

-- 1) 브랜드의 최상위 카테고리 --------------------------------------------------
-- 분류 값은 res/clothing-categories.json 의 kinds 키와 같다(top · bottom · etc).
create table if not exists public.brand_catalog_kinds (
  brand_id        uuid        not null references public.brands (id) on delete cascade,
  clothing_kind   text        not null check (clothing_kind in ('top', 'bottom', 'etc')),
  label           text        not null,                 -- "상의" · "하의" · "기타"
  naver_brand_id  bigint,                               -- 조회에 쓴 네이버 브랜드 id
  category_count  integer     not null default 0,       -- 이번에 확정한 최하위 카테고리 수
  model_count     integer     not null default 0,       -- 이번에 확정한 상품 수
  search_names    text[]      not null default '{}',    -- 모델 조회에 쓴 브랜드 이름
  source          text        not null default 'brand-integration',
  synced_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (brand_id, clothing_kind)
);

-- 2) 최하위 카테고리 ----------------------------------------------------------
-- 상품링크 4단계의 '걸러내기' 토글 하나가 여기 한 행이다.
-- naver_categories 를 참조하지 않는다 — 그쪽은 sync-brands 가 채우는 표라 아직 없는 id 가
-- 나올 수 있고, 그때 내재화가 통째로 막히면 안 된다. 대신 경로를 그대로 들고 있는다.
create table if not exists public.brand_catalog_categories (
  brand_id            uuid        not null references public.brands (id) on delete cascade,
  category_id         text        not null,                -- "50000807"
  clothing_kind       text        not null check (clothing_kind in ('top', 'bottom', 'etc')),
  whole_category_name text        not null,                -- "패션의류>여성의류>원피스"
  name                text        generated always as (
                        split_part(whole_category_name, '>', array_length(
                          string_to_array(whole_category_name, '>'), 1))
                      ) stored,                            -- "원피스"
  model_count         integer     not null default 0,
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (brand_id, category_id),
  foreign key (brand_id, clothing_kind)
    references public.brand_catalog_kinds (brand_id, clothing_kind) on delete cascade
);

create index if not exists brand_catalog_categories_kind_idx
  on public.brand_catalog_categories (brand_id, clothing_kind);
create index if not exists brand_catalog_categories_category_idx
  on public.brand_catalog_categories (category_id);

-- 3) 상품 (네이버 카탈로그 모델) ------------------------------------------------
-- 모델 하나는 브랜드 하나에 속한다(응답의 brandCode). 그래서 모델 id 가 그대로 기본키다.
create table if not exists public.brand_catalog_models (
  id                  text        primary key,             -- 네이버 카탈로그 모델 id
  brand_id            uuid        not null references public.brands (id) on delete cascade,
  category_id         text        not null,
  clothing_kind       text        not null check (clothing_kind in ('top', 'bottom', 'etc')),
  name                text        not null,
  naver_brand_id      bigint,
  naver_brand_name    text,                                -- 응답의 brandName
  manufacturer_code   bigint,
  manufacturer_name   text,
  whole_category_name text,
  catalog_url         text        not null,                -- lib/playground/product-link.ts 가 조립
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (brand_id, category_id)
    references public.brand_catalog_categories (brand_id, category_id) on delete cascade
);

create index if not exists brand_catalog_models_brand_kind_idx
  on public.brand_catalog_models (brand_id, clothing_kind);
create index if not exists brand_catalog_models_category_idx
  on public.brand_catalog_models (brand_id, category_id);

-- 4) 브랜드에 내재화 시각 ------------------------------------------------------
alter table public.brands
  add column if not exists catalog_synced_at timestamptz;

-- 5) updated_at 자동 갱신 (0001 의 set_updated_at 재사용) ------------------------
drop trigger if exists brand_catalog_kinds_set_updated_at on public.brand_catalog_kinds;
create trigger brand_catalog_kinds_set_updated_at
  before update on public.brand_catalog_kinds
  for each row execute function public.set_updated_at();

drop trigger if exists brand_catalog_categories_set_updated_at on public.brand_catalog_categories;
create trigger brand_catalog_categories_set_updated_at
  before update on public.brand_catalog_categories
  for each row execute function public.set_updated_at();

drop trigger if exists brand_catalog_models_set_updated_at on public.brand_catalog_models;
create trigger brand_catalog_models_set_updated_at
  before update on public.brand_catalog_models
  for each row execute function public.set_updated_at();

-- 6) RLS ---------------------------------------------------------------------
alter table public.brand_catalog_kinds      enable row level security;
alter table public.brand_catalog_categories enable row level security;
alter table public.brand_catalog_models     enable row level security;
