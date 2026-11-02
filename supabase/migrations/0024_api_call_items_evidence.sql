-- 대량 Style ID 작업의 근거 — 상품마다 관찰 envelope · 판정 기록 · JEV 대표 의복 결정을 남긴다
--
--   observation   관찰 결과 (extractStyle 의 observation — product_style.observation 과 같은 모양)
--   scoring       판정 함수 V2 의 기록 (product_style.scoring 과 같은 모양)
--   prime_target  JEV 결정 { category, choice, confidence, probabilities, model, reason, ms } — 상품명이 없으면 null
--
-- 업체 API 응답에는 내보내지 않는다(서버 · 관리자용). 실패한 상품도 관찰까지 갔으면 남긴다.
-- 0023 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.api_call_items add column if not exists observation  jsonb;
alter table public.api_call_items add column if not exists scoring      jsonb;
alter table public.api_call_items add column if not exists prime_target jsonb;

comment on column public.api_call_items.observation is '관찰 envelope (product_style.observation 과 같은 모양) — 업체에게 내보내지 않는다';
comment on column public.api_call_items.scoring is '판정 함수 V2 기록 (product_style.scoring 과 같은 모양) — 업체에게 내보내지 않는다';
comment on column public.api_call_items.prime_target is 'JEV 대표 의복 결정 (lib/style-ex/prime-target.ts PrimeTarget)';
