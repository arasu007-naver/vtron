import type { BodyType, HttpMethod, AuthMode } from "@/types/playground";

/**
 * 프리셋 카탈로그.
 *
 * 네이버 커머스 API 센터에 등록된 애플리케이션(`Qoolla Product AI Searcher`)의
 * API 그룹 — 판매자정보 · 상품/N배송 · 주문 판매자 · 문의 — 을 그대로 따르고,
 * 일반 REST 감각을 확인할 샘플 그룹을 하나 더 둔다.
 *
 * `status` 는 이 저장소에서 실제로 호출해 본 결과다. 문서만 보고 적은 게 아니라
 * 응답 코드를 확인했고, 막힌 것은 왜 막혔는지 `note` 에 적어둔다.
 *
 * - `ok`     — 200 을 받았다.
 * - `params` — 엔드포인트는 살아 있는데 필수 파라미터를 더 채워야 한다(400).
 * - `scope`  — 경로는 맞지만 애플리케이션에 해당 리소스 권한이 없다(401 GW.AUTHN).
 * - `data`   — 경로는 맞고, 예시로 넣은 식별자가 존재하지 않을 뿐이다(404).
 */

export type PresetStatus = "ok" | "params" | "scope" | "data" | "unknown";

export interface PresetKeyValue {
  key: string;
  value: string;
  note?: string;
  enabled?: boolean;
}

export interface Preset {
  id: string;
  group: string;
  name: string;
  method: HttpMethod;
  /** `{{baseUrl}}` 로 시작하면 커머스 API, 아니면 절대 URL */
  url: string;
  description?: string;
  params?: PresetKeyValue[];
  headers?: PresetKeyValue[];
  bodyType?: BodyType;
  body?: string;
  auth?: AuthMode;
  status?: PresetStatus;
  note?: string;
}

export const PRESET_STATUS_LABEL: Record<PresetStatus, string> = {
  ok: "확인됨",
  params: "파라미터 필요",
  scope: "권한 필요",
  data: "데이터 필요",
  unknown: "미확인",
};

const json = (value: unknown) => JSON.stringify(value, null, 2);

