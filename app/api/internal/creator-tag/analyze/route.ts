import { creatorTagAuthorized } from "@/lib/creator-tag/auth";
import { extractTag, AnthropicNotConfiguredError } from "@/lib/creator-tag/extract";
import { buildResponse, err } from "@/lib/creator-tag/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

/** POST /api/internal/creator-tag/analyze — multipart `image` → 태그 판독 + 판매 후보. 아무것도 저장하지 않는다. */
export async function POST(req: Request) {
  if (!creatorTagAuthorized(req)) return err("unauthorized", 401);

  const len = Number(req.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BYTES + 1024 * 1024) return err("이미지가 너무 큽니다 (5MB 이하).", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("multipart/form-data 가 필요합니다.", 400);
  }
  const file = form.get("image");
  if (!(file instanceof File)) return err("image 파일이 필요합니다.", 400);
  if (file.size > MAX_BYTES) return err("이미지가 너무 큽니다 (5MB 이하).", 413);
  const mediaType = TYPES[file.type.toLowerCase()];
  if (!mediaType) return err("JPG/PNG/WEBP 만 지원합니다.", 415);
  if (file.size === 0) return err("빈 이미지입니다.", 400);

  let tag;
  try {
    tag = await extractTag({ data: Buffer.from(await file.arrayBuffer()), mediaType });
  } catch (e) {
    console.error("[creator-tag] 태그 판독 실패:", e instanceof Error ? e.name : "error");
    return err(e instanceof AnthropicNotConfiguredError ? e.message : "태그 판독에 실패했습니다.", 503);
  }
  if (!tag.brandName && !tag.productName && !tag.styleCode && !tag.barcode) {
    return err("태그를 읽지 못했습니다.", 422);
  }
  return buildResponse(tag);
}

