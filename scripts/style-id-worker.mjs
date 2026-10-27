#!/usr/bin/env node
/**
 * 스타일 아이디 비동기 작업 워커 — POST /api/v1/style-id/jobs 가 쌓은 style_id_job 을 처리한다.
 * Next 요청과 분리된 장기 실행 프로세스다. 여러 대(여러 프로세스)를 띄워도 된다.
 *
 *   npm run worker:style-id             # 계속 돈다 (SIGTERM · Ctrl-C = 진행 중인 작업을 끝내고 멈춤)
 *   npm run worker:style-id -- --once   # 지금 집을 수 있는 작업만 처리하고 끝낸다
 *
 * 환경 변수(.env · .env.local 을 Next 와 같은 규칙으로 읽는다)
 *   STYLE_ID_WORKER_CONCURRENCY   이 프로세스가 동시에 처리할 작업 수 (기본 4)
 *   STYLE_ID_WORKER_LEASE_SEC     작업 lease 길이(초, 기본 120). lease/3 마다 늘린다(heartbeat).
 *                                 워커가 죽으면 이 시간이 지난 뒤 다른 워커가 이어받는다.
 *   STYLE_ID_WORKER_POLL_MS       집을 작업이 없을 때 다시 볼 간격 (기본 2000)
 *   STYLE_ID_RETRY_BASE_MS        일시 오류 재시도 기준 대기 (기본 30000) — 지수 백오프 + 지터
 *   STYLE_ID_RETRY_CAP_MS         재시도 대기 상한 (기본 900000)
 *   STYLE_ID_DEAD_IMAGE_RETENTION_DAYS  dead 작업 이미지 보존 기간(일, 기본 7) — 그동안 관리자가 다시 실행할 수 있다
 *   STYLE_ID_PURGE_INTERVAL_MS    보존 기간이 지난 dead 이미지를 지우는 간격 (기본 3600000)
 *
 * 흐름: claim_style_id_jobs()로 업체별로 번갈아 집기 → 이미지 내려받기 → runStyleId(동기 엔드포인트와 같은 판정)
 *       → finish_style_id_job()  succeeded | failed(판정 실패 등 영구) | retry(429 · 529 · 5xx · 타임아웃 · 네트워크)
 *       retry 가 max_attempts 에 닿으면 dead.
 *       succeeded · failed 의 이미지는 바로 지우고, dead 의 이미지는 보존 기간이 지난 뒤 지운다(image_deleted_at).
 * 스키마는 supabase/migrations/0020_style_id_job.sql.
 */

import { hostname } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createJiti } from "jiti";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 스코어링 엔진은 process.cwd() 기준으로 읽힌다(lib/style-ex/scoring.ts)
process.chdir(ROOT);
// lib/supabase/server.ts 가 모듈을 읽을 때 env 를 보므로 lib 을 읽기 전에 채운다
nextEnv.loadEnvConfig(ROOT, false, { info: () => {}, error: console.error });

// lib/**/*.ts 를 Next 없이 그대로 읽는다 — 동기 엔드포인트와 같은 코드로 판정한다
const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": `${ROOT}/`,
    "server-only": path.join(ROOT, "scripts/lib/server-only-shim.mjs"),
  },
});
const { getAdminSupabase } = await jiti.import("../lib/supabase/server.ts");
const { anthropicApiKey } = await jiti.import("../lib/style-ex/api-key.ts");
const { runStyleId, sniffImage } = await jiti.import("../lib/business-user/style-id.ts");
const { DEFAULT_DEAD_IMAGE_RETENTION_DAYS, JOB_BUCKET, JOB_TABLE, deletesImageNow } = await jiti.import(
  "../lib/business-user/style-id-job.ts"
);
const { backoffMs, classifyFailure, errorInfoOf } = await jiti.import("../lib/business-user/job-retry.ts");

const envInt = (name, fallback) => {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const CONCURRENCY = envInt("STYLE_ID_WORKER_CONCURRENCY", 4);
const LEASE_SEC = envInt("STYLE_ID_WORKER_LEASE_SEC", 120);
const HEARTBEAT_MS = Math.max(1000, Math.floor((LEASE_SEC * 1000) / 3));
const POLL_MS = envInt("STYLE_ID_WORKER_POLL_MS", 2000);
const BACKOFF = {
  baseMs: envInt("STYLE_ID_RETRY_BASE_MS", 30_000),
  capMs: envInt("STYLE_ID_RETRY_CAP_MS", 15 * 60_000),
};
const DEAD_IMAGE_RETENTION_DAYS = envInt("STYLE_ID_DEAD_IMAGE_RETENTION_DAYS", DEFAULT_DEAD_IMAGE_RETENTION_DAYS);
const PURGE_INTERVAL_MS = envInt("STYLE_ID_PURGE_INTERVAL_MS", 60 * 60_000);
const PURGE_BATCH = 100;
const ONCE = process.argv.includes("--once");
const WORKER_ID = `${hostname()}:${process.pid}:${randomBytes(3).toString("hex")}`;

const log = (...args) => console.log(new Date().toISOString(), `[style-id-worker ${WORKER_ID}]`, ...args);
const warn = (...args) => console.warn(new Date().toISOString(), `[style-id-worker ${WORKER_ID}]`, ...args);

if (!anthropicApiKey()) {
  console.error("[style-id-worker] ANTHROPIC_API_KEY(또는 CLAUDE_API_KEY)가 없습니다. .env.local 을 확인하세요.");
  process.exit(1);
}
const db = getAdminSupabase();

// ── 종료 ─────────────────────────────────────────────────────────────────────
let stopping = false;
let wake = null;
const sleep = (ms) =>
  new Promise((resolve) => {
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      wake = null;
      resolve();
    }
    wake = done;
  });

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    if (stopping) {
      warn(`${sig} 다시 받음 — 진행 중인 작업 ${active.size}건을 버리고 끝냅니다(lease 가 지나면 다른 워커가 이어받습니다).`);
      process.exit(1);
    }
    stopping = true;
    log(`${sig} — 새 작업은 집지 않고 진행 중인 작업 ${active.size}건을 끝낸 뒤 멈춥니다.`);
    wake?.();
  });
}

