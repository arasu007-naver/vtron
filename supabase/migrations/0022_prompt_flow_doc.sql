-- 관찰 프롬프트 버전마다 흐름도(HTML 문서)를 짝으로 둔다
--
--   flow_doc             그 버전의 흐름도 HTML 전문 (예: docs/full-vision-three-call-flow.html). 없으면 null
--   flow_doc_updated_at  흐름도를 마지막으로 넣거나 바꾼 때
--   flow_doc_from        흐름도를 다른 버전에서 물려받았으면 그 버전 id — 이 버전용으로 고쳐 올리면 null
--
-- 프롬프트 내용(content)은 버전마다 고정이지만 흐름도는 문서라 나중에 고쳐 올릴 수 있다(PUT /api/style-ex/prompts/:id/flow).
-- 화면에서 프롬프트를 고쳐 새 버전으로 저장하면, 고치기 시작한 버전의 흐름도를 물려받고 flow_doc_from 에 그 버전을 남긴다 —
-- 화면은 "vN 의 흐름도" 라고 표시해, 새 버전에 맞게 다시 올려야 함을 알린다.
--
-- 버전 목록 API 는 flow_doc 을 내려보내지 않는다(문서가 커서) — 흐름도는 버전 하나씩 GET …/:id/flow 로 읽는다.
--
-- 0015 · 0020 다음에 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.style_ex_prompt_versions
  add column if not exists flow_doc text,
  add column if not exists flow_doc_updated_at timestamptz,
  add column if not exists flow_doc_from uuid references public.style_ex_prompt_versions (id) on delete set null;

comment on column public.style_ex_prompt_versions.flow_doc is
  '이 프롬프트 버전의 흐름도 HTML 전문. 버전 목록에는 싣지 않고 GET /api/style-ex/prompts/:id/flow 로 읽는다';
comment on column public.style_ex_prompt_versions.flow_doc_updated_at is
  '흐름도를 마지막으로 넣거나 바꾼 때';
comment on column public.style_ex_prompt_versions.flow_doc_from is
  '흐름도를 물려받은 버전 — 이 버전용으로 고쳐 올리면 null';
