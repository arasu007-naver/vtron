# vtron 컴포넌트 블록 계층도 구현 계획

> **에이전트 작업자에게:** 이 계획은 구현 단위(U1–U3)로 나뉜다. 단위마다 `main`에서 새 worktree를 만들고, 그 안의 태스크를 체크박스(`- [ ]`) 순서대로 TDD로 진행한다. 권장 보조 스킬: superpowers:executing-plans.

**Goal:** 소스를 읽어 `docs/components-scafolder.html`(오프라인 단일 HTML 블록 계층도)을 다시 쓰는 생성 스크립트를 만든다.

**Architecture:** `analyze`(TS 컴파일러 API, 소스 → 모델 JSON)와 `render`(모델 JSON → 단일 HTML)를 **모델 JSON 계약**(SPEC §6.1)으로 분리한다. 둘은 서로의 코드 없이 각자의 픽스처로 테스트한다. `generate.mjs`가 둘을 잇고 실제 vtron에 대해 HTML을 만든다.

**Tech Stack:** Node 24 ESM(`.mjs`), `typescript`(기존 devDependency, 컴파일러 API), `node:test` + `node:assert/strict`, `node:vm`(클라이언트 순수 함수 테스트). 새 패키지 없음.

**Spec:** `docs/components-scafolder/SPEC.md` — 모든 단위는 시작 전에 이 문서를 끝까지 읽는다. 규칙의 근거와 값은 SPEC에 있고 이 계획은 반복하지 않는다.

## 시작 방법 (모든 단위 공통)

1. `main`에서 worktree를 만든다: 브랜치 이름 `components-scafolder/U<n>-<짧은이름>`.
2. SPEC·PLAN이 아직 `main`에 없으면 계획 브랜치 `arasu007-naver/components-scafolder-plan`의 문서 커밋을 가져온다: `git fetch origin && git cherry-pick <문서 커밋>` (`git log origin/arasu007-naver/components-scafolder-plan -- docs/components-scafolder` 로 찾는다). U1·U2가 같은 커밋을 cherry-pick해도 내용이 같아 병합 충돌이 없다.
3. `npm ci` (TypeScript 컴파일러 API가 필요하다).
4. 단위의 테스트 명령이 통과하고 완료 기준을 채우면 브랜치를 push하고 PR을 연다.

## 구현 단위 개요

| id | 목표 | 건드리는 파일 | depends-on | 병렬 |
| --- | --- | --- | --- | --- |
| U1 | 분석기: 소스 → 모델 JSON | `scripts/components-scafolder/{config,analyze}.mjs`, `test/components-scafolder/analyze.test.mjs`, `test/components-scafolder/fixtures/mini-app/**` | 없음 | U2와 병렬 |
| U2 | 렌더러: 모델 JSON → 단일 HTML | `scripts/components-scafolder/render.mjs`, `scripts/components-scafolder/client/{logic.js,app.js,app.css}`, `test/components-scafolder/{render,logic}.test.mjs`, `test/components-scafolder/fixtures/model.json` | 없음 | U1과 병렬 |
| U3 | 통합: CLI, npm 스크립트, 실제 HTML 생성·검증 | `scripts/components-scafolder/generate.mjs`, `package.json`(scripts 2줄), `docs/components-scafolder.html`, `test/components-scafolder/generate.test.mjs`, 필요 시 `config.mjs`·`analyze.mjs`·`render.mjs` 수정 | U1, U2 | 단독 (U1·U2 병합 후) |

U1과 U2는 같은 파일을 하나도 건드리지 않는다. 같은 디렉터리(`scripts/components-scafolder/`, `test/components-scafolder/`)에 서로 다른 파일을 더할 뿐이다.

## Global Constraints

