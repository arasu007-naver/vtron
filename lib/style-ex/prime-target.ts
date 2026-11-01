import "server-only";
import type { ProductContext } from "./product-context";

/**
 * 대표 의복(PRIME TARGET) 확정 — 상품 정보(상품명 · 카테고리)를 JEV(TypeSafe AI 의 결정 모델)에 넘겨
 * 관찰 프롬프트의 의복 카테고리 10개 중 하나로 정한다. 관찰 프롬프트는 대표 의복을 고르지 않고 그 의복만 관찰한다.
 *
 *   POST https://api.typesafe.ai/v1/systemone   (Authorization: Bearer TYPESAFE_API_KEY)
 *   질문 하나(choice) — 선택지 = 10 카테고리 + SUIT_SET · NOT_DETERMINABLE. 이 둘이나 confidence 가 낮으면 확정하지 않는다(null)
 *   → 관찰 프롬프트가 지금처럼 이미지에서 대표 의복을 고른다.
 *
 * 카테고리 · 경계 규칙은 관찰 프롬프트(item 활성 버전)의 [CANONICAL CATEGORIES] · 카테고리 라우팅 규칙과 같다.
 * /style-ex 에서만 쓴다 — /full-style-ex 는 착장의 모든 물체를 관찰 · 채점하므로 고를 대표 의복이 없다.
 */

/** 관찰 프롬프트의 의복 카테고리 (item) */
export const PRIME_TARGET_CATEGORIES = [
  "T-Shirt",
  "Shirt",
  "Sweater",
  "Sweatshirt",
  "Jacket",
  "Coat",
  "Trouser",
  "Skirt",
  "Dress",
  "Jumpsuit",
] as const;
export type PrimeTargetCategory = (typeof PRIME_TARGET_CATEGORIES)[number];

export const isPrimeTargetCategory = (v: unknown): v is PrimeTargetCategory =>
  typeof v === "string" && (PRIME_TARGET_CATEGORIES as readonly string[]).includes(v);

/** JEV 선택지 — 키가 답이 된다. 설명은 관찰 프롬프트의 카테고리 경계 규칙 + 한국 쇼핑몰 상품명에 흔한 말 */
const CRITERIA: Record<PrimeTargetCategory | "SUIT_SET" | "NOT_DETERMINABLE", string> = {
  "T-Shirt": "Jersey-knit tee or simple knit top: 티셔츠, 반팔티, 긴팔티, 슬리브리스/민소매 티, 크롭티, 폴로티(카라티).",
  Shirt: "Woven shirt or blouse with collar/placket: 셔츠, 블라우스, 남방. NOT an overshirt/shacket worn as an outer layer (that is Jacket).",
  Sweater:
    "Any garment whose body is KNIT (rib/cable/chunky): 니트, 스웨터, 가디건(cardigan, including full-zip knit cardigan), 니트 베스트, 터틀넥 니트.",
  Sweatshirt: "Sweatshirting/fleece body with ribbed trims: 맨투맨, 스웨트셔츠, 후드티, 후드집업(zip hoodie stays Sweatshirt, not Jacket).",
  Jacket:
    "Outerwear SHELL (woven/tailored/technical/leather), hip length or shorter: 재킷, 자켓, 블레이저, 점퍼, 블루종, 항공점퍼, 가죽자켓, 데님자켓, 바람막이, 야상, 셔켓/오버셔츠, 숏패딩.",
  Coat: "Long outer column in heavy self-supporting cloth with full front opening: 코트, 트렌치코트, 롱코트, 더플코트, 롱패딩. Sleeveless long outer is still Coat.",
  Trouser: "Bottom with two legs: 바지, 팬츠, 슬랙스, 청바지, 데님팬츠, 조거, 와이드팬츠, 반바지/숏팬츠(shorts are Trouser), 레깅스.",
  Skirt: "Bottom without legs: 스커트, 치마, 미니/미디/롱 스커트, 플리츠 스커트.",
  Dress: "One-piece worn as the body layer: 원피스, 드레스, 셔츠원피스, 니트원피스, 슬립 드레스.",
  Jumpsuit: "One-piece with legs: 점프수트, 점프슈트, 오버롤, 멜빵바지, 롬퍼.",
  SUIT_SET:
    "A matched set sold together as one product (jacket + trousers or jacket + skirt): 정장 세트, 수트, 셋업, 투피스. Choose this instead of a single category.",
  NOT_DETERMINABLE:
    "The product is not one of the garments above (shoes, bag, hat, accessory, underwear, swimwear) or the name/category does not tell which garment it is.",
};

