import Fashn from "fashn";

/**
 * FASHN Virtual Try-On API 연동 헬퍼.
 *
 * fashn-AI/tryon-nextjs-app 의 /api/tryon 라우트에서 쓰이는 run → poll 흐름을
 * 재사용 가능한 형태로 분리한 것이다. /tryon 데모 라우트와 VTON 스튜디오의
 * 착장 렌더 라우트가 함께 사용한다.
 */

export const FASHN_ENDPOINT_URL =
  process.env.FASHN_ENDPOINT_URL || "https://api.fashn.ai";

export type FashnCategory = "auto" | "tops" | "bottoms" | "one-pieces";
export type FashnMode = "performance" | "balanced" | "quality";
export type FashnPhotoType = "auto" | "flat-lay" | "model";

export interface TryOnOptions {
  /** 사람 이미지 — CDN URL 또는 data:image/...;base64,... */
  modelImage: string;
  /** 가먼트 이미지 — CDN URL 또는 data:image/...;base64,... */
  garmentImage: string;
  category?: FashnCategory;
  garmentPhotoType?: FashnPhotoType;
  mode?: FashnMode;
  segmentationFree?: boolean;
  seed?: number;
  numSamples?: number;
  modelName?: string;
  /** 폴링 최대 대기 시간(ms). 기본 3분 */
  maxPollingTime?: number;
  /** 폴링 간격(ms). 기본 2초 */
  pollingInterval?: number;
}

export class FashnConfigError extends Error {}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getFashnClient = (apiKey?: string) => {
  const key = process.env.FASHN_API_KEY || apiKey;
  if (!key) {
    throw new FashnConfigError(
      "FASHN_API_KEY 가 설정되지 않았습니다. .env.local 에 키를 추가하세요."
    );
  }
  return new Fashn({ apiKey: key, baseURL: FASHN_ENDPOINT_URL });
};

/**
 * 한 벌의 가먼트를 입힌 뒤 결과 이미지 URL 목록을 반환한다.
 * 예측이 끝날 때까지 폴링하며, 실패하면 예외를 던진다.
 */
export async function runTryOn(
  options: TryOnOptions,
  apiKey?: string
): Promise<string[]> {
  const {
    modelImage,
    garmentImage,
    category = "auto",
    garmentPhotoType = "auto",
    mode = "balanced",
    segmentationFree = true,
    seed = 42,
    numSamples = 1,
    modelName = "tryon-v1.6",
    maxPollingTime = 180 * 1000,
    pollingInterval = 2 * 1000,
  } = options;

  const client = getFashnClient(apiKey);

  const payload = {
    model_name: modelName,
    inputs: {
      model_image: modelImage,
      garment_image: garmentImage,
      category,
      garment_photo_type: garmentPhotoType,
      mode,
      segmentation_free: segmentationFree,
      seed,
      num_samples: numSamples,
    },
    // SDK 타입은 model_name 을 리터럴 유니온으로 좁히지만 런타임 선택을 허용한다.
  } as unknown as Fashn.PredictionRunParams;

  const runResponse = await client.predictions.run(payload);
  const predictionId = runResponse.id;
  if (!predictionId) {
    throw new Error("FASHN API 로부터 prediction ID 를 받지 못했습니다.");
  }

  const startTime = Date.now();
  while (Date.now() - startTime < maxPollingTime) {
    const statusData = await client.predictions.status(predictionId);

    if (statusData.status === "completed") {
      const output = statusData.output ?? [];
      if (!output.length) {
        throw new Error("FASHN 예측이 완료됐지만 결과 이미지가 없습니다.");
      }
      return output;
    }

    if (
      statusData.status === "failed" ||
      statusData.status === "canceled" ||
      statusData.status === "time_out"
    ) {
      throw new Error(
        `FASHN 예측 실패 (${statusData.status}): ${
          statusData.error?.message || "알 수 없는 원인"
        }`
      );
    }

    await delay(pollingInterval);
  }

  throw new Error("FASHN 예측 폴링 시간이 초과되었습니다 (3분).");
}

/**
 * 스튜디오의 가먼트 슬롯(한글)을 FASHN 카테고리로 매핑한다.
 * 매핑이 없는 슬롯(액세서리 등)은 try-on 모델이 지원하지 않으므로 null.
 */
const SLOT_CATEGORY_MAP: Record<string, FashnCategory> = {
  상의: "tops",
  하의: "bottoms",
  아웃터: "tops",
  원피스: "one-pieces",
  드레스: "one-pieces",
};

export const slotToCategory = (slot: string): FashnCategory | null =>
  SLOT_CATEGORY_MAP[slot] ?? null;

/** try-on 모델이 처리할 수 없는 액세서리 슬롯인지 여부 */
export const isUnsupportedSlot = (slot: string) => slotToCategory(slot) === null;