- 출력 경로 `docs/components-scafolder.html`, 철자 `scafolder` 고정.
- 새 npm 의존성 금지. `typescript`, Node 내장 모듈만.
- 블록 id `<파일 상대경로>#<컴포넌트 이름>`, 파일 경로 구분자는 `/`.
- API 이름은 Next 라우트 패턴(`/api/vton/projects/[id]`). 메서드는 복사 문자열에 넣지 않는다.
- 생성 결과는 결정적: 시각·커밋 해시·절대경로를 HTML·모델에 넣지 않는다. 모든 배열은 SPEC §6.1에 적힌 순서.
- HTML에 외부 리소스(`http://`, `https://`로 시작하는 `src`/`href`/`url(`) 없음.
- 전송 함수 `authFetch`, `getAccessToken`, `setAccessToken`(`lib/auth-client.ts`)은 따라가지 않는다. `login`, `logout`은 따라간다.
- UI 문구는 한국어(SPEC §7의 문구 그대로: `하위 블록`, `API`, `사용처`, `(없음)`, `복사됨: `, `화면 호출 없음`, `미해결 호출`).

## Review Focus

1. **자기 재귀·상호 재귀 컴포넌트**(트리 노드가 자기를 렌더, A↔B): 분석은 자기 간선을 버리고, 렌더러는 끝없이 중첩하지 않아야 한다. → U1 `self-recursion`, U2 `cycle-safe` 테스트.
2. **`</script>`·`<`가 들어간 이름/경로**가 모델 JSON 인라인을 깨뜨리는 경우: 페이지가 그대로 떠야 한다. → U2 `escapes-script-close` 테스트.
3. **정규식 특수문자가 든 검색어**(`[id]`, `(`, `.`): 부분일치로 동작하고 예외가 없어야 한다. → U2 `logic: search-literal` 테스트.
4. **`file://`에서 `navigator.clipboard`가 거부될 때**: 대체 경로로 복사되어야 한다. → U2 수동 확인 단계 + `logic`에 분기 없음, `app.js`의 `copyText` 대체 경로 필수.
5. **같은 이름 컴포넌트가 두 파일에** 있을 때(`FullStyleIdExtractionPage`): 서로 다른 블록, 화면에 파일 경로로 구분. → U1 `duplicate-names`, U3 실코드 검증.

---

## U1 — 분석기

**목표:** `analyze({ root, config }) → Model`. SPEC §2–§5, §6.1의 규칙과 불변식을 만족하는 모델을 만든다.

**Files:**
- Create: `scripts/components-scafolder/config.mjs`
- Create: `scripts/components-scafolder/analyze.mjs`
- Create: `test/components-scafolder/fixtures/mini-app/**` (아래 픽스처)
- Test: `test/components-scafolder/analyze.test.mjs`

**Interfaces:**
- Produces: `config.mjs`의 `export default` 객체

  ```js
  {
    project: "vtron",
    scanRoots: ["app", "components", "lib"],
    exclude: ["app/api/**", "lib/style-ex/scoring/**", "**/*.test.*", "**/node_modules/**"],
    pathAlias: { "@/": "" },                 // "@/x" → "<root>/x"
    transport: { "lib/auth-client.ts": ["authFetch", "getAccessToken", "setAccessToken"] },
    isUiDir: (file) => /(^|\/)ui\//.test(file) && file.startsWith("components/") || /(^|\/)ui\.tsx$/.test(file),
    surface: { id: "app", label: "vtron 웹 (Next App Router)", rootLayout: "app/layout.tsx" },
    navLinksFile: "components/nav-links.ts",
    apiRoot: "app/api",
    outFile: "docs/components-scafolder.html",
  }
  ```
- Produces: `analyze.mjs`의 `export function analyze({ root: string, config: object }): Model` (동기). `Model`은 SPEC §6.1 모양 그대로. `export function matchRoute(literal: {segments: (string|null)[]}, routes: string[]): string[]`(null = 와일드카드)도 export해 단위 테스트한다.

### 픽스처 `test/components-scafolder/fixtures/mini-app/`

각 파일은 아래 경우 하나씩을 만든다(최소 코드). 테스트는 `config`를 복사해 `{ ...config, navLinksFile: "components/nav-links.ts" }`처럼 이 루트를 가리키게 한다.

