import { NextResponse } from "next/server";
import { MISSING_KEY_MESSAGE, anthropicApiKey } from "@/lib/style-ex/api-key";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { cropObservedRegions } from "@/lib/style-ex/crop";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/style-ex/crops — multipart/form-data
 *   image    : 추출에 쓴 이미지 파일 (필수)
 *   envelope : /api/style-ex 응답의 observation.envelope JSON 문자열 (필수)
 *
 * 부위가 정해진 관찰값마다 256×256 크롭을 로컬 폴더(STYLE_EX_CROP_DIR, 기본 .style-ex-crops/)에 저장한다.
 * 응답: { ok, dir, model, crops: [{ param, value, component, descriptor, found, file, data_url, … }], skipped }
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  if (!anthropicApiKey()) {
    return NextResponse.json(
      { error: MISSING_KEY_MESSAGE },
      { status: 500 }
    );
  }

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const envelopeText = form?.get("envelope");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "image 파일이 필요합니다." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "이미지는 5MB 이하만 지원합니다." }, { status: 400 });
  }
  let envelope;
  try {
    envelope = JSON.parse(typeof envelopeText === "string" ? envelopeText : "");
  } catch {
    return NextResponse.json({ error: "envelope JSON 이 필요합니다 (추출 결과의 observation.envelope)." }, { status: 400 });
  }

  try {
    const out = await cropObservedRegions({
      image: Buffer.from(await image.arrayBuffer()),
      fileName: image.name || "image",
      envelope,
    });
    return NextResponse.json(out, { status: out.ok ? 200 : 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
