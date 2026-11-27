# 세부 spec: vtron 컴포넌트 블록 계층도 (`docs/components-scafolder.html`)

- 상위 문서: 1차 개요 spec `overview-components-scafolder.md` (receptioner). 이 문서는 개요가 남긴 빈칸을 vtron 코드에 맞춰 채운다.
- 기준 코드: `main` @ `d216a1d` (Next.js 16 App Router, React 19, TypeScript, Node 24).
- 파일명 철자 `scafolder`는 요청대로 고정한다.

## 0. 한 줄 요약

`scripts/components-scafolder/` 아래 생성 스크립트가 TypeScript 컴파일러 API로 `app/`·`components/`·`lib/`를 읽어 **모델 JSON**(블록·공통 여부·호출 API)을 만들고, 그 모델을 **데이터·CSS·JS가 모두 들어간 단일 HTML** `docs/components-scafolder.html`로 쓴다. 다시 만드는 명령은 `npm run docs:scafolder`다. 사람은 HTML을 직접 고치지 않는다.

## 1. 코드에서 확인한 사실 (결정의 근거)

| 사실 | 위치 | 결정에 준 영향 |
| --- | --- | --- |
| React 표면은 Next App Router 하나다. 다른 React 앱·패키지는 없다 (`package.json` 하나, `test/mov`는 테스트 하네스). | `app/`, `package.json` | 트리 1개 (§5) |
| 루트 레이아웃이 모든 페이지에 `NavBar`, `ChatAgent`를 렌더한다. | `app/layout.tsx` | 최상위 블록 = `RootLayout` |
| 하위 `layout.tsx` 8개는 metadata·폰트·`<div>` 래퍼만 있고 프로젝트 컴포넌트를 렌더하지 않는다. | `app/tryon/layout.tsx`, `app/products/layout.tsx` 등 | 컴포넌트를 렌더하지 않는 레이아웃은 블록으로 올리지 않는다 (§4) |
| 페이지 29개, `route.ts` 65개. `app/page.tsx`는 `export { default } from "./full-style-ex/page"` 재수출이다. | `app/**/page.tsx` | 재수출 페이지는 같은 블록에 라우트를 하나 더 붙인다 |
| 같은 이름의 페이지 컴포넌트가 있다 (`FullStyleIdExtractionPage`가 두 파일). | `app/full-style-ex/page.tsx`, `app/full-style-id-extraction/page.tsx` | 블록 id는 `파일#이름`, 화면에는 파일 경로도 보인다 |
| 한 파일에 여러 컴포넌트가 named export로 있다 (`components/api-mng/ui.tsx`: `Modal`, `ConfirmDialog`…, `components/contracts/FormFields.tsx`). 페이지 파일 안의 로컬 컴포넌트도 있다. | | 블록 단위는 파일이 아니라 컴포넌트 함수다 |
| 브라우저 → 서버 호출은 거의 모두 `authFetch("/api/...")`다 (`lib/auth-client.ts`). 일부는 `lib/playground/*-client.ts`, `lib/playground/brand-catalog.ts` 같은 클라이언트 모듈 함수 안에서 경로를 쓴다. 화면이 외부 HTTP·Supabase를 직접 부르지 않는다. | `lib/auth-client.ts` 머리말 | API = `app/api/**/route.ts` 라우트. lib 함수는 따라 들어간다 (§3) |
| 경로는 문자열·템플릿 리터럴·`+` 연결로 쓴다: `` `/api/vton/projects/${id}` ``, `` `/api/tryon/catalog/${kind}` ``. | `app/studio/page.tsx`, `components/tryon/ProductSearch.tsx` | 템플릿 조각은 와일드카드 세그먼트로 라우트 표에 맞춘다 (§3.3) |
| import 수만 세면 틀린다: `BackgroundSection`은 두 파일이 import하지만 `StudioCanvas`는 상수만 가져간다. | `components/StudioCanvas.tsx:6` | 공통 판정은 import가 아니라 JSX 렌더 횟수로 한다 (§2) |
| `typescript`가 이미 devDependency다. 테스트는 `node --test test/**/*.test.mjs` 관례다. | `package.json`, `test/creator-tag/` | 새 의존성 없이 TS 컴파일러 API + node:test |

