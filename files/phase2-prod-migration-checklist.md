# STMX phase2 → 운영 Supabase 반영 점검 목록

- 저장소: Windows `D:\stmx\stmx-web-phase2` (apps: `web`, `mobile`)
- 현재 연결(link)된 프로젝트: **demo**, ref `vteqjxebptdbkbrxyxiz` (`supabase/.temp/linked-project.json`)
- 운영 프로젝트 "arasu007@naver.com's project"의 ref: **확인 못 함** (사용자 확인 필요, 아래에서는 `<PROD_REF>`로 표기)
- 조사는 읽기 전용으로 진행했습니다. 원격 상태를 바꾸는 CLI 명령은 실행하지 않았습니다.

## 1. 현재 상태 요약

| 항목 | 상태 | 근거 |
|---|---|---|
| 마이그레이션 | 16개, `01_profile_social.sql` ~ `16_loox_profile_discovery.sql` | `supabase/migrations/` |
| 파일명 형식 | ⚠ CLI 표준 형식(`<14자리 타임스탬프>_name.sql`)이 아님 | 이대로는 `db push`가 버전을 제대로 추적하지 못할 수 있음 |
| 전제 스키마 | ⚠ `profiles`, `style_codes`를 새로 만들지 않고 참조하거나 ALTER만 함. phase2 이전에 이미 있던 테이블로 보임 | `01_profile_social.sql`의 `alter table public.profiles add column …` |
| config.toml | ⚠ `[functions.naver-auth]` 블록만 있음. auth, site_url, redirect, storage 설정이 없음 | `supabase/config.toml` (492B) |
| seed.sql | 없음 | — |
| Edge Function | `naver-auth` 1개 (`verify_jwt = false`) | `supabase/functions/naver-auth/` |
| Storage 버킷(마이그레이션에 있음) | `loox`(public), `style-match`(private), 각각 정책 포함 | 02, 05번 마이그레이션 |
| extension / cron / pg_net / auth.users 트리거 | 마이그레이션에서 찾지 못함 | grep 결과 |
| ⚠ 보안 | `supabase/README.md`와 `supabase/example.txt`에 Naver Client ID/Secret 실제 값이 평문으로 들어 있음 | 키 교체(rotate)와 저장소에서 제거를 권장 |

### 마이그레이션에 없는데 앱 코드가 참조하는 객체 (대시보드에서 직접 만들었거나 기존 운영 스키마로 추정)

다음 객체는 `apps/*` 코드에서 사용하지만 16개 마이그레이션 어디에도 CREATE 문이 없습니다.

- **테이블 (32개):** `anonymous_questionnaire_logs`, `brand_catalog_categories`, `brand_catalog_kinds`, `brand_catalog_models`, `consent_policies`, `docs_log`, `external_partners`, `external_questionnaire_submissions`, `post_products`, `privacy_policies`, `questionaires`, `questionnaire_items`, `questionnaire_versions`, `resources`, `share_interactions`, `stmx_contract_applications`, `style_card_logs`, `style_card_shares`, `style_codes`, `style_templates`, `support_faqs`, `support_inquiries`, `support_notices`, `terms_policies`, `user_biz_request`, `user_consents`, `user_credit_logs`, `user_credits`, `user_favorite_brands`, `user_questionnaire_logs`, `profiles`·`products`(ALTER만 존재)
- **RPC (6개):** `check_email_status`, `claim_anonymous_questionnaire_log`, `get_recent_logs`, `get_recent_logs_count`, `log_post_action_click`, `pick_available_nickname`
- **버킷:** `style-images`, `stmx-docs`, `inquiry-attachments`. 코드에는 상수로 쓰인 `AVATAR_BUCKET`, `INQUIRY_BUCKET`, `LOOX_BUCKET`도 있는데, 이 상수들이 실제로 어떤 버킷 이름을 가리키는지는 확인하지 못했습니다.
- `feed_posts`는 12번 이후 마이그레이션에 view로 정의됨(OK). `products`는 ALTER만 있고 CREATE 없음 → 전제 테이블.