| 파일 | 담는 경우 |
| --- | --- |
| `app/layout.tsx` | `RootLayout`이 `NavBar`와 `{children}` 렌더 |
| `app/a/layout.tsx` | `<div>{children}</div>`만 → 블록 아님 |
| `app/a/page.tsx` | `APage`: 로컬 `Row`, import `Shared`, `Button`(ui), lucide `<Plus/>`, `<motion.div/>`, `<>…</>`, 주석 속 `/api/ghost`, `` authFetch(`/api/items/${id}`) ``, `"/api/items/" + id`, 모듈 helper `loadAll()` 안의 `"/api/items"`, `import { fetchThings } from "@/lib/things-client"` 호출 |
| `app/b/page.tsx` | `BPage`: `Shared` 렌더, `` `/api/cat/${kind}` ``, `"/api/nowhere"`(미해결), `import { CONST } from "@/components/Solo"`(상수만) |
| `app/c/page.tsx` | `export default function () {…}` (익명) → 이름 = `app/c/page.tsx` |
| `app/d/page.tsx` | 이름이 `APage`인 다른 컴포넌트(중복 이름) |
| `app/page.tsx` | `export { default } from "./a/page"` |
| `app/login/page.tsx` | `login()` 호출 (`@/lib/auth-client`) |
| `components/NavBar.tsx` | `NavBar` |
| `components/Shared.tsx` | `Shared` (부모 2개 → 공통) |
| `components/Solo.tsx` | `Solo` 컴포넌트 + `export const CONST` (렌더되지 않음 → 모델에 없음) |
| `components/Tree.tsx` | `Tree`가 자기 자신 `<Tree/>` 렌더, `APage`가 `Tree` 렌더 |
| `components/x/ui/button.tsx` | `export default function Button` (부모 1 → 공통, `ui-dir`) |
| `components/nav-links.ts` | `NAV_LINKS = [{ href: "/a", label: "에이" }]` |
| `lib/auth-client.ts` | `authFetch`(본문에 `"/api/auth/session"`), `login`(본문에 `"/api/auth/login"`) |
| `lib/things-client.ts` | `fetchThings` → 내부 `helper()` → `"/api/things"` (전이) |
| `app/api/items/route.ts` | `export async function GET`, `export const POST = …` |
| `app/api/items/[id]/route.ts` | `GET`, `DELETE` |
| `app/api/cat/brands/route.ts`, `app/api/cat/products/route.ts`, `app/api/things/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/session/route.ts`, `app/api/unused/route.ts` | `GET` |

### Task U1-1: 라우트 표와 리터럴 맞추기

- [ ] **테스트 작성** (`analyze.test.mjs`):
  - `matchRoute`: `["api","items",null]` → `["/api/items/[id]"]`; `["api","cat",null]` → `["/api/cat/brands","/api/cat/products"]`(정렬); `["api","items"]` → `["/api/items"]`; `["api","nowhere"]` → `[]`; 정적 우선: 라우트 `/api/x/new`, `/api/x/[id]`가 있을 때 `["api","x","new"]` → `["/api/x/new"]`.
  - `apis`: `Object.keys(model.apis)`가 픽스처 라우트 8개를 오름차순으로 담고, `model.apis["/api/items"].methods` = `["GET","POST"]`, `model.apis["/api/items/[id]"].file` = `"app/api/items/[id]/route.ts"`.
- [ ] `node --test test/components-scafolder/analyze.test.mjs` → FAIL 확인.
- [ ] `analyze.mjs`에 라우트 수집(`apiRoot` 아래 `route.ts` 탐색, export된 메서드 이름: 함수 선언과 `export const`)과 `matchRoute` 구현. 리터럴 정규화는 SPEC §3.3 규칙 1.
- [ ] 테스트 PASS 확인, 커밋 `components-scafolder: 라우트 표와 API 리터럴 매칭`.

### Task U1-2: 컴포넌트·JSX 자식·트리