## 2. 공통 판정 규칙

**블록 B는 다음 중 하나면 공통이다.**

1. **렌더 부모가 둘 이상**: B를 JSX로 렌더하는 서로 다른 블록(부모 컴포넌트)이 2개 이상이다. 같은 부모가 여러 번 렌더해도 1로 센다. 부모가 같은 파일의 다른 로컬 컴포넌트여도 각각 센다.
2. **UI 원자 위치**: B의 파일이 `components/**/ui/**` 아래이거나 파일명이 `ui.tsx`다 (예: `components/tryon/ui/button.tsx`, `components/api-mng/ui.tsx`). 사용처가 하나여도 공통이다. 이름 그대로 “공유하려고 둔 부품”이기 때문이다.

세지 않는 것: 타입·상수만 가져가는 import, JSX가 아닌 참조(값으로 넘기기), §4에서 빼는 요소.

규칙 1 덕분에 **한 블록이 두 곳에 복제되는 일은 구조적으로 없다.** 부모가 하나인 블록만 부모 안에 중첩되고, 둘 이상이면 공통 열에 한 번만 그려지고 사용처는 화살표로 가리킨다. 페이지·레이아웃 블록은 공통이 될 수 없다(라우트로 붙기 때문).

현재 코드에서 예상되는 공통 예: `api-mng/ui`의 `Modal`·`ConfirmDialog`, `contracts/FormFields`의 `Field`·`TextInput`…, `style-ex/result-cards`, `style-ex/ProductPickModal`, `playground/CatalogFacets`, `playground/Pagination`, `tryon/ui/*`. 숫자는 생성 결과가 정한다.

## 3. API 이름 형식과 귀속 규칙

### 3.1 이름 형식 (vtron 안에서 한 형식)

**API 이름 = Next 라우트 경로 패턴**. `app/api/` 아래 `route.ts`의 디렉터리 경로를 그대로 쓴다.

- 예: `/api/vton/render`, `/api/vton/projects/[id]`, `/api/admin/business-users/[id]/jobs/[jobId]/resume`
- 동적 세그먼트는 폴더 이름 그대로 `[id]`. 쿼리스트링·해시는 붙이지 않는다.
- HTTP 메서드는 `route.ts`가 export하는 `GET`/`POST`/`PUT`/`PATCH`/`DELETE`에서 읽어 **배지로만** 보인다. 복사 문자열에는 넣지 않는다. 메서드를 붙이면 저장소에서 검색되지 않기 때문이다.
- 검색 키 확인: 복사한 `/api/vton/projects/[id]`는 에디터 파일 찾기(Cmd+P)에서 `app/api/vton/projects/[id]/route.ts`에 닿고, 정적 경로(`/api/vton/render`)는 grep으로 호출처 문자열에도 닿는다. 블록에는 라우트 파일 경로(`app/api/.../route.ts`)도 함께 보이고 그것도 클릭해 복사된다.

### 3.2 무엇을 “호출”로 보나

- `/api/`로 시작하는 **문자열 리터럴, 템플릿 리터럴, `+` 연결식의 맨 앞 리터럴**. 주석은 보지 않는다(AST 기준).
- 귀속 대상 (블록 B의 API 목록):
  1. B의 함수 본문 안(중첩 콜백·이펙트 포함)에 있는 리터럴.
  2. 같은 파일의 컴포넌트가 아닌 함수(모듈 스코프 helper)에 있는 리터럴은, B 본문이 그 함수 이름을 참조하면 B에 귀속. 파일 안에서 전이적으로 따라간다.
  3. B가 **프로젝트 내부 모듈**(`@/…` 또는 상대경로, `.ts`/`.tsx`)에서 import한 **값 식별자**를 본문에서 참조하면, 그 export 함수(또는 hook) 본문과 그 함수가 다시 부르는 프로젝트 함수까지 따라가 리터럴을 모은다. 깊이 최대 4, 순환 방지.
  4. **전송 함수는 따라가지 않는다**: `lib/auth-client.ts`의 `authFetch`, `getAccessToken`, `setAccessToken`. 이 함수 내부의 `/api/auth/session` 같은 리터럴이 모든 블록에 퍼지는 것을 막는다. (`login`, `logout`은 따라간다 — `LoginPage`에 `/api/auth/login`이 붙어야 한다.) 목록은 설정 파일에 둔다(§6).
