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

| API | 설명 |
| --- | --- |
| `POST /api/tryon` | 원본 앱의 try-on 엔드포인트. `run` 후 완료까지 폴링(최대 3분). |
| `POST /api/vton/render` | 스튜디오 렌더. 가먼트를 레이어 순서로 한 벌씩 입히고 결과를 Supabase Storage 에 보관한다. |
| `POST /api/vton/upload` | 이미지 → Supabase Storage 업로드. |
| `GET/POST /api/vton/projects`, `GET/DELETE /api/vton/projects/[id]` | 세션(프로젝트) CRUD. |

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

### 환경 변수

`.env.example` 을 `.env.local` 로 복사한 뒤 채운다.

- `FASHN_API_KEY` — [app.fashn.ai](https://app.fashn.ai) → Settings → API 에서 발급.
  - 비어 있으면 `/tryon` 은 브라우저에 저장된 사용자 키(모달 입력)를 요구하고,
    스튜디오 렌더는 데모(시뮬레이션) 결과로 폴백한다.
- `FASHN_ENDPOINT_URL` — 기본 `https://api.fashn.ai`. 자체 엔드포인트를 쓸 때만 지정.
- `SUPABASE_SERVICE_ROLE_KEY` — 업로드/결과 보관/세션 저장에 필요.
  없으면 anon 키로 폴백하며 RLS 때문에 Storage·DB 쓰기가 실패한다
  (렌더는 계속 동작하고 FASHN CDN URL 을 그대로 반환한다).

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
  `/api/vton/projects`(GET·POST), `/api/vton/projects/[id]`(GET·DELETE).
  `/api/auth/*` 만 공개.

### 페이지 가드

[`proxy.ts`](proxy.ts) 가 `/login` 을 제외한 **모든 페이지**를 가로채 유효한 세션이
없으면 `/login` 으로 리다이렉트한다. 이미 로그인한 사용자가 `/login` 에 오면 `/` 로
되돌린다.

- 세션 검증은 `getUser()`. `getSession()` 은 쿠키를 그대로 신뢰하므로 가드에 쓰지 않는다.
- 원래 가려던 경로는 `?next=` 로 넘겨 로그인 후 복귀한다.
  같은 오리진 경로만 허용해 오픈 리다이렉트를 막는다.
- Supabase 환경 변수가 없으면 통과시키지 않고(fail closed) `/login?error=config` 로 보낸다.
- 로그아웃은 스튜디오 헤더 우측 버튼.
- Next 16 에서 `middleware.ts` 는 deprecated 이므로 `proxy.ts` 규약을 쓴다.
- `/api/*` 는 프록시 매처에서 제외한다 — API 에 리다이렉트를 돌려주면 fetch 가 HTML 을
  따라가 깨지므로, 각 라우트가 위의 Bearer 검증으로 401 을 반환한다.

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
