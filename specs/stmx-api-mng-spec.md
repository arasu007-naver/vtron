# STMX api-mng 페이지 구현 스펙 (Claude용)

## 0. 목적
외부 업체에 STMX API 키(Bearer 토큰)를 발급한다. 업체가 제출한 사업자등록증 이미지에서 **사업자등록번호·상호(회사명)** 를 추출하고, 추출·검증에 성공하면 `business_user`에 저장하고 토큰을 발행한다. 관리자 페이지 `api-mng`에서 `business_user` CRUD와 토큰 관리를 수행한다.

> [확인 필요] 대상 리포(stmx-admin 또는 stmx-web-phase2의 admin 앱), 프레임워크, 관리자 인증 방식, Supabase 프로젝트 구조는 구현 전 리포에서 직접 확인한다. 아래 SQL·경로는 Supabase(Postgres) 기준 제안이다.

## 1. 범위
- 포함: 사업자등록증 업로드 → 추출 → 검증 → 확인/수정 → 저장·토큰 발급, 목록/상세/수정/비활성화/삭제, 토큰 재발급·폐기, API 호출 시 Bearer 검증 미들웨어.
- 제외: 업체 셀프 가입 포털(2차), 요금·쿼터 과금(2차, 필드만 예약).

## 2. 플로우
1. 관리자가 api-mng에서 "신규 등록" → 사업자등록증 이미지(JPG/PNG/PDF 1p, ≤10MB) 업로드.
2. 서버가 Storage 비공개 버킷 `business-docs`에 저장.
3. 서버가 OCR/Vision으로 `business_number`, `business_name` 추출 (+ 대표자명, 개업일자는 선택 추출).
4. 검증:
   - 형식: 숫자 10자리(`XXX-XX-XXXXX`), 하이픈 제거 후 저장.
   - 체크섬: 국세청 사업자번호 검증식 통과.
   - 국세청 사업자등록 상태조회 API는 현재 사용하지 않는다(결정됨). 필요 시 2차에 추가.
   - 중복: 동일 `business_number` 활성 레코드 존재 시 차단.
5. 추출 결과를 관리자에게 보여주고 수정·확정(사람 확인 단계 필수).
6. 확정 시 `business_user` insert + 토큰 생성 → **평문 토큰은 이 응답에서 1회만 노출**, DB에는 해시만 저장.
7. 추출 실패/검증 실패 시 상태 `rejected` 또는 `pending_review`로 남기고 사유 기록.

## 3. 데이터 모델
```sql
create table public.business_user (
  id               uuid primary key default gen_random_uuid(),
  business_name    text not null,                 -- 상호(회사명)
  business_number  char(10) not null,             -- 하이픈 없는 10자리
  status           text not null default 'active'
                   check (status in ('pending_review','active','suspended','rejected')),
  doc_path         text,                           -- Storage 경로 (business-docs/…)
  ocr_raw          jsonb,                          -- 추출 원문·신뢰도
  nts_status       text,                           -- 국세청 상태조회 결과(예약 컬럼, 현재 미사용·null)
  token_hash       text unique,                    -- sha256(token) hex
  token_prefix     text,                           -- 'stmx_live_ab12' 식별용 앞부분
  token_issued_at  timestamptz,
  token_last_used_at timestamptz,
  memo             text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz                     -- soft delete
);
create unique index business_user_number_active_uq
  on public.business_user (business_number) where deleted_at is null;
alter table public.business_user enable row level security;
-- 정책: anon/authenticated 접근 금지, service_role 및 관리자 역할만. [확인 필요: 기존 admin 역할 판별 방식]
```
- 토큰 형식: `stmx_live_` + 32바이트 난수 base62. 평문 저장 금지.
- (선택) 다중 키·회전을 원하면 `business_api_key` 별도 테이블로 분리. [결정 필요]

## 4. 서버 API (관리자 전용)
| Method | Path | 설명 |
|---|---|---|
| POST | `/admin/business-users/extract` | 이미지 업로드 → 추출·검증 결과 반환(저장 전) |
| POST | `/admin/business-users` | 확정 저장 + 토큰 발급, 평문 토큰 1회 반환 |
| GET | `/admin/business-users?q=&status=&page=` | 목록(상호·번호 검색, 페이지네이션) |
| GET | `/admin/business-users/:id` | 상세(토큰은 prefix만) |
| PATCH | `/admin/business-users/:id` | 상호·번호·상태·메모 수정(번호 수정 시 재검증) |
| POST | `/admin/business-users/:id/rotate-token` | 재발급(기존 즉시 무효), 평문 1회 반환 |
| POST | `/admin/business-users/:id/revoke-token` | 토큰 폐기 |
| DELETE | `/admin/business-users/:id` | soft delete + 토큰 폐기 |
| GET | `/admin/business-users/:id/document` | 등록증 이미지 signed URL(만료 60초) |

구현 위치: Supabase Edge Function 또는 admin 앱 서버 라우트. 관리자 세션 검증 필수, service_role 키는 서버에서만 사용.