- 서버 쪽(`app/api/**`)이 다시 부르는 외부 HTTP·Supabase·RPC는 이 문서 범위가 아니다(§9).

### 3.3 리터럴 → 라우트 맞추기

1. 리터럴을 정규화한다: `?`·`#` 뒤를 버린다. 템플릿의 `${…}`와 `+` 뒤의 비리터럴은 **와일드카드 세그먼트**로 바꾼다. 끝의 `/` 뒤에 비리터럴이 오면 그 자리가 와일드카드다. 한 세그먼트 안에 `${…}`가 섞여도 그 세그먼트 전체가 와일드카드다.
2. `/`로 나눈 세그먼트 수가 같은 라우트와 비교한다. 리터럴 세그먼트는 같은 정적 세그먼트나 `[param]`에 맞는다. 와일드카드는 어떤 세그먼트에도 맞는다.
3. 와일드카드가 없는 리터럴은 Next 우선순위대로 **정적 세그먼트가 더 많은 라우트 하나**만 고른다. 와일드카드가 있으면 **맞는 라우트 모두**를 넣는다 (예: `` `/api/tryon/catalog/${kind}` `` → `brands`, `categories`, `products` 셋).
4. 맞는 라우트가 없으면 **미해결**로 모아 HTML 전체 API 목록 아래 “미해결 호출” 칸에 원문·파일·블록과 함께 보인다. 생성 스크립트는 경고만 찍고 실패하지 않는다.

### 3.4 프로젝트 전체 API 목록

`app/api/**/route.ts` 전부(현재 65개). 항목마다: 이름(복사), 메서드 배지, 라우트 파일 경로(복사), **사용 블록** 목록(클릭 시 그 블록으로 이동). 화면에서 부르지 않는 라우트(예: `/api/v1/*`, `/api/internal/*`)도 빠짐없이 나오고 “화면 호출 없음”으로 표시한다. 정렬은 이름 오름차순.

## 4. 블록으로 올리지 않을 요소

블록은 **이름이 있는 프로젝트 React 컴포넌트**만이다. 다음은 블록이 아니다.

1. 내장 HTML 요소 (`div`, `button`, `input`, `ul`…). 이름 없는 `<button>`은 검색 키가 없다. 이런 버튼은 그것을 품은 컴포넌트 블록이 대표한다.
2. 외부 패키지 컴포넌트: `lucide-react` 아이콘, `framer-motion`(`motion.*`, `AnimatePresence`), `next/image`, `next/link`, `next/font`, `react-compare-slider` 등 `node_modules`에서 온 모든 것.
3. 멤버식 태그(`<link.icon />`, `<motion.div />`)와 변수·prop으로 받은 컴포넌트(`<Icon />`가 프로젝트 컴포넌트로 해석되지 않을 때).
4. `<>…</>`/`Fragment`, Context `Provider`.
5. 프로젝트 컴포넌트를 하나도 렌더하지 않는 `layout.tsx` (래퍼 `<div>`·metadata·폰트만). 이때 그 아래 페이지는 위쪽 레이아웃 블록에 바로 붙는다. 현재는 `RootLayout`만 블록이 된다.
6. 컴포넌트가 아닌 export: 상수(`PRIMARY_BTN`, `AXIS_ORDER`), 타입, hook(`useIsClient`), 유틸. hook·유틸 안의 API 호출은 §3.2 규칙 3으로 쓰는 블록에 귀속된다.
7. 범위 밖 디렉터리: `app/api/**`(서버), `scripts/`, `test/`, `services/`(Python), `supabase/`, `res/`, `_ds/`, `_template/`, 루트·`docs/`의 `*.html` 문서, `graphify-out/`, `lib/style-ex/scoring/**`(별도 엔진 코드), `node_modules/`, `.next/`.

