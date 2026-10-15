import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import type { ProductContext } from "./extract";

/**
 * 상품 Style ID 저장 (supabase/migrations/0014_product_style.sql).
 *
 * 상품 사진으로 추출한 결과를 `product_style` 에 한 행으로 남긴다. 실패한 추출도 남긴다 —
 * 어느 상품이 왜 안 되는지 보이게. service role 로 쓴다(표에 RLS 정책이 없다).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Obj = Record<string, unknown>;

export interface ProductStyleInput {
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
 * 카탈로그 모델 id → 관찰에 넘길 상품 이름 · 분류 (brand_catalog_models).
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

export async function saveProductStyle(input: ProductStyleInput): Promise<{ id: string }> {
  const { styleId, observation, judgement } = input.result;
  const ok = styleId?.ok === true;
  const observationError = observation?.ok === false ? observation.error : null;
  const error = ok
    ? null
    : String(
        (styleId?.error as string | undefined) ??
          (observationError ? JSON.stringify(observationError) : "스타일 아이디를 정하지 못했습니다.")
      );

  const { data, error: dbError } = await getAdminSupabase()
    .from("product_style")
    .insert({
      model_id: input.modelId,
      image_url: input.imageUrl,
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
    })
    .select("id")
    .single();
  if (dbError) throw new Error(`product_style 저장 실패: ${dbError.message}`);
  return { id: String(data.id) };
}
