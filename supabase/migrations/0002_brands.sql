-- 브랜드 중심 상품 탐색 스키마
--
-- 상품 검색은 브랜드로 먼저 접근하고, 카테고리는 그 보완으로 쓴다.
-- 원천은 두 곳이다.
--
--   1. res/korea_fashion_brands.json   — 우리가 고른 브랜드 목록과 그 묶음(럭셔리_하이엔드 …)
--   2. 네이버 커머스 API(쇼핑 커넥트)    — 브랜드 마스터와 카탈로그 모델
--
-- 네이버 브랜드 조회(`GET /v1/product-brands?name=`)는 `[{ id, name }]` 만 준다.
-- 단건 조회 경로는 없다(`/v1/product-brands/{id}` → 404 GW.NOT_FOUND).
-- 그래서 브랜드의 나머지 메타(제조사 · 카테고리 분포 · 모델 수)는
-- 카탈로그 모델 조회(`GET /v1/product-models?name=`) 응답의
--   id · name · brandCode/brandName · manufacturerCode/manufacturerName · categoryId · wholeCategoryName
-- 에서 brandCode 가 그 브랜드인 것만 골라 집계한다.
--
-- 채우는 스크립트: scripts/sync-brands.mjs  (npm run sync:brands)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다. 0001 과 같은 이유로 RLS 는
-- 켜두되 정책은 두지 않는다(서버 라우트가 service role 로 읽는다).

-- 1) 네이버 카테고리 ---------------------------------------------------------
-- res/naver-categories-*.json (커머스 API `GET /v1/categories?last=true`) 과 같은 모양.
-- 모델 응답에서 처음 보는 categoryId 가 나오면 스크립트가 여기에 먼저 넣는다.
create table if not exists public.naver_categories (
  id                  text primary key,                 -- "50000807"
  name                text        not null,             -- "원피스"
  whole_category_name text        not null,             -- "패션의류>여성의류>원피스"
  path                text[]      generated always as (string_to_array(whole_category_name, '>')) stored,
  root_name           text        generated always as (split_part(whole_category_name, '>', 1)) stored,
  last                boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists naver_categories_root_name_idx
  on public.naver_categories (root_name);

-- 2) 브랜드 ----------------------------------------------------------------
create table if not exists public.brands (
  id                    uuid primary key default gen_random_uuid(),

  -- 우리 쪽 이름. res 파일에 적힌 표기 그대로(한국어). 동기화의 키.
  display_name          text        not null unique,
  -- 같은 네이버 브랜드로 합쳐진 다른 표기 + 검색에 쓴 영문명 등
  aliases               text[]      not null default '{}',

  -- ── 네이버 브랜드 마스터 (GET /v1/product-brands) ──
  naver_brand_id        bigint      unique,             -- 응답 id. 매칭 실패면 null
  naver_brand_name      text,                           -- 응답 name ("CHANEL", "폴로랄프로렌")

  -- 매칭 결과
  --   exact      — display_name 과 같은 이름의 브랜드를 찾음
  --   alias      — 영문명 등 별칭으로 찾음 (예: 샤넬 → CHANEL)
  --   unresolved — 같은 이름이 없음. naver_candidates 를 보고 res/brand-aliases.json 에 id 를 박는다
  match_status          text        not null default 'unresolved'
                          check (match_status in ('exact', 'alias', 'manual', 'unresolved')),
  matched_query         text,                           -- 찾아낸 검색어
  naver_candidates      jsonb       not null default '[]'::jsonb,  -- 검색 응답 [{ id, name, query }]

  -- ── 카탈로그 모델 집계 (GET /v1/product-models) ──
  -- 모델 검색은 name 토큰 매칭이라 다른 브랜드가 섞인다. brandCode 로 거른 뒤 센다.
  catalog_query_total   integer,                        -- 검색어 기준 totalElements (거르기 전)
  catalog_sample_size   integer     not null default 0, -- 받아온 모델 수 (거르기 전)
  catalog_model_count   integer     not null default 0, -- 그중 이 브랜드 모델 수
  manufacturers         jsonb       not null default '[]'::jsonb,  -- [{ code, name, count }]
  category_roots        text[]      not null default '{}',         -- ["패션의류","패션잡화"]
  primary_category_id   text references public.naver_categories (id) on delete set null,
  sample_models         jsonb       not null default '[]'::jsonb,  -- 대표 모델 몇 개 [{ id, name, categoryId }]

  is_active             boolean     not null default true,
  source                text        not null default 'res/korea_fashion_brands.json',
  synced_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists brands_match_status_idx on public.brands (match_status);
create index if not exists brands_category_roots_idx on public.brands using gin (category_roots);
create index if not exists brands_aliases_idx on public.brands using gin (aliases);

-- 3) 브랜드 묶음 (res 파일의 categories) -------------------------------------
-- "럭셔리_하이엔드", "슈즈_해외" 같은 큐레이션 묶음. 네이버 카테고리와는 다르다.
create table if not exists public.brand_groups (
  id          uuid primary key default gen_random_uuid(),
  section     text        not null,           -- "fashion_brands_120" | "accessories_and_shoes_72"
  section_description text,
  key         text        not null,           -- "럭셔리_하이엔드"
  label       text        not null,           -- "럭셔리 하이엔드"
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (section, key)
);

create table if not exists public.brand_group_members (
  group_id    uuid    not null references public.brand_groups (id) on delete cascade,
  brand_id    uuid    not null references public.brands (id) on delete cascade,
  sort_order  integer not null default 0,
  primary key (group_id, brand_id)
);

create index if not exists brand_group_members_brand_id_idx
  on public.brand_group_members (brand_id);

-- 4) 브랜드 × 네이버 카테고리 --------------------------------------------------
-- 브랜드 탐색을 카테고리로 보완할 때 쓰는 연결. 모델 표본에서 본 카테고리와 그 수.
create table if not exists public.brand_categories (
  brand_id     uuid    not null references public.brands (id) on delete cascade,
  category_id  text    not null references public.naver_categories (id) on delete cascade,
  model_count  integer not null default 0,
  primary key (brand_id, category_id)
);

create index if not exists brand_categories_category_id_idx
  on public.brand_categories (category_id, model_count desc);

-- 5) updated_at 자동 갱신 (0001 의 set_updated_at 재사용) ---------------------
drop trigger if exists naver_categories_set_updated_at on public.naver_categories;
create trigger naver_categories_set_updated_at
  before update on public.naver_categories
  for each row execute function public.set_updated_at();

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

drop trigger if exists brand_groups_set_updated_at on public.brand_groups;
create trigger brand_groups_set_updated_at
  before update on public.brand_groups
  for each row execute function public.set_updated_at();

-- 6) RLS -------------------------------------------------------------------
alter table public.naver_categories    enable row level security;
alter table public.brands              enable row level security;
alter table public.brand_groups        enable row level security;
alter table public.brand_group_members enable row level security;
alter table public.brand_categories    enable row level security;
