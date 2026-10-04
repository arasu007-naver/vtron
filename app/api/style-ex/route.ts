import { NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { defaultPrompt, extractStyle } from "@/lib/style-ex/extract";
import { DEFAULT_JUDGE_PROMPT } from "@/lib/style-ex/judge";

// Vision 호출 + 스코어링(자식 프로세스) + LLM 판정까지 수 분이 걸릴 수 있으므로 Node 런타임에서 실행한다.
export const runtime = "nodejs";
export const maxDuration = 600;

/** Anthropic 이미지 입력 한도(5MB)에 맞춘다 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** GET /api/style-ex — 기본 프롬프트 (관찰 · 판정) */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  return NextResponse.json({ prompt: defaultPrompt(), judgePrompt: DEFAULT_JUDGE_PROMPT });
}

/**
 * POST /api/style-ex — multipart/form-data
 *   image       : 이미지 파일 (필수)
 *   prompt      : 관찰 프롬프트 (선택 — 비우면 엔진 기본 프롬프트)
 *   judgePrompt : 판정 프롬프트 (선택 — 비우면 판정 기본 프롬프트. 관찰값 JSON 은 서버가 뒤에 붙인다)
 *
 * 응답: { styleId: 대표 의복의 스타일 아이디(축별 글자 · 출처), scoring: 의복별 EI·SR·DM 엔진 결과,
 *        judgement: LLM 판정(TC · 엔진 대체), observation: 관찰 envelope, customPrompt }
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 가 설정되지 않았습니다. .env.local 에 추가하세요." },
      { status: 500 }
    );
  }

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "image 파일이 필요합니다." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "이미지는 5MB 이하만 지원합니다." }, { status: 400 });
  }
  const text = (key: string) => {
    const v = form?.get(key);
    return typeof v === "string" ? v : undefined;
  };

  try {
    const out = await extractStyle({
      image: Buffer.from(await image.arrayBuffer()),
      fileName: image.name || "image",
      prompt: text("prompt"),
      judgePrompt: text("judgePrompt"),
    });
    return NextResponse.json(out);
  } catch (e) {
    // 엔진은 지원하지 않는 이미지 바이트를 추측하지 않고 예외로 거절한다.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}
