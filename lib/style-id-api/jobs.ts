import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import { API_CALL_LOG_TABLE, type BusinessApiContext } from "@/lib/business-user/api-call";
import type { JobItemInput } from "./job-input";

/**
 * 대량 Style ID 작업 (supabase/migrations/0023_api_call_jobs.sql).
 *
 *   작업 = api_call_log 한 행 (id = request_id, job_status · item_total …)
 *   큐   = api_call_items — 상품 하나 = 한 행
 *
 * createJob 은 요청 정보를 api_call_log 에 먼저 저장하고 상품을 큐에 넣는다. 상품명이 있는 상품은 대표 의복 단계(prime)로,
 * 없는 상품은 바로 관찰 대기(queued · no_product)로 들어간다 — 관찰은 작업 전체가 대표 의복 단계를 마친 뒤 그룹마다 돈다(0025). withBusinessApi 가 응답 뒤에
 * 같은 id 의 행을 upsert 하므로(상태 코드 · 걸린 시간 · ip …) 작업 열은 그대로 남는다.
 */

export const ITEMS_TABLE = "api_call_items";
/** 업로드 받은 사진 — 비공개. 상품 처리가 끝나면 지운다 */
export const IMAGE_BUCKET = "api-call-images";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const INSERT_CHUNK = 500;
const UPLOAD_CONCURRENCY = 8;

export type JobStatus = "queued" | "priming" | "running" | "done" | "partial" | "failed";
export type ItemStatus = "prime" | "queued" | "running" | "done" | "failed";
/** 대표 의복 단계 결과 — found(JEV 로 확정) · not_found(못 정함, 이미지로 고른다) · no_product(상품명 없음) */
export type PrimeGroup = "found" | "not_found" | "no_product";

async function mapLimit<T, R>(list: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await fn(list[i], i);
      }
    })
  );
  return out;
}

let bucketReady: Promise<void> | null = null;
function ensureBucket() {
  bucketReady ??= (async () => {
    const storage = getAdminSupabase().storage;
    const { data } = await storage.getBucket(IMAGE_BUCKET);
    if (data) return;
    const { error } = await storage.createBucket(IMAGE_BUCKET, { public: false, fileSizeLimit: "5MB" });
    if (error && !/already exists/i.test(error.message)) throw new Error(`버킷 ${IMAGE_BUCKET} 을 만들지 못했습니다: ${error.message}`);
  })().catch((e) => {
    bucketReady = null;
    throw e;
  });
  return bucketReady;
}

export const removeImages = async (paths: string[]) => {
  if (!paths.length) return;
  const { error } = await getAdminSupabase().storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.warn(`[style-id-jobs] 사진 ${paths.length}개를 지우지 못했습니다:`, error.message);
};

/** 요청 → 작업 1건 + 큐. 실패하면 올린 사진 · 넣은 행을 거둬들이고 던진다 */
export async function createJob(
  req: Request,
  ctx: BusinessApiContext,
  items: JobItemInput[],
  format: string
): Promise<{ id: string; total: number }> {
  const db = getAdminSupabase();
  const id = ctx.request_id;

  // 1) 업로드 받은 사진 → 버킷 (큐는 바이트를 들고 있지 않는다)
  const uploaded: string[] = [];
  const paths = await (async () => {
    if (!items.some((it) => it.image)) return items.map(() => null);
    await ensureBucket();
    return mapLimit(items, UPLOAD_CONCURRENCY, async (it, seq) => {
      if (!it.image) return null;
      const path = `${id}/${seq}.${EXT[it.image.mime] ?? "bin"}`;
      const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, it.image.bytes, { contentType: it.image.mime, upsert: true });
      if (error) throw new Error(`사진 업로드 실패 (${seq}): ${error.message}`);
      uploaded.push(path);
      return path;
    });
  })().catch(async (e) => {
    await removeImages(uploaded);
    throw e;
  });

  // 2) 작업 목록에 요청을 먼저 남긴다
  const { error: logError } = await db.from(API_CALL_LOG_TABLE).insert({
    id,
    business_user_id: ctx.business_user_id,
    token_prefix: ctx.token_prefix,
    method: req.method,
    path: new URL(req.url).pathname,
    status_code: 202,
    duration_ms: 0,
    job_status: "queued",
    item_total: items.length,
    request_meta: ctx.log.request ?? { format, items: items.length },
  });
  if (logError) {
    await removeImages(uploaded);
    throw new Error(`작업 저장 실패: ${logError.message}`);
  }

  // 3) 큐에 넣는다
  const rows = items.map((it, seq) => ({
    call_id: id,
    business_user_id: ctx.business_user_id,
    seq,
    ref: it.ref,
    product: it.product,
    image_url: it.image_url,
    image_path: paths[seq],
    status: it.name ? "prime" : "queued",
    prime_group: it.name ? null : "no_product",
  }));
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const { error } = await db.from(ITEMS_TABLE).insert(rows.slice(i, i + INSERT_CHUNK));
    if (error) {
      // 일부만 들어간 큐는 남기지 않는다 — 작업 열을 비워 일반 호출 기록으로 되돌린다
      await db.from(ITEMS_TABLE).delete().eq("call_id", id);
      await db.from(API_CALL_LOG_TABLE).update({ job_status: null, item_total: null }).eq("id", id);
      await removeImages(uploaded);
      throw new Error(`큐 저장 실패: ${error.message}`);
    }
  }
  return { id, total: items.length };
}

