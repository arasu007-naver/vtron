import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import type { ProductContext } from "./product-context";

/**
 * 상품 Style ID 저장 (supabase/migrations/0014_product_style.sql · 0021_product_style_target.sql).
 *
 * 상품 사진으로 추출한 결과를 `product_style` 에 한 행으로 남긴다. target 은 어느 페이지가 추출했는지 —
 * item = /style-ex 의복별 · full = 인덱스(/full-style-ex) 착장 전체. 실패한 추출도 남긴다 —
 * 어느 상품이 왜 안 되는지 보이게. service role 로 쓴다(표에 RLS 정책이 없다).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Obj = Record<string, unknown>;

export interface ProductStyleInput {
  /** item = /style-ex · full = 인덱스(/full-style-ex) */
  target: "item" | "full";
  /** 관찰 프롬프트 버전 레이블 (prompt-versions.ts versionLabel) — v1.1 · v2 · custom */
  version?: string | null;
  modelId: string;
  imageUrl: string;
  /** extractStyle 의 결과 그대로 */
  result: {
    customPrompt: boolean;
    /** 추출에 쓴 프롬프트 버전 (prompt-versions.ts) — 등록되지 않은 내용이면 null */
    promptVersions: { prompt: { id: string } | null; judgePrompt: { id: string } | null };
    styleId: Obj | null;
    scoring: unknown;
    judgement: Obj | null;
    observation: Obj;
  };
  visionModel: string;
  elapsedMs: number;
  /** 로그인한 사용자. 서버 키로 부른 경우처럼 uuid 가 아니면 비운다. */
  userId: string;
}

/**
 * 카탈로그 모델 id → 관찰 프롬프트에 붙일 상품 이름 · 분류 (brand_catalog_models).
 * 못 찾거나 읽지 못하면 null — 상품 정보 없이 이미지만으로 대표 의복을 고른다.
 */
export async function productContextOf(modelId: string): Promise<ProductContext | null> {
  const { data, error } = await getAdminSupabase()
    .from("brand_catalog_models")
    .select("name, whole_category_name")
    .eq("id", modelId)
    .maybeSingle();
  if (error || !data?.name) return null;
  return { name: String(data.name), category: data.whole_category_name ? String(data.whole_category_name) : null };
}

/**
 * 저장 결과. recorded = target · version 열(0021)에 실제로 기록했는지 —
 * 0021 전이면 /style-ex(item) 는 그 둘 없이 저장하고 recorded false 로 알린다.
 */
export interface SavedProductStyle {
  id: string;
  target: "item" | "full";
  version: string | null;
  recorded: boolean;
}

/** 추출 결과 → product_style 한 행의 결과 · 근거 열 (/style-ex · /full-style-ex · API 작업이 같이 쓴다) */
function rowOf(input: Omit<ProductStyleInput, "target" | "version" | "modelId" | "imageUrl">) {
  const { styleId, observation, judgement } = input.result;
  const ok = styleId?.ok === true;
  const observationError = observation?.ok === false ? observation.error : null;
  const error = ok
    ? null
    : String(
        (styleId?.error as string | undefined) ??
          (observationError ? JSON.stringify(observationError) : "스타일 아이디를 정하지 못했습니다.")
      );

  return {
    ok,
    style_id: ok ? styleId?.style_id : null,
    target_id: styleId?.target_id ?? null,
    axes: styleId?.axes ?? null,
    error,
    scoring: input.result.scoring ?? null,
    judgement: judgement ?? null,
    observation,
    custom_prompt: input.result.customPrompt,
    // 버전 열(0015)은 값이 있을 때만 보낸다 — 버전이 있으면 0015 가 적용된 것이고,
    // 0015 전이면 버전이 늘 null 이라 열 없이도 저장된다.
    ...(input.result.promptVersions.prompt && { observe_prompt_version_id: input.result.promptVersions.prompt.id }),
    ...(input.result.promptVersions.judgePrompt && { judge_prompt_version_id: input.result.promptVersions.judgePrompt.id }),
    vision_model: input.visionModel,
    judge_model: (judgement?.model as string | undefined) ?? null,
    elapsed_ms: Math.round(input.elapsedMs),
    created_by: UUID.test(input.userId) ? input.userId : null,
  };
}

