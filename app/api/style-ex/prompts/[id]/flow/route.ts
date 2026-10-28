import { NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { PromptVersionError, getFlowDoc, setFlowDoc } from "@/lib/style-ex/prompt-versions";

export const runtime = "nodejs";

/* 관찰 프롬프트 버전의 흐름도(HTML 문서) — 버전 하나에 하나 (supabase/migrations/0022_prompt_flow_doc.sql).
   화면은 받은 HTML 을 스크립트를 막은 iframe(srcDoc)으로 보인다. */

const errorResponse = (e: unknown) =>
  NextResponse.json(
    { error: e instanceof Error ? e.message : String(e) },
    { status: e instanceof PromptVersionError ? e.status : 500 }
  );

/**
 * GET /api/style-ex/prompts/:id/flow — 그 버전의 흐름도
 *   응답: { flow: { id, version, doc: HTML | null, updated_at, from: { id, version } | null } }
 *         from 이 있으면 그 버전에서 물려받은 흐름도다(이 버전용으로 고쳐 올리지 않음).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  try {
    const { id } = await params;
    return NextResponse.json({ flow: await getFlowDoc(id) });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * PUT /api/style-ex/prompts/:id/flow — 그 버전의 흐름도를 넣거나 바꾼다 (물려받음 표시는 지운다)
 *   body: { html }   응답: { flow }
 * 프롬프트 내용은 버전마다 고정이지만, 흐름도는 문서라 고쳐 올릴 수 있다.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  const body = (await request.json().catch(() => null)) as { html?: unknown } | null;
  if (typeof body?.html !== "string") return NextResponse.json({ error: "html 이 필요합니다." }, { status: 400 });
  try {
    const { id } = await params;
    return NextResponse.json({ flow: await setFlowDoc(id, body.html) });
  } catch (e) {
    return errorResponse(e);
  }
}
