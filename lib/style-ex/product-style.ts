import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";

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