- [ ] **테스트 작성** (블록 id는 SPEC 형식):
  - `model.surfaces[0].root === "app/layout.tsx#RootLayout"`.
  - `RootLayout.children`에 `{ref:"components/NavBar.tsx#NavBar", via:"jsx"}`가 먼저, 그 뒤 `via:"route"` 페이지들(라우트 오름차순). `app/a/layout.tsx`의 블록 없음.
  - `app/a/page.tsx#APage`의 `routes` = `["/", "/a"]`, `label` = `"에이"`; `app/page.tsx`로 된 블록 없음.
  - `APage.children` ref 집합 = `Row`, `Shared`, `Button`, `Tree` (lucide·motion·Fragment 없음), 소스 순서.
  - `app/c/page.tsx#app/c/page.tsx`의 `name === "app/c/page.tsx"`.
  - `duplicate-names`: `app/a/page.tsx#APage`와 `app/d/page.tsx#APage`가 둘 다 있다.
  - `self-recursion`: `Tree.children`에 자기 자신 없음.
  - `Solo` 블록 없음(상수 import·미렌더).
- [ ] FAIL 확인.
- [ ] 구현: `ts.createProgram`(또는 파일별 `ts.createSourceFile`)으로 `.ts/.tsx` 파싱, 컴포넌트 정의 판정(SPEC §4 끝), import 해석(`pathAlias`, 상대경로, 확장자 `.tsx`/`.ts`/`/index.tsx` 순), JSX 태그 → 블록 해석, 라우트 트리 조립(SPEC §5), 루트에서 도달 가능한 블록만 남김, `usedBy` 역색인.
- [ ] PASS, 커밋 `components-scafolder: 컴포넌트 계층 분석`.

### Task U1-3: 공통 판정과 API 귀속

- [ ] **테스트 작성**:
  - `Shared.common === true`, `commonReason === "multi-parent"`; `Button.common === true`, `commonReason === "ui-dir"`; `Row.common === false`.
  - `APage.apis` = `["/api/items", "/api/items/[id]", "/api/things"]` (주석 `/api/ghost` 없음, `/api/auth/session` 없음).
  - `BPage.apis` = `["/api/cat/brands", "/api/cat/products"]`; `model.unresolved`에 `{ raw: "/api/nowhere", file: "app/b/page.tsx", block: "app/b/page.tsx#BPage" }`.
  - 로그인 페이지 블록의 `apis` = `["/api/auth/login"]`.
  - `model.apis["/api/unused"].usedBy` = `[]`.
  - **불변식 테스트** `invariants`: SPEC §6.1 불변식 다섯 가지를 모델 전체에 대해 검사하는 헬퍼(U3도 실코드에 재사용 — `test/components-scafolder/invariants.mjs`로 export).
  - **결정성** `deterministic`: `JSON.stringify(analyze(...))`를 두 번 호출한 결과가 같다.
- [ ] FAIL 확인.
- [ ] 구현: SPEC §3.2 귀속 규칙 1–4(같은 파일 helper 전이, import 값 식별자 추적 깊이 4, `config.transport` 제외), SPEC §2 공통 판정, 정렬.
- [ ] PASS, 커밋 `components-scafolder: 공통 판정과 API 귀속`.

**Files 추가:** `test/components-scafolder/invariants.mjs` (`export function checkInvariants(model): string[]` — 위반 메시지 배열, 비면 통과).

**U1 완료 기준:** `node --test test/components-scafolder/analyze.test.mjs` 전부 통과. 실제 저장소에 대해 `node -e 'import("./scripts/components-scafolder/analyze.mjs").then(async m=>{const c=(await import("./scripts/components-scafolder/config.mjs")).default;const r=m.analyze({root:process.cwd(),config:c});console.log(Object.keys(r.blocks).length,Object.keys(r.apis).length,r.unresolved.length)})'`가 예외 없이 끝나고 API 수 65를 찍는다(블록·미해결 수는 PR 본문에 적는다). 리뷰 포인트: 정규식이 아니라 AST로 판정하는가, 전송 함수 제외가 설정에서 오는가.

---

## U2 — 렌더러

**목표:** `render(model) → string`. SPEC §7 화면을 단일 HTML로 만든다. U1 없이 픽스처 모델로 개발·테스트한다.

