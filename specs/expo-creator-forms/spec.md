# Expo 크리에이터 폼 구현 스펙 (Claude Code용)

> **스펙 위치:** `vtron/specs/expo-creator-forms/spec.md`  
> **구현 대상:** `stmx-app` (Expo mobile)  
> **데이터/관리:** `vtron` (Next.js admin + Supabase `vteqjxebptdbkbrxyxiz`)  
> **작성일:** 2026-10-01  
> **언어:** UI 카피·본 문서는 한국어, 코드/식별자는 영어

이 문서는 Claude Code가 **추측 없이** stmx-app에 두 화면을 붙일 수 있도록 실제 스키마·라우트·컴포넌트 경로를 고정한다.  
**이 스펙 작업 범위는 문서만**이다. Expo UI 구현·git commit/push는 하지 않는다.

---

## 1. Overview

STMX(ShopMy형) 크리에이터 온보딩과 오가닉 제휴 상품 URL 수집을 모바일에서 가능하게 한다.

| 기능 | 목적 |
|------|------|
| **A. 크리에이터 신청 양식** | 로그인 사용자가 STMX↔크리에이터 계약을 신청 → `stmx_contract_applications` (`flow_type = stmx_creator`) |
| **B. 브랜드 상품 링크 입력 폼** | 승인(또는 신청 중) 크리에이터가 발행/홍보하는 브랜드 상품 URL을 제출 → **vtron에 아직 없는** 링크 테이블(아래 제안) |

관리자 검토는 이미 vtron에 있다:

- 신청 폼(웹): `/Users/jaesungphi/stmx/vtron/app/contracts/creator/page.tsx`
- API: `POST/GET/PATCH /api/contracts` → `/Users/jaesungphi/stmx/vtron/app/api/contracts/route.ts`
- 관리 목록: `/Users/jaesungphi/stmx/vtron/app/admin/creators/page.tsx`
- 타입: `/Users/jaesungphi/stmx/vtron/types/contracts.ts`, `types/admin.ts`

---

## 2. Scope / Out of scope

### In scope

1. stmx-app에 화면 2개 + 네비게이션 등록 + MyPage 진입점
2. vtron 쪽 **모바일용 API** (또는 기존 API를 모바일 JWT로 쓸 수 있게 하는 브릿지) — 아래 §7
3. Feature B용 **최소 테이블 마이그레이션 제안** (구현 시 Claude가 SQL 파일 추가)
4. 기존 `Input` / `Button` / `PageWrapper` / `theme` / `createScaledStyleSheet` 패턴 준수

### Out of scope

- 클릭 트래킹·커미션 정산·PayPal 지급 UI
- `commerce_brands` 신설 (금지 — `public.brands` 사용)
- LOOX / products-2-link 네이버 카탈로그 동기화 UI
- stmx-web `15_shopmy_commerce.sql` 전체 이식 (`creator_shelves`, `affiliate_link_clicks` 등)
- git commit / push
- vtron 관리자 화면의 대규모 리디자인

---

## 3. Repos & paths

| 역할 | 절대 경로 | 비고 |
|------|-----------|------|
| Expo 앱 | `/Users/jaesungphi/stmx/stmx-app/` | `app.json` name `stmx-app`, Expo ~57, React Navigation native-stack |
| 네비 | `stmx-app/src/navigation/AppNavigator.tsx` | `RootStackParamList` |
| 화면 | `stmx-app/src/screens/` | 새 화면 여기 |
| UI 키트 | `stmx-app/src/components/{Input,Button,PageWrapper,theme}.ts(x)` | |
| 앱 API/Supabase | `stmx-app/src/libs/{api,supabase}.ts` | 소비자 DB `ttcbqxmljloxaaqytxsm` |
| vtron | `/Users/jaesungphi/stmx/vtron/` | ops Supabase `vteqjxebptdbkbrxyxiz` |
| 계약 SQL | `vtron/supabase/migrations/0007_stmx_contracts.sql` | |
| 브랜드 ShopMy | `vtron/supabase/migrations/0008_brands_shopmy.sql` | `public.brands` 확장 |
| 제휴 주문(최소) | `vtron/supabase/migrations/0012_affiliate_commissions_payouts.sql` | `affiliate_links` **미구현**, `affiliate_link_id`만 예약 |
| 카탈로그 상품 | `vtron/supabase/migrations/0005_brand_catalog.sql` | `brand_catalog_models.catalog_url` |
| 드래프트(참고만) | `stmx-web/sqls/phase2/15_shopmy_commerce.sql` | `affiliate_links` 풀스택 초안 — **그대로 복사 금지**(products/posts FK) |