**컴포넌트로 인정하는 정의**: 이름이 대문자로 시작하고 JSX를 반환하는 함수 선언, `const X = (…) => …`/`function` 식, `memo(…)`·`forwardRef(…)`로 감싼 것. `export default function()`처럼 이름이 없으면 블록 이름은 파일 경로(`app/x/page.tsx`)다 — 그 문자열로 파일을 찾을 수 있다.

**JSX 사용 판정**: 태그 식별자가 (a) 같은 파일의 컴포넌트이거나 (b) 프로젝트 내부 모듈에서 import한 컴포넌트로 해석될 때만 자식이다. 조건부 렌더(모달 `open && <X/>`)도 자식으로 센다. 자식 순서는 소스에서 처음 나타나는 순서. 컴포넌트가 자기 자신을 렌더하는 재귀(트리 노드 등)는 자식 관계로 넣지 않는다(자기 참조 간선 제거). 서로를 렌더하는 순환은 그대로 두되, 렌더러는 비공통 자식만 중첩하므로 끝없이 펼쳐지지 않는다.

## 5. React 표면(트리) 개수

**1개.** 표면 id `app`, 이름 “vtron 웹 (Next App Router)”. 새 표면을 만들지 않는다.

트리 모양:

```
RootLayout (app/layout.tsx)
├─ NavBar                     ← JSX 자식
├─ ChatAgent                  ← JSX 자식
├─ [route /studio]  StudioPage (app/studio/page.tsx)   ← 라우트 자식
│    ├─ StudioHeader
│    ├─ BackgroundSection …
│    └─ ⟶ (공통) ProjectHistoryModal  …화살표
├─ [route /, /full-style-ex]  FullStyleIdExtractionPage (app/full-style-ex/page.tsx)
└─ …
```

- 페이지는 라우트 경로 오름차순. 페이지 블록은 라우트 경로 배열(`routes`)과 `components/nav-links.ts`의 `NAV_LINKS` 레이블(있으면)을 함께 보인다. 레이블은 표시만, 복사 대상은 컴포넌트 이름.
- 재수출 페이지(`app/page.tsx`)는 새 블록을 만들지 않고 대상 블록의 `routes`에 `/`를 더한다.
- 라우트 경로는 `app/` 아래 디렉터리 경로에서 route group `(x)`를 지우고 만든다.

## 6. 생성 스크립트

| 항목 | 값 |
| --- | --- |
| 위치 | `scripts/components-scafolder/` |
| 진입점 | `scripts/components-scafolder/generate.mjs` |
| 명령 | `npm run docs:scafolder` (= `node scripts/components-scafolder/generate.mjs`) |
| 최신 여부 검사 | `npm run docs:scafolder:check` (= `… generate.mjs --check`): 메모리에서 다시 만들어 커밋된 HTML과 바이트 비교, 다르면 exit 1 |
| 모델만 보기 | `node scripts/components-scafolder/generate.mjs --json` → 모델 JSON을 stdout |
| 출력 | `docs/components-scafolder.html` (저장소에 커밋) |
| 의존성 | `typescript`(기존 devDependency)만. 새 패키지 없음. 실행 전 `npm ci` |
| 테스트 | `node --test test/components-scafolder/` |

파일 구성:

