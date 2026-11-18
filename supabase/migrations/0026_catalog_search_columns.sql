-- 착장 상품 검색 — 브랜드 · 상품명 초성 검색과 품번 검색용 컬럼
--
-- 설계: stmx-web docs/product-search.md (4.1, 6장 1번의 (가) 안)
-- 쓰는 곳: /api/product-search-v2 (lib/catalog-search/search-server.ts)
--
--   search_text      브랜드명(naver_brand_name) + 상품명. 소문자, 공백 · 구두점 제거
--                    "[리바이스] 트러커 재킷 85748-0289" → "리바이스트러커재킷857480289"
--   search_choseong  search_text 의 한글 음절을 초성으로. 쌍자음은 평음으로 접는다
--                    → "ㄹㅂㅇㅅㅌㄹㅋㅈㅋ857480289"
--
-- DB 생성 컬럼이라 동기화 코드(sync-brand-catalog · /brand-integration)를 건드리지 않고,
-- 기존 행도 이 마이그레이션을 돌리는 순간 채워진다.
--
-- 정규화 규칙은 lib/hangul.ts 의 normalizeSearch · toSearchChoseong 와 **같아야 한다.**
-- 규칙이 갈리면 화면에서 걸리던 글이 서버에서 안 걸린다. 한쪽을 고치면 다른 쪽도 고친다.
--
-- 브랜드명은 모델 행의 naver_brand_name 만 넣는다 — 생성 컬럼은 다른 표(brands)를 읽지 못하고,
-- 표시명 · 별칭은 라우트가 브랜드 목록에 맞춰 따로 푼다(설계 4.2 의 2번).
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(0005 이후).

create extension if not exists pg_trgm;

-- 1) 정규화 — NFC, 소문자, [\s.,'’`\-_/·()&+] 제거 -----------------------------
create or replace function public.catalog_search_normalize(value text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
    lower(normalize(coalesce(value, ''), NFC)),
    '[[:space:].,''’`\-_/·()&+]',
    '',
    'g'
  )
$$;

-- 2) 초성 — 완성형 음절(U+AC00..U+D7A3)을 초성으로, 쌍자음은 평음으로 접는다 --------
-- 초성 19개의 순서: ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ → 접으면 아래 문자열.
-- 음절이 아닌 글자(영문 · 숫자 · 이미 자모인 것)는 그대로 두되, 자모의 쌍자음도 접는다.
create or replace function public.catalog_search_choseong(value text)
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(
    string_agg(
      case
        when ascii(ch) between 44032 and 55203
          then substr('ㄱㄱㄴㄷㄷㄹㅁㅂㅂㅅㅅㅇㅈㅈㅊㅋㅌㅍㅎ', (ascii(ch) - 44032) / 588 + 1, 1)
        else translate(ch, 'ㄲㄸㅃㅆㅉ', 'ㄱㄷㅂㅅㅈ')
      end,
      ''
      order by i
    ),
    ''
  )
  from unnest(string_to_array(coalesce(value, ''), null)) with ordinality as t(ch, i)
$$;

-- 3) 컬럼 ---------------------------------------------------------------------
-- 생성 컬럼끼리는 서로를 읽지 못해 search_choseong 도 원문에서 다시 계산한다.
alter table public.brand_catalog_models
  add column if not exists search_text text
    generated always as (
      public.catalog_search_normalize(coalesce(naver_brand_name, '') || ' ' || name)
    ) stored;

alter table public.brand_catalog_models
  add column if not exists search_choseong text
    generated always as (
      public.catalog_search_choseong(
        public.catalog_search_normalize(coalesce(naver_brand_name, '') || ' ' || name)
      )
    ) stored;

-- 4) 색인 — LIKE '%토큰%' 용 trigram GIN -----------------------------------------
-- 지금은 8천 건이라 색인 없이도 빠르지만, 내재화 브랜드가 늘면 필요하다.
create index if not exists brand_catalog_models_search_text_trgm_idx
  on public.brand_catalog_models using gin (search_text gin_trgm_ops);

create index if not exists brand_catalog_models_search_choseong_trgm_idx
  on public.brand_catalog_models using gin (search_choseong gin_trgm_ops);