### 중요: Supabase 프로젝트가 둘이다

| 클라이언트 | URL ref | 용도 |
|------------|---------|------|
| stmx-app | `ttcbqxmljloxaaqytxsm` | auth.users / `profiles` / 설문·스타일 |
| vtron (및 현재 stmx-web `.env`의 active URL) | `vteqjxebptdbkbrxyxiz` | `stmx_contract_applications`, `brands`, affiliate_* |

모바일 Supabase 클라이언트로 vtron 테이블에 **직접 insert 하면 안 된다**(다른 프로젝트 + RLS만 켜고 정책 없음 + service role 전제).  
→ **반드시 vtron HTTP API**를 친다.

---

## 4. Feature A — 크리에이터 신청 양식

### 4.1 화면·진입

| 항목 | 값 |
|------|-----|
| Screen name | `CreatorApply` |
| 파일 | `stmx-app/src/screens/CreatorApplyScreen.tsx` |
| 등록 | `AppNavigator.tsx`에 `Stack.Screen` + `RootStackParamList` |
| 진입 | `MyPageScreen` 메뉴에 「크리에이터 신청」 row → `navigation.navigate('CreatorApply')` |
| 인증 | 로그인 필수. `supabase.auth.getUser()` 실패 시 Login으로 |

### 4.2 필드 → DB 컬럼 매핑 (`stmx_contract_applications`)

웹 폼(`app/contracts/creator/page.tsx`)과 **동일 payload**를 쓴다. `flowType` 고정 `"stmx_creator"`.

| UI 라벨 (KO) | 폼 state 키 | API JSON 키 | DB 컬럼 | 필수 |
|--------------|-------------|-------------|---------|------|
| 신청자 이름 | `applicantName` | `applicantName` | `applicant_name` | ✅ |
| 신청자 이메일 | `applicantEmail` | `applicantEmail` | `applicant_email` | ✅ |
| 연락처 | `applicantPhone` | `applicantPhone` | `applicant_phone` | |
| 소속/팀 | `applicantCompany` | `applicantCompany` | `applicant_company` | |
| 크리에이터명/닉네임 | `creatorName` | `creatorName` | `creator_name` | ✅ |
| 주요 채널 | `creatorChannelType` | `creatorChannelType` | `creator_channel_type` | |
| SNS/채널 URL | `creatorSnsUrl` | `creatorSnsUrl` | `creator_sns_url` | |
| 팔로워 규모 | `creatorFollowers` | `creatorFollowers` | `creator_followers` | |
| 희망 시작일 | `proposedStartDate` | `proposedStartDate` | `proposed_start_date` | |
| 희망 종료일 | `proposedEndDate` | `proposedEndDate` | `proposed_end_date` | |
| 협업 목적 | `campaignGoal` | `campaignGoal` | `campaign_goal` | |
| 비고 | `notes` | `notes` | `notes` | |

채널 옵션 (`CHANNEL_OPTIONS` in `types/contracts.ts`):

`instagram` | `youtube` | `tiktok` | `blog` | `other`

**프리필:** 로그인 프로필에서

- `applicantName` ← `profiles.nickname` (없으면 이메일 local-part)
- `applicantEmail` ← `auth.user.email` (read-only 권장)
- `creatorName` ← `profiles.nickname`

**서버가 채움:** `status='pending'`, `submitted_by` (가능하면 사용자 uuid), `etc`, timestamps.

### 4.3 `etc` 확장 (선택, 스키마 변경 없음)

은행/PayPal 컬럼은 **0007에 없다**. 필요하면 `etc` jsonb만 사용하고 UI에 「선택」 표시:

```json
{
  "style_code": "ECSM",
  "paypal_email": optional,
  "bank_name": optional,
  "bank_account": optional,
  "bank_holder": optional,
  "source": "stmx-app"
}
```

`style_code`는 프로필 `profiles.style_code`가 있으면 자동 넣는다 (`STYLE_CODE_OPTIONS` 16종 — `types/admin.ts`).

### 4.4 Validation / UX

클라이언트:

- 이름·이메일·크리에이터명 비어 있으면 제출 버튼 disabled (`Button` `selected`/`disabled` 패턴 — `NickInputScreen` 참고)
- 이메일 형식 간단 체크
- SNS URL이 있으면 `https://` 권장(강제 X, 서버도 trim만)

서버 (기존 `/api/contracts`):

- `applicantName`, `applicantEmail` 필수
- `stmx_creator`일 때 `creatorName` 필수
- 성공: `{ success: true, application: { id, ... } }`
- 실패: `{ error: string }` + 4xx/5xx

