import type { HttpMethod } from "@/types/playground";
import type { PresetStatus } from "./presets";

/**
 * API 호출 플로우.
 *
 * 플레이그라운드의 프리셋은 엔드포인트 하나씩만 보여준다. 그런데 이 API 들을
 * 두드려 보는 목적은 결국 **상품 링크를 뽑는 것**이고, 그러려면 어떤 순서로
 * 무엇을 무엇에 넘기는지가 필요하다. 그 순서를 한 화면에 세운 것이 플로우다.
 *
 * 각 단계의 `status` 는 이 저장소에서 실제로 호출해 본 결과다(프리셋과 같은 기준).
 */

export type FlowStepKind = "call" | "derive";

export interface FlowStep {
  id: string;
  title: string;
  /** 대응하는 프리셋 — 있으면 [편집기로 열기] 가 뜬다. */
  presetId?: string;
  method?: HttpMethod;
  path?: string;
  /** 이 단계에서 무엇을 얻는가 */
  produces: string;
  /** 다음 단계로 넘어가는 값 */
  feeds?: string;
  /** 호출이 아니라 앞 단계 결과를 조립하는 단계면 "derive" */
  kind: FlowStepKind;
  status?: PresetStatus;
  optional?: boolean;
  note?: string;
  /** 실제 응답에서 뽑은 예시 (derive 단계의 조립 결과 포함) */
  sample?: string;
}

export interface CallFlow {
  id: string;
  name: string;
  goal: string;
  summary: string;
  steps: FlowStep[];
}

/**
 * 대상은 **네이버쇼핑 전체 상품**이지 내 스토어 상품이 아니다.
 *
 * 그래서 판매자 쪽 API(판매자 채널 조회 · 상품 목록 조회 · 원상품 조회)는 이
 * 플로우에 들어가지 않는다. 그것들은 전부 "내 스토어에 등록된 것"만 돌려주고,
 * 링크도 내 스토어 주소(`smartstore.naver.com/qoolla/...`)로만 나온다.
 *
 * 전체 상품을 훑는 입구는 카탈로그(모델) 마스터다 — 이름 검색 한 번에
 * 191만 건 규모를 페이지로 돌려준다.
 */
