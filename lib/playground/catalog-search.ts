import { sendDraft } from "@/lib/playground/client";
import {
  brandSearchNames,
  pickClothingModels,
  type ClothingBrand,
  type ClothingKindDef,
} from "@/lib/playground/clothing";
import { parseModelPage, type CatalogModel, type ModelPage } from "@/lib/playground/product-link";
import type { RequestDraft } from "@/types/playground";

/**
 * 브랜드 × 분류 → 네이버 카탈로그 모델.
 *
 * 상품링크(`ProductLinkSteps`)와 브랜드 내재화(`BrandCatalogSteps`)가 같이 쓴다. 둘이
 * 같은 3단계를 보여주므로 조회는 한 곳에 둔다.
 *
 * 모델 조회(`GET /v1/product-models`)는 브랜드 id · 카테고리 id 를 받지 않는다(무시된다).
 * 그래서 "브랜드명 + 옷 키워드" 로 키워드마다 한 번씩 부르고, 섞여 든 다른 브랜드 · 카테고리는
 * 응답의 brandCode · categoryId 로 거른다.
 */

/** size 상한은 100 이다(500·1000 은 400). */
export const CATALOG_PAGE_SIZE = 100;
/** 호출 사이 최소 간격. 이보다 촘촘하면 429 가 난다(sync-brands 와 같은 값). */
const MIN_INTERVAL_MS = 550;
const RETRIES_ON_429 = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 부를 때마다 직전 호출에서 MIN_INTERVAL_MS 가 지날 때까지 기다리는 함수를 만든다. */
export function createPacer() {
  let lastCallAt = 0;
  return async () => {
    await sleep(Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now()));
    lastCallAt = Date.now();
  };
}

const searchDraft = (term: string): RequestDraft => ({
  method: "GET",
  url: "{{baseUrl}}/v1/product-models",
  params: [
    { id: "name", enabled: true, key: "name", value: term },
    { id: "page", enabled: true, key: "page", value: "1" },
    { id: "size", enabled: true, key: "size", value: String(CATALOG_PAGE_SIZE) },
  ],
  headers: [],
  bodyType: "none",
  body: "",
  auth: { mode: "naver", token: "", username: "", password: "" },
});

/** 모델 한 페이지. 검색 결과가 없으면 404 라 빈 페이지로 돌린다. 429 는 물러났다 다시 부른다. */
export async function fetchModelPage(
  term: string,
  accessToken: string | null
): Promise<{ value: ModelPage } | { error: string }> {
  for (let attempt = 0; ; attempt++) {
    const { result, error } = await sendDraft(searchDraft(term), accessToken);
    if (error) return { error };
    if (!result) return { error: "응답이 없습니다." };
    if (result.status === 429 && attempt < RETRIES_ON_429) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (result.status === 404) return { value: { contents: [], totalElements: 0 } };
    if (!result.ok) return { error: `HTTP ${result.status} · ${result.body.slice(0, 300)}` };
    const page = parseModelPage(result.body);
    return page ? { value: page } : { error: "모델 목록 형식이 아닙니다. 응답 원문을 확인하세요." };
  }
}

export interface CatalogSearchHandlers {
  /** 지금 무엇을 부르고 있는지. */
  onProgress: (text: string) => void;
  /** 키워드 하나가 끝날 때마다 그때까지 모은 것 — 화면이 차오르게. */
  onPartial: (page: ModelPage, searchName: string) => void;
  /** true 가 되면 그만둔다 — 그 사이 브랜드나 분류가 바뀐 것이다. */
  isStale: () => boolean;
}

export type CatalogSearchOutcome =
  | { state: "done"; page: ModelPage; searchName: string }
  | { state: "error"; error: string }
  /** 도중에 브랜드 · 분류가 바뀌어 결과를 버렸다. */
  | { state: "stale" };

/**
 * 분류의 키워드마다 `name=<브랜드명> <키워드>` 로 한 번씩, 차례로 부른다(한꺼번에 쏘면 429).
 * 브랜드 이름으로 하나도 안 걸리면 다음 이름(네이버 등록명 등)으로 다시 찾는다.
 */
export async function searchBrandKindModels(
  brand: ClothingBrand,
  kind: ClothingKindDef,
  accessToken: string | null,
  handlers: CatalogSearchHandlers
): Promise<CatalogSearchOutcome> {
  const pace = createPacer();
  let last: { page: ModelPage; searchName: string } = {
    page: { contents: [], totalElements: 0 },
    searchName: brand.displayName,
  };

  for (const name of brandSearchNames(brand)) {
    const seen = new Set<string>();
    const found: CatalogModel[] = [];
    let total = 0;
    for (const [index, keyword] of kind.keywords.entries()) {
      handlers.onProgress(`'${name} ${keyword}' 조회 중… ${index + 1}/${kind.keywords.length}`);
      await pace();
      const outcome = await fetchModelPage(`${name} ${keyword}`, accessToken);
      if (handlers.isStale()) return { state: "stale" };
      if ("error" in outcome) return { state: "error", error: `${name} ${keyword} · ${outcome.error}` };
      total += outcome.value.totalElements ?? 0;
      found.push(...pickClothingModels(outcome.value.contents, brand.naverBrandId, kind, seen));
      last = { page: { contents: [...found], totalElements: total }, searchName: name };
      handlers.onPartial(last.page, name);
    }
    if (found.length > 0) break;
  }
  return { state: "done", ...last };
}
