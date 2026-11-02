import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import { anthropicApiKey } from "@/lib/style-ex/api-key";
import { resolvePrimeTarget, type PrimeTarget } from "@/lib/style-ex/prime-target";
import { MAX_IMAGE_BYTES, runApiStyleId, sniffImage, type ApiStyleIdRun } from "./extract";
import { IMAGE_BUCKET, ITEMS_TABLE, removeImages, type PrimeGroup } from "./jobs";

/**
 * 대량 Style ID 큐 워커 — 작업마다 두 단계로 돈다 (0025).
 *
 *   ① 대표 의복 단계  작업의 모든 상품(status prime)을 PRIME_BATCH 개씩 꺼내(claim_api_call_prime_items) JEV 로 대표 의복을 정하고
 *                    그룹(found · not_found · no_product)과 함께 한꺼번에 남긴다(finish_api_call_primes) → queued
 *   ② 관찰 단계      작업 전체가 ①을 마친 뒤, 그룹마다 모아서(found → not_found → no_product) 하나씩 꺼내(claim_api_call_items)
 *                    정해 둔 대표 의복으로 관찰 · 판정하고 결과를 남긴다(finish_api_call_item). 여기서는 JEV 를 다시 부르지 않는다.
 *
 * 레인은 늘 ①을 먼저 한다 — 새 작업이 들어오면 관찰 중이던 레인도 그 작업의 대표 의복부터 정한다.
 *
 *   drainStyleIdQueue({ budgetMs })   STYLE_ID_JOB_CONCURRENCY 개 레인이 큐가 빌 때까지(또는 시간 예산까지) 돈다
 *
 * 부르는 곳 — 어디서 불러도 같은 행을 두 번 꺼내지 않는다(DB 의 for update skip locked):
 *   POST /api/v1/style-id/jobs 응답 뒤(after)         작업을 넣은 서버가 바로 돌기 시작한다
 *   POST · GET /api/internal/style-id-queue            크론 · 워커 스크립트(scripts/style-id-worker.mjs)가 부른다
 *
 * 한 프로세스에는 drain 이 하나만 돈다 — 돌고 있으면 새로 넣은 상품도 그 drain 이 꺼낸다.
 * 일시적 오류(사진 주소 응답 없음 · 5xx, Anthropic 429 · 5xx · 529)는 큐로 되돌려 다시 시도하고,
 * STYLE_ID_JOB_MAX_ATTEMPTS 번째도 실패하면 failed 로 닫는다.
 * 상품마다 근거(관찰 envelope · 판정 기록 · JEV 결정)도 그 행(observation · scoring · prime_target, 0024)에 남긴다.
 */

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const CONCURRENCY = () => num(process.env.STYLE_ID_JOB_CONCURRENCY, 3);
const MAX_ATTEMPTS = () => num(process.env.STYLE_ID_JOB_MAX_ATTEMPTS, 3);
/** 상품 하나를 들고 있는 시간 — 이 안에 끝내지 못하면(워커가 죽음) 다른 워커가 다시 꺼낸다 */
const LEASE_SECONDS = 900;
/** 상품 하나에 드는 최대 시간 — 남은 예산이 이보다 적으면 새로 꺼내지 않는다 */
const ITEM_BUDGET_MS = 300_000;
const FETCH_TIMEOUT_MS = 20_000;
/** 대표 의복 단계 — 한 번에 꺼내는 상품 수 · 그 안에서 동시에 부르는 JEV 수 */
const PRIME_BATCH = () => num(process.env.STYLE_ID_PRIME_BATCH, 50);
const PRIME_CONCURRENCY = () => num(process.env.STYLE_ID_PRIME_CONCURRENCY, 8);
const PRIME_LEASE_SECONDS = 300;

type Obj = Record<string, unknown>;

interface ClaimedItem {
  id: string;
  call_id: string;
  seq: number;
  ref: string | null;
  product: Obj;
  image_url: string | null;
  image_path: string | null;
  attempts: number;
  prime_target: PrimeTarget | null;
  prime_group: PrimeGroup | null;
}

/** 다시 시도할 오류 */
class RetryableError extends Error {}
/** 상품 탓 — 다시 시도하지 않는다 */
class ItemError extends Error {
  constructor(
    readonly publicMessage: string,
    detail?: string
  ) {
    super(detail ?? publicMessage);
  }
}