export const PRODUCT_LINK_FLOW: CallFlow = {
  id: "product-link",
  name: "상품 링크 추출",
  goal: "네이버쇼핑 상품(카탈로그) 링크",
  summary:
    "인증 → 브랜드 조회(정규 이름·id) → 카탈로그 모델 목록(name=브랜드명, brandCode 로 필터) → (카테고리로 거르기) → 선택 → 링크. 모델 조회는 브랜드 id 를 받지 않는다 — name 이 브랜드명까지 훑으므로 이름으로 넘기고, 섞여 든 다른 브랜드는 brandCode 로 거른다.",
  steps: [
    {
      id: "token",
      kind: "call",
      title: "액세스 토큰 발급",
      presetId: "naver-token",
      method: "POST",
      path: "/v1/oauth2/token",
      produces: "access_token (3시간)",
      feeds: "이후 모든 호출의 Authorization: Bearer",
      status: "ok",
      note: "상단 토큰 바의 [토큰 발급] 이 같은 호출을 한다. bcrypt 서명은 서버가 만든다.",
    },
    {
      id: "brand",
      kind: "call",
      title: "브랜드 조회",
      presetId: "product-brands",
      method: "GET",
      path: "/v1/product-brands?name=",
      produces: "[{ id, name }] 브랜드 마스터 — 그게 전부다. 링크도 상품도 없다.",
      feeds: "고른 브랜드의 정규 **이름** → 모델 목록의 name · 브랜드 **id** → 모델 목록 결과의 brandCode 필터",
      status: "ok",
      sample: '{"id":1269,"name":"나이키"} → name=나이키 (75,054건)',
      note:
        "카탈로그보다 먼저 부른다. name 은 필수다. 브랜드 id 를 모델 조회에 넘기는 경로는 없다 — " +
        "brandCode · brandId · brandName · manufacturerCode 를 얹어도 totalElements 가 기준선과 한 건도 " +
        "다르지 않다(무시되는 파라미터). 그래서 이름은 name 으로, id 는 결과 필터로 쓴다. " +
        "브랜드는 갈래진다 — name=nike 는 나이키 · 나이키키즈 · 나이키골프 · 나이키스윔 · 나이키스트렝스 · " +
        "NIKEN 을 각각 다른 id 로 돌려준다. 어떤 id 를 묶을지는 운영자 몫이다. " +
        "제조사(/v1/product-manufacturers?name=)도 같은 모양이다. " +
        "상품링크 창은 이 조회를 매번 부르지 않고, npm run sync:brands 가 미리 매칭해 둔 brands 테이블에서 " +
        "옷 브랜드만 받아 초성으로 고른다.",
    },
    {
      id: "models",
      kind: "call",
      title: "카탈로그 모델 목록",
      presetId: "product-catalog",
      method: "GET",
      path: "/v1/product-models?name=<브랜드명>&page=&size=",
      produces:
        "모델 목록 — id · name · brandCode/brandName · manufacturerCode/manufacturerName · categoryId · wholeCategoryName",
      feeds: "brandCode 가 고른 브랜드 id 인 모델의 id → 링크",
      status: "ok",
      sample:
        'id: 61171550082 · name: "워셔블 울혼방 딥 브이넥 니트" · brandName: "더엣지" · wholeCategoryName: "패션의류>여성의류>니트>풀오버"',
      note:
        "이 플로우의 본체다. name 은 필수이고(빼면 400) **모델명·브랜드명·제조사명·카테고리명을 함께 훑는다.** " +
        "그래서 브랜드 조회에서 고른 이름을 그대로 넣으면 사실상 브랜드별 모델 목록이 된다. 정확 일치는 아니다 — " +
        "토큰 분해 매칭이라 name=더엣지 표본 50건 중 1건은 세 필드 어디에도 검색어가 없었다. " +
        "그래서 응답의 brandCode 를 고른 브랜드 id 와 비교해 거른다. " +
        "**size 상한은 100** 이다(500·1000 은 400). 페이지네이션은 page 로 넘긴다. " +
        "브랜드명만으로 찾으면 주력 상품(나이키 → 신발)만 잡히므로, 상품링크 창은 상의 · 하의 · 기타를 누르면 " +
        "name=<브랜드명 + 옷 키워드>(res/clothing-categories.json)로 키워드마다 부르고 brandCode · categoryId 로 거른다.",
    },
    {
      id: "category",
      kind: "call",
      title: "카테고리로 거르기 · 카테고리 목록 조회",
      presetId: "categories",
      method: "GET",
      path: "/v1/categories",
      produces: "카테고리 5,820건 (리프 5,002) — 경로와 id",
      feeds: "전체 경로 → 모델 목록 결과의 wholeCategoryName 필터",
      status: "ok",
      optional: true,
      sample: '"패션의류>여성의류>니트>풀오버" → wholeCategoryName 이 같은 모델만 남긴다',
      note:
        "평평한 배열이라 그대로는 못 읽는다. 왼쪽 아래 [Treeview] 로 패션 계열만 걸러(353건) 고른다. " +
        "카테고리 id 는 모델 조회에 넘길 수 없다(무시된다). 동명이 리프가 있으므로(여성/남성 카디건 등) " +
        "응답의 wholeCategoryName 을 고른 경로 전체와 비교해 거른다.",
    },
    {
      id: "select",
      kind: "call",
      title: "선택 · 모델 단건 조회",
      presetId: "product-model-detail",
      method: "GET",
      path: "/v1/product-models/{id}",
      produces: "모델 객체 하나 (목록 항목과 같은 필드)",
      feeds: "확정한 모델 id → 링크",
      status: "ok",
      optional: true,
      note: "없는 id 는 404 NOT_FOUND 로 `대상 데이터를 찾을 수 없습니다. id: …` 를 돌려준다.",
    },
    {
      id: "assemble",
      kind: "derive",
      title: "링크 조립",
      produces: "상품(카탈로그) URL",
      status: "unknown",
      sample: "https://search.shopping.naver.com/catalog/61171550082",
      note:
        "커머스 API 는 링크를 직접 주지 않는다. 모델 id 로 만들어야 하는데, 이 URL 형식은 **검증하지 못했다** — " +
        "search.shopping.naver.com 이 이 환경의 브라우징 정책에서 차단돼 열어볼 수 없었다. " +
        "이 플로우에서 유일하게 확인 못 한 고리다. 형식이 다르면 여기만 고치면 된다.",
    },
  ],
};

export const FLOWS: CallFlow[] = [PRODUCT_LINK_FLOW];
