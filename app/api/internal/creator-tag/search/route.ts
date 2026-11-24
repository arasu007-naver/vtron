import { creatorTagAuthorized } from "@/lib/creator-tag/auth";
import { parseSearchBody } from "@/lib/creator-tag/core";
import { buildResponse, err } from "@/lib/creator-tag/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/internal/creator-tag/search — 수정된 텍스트로 재검색. 아무것도 저장하지 않는다. */
export async function POST(req: Request) {
  if (!creatorTagAuthorized(req)) return err("unauthorized", 401);

  const raw = await req.json().catch(() => null);
  const parsed = parseSearchBody(raw);
  if (!parsed.ok) return err(parsed.error, 400);

  return buildResponse({ ...parsed.data, confidence: null });
}