// ── 작업 하나 ─────────────────────────────────────────────────────────────────
const isNotFound = (err) =>
  /not.?found/i.test(err?.message ?? "") || String(err?.statusCode ?? err?.status ?? "") === "404";

/** 실패 → retry(일시 오류) 또는 failed */
function decide(job, info, internal, publicError) {
  const c = classifyFailure(info);
  if (c.retryable) {
    return { outcome: "retry", retryInMs: backoffMs(job.attempts, info.retryAfterMs, BACKOFF), error: `${c.reason}: ${internal}` };
  }
  return { outcome: "failed", result: { ok: false, error: publicError }, error: `${c.reason}: ${internal}` };
}

async function runJob(job) {
  const dl = await db.storage.from(JOB_BUCKET).download(job.image_path);
  if (dl.error) {
    if (isNotFound(dl.error)) {
      return { outcome: "failed", result: { ok: false, error: "작업 이미지를 찾을 수 없습니다." }, error: `image_missing: ${dl.error.message}` };
    }
    return decide(job, { infra: true }, `image_download: ${dl.error.message}`, "이미지를 처리하지 못했습니다.");
  }
  const image = Buffer.from(await dl.data.arrayBuffer());
  const mime = job.image_type || sniffImage(image) || "image/jpeg";

  let run;
  try {
    run = await runStyleId({
      image,
      mime,
      fileName: path.basename(job.image_path),
      productName: job.product_name,
      productCategory: job.product_category,
    });
  } catch (e) {
    const info = errorInfoOf(e);
    return decide(job, info, info.message ?? String(e), "이미지를 처리하지 못했습니다.");
  }

  if (run.ok) return { outcome: "succeeded", result: run.body, error: null };
  if (run.kind === "judgement") return { outcome: "failed", result: { ok: false, error: run.error }, error: `judgement: ${run.internal}` };
  return decide(job, run.failure, run.internal, run.error);
}

async function processJob(job) {
  const started = Date.now();
  let lost = false;
  const heartbeat = setInterval(async () => {
    const { data, error } = await db
      .rpc("renew_style_id_job_lease", { p_id: job.id, p_worker: WORKER_ID, p_lease: `${LEASE_SEC} seconds` })
      .then((r) => r, (e) => ({ error: e }));
    if (error) warn(`${job.id} lease 갱신 실패:`, error.message ?? error);
    else if (data === false && !lost) {
      lost = true;
      warn(`${job.id} lease 를 잃었습니다 — 결과를 버립니다(다른 워커가 이어받았거나 이미 끝남).`);
    }
  }, HEARTBEAT_MS);

  let decision;
  try {
    decision = await runJob(job);
  } catch (e) {
    // 우리 쪽 예외(내려받기 · 예상 못 한 오류) — 일시 오류로 보고 다시 한다
    decision = decide(job, { ...errorInfoOf(e), infra: true }, e instanceof Error ? e.message : String(e), "이미지를 처리하지 못했습니다.");
  } finally {
    clearInterval(heartbeat);
  }

  const { data: status, error } = await db
    .rpc("finish_style_id_job", {
      p_id: job.id,
      p_worker: WORKER_ID,
      p_outcome: decision.outcome,
      p_result: decision.result ?? null,
      p_error: decision.error ?? null,
      p_retry_in: decision.outcome === "retry" ? `${Math.ceil(decision.retryInMs / 1000)} seconds` : null,
    })
    .then((r) => r, (e) => ({ error: e }));
  const took = `${((Date.now() - started) / 1000).toFixed(1)}s`;

  if (error) {
    // 기록을 못 했다 — lease 가 지나면 다른 워커가 다시 처리한다(최소 한 번)
    warn(`${job.id} 결과 기록 실패 (${took}):`, error.message ?? error);
    return;
  }
  if (!status) {
    warn(`${job.id} lease 를 잃어 결과를 기록하지 않았습니다 (${decision.outcome}, ${took}).`);
    return;
  }

  const detail =
    decision.outcome === "succeeded"
      ? decision.result.style_id
      : status === "queued"
        ? `${Math.ceil(decision.retryInMs / 1000)}초 뒤 재시도 — ${decision.error}`
        : decision.error;
  log(`${job.id} ${status} (시도 ${job.attempts}/${job.max_attempts}, ${took}) ${detail ?? ""}`.trim());

  // dead 는 다시 실행할 수 있도록 남긴다 — 보존 기간이 지나면 purgeDeadImages 가 지운다
  if (deletesImageNow(status)) {
    const { error: rmError } = await db.storage.from(JOB_BUCKET).remove([job.image_path]).then((r) => r, (e) => ({ error: e }));
    if (rmError) warn(`${job.id} 이미지 삭제 실패:`, rmError.message ?? rmError);
    else {
      const { error: markError } = await db
        .from(JOB_TABLE)
        .update({ image_deleted_at: new Date().toISOString() })
        .eq("id", job.id)
        .then((r) => r, (e) => ({ error: e }));
      if (markError) warn(`${job.id} image_deleted_at 기록 실패:`, markError.message ?? markError);
    }
  }
}