모바일 UX:

- 제출 중: 버튼 disabled + ActivityIndicator
- 성공: Alert 「신청이 접수되었습니다」 → `navigation.goBack()`
- 실패: 인라인 에러 텍스트 (`theme.colors.error`) 또는 toast

### 4.5 Auth

로그인된 `profiles` 행이 있어야 한다. 세션 없으면 신청 화면 진입 차단.

---

## 5. Feature B — 브랜드 상품 링크 입력 폼

### 5.1 화면·진입

| 항목 | 값 |
|------|-----|
| Screen name | `CreatorProductLinks` |
| 파일 | `stmx-app/src/screens/CreatorProductLinksScreen.tsx` |
| 진입 | MyPage 「상품 링크 등록」 |
| 권한 | 로그인 필수. **제안:** Feature A가 `approved`이거나 `pending`/`reviewing`이어도 제출 허용(제품 결정 — §12) |

### 5.2 필드

| UI 라벨 | 키 | 필수 | 설명 |
|---------|-----|------|------|
| 브랜드 | `brandId` | ✅ | vtron `public.brands` 검색/선택 (display_name) |
| 상품 URL | `productUrl` | ✅ | `https://` 로 시작 |
| 상품명 | `title` | | 없으면 URL 호스트만 표시용 |
| 이미지 URL | `imageUrl` | | 선택. 업로드는 1차 스코프 밖(URL 텍스트만) |
| 스타일 코드 | `styleCodes` | | multi optional, `STYLE_CODE_OPTIONS` |
| 메모 | `notes` | | |
| 카탈로그 모델(선택) | `catalogModelId` | | `brand_catalog_models.id` — 브랜드 선택 후 검색 가능하면 연결 |

제출 시 서버가 `creator_id`(모바일 auth uuid 또는 매핑 id), `status='pending'` 저장.

### 5.3 데이터 저장 — 현실과 제안

**사실:** vtron에는 `affiliate_links` 테이블이 **없다**.  
`0012` 주석: links/clicks 풀스택은 아직 없고 `affiliate_orders.affiliate_link_id`만 예약.

stmx-web 드래프트 `affiliate_links`는 `products(id)`, `posts(id)` FK에 묶여 있어 vtron 단독 이식 불가.

#### 제안 (명확히 신규): `public.creator_product_links`

마이그레이션 예: `vtron/supabase/migrations/0014_creator_product_links.sql`

```sql
create table if not exists public.creator_product_links (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null,  -- stmx-app profiles.id (cross-project; FK 생략 또는 문서화)
  brand_id           uuid not null references public.brands (id) on delete restrict,
  catalog_model_id   text references public.brand_catalog_models (id) on delete set null,
  product_url        text not null check (product_url ~* '^https://'),
  title              text,
  image_url          text,
  style_codes        text[] not null default '{}',
  notes              text,
  status             text not null default 'pending'
                       check (status in ('pending', 'approved', 'rejected', 'archived')),
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists creator_product_links_creator_idx
  on public.creator_product_links (creator_id, created_at desc);
create index if not exists creator_product_links_brand_idx
  on public.creator_product_links (brand_id, created_at desc);

alter table public.creator_product_links enable row level security;
-- 정책 없음: 서버 service role 전용 (0007과 동일 패턴)
```

나중에 ShopMy `affiliate_links`로 승격할 때 `metadata.affiliate_link_id` 또는 `affiliate_orders.affiliate_link_id`에 연결한다.  
**`commerce_brands`를 만들지 말 것.**

### 5.4 브랜드 목록 API

기존:

- `GET /api/admin/brands?q=&commerceStatus=active&affiliateReady=1` — admin 인증
- `GET /api/tryon/catalog/brands` — 내재화 완료 브랜드만

모바일용으로 **제안:** `GET /api/mobile/brands?q=`  
필터 기본: `is_active=true`, 가능하면 `commerce_status in ('active','draft')` 또는 `affiliate_ready=true`(제품 결정 §12).  
응답: `{ brands: [{ id, display_name, slug, affiliate_ready }] }`

---

## 6. Data model 요약

### 기존 (그대로 사용)

- `public.stmx_contract_applications` — Feature A
- `public.brands` (+ ShopMy 컬럼: `slug`, `commerce_status`, `affiliate_ready`, `preferred_style_codes`, …)
- `public.brand_catalog_models` — URL/이름 보조
- `public.style_codes` — 코드 마스터 (참조용; app 쪽 style_code는 consumer DB에도 있음)

### 제안 (신규, 표시: 제안)

- `public.creator_product_links` — Feature B
- (선택) `etc` 내 payout 연락처 — Feature A

