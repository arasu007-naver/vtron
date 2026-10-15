import { NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { PromptVersionError, activatePromptVersion } from "@/lib/style-ex/prompt-versions";

export const runtime = "nodejs";

/**
 * PATCH /api/style-ex/prompts/:id — 버전 활성화 (지난 버전이면 롤백)
 *   body: { active: true }
 *   응답: { version: PromptVersion }
 *
 * 버전의 내용 · 메모는 고치지 않는다. 고치려면 새 버전을 등록한다.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.active !== true) {
    return NextResponse.json({ error: "{ active: true } 만 지원합니다." }, { status: 400 });
  }
  try {
    const { id } = await params;
    return NextResponse.json({ version: await activatePromptVersion(id) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: e instanceof PromptVersionError ? e.status : 500 }
    );
  }
}