## 5. 외부 API 인증 미들웨어
- `Authorization: Bearer stmx_live_…` → sha256 → `token_hash` 조회.
- 조건: `status='active'` and `deleted_at is null`. 실패 시 401(형식·없음), 403(정지).
- 성공 시 `token_last_used_at` 갱신(분 단위 디바운스), 요청 컨텍스트에 `business_user_id` 주입.
- 호출 횟수 제한 없음(결정됨). 레이트리밋 미적용.

## 6. 추출(OCR) 상세
- 엔진: **NAVER CLOVA OCR – Document OCR 사업자등록증 특화 모델** (결정됨).
  - NCP 콘솔에서 Domain 생성 후 발급되는 Invoke URL·Secret Key를 서버 환경변수(`CLOVA_OCR_INVOKE_URL`, `CLOVA_OCR_SECRET`)로만 보관. 클라이언트 노출 금지.
  - 호출: `POST {INVOKE_URL}` 헤더 `X-OCR-SECRET`, 본문에 이미지(base64 또는 URL)·`version`·`requestId`·`timestamp`. [확인 필요: 특화 모델 엔드포인트·요청/응답 필드명은 NCP 최신 문서 기준으로 구현]
  - 응답의 사업자번호·상호(법인명/상호) 필드를 출력 스키마로 매핑, 필드별 신뢰도를 `confidence`에 반영.
  - 요금은 호출 건당 과금. 단가는 NCP 요금표에서 확인 후 대량 테스트 진행. [확인 필요]
  - 실패(타임아웃·5xx) 시 1회 재시도, 이후 `pending_review`로 남겨 수동 입력.
- 출력 스키마: `{ business_number, business_name, representative?, opening_date?, confidence }`.
- 상호 정규화: 앞뒤 공백 제거, `(주)`/`주식회사` 표기는 원문 유지.
- 신뢰도 낮음·필드 누락 → `pending_review`, 관리자가 수동 입력 가능.
- 추출 원문은 `ocr_raw`에 저장, 로그에 이미지·토큰 출력 금지.

### 사업자번호 체크섬
```ts
function isValidBizNo(n: string) {
  const d = n.replace(/\D/g, '');
  if (d.length !== 10) return false;
  const w = [1,3,7,1,3,7,1,3,5];
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * w[i];
  s += Math.floor((+d[8] * 5) / 10);
  return (10 - (s % 10)) % 10 === +d[9];
}
```

## 7. api-mng 페이지 UI
- **목록**: 검색(상호/번호), 상태 필터, 컬럼 = 상호, 사업자번호(`123-45-67890` 표시), 상태, 토큰 prefix, 발급일, 최근 사용, 액션.
- **신규 등록 모달**: 업로드 → 추출 결과 폼(수정 가능, 체크섬·중복 결과 배지) → 확정.
- **토큰 표시 모달**: 평문 토큰 + 복사 버튼, "닫으면 다시 볼 수 없음" 경고.
- **상세/수정**: 등록증 미리보기(signed URL), 필드 수정, 상태 변경, 재발급/폐기/삭제(확인 다이얼로그, 위험 스타일).
- 테마: STMX 앱 테마(#FFFFFF/#F8F9FA, #101317, #9747FF→#FF0099, Pretendard)를 기존 admin 스타일과 맞춤. [확인 필요]

## 8. 보안
- 토큰 해시만 저장, 평문은 발급·재발급 응답에서만.
- 등록증은 비공개 버킷, signed URL 단기 만료. 개인정보(대표자명 등) 최소 수집. 보관 기간은 무기한(결정됨), soft delete 후에도 원본 유지.
- 모든 변경은 `admin_audit_log`(actor, action, target_id, diff, at)에 기록. [확인 필요: 기존 감사 테이블 유무]
- 시크릿·키를 코드·로그·커밋에 넣지 않는다.

## 9. 테스트
- 단위: 체크섬(정상/오류 샘플), 토큰 생성·해시·검증, 정규화.
- 통합: 추출→확정→발급→Bearer 호출 성공, 재발급 후 구 토큰 401, 정지 시 403, soft delete 후 번호 재등록 가능.
- RLS: anon/일반 사용자로 `business_user` 접근 불가 확인.
- 실 OCR 호출 테스트는 소량 샘플만(비용 확인 후).

## 10. 완료 기준
- 마이그레이션 적용, RLS 통과.
- api-mng에서 등록·조회·수정·정지·재발급·폐기·삭제 전부 동작.
- 외부 Bearer 인증 미들웨어가 최소 1개 공개 API에 적용.
- 평문 토큰이 DB·로그에 남지 않음을 확인.

## 11. 결정 사항
- 국세청 상태조회 API: 미사용 (추후 사용 대비 `nts_status` 컬럼은 생성, 현재 null)
- 호출 횟수 제한: 없음
- 사업자등록증 보관: 무기한
- OCR 엔진: NAVER CLOVA OCR 사업자등록증 특화 모델

## 12. 미결정 사항
1. 업체당 단일 토큰 vs 다중 키 테이블.
2. 구현 위치(Edge Function vs admin 서버).
