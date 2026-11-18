-- 착장 상품 검색 — 검색 · 사진 · 전체 수를 한 번에 돌려주는 함수
--
-- stmx-web 의 GET /api/loox/product-catalog/search 가 부른다(apps/web/lib/server/loox-product-catalog.ts).
-- 예전에는 상품 한 쪽(page)을 읽고(전체 수 포함), 그 id 로 상품 마스터(products)에서 사진을 한 번
-- 더 읽었다. Supabase 왕복 하나가 약 200ms 라(2026-11-18 측정) 이 함수로 하나를 줄인다.
--
-- 검색어를 조건으로 푸는 일(브랜드 토큰 · 초성 토큰 · 글자 토큰)은 여기서 하지 않는다 — 앱과 같은
-- 규칙을 써야 해서 TypeScript(@stmx/core/catalog-search)가 하고, 여기는 받은 조건으로 읽기만 한다.
--   p_choseong  search_choseong 에 부분 일치할 토큰들 (AND). LIKE 특수 글자는 부른 쪽이 \ 로 이스케이프.
--   p_text      search_text     에 부분 일치할 토큰들 (AND). 같음.
--
-- 정렬은 이름 · id 순 — 예전 경로(PostgREST .order("name").order("id"))와 같다.
-- total 은 limit · offset 전의 전체 수다(count(*) over ()). offset 이 끝을 넘으면 행이 없어 total 도
-- 없다 — 부른 쪽이 0 으로 본다.
--
-- 0026_catalog_search_columns.sql 다음에 Supabase 대시보드 → SQL Editor 에서 실행한다.

create or replace function public.search_catalog_products(
  p_brand_ids   uuid[]  default null,
  p_kind        text    default null,
  p_category_id text    default null,
  p_choseong    text[]  default '{}',
  p_text        text[]  default '{}',
  p_limit       integer default 30,
  p_offset      integer default 0
)
returns table (
  id                  text,
  name                text,
  naver_brand_name    text,
  category_id         text,
  clothing_kind       text,
  whole_category_name text,
  catalog_url         text,
  thumbnail           text,
  image_url           text,
  total               bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with hits as (
    select m.*
    from brand_catalog_models m
    where (p_brand_ids is null or m.brand_id = any (p_brand_ids))
      -- 잎을 주면 그것이 분류까지 정한다. 둘 다 주면 잎이 이긴다.
      and (
        case
          when p_category_id is not null then m.category_id = p_category_id
          when p_kind is not null then m.clothing_kind = p_kind
          else true
        end
      )
      and not exists (
        select 1 from unnest(coalesce(p_choseong, '{}')) as t(token)
        where m.search_choseong not like '%' || t.token || '%'
      )
      and not exists (
        select 1 from unnest(coalesce(p_text, '{}')) as t(token)
        where m.search_text not like '%' || t.token || '%'
      )
  ),
  page as (
    select h.*, count(*) over () as total
    from hits h
    order by h.name, h.id
    limit greatest(least(coalesce(p_limit, 30), 100), 1)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    page.id,
    page.name,
    page.naver_brand_name,
    page.category_id,
    page.clothing_kind,
    page.whole_category_name,
    page.catalog_url,
    p.thumbnail,
    p.image_url,
    page.total
  from page
  left join products p on p.naver_product_id = page.id
  order by page.name, page.id
$$;

-- 서버(service role)만 부른다. 표들도 RLS 에 정책이 없어 다른 역할로는 어차피 빈 결과다.
revoke all on function public.search_catalog_products(uuid[], text, text, text[], text[], integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_catalog_products(uuid[], text, text, text[], text[], integer, integer)
  to service_role;