// ── 보존 기간이 지난 dead 이미지 지우기 ─────────────────────────────────────────
// claim_dead_style_id_job_images 가 image_deleted_at 을 먼저 찍고 경로를 돌려준다(워커 여럿이 불러도 겹치지 않는다).
async function purgeDeadImages() {
  let total = 0;
  for (;;) {
    const { data, error } = await db
      .rpc("claim_dead_style_id_job_images", { p_retention: `${DEAD_IMAGE_RETENTION_DAYS} days`, n: PURGE_BATCH })
      .then((r) => r, (e) => ({ error: e }));
    if (error) {
      warn("dead 이미지 정리 실패:", error.message ?? error);
      return;
    }
    if (!data?.length) break;
    const { error: rmError } = await db.storage
      .from(JOB_BUCKET)
      .remove(data.map((r) => r.image_path))
      .then((r) => r, (e) => ({ error: e }));
    // 표시는 이미 찍혔다 — Storage 에 파일이 남을 수 있으니 경로를 로그로 남긴다
    if (rmError) warn(`dead 이미지 ${data.length}건 Storage 삭제 실패:`, rmError.message ?? rmError, data.map((r) => r.image_path));
    total += data.length;
    if (data.length < PURGE_BATCH) break;
  }
  if (total) log(`보존 기간(${DEAD_IMAGE_RETENTION_DAYS}일)이 지난 dead 작업 이미지 ${total}건을 지웠습니다.`);
}

// ── 집기 루프 ─────────────────────────────────────────────────────────────────
const active = new Map();

async function claim(n) {
  const { data, error } = await db.rpc("claim_style_id_jobs", { worker: WORKER_ID, n, lease: `${LEASE_SEC} seconds` });
  if (error) throw new Error(error.message);
  return data ?? [];
}

log(
  `시작 — 동시 ${CONCURRENCY} · lease ${LEASE_SEC}s · heartbeat ${HEARTBEAT_MS / 1000}s · ` +
    `dead 이미지 보존 ${DEAD_IMAGE_RETENTION_DAYS}일${ONCE ? " · --once" : ""}`
);
let claimFailures = 0;
let purging = null;
const runPurge = () => {
  purging ??= purgeDeadImages()
    .catch((e) => warn("dead 이미지 정리 중 예외:", e instanceof Error ? e.message : e))
    .finally(() => (purging = null));
  return purging;
};
runPurge();
const purgeTimer = setInterval(runPurge, PURGE_INTERVAL_MS);

while (!stopping) {
  const free = CONCURRENCY - active.size;
  let claimed = [];
  if (free > 0) {
    try {
      claimed = await claim(free);
      claimFailures = 0;
    } catch (e) {
      claimFailures++;
      const wait = backoffMs(claimFailures, null, { baseMs: POLL_MS, capMs: 60_000 });
      warn(`작업 집기 실패 — ${Math.round(wait / 1000)}초 뒤 다시:`, e instanceof Error ? e.message : e);
      await sleep(wait);
      continue;
    }
    for (const job of claimed) {
      log(`${job.id} 집음 (업체 ${job.business_user_id}, 시도 ${job.attempts}/${job.max_attempts})`);
      const p = processJob(job)
        .catch((e) => warn(`${job.id} 처리 중 예외:`, e instanceof Error ? e.stack : e))
        .finally(() => {
          active.delete(job.id);
          wake?.();
        });
      active.set(job.id, p);
    }
  }
  if (ONCE && claimed.length === 0 && active.size === 0) break;
  // 자리가 남고 방금 집은 작업이 있으면 곧바로 더 집는다. 아니면 자리가 나거나 POLL_MS(± 지터)가 지날 때까지 쉰다.
  if (claimed.length === 0 || active.size >= CONCURRENCY) await sleep(POLL_MS / 2 + Math.random() * POLL_MS);
}

clearInterval(purgeTimer);
await Promise.allSettled([...active.values(), purging]);
log("멈춤");
process.exit(0);
