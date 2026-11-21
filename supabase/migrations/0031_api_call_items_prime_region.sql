-- api_call_items.prime_region — 판정에 쓴 대표 의복이 사진의 어디에 있는지 (박스 하나)
--
-- /admin/api-log · /test-demo 가 사진 위에 박스로 그린다(components/api-log/ItemCard.tsx).
-- 이 열은 저장소 밖에서 먼저 만들어져 일부 작업에만 채워져 있었다 — 워커가 채우지 않아 새 작업에는 박스가 없었다.
-- 이제 워커(lib/style-id-api/worker.ts → prime-region.ts)가 관찰 · 판정 뒤 Vision 모델(Gemini 키가 있으면 Gemini, 없으면 Claude)로 찾아 채운다.
--
--   { box: { xmin, ymin, xmax, ymax }   사진 전체를 0–1000 으로 본 좌표
--     box_px: { x, y, width, height }   원본(EXIF 방향 적용) 픽셀
--     image: { width, height }
--     category, model }
--   찾지 못했거나 관찰한 의복이 없으면 null.
--
-- 이미 열이 있는 DB 에서 실행해도 된다(여러 번 실행해도 된다).

alter table public.api_call_items add column if not exists prime_region jsonb;

comment on column public.api_call_items.prime_region is
  '대표 의복 영역 { box(0–1000), box_px, image, category, model } — 화면 표시용, 관찰 · 판정에는 쓰지 않는다';