- `config.mjs` — 규칙 상수: 스캔 루트(`app`, `components`, `lib`), 제외 glob(§4-7), 전송 함수 목록(§3.2-4), UI 원자 경로 규칙(§2-2), 표면 정의(§5), 출력 경로.
- `analyze.mjs` — `analyze({ root, config }) → Model`. 소스 → 모델. 순수 함수(파일 읽기만).
- `render.mjs` — `render(model) → string`. 모델 → HTML 문자열. 읽는 파일은 같은 폴더의 `client/` 원본뿐이고 네트워크 접근은 없다.
- `client/` — HTML에 인라인되는 원본: `logic.js`(DOM 없는 순수 함수 — 검색 일치, 조상 계산, 해시 파싱; `globalThis.ScafLogic`에 붙인다), `app.js`(DOM·복사·화살표), `app.css`. `render`가 읽어 `<script>`/`<style>`로 넣는다. 모델 JSON을 넣을 때 `<`는 `\u003c`로 바꿔 `</script>` 깨짐을 막는다.
- `generate.mjs` — CLI. analyze → render → 쓰기 / `--check` / `--json`.

**결정성**: 같은 소스면 같은 바이트. 모든 목록은 정해진 순서로 정렬하고, 시각·커밋 해시·절대경로를 넣지 않는다(그래야 `--check`가 의미 있다). HTML 머리에 “생성 파일 — 직접 고치지 말 것, `npm run docs:scafolder`로 다시 만든다” 주석을 넣는다.

**운영**: 컴포넌트·라우트를 옮긴 PR은 `npm run docs:scafolder` 결과를 함께 커밋한다. 틀린 블록은 HTML이 아니라 `config.mjs`나 분석 규칙을 고친 뒤 다시 만든다.

### 6.1 모델 JSON (analyze ↔ render 계약)

```jsonc
{
  "version": 1,
  "project": "vtron",
  "surfaces": [{ "id": "app", "label": "vtron 웹 (Next App Router)", "root": "app/layout.tsx#RootLayout" }],
  "blocks": {
    "app/studio/page.tsx#StudioPage": {
      "id": "app/studio/page.tsx#StudioPage",   // 파일#이름, 유일
      "name": "StudioPage",                     // 복사 문자열
      "file": "app/studio/page.tsx",            // 저장소 상대경로, '/' 구분
      "kind": "page",                           // "layout" | "page" | "component"
      "routes": ["/studio"],                    // page만, 나머지는 []
      "label": "스튜디오",                       // NAV_LINKS 레이블 또는 null
      "common": false,
      "commonReason": null,                     // "multi-parent" | "ui-dir" | null
      "children": [                             // 소스 순서, ref 중복 없음
        { "ref": "components/StudioHeader.tsx#StudioHeader", "via": "jsx" }
      ],                                        // via: "jsx" | "route"
      "apis": ["/api/vton/projects", "/api/vton/projects/[id]"],  // 이름 오름차순, 중복 없음
      "usedBy": ["app/layout.tsx#RootLayout"]   // 부모 블록 id 오름차순
    }
  },
  "apis": {
    "/api/vton/projects/[id]": {
      "name": "/api/vton/projects/[id]",
      "file": "app/api/vton/projects/[id]/route.ts",
      "methods": ["DELETE", "GET"],             // 오름차순
      "usedBy": ["app/studio/page.tsx#StudioPage"]
    }
  },
  "unresolved": [{ "raw": "/api/x/${y}", "file": "components/A.tsx", "block": "components/A.tsx#A" }]
}
```

불변식(테스트로 검증): 모든 `children[].ref`·`usedBy`·`apis[].usedBy`는 존재하는 블록 id다. `common: false`이고 `kind: "component"`인 블록은 `usedBy`가 정확히 1개다. 블록의 `apis` 항목은 모두 최상위 `apis`의 키다. `apis[x].usedBy`는 블록 `apis`의 역색인과 같다. 루트에서 도달할 수 없는 블록(어디서도 렌더되지 않는 컴포넌트)은 모델에 넣지 않는다.

## 7. HTML 화면

### 7.1 구성