type Obj = Record<string, unknown>;

export interface JobRow {
  id: string;
  business_user_id: string | null;
  job_status: JobStatus;
  item_total: number;
  item_done: number;
  item_failed: number;
  created_at: string;
  finished_at: string | null;
}

export interface ItemRow {
  seq: number;
  ref: string | null;
  product: Obj;
  image_url: string | null;
  status: ItemStatus;
  prime_group: PrimeGroup | null;
  attempts: number;
  style_id: string | null;
  result: Obj | null;
  error: string | null;
  elapsed_ms: number | null;
  finished_at: string | null;
}

const JOB_COLUMNS = "id, business_user_id, job_status, item_total, item_done, item_failed, created_at, finished_at";

/** 업체에게 보이는 작업 모양 */
export const jobView = (j: JobRow) => ({
  job_id: j.id,
  status: j.job_status,
  total: j.item_total,
  done: j.item_done,
  failed: j.item_failed,
  pending: j.item_total - j.item_done - j.item_failed,
  created_at: j.created_at,
  finished_at: j.finished_at,
});

/** 업체에게 보이는 상품 결과 — 업로드 받은 사진의 버킷 경로 · 서버 쪽 사유는 내보내지 않는다 */
export const itemView = (it: ItemRow) => ({
  seq: it.seq,
  ref: it.ref,
  status: it.status,
  prime_group: it.prime_group,
  ...(it.result ?? {}),
  style_id: it.style_id,
  error: it.error,
  elapsed_ms: it.elapsed_ms,
  finished_at: it.finished_at,
});

export async function getJob(id: string, businessUserId: string): Promise<JobRow | null> {
  const { data, error } = await getAdminSupabase()
    .from(API_CALL_LOG_TABLE)
    .select(JOB_COLUMNS)
    .eq("id", id)
    .eq("business_user_id", businessUserId)
    .not("job_status", "is", null)
    .maybeSingle();
  if (error) throw new Error(`작업 조회 실패: ${error.message}`);
  return (data as JobRow | null) ?? null;
}

export async function listJobs(businessUserId: string, limit: number): Promise<JobRow[]> {
  const { data, error } = await getAdminSupabase()
    .from(API_CALL_LOG_TABLE)
    .select(JOB_COLUMNS)
    .eq("business_user_id", businessUserId)
    .not("job_status", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`작업 목록 조회 실패: ${error.message}`);
  return (data as JobRow[]) ?? [];
}

export async function listItems(
  callId: string,
  { offset, limit, status }: { offset: number; limit: number; status: ItemStatus | null }
): Promise<ItemRow[]> {
  let q = getAdminSupabase()
    .from(ITEMS_TABLE)
    .select("seq, ref, product, image_url, status, prime_group, attempts, style_id, result, error, elapsed_ms, finished_at")
    .eq("call_id", callId)
    .order("seq")
    .range(offset, offset + limit - 1);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(`작업 상품 조회 실패: ${error.message}`);
  return (data as ItemRow[]) ?? [];
}