async function loadImage(it: ClaimedItem): Promise<Buffer> {
  if (it.image_path) {
    const { data, error } = await getAdminSupabase().storage.from(IMAGE_BUCKET).download(it.image_path);
    if (error || !data) throw new RetryableError(`사진을 버킷에서 읽지 못했습니다: ${error?.message ?? "없음"}`);
    return Buffer.from(await data.arrayBuffer());
  }
  let res: Response;
  try {
    res = await fetch(it.image_url!, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow" });
  } catch (e) {
    throw new RetryableError(`사진을 받지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (res.status >= 500 || res.status === 429) throw new RetryableError(`사진 주소가 HTTP ${res.status} 를 줬습니다.`);
  if (!res.ok) throw new ItemError(`image_url 이 HTTP ${res.status} 를 줬습니다.`);
  const length = Number(res.headers.get("content-length"));
  if (length > MAX_IMAGE_BYTES) throw new ItemError("이미지는 5MB 이하만 지원합니다.");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new ItemError("이미지는 5MB 이하만 지원합니다.");
  return bytes;
}

const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, 200) : "");

/** Anthropic SDK 의 APIError — status 로 일시적 오류를 가린다 */
const isTransient = (e: unknown) => {
  const status = (e as { status?: unknown })?.status;
  return typeof status === "number" ? status === 408 || status === 429 || status >= 500 : /ECONNRESET|ETIMEDOUT|fetch failed|overloaded/i.test(String(e));
};

/**
 * 근거(관찰 · 판정 기록 · JEV 결정)를 그 행에 남긴다 (0024). 결과(finish)보다 먼저 — 그 행을 아직 이 워커가 들고 있을 때.
 * 0024 전이면 열이 없어 남기지 못한다 — 경고만 하고 결과는 그대로 남긴다.
 */
async function saveEvidence(it: ClaimedItem, evidence: ApiStyleIdRun["evidence"]) {
  const { error } = await getAdminSupabase()
    .from(ITEMS_TABLE)
    .update({ observation: evidence.observation, scoring: evidence.scoring, prime_target: evidence.primeTarget })
    .eq("id", it.id)
    .eq("status", "running");
  if (error) console.warn(`[style-id-jobs] ${it.call_id}#${it.seq} 근거 저장 실패 (0024 를 실행했는지 확인):`, error.message);
}

async function finish(it: ClaimedItem, fields: { status: "done" | "failed" | "queued"; style_id?: string | null; result?: Obj | null; error?: string | null; detail?: string | null; ms?: number }) {
  const { error } = await getAdminSupabase().rpc("finish_api_call_item", {
    p_id: it.id,
    p_status: fields.status,
    p_style_id: fields.style_id ?? null,
    p_result: fields.result ?? null,
    p_error: fields.error ?? null,
    p_error_detail: fields.detail?.slice(0, 2000) ?? null,
    p_elapsed_ms: fields.ms ?? null,
  });
  if (error) console.error(`[style-id-jobs] ${it.call_id}#${it.seq} 결과 저장 실패:`, error.message);
  if (fields.status !== "queued" && it.image_path) await removeImages([it.image_path]);
}

async function processItem(it: ClaimedItem) {
  const started = performance.now();
  const ms = () => Math.round(performance.now() - started);
  try {
    const image = await loadImage(it);
    const mime = sniffImage(image);
    if (!mime) throw new ItemError("JPG · PNG · WEBP · GIF 이미지만 지원합니다.");
    const name = text(it.product.name);
    const category = text(it.product.whole_category_name) || text(it.product.category);
    const run = await runApiStyleId({
      image,
      fileName: `${it.ref || `${it.call_id}-${it.seq}`}.${mime.split("/")[1]}`,
      product: name ? { name, category: category || null } : null,
      // 대표 의복 단계에서 정한 것 — 그 단계를 거치지 않은 행(0025 전에 들어온 것)만 여기서 JEV 를 부른다
      ...(it.prime_group ? { primeTarget: it.prime_target } : {}),
    });
    const meta = {
      prime_target: run.primeTarget?.category ?? null,
      observe_prompt_version: run.observePromptVersion,
      vision_model: run.visionModel,
    };
    await saveEvidence(it, run.evidence);
    if (run.result.ok) {
      const { ok: _ok, ...result } = run.result;
      void _ok;
      await finish(it, { status: "done", style_id: run.result.style_id, result: { ...result, ...meta }, ms: ms() });
    } else {
      await finish(it, { status: "failed", result: meta, error: run.result.error, detail: run.result.detail, ms: ms() });
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    const retry = (e instanceof RetryableError || (!(e instanceof ItemError) && isTransient(e))) && it.attempts < MAX_ATTEMPTS();
    if (retry) {
      console.warn(`[style-id-jobs] ${it.call_id}#${it.seq} 다시 시도 (${it.attempts}/${MAX_ATTEMPTS()}):`, detail);
      await finish(it, { status: "queued", detail, ms: ms() });
    } else {
      const publicMessage = e instanceof ItemError ? e.publicMessage : "이미지를 처리하지 못했습니다.";
      await finish(it, { status: "failed", error: publicMessage, detail, ms: ms() });
    }
  }
}

async function claim(): Promise<ClaimedItem | null> {
  const { data, error } = await getAdminSupabase().rpc("claim_api_call_items", {
    p_limit: 1,
    p_lease_seconds: LEASE_SECONDS,
    p_max_attempts: MAX_ATTEMPTS(),
  });
  if (error) throw new Error(`큐에서 꺼내지 못했습니다: ${error.message}`);
  return ((data as ClaimedItem[] | null) ?? [])[0] ?? null;
}

async function mapLimit<T, R>(list: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await fn(list[i]);
      }
    })
  );
  return out;
}