```
┌ 헤더: 제목 · 검색칸 · [모두 펼치기][모두 접기] · 통계(블록 n, 공통 n, API n) ┐
├ 왼쪽 사이드바: 라우트 색인 (경로 + 레이블)                                   │
├ 가운데: 표면 트리 (RootLayout → 페이지 → 블록 중첩)                           │
├ 오른쪽: 공통 블록 열 (디렉터리별 묶음)                                        │
│   (SVG 화살표: 가운데의 참조 칩 → 오른쪽 공통 블록 머리)                       │
└ 아래: 프로젝트 전체 API 목록 · 미해결 호출                                    ┘
```

### 7.2 블록 카드

```
┌───────────────────────────────────────────────┐
│ ▸  StudioPage  [page] /studio · 스튜디오        │  ← ▸ = 접기 버튼, 이름 = 복사
│    app/studio/page.tsx                         │  ← 파일 경로 = 복사
│ 하위 블록: StudioHeader · BackgroundSection · ⟶ProjectHistoryModal │
│ API: /api/vton/projects · /api/vton/render · …  │
│ └ (펼치면) 비공통 자식 블록 카드가 중첩, 공통 자식은 참조 칩(⟶) │
└───────────────────────────────────────────────┘
```

- 세 칸(이름, 하위 블록, API)은 늘 있다. 비면 `하위 블록: (없음)`, `API: (없음)`으로 보인다.
- 공통 블록 카드에는 추가로 “사용처” 목록(부모 블록 이름)이 있다.
- 페이지 블록의 API 칸은 그 페이지 컴포넌트 자기 범위만 담는다. 자식들의 API는 각 자식 블록에 있다.

### 7.3 클릭과 복사

- 복사 대상은 `<button class="copy" data-copy="…">`. 보이는 글자 = `data-copy` 값. 대상: 블록 이름, 하위 블록 항목, API 항목, 파일 경로, 전체 API 목록의 이름·파일, 라우트 색인의 경로.
- `navigator.clipboard.writeText`를 먼저 쓰고, 실패하면(`file://`에서 막힐 때) 숨긴 `textarea` + `document.execCommand("copy")`로 대신한다.
- 복사하면 오른쪽 아래에 `복사됨: <값>` 토스트를 1.2초 보인다.
- 카드 빈 곳 클릭은 아무것도 하지 않는다. 접기는 `▸/▾` 버튼만. 이동은 별도 `↗` 아이콘 버튼만. 복사 버튼과 이동·접기 버튼은 다른 요소다.

### 7.4 검색과 접기

- 검색칸은 블록 이름, 파일 경로, API 이름에 대해 대소문자 무시 부분일치. 맞는 블록과 그 조상만 남기고 나머지를 숨기며, 조상은 자동으로 펼친다. 맞는 글자를 강조한다. 공통 열과 전체 API 목록도 같은 질의로 거른다. `/` 키로 검색칸 포커스, `Esc`로 비우기.
- 처음 열 때: `RootLayout`과 페이지 블록 카드까지 보이고, 페이지 안의 중첩 자식은 접혀 있다. 블록이 많아 한 화면을 넘기 때문이다.

### 7.5 검색·접기 외 탐색

1. **라우트 색인**: 사이드바의 라우트를 누르면 그 페이지 블록으로 스크롤·펼침·잠깐 강조.
2. **참조 칩 이동**: 참조 칩(⟶이름)의 `↗`를 누르면 공통 블록으로 이동.
3. **사용처 역이동**: 공통 블록의 사용처 항목 `↗` → 그 부모 블록의 참조 칩으로 이동(필요하면 조상 펼침).
4. **API 사용 블록 이동**: 전체 API 목록의 사용 블록 `↗` → 그 블록으로 이동.
5. **화살표 강조**: 화살표는 평소 옅게, 참조 칩이나 공통 블록에 마우스를 올리면 그 블록에 연결된 화살표만 진하게.
6. **딥링크**: URL 해시 `#b=<블록 id>`로 열면 그 블록으로 이동. 이동할 때마다 해시를 갱신해 링크를 공유할 수 있다.

### 7.6 화살표