**Files:**
- Create: `scripts/components-scafolder/render.mjs`
- Create: `scripts/components-scafolder/client/logic.js`, `client/app.js`, `client/app.css`
- Create: `test/components-scafolder/fixtures/model.json`
- Test: `test/components-scafolder/render.test.mjs`, `test/components-scafolder/logic.test.mjs`

**Interfaces:**
- Consumes: SPEC §6.1 모델 모양(U1 코드는 쓰지 않는다).
- Produces: `render.mjs`의 `export function render(model: Model): string`. `client/logic.js`는 `globalThis.ScafLogic = { matches(block, query): boolean, visibleSet(model, query): Set<string> /* 맞는 블록 + 조상 */, ancestors(model, id): string[], parseHash(hash): string|null, formatHash(id): string }`.

### 픽스처 `fixtures/model.json`

손으로 쓴 작은 모델(SPEC §6.1 모양): `RootLayout` → 페이지 2개(`/a`·`/` 공유 블록 하나, `/b`), 비공통 중첩 자식 1개(그 아래 손자 1개), 공통 블록 2개(하나는 다른 공통을 씀), 하위 블록·API가 모두 빈 블록 1개, 이름에 `</script><b>` 가 든 블록 1개, 상호 재귀(공통 A ↔ 비공통 B), API 4개(하나는 `usedBy: []`), `unresolved` 1개.

### Task U2-1: 순수 로직 (`logic.js`)

- [ ] **테스트 작성** (`logic.test.mjs`, `vm.runInNewContext(readFileSync(logic.js), ctx)` 후 `ctx.ScafLogic` 사용):
  - `search-literal`: 질의 `"[id]"`, `"("`, `"."`가 예외 없이 부분일치로만 동작(`matches({name:"a.b"}, ".")` true, `matches({name:"ab"}, ".")` false).
  - 대소문자 무시: `matches({name:"StudioPage"}, "studio")` true. 파일 경로·API 이름으로도 맞는다.
  - `visibleSet(model, "손자이름")`이 손자·부모·페이지·`RootLayout` id를 담는다. 공통 블록이 맞으면 공통 블록 자신과 그 사용처 조상 체인을 담는다.
  - `parseHash("#b=app%2Fx.tsx%23X") === "app/x.tsx#X"`, `formatHash`는 그 역. 이상한 해시 → `null`.
- [ ] FAIL → 구현 → PASS, 커밋 `components-scafolder: 클라이언트 순수 로직`.

### Task U2-2: HTML 렌더 (`render.mjs`, `app.css`)

- [ ] **테스트 작성** (`render.test.mjs`, 문자열 검사):
  - `<!doctype html>`로 시작, `<meta charset="utf-8">`, 머리 주석에 `npm run docs:scafolder`.
  - `offline`: `/(src|href)=["']https?:|url\(\s*["']?https?:/i`가 없음.
  - 모든 블록 이름, 하위 블록 항목, API 항목, 파일 경로가 `data-copy="<HTML 이스케이프된 값>"` 버튼으로 있다(모델에서 기대 집합을 계산해 비교).
  - 공통 블록 카드(`data-block-id="<id>"` 붙은 카드 요소)는 블록마다 정확히 1번. 사용처 수만큼 참조 칩(`data-ref="<id>"`).
  - 빈 블록 카드에 `(없음)` 두 번.
  - `escapes-script-close`: 인라인 모델 JSON 구간에 `</script>` 리터럴이 없고, `<script type="application/json" id="model">` 내용을 꺼내 `<` 복원 후 `JSON.parse`하면 원 모델과 같다.
  - `cycle-safe`: 상호 재귀 픽스처에서 `render`가 끝나고, 비공통 B 카드가 1번만 나온다.
  - 전체 API 목록: 4개 항목 오름차순, `usedBy: []` 항목에 `화면 호출 없음`; `미해결 호출` 칸에 원문.
  - 결정성: `render(m) === render(m)`.