→ 운영 DB에 위 객체가 **이미 있고 구조가 demo와 같은지**가 핵심 확인 사항입니다.

## 2. 점검 목록

### 2.1 사전 백업
- [ ] 운영 DB 백업. 아래 명령은 연결(link) 없이 접속 URL로 실행합니다.
  - `supabase db dump --db-url "<PROD_DB_URL>" -f prod_schema.sql`
  - `supabase db dump --db-url "<PROD_DB_URL>" --data-only -f prod_data.sql`
  - `supabase db dump --db-url "<PROD_DB_URL>" --role-only -f prod_roles.sql`
- [ ] Storage 객체를 백업하거나 목록을 확보합니다.
- [ ] 대시보드의 Auth, Storage, Secrets 설정을 화면 캡처나 기록으로 남깁니다.

### 2.2 DB 스키마 / 마이그레이션
- [ ] demo와 운영의 스키마를 비교합니다.
  - `supabase db dump --db-url "<DEMO_DB_URL>" -f demo_schema.sql`
  - 앞에서 받은 `prod_schema.sql`과 diff로 비교합니다.
- [ ] 1장의 "마이그레이션에 없는 객체"가 운영에 있는지 하나씩 확인합니다. 운영에 없는 것은 demo 덤프에서 DDL을 뽑아 새 마이그레이션으로 추가합니다.
- [ ] 마이그레이션 파일명을 타임스탬프 형식으로 바꿉니다. 예: `20261010000001_profile_social.sql`. 적용 순서 01→16은 그대로 유지합니다.
- [ ] 운영에 이미 수동으로 적용한 파일이 있으면 `supabase migration repair --status applied <version>`으로 이력을 맞춥니다.
- [ ] 미리보기: `supabase link --project-ref <PROD_REF>` 후 `supabase db push --dry-run`
- [ ] 적용: `supabase db push`
- [ ] `if not exists` 같은 멱등 구문은 대체로 들어가 있습니다. 다만 운영 `profiles`에 `is_admin` 컬럼이 있는지 확인하세요. 01번과 06번 마이그레이션에 정의가 두 번 있고, 하나는 `default false`, 다른 하나는 `not null default false`라 서로 다릅니다. `is_admin` 컬럼은 양 프로젝트에 모두 존재합니다.

### 2.3 RLS · 함수 · 트리거
- [ ] 마이그레이션에 포함된 것: RLS 정책 약 50개, 함수 34개, 트리거 26개(`posts`, `follows`, `dm_messages`, `post_comments` 등)
- [ ] 마이그레이션에 없는 RPC 6개(1장 참고)가 운영에 있는지 확인합니다. `\df public.*`로 볼 수 있습니다.
- [ ] 운영에서 마이그레이션에 없는 테이블들의 RLS 활성화 여부와 정책을 확인합니다.
- [ ] `auth.users` 트리거(신규 가입 시 `profiles` 생성)는 마이그레이션에 없습니다. 운영에 있는지 확인합니다.
- [ ] Realtime publication 설정(DM, 알림용)은 마이그레이션에서 찾지 못했습니다. demo 대시보드에서 확인합니다.

### 2.4 Storage
- [ ] `loox`(public)와 `style-match`(private)는 마이그레이션이 생성합니다.
- [ ] `style-images`, `stmx-docs`, `inquiry-attachments`, 아바타 버킷은 운영에 있는지 확인하고, 없으면 대시보드나 SQL로 생성하고 정책도 함께 만듭니다.
- [ ] 버킷별 public 여부, 용량 제한, 허용 MIME 타입을 demo와 비교합니다.