/** JEV 한 번 — 호출 자체가 실패했으면(네트워크 · HTTP 오류) 한 번 더 부른다. 답이 확정이 아닌 것은 다시 묻지 않는다 */
async function primeOf(it: ClaimedItem): Promise<{ prime_target: PrimeTarget | null; prime_group: PrimeGroup }> {
  const name = text(it.product.name);
  if (!name) return { prime_target: null, prime_group: "no_product" };
  const product = { name, category: text(it.product.whole_category_name) || text(it.product.category) || null };
  let prime = await resolvePrimeTarget(product);
  if (!prime.choice && prime.reason?.startsWith("JEV 호출 실패")) {
    await new Promise((r) => setTimeout(r, 1000));
    prime = await resolvePrimeTarget(product);
  }
  return { prime_target: prime, prime_group: prime.category ? "found" : "not_found" };
}

/** 이 프로세스에서 대표 의복을 정하고 있는 배치 수 — 그동안은 관찰할 것이 없어도 레인이 끝나지 않고 기다린다 */
let primingInFlight = 0;

/** ① 대표 의복 단계 한 배치. 정한 상품 수를 돌려준다(꺼낼 것이 없으면 0) */
async function primeBatch(): Promise<number> {
  const { data, error } = await getAdminSupabase().rpc("claim_api_call_prime_items", {
    p_limit: PRIME_BATCH(),
    p_lease_seconds: PRIME_LEASE_SECONDS,
  });
  if (error) throw new Error(`대표 의복 단계 큐에서 꺼내지 못했습니다: ${error.message}`);
  const items = (data as ClaimedItem[] | null) ?? [];
  if (!items.length) return 0;
  primingInFlight++;
  try {
    const started = performance.now();
    const primes = await mapLimit(items, PRIME_CONCURRENCY(), primeOf);
    const { error: saveError } = await getAdminSupabase().rpc("finish_api_call_primes", {
      p_items: items.map((it, i) => ({ id: it.id, ...primes[i] })),
    });
    if (saveError) throw new Error(`대표 의복 결과 저장 실패: ${saveError.message}`);
    const count = (g: PrimeGroup) => primes.filter((p) => p.prime_group === g).length;
    console.info(
      `[style-id-jobs] 대표 의복 ${items.length}개 — found ${count("found")} · not_found ${count("not_found")} · no_product ${count("no_product")} (${Math.round(performance.now() - started)}ms)`
    );
    return items.length;
  } finally {
    primingInFlight--;
  }
}

let active: Promise<DrainResult> | null = null;

export interface DrainResult {
  /** 대표 의복을 정한 상품 수 (①) */
  primed: number;
  /** 관찰 · 판정을 마친 상품 수 (②) */
  processed: number;
  /** 이 프로세스에서 이미 drain 이 돌고 있어 그것을 기다렸다 */
  joined: boolean;
  /** 예산이 다 되어 멈췄다 (큐에 남은 것이 있을 수 있다) */
  outOfBudget: boolean;
  error: string | null;
}

/** 큐가 빌 때까지(또는 budgetMs 까지) 꺼내 처리한다. 던지지 않는다 */
export function drainStyleIdQueue({ budgetMs }: { budgetMs: number }): Promise<DrainResult> {
  if (active) return active.then((r) => ({ ...r, joined: true }));
  const deadline = Date.now() + budgetMs;
  let processed = 0;
  let primed = 0;
  let outOfBudget = false;
  let error: string | null = null;

  const lane = async () => {
    while (!error) {
      if (deadline - Date.now() < ITEM_BUDGET_MS) {
        outOfBudget = true;
        return;
      }
      // ① 대표 의복 단계가 늘 먼저 — 작업 전체의 대표 의복을 정해야 그 작업의 관찰이 시작된다
      const n = await primeBatch();
      if (n) {
        primed += n;
        continue;
      }
      const it = await claim();
      if (!it) {
        // 다른 레인이 대표 의복을 정하는 중이면 끝나기를 기다렸다가 관찰을 이어 받는다
        if (primingInFlight > 0) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return;
      }
      await processItem(it);
      processed++;
    }
  };

  active = (async () => {
    if (!anthropicApiKey()) return { primed: 0, processed: 0, joined: false, outOfBudget: false, error: "Anthropic API 키가 없어 큐를 돌리지 않았습니다." };
    await Promise.all(
      Array.from({ length: CONCURRENCY() }, () =>
        lane().catch((e) => {
          error = e instanceof Error ? e.message : String(e);
        })
      )
    );
    if (primed || processed || error) {
      console.info(`[style-id-jobs] drain: 대표 의복 ${primed}개 · 관찰 ${processed}개${error ? ` · 오류 ${error}` : ""}${outOfBudget ? " · 예산 소진" : ""}`);
    }
    return { primed, processed, joined: false, outOfBudget, error };
  })().finally(() => {
    active = null;
  });
  return active;
}