- [ ] FAIL → 구현. 서버 쪽 HTML로 카드·목록을 미리 그려 둔다(JS 없이도 내용이 보이게). 레이아웃은 SPEC §7.1, 카드는 §7.2. 시스템 폰트 스택, 밝은/어두운 테마(`prefers-color-scheme`) 둘 다.
- [ ] PASS, 커밋 `components-scafolder: 모델을 단일 HTML로 렌더`.

### Task U2-3: 상호작용 (`app.js`)

- [ ] `app.js` 구현: `copyText(s)`(SPEC §7.3, clipboard → textarea 대체), 토스트 1.2초, 접기 버튼, 처음 펼침 상태(SPEC §7.4), 검색(`ScafLogic.visibleSet`, `/`·`Esc` 단축키, 강조), SPEC §7.5 이동 1–6, SPEC §7.6 화살표(SVG, 접기·검색·resize 때 다시 그림, 보이지 않는 칩·대상은 그리지 않음, hover 강조).
- [ ] **수동 확인** (자동화가 어려운 부분, PR 본문에 결과 체크리스트로 남긴다): `node -e` 로 픽스처를 렌더해 스크래치 파일로 쓰고 Chrome에서 `file://`로 연다. 확인: (a) 이름·하위 항목·API·파일 경로 클릭 → 붙여넣기로 정확히 그 문자열, 토스트 표시, (b) 카드 빈 곳 클릭은 복사 안 함, (c) 검색 `[id]` 등에서 콘솔 오류 없음, (d) 화살표가 칩 → 공통 카드로 이어지고 접으면 사라짐, (e) `#b=<id>` 딥링크 이동, (f) 개발자도구 Network 탭에 요청 0건.
- [ ] `node --test test/components-scafolder/` PASS, 커밋 `components-scafolder: 복사·검색·접기·화살표 상호작용`.

**U2 완료 기준:** `render.test.mjs`, `logic.test.mjs` 통과 + 수동 확인 (a)–(f) 체크리스트가 PR 본문에 있다. 리뷰 포인트: 복사 버튼과 접기/이동 버튼이 다른 요소인가, 외부 리소스가 없는가.

---

## U3 — 통합과 실제 생성

**목표:** CLI와 npm 스크립트를 붙이고 실제 vtron에 대해 `docs/components-scafolder.html`을 만들어 커밋한다. 실코드에서 드러난 규칙 오판을 고친다.

**전제:** U1·U2가 `main`에 병합된 뒤 `main`에서 시작한다.

**Files:**
- Create: `scripts/components-scafolder/generate.mjs`
- Modify: `package.json` — `scripts`에 `"docs:scafolder": "node scripts/components-scafolder/generate.mjs"`, `"docs:scafolder:check": "node scripts/components-scafolder/generate.mjs --check"`
- Create: `docs/components-scafolder.html` (생성물)
- Test: `test/components-scafolder/generate.test.mjs`
- 필요할 때만 Modify: `config.mjs`, `analyze.mjs`, `render.mjs` (고칠 때마다 U1·U2 테스트에 그 경우를 픽스처로 더한다)

**Interfaces:**
- Consumes: `analyze({root, config})`(U1), `render(model)`(U2), `checkInvariants(model)`(U1 `invariants.mjs`).
- Produces: `generate.mjs`의 `export function generate({ root = process.cwd(), config } = {}): { model, html }`; CLI: 인자 없음 → `config.outFile`에 쓰고 `블록 n · 공통 n · API n · 미해결 n` 한 줄 출력; `--check` → 다르면 `stale: docs/components-scafolder.html — run npm run docs:scafolder` 출력 후 exit 1, 같으면 exit 0; `--json` → 모델을 2칸 들여쓰기로 stdout. 미해결이 있으면 stderr에 경고 줄(실패 아님).

### Task U3-1: CLI

