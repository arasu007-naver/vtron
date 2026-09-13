-- 옷 분류를 상의 · 하의 · 기타 로 바꾼다
--
-- 0003 의 dress(원피스)를 etc(기타)로 넓힌다. 기타 = 원피스 · 아우터 · 점퍼 · 점프슈트 ·
-- 정장세트 · 트레이닝복 · 코디세트 · 파티복. 속옷 · 한복 · 유니폼은 넣지 않는다.
-- 설정: res/clothing-categories.json — 카테고리 id 를 바꾸면 아래 update 도 맞춘다.
-- 상품링크 창이 브랜드 × 분류로 모델을 찾을 때 쓰는 브랜드 검색어(clothing_query)도 둔다.
--
-- 0003 실행 후 SQL Editor 에서 실행한다. 실행한 뒤 npm run sync:brands -- --from-snapshot 으로 다시 채운다.

-- 1) 체크 제약을 풀고 dress → etc ------------------------------------------------
alter table public.naver_categories
  drop constraint if exists naver_categories_clothing_kind_check;
alter table public.brand_clothing_categories
  drop constraint if exists brand_clothing_categories_clothing_kind_check;

update public.naver_categories
set clothing_kind = 'etc'
where clothing_kind = 'dress'
   or id in (
     -- 여성의류
     '50000807', '50000814', '50000818', '50000816', '50000811', '50000778', '50000820',
     '50021360', '50021379', '50021320', '50021399', '50021321', '50021441', '50021380',
     '50021419', '50021439', '50021459', '50021499', '50021479',
     -- 남성의류
     '50000837', '50000840', '50000841', '50006328', '50008960',
     '50021640', '50021659', '50021679', '50021620', '50021739', '50021759', '50021720',
     '50021699', '50021719', '50021700', '50021601', '50021779'
   );

update public.brand_clothing_categories
set clothing_kind = 'etc'
where clothing_kind = 'dress';

update public.brands
set clothing_kinds = array_replace(clothing_kinds, 'dress', 'etc')
where 'dress' = any (clothing_kinds);

alter table public.naver_categories
  add constraint naver_categories_clothing_kind_check
    check (clothing_kind in ('top', 'bottom', 'etc'));
alter table public.brand_clothing_categories
  add constraint brand_clothing_categories_clothing_kind_check
    check (clothing_kind in ('top', 'bottom', 'etc'));

-- 2) 브랜드 검색어 ------------------------------------------------------------
-- "왁(WAAC)" 은 "왁" 으로, 한글명으로 안 걸리면 네이버 등록명(CHANEL …)으로 찾았다. 그 값.
alter table public.brands
  add column if not exists clothing_query text;