/**
 * 대표 의복 단계 요약 — 그룹별 상품 수 · 확정한 카테고리별 수. 대표 의복 단계 중이면 primed < total.
 *   { primed, groups: { found, not_found, no_product }, categories: { Jacket: 12, … } }
 */
export async function primeSummary(callId: string, total: number) {
  const groups: Record<PrimeGroup, number> = { found: 0, not_found: 0, no_product: 0 };
  const categories: Record<string, number> = {};
  const PAGE = 1000;
  for (let offset = 0; offset < total; offset += PAGE) {
    const { data, error } = await getAdminSupabase()
      .from(ITEMS_TABLE)
      .select("prime_group, prime_target->>category")
      .eq("call_id", callId)
      .order("seq")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`대표 의복 요약 조회 실패: ${error.message}`);
    for (const r of (data ?? []) as { prime_group: PrimeGroup | null; category: string | null }[]) {
      if (!r.prime_group) continue;
      groups[r.prime_group]++;
      if (r.prime_group === "found" && r.category) categories[r.category] = (categories[r.category] ?? 0) + 1;
    }
    if ((data ?? []).length < PAGE) break;
  }
  return { primed: groups.found + groups.not_found + groups.no_product, groups, categories };
}

/** 다시 진행할 때 비우는 열 — 처음 큐에 넣었을 때와 같게 */
const RESET_COLUMNS = {
  attempts: 0,
  locked_until: null,
  style_id: null,
  result: null,
  error: null,
  error_detail: null,
  elapsed_ms: null,
  started_at: null,
  finished_at: null,
  observation: null,
  scoring: null,
};
const RESUME_CHUNK = 200;

const textOf = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

/**
 * 작업 다시 진행 — 실패(failed)한 상품을 큐로 되돌린다. 그 뒤 drainStyleIdQueue 를 부르면 이어서 돈다.
 *   상품명이 있고 대표 의복을 확정하지 못한(found 가 아닌) 상품 → prime (대표 의복 단계부터)
 *   그 밖의 상품                                            → queued (정해 둔 대표 의복으로 관찰부터)
 *   업로드 받은 사진(image_path)은 처리가 끝나면 지웠으므로 되돌리지 않는다 → skipped
 * 대기 · 처리 중인 상품은 건드리지 않는다 (lease 가 지난 것은 큐가 다시 꺼낸다).
 */
export async function resumeJob(callId: string): Promise<{ reprimed: number; requeued: number; skipped: number }> {
  const db = getAdminSupabase();
  const failed: { id: string; product: Obj | null; image_url: string | null; prime_group: PrimeGroup | null }[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from(ITEMS_TABLE)
      .select("id, product, image_url, prime_group")
      .eq("call_id", callId)
      .eq("status", "failed")
      .order("seq")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`실패한 상품 조회 실패: ${error.message}`);
    failed.push(...((data ?? []) as typeof failed));
    if ((data ?? []).length < PAGE) break;
  }

  const reprime: string[] = [];
  const requeue: string[] = [];
  let skipped = 0;
  for (const it of failed) {
    if (!it.image_url) {
      skipped++;
      continue;
    }
    const named = textOf(it.product?.name) || textOf(it.product?.product_name);
    (named && it.prime_group !== "found" ? reprime : requeue).push(it.id);
  }

  const update = async (ids: string[], fields: Obj) => {
    for (let i = 0; i < ids.length; i += RESUME_CHUNK) {
      const { error } = await db
        .from(ITEMS_TABLE)
        .update({ ...RESET_COLUMNS, ...fields })
        .in("id", ids.slice(i, i + RESUME_CHUNK))
        .eq("status", "failed");
      if (error) throw new Error(`상품을 큐로 되돌리지 못했습니다: ${error.message}`);
    }
  };
  await update(reprime, { status: "prime", prime_group: null, prime_target: null });
  await update(requeue, { status: "queued" });

  const { error } = await db.rpc("api_call_job_refresh", { p_call_id: callId });
  if (error) throw new Error(`작업 상태 갱신 실패: ${error.message}`);
  return { reprimed: reprime.length, requeued: requeue.length, skipped };
}