### 쓰지 말 것

- `commerce_brands`
- stmx-web `creator_shelves` / `shelf_items` / 풀 `affiliate_links` (의존 테이블 없음)

---

## 7. API contract

### 7.1 인증 브릿지 (필수 제품 결정)

vtron `authenticate()` (`lib/supabase/route.ts`)는 **vtron Supabase JWT** 또는 service/anon 키만 검증한다.  
stmx-app JWT(`ttcbq…`)는 **통과하지 않는다**.

#### 제안 (권장): `/api/mobile/*` 네임스페이스

1. env 추가 (vtron):
   - `STMX_APP_SUPABASE_URL=https://ttcbqxmljloxaaqytxsm.supabase.co`
   - `STMX_APP_SUPABASE_ANON_KEY=…` (publishable)
2. `authenticateMobileApp(req)`:
   - `Authorization: Bearer <stmx-app access_token>`
   - 위 URL+anon으로 `auth.getUser(token)`
   - 성공 시 `{ userId, email }`
3. 라우트는 **service role**로 vtron DB write

모바일:

```ts
const { data: { session } } = await supabase.auth.getSession();
await fetch(`${EXPO_PUBLIC_VTRON_API_URL}/api/mobile/contracts`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

`EXPO_PUBLIC_VTRON_API_URL` 예: 로컬 `http://localhost:3000` / 배포 vtron origin.  
기존 `EXPO_PUBLIC_API_URL`이 vtron을 가리키게 통일해도 됨 — 스펙상 새 이름을 권장해 혼동을 줄인다.

### 7.2 Feature A

**`POST /api/mobile/contracts`** (또는 브릿지 후 기존 `POST /api/contracts` 재사용)

Request:

```json
{
  "flowType": "stmx_creator",
  "applicantName": "김스티",
  "applicantEmail": "user@example.com",
  "applicantPhone": "010-0000-0000",
  "applicantCompany": null,
  "creatorName": "스타일메이커",
  "creatorSnsUrl": "https://instagram.com/...",
  "creatorChannelType": "instagram",
  "creatorFollowers": "12만",
  "proposedStartDate": "2026-10-15",
  "proposedEndDate": null,
  "campaignGoal": "시즌 룩북",
  "notes": null,
  "etc": { "source": "stmx-app", "style_code": "ECSM" }
}
```

Response 200:

```json
{ "success": true, "application": { "id": "uuid", "status": "pending", "flow_type": "stmx_creator" } }
```

**`GET /api/mobile/contracts/me`** (제안): 내 신청 상태 1건 — MyPage 배지용.

### 7.3 Feature B

**`POST /api/mobile/creator-product-links`**

```json
{
  "brandId": "uuid",
  "productUrl": "https://...",
  "title": "울 코트",
  "imageUrl": null,
  "styleCodes": ["ECSM"],
  "notes": null,
  "catalogModelId": null
}
```

Response 200: `{ "success": true, "link": { "id": "uuid", "status": "pending" } }`

**`GET /api/mobile/creator-product-links`** — 내가 제출한 목록  
**`GET /api/mobile/brands?q=`** — 브랜드 검색

---

## 8. UI/UX (stmx-app 패턴)

- `PageWrapper` + 상단 뒤로가기 헤더 (`ProfileScreen` / `SettingsScreen` 패턴)
- 필드: `Input` (`src/components/Input.tsx`) — error prop 지원
- 제출: `Button` title 「신청하기」 / 「링크 등록」 — `selected={isFormValid}`
- 스케일: `createScaledStyleSheet` + `theme` (`primary #4E51E8`, `inactiveBg #F0F1F3`, Pretendard)
- 폼 레이아웃: `ScrollView` + `KeyboardAvoidingView` (`NickInputScreen`)
- i18n: **한국어 하드코딩**(앱에 i18n 라이브러리 없음). 영문 key는 코드만.
- 다크/라이트: MyPage는 라이트 카드 위주. 신청 폼은 **라이트 배경** 권장 (`#FFFFFF` / `inactiveBg`).

MyPage 진입 row 예시 카피:

- 「크리에이터 신청」
- 「상품 링크 등록」

---

## 9. Acceptance criteria

### Feature A

- [ ] 비로그인 시 CreatorApply 진입 불가(또는 Login 유도)
- [ ] 필수 3필드 없으면 제출 불가
- [ ] 성공 시 vtron `stmx_contract_applications`에 `flow_type=stmx_creator`, `status=pending` 행 생성
- [ ] vtron `/admin/creators`에서 해당 신청 조회·상태 변경 가능
- [ ] `submitted_by` 또는 `etc.source=stmx-app`으로 모바일 출처 식별 가능
- [ ] 네트워크/4xx 에러 메시지 사용자에게 표시

