import { creatorTagAuthorized } from "@/lib/creator-tag/auth";
import { extractTag, AnthropicNotConfiguredError } from "@/lib/creator-tag/extract";
import { checkImage, isUnreadable, MAX_IMAGE_BYTES } from "@/lib/creator-tag/core";
import { buildResponse, err } from "@/lib/creator-tag/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** POST /api/internal/creator-tag/analyze — multipart `image` → 태그 판독 + 판매 후보. 아무것도 저장하지 않는다. */
export async function POST(req: Request) {
  if (!creatorTagAuthorized(req)) return err("unauthorized", 401);

  const len = Number(req.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_IMAGE_BYTES + 1024 * 1024) return err("이미지가 너무 큽니다 (5MB 이하).", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("multipart/form-data 가 필요합니다.", 400);
  }
  const file = form.get("image");
  if (!(file instanceof File)) return err("image 파일이 필요합니다.", 400);
  const check = checkImage(file);
  if (!check.ok) return err(check.error, check.status);
  const mediaType = check.mediaType;

  let tag;
  try {
    tag = await extractTag({ data: Buffer.from(await file.arrayBuffer()), mediaType });
  } catch (e) {
    console.error("[creator-tag] 태그 판독 실패:", e instanceof Error ? e.name : "error");
    return err(e instanceof AnthropicNotConfiguredError ? e.message : "태그 판독에 실패했습니다.", 503);
  }
  if (isUnreadable(tag)) {
    return err("태그를 읽지 못했습니다.", 422);
  }
  return buildResponse(tag);
}

