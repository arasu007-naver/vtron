-- business_user 담당자 이메일 — 발급한 API 키를 메일로 보낼 기본 수신 주소
--
-- 메일은 관리자가 토큰 모달에서 버튼으로 보낸다(POST /api/admin/business-users/:id/send-token).
-- 보낸 기록은 admin_audit_log(business_user.send_token)에 수신 주소 · 토큰 prefix 만 남는다.
--
-- 0017 실행 후 Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.business_user
  add column if not exists contact_email text
    check (contact_email is null or contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

comment on column public.business_user.contact_email is
  '담당자 이메일 — API 키 메일 기본 수신 주소';
