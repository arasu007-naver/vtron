/**
 * 상품 정보(PRODUCT CONTEXT) — 상품 사진으로 추출할 때 관찰 프롬프트 뒤에 붙는 지시. 대표 의복(primary)을 고르는 데만 쓴다.
 *
 * /style-ex 에서 [상품 Style ID 추출]로 상품을 고르면 이 글이 관찰 프롬프트 칸 끝에 붙어 화면에 보인다.
 * 서버는 받은 프롬프트를 splitProductContext 로 다시 나눈다:
 *   base     = 버전 관리되는 관찰 프롬프트 — 버전 찾기 · 캐시 블록에 쓴다
 *   addendum = 이 글 — 상품마다 달라서 캐시 블록 뒤에 따로 붙인다 (캐시 prefix 는 그대로 맞는다)
 * 칸에서 이 부분을 지우면 상품 정보 없이 이미지만으로 대표 의복을 고른다.
 */

/** brand_catalog_models 의 상품 이름 · 분류 */
export interface ProductContext {
  name: string;
  /** brand_catalog_models.whole_category_name (예: 패션의류>여성의류>아우터>재킷) */
  category: string | null;
}

const RULE = "═══════════════════════════════════════════════════════════════";
/** 상품 정보의 시작 — 이 글로 프롬프트에서 상품 정보를 찾는다 */
const MARKER = `\n${RULE}\nPRODUCT CONTEXT (`;

export const productAddendum = ({ name, category }: ProductContext) => `
${RULE}
PRODUCT CONTEXT (catalog metadata for THIS image — NOT an observation).
This photo is the listing image of one catalog product:
  product name : ${name.slice(0, 200)}
  category     : ${category?.slice(0, 200) || "(unknown)"}
If the product name and category let you tell WHICH visible garment is the product being sold, that garment is FIXED as the primary target:
  - give it "prominence": "dominant" and give every other garment "secondary" or "minor", even when another garment is larger or more eye-catching;
  - ALSO add "product_match": true as a sibling of "observations" on that one garment, and on no other garment.
If they do not let you tell (no visible garment matches, or more than one could), set prominence from the image as usual and add "product_match" to no garment.
⛔ This context only chooses the primary garment. It must not change any observation, category, eligibility, colour or presentation type — observe every garment exactly as you see it.`;

/**
 * 프롬프트 → 관찰 프롬프트(base) + 상품 정보(addendum, 없으면 null).
 * 줄바꿈은 LF 로 맞춘다 — multipart/form-data 로 보낸 글은 줄바꿈이 CRLF 로 바뀌어 오므로, 그대로면 표식을 못 찾고
 * 버전(LF 로 저장됨)과도 내용이 달라진다.
 */
export function splitProductContext(text: string): { base: string; addendum: string | null } {
  const prompt = text.replace(/\r\n?/g, "\n");
  const at = prompt.lastIndexOf(MARKER);
  if (at < 0) return { base: prompt, addendum: null };
  const addendum = prompt.slice(at);
  return { base: prompt.slice(0, at), addendum: addendum.trim() ? addendum : null };
}

/** 관찰 프롬프트에 상품 정보를 붙인다 (이미 붙은 상품 정보는 갈아 끼운다). addendum 이 null 이면 떼어 낸다. */
export const withProductContext = (prompt: string, addendum: string | null) =>
  splitProductContext(prompt).base + (addendum ?? "");
