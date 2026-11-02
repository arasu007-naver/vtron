import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import { anthropicApiKey } from "@/lib/style-ex/api-key";
import { MAX_IMAGE_BYTES, runApiStyleId, sniffImage } from "./extract";
import { IMAGE_BUCKET, removeImages } from "./jobs";

/**
 * 대량 Style ID 큐 워커 — api_call_items 에서 꺼내(claim_api_call_items) 추출하고 결과를 남긴다(finish_api_call_item).
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
    });
    const meta = {
      prime_target: run.primeTarget?.category ?? null,
      observe_prompt_version: run.observePromptVersion,
      vision_model: run.visionModel,
    };
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

let active: Promise<DrainResult> | null = null;

export interface DrainResult {
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
  let outOfBudget = false;
  let error: string | null = null;

  const lane = async () => {
    while (!error) {
      if (deadline - Date.now() < ITEM_BUDGET_MS) {
        outOfBudget = true;
        return;
      }
      const it = await claim();
      if (!it) return;
      await processItem(it);
      processed++;
    }
  };

  active = (async () => {
    if (!anthropicApiKey()) return { processed: 0, joined: false, outOfBudget: false, error: "Anthropic API 키가 없어 큐를 돌리지 않았습니다." };
    await Promise.all(
      Array.from({ length: CONCURRENCY() }, () =>
        lane().catch((e) => {
          error = e instanceof Error ? e.message : String(e);
        })
      )
    );
    if (processed || error) console.info(`[style-id-jobs] drain: ${processed}개 처리${error ? ` · 오류 ${error}` : ""}${outOfBudget ? " · 예산 소진" : ""}`);
    return { processed, joined: false, outOfBudget, error };
  })().finally(() => {
    active = null;
  });
  return active;
}
