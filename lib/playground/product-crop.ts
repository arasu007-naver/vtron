import "server-only";

/**
 * mvps/product-crop 프로젝트의 save-product-image API — 상품 대표 이미지를 등록한다.
 *
 * ⚠️ 요청 · 응답 형식은 **확인하지 못했다.** vtron 을 개발한 Windows PC 어디에도 product-crop 코드가
 * 없었다. 아래 가정대로 부르고 응답은 가공 없이 돌려준다. 실제 형식이 다르면 이 파일만 고친다.
 *
 *   POST {PRODUCT_CROP_BASE_URL}/save-product-image
 *   Content-Type: application/json
 *   { naverProductId, name, brandName, catalogUrl }
 *
 * 서버 주소는 .env.local 의 PRODUCT_CROP_BASE_URL. 브라우저에서 직접 부르지 않고 vtron 서버가
 * 중계한다(CORS · 내부망 주소를 브라우저에 드러내지 않기 위해).
 */

export const SAVE_PRODUCT_IMAGE_PATH = "/save-product-image";

/** 설정된 product-crop 서버 주소(끝의 / 제거). 없으면 null. */
export const getProductCropBaseUrl = () =>
  process.env.PRODUCT_CROP_BASE_URL?.trim().replace(/\/+$/, "") || null;

export interface SaveProductImageInput {
  /** 네이버 카탈로그 모델 id. */
  naverProductId: string;
  name: string;
  brandName: string | null;
  /** 네이버 쇼핑 판매(카탈로그) 페이지 URL. */
  catalogUrl: string;
}

export class ProductCropError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ProductCropError";
  }
}

/** 이미지 크롭 · 저장은 느릴 수 있어 넉넉히 둔다. */
const TIMEOUT_MS = 60_000;

/** save-product-image 를 부르고 응답 본문(JSON 이면 파싱, 아니면 문자열)을 돌려준다. */
export async function saveProductImage(
  baseUrl: string,
  input: SaveProductImageInput
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${SAVE_PRODUCT_IMAGE_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // JSON 이 아니면 문자열 그대로 둔다.
    }
    if (!res.ok) {
      throw new ProductCropError(
        502,
        `save-product-image 실패 (HTTP ${res.status}) · ${text.slice(0, 300)}`
      );
    }
    return data;
  } catch (error) {
    if (error instanceof ProductCropError) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new ProductCropError(
      aborted ? 504 : 502,
      aborted
        ? `save-product-image 가 ${TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다.`
        : `save-product-image 호출 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timer);
  }
}
