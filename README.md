# VTON — Virtual Try-On Platform

Next.js 16 (App Router) + Supabase 기반 가상 피팅 플랫폼.
[fashn-AI/tryon-nextjs-app](https://github.com/fashn-AI/tryon-nextjs-app) 을 이식해
실제 FASHN Virtual Try-On API 로 착장을 생성한다.

## 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | **VTON 스튜디오** — 배경 + 실사 캐릭터 + 다중 가먼트 레이어를 조합하는 한글 UI. 레이어 순서대로 FASHN try-on 을 연쇄 호출한다. |
| `/tryon` | **FASHN Try-On 데모** — 원본 `tryon-nextjs-app` 을 그대로 이식한 단일 가먼트 데모(모델/가먼트 업로드, 파라미터 컨트롤, 결과 갤러리, 모델 버전 비교 슬라이더). |

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

### 환경 변수

`.env.example` 을 `.env.local` 로 복사한 뒤 채운다.

- `FASHN_API_KEY` — [app.fashn.ai](https://app.fashn.ai) → Settings → API 에서 발급.
  - 비어 있으면 `/tryon` 은 브라우저에 저장된 사용자 키(모달 입력)를 요구하고,
    스튜디오 렌더는 데모(시뮬레이션) 결과로 폴백한다.
- `FASHN_ENDPOINT_URL` — 기본 `https://api.fashn.ai`. 자체 엔드포인트를 쓸 때만 지정.
- `SUPABASE_SERVICE_ROLE_KEY` — 업로드/결과 보관/세션 저장에 필요.
  없으면 anon 키로 폴백하며 RLS 때문에 Storage·DB 쓰기가 실패한다
  (렌더는 계속 동작하고 FASHN CDN URL 을 그대로 반환한다).

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

## 이식하면서 바뀐 부분

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