const INSTRUCTIONS =
  "This is a fashion catalog listing (Korean shopping mall). From the product name and the catalog category, which ONE garment category is the product being sold? " +
  "Decide from what the product IS, not from other garments that may appear in its photo (styling items). " +
  "Category paths look like 패션의류>여성의류>아우터>재킷 — the last level is the most specific.";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 15_000;
/** 이보다 낮은 confidence 는 확정하지 않는다 — 관찰 프롬프트가 이미지로 고른다 */
const DEFAULT_MIN_CONFIDENCE = 0.6;

export const jevApiKey = () => process.env.TYPESAFE_API_KEY?.trim() || null;
const jevModel = () => process.env.JEV_MODEL?.trim() || "jev-latest";
const minConfidence = () => {
  const n = Number(process.env.PRIME_TARGET_MIN_CONFIDENCE);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : DEFAULT_MIN_CONFIDENCE;
};

/** 확정 결과 — category 가 null 이면 확정하지 않았다(이유는 reason) */
export interface PrimeTarget {
  category: PrimeTargetCategory | null;
  /** JEV 가 고른 선택지 (SUIT_SET · NOT_DETERMINABLE 포함). 호출하지 못했으면 null */
  choice: string | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
  /** 응답의 모델 버전 (예: jev-1.13.0) */
  model: string | null;
  /** 확정하지 않은 이유 — 확정했으면 null */
  reason: string | null;
  ms: number;
}

interface JevResponse {
  model?: string;
  answers?: Record<string, { type?: string; choice?: string; probabilities?: Record<string, number>; confidence?: number }>;
}

/** 상품 정보 → 대표 의복. 키가 없거나 JEV 가 실패해도 던지지 않는다 (category null + reason) */
export async function resolvePrimeTarget({ name, category }: ProductContext): Promise<PrimeTarget> {
  const started = performance.now();
  const none = (reason: string, part: Partial<PrimeTarget> = {}): PrimeTarget => ({
    category: null,
    choice: null,
    confidence: null,
    probabilities: null,
    model: null,
    ...part,
    reason,
    ms: Math.round(performance.now() - started),
  });

  const key = jevApiKey();
  if (!key) return none("TYPESAFE_API_KEY 가 없어 JEV 를 부르지 않았습니다.");

  let data: JevResponse;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: jevModel(),
        state: `product name: ${name.slice(0, 200)}\ncategory: ${category?.slice(0, 200) || "(unknown)"}`,
        questions: { prime_target: { type: "choice", instructions: INSTRUCTIONS, criteria: CRITERIA } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return none(`JEV 호출 실패 (HTTP ${res.status}): ${body.slice(0, 300)}`);
    }
    data = (await res.json()) as JevResponse;
  } catch (e) {
    return none(`JEV 호출 실패: ${e instanceof Error ? e.message : String(e)}`);
  }

  const answer = data.answers?.prime_target;
  const got = {
    choice: answer?.choice ?? null,
    confidence: typeof answer?.confidence === "number" ? answer.confidence : null,
    probabilities: answer?.probabilities ?? null,
    model: data.model ?? null,
  };
  console.info(`[prime-target] JEV ${got.model ?? "?"} — "${name.slice(0, 60)}" → ${got.choice ?? "?"} (confidence ${got.confidence ?? "?"})`);
  if (!isPrimeTargetCategory(got.choice)) {
    return none(got.choice ? `JEV 답이 ${got.choice} 입니다 — 단일 의복이 아닙니다.` : "JEV 응답에 답이 없습니다.", got);
  }
  if (got.confidence !== null && got.confidence < minConfidence()) {
    return none(`JEV confidence ${got.confidence.toFixed(2)} 가 기준 ${minConfidence()} 보다 낮습니다.`, got);
  }
  return { ...got, category: got.choice, reason: null, ms: Math.round(performance.now() - started) };
}
