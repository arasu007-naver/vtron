/**
 * 카탈로그 모델 → 상품 링크.
 *
 * 커머스 API 는 링크를 직접 주지 않는다. 모델 id 로 조립해야 한다.
 * 형식은 한 곳에만 두고 여기서 고친다.
 */

export interface CatalogModel {
  id: number | string;
  name: string;
  brandCode?: number;
  brandName?: string;
  manufacturerCode?: number;
  manufacturerName?: string;
  categoryId?: string;
  wholeCategoryName?: string;
  /**
   * 품번. 내재화된 상품은 DB 에 담긴 값이 오고, 네이버에서 막 받은 것은 없다(이름에서 뽑는다).
   * 이름에 품번이 없으면 null 이다 — 지어내지 않는다.
   */
  modelCode?: string | null;
}

export interface ModelPage {
  contents: CatalogModel[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
}

/**
 * ⚠️ 이 형식은 **검증하지 못했다.** search.shopping.naver.com 이 개발 환경의
 * 브라우징 정책에서 차단돼 열어볼 수 없었다. 실제 형식이 다르면 여기만 고치면 된다.
 */
export const CATALOG_LINK_BASE = "https://search.shopping.naver.com/catalog";

export const buildCatalogLink = (modelId: number | string) =>
  `${CATALOG_LINK_BASE}/${modelId}`;

/** 모델 조회 응답 본문 → 페이지 객체. 형식이 아니면 null. */
export function parseModelPage(body: string): ModelPage | null {
  try {
    const value = JSON.parse(body) as ModelPage;
    return Array.isArray(value?.contents) ? value : null;
  } catch {
    return null;
  }
}

export interface Facet {
  value: string;
  count: number;
}

/**
 * 토글 버튼을 만들 값 목록.
 *
 * `name` 검색은 토큰 분해 매칭이라 무관한 항목이 섞인다(동명이 리프, 다른 브랜드).
 * 그래서 받아온 뒤 카테고리·브랜드로 걸러 확정하는 절차가 필요하고, 그 재료가 이것이다.
 */
export function facetsOf(
  models: CatalogModel[],
  key: "wholeCategoryName" | "brandName"
): Facet[] {
  const counts = new Map<string, number>();
  for (const model of models) {
    const value = (model[key] ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** 켜진 카테고리가 하나도 없으면 거르지 않는다(전체). */
export function applyFacets(models: CatalogModel[], categories: Set<string>): CatalogModel[] {
  if (!categories.size) return models;
  return models.filter((model) => categories.has((model.wholeCategoryName ?? "").trim()));
}

/**
 * 품번 — 커머스 API 는 주지 않는다. 상품명에서 뽑는다.
 *
 * 모델 조회(`/v1/product-models`)가 돌려주는 필드는 id · name · brandCode/brandName ·
 * manufacturerCode/manufacturerName · categoryId · wholeCategoryName 뿐이고, 단건 조회
 * (`/v1/product-models/{id}`)도 똑같다. `manufacturerCode` 는 네이버 제조사 마스터 id 지
 * 상품 품번이 아니다. 판매자 상품 조회의 `sellerManagementCode` 는 내 스토어에 등록한
 * 상품에만 있는 값이라 카탈로그 상품에는 쓸 수 없다.
 *
 * 그런데 상품명 끝에 품번이 붙어 오는 브랜드가 많다 — '올 인 BB M13480', '윈플로 12 로드
 * 러닝화 HV9273'. 그래서 이름의 토큰에서 찾는다.
 */

/** 품번으로 볼 토큰 — 영숫자 · '-' 로만 이어지는 4자 이상. 대소문자는 가리지 않는다. */
const CODE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9-]{3,}$/;
/** 숫자가 이만큼은 있어야 한다. 'Nulu' 같은 영문 낱말과, '8inch' 같은 치수와 갈라놓는 선. */
const MIN_DIGITS = 2;
/** 치수 — '230mm' · '500ml'. 숫자 뒤가 단위뿐이면 품번이 아니다. */
const UNIT = /^\d+(mm|cm|inch|in|ml|l|g|kg|oz|p|pcs)$/i;
/** 시즌 — '24SS' · '2025FW'. 해마다 도는 값이라 상품을 가리키지 못한다. */
const SEASON = /^(19|20)?\d{2}(ss|fw|aw|sp)$/i;

/**
 * 상품명에서 품번 하나. 없으면 null.
 *
 * 품번 뒤에 색상 코드가 한 번 더 붙는 브랜드가 있어(나이키 `FQ6873 101`, 디올
 * `M1291VRIW M928`) 후보 중 **가장 긴 것**을 고른다 — 색상 코드가 늘 더 짧다.
 *
 * 숫자만 있는 토큰은 뺀다. 그렇지 않으면 리바이스의 핏 번호(501 · 505)나 '30 몽테인' 의
 * 30 까지 품번이 되어 버린다. 반대로 대문자만 보면 안 된다 — 캘빈클라인 `47d26`,
 * 디올 `2esca549cdi` 처럼 소문자로도, 숫자로 시작하는 형태로도 온다.
 */
export function modelCodeOf(name: string): string | null {
  let best: string | null = null;
  for (const raw of name.split(/[\s,()[\]/·]+/)) {
    const token = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    if (!CODE_TOKEN.test(token)) continue;
    if ((token.match(/\d/g)?.length ?? 0) < MIN_DIGITS) continue;
    if (!/[A-Za-z]/.test(token)) continue;
    if (UNIT.test(token) || SEASON.test(token)) continue;
    if (!best || token.length > best.length) best = token;
  }
  return best;
}

/**
 * 이 상품의 품번. 담겨 온 값이 있으면 그것이고, 없으면 이름에서 뽑는다.
 *
 * 내재화된 상품(`brand_catalog_models.model_code`)은 넣을 때 이미 계산해 뒀다. 네이버에서
 * 막 받은 것에는 그 칸이 없으므로 그때만 이름을 본다. 둘 다 없으면 null 로 둔다.
 */
export const catalogModelCode = (model: CatalogModel): string | null =>
  model.modelCode ?? modelCodeOf(model.name);

/** 품번을 쓰는 브랜드로 볼 최소 비율. 리바이스는 100건에 33건이라 여기 못 미친다. */
export const MODEL_CODE_MIN_RATIO = 0.4;
/** 이보다 적게 조회됐으면 판단하지 않는다 — 몇 건으로는 브랜드의 버릇을 알 수 없다. */
export const MODEL_CODE_MIN_SAMPLE = 10;

export interface ModelCodeStats {
  total: number;
  /** 이름에서 품번을 뽑아낸 상품 수. */
  withCode: number;
  ratio: number;
  /** 표본이 충분하고 비율이 기준에 못 미친다 — '이 브랜드는 품번을 사용하지 않습니다'. */
  unused: boolean;
}

/** 조회 결과 한 묶음이 품번을 쓰는지. */
export function modelCodeStats(models: CatalogModel[]): ModelCodeStats {
  const total = models.length;
  const withCode = models.filter((model) => catalogModelCode(model)).length;
  const ratio = total ? withCode / total : 0;
  return {
    total,
    withCode,
    ratio,
    unused: total >= MODEL_CODE_MIN_SAMPLE && ratio < MODEL_CODE_MIN_RATIO,
  };
}