### Feature B

- [ ] 브랜드 검색 후 선택 가능
- [ ] `https://` URL만 통과
- [ ] 성공 시 `creator_product_links`(또는 합의된 테이블)에 행 생성
- [ ] 내 제출 목록 조회 가능
- [ ] `commerce_brands` 테이블 없음 / 사용 안 함

### 공통

- [ ] `AppNavigator` 타입·Screen 등록 완료
- [ ] git commit/push 없음(요청 시에만)
- [ ] Expo SDK 57 문서 기준으로 작성 (`stmx-app/CLAUDE.md` / AGENTS.md)

---

## 10. Implementation order (Claude)

1. **제품 확인(짧게):** Feature B 제출 허용 조건(신청만 / 승인 후), 브랜드 필터(`affiliate_ready` 여부) — 미정이면 스펙 기본값 사용: *신청 pending 이상 허용*, 브랜드 `is_active=true`.
2. vtron 마이그레이션 `0014_creator_product_links.sql` 추가·적용.
3. vtron `authenticateMobileApp` + env `STMX_APP_SUPABASE_*`.
4. API: `POST/GET /api/mobile/contracts`, `GET /api/mobile/brands`, `POST/GET /api/mobile/creator-product-links`.
5. stmx-app env: `EXPO_PUBLIC_VTRON_API_URL`.
6. `stmx-app/src/libs/vtron-api.ts` — session bearer fetch 헬퍼.
7. `CreatorApplyScreen` + navigator + MyPage 링크.
8. `CreatorProductLinksScreen` + 브랜드 검색 UI + MyPage 링크.
9. 수동 스모크: 신청 → admin creators 노출 / 링크 → DB row.
10. (선택) admin에 product links 목록 페이지 — 이번 스코프 밖이지만 API만 있어도 됨.

---

## 11. Do not

- `commerce_brands` 생성·참조
- stmx-app Supabase 클라이언트로 vtron 테이블 직접 write
- 풀 `affiliate_links` + `products` FK 무리한 이식
- git commit / push (명시 요청 전)
- 기존 `0007` 컬럼 rename/drop
- 서비스 롤 키를 앱 번들에 넣기
- 이 스펙과 무관한 파일 대량 리팩터

---

## 12. Open product decisions (갭)

구현 전 합의되면 문서만 고치면 된다. **미합의 시 괄호 안 기본값 사용.**

1. **모바일 JWT 브릿지** — `/api/mobile/*` + consumer Supabase 검증 **(기본: 채택)** vs 단일 Supabase로 앱 이전(큼).
2. **Feature B 자격** — 아무 로그인 유저 **(기본)** vs `stmx_creator` approved만.
3. **브랜드 필터** — `is_active`만 **(기본)** vs `affiliate_ready=true`만.
4. **Payout 연락처** — `etc`에 선택 필드 **(기본: UI에 PayPal 이메일만 선택)** vs 완전 생략.
5. **creator_id FK** — cross-project라 FK 없음 **(기본)** vs vtron `profiles`에 미러 유저 동기화(후속).

---

## 13. Quick reference — 웹 Creator 폼 제출 본문

기존 웹이 보내는 것과 모바일이 맞춰야 할 최소 형태:

```ts
// vtron/app/contracts/creator/page.tsx
{
  flowType: "stmx_creator",
  applicantName, applicantEmail, applicantPhone, applicantCompany,
  creatorName, creatorSnsUrl, creatorChannelType, creatorFollowers,
  proposedStartDate, proposedEndDate, campaignGoal, notes,
}
```

관리자 타입: `AdminCreator = ContractApplication` (`types/admin.ts`).

---

## 14. Env checklist

**vtron**

- 기존: `NEXT_PUBLIC_SUPABASE_URL` = `https://vteqjxebptdbkbrxyxiz.supabase.co`
- 추가(제안): `STMX_APP_SUPABASE_URL`, `STMX_APP_SUPABASE_ANON_KEY`

**stmx-app**

- 기존: `EXPO_PUBLIC_SUPABASE_URL` = `https://ttcbqxmljloxaaqytxsm.supabase.co`
- 참고: `src/libs/supabase.ts`는 `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 읽는데 `.env`는 `EXPO_PUBLIC_SUPABASE_KEY` — 구현 시 키 이름 정리
- 추가: `EXPO_PUBLIC_VTRON_API_URL`

---

*끝. 구현은 stmx-app + vtron `/api/mobile`만. 이 파일은 스펙이다.*
