import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { drainStyleIdQueue } from "@/lib/style-id-api/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

const BUDGET_MS = 740_000;

/** STYLE_ID_WORKER_SECRET, 없으면 CRON_SECRET(Vercel 크론이 Authorization: Bearer 로 보낸다) */
const secret = () => process.env.STYLE_ID_WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null;

function authorized(req: Request) {
  const want = secret();
  const got = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]?.trim();
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST · GET /api/internal/style-id-queue — 대량 Style ID 큐를 돈다 (lib/style-id-api/worker.ts)
 *   Authorization: Bearer $STYLE_ID_WORKER_SECRET (또는 $CRON_SECRET)
 * 큐가 비거나 시간 예산이 다 될 때까지 돌고 { processed, outOfBudget, error } 를 준다.
 * 크론(GET) · scripts/style-id-worker.mjs(POST 를 되풀이)가 부른다. 키가 설정되지 않았으면 늘 401.
 */
async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await drainStyleIdQueue({ budgetMs: BUDGET_MS });
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}

export const POST = handle;
export const GET = handle;
