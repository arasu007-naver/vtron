import { NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import {
  PromptVersionError,
  createPromptVersion,
  isPromptKind,
  isPromptTarget,
  isTargetKind,
  listPromptVersions,
  type PromptTarget,
} from "@/lib/style-ex/prompt-versions";

export const runtime = "nodejs";

const errorResponse = (e: unknown) =>
  NextResponse.json(
    { error: e instanceof Error ? e.message : String(e) },
    { status: e instanceof PromptVersionError ? e.status : 500 }
  );

/** target 을 읽는다 — 없으면 item(/style-ex). 잘못된 값이면 null */
const targetOf = (v: unknown): PromptTarget | null => (v == null || v === "" ? "item" : isPromptTarget(v) ? v : null);

/**
 * GET /api/style-ex/prompts?kind=observe|judge[&target=item|full] — 그 (target, kind) 의 프롬프트 버전 목록 (최신 먼저)
 *   target 을 비우면 item (/style-ex). full 은 /full-style-id-extraction 이고 observe 만 있다.
 *   응답: { versions: PromptVersion[] }
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const target = targetOf(params.get("target"));
  if (!isPromptKind(kind)) {
    return NextResponse.json({ error: "kind 는 observe 또는 judge 여야 합니다." }, { status: 400 });
  }
  if (!target || !isTargetKind(target, kind)) {
    return NextResponse.json({ error: "target 은 item 또는 full 이고, full 은 observe 만 있습니다." }, { status: 400 });
  }
  try {
    return NextResponse.json({ versions: await listPromptVersions(kind, target) });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * POST /api/style-ex/prompts — 새 버전 등록
 *   body: { kind: "observe" | "judge", content, note?, activate?, target?: "item" | "full" (비우면 item),
 *           flowFrom?: 고치기 시작한 버전 id — 그 버전의 흐름도를 물려받는다 }
 *   응답: { version: PromptVersion } · 같은 내용이 이미 있으면 409
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isPromptKind(body.kind) || typeof body.content !== "string") {
    return NextResponse.json({ error: "kind(observe | judge) 와 content 가 필요합니다." }, { status: 400 });
  }
  const target = targetOf(body.target);
  if (!target) return NextResponse.json({ error: "target 은 item 또는 full 이어야 합니다." }, { status: 400 });
  try {
    const version = await createPromptVersion({
      target,
      kind: body.kind,
      content: body.content,
      note: typeof body.note === "string" ? body.note : null,
      activate: body.activate === true,
      userId: auth.user.id,
      flowFrom: typeof body.flowFrom === "string" ? body.flowFrom : null,
    });
    return NextResponse.json({ version }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
