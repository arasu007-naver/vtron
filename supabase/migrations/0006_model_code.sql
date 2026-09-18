-- 품번 — 있으면 담고, 없으면 null 로 둔다.
--
-- 네이버 커머스 API 에는 품번 필드가 없다. 모델 조회(/v1/product-models)도 단건 조회도
-- id · name · brandCode/brandName · manufacturerCode/manufacturerName · categoryId ·
-- wholeCategoryName 뿐이다(manufacturerCode 는 제조사 마스터 id 지 품번이 아니다).
-- 그래서 상품명에서 뽑는다 — lib/playground/product-link.ts 의 modelCodeOf 가 규칙이다.
--
-- 브랜드마다 버릇이 다르다. 디올은 내재화한 1,565건 중 89%, 루이비통 의류는 570건 중 4%만
-- 이름에 품번을 달고 온다. 없는 것을 지어낼 수는 없으므로 그런 행은 null 로 둔다.
-- 화면은 품번이 있는 줄에만 배지를 그리고, 한 브랜드가 거의 다 비면 모달로 한 번 알린다.
--
-- 규칙(modelCodeOf)이 바뀌면 값도 바뀐다. 다시 채우는 것은
--   npm run backfill:model-codes        # 저장된 이름으로 다시 계산해 갱신
-- 이고, 새로 넣는 것(화면의 '브랜드 등록' · npm run sync:brand-catalog)은 넣을 때 채운다.
--
-- 0005 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다.

alter table public.brand_catalog_models
  add column if not exists model_code text;

comment on column public.brand_catalog_models.model_code is
  '상품명에서 뽑은 품번. 이름에 없으면 null — lib/playground/product-link.ts 의 modelCodeOf';

-- 품번으로 상품을 찾는 길. 대부분의 브랜드에서 절반 넘게 null 이라 부분 인덱스로 둔다.
create index if not exists brand_catalog_models_model_code_idx
  on public.brand_catalog_models (model_code)
  where model_code is not null;
