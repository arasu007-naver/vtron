import { NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  PromptVersionError,
  createPromptVersion,
  isPromptKind,
  listPromptVersions,
} from "@/lib/style-ex/prompt-versions";

export const runtime = "nodejs";

const errorResponse = (e: unknown) =>
  NextResponse.json(
    { error: e instanceof Error ? e.message : String(e) },
    { status: e instanceof PromptVersionError ? e.status : 500 }
  );

/**
 * GET /api/style-ex/prompts?kind=observe|judge — 그 종류의 프롬프트 버전 목록 (최신 먼저)
 *   응답: { versions: PromptVersion[] }
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const kind = new URL(request.url).searchParams.get("kind");
  if (!isPromptKind(kind)) {
    return NextResponse.json({ error: "kind 는 observe 또는 judge 여야 합니다." }, { status: 400 });
  }
  try {
    return NextResponse.json({ versions: await listPromptVersions(kind) });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * POST /api/style-ex/prompts — 새 버전 등록
 *   body: { kind: "observe" | "judge", content, note?, activate? }
 *   응답: { version: PromptVersion } · 같은 내용이 이미 있으면 409
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isPromptKind(body.kind) || typeof body.content !== "string") {
    return NextResponse.json({ error: "kind(observe | judge) 와 content 가 필요합니다." }, { status: 400 });
  }
  try {
    const version = await createPromptVersion({
      kind: body.kind,
      content: body.content,
      note: typeof body.note === "string" ? body.note : null,
      activate: body.activate === true,
      userId: auth.user.id,
    });
    return NextResponse.json({ version }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
