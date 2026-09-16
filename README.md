# VTON — Virtual Try-On Platform

Next.js 16 (App Router) + Supabase 기반 가상 피팅 플랫폼.
[fashn-AI/tryon-nextjs-app](https://github.com/fashn-AI/tryon-nextjs-app) 을 이식해
실제 FASHN Virtual Try-On API 로 착장을 생성한다.

## 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | **VTON 스튜디오** — 배경 + 실사 캐릭터 + 다중 가먼트 레이어를 조합하는 한글 UI. 레이어 순서대로 FASHN try-on 을 연쇄 호출한다. |
| `/login` | **로그인** — Supabase Auth 이메일/비밀번호 폼(본문 중앙 정렬). 유일한 공개 라우트. |
| `/tryon` | **FASHN Try-On 데모** — 원본 `tryon-nextjs-app` 을 그대로 이식한 단일 가먼트 데모(모델/가먼트 업로드, 파라미터 컨트롤, 결과 갤러리, 모델 버전 비교 슬라이더). |
| `/mov` | **Portrait Studio** — 배경 애니메이션 24종 위에 배경 제거된 캐릭터를 등장시켜 세로 영상(webm)을 만든다. `style-ID-movie-studio` 이식. → [docs/portrait-studio.md](docs/portrait-studio.md) |
| `/api-playground` | **API 플레이그라운드** — 네이버 쇼핑(커머스) API 호출 테스트를 중심으로 임의의 RESTful 엔드포인트를 호출하고 응답을 보는 콘솔. → [아래 절](#api-플레이그라운드-api-playground) |
| `/products-2-link` | **상품링크** — stmx-web Loox 목록에서 게시물을 고르고, 옷 브랜드 × 분류의 네이버 카탈로그 상품을 찾아 붙인다. |
| `/brand-integration` | **브랜드 내재화** — 브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품 계층을 확정해 우리 DB 에 넣는다. → [아래 절](#브랜드-내재화-brand-integration) |

모든 페이지 위에는 전역 상단 내비게이션([`components/NavBar.tsx`](components/NavBar.tsx))이
붙는다. 라우트 링크(현재 위치 강조)와 로그아웃만 담고, `/login` 에서는 렌더하지 않는다.

뷰포트 높이는 NavBar 와 본문이 나눠 갖는다. 그래서 각 페이지 루트는 `h-screen` 이
아니라 **`h-full`** 을 쓴다 — 100vh 를 그대로 쓰면 NavBar 높이만큼 넘쳐 바깥
스크롤바가 생긴다. 세로 스크롤은 루트 레이아웃의 본문 컨테이너가 맡는다.

### 타이포그래피 · 글자색

`/mov` 를 제외한 모든 화면은 **글자색 검정(#000)** 에 **글자 크기 1.8배**를 쓴다.
Tailwind 의 이름있는 크기(`text-sm` 등)는 배율을 곱할 수 없어 전부 px 로 풀어 뒀다
(`text-sm` → `text-[25.2px]`). 새 컴포넌트를 만들 때도 이 축척을 따른다.

| 원래 | 지금 | | 원래 | 지금 |
| --- | --- | --- | --- | --- |
| 10px | 18px | | `text-xs` (12) | 21.6px |
| 11px | 19.8px | | `text-sm` (14) | 25.2px |
| 11.5px | 20.7px | | `text-base` (16) | 28.8px |
| 12.5px | 22.5px | | `text-lg` (18) | 32.4px |

검정으로 바꾸지 않은 것 — 모두 의도한 예외다.

1. **`text-white`** — 어두운/채도 높은 배경 위 글자(기본 버튼, 상태 pill, `bg-black/70` 오버레이).
2. **`dark:` 변형** — 다크 모드에서 읽혀야 하므로 그대로 뒀다. `/tryon` 만 해당.
3. **아이콘** — 글자가 아니다. `className` 에 `w-<숫자>` 와 `h-<숫자>` 가 함께 있으면 아이콘으로 보고 색을 유지한다.
4. **의미를 나르는 색** — JSON 문법 하이라이트, HTTP 메서드 배지, 상태 코드 pill, 프리셋 상태 점([`playground.css`](app/api-playground/playground.css)).
5. **입력 placeholder** — 입력값과 구분돼야 해서 반투명 검정.

`/mov`(Portrait Studio)는 배경이 `#0b0c10` 인 다크 테마 이식 앱이라 제외했다.
검정 글자를 넣으면 글씨가 보이지 않는다.

| API | 설명 |
| --- | --- |
| `POST /api/tryon` | 원본 앱의 try-on 엔드포인트. `run` 후 완료까지 폴링(최대 3분). |
| `POST /api/vton/render` | 스튜디오 렌더. 가먼트를 레이어 순서로 한 벌씩 입히고 결과를 Supabase Storage 에 보관한다. |
| `POST /api/vton/upload` | 이미지 → Supabase Storage 업로드. |
| `GET/POST /api/vton/projects`, `GET/DELETE /api/vton/projects/[id]` | 세션(프로젝트) CRUD. |
| `POST /api/playground/request` | 플레이그라운드 프록시. 임의의 HTTP 요청을 서버가 대신 보내고 응답 전문을 돌려준다. |
| `GET/POST /api/playground/naver/token` | 네이버 커머스 자격 증명 설정 여부 조회 / 액세스 토큰 발급. |
| `GET/POST /api/playground/brand-catalog` | 브랜드 내재화 조회 / 등록. `&kind=` 를 붙이면 그 분류의 최하위 카테고리와 상품까지 준다. POST 는 브랜드 × 최상위 카테고리 하나를 통째로 갈아끼운다. |

## 실행

```bash
npm install
npm run dev    # http://localhost:8920
```

### DB 스키마

스튜디오의 세션 저장·렌더 잡 기록은 `vton_projects` / `vton_garments` /
`vton_render_jobs` 테이블을 사용한다. Supabase 대시보드 → SQL Editor 에서
[`supabase/migrations/0001_vton_schema.sql`](supabase/migrations/0001_vton_schema.sql)
을 한 번 실행한다. Storage 버킷(`vton-assets`, `vton-results`)은 업로드/렌더 시
없으면 자동 생성된다.

테이블이 없어도 렌더 자체는 동작한다(잡 기록만 건너뛴다). 반면 `세션 저장`과
`세션 목록`은 테이블이 있어야 한다.

브랜드 쪽 표는 번호 순서대로 한 번씩 실행한다. 모두 SQL Editor 에 붙여넣는 방식이다.

| 파일 | 만드는 것 |
| --- | --- |
| [`0002_brands.sql`](supabase/migrations/0002_brands.sql) | `brands` · `brand_groups` · `brand_categories` · `naver_categories` |
| [`0003_brand_clothing.sql`](supabase/migrations/0003_brand_clothing.sql) | `brand_clothing_categories` (표본에서 센 분포) |
| [`0004_clothing_etc.sql`](supabase/migrations/0004_clothing_etc.sql) | 옷 분류를 상의 · 하의 · 기타로 |
| [`0005_brand_catalog.sql`](supabase/migrations/0005_brand_catalog.sql) | `brand_catalog_kinds` · `brand_catalog_categories` · `brand_catalog_models` (내재화) |

### 환경 변수

`.env.example` 을 `.env.local` 로 복사한 뒤 채운다.

- `FASHN_API_KEY` — [app.fashn.ai](https://app.fashn.ai) → Settings → API 에서 발급.
  - 비어 있으면 `/tryon` 은 브라우저에 저장된 사용자 키(모달 입력)를 요구하고,
    스튜디오 렌더는 데모(시뮬레이션) 결과로 폴백한다.
- `FASHN_ENDPOINT_URL` — 기본 `https://api.fashn.ai`. 자체 엔드포인트를 쓸 때만 지정.
- `SUPABASE_SERVICE_ROLE_KEY` — 업로드/결과 보관/세션 저장에 필요.
  없으면 anon 키로 폴백하며 RLS 때문에 Storage·DB 쓰기가 실패한다
  (렌더는 계속 동작하고 FASHN CDN URL 을 그대로 반환한다).
- `NAVER_COMMERCE_CLIENT_ID` / `NAVER_COMMERCE_CLIENT_SECRET` — `/api-playground` 의
  네이버 커머스 토큰 발급용. **시크릿의 `$` 는 백슬래시로 이스케이프해야 한다.**
  → [API 플레이그라운드 · 환경 변수](#환경-변수-1)

## 인증

브라우저는 **Supabase SDK 를 직접 호출하지 않는다.** 모든 Supabase 접근은 API 를
거치고, API 호출은 `Authorization: Bearer <access_token>` 으로 인증한다.

```
로그인   브라우저 → POST /api/auth/login  → (서버) signInWithPassword
                                         ← 세션 쿠키 + accessToken
API 호출 브라우저 → authFetch()           → Authorization: Bearer <accessToken>
                                            → 라우트가 authenticate() 로 검증
토큰갱신 401 응답 → GET /api/auth/session → 쿠키 세션에서 새 accessToken
로그아웃 브라우저 → POST /api/auth/logout → 세션 쿠키 정리
```

| 엔드포인트 | 설명 |
| --- | --- |
| `POST /api/auth/login` | 이메일/비밀번호 로그인. 세션 쿠키를 굽고 `accessToken` 을 반환. |
| `GET /api/auth/session` | 쿠키 세션에서 현재 사용자와 **최신** access token 을 반환(필요 시 갱신). |
| `POST /api/auth/logout` | 세션 쿠키 정리. |

- **토큰 보관** — access token 은 XSS 노출 면을 줄이기 위해 `lib/auth-client.ts` 의
  **메모리에만** 둔다(`localStorage`/`sessionStorage` 미사용). 새로고침 후에는 쿠키
  세션을 근거로 `/api/auth/session` 에서 다시 받는다.
- **자동 재시도** — `authFetch()` 는 세션 401 을 받으면 토큰을 한 번 갱신해 재시도하고,
  그래도 실패하면 `/login?next=…` 로 보낸다.
- **401 구분** — 401 이 모두 세션 문제는 아니다. `/api/tryon` 은 FASHN API 키가 없거나
  잘못됐을 때도 401(`requiresApiKey`)을 돌려준다. 그래서 세션 인증 실패에만
  `WWW-Authenticate: Bearer` 를 붙이고, `authFetch()` 는 그 헤더가 있을 때만 토큰을
  갱신하고 로그인 페이지로 보낸다. 그렇지 않으면 FASHN 키 오류가 조용한 로그아웃처럼
  보인다.
- **검증 방식** — 라우트는 anon 키 클라이언트의 `getUser(token)` 으로 Auth 서버에
  토큰을 검증시킨다. 검증에 통과한 뒤에야 service role 클라이언트로 작업한다.
- 보호 대상: `/api/tryon`, `/api/vton/render`, `/api/vton/upload`,
  `/api/vton/projects`(GET·POST), `/api/vton/projects/[id]`(GET·DELETE),
  `/api/playground/request`, `/api/playground/naver/token`.
  `/api/auth/*` 만 공개.

### 페이지 가드

[`proxy.ts`](proxy.ts) 가 `/login` 을 제외한 **모든 페이지**를 가로채 유효한 세션이
없으면 `/login` 으로 리다이렉트한다. 이미 로그인한 사용자가 `/login` 에 오면 `/` 로
되돌린다.

- 세션 검증은 `getUser()`. `getSession()` 은 쿠키를 그대로 신뢰하므로 가드에 쓰지 않는다.
- 원래 가려던 경로는 `?next=` 로 넘겨 로그인 후 복귀한다.
  같은 오리진 경로만 허용해 오픈 리다이렉트를 막는다.
- Supabase 환경 변수가 없으면 통과시키지 않고(fail closed) `/login?error=config` 로 보낸다.
- 로그아웃은 전역 NavBar 우측 버튼.
- Next 16 에서 `middleware.ts` 는 deprecated 이므로 `proxy.ts` 규약을 쓴다.
- `/api/*` 는 프록시 매처에서 제외한다 — API 에 리다이렉트를 돌려주면 fetch 가 HTML 을
  따라가 깨지므로, 각 라우트가 위의 Bearer 검증으로 401 을 반환한다.

## API 플레이그라운드 (`/api-playground`)

네이버 쇼핑(커머스) API 호출 테스트를 주 용도로 하는 REST 콘솔. 프리셋을 고르고
`Ctrl+Enter` 로 보내면 상태·소요시간·크기·헤더·본문을 그대로 보여준다. 커머스 API
전용이 아니라 임의의 URL 도 호출할 수 있다.

```
┌ 헤더 ───────────────────────────────────────────────────────────┐
├ 네이버 커머스 인증 — [SELF/SELLER] [토큰 발급] 발급됨 · 2시간 59분 남음 ┤
├──────────┬──────────────────────────────────────────────────────┤
│ 프리셋    │ [GET ▾] {{baseUrl}}/v1/seller/channels   [보내기][cURL] │
│ 히스토리  │ 파라미터 | 헤더 | 바디 | 인증 | 변수                    │
│          │──────────────────────────────────────────────────────│
│          │ 200 OK · 210 ms · 148 B    JSON | 원본 | 헤더 | 요청정보 │
└──────────┴──────────────────────────────────────────────────────┘
```

### 브라우저가 아니라 서버가 호출한다

모든 요청은 [`/api/playground/request`](app/api/playground/request/route.ts) 를 거친다.
이유는 둘이다.

1. **CORS** — 커머스 API 는 브라우저 오리진을 허용하지 않는다.
2. **시크릿** — 애플리케이션 시크릿과 그 파생 서명은 서버에만 둔다.

프록시는 응답을 **가공하지 않는다.** 4xx·5xx 도 2xx 와 같은 자리에 같은 모양으로
보여준다. 이 페이지에서는 에러 응답 본문(`GW.AUTHN`, `invalidInputs` 등)이 곧 정보다.

- 세션 가드: 다른 API 와 같이 `Authorization: Bearer` 를 검증한다(로그인 필수).
- 프로토콜은 http/https 만, 클라우드 메타데이터 호스트(`169.254.169.254` 등)는 차단.
- 타임아웃 기본 30초(최대 120초), 본문 4MB 초과 시 잘라서 반환.
- 바이너리 응답은 base64 로 넘기고, `image/*` 면 미리보기를 띄운다.

### 인증 — bcrypt 서명

커머스 API 는 애플리케이션 시크릿을 그대로 보내지 않는다.

```
sign = base64( bcrypt("<애플리케이션ID>_<timestamp>", <애플리케이션시크릿>) )

POST {{baseUrl}}/v1/oauth2/token
  client_id=…&timestamp=…&client_secret_sign=…&grant_type=client_credentials&type=SELF
```

시크릿(`$2a$04$…` 29자)이 곧 bcrypt salt 라서 salt 를 따로 만들지 않고 해시 입력으로
그대로 쓴다. 서명은 시크릿을 알아야 만들 수 있으므로 항상 서버에서 계산한다
([`lib/playground/naver.ts`](lib/playground/naver.ts)).

발급받은 액세스 토큰(3시간)은 **메모리에만** 둔다. `lib/auth-client.ts` 의 세션 토큰과
같은 이유다 — 짧은 수명의 자격 증명을 디스크에 남기지 않는다.

`type=SELF` 는 내 스토어용, `type=SELLER` 는 위임받은 판매자용(`account_id` 필요).

### `{{변수}}`

URL·파라미터·헤더·바디에 쓸 수 있다. 브라우저가 채우는 것과 서버가 채우는 것이 나뉜다.

| 변수 | 채우는 곳 | 값 |
| --- | --- | --- |
| `{{accessToken}}` | 브라우저 | 토큰 바에서 발급받은 액세스 토큰 |
| `{{now}}` `{{today}}` `{{isoNow}}` `{{isoHourAgo}}` `{{isoDayAgo}}` `{{uuid}}` | 브라우저 | 시각·난수 |
| `{{siteUrl}}` | 브라우저 | 이 앱의 오리진 |
| `{{baseUrl}}` | 서버 | `https://api.commerce.naver.com/external` |
| `{{clientId}}` `{{timestamp}}` `{{clientSecretSign}}` | 서버 | 애플리케이션 ID 와 그 서명 |

쿼리 파라미터와 form 바디는 **문자열로 합쳐서 넘기지 않고** 배열/줄 단위로 프록시에
넘긴다. 변수를 채운 *뒤에* 인코딩해야 base64 서명의 `+` `/` `=` 가 깨지지 않기 때문이다.
`cURL 복사`는 브라우저 변수만 채우고 서버 변수는 `{{…}}` 로 남겨, 복사한 명령에
시크릿이 섞여 나가지 않게 한다.

### 프리셋

[`lib/playground/presets.ts`](lib/playground/presets.ts). 등록된 애플리케이션의 API 그룹
(판매자정보 · 상품/N배송 · 주문 판매자 · 문의)을 그대로 따르고, 일반 REST 확인용 샘플
그룹을 하나 더 둔다. 옆의 점은 **문서가 아니라 실제 호출 결과**다.

| 점 | 뜻 | 해당 프리셋 |
| --- | --- | --- |
| 초록 `확인됨` | 200 을 받았다 | 토큰 발급, 판매자 채널/계정/주소록, 카테고리 목록·단건, 변경 상품주문 내역, 카탈로그 모델·모델 단건·브랜드·제조사 |
| 노랑 `파라미터 필요` | 엔드포인트는 살아 있고 필수 파라미터가 빈다(400) | 상품 문의 목록, 고객 문의 목록 |
| 빨강 `권한 필요` | 경로는 맞지만 애플리케이션에 리소스 권한이 없다(401 `GW.AUTHN`) | 상품 목록 조회, 상품주문 상세 조회 |
| 파랑 `데이터 필요` | 경로는 맞고 예시 식별자가 없을 뿐이다(404 `NOT_FOUND`) | 원상품/채널상품 조회 |
| 회색 `미확인` | 아직 호출해 보지 않았다 | 나머지 |

> 존재하지 않는 경로는 `404 GW.NOT_FOUND`, 권한이 없는 경로는 `401 GW.AUTHN` 로
> 게이트웨이가 구분해서 답한다. 그래서 `상품 목록 조회`(`POST /v1/products/search`)의
> 401 은 오타가 아니라 **권한 문제**로 읽어야 한다 — 커머스 API 센터 →
> 애플리케이션 → API 그룹의 리소스 권한을 확인해야 풀린다.

### API CALL FLOW

목록 맨 위 **플로우** 그룹의 항목을 누르면 열린다.
[`CallFlowModal`](components/playground/CallFlowModal.tsx) · [`flows.ts`](lib/playground/flows.ts).

프리셋은 엔드포인트를 하나씩만 보여준다. 그런데 이 API 들을 두드려 보는 목적은 결국
**상품 링크를 뽑는 것**이고, 그러려면 어떤 순서로 무엇을 무엇에 넘기는지가 필요하다.
그 순서를 한 화면에 세운 것이 플로우다. 단계마다 *얻는 것*과 *다음으로 넘기는 값*을
같이 적고, **[편집기로 열기]** 로 그 단계를 바로 요청 편집기에 올린다.

**상품 링크 추출** — 대상은 **네이버쇼핑 전체 상품**이지 내 스토어 상품이 아니다.
그래서 판매자 쪽 API(판매자 채널 조회 · 상품 목록 조회 · 원상품 조회)는 쓰지 않는다.
전체를 훑는 입구는 **카탈로그(모델) 마스터**다.

```
인증 → 브랜드 조회 → 카탈로그 모델 목록(name=브랜드명 · brandCode 필터) → (카테고리로 거르기) → 선택 → 링크
```

**카탈로그보다 브랜드를 먼저 조회한다.** 브랜드 조회로 정규 이름과 id 를 얻고, 이름은
모델 조회의 `name` 에, id 는 응답의 `brandCode` 필터에 쓴다. 상품링크 창도 이 순서다.

상품링크 창은 **의류(상의 · 하의 · 기타)로 제한**한다. 브랜드는 `npm run sync:brands` 가 미리 매칭해 둔
`brands` 테이블에서 옷 브랜드 묶음만 받아(`GET /api/playground/brands`) **초성으로 찾는다**(`ㄴㅇㅋ` → 나이키).
브랜드를 고르면 아래 줄에 **상의 · 하의 · 기타** 버튼이 나오고, 누르면 `name=<브랜드명 + 옷 키워드>` 로
키워드마다 모델을 조회해 `brandCode` 와 `categoryId` 로 거른 링크 목록을 보여준다. 분류별 키워드와
카테고리 id 는 [`res/clothing-categories.json`](res/clothing-categories.json) 한 곳에 있다
(스키마: `supabase/migrations/0004_clothing_etc.sql`).

| # | 단계 | 얻는 것 | 다음으로 |
| --- | --- | --- | --- |
| 1 | `POST /v1/oauth2/token` | access_token | 모든 호출의 Bearer |
| 2 | `GET /v1/product-brands?name=` | `[{id,name}]` | 정규 브랜드 **이름** → 3번의 `name` · **id** → 3번 결과의 `brandCode` 필터 |
| 3 | `GET /v1/product-models?name=` | 모델 목록 | 모델 id |
| 4 | `GET /v1/categories` *(선택)* | 카테고리 5,820건 | 전체 경로 → 3번 결과의 `wholeCategoryName` 필터 |
| 5 | `GET /v1/product-models/{id}` *(선택)* | 모델 단건 | 확정한 id |
| 6 | **링크 조립** | 상품(카탈로그) URL | — |

**좁히는 값은 id 가 아니라 이름으로 넘어간다.** 3번의 `name` 이 모델명뿐 아니라
**브랜드명 · 제조사명 · 카테고리명까지 함께 훑기** 때문이다. 카테고리 id·브랜드 id 를
파라미터로 얹는 건 무시되지만(위 실험), 거기서 얻은 *이름* 을 넣으면 통한다.

| 검색어 | 성격 | totalElements | 표본 50건 적중 |
| --- | --- | --- | --- |
| `풀오버` | 리프 카테고리명 | 584,383 | `…>니트>풀오버` 50/50 |
| `롱부츠` | 리프 카테고리명 | 101,992 | `…>부츠/워커>롱부츠` 50/50 |
| `카디건` | 리프 카테고리명 | 576,799 | `…>니트>카디건` 50/50 |
| `나이키` | 브랜드명 | 75,054 | brandName 50/50 |

- **`name` 은 필수다.** 빼면 400 이라 목록 전체를 열거할 수 없다.
- **`size` 상한은 100** 이다(500·1000 은 400). 그 이상은 `page` 로 넘긴다.
- 정확 일치가 아니다(토큰 분해 매칭). 동명이 리프(여성/남성 카디건)나 무관한 항목이
  섞이므로, 확정하려면 응답의 `wholeCategoryName` / `brandCode` 로 한 번 거른다.
- 커머스 API 는 **링크를 직접 주지 않는다.** 모델 id 로 만들어야 하는데
  `https://search.shopping.naver.com/catalog/{id}` 형식은 **검증하지 못했다** —
  해당 도메인이 이 환경의 브라우징 정책에서 차단돼 열어볼 수 없었다. 이 플로우에서
  유일하게 확인 못 한 고리다. 형식이 다르면
  [`flows.ts`](lib/playground/flows.ts) 의 `assemble` 단계만 고치면 된다.

#### 카탈로그(네이버쇼핑 마스터) 조회 3종

| 엔드포인트 | 하는 일 | 응답 |
| --- | --- | --- |
| `GET /v1/product-models?name=` | 모델 검색 | `{ contents[], page, size, totalElements, totalPages, first, last }` |
| `GET /v1/product-models/{id}` | 모델 단건 | 모델 객체 하나 |
| `GET /v1/product-brands?name=` | 브랜드 검색 | `[{ id, name }]` |
| `GET /v1/product-manufacturers?name=` | 제조사 검색 | `[{ id, name }]` |

**검색어 파라미터는 `name` 이다.** `keyword` · `searchKeyword` · `modelName` · `brandName`
은 전부 400 `BAD_REQUEST` 를 돌려준다 — 에러 본문에 어떤 필드가 잘못됐는지 안 적혀 있어서
이름을 하나씩 맞춰봐야 했다. `contents` 항목은 `id` · `name` · `brandCode`/`brandName` ·
`manufacturerCode`/`manufacturerName` · `categoryId` · `wholeCategoryName` 을 담는다.

**카테고리로 좁힐 수 없다.** `categoryId` · `categoryIds` 를 넣어도, 아무 의미 없는
이름(`zzzUnknown=1`)을 넣어도 `totalElements` 가 1,919,658 로 똑같다 — 모르는 파라미터는
조용히 무시된다. 즉 `categoryId` 는 이 API 의 파라미터가 아니다. 인식되는 건
`name` · `page` · `size` 뿐이고, 카테고리별로 보려면 응답의 `wholeCategoryName` 으로
직접 걸러야 한다.

#### 브랜드 · 제조사로는 링크에 갈 수 없다

두 API 의 응답은 `{ id, name }` 두 필드가 전부다 — 링크도, 상품도 없다.
**이름↔id 사전**이지 상품 목록이 아니다.

브랜드/제조사로 모델을 좁히는 경로도 없다. `name=니트` 를 기준선으로 두고
파라미터를 하나씩 얹어 본 결과다(한 번의 실행에서 연속 호출).

| 요청 | totalElements |
| --- | --- |
| `name=니트` (기준선) | 1,920,080 |
| `+ brandCode=3839992` | 1,920,080 |
| `+ brandId=3839992` | 1,920,080 |
| `+ brandName=더엣지` | 1,920,080 |
| `+ manufacturerCode=259842` | 1,920,080 |

한 건도 다르지 않다 — 앞서와 같은 이유로 모르는 파라미터라 무시된다.

#### 다만 `name` 이 브랜드명·제조사명까지 훑는다

모델 조회의 `name` 은 모델명만 보는 게 아니다. 표본 50건씩 받아 필드별로 세어 봤다.

| 검색어 | totalElements | 모델명에 포함 | 브랜드명에 포함 | 제조사명에 포함 |
| --- | --- | --- | --- | --- |
| `나이키` | 75,054 | 0 / 50 | **50 / 50** | **50 / 50** |
| `더엣지` | 831 | 0 / 50 | 49 / 50 | 0 / 50 |
| `에어맥스` | 2,458 | 44 / 50 | 0 / 50 | 0 / 50 |

`name=나이키` 로 잡힌 50건은 **모델명에 '나이키'가 하나도 없다**(`에어맥스 모토 2K HQ2056`
같은 것들). 브랜드·제조사 필드에서 걸린 것이다. 그래서 **브랜드 조회로 정규 이름을 얻어
`name` 에 넣으면 사실상 브랜드별 모델 목록이 된다.**

정확 일치는 아니다. 토큰 분해 매칭이라 `에어맥스` 가 `에어 맥스`(띄어쓰기) 표기도 잡고,
`더엣지` 50건 중 1건은 브랜드 `ab.f.z` / 제조사 `SG세계물산` / 모델명 `레이스 프릴 페플럼
블라우스` 로 세 필드 어디에도 검색어가 없었다. 확실히 하려면 응답의 `brandCode` 로 한 번
거른다 — 모델마다 `brandCode`/`brandName` 이 실려 오므로 클라이언트에서 처리할 수 있다.

브랜드가 갈래지는 점은 따로 봐야 한다. `?name=nike` 는 **나이키 · 나이키키즈 · 나이키골프 ·
나이키스윔 · 나이키스트렝스 · NIKEN** 을 각각 다른 id 로 돌려준다. 어떤 id 를 묶을지는
운영자 몫이다(`name=나이키` 표본 50건에는 `나이키` 하나만 섞여 있었으나, 표본일 뿐이다).

정리하면 실질 경로는 이렇다.

```
브랜드 조회(정규 이름·id) → 모델 조회(name=브랜드명) → brandCode 로 필터 → 모델 id → 링크
```

> 위 `totalElements` 숫자는 마스터가 계속 늘어나므로 실행 시점마다 달라진다
> (몇 시간 사이 1,919,658 → 1,920,080). 비교는 **같은 실행 안에서만** 뜻이 있다.

#### 카탈로그와 카테고리의 관계

방향은 **카테고리 → 카탈로그**다. 카탈로그가 카테고리를 품는 게 아니라, 카탈로그 모델
하나하나가 자기가 속한 리프 카테고리를 가리킨다.

```
카테고리 (5,002 리프 · 최대 4단계)                    GET /v1/categories
└── 패션의류 > 여성의류 > 니트 > 풀오버   id 50021299
    │
    └── 카탈로그 모델 (191만+)                        GET /v1/product-models?name=
        └── id 61171550082  "워셔블 울혼방 딥 브이넥 니트"
            ├── categoryId 50021299  ──→ 위 카테고리를 가리킨다
            ├── brandCode  3839992 "더엣지"           GET /v1/product-brands?name=
            └── manufacturerCode 0 ""                 GET /v1/product-manufacturers?name=

내 스토어 상품 (판매 단위)
└── 원상품  originProductNo                           POST /v1/products/search
    ├── 리프 카테고리 지정
    ├── (선택) 카탈로그 모델 매칭
    └── 채널상품 channelProductNo[]  ──→ 상품 링크
```

- **카테고리**는 분류 체계(주소), **카탈로그 모델**은 그 주소에 놓인 제조사 모델이다.
  리프 카테고리 하나에 모델이 여럿 붙는다(5,002 : 191만).
- **브랜드·제조사**는 카테고리의 상위/하위가 아니라 모델이 참조하는 **평평한 별도 마스터**다
  (`[{ id, name }]`).
- **카탈로그 모델 ≠ 내 상품.** 모델은 여러 판매자가 공유하는 마스터이고, 내 상품은
  거기에 매칭될 수 있는 판매 단위다. 링크가 나오는 쪽은 내 상품(채널상품)이다.
- 그래서 [Treeview] 로 고르는 건 **카테고리**(검색 시작점)이지 카탈로그가 아니다.
  모델 검색은 카테고리로 좁힐 수 없으므로, 좁히려면 받아온 뒤 `wholeCategoryName` 으로 거른다.

경로 후보를 좁힌 근거도 남긴다 — `/v1/catalogs` · `/v1/product-catalogs` ·
`/v1/products/catalogs` · `/v2/products/catalogs` 는 모두 404 `GW.NOT_FOUND` 이고
`/v1/product-models` 만 400 으로 답했다. 게이트웨이가 '없는 경로'와 '잘못된 입력'을
구분해 주므로 이걸로 리소스를 특정할 수 있다.

### 카테고리 계층 뷰어 (Treeview)

왼쪽 목록 아래 **[Treeview]** 버튼으로 연다.
[`CategoryTreeModal`](components/playground/CategoryTreeModal.tsx) ·
[`category-tree.ts`](lib/playground/category-tree.ts).

`GET /v1/categories` 응답은 **5,002건짜리 평평한 배열**이라 응답 뷰어로는 읽히지 않는다.
계층 정보는 중첩 구조가 아니라 `wholeCategoryName` 한 줄에 들어 있다.

```json
{ "wholeCategoryName": "패션의류>여성의류>니트>풀오버",
  "id": "50021299", "name": "풀오버", "last": true }
```

그래서 `>` 로 쪼개 트리를 세우고, **패션 계열만 걸러** 운영자가 상품 검색을 시작할
카테고리를 고르게 한다. 최대 4단계이며 `last=true` 응답에서는 리프에만 id 가 붙는다.

**응답이 전체인지 확인한 결과** — `last` 를 뺀 호출과 대조했다.

| 호출 | 건수 | 단계 분포 |
| --- | --- | --- |
| `?last=true` | 5,002 | 2단계 7 · 3단계 1,525 · 4단계 3,470 |
| 파라미터 없음 | 5,820 | 1단계 11 · 2단계 243 · 3단계 2,096 · 4단계 3,470 |

- 두 응답 모두 **페이지네이션이 없다**(순수 배열, 고유 id 수 = 건수, 중복 0). 잘려 오지 않는다.
- 전체 응답에서 `last === true` 인 항목이 정확히 5,002개이고 `?last=true` 결과와 **차집합이 0**이다.
- `?last=true` 5,002건에서 **합성한 경로 5,820개가 전체 응답의 경로 5,820개와 양방향 차집합 0** 으로
  일치한다. Treeview 가 중간 노드를 만들어 세우는 방식이 실제 응답과 어긋나지 않는다는 뜻이다.
- 최상위는 11개다 — 패션의류 · 패션잡화 · 화장품/미용 · 디지털/가전 · 가구/인테리어 ·
  출산/육아 · 식품 · 스포츠/레저 · 생활/건강 · 여가/생활편의 · 도서.
  네이버쇼핑 프런트에서 보이는 `면세점` 은 응답에 없다(지정 판매자용 특수 카테고리로 보이나 미확인).
  즉 "전체"는 **이 판매자가 등록할 수 있는 카테고리 전체**로 읽는 편이 안전하다.

> `last` 를 빼고 부르면 중간 노드에도 id 가 실려 온다. Treeview 의 [조회] 버튼을 상위
> 카테고리에서도 쓰고 싶으면 프리셋에서 `last` 행을 끄면 된다(건수는 5,002 → 5,820).

| 필터 | 범위 | 리프 수 |
| --- | --- | --- |
| **패션**(기본) | `패션의류` · `패션잡화` | 353 |
| 패션 + 유아·스포츠 | + 유아동 의류/잡화·주얼리, 신생아의류, 임부복, 스포츠액세서리 | 463 |
| 전체 | 필터 없음 | 5,002 |

스포츠/레저는 장비가 대부분이라 통째로 넣지 않고 `스포츠액세서리` 만 집는다.

- **입력** — 기본은 플레이그라운드의 마지막 응답. 상단 **[JSON 파일]** 로 파일을 골라도 된다.
  카테고리 배열이면 같은 트리로, 아니면 그 파일의 구조를 그대로 보여준다(`JsonTree`).
- **검색** — 카테고리명 · 전체 경로 · id 로 찾는다. 걸린 노드의 조상은 남기고 건수는
  남은 가지 기준으로 다시 센다(`니트` 로 찾으면 패션의류가 88이 아니라 8로 표시된다).
- **[조회]** — 그 카테고리의 `GET /v1/categories/{id}` 요청을 편집기에 올리고 모달을 닫는다.
- 자식이 200개를 넘으면 끊어서 그리고 '더 보기'로 이어 붙인다.

### 환경 변수

```
NAVER_COMMERCE_CLIENT_ID=8ncJa3jBeuC08bE28wBf2
NAVER_COMMERCE_CLIENT_SECRET=\$2a\$04\$xxxxxxxxxxxxxxxxxxxxxx
NAVER_COMMERCE_BASE_URL=            # 기본값 https://api.commerce.naver.com/external
NAVER_SEARCH_CLIENT_ID=             # 네이버 검색 오픈 API (상품링크 '열기' 의 이미지·제목)
NAVER_SEARCH_CLIENT_SECRET=
```

> 상품링크 모달의 **열기**는 카드 아래에 상품 이미지·제목 표를 펼친다. 커머스 API 모델에는
> 이미지가 없고 카탈로그 페이지는 서버 fetch 가 418 로 막혀서, 이미지는 네이버 검색 오픈 API
> (`/v1/search/shop.json`)로 받는다. 커머스 API 와 **별개의 애플리케이션**이므로
> developers.naver.com 에서 '검색' API 를 쓰는 애플리케이션을 따로 등록해 키를 넣는다.

> **`$` 를 반드시 백슬래시로 이스케이프한다.** Next 는 `.env` 를 dotenv-expand 로 읽어서
> `$2a$04$…` 를 변수 참조로 확장해 버린다(작은따옴표로 감싸도 마찬가지). 이스케이프하지
> 않으면 시크릿이 `/u` 같은 조각으로 잘려 들어가고, 토큰 발급이 "시크릿 형식이 아닙니다"
> 로 막힌다.

값을 비워두면 페이지는 그대로 열리고, 토큰 바에서 `직접 입력`으로 애플리케이션
ID/시크릿을 한 번 넘겨 발급받을 수 있다(저장하지 않는다).

애플리케이션 상세 화면(등록된 호출 IP 포함)은
[`docs/naver-shopping-dev-api-registration.png`](docs/naver-shopping-dev-api-registration.png)
에 있다. 커머스 API 는 **등록된 IP 에서만** 호출할 수 있으므로, 배포 환경이 바뀌면
애플리케이션의 `API호출 IP` 를 함께 갱신해야 한다.

## 브랜드 내재화 (`/brand-integration`)

브랜드를 고를 때마다 네이버 커머스 API 를 부르던 것을 그만두기 위한 화면이다. 한 번
확정한 계층을 우리 DB 에 넣어 두고 그 뒤로는 우리 것을 읽는다.

```
brands                          브랜드                     (0002)
  └ brand_catalog_kinds         브랜드 최상위 카테고리      상의 · 하의 · 기타
      └ brand_catalog_categories  최하위 카테고리          네이버 카테고리 id
          └ brand_catalog_models  상품                    네이버 카탈로그 모델
```

최하위 카테고리는 상품링크 4단계 '걸러내기' 토글의 값과 같은 것이다
(`패션의류>여성의류>원피스`). 화면에서 걸러 남긴 것이 그대로 확정값이 된다.

### 화면

상품링크(`/products-2-link`)에서 Loox 쪽(목록 · 붙일 Loox · 붙이기 · 가격 · 이미지)을
들어내고 3 · 4단계만 남긴 모양이다.

| 줄 | 내용 |
| --- | --- |
| 1 | 토큰 발급 — 커머스 API 액세스 토큰. 메모리에만 둔다. |
| 2 | 3단계 **브랜드** — 입력칸 하나로 브랜드 → 최상위 → 최하위 카테고리를 파고든다. 먼저 내재화하기로 한 브랜드는 '먼저' 줄에 깔린다. |
| 3 | 4단계 **걸러내기** — 최하위 카테고리 토글. 3단계 드릴다운과 같은 값을 보며, **보는 것만 좁힌다.** |
| 4 | **브랜드 등록** — 그 브랜드의 상의 · 하의 · 기타를 모두 조회해 `brand_catalog_*` 에 넣는다. |

**'브랜드 등록' 은 그 브랜드의 모든 상품을 넣는다.** 상의 · 하의 · 기타를 차례로 네이버에서
조회해 분류마다 한 번씩 올린다(15~20초). 다시 누르면 분류마다 네이버의 지금 값으로
**갈아끼운다** — 이번에 없는 카테고리 · 상품은 지운다.

드릴다운도 4단계 걸러내기도 **보는 것만 좁힌다.** 잎 하나를 보고 있다가 눌러도 브랜드
전체가 들어간다 — 한 번에 잎까지 고를 수 있게 되면서, 보던 것이 곧 등록 대상이면
`티셔츠` 를 보다 누른 순간 나머지가 지워지기 때문이다.

### 드릴다운 검색

3단계의 입력칸 하나가 계층을 끝까지 좁힌다
([`components/playground/BrandDrilldownSearch.tsx`](components/playground/BrandDrilldownSearch.tsx)).

| 단계 | 조건 | 목록 |
| --- | --- | --- |
| ① | **2자 이상** | 브랜드 |
| ② | 브랜드 후보 **3개 이하** | 거기에 `브랜드명 + 최상위 카테고리` 를 덧붙인다 |
| ③ | 최상위까지 골랐다 | 그 분류의 최하위 카테고리 |
| ③′ | **내재화된 브랜드** | ② 자리에서 `상의 · 여성의류>티셔츠` 처럼 최상위+최하위를 한 줄로 |
| ④ | 최하위까지 골랐다 | 상품만 남고, 치는 글이 그 목록을 훑는다 |

고른 레벨은 **입력칸 안에 태그로** 앉고, 그 뒤를 이어 친 글이 다음 레벨을 좁힌다.
태그가 글을 먹어 버리므로 입력칸에 남는 글은 늘 **지금 레벨의 것만**이다.

```
[ 🔍  |디올…                                      ]   ① 브랜드 후보
[ 🔍  디올 ✕  |상…                                ]   ② 최상위 후보 (상의 · 하의 · 기타)
[ 🔍  디올 ✕  상의 ✕  |티…                        ]   ③ 최하위 후보 (티셔츠 · 니트 …)
[ 🔍  디올 ✕  상의 ✕  티셔츠 ✕  |린넨              ]   ④ 상품 목록을 훑는다
```

목록을 맞출 때는 `hangulMatchIndex` 라 초성 · 대소문자를 가리지 않는다. 최상위 줄은
분류 이름뿐 아니라 검색 키워드도 맞춤 대상이라 `"바지"` 로도 하의가 걸리고, 최하위 줄은
경로 전체(`패션의류>남성의류>티셔츠`)가 대상이라 `"남성의류"` 로도 좁혀진다.

아직 태그가 없을 때는 `"디올 상의"` 처럼 **한 번에 쳐도** 된다 — 브랜드명으로 안 걸리므로
뒤 낱말부터 하나씩 떼어 보며 브랜드를 집어낸다. `"ㄷㅇ 기타"` · `"dior 상"`(네이버 등록명
DIOR) 도 걸린다.

### 태그의 X — 그 레벨부터 다시

태그 끝의 **X 는 '이 레벨부터 다시 고르기'** 다. 그 아래 레벨까지 같이 물리고 글을 비운
뒤 입력칸에 커서를 돌려주므로, 바로 초성을 쳐 내려가면 된다. 글이 빈 채로 **Backspace**
를 쳐도 가장 깊은 태그부터 물린다(태그 입력칸의 관례).

| 누른 X | 남는 것 |
| --- | --- |
| 디올 ✕ | 없음 (처음부터) |
| 상의 ✕ | 브랜드 |
| 티셔츠 ✕ | 브랜드 · 최상위 |

입력칸 오른쪽 끝의 X 는 전부 비우기다.

**글도 선택도 부모(`BrandCatalogSteps`)가 든다.** 레벨을 물릴 때 글을 같이 비워야 하는데,
둘을 나눠 들면 4단계 토글처럼 드릴다운이 모르는 길로 선택이 바뀔 때 글만 남아 어긋난다
(글은 `린넨` 인데 목록은 690건으로 넓어지는 식).

### 최상위 + 최하위를 한 줄로

내재화된 브랜드는 잎 목록을 이미 들고 있으므로(`?categories=1`, 질의 한 번) 최상위 단계에서
`상의 · 여성의류>티셔츠` 같은 줄을 같이 깔아 준다. 하나 고르면 분류와 잎이 같이 정해져 바로
상품 목록까지 내려간다. 내재화 전이면 세 분류를 다 조회해야 잎을 알 수 있어(10~18초)
그 브랜드는 지금처럼 두 단계로 둔다.

잎 이름은 분류 안에서도 겹친다 — 디올의 `베스트` 는 여성 · 남성 × 아우터 · 니트 밑에 넷이다.
그래서 라벨은 경로에서 **첫 마디만 뗀다**([`shortLabel`](components/playground/CatalogFacets.tsx)).
첫 마디는 늘 `패션의류` 라 아무것도 구분해 주지 않고, 반대로 끝 두 마디만 남기면
`…>아우터>베스트` 가 둘씩 겹친다. 첫 마디만 떼면 한 브랜드 안에서 경로가 유일하므로
라벨도 유일하다(여섯 브랜드 198개 잎 전부 확인).

### 상품 검색은 보는 것만 좁힌다

최하위 태그까지 앉으면 더 고를 것이 없다. 그때부터 치는 글은 그대로 상품 검색어가 되어
아래 목록을 훑는다. 상품명도 초성 · 대소문자를 가리지 않는다(`"ㅇㅂㄹㅋ"` → 오블리크).

드릴다운 · 4단계 걸러내기와 마찬가지로 **등록 대상을 바꾸지 않는다** — 등록은 늘 브랜드
전체다. 검색 중에는 머리글이 `상품 3건 / 등록 대상 690건` 으로 둘을 같이 보여준다.

최하위 카테고리를 갈아타거나 4단계 토글을 건드리면 글은 비워진다 — 다른 카테고리를 보는데
앞 카테고리에서 치던 상품명이 남아 있으면 빈 목록처럼 보인다.

### 내재화된 것은 네이버를 부르지 않는다

최상위 카테고리를 고르면 **내재화한 것이 있는지 먼저 본다**
(`GET /api/playground/brand-catalog?naverBrandId=&kind=`).

- **있으면** 우리 DB 에서 최하위 카테고리와 상품을 통째로 받는다. 바로 뜨고 **토큰도
  필요 없다** — 드릴다운의 분류 줄에 `✓ 상품수` 가 붙은 것이 그것이다. 네이버의 지금 값을
  보고 싶으면 '네이버에서 다시 조회' 를 누른다.
- **없으면** 그때만 네이버를 부른다. 토큰이 없으면 여기서 막힌다.

네이버 조회는 키워드마다 0.55 초를 쉬어 한 분류에 3~6 초가 걸린다. 내재화의 값어치가
여기서 나온다.

### 먼저 내재화한 브랜드

디올 · 루이비통 · 룰루레몬 · 리바이스 · 랄프로렌 · 캘빈클라인.
목록은 [`lib/playground/brand-catalog.ts`](lib/playground/brand-catalog.ts) 의
`BRAND_INTEGRATION_TARGETS` 와 [`scripts/sync-brand-catalog.mjs`](scripts/sync-brand-catalog.mjs)
의 `DEFAULT_TARGETS` 두 곳에 있고 같아야 한다. 나머지 브랜드는 화면에서 하나씩 이어서 한다.

```bash
npm run sync:brand-catalog                        # 위 여섯 브랜드 × 상의 · 하의 · 기타
npm run sync:brand-catalog -- --only=디올,리바이스
npm run sync:brand-catalog -- --kinds=top,bottom
npm run sync:brand-catalog -- --dry-run           # 조회만, DB 에 쓰지 않는다
```

스크립트는 화면의 '브랜드 등록' 과 같은 일을 한다. 다른 점은 사람이 4단계에서 거를 수
없다는 것뿐이라, `res/clothing-categories.json` 의 분류에 드는 카테고리를 모두 넣는다.
화면에서 다시 등록하면 그때 걸러낸 것으로 갈아끼워진다.

브랜드 행(`brands`)은 `npm run sync:brands` 가 먼저 채워 둬야 한다 — 내재화는
`brands.naver_brand_id` 로 브랜드를 짚는다.

### 조회는 한 곳에서 한다

브랜드 × 분류 → 카탈로그 모델을 찾는 일은
[`lib/playground/catalog-search.ts`](lib/playground/catalog-search.ts) 하나에 있고,
상품링크(`ProductLinkSteps`)와 브랜드 내재화(`BrandCatalogSteps`)가 같이 부른다. 3 · 4단계의
단계 번호표 · 토글 줄도 [`components/playground/CatalogFacets.tsx`](components/playground/CatalogFacets.tsx)
에 모아 뒀다. 두 화면이 같은 단계를 보여주므로 한쪽만 고쳐져 어긋나는 일이 없게 한다.

모델 조회(`GET /v1/product-models`)는 브랜드 id · 카테고리 id 를 받지 않는다(무시된다).
그래서 "브랜드명 + 옷 키워드" 로 키워드마다 한 번씩 부르고, 섞여 든 다른 브랜드 ·
카테고리는 응답의 `brandCode` · `categoryId` 로 거른다. 429 를 피해 호출 사이에 0.55 초를
쉬므로 한 분류에 3~6 초가 걸린다 — 내재화하려는 이유가 이것이다.

## 스튜디오 ↔ FASHN 매핑

FASHN try-on 모델은 한 번에 한 벌만 처리하므로, 스튜디오는 가먼트를 **레이어 순서대로
연쇄 호출**한다. 직전 단계의 결과 이미지가 다음 단계의 모델 이미지가 된다.

| 스튜디오 슬롯 | FASHN `category` |
| --- | --- |
| 상의, 아웃터 | `tops` |
| 하의 | `bottoms` |
| 원피스, 드레스 | `one-pieces` |
| 신발·시계·목걸이·팔찌·반지·발찌·안경·가방·모자 | 미지원 — 건너뛰고 콘솔에 `warn` 로그 |

이미지가 없는 가먼트도 건너뛴다. 캐릭터 이미지가 없거나 입힐 가먼트가 하나도 없으면
데모 결과로 폴백한다(응답의 `simulated: true`).

렌더 파라미터는 스튜디오 콘솔의 CLI 로 조정한다:

```
help · seed <n> · fit <0-100> · scale <n> · mode <performance|balanced|quality> · render · clear
```

## Portrait Studio (`/mov`) 이식

`~/stmx/style-ID-movie-studio` (단독 HTML + `styles.css` + `app.js`) 를 `/mov` 로 옮겼다.
동작은 원본과 같고, 옮긴 방식은 이렇다.

| 원본 | 이식 위치 | 무엇이 바뀌었나 |
| --- | --- | --- |
| `canvas-portrait-studio/index.html` | [`app/mov/page.tsx`](app/mov/page.tsx) | 마크업을 JSX 로. `value`→`defaultValue`, SVG 속성 camelCase 외에 구조는 그대로 |
| `canvas-portrait-studio/styles.css` | [`app/mov/mov.css`](app/mov/mov.css) | 모든 규칙을 `.mov-app` 아래로 스코프. `html`/`body`/`:root` 는 페이지 루트 div 로 접고, keyframes 는 `mov-` 접두 |
| `canvas-portrait-studio/app.js` | [`lib/mov/portrait-studio.js`](lib/mov/portrait-studio.js) | 최상위 스크립트 → `initPortraitStudio(root)` 모듈. 로직·렌더 파이프라인은 손대지 않음 |
| `test/run.mjs` | [`test/mov/run.mjs`](test/mov/README.md) | 대상이 `file://` 단일 HTML → 실행 중인 서버의 `/mov` |

**상태를 React 로 옮기지 않았다.** 이 도구의 핵심 불변식은 *미리보기와 내보내기가
같은 페인터를 공유해 보이는 그대로 저장된다*는 것이고(검증 스위트의 `same` 그룹이
픽셀 차이 0 을 확인한다), 캔버스 렌더 루프와 포인터 조작을 React 상태로 쪼개면 그
보장이 깨진다. 그래서 마크업만 JSX 로 옮기고 나머지는 원본대로 DOM 을 직접 다룬다.

이식 때문에 실제로 손댄 곳은 네 군데다.

- `$(id)` 가 `document.getElementById` 대신 `root.querySelector` — 다른 페이지와 id 가 섞이지 않게.
- `--stage-w` / `--stage-h` 를 `document.documentElement` 대신 루트 div 에 심는다
  (스코프된 CSS 가 `.mov-app` 에 기본값을 정의하므로, documentElement 에 두면 덮인다).
- 언마운트 정리 — rAF 루프 · 자동저장 타이머 · `beforeunload` 를 회수한다. 같은 DOM 에
  다시 마운트돼도(StrictMode) 컨트롤이 중복 생성되지 않도록 컨테이너를 먼저 비운다.
- 검증 스위트가 페이지 스코프에서 `state.bg = …` 처럼 내부를 직접 만지므로, 모듈 끝에서
  `state` · `paintBg` 등을 `window` 에 노출한다(정리할 때 되돌린다).

원본에 있던 `build.sh`(분리 버전 → 단일 HTML 인라인)는 이식하지 않았다. 대신 검증
스위트의 `build` 그룹을 `markup` 그룹으로 바꿔, 모듈이 찾는 108개 id 가 JSX 에 다
있는지 확인한다.

> 알려진 실패: `bg` 그룹의 `디지털 레인` 한 항목(이음매 1.33). 원본에서도 **같은 수치로
> 실패**하는 기존 문제이며 이식 때문이 아니다. 나머지 92개는 통과.

## FASHN 데모 이식하면서 바뀐 부분

원본 저장소는 `src/app/**` 구조에 Next 15 기준이라, 이 프로젝트 규약(`@/*` → 루트)에
맞춰 옮기고 다음을 조정했다.

- 파일 배치: `src/app/page.tsx` → `app/tryon/page.tsx`,
  `src/app/components/**` → `components/tryon/**`, `src/app/lib/utils.ts` → `lib/utils.ts`.
- `fashn` SDK 를 최신 `^0.15.0` 으로 올림. `model_name` 이 리터럴 유니온으로 좁혀져
  런타임 모델 선택(v1.5 / v1.6 / staging)을 위해 `Fashn.PredictionRunParams` 로 캐스팅.
- `next.config` 의 `images.domains` 는 Next 16 에서 제거되어 `remotePatterns` 로 변환.
- Geist 폰트와 색상은 `.fashn-app` 스코프에만 적용해 스튜디오의 세리프 타이포그래피와
  분리(`app/globals.css` 하단, `app/tryon/layout.tsx`).
- React 19 / Next 16 린트 규칙에 맞춰 두 곳을 수정:
  - API 키 로딩 — 이펙트 내 `setState` 대신 `useIsClient()` 파생값(`lib/use-is-client.ts`).
  - 푸터 장식 버블 — 렌더 중 `Math.random()` 대신 고정 시드 PRNG 로 모듈 로드 시 1회 생성
    (하이드레이션 불일치도 함께 해소).
- 애니메이션 variants 에 `Variants` 타입 지정(framer-motion 12 의 좁아진 `transition.type`).
- 미사용이던 `next-themes` / `theme-provider` 는 이식하지 않음.
