/**
 * NAVER CLOVA OCR — Document OCR 사업자등록증 특화 모델.
 *
 * NCP 콘솔에서 Document OCR(사업자등록증) 도메인을 만들고 받은 값을 서버 환경변수로만 둔다.
 *   CLOVA_OCR_INVOKE_URL  APIGW Invoke URL. `/document/biz-license` 로 끝나지 않으면 붙여 부른다.
 *   CLOVA_OCR_SECRET      X-OCR-SECRET
 *
 * 응답 필드(images[0].bizLicense.result.*)는 NCP 문서 기준으로 매핑했지만, 모델 버전에 따라 이름이 다를 수
 * 있어 후보 키를 여러 개 본다. 매핑하지 못하면 필드가 비고 → 화면에서 `pending_review` 로 수동 입력한다.
 *
 * 로그에 이미지 · 응답 원문을 찍지 않는다.
 */
import { randomUUID } from "node:crypto";
import { normalizeBizNo, normalizeBusinessName } from "./biz-no";

export interface OcrField {
  value: string;
  confidence: number | null;
}

export interface BizLicenseExtraction {
  business_number: string | null;
  business_name: string | null;
  representative: string | null;
  opening_date: string | null;
  /** 사업자번호 · 상호 신뢰도 중 낮은 쪽(0–1). 응답에 신뢰도가 없으면 null */
  confidence: number | null;
  fields: Partial<Record<"business_number" | "business_name" | "representative" | "opening_date", OcrField>>;
}

/** `ocr_raw` 에 넣는 값 — 응답 원문 중 추출 결과와 신뢰도만(좌표 · 마스킹 정보는 버린다) */
export interface OcrRaw {
  engine: "clova-biz-license";
  request_id: string;
  infer_result: string | null;
  message: string | null;
  result: Record<string, { text: string; formatted?: unknown; confidence: number | null }[]>;
  extracted_at: string;
}

export class OcrError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "OcrError";
  }
}

/** 이 아래면 사람이 다시 본다 */
export const LOW_CONFIDENCE = 0.8;
const TIMEOUT_MS = 30_000;

export const hasClovaOcrEnv = () =>
  Boolean(process.env.CLOVA_OCR_INVOKE_URL?.trim() && process.env.CLOVA_OCR_SECRET?.trim());

function endpoint(): string {
  const base = (process.env.CLOVA_OCR_INVOKE_URL ?? "").trim().replace(/\/+$/, "");
  return /\/document\/biz-license$/.test(base) ? base : `${base}/document/biz-license`;
}

const FORMAT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

type ClovaField = {
  text?: string;
  formatted?: { value?: string; year?: string; month?: string; day?: string };
  confidenceScore?: number;
  inferConfidence?: number;
};

const FIELD_KEYS = {
  business_number: ["registerNumber", "bizNum", "registrationNumber"],
  business_name: ["companyName", "corpName"],
  representative: ["repName"],
  opening_date: ["openDate"],
} as const;

function fieldText(f: ClovaField, key: keyof typeof FIELD_KEYS): string {
  const fm = f.formatted;
  if (key === "opening_date" && fm?.year && fm.month && fm.day) {
    return `${fm.year}-${fm.month.padStart(2, "0")}-${fm.day.padStart(2, "0")}`;
  }
  return (fm?.value || f.text || "").trim();
}

function fieldConfidence(f: ClovaField): number | null {
  const c = f.confidenceScore ?? f.inferConfidence;
  return typeof c === "number" && Number.isFinite(c) ? c : null;
}

/** CLOVA 응답 → 출력 스키마. 테스트하려고 내보낸다. */
export function mapClovaResponse(body: unknown, requestId: string): { extraction: BizLicenseExtraction; raw: OcrRaw } {
  const image = (body as { images?: Record<string, unknown>[] })?.images?.[0] ?? {};
  const result = ((image.bizLicense as { result?: Record<string, ClovaField[]> })?.result ?? {}) as Record<
    string,
    ClovaField[]
  >;

  const pick = (key: keyof typeof FIELD_KEYS): OcrField | undefined => {
    for (const k of FIELD_KEYS[key]) {
      const f = result[k]?.find((x) => fieldText(x, key));
      if (f) return { value: fieldText(f, key), confidence: fieldConfidence(f) };
    }
    return undefined;
  };

  const fields: BizLicenseExtraction["fields"] = {};
  for (const key of Object.keys(FIELD_KEYS) as (keyof typeof FIELD_KEYS)[]) {
    const f = pick(key);
    if (f) fields[key] = f;
  }

  const number = fields.business_number ? normalizeBizNo(fields.business_number.value) : "";
  const name = fields.business_name ? normalizeBusinessName(fields.business_name.value) : "";
  const scores = [fields.business_number?.confidence, fields.business_name?.confidence].filter(
    (c): c is number => typeof c === "number"
  );

  const raw: OcrRaw = {
    engine: "clova-biz-license",
    request_id: requestId,
    infer_result: typeof image.inferResult === "string" ? image.inferResult : null,
    message: typeof image.message === "string" ? image.message : null,
    result: Object.fromEntries(
      Object.entries(result).map(([k, arr]) => [
        k,
        (Array.isArray(arr) ? arr : []).map((f) => ({
          text: f.text ?? "",
          ...(f.formatted && { formatted: f.formatted }),
          confidence: fieldConfidence(f),
        })),
      ])
    ),
    extracted_at: new Date().toISOString(),
  };

  return {
    extraction: {
      business_number: number || null,
      business_name: name || null,
      representative: fields.representative?.value || null,
      opening_date: fields.opening_date?.value || null,
      confidence: scores.length ? Math.min(...scores) : null,
      fields,
    },
    raw,
  };
}

async function callOnce(data: Buffer, mime: string, requestId: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OCR-SECRET": process.env.CLOVA_OCR_SECRET ?? "",
      },
      body: JSON.stringify({
        version: "V2",
        requestId,
        timestamp: Date.now(),
        images: [{ format: FORMAT_BY_MIME[mime] ?? "jpg", name: "biz-license", data: data.toString("base64") }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new OcrError(timeout ? "OCR 응답 시간 초과" : "OCR 서버에 연결하지 못했습니다.", true);
  }

  if (!res.ok) {
    // 본문에 요청 이미지가 되돌아올 수 있어 상태 코드만 남긴다
    throw new OcrError(`OCR 호출 실패 (HTTP ${res.status})`, res.status >= 500);
  }
  return res.json();
}

/** 등록증 이미지에서 사업자번호 · 상호 등을 뽑는다. 타임아웃 · 5xx · 연결 실패는 한 번 더 부른다. */
export async function extractBizLicense(
  data: Buffer,
  mime: string
): Promise<{ extraction: BizLicenseExtraction; raw: OcrRaw }> {
  if (!hasClovaOcrEnv()) {
    throw new OcrError("CLOVA_OCR_INVOKE_URL · CLOVA_OCR_SECRET 환경변수가 없습니다.", false);
  }
  const requestId = randomUUID();
  let body: unknown;
  try {
    body = await callOnce(data, mime, requestId);
  } catch (err) {
    if (!(err instanceof OcrError) || !err.retryable) throw err;
    body = await callOnce(data, mime, requestId);
  }

  const mapped = mapClovaResponse(body, requestId);
  if (mapped.raw.infer_result && mapped.raw.infer_result !== "SUCCESS") {
    throw new OcrError(`OCR 추론 실패 (${mapped.raw.infer_result}${mapped.raw.message ? `: ${mapped.raw.message}` : ""})`, false);
  }
  return mapped;
}