export async function saveProductStyle(input: ProductStyleInput): Promise<SavedProductStyle> {
  const row = { model_id: input.modelId, image_url: input.imageUrl, ...rowOf(input) };

  // 어느 페이지(target) · 어느 관찰 프롬프트 버전(version)으로 추출했는지 — 두 페이지 모두 늘 기록한다
  const version = input.version ?? null;
  const insert = (extra: Record<string, unknown>) =>
    getAdminSupabase().from("product_style").insert({ ...extra, ...row }).select("id").single();
  let { data, error: dbError } = await insert({ target: input.target, version });
  let recorded = true;
  const missing0021 = dbError && /\b(target|version)\b/.test(dbError.message);
  if (missing0021 && input.target === "item") {
    // 0021 전: /style-ex 저장은 멈추지 않는다 — 열 없이 저장하고(기본값 item) recorded false 로 알린다
    console.warn("[style-ex] product_style 에 target · version 열이 없어(0021 전) 빼고 저장합니다:", dbError!.message);
    ({ data, error: dbError } = await insert({}));
    recorded = false;
  } else if (missing0021) {
    // full 을 열 없이 저장하면 item 으로 잘못 남는다 — 저장하지 않는다
    throw new Error(`product_style 에 target · version 열이 없습니다. supabase/migrations/0021_product_style_target.sql 을 실행하세요. (${dbError!.message})`);
  }
  if (dbError || !data) throw new Error(`product_style 저장 실패: ${dbError?.message ?? "응답 없음"}`);
  return { id: String(data.id), target: input.target, version, recorded };
}

/** API 작업 상품 하나 (api_call_items) — 그 결과를 product_style 에 남길 때 */
export interface ApiJobProductStyleInput extends Omit<ProductStyleInput, "target" | "modelId" | "imageUrl" | "userId"> {
  apiCallItemId: string;
  businessUserId: string | null;
  /** 업체 상품 id (api_call_items.ref) — 카탈로그 모델 id 와 같으면 model_id 로 남긴다 */
  ref: string | null;
  /** 업체가 준 상품 정보 그대로 (api_call_items.product) */
  product: Obj;
  /** 사진 주소 — 파일로 받은 사진이면 null */
  imageUrl: string | null;
}

/**
 * API 작업(POST /api/v1/style-id/jobs · /admin/api-log 의 CSV 입력)의 상품 결과를 product_style 에 남긴다 (0029).
 * 작업 상품 하나에 한 행 — 다시 진행해 다시 추출하면 그 행을 고친다(upsert on api_call_item_id).
 * target 은 item (같은 의복별 관찰 프롬프트 · 판정 함수). model_id 는 ref 가 카탈로그에 있을 때만 채운다.
 */
export async function saveApiJobProductStyle(input: ApiJobProductStyleInput): Promise<{ id: string; modelId: string | null }> {
  const db = getAdminSupabase();
  let modelId: string | null = null;
  if (input.ref) {
    const { data } = await db.from("brand_catalog_models").select("id").eq("id", input.ref).maybeSingle();
    modelId = data?.id ? String(data.id) : null;
  }
  const row = {
    ...rowOf({ ...input, userId: "" }),
    // API 작업 행은 처음 만든 시각이 아니라 마지막으로 추출한 시각 — 다시 진행하면 최신 결과가 된다
    created_at: new Date().toISOString(),
    target: "item",
    version: input.version ?? null,
    model_id: modelId,
    image_url: input.imageUrl,
    api_call_item_id: input.apiCallItemId,
    business_user_id: input.businessUserId,
    product: input.product,
  };
  const { data, error } = await db.from("product_style").upsert(row, { onConflict: "api_call_item_id" }).select("id").single();
  if (error || !data) {
    const hint = error && /api_call_item_id|business_user_id|product\b|null value/.test(error.message)
      ? " — supabase/migrations/0029_product_style_api_jobs.sql 을 실행했는지 확인하세요"
      : "";
    throw new Error(`product_style 저장 실패: ${error?.message ?? "응답 없음"}${hint}`);
  }
  return { id: String(data.id), modelId };
}
