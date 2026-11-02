#!/usr/bin/env node
/**
 * 대량 Style ID 큐 워커 — /api/internal/style-id-queue 를 되풀이해 부른다 (lib/style-id-api/worker.ts).
 *
 *   STYLE_ID_WORKER_SECRET=… STYLE_ID_WORKER_URL=http://localhost:8920 npm run worker:style-id
 *
 * 큐가 비면 POLL_MS(기본 15초) 쉬고 다시 부른다. 대량 작업을 서버 함수 하나의 시간 안에 끝낼 수 없을 때 띄워 둔다.
 * 여러 개 띄워도 같은 상품을 두 번 처리하지 않는다(DB 의 for update skip locked). 한 서버 프로세스 안의 동시 처리 수는
 * STYLE_ID_JOB_CONCURRENCY(서버 쪽, 기본 3)가 정한다.
 */
const base = (process.env.STYLE_ID_WORKER_URL || "http://localhost:8920").replace(/\/$/, "");
const secret = process.env.STYLE_ID_WORKER_SECRET || process.env.CRON_SECRET;
const pollMs = Number(process.env.POLL_MS) || 15_000;

if (!secret) {
  console.error("STYLE_ID_WORKER_SECRET(또는 CRON_SECRET)이 필요합니다.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let stop = false;
process.on("SIGINT", () => (stop = true));
process.on("SIGTERM", () => (stop = true));

while (!stop) {
  try {
    const res = await fetch(`${base}/api/internal/style-id-queue`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[worker] HTTP ${res.status}`, body.error ?? "");
      await sleep(pollMs);
      continue;
    }
    console.log(`[worker] ${new Date().toISOString()} 대표 의복 ${body.primed ?? 0} · 관찰 ${body.processed}${body.joined ? " (서버의 drain 에 합류)" : ""}${body.outOfBudget ? " · 예산 소진 — 바로 이어서" : ""}`);
    // 예산이 다 돼 멈췄으면 큐에 남은 것이 있다 — 쉬지 않고 다시 부른다
    if (!body.outOfBudget) await sleep(body.processed || body.primed ? 1000 : pollMs);
  } catch (e) {
    console.error("[worker]", e instanceof Error ? e.message : e);
    await sleep(pollMs);
  }
}