export const PRESETS: Preset[] = [
  // ── 인증 ────────────────────────────────────────────────────────────────
  {
    id: "naver-token",
    group: "인증",
    name: "액세스 토큰 발급",
    method: "POST",
    url: "{{baseUrl}}/v1/oauth2/token",
    description:
      "bcrypt 서명으로 client_credentials 토큰을 받는다. 서명·timestamp 는 서버가 채운다.",
    auth: "none",
    bodyType: "form",
    body: [
      "client_id={{clientId}}",
      "timestamp={{timestamp}}",
      "client_secret_sign={{clientSecretSign}}",
      "grant_type=client_credentials",
      "type=SELF",
    ].join("\n"),
    status: "ok",
    note:
      "type=SELF 는 내 스토어용. 솔루션(위임) 개발이면 type=SELLER 와 account_id 를 함께 보낸다. " +
      "상단 토큰 바의 [토큰 발급] 버튼도 같은 호출을 한다.",
  },

  // ── 판매자정보 ──────────────────────────────────────────────────────────
  {
    id: "seller-channels",
    group: "판매자정보",
    name: "판매자 채널 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/seller/channels",
    description: "연결된 스마트스토어 채널 번호·이름·URL. 다른 API 의 channelNo 출처.",
    status: "ok",
  },
  {
    id: "seller-account",
    group: "판매자정보",
    name: "판매자 계정 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/seller/account",
    description: "accountId · accountUid · 등급.",
    status: "ok",
  },
  {
    id: "seller-addressbooks",
    group: "판매자정보",
    name: "판매자 주소록 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/seller/addressbooks-for-page",
    description: "출고지·반품교환지 주소록. 상품 등록 시 addressBookNo 로 참조한다.",
    params: [
      { key: "page", value: "1" },
      { key: "size", value: "10" },
    ],
    status: "ok",
  },

  // ── 상품 / N배송 ────────────────────────────────────────────────────────
  {
    id: "products-search",
    group: "상품/N배송",
    name: "상품 목록 조회",
    method: "POST",
    url: "{{baseUrl}}/v1/products/search",
    description: "등록 상품 페이지 조회.",
    bodyType: "json",
    body: json({
      productStatusTypes: ["SALE"],
      page: 1,
      size: 10,
      orderType: "NO",
    }),
    status: "scope",
    note:
      "경로는 유효하지만 현재 애플리케이션에서 401 GW.AUTHN 이 난다(존재하지 않는 경로는 404 GW.NOT_FOUND 로 구분됨). " +
      "커머스 API 센터 → 애플리케이션 → API 그룹 '상품/N배송' 의 리소스 권한을 확인해야 한다.",
  },
  {
    id: "origin-product",
    group: "상품/N배송",
    name: "원상품 조회",
    method: "GET",
    url: "{{baseUrl}}/v2/products/origin-products/0",
    description: "URL 끝의 0 을 originProductNo 로 바꿔 호출한다.",
    status: "data",
    note: "예시 번호 0 은 존재하지 않으므로 404 NOT_FOUND 가 정상이다.",
  },
  {
    id: "channel-product",
    group: "상품/N배송",
    name: "채널상품 조회",
    method: "GET",
    url: "{{baseUrl}}/v2/products/channel-products/0",
    description: "URL 끝의 0 을 channelProductNo 로 바꿔 호출한다.",
    status: "data",
  },
  {
    id: "categories",
    group: "상품/N배송",
    name: "카테고리 목록",
    method: "GET",
    url: "{{baseUrl}}/v1/categories",
    description: "전체 카테고리. last=true 면 리프 카테고리만.",
    params: [{ key: "last", value: "true" }],
    status: "ok",
    note: "응답이 수만 건이라 크다. 본문 탭의 '접기'로 보거나 검색해서 쓴다.",
  },
  {
    id: "category-detail",
    group: "상품/N배송",
    name: "카테고리 단건 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/categories/50000803",
    description: "50000803 = 패션의류>여성의류>티셔츠. 인증정보·예외속성까지 돌려준다.",
    status: "ok",
  },
  // 카탈로그(네이버쇼핑 마스터) 3종 — 모델 · 브랜드 · 제조사.
  // 셋 다 검색어 파라미터 이름이 `name` 이다. keyword/searchKeyword/modelName 은 400.
  {
    id: "product-catalog",
    group: "상품/N배송",
    name: "카탈로그(모델) 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/product-models",
    description:
      "네이버쇼핑 카탈로그 모델 검색. 뽑은 상품이 어떤 카탈로그에 붙는지 확인할 때 쓴다.",
    params: [
      { key: "name", value: "니트", note: "필수 — 모델명 검색어" },
      { key: "page", value: "1" },
      { key: "size", value: "10" },
    ],
    status: "ok",
    note:
      "검색어 파라미터는 `name` 이다 — keyword · searchKeyword · modelName 은 모두 400 BAD_REQUEST 다. " +
      "응답은 { contents[], page, size, totalElements, totalPages, first, last } 이고 contents 항목마다 " +
      "id · name · brandCode/brandName · manufacturerCode/manufacturerName · categoryId · wholeCategoryName 이 온다. " +
      "**카테고리로 좁힐 수 없다** — categoryId/categoryIds 를 넣어도, 아무 의미 없는 이름을 넣어도 " +
      "totalElements 가 1,919,658 로 똑같다(= 모르는 파라미터는 무시된다). 카테고리별로 보려면 응답의 " +
      "wholeCategoryName 으로 직접 걸러야 한다. name 검색은 전 카테고리를 훑는다.",
  },
  {
    id: "product-model-detail",
    group: "상품/N배송",
    name: "카탈로그 모델 단건 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/product-models/61171550082",
    description:
      "모델 조회에서 얻은 id 로 단건 조회. 예시 id 는 '워셔블 울혼방 딥 브이넥 니트'.",
    status: "ok",
    note: "없는 id 는 404 NOT_FOUND 로 `대상 데이터를 찾을 수 없습니다. id: …` 를 돌려준다.",
  },
  {
    id: "product-brands",
    group: "상품/N배송",
    name: "카탈로그 브랜드 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/product-brands",
    description: "브랜드 마스터 검색. 응답은 [{ id, name }] 배열.",
    params: [{ key: "name", value: "nike", note: "필수 — 브랜드명 검색어" }],
    status: "ok",
    note: "`nike` 로 찾으면 한글명(나이키 · 나이키골프 …)까지 함께 돌아온다.",
  },
  {
    id: "product-manufacturers",
    group: "상품/N배송",
    name: "카탈로그 제조사 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/product-manufacturers",
    description: "제조사 마스터 검색. 응답은 [{ id, name }] 배열.",
    params: [{ key: "name", value: "nike", note: "필수 — 제조사명 검색어" }],
    status: "ok",
  },

  // ── 주문 판매자 ─────────────────────────────────────────────────────────
  {
    id: "orders-last-changed",
    group: "주문 판매자",
    name: "변경 상품주문 내역 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/pay-order/seller/product-orders/last-changed-statuses",
    description:
      "lastChangedFrom 이후 상태가 바뀐 주문의 식별 데이터. 주문 폴링의 시작점.",
    params: [
      { key: "lastChangedFrom", value: "{{isoDayAgo}}", note: "ISO 8601 (오프셋 필수)" },
      { key: "lastChangedType", value: "", enabled: false, note: "PAYED / DISPATCHED …" },
    ],
    status: "ok",
    note: "변경 건이 없으면 data 없이 timestamp·traceId 만 돌아온다.",
  },
  {
    id: "orders-query",
    group: "주문 판매자",
    name: "상품주문 상세 조회",
    method: "POST",
    url: "{{baseUrl}}/v1/pay-order/seller/product-orders/query",
    description: "변경 내역에서 얻은 productOrderId 들의 상세.",
    bodyType: "json",
    body: json({ productOrderIds: ["0000000000"] }),
    status: "scope",
    note: "401 GW.AUTHN — '주문 판매자' 그룹의 리소스 권한 확인 필요.",
  },
  {
    id: "orders-product-order-ids",
    group: "주문 판매자",
    name: "주문번호로 상품주문번호 조회",
    method: "GET",
    url: "{{baseUrl}}/v1/pay-order/seller/orders/0000000000/product-order-ids",
    description: "URL 중간의 주문번호를 실제 orderId 로 바꿔 호출한다.",
    status: "unknown",
  },

  // ── 문의 ────────────────────────────────────────────────────────────────
  {
    id: "qnas",
    group: "문의",
    name: "상품 문의 목록",
    method: "GET",
    url: "{{baseUrl}}/v1/contents/qnas",
    description: "상품 Q&A 목록.",
    params: [
      { key: "fromDate", value: "{{isoDayAgo}}", note: "필수" },
      { key: "page", value: "1" },
      { key: "size", value: "10" },
    ],
    status: "params",
    note:
      "fromDate 가 없으면 '필수입니다', 날짜만 주면 '타입이 유효하지 않습니다'. " +
      "날짜 형식을 바꿔가며 맞춰보기 좋은 케이스다.",
  },
  {
    id: "customer-inquiries",
    group: "문의",
    name: "고객 문의 목록",
    method: "GET",
    url: "{{baseUrl}}/v1/pay-user/inquiries",
    description: "판매자에게 온 고객 문의.",
    params: [
      { key: "startSearchDate", value: "{{isoDayAgo}}", note: "필수" },
      { key: "endSearchDate", value: "{{isoNow}}", note: "필수" },
      { key: "page", value: "1" },
      { key: "size", value: "10" },
    ],
    status: "params",
    note: "startSearchDate / endSearchDate 가 비면 4001 로 어떤 필드가 빠졌는지 알려준다.",
  },

  // ── 샘플 · 공개 API ─────────────────────────────────────────────────────
  {
    id: "sample-jsonplaceholder",
    group: "샘플 · 공개 API",
    name: "JSONPlaceholder — GET",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    description: "프록시가 살아 있는지 확인하는 최소 호출.",
    auth: "none",
    status: "ok",
  },
  {
    id: "sample-httpbin",
    group: "샘플 · 공개 API",
    name: "httpbin — POST 에코",
    method: "POST",
    url: "https://httpbin.org/post",
    description: "보낸 헤더·바디가 그대로 돌아온다. 무엇이 실제로 나갔는지 확인용.",
    auth: "none",
    bodyType: "json",
    body: json({ hello: "vton", at: "{{isoNow}}" }),
    status: "ok",
  },
  {
    id: "sample-naver-search",
    group: "샘플 · 공개 API",
    name: "네이버 검색 API — 쇼핑",
    method: "GET",
    url: "https://openapi.naver.com/v1/search/shop.json",
    description:
      "커머스 API 와 다른 서비스다. developers.naver.com 에서 따로 발급받은 키가 필요하다.",
    auth: "none",
    params: [
      { key: "query", value: "원피스" },
      { key: "display", value: "10" },
    ],
    headers: [
      { key: "X-Naver-Client-Id", value: "", note: "developers.naver.com 애플리케이션" },
      { key: "X-Naver-Client-Secret", value: "" },
    ],
    status: "unknown",
    note: "키를 채우지 않으면 401 이 정상이다.",
  },
  {
    id: "sample-self-session",
    group: "샘플 · 공개 API",
    name: "이 앱 — 세션 조회",
    method: "GET",
    url: "{{siteUrl}}/api/auth/session",
    description: "자기 자신의 API 호출. 프록시는 쿠키를 전달하지 않으므로 401 이 정상이다.",
    auth: "none",
    status: "unknown",
  },
];

export const PRESET_GROUPS = [...new Set(PRESETS.map((p) => p.group))];