### 2.5 Auth (OAuth · Redirect)
- [ ] config.toml에 auth 설정이 없으므로 대시보드에서 직접 맞춥니다.
- [ ] **Naver:** Supabase 기본 provider가 아니라 Edge Function `naver-auth`로 처리합니다. Naver 개발자센터에 운영 콜백 URL `https://<PROD_REF>.supabase.co/functions/v1/naver-auth...`을 등록합니다. 정확한 경로는 `index.ts`에서 확인하세요.
- [ ] **Kakao:** `NEXT_PUBLIC_KAKAO_KEY`를 사용합니다. Supabase provider로 쓰는지, SDK로 직접 쓰는지 확인합니다. Kakao 콘솔의 Redirect URI도 운영 값으로 등록합니다.
- [ ] **Google:** 코드나 설정에서 근거를 찾지 못했습니다. 사용 여부를 확인하세요.
- [ ] Site URL과 Redirect URL 허용 목록에 운영 도메인(예: `https://stmx-m.qoolla.com`)과 모바일 deep link 스킴을 추가합니다.
- [ ] Naver 로그인은 `SUPABASE_SERVICE_ROLE_KEY`로 사용자를 생성하는 방식으로 추정됩니다. 이메일 확인 설정이 demo와 같은지 확인합니다.

### 2.6 Edge Functions · Secrets
- [ ] 배포: `supabase functions deploy naver-auth --no-verify-jwt --project-ref <PROD_REF>`
- [ ] Secrets 등록. 값은 저장소에 두지 말고 새로 발급하는 것을 권장합니다.
  - `supabase secrets set NAVER_CLIENT_ID=... NAVER_CLIENT_SECRET=... FRONTEND_URL=https://<운영 도메인> --project-ref <PROD_REF>`
- [ ] `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 자동으로 주입됩니다.

### 2.7 앱 환경변수 (이름만 기재)
- **web (`.env`, `.env.docker`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_NAVER_LOGIN_CLIENT_ID`, `NEXT_PUBLIC_KAKAO_KEY`, `STMX_WEB_SUPABASE_KEY`, `STMX_WEB_SUPABASE_SECRET_KEY`, `STMX_API_BASE_URL`, `NEXT_PUBLIC_VTRON_URL`, `VTRON_URL`, `AZURE_ACCOUNT`, `AZURE_KEY`
- **mobile:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_BASE_URL`
- [ ] 위 값을 모두 운영 프로젝트 값으로 교체합니다. `JWT_SECRET`은 운영 프로젝트의 JWT secret과 일치해야 합니다.
- [ ] Docker 이미지와 EAS 빌드에 들어가는 env도 교체한 뒤 다시 빌드합니다.

### 2.8 검증 / 롤백
- [ ] 적용 후 `supabase migration list`로 로컬 이력과 원격 이력이 맞는지 확인합니다.
- [ ] 대시보드 Advisors(Security, Performance)에서 RLS가 꺼진 테이블이 있는지 확인합니다.
- [ ] 핵심 흐름 smoke test: Naver/Kakao 로그인, LOOX 업로드(`loox` 버킷), 피드, 팔로우, 좋아요/댓글, 알림, DM, Style Match, 신고
- [ ] 롤백: 마이그레이션에는 down 스크립트가 없습니다. 문제가 생기면 2.1에서 받은 백업으로 복원하거나 PITR(유료 플랜에서 지원)을 사용합니다. 반영 전에 PITR 지원 여부를 확인하세요.

## 3. 미해결 질문 / 위험
1. 운영 프로젝트 ref와 플랜(PITR 가능 여부)을 확인하지 못했습니다.
2. 마이그레이션에 없는 테이블 32개, RPC 6개, 버킷 3~4개가 운영에 있는지, 구조가 같은지 알 수 없습니다. 반영 실패 가능성이 가장 큰 지점입니다.
3. 마이그레이션 파일명이 표준 형식이 아니어서 CLI 이력 관리에 문제가 생길 수 있습니다.
4. Naver Client Secret이 저장소 문서에 평문으로 노출되어 있습니다. 키 교체를 권장합니다.
5. Google OAuth 사용 여부, Realtime 설정, `auth.users` 트리거가 있는지 확인되지 않았습니다.
6. 운영의 기존 `profiles` 데이터와 신규 NOT NULL 컬럼이 충돌할 수 있습니다. 컬럼에 default가 있어 큰 위험은 아닐 것으로 봅니다.