- [ ] **테스트 작성** (`generate.test.mjs`, U1 픽스처 `mini-app`을 임시 폴더에 복사해 사용):
  - `generate({root: tmp, config})`의 `html`이 `render(model)`과 같다.
  - CLI(`child_process.spawnSync(process.execPath, [generate.mjs], {cwd: tmp})`): 실행 후 파일 생성, 바로 `--check` → exit 0; 파일 한 글자 바꾼 뒤 `--check` → exit 1, stdout에 `stale:`.
  - `--json` stdout이 `JSON.parse` 가능하고 `version === 1`.
- [ ] FAIL → 구현(설정은 `cwd`의 `scripts/components-scafolder/config.mjs`가 아니라 generate.mjs 옆의 `config.mjs`를 쓰고 `root`만 `cwd`) → PASS. `package.json` 스크립트 추가. 커밋 `components-scafolder: 생성 CLI와 npm 스크립트`.

### Task U3-2: 실제 저장소 생성과 검증

- [ ] **테스트 작성** (`generate.test.mjs`, 실제 저장소 루트 대상 `real repo` 묶음):
  - `checkInvariants(model)` 가 빈 배열.
  - `Object.keys(model.apis).length` = `app/api` 아래 `route.ts` 실제 개수(테스트가 파일을 세어 비교 — 하드코딩 65 금지).
  - 모든 `app/**/page.tsx`의 라우트가 어떤 페이지 블록의 `routes`에 있다(`/` 포함).
  - 각 블록: 익명이 아니면 `readFileSync(block.file)`가 `block.name`을 포함; 각 API: `existsSync(api.file)`.
  - `app/full-style-ex/page.tsx`와 `app/full-style-id-extraction/page.tsx`의 페이지 블록이 서로 다른 id로 둘 다 있다.
  - `app/layout.tsx#RootLayout`의 jsx 자식에 `NavBar`, `ChatAgent`.
  - `app/studio/page.tsx#StudioPage`의 `apis` ⊇ `["/api/vton/projects", "/api/vton/projects/[id]", "/api/vton/render", "/api/vton/upload"]`.
  - `components/api-mng/ui.tsx#Modal`은 공통.
  - 어떤 블록의 `apis`에도 `/api/auth/session`이 없다(전송 함수 제외 확인).
- [ ] 실행 → 실패 항목을 고친다. 고치는 곳은 `config.mjs` 또는 분석 규칙이며, 규칙을 바꿨으면 그 경우를 U1 픽스처·테스트에 더한다. SPEC과 다른 규칙이 필요하면 SPEC을 함께 고치고 PR 본문에 이유를 적는다.
- [ ] `npm run docs:scafolder` 실행, 출력된 미해결 목록을 하나씩 본다: 규칙으로 풀리면 고치고, 진짜 외부/동적 경로면 PR 본문에 남긴다.
- [ ] 브라우저 확인: `docs/components-scafolder.html`을 `file://`로 열어 U2의 수동 확인 (a)–(f)를 실제 데이터로 다시 한다. 추가로 `StudioPage` → `ProjectHistoryModal` 경로, `/api/vton/render` 복사 후 Cmd+P로 라우트 파일 도달, 공통 `Modal`의 사용처 이동.
- [ ] `npm run docs:scafolder:check` exit 0, `node --test test/components-scafolder/` 전부 PASS, `npm run lint`가 새 파일에서 오류 없음.
- [ ] 커밋 `docs: components-scafolder.html 생성` (생성물과 규칙 수정은 커밋을 나눈다).

**U3 완료 기준:** SPEC §8의 1–9를 모두 만족(PR 본문에 항목별 근거 한 줄). 블록·공통·API·미해결 개수와 미해결 원문 목록을 PR 본문에 적는다.

---

## 자체 점검 메모

- SPEC 커버리지: §2 → U1-3, §3 → U1-1·U1-3, §4·§5 → U1-2, §6 CLI·결정성 → U3-1(결정성 테스트는 U1-3·U2-2), §6.1 불변식 → U1-3·U3-2, §7 → U2, §8 → U3-2.
- 이름 일관성: `analyze`, `render`, `generate`, `matchRoute`, `checkInvariants`, `ScafLogic.{matches,visibleSet,ancestors,parseHash,formatHash}` — 단위 사이에서 같은 이름을 쓴다.
