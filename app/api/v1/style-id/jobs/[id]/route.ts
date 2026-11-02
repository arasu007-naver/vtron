import { NextResponse } from "next/server";
import { withBusinessApi } from "@/lib/business-user/api-call";
import { getJob, itemView, jobView, listItems, primeSummary, type ItemStatus } from "@/lib/style-id-api/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: ItemStatus[] = ["prime", "queued", "running", "done", "failed"];
const CSV_PAGE = 1000;

const csvCell = (v: unknown) => {
  const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * GET /api/v1/style-id/jobs/:id — 작업 진행 · 결과
 *   ?offset=0&limit=100   상품 결과를 요청 순서(seq)로 나눠 받는다 (limit 최대 500)
 *   ?status=done|failed|queued|running|prime   그 상태의 상품만
 *   ?format=csv           상품 결과 전부를 CSV 로 (seq, ref, status, prime_group, prime_target, style_id, candidates, error)
 *
 * 작업은 대표 의복 단계(priming — 모든 상품의 대표 의복을 JEV 로 먼저 정한다) → 관찰 단계(running — 그룹마다 모아서) 로 돈다.
 *
 * 200 { request_id, job: { job_id, status, total, done, failed, pending, created_at, finished_at },
 *       prime: { primed, groups: { found, not_found, no_product }, categories: { Jacket: 12, … } },
 *       items: [{ seq, ref, status, prime_group, style_id, style, candidates, axes, prime_target, error, elapsed_ms, finished_at }],
 *       offset, limit }
 * 404 다른 업체의 작업이거나 없는 작업
 */
export const GET = withBusinessApi(async (req, ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const notFound = () => {
    ctx.log.error = "작업 없음";
    return NextResponse.json({ request_id: ctx.request_id, ok: false, error: "작업을 찾을 수 없습니다." }, { status: 404 });
  };
  if (!UUID.test(id)) return notFound();
  const job = await getJob(id, ctx.business_user_id);
  if (!job) return notFound();

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status = STATUSES.includes(statusParam as ItemStatus) ? (statusParam as ItemStatus) : null;
  ctx.log.request = { job_id: id, format: url.searchParams.get("format") ?? "json" };
  ctx.log.response = { job_status: job.job_status };

  if (url.searchParams.get("format") === "csv") {
    const lines = [["seq", "ref", "status", "prime_group", "prime_target", "style_id", "candidates", "error"].join(",")];
    for (let offset = 0; offset < job.item_total; offset += CSV_PAGE) {
      const rows = await listItems(id, { offset, limit: CSV_PAGE, status });
      for (const it of rows) {
        const r = (it.result ?? {}) as { candidates?: { style_id: string }[]; prime_target?: string | null };
        lines.push(
          [it.seq, it.ref, it.status, it.prime_group, r.prime_target, it.style_id, (r.candidates ?? []).map((c) => c.style_id).join(" "), it.error]
            .map(csvCell)
            .join(",")
        );
      }
      if (rows.length < CSV_PAGE) break;
    }
    return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="style-id-job-${id}.csv"`,
      },
    });
  }

  const offset = Math.max(0, Math.trunc(Number(url.searchParams.get("offset") ?? "0")) || 0);
  const limit = Math.min(Math.max(1, Math.trunc(Number(url.searchParams.get("limit") ?? "100")) || 100), 500);
  const [items, prime] = await Promise.all([listItems(id, { offset, limit, status }), primeSummary(id, job.item_total)]);
  return NextResponse.json({ request_id: ctx.request_id, job: jobView(job), prime, items: items.map(itemView), offset, limit });
});