- 화면에 보이는(접히지 않고 걸러지지 않은) 참조 칩마다 SVG 곡선 하나: 칩 오른쪽 끝 → 공통 블록 머리 왼쪽 끝. 공통 블록이 다른 공통 블록을 쓰면 공통 열 안에서도 같은 규칙.
- SVG는 트리·공통 열을 함께 담은 스크롤 컨테이너 안에 절대배치해 스크롤 때 다시 그리지 않는다. 접기·검색·창 크기 변경 때 다시 그린다.

### 7.7 오프라인

외부 URL(CDN, 웹폰트, 이미지)을 하나도 넣지 않는다. 데이터는 `<script type="application/json" id="model">`, 동작은 인라인 `<script>`, 스타일은 인라인 `<style>`. 시스템 폰트 스택. `file://`로 열어 동작해야 한다.

## 8. 완료 기준 (개요 §4를 vtron 값으로)

1. `docs/components-scafolder.html`이 있고, 네트워크·빌드 없이 `file://`로 열린다. HTML 안에 `http://`·`https://` 리소스 참조가 없다.
2. 29개 페이지 라우트가 모두 블록(또는 재수출로 붙은 라우트)으로 있고, 각 페이지에서 그 안의 컴포넌트 블록까지 부모-자식으로 따라갈 수 있다.
3. 공통 블록(§2)은 HTML에 카드가 한 번만 있고 사용처마다 참조 칩 + 화살표가 있다.
4. 모든 블록 카드에 이름·하위 블록·API 세 칸이 있고, 빈 칸은 `(없음)`.
5. 이름·하위 블록 항목·API 항목 클릭 시 클립보드에 그 문자열만 들어간다. 복사한 컴포넌트 이름은 `grep -rn "<이름>" app components`로 정의에 닿고, API 이름은 §3.1대로 라우트 파일에 닿는다.
6. 전체 API 목록에 `route.ts` 65개(생성 시점 개수)가 모두 있고 항목 클릭 시 같은 복사.
7. 블록 이름 검색이 된다.
8. `npm run docs:scafolder`로 다시 만들 수 있고, `npm run docs:scafolder:check`가 커밋된 파일에 대해 통과한다.
9. 범위 밖이 이 문서 §9에 있다.

## 9. 범위 밖

- 코드 편집, Storybook 대체, 런타임 props·상태 검사, 디자인 토큰 관리.
- 서버 라우트가 다시 부르는 외부 HTTP(FASHN, Naver, Anthropic, stmx-web)·Supabase 테이블·RPC의 지도.
- 이름 없는 내장 요소(`<button>` 문구 등)의 블록화. 문구 수정 요청은 그 문구를 품은 컴포넌트 블록으로 들어간다.
- `stmx-web` 쪽 HTML (그쪽 agent가 따로 만든다).
- CI 연결. `--check`는 만들지만 CI·pre-commit에 거는 것은 별도 결정.

## 10. 설계 과정에서 고른 길 (Approaches)

| 길 | 장점 | 단점 | 결론 |
| --- | --- | --- | --- |
| A. TS 컴파일러 API로 AST 분석 → 모델 JSON → 단일 HTML 렌더 | 주석·문자열 구분, 로컬 컴포넌트·named export·lib 함수 추적이 정확. 새 의존성 없음 | 분석 코드가 정규식보다 길다 | **채택** |
| B. 정규식 grep 기반 | 짧다 | `BackgroundSection` 같은 import 오판, 주석 속 `/api/…`, 로컬 컴포넌트 귀속 불가 | 기각: 복사 이름이 틀리면 도구 목적이 깨진다 |
| C. react-scanner 등 외부 도구 + 후처리 | 추출 일부 재사용 | 새 의존성, API 귀속·계층은 어차피 직접 구현 | 기각 |
| D. 런타임(React DevTools 훅) 수집 | 실제 렌더 트리 | 앱 실행·로그인 필요, 조건부 모달 누락 | 기각: 개요가 “빌드·서버 없이” |

모델 JSON을 사이에 둔 이유: 분석(U1)과 화면(U2)을 서로 기다리지 않고 따로 만들고 따로 테스트하기 위해서다.
