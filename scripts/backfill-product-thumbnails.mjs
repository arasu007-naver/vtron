#!/usr/bin/env node
/**
 * 상품 마스터(stmx-web `products`)에 올라간 대표 이미지의 목록용 축소본 만들기.
 *
 * 앱의 상품 검색 · 착장 목록은 사진 자리가 36~58dp 인데 지금은 `image_url` 의 원본을 그대로
 * 받는다(550~640px, 20~180KB). 한 쪽에 100건이 오니 목록 한 번에 수 MB 다 — 사용자는 사진이
 * 하나씩 늦게 뜨는 것으로 느낀다. 미리 줄여 `products.thumbnail` 에 적어 두면 목록이 그것만
 * 읽는다(실측 1~5KB, 원본의 5~10%).
 *
 * 칼럼은 stmx-web-phase2 의 `supabase/migrations/12_product_thumbnails.sql` 이 만든다.
 * 없으면 이 스크립트가 실행할 SQL 을 찍고 멈춘다.
 *
 *   npm run thumbs:products -- --dry-run        # 무엇을 할지만 본다
 *   npm run thumbs:products                     # 실제로 만든다
 *   npm run thumbs:products -- --limit 20       # 20건만 (먼저 눈으로 확인할 때)
 *   npm run thumbs:products -- --force          # 이미 있는 축소본도 다시 만든다
 *   npm run thumbs:products -- --concurrency 8
 *
 * 몇 번을 돌려도 안전하다. 이미 축소본이 있는 행은 건너뛰고(--force 면 덮어쓴다), 실패한 행은
 * thumbnail 이 null 로 남아 다음 실행에서 다시 시도된다.
 *
 * 왜 secret 키인가
 *   products 는 쓰기 정책이 없다 — "쓰기는 운영(서비스 롤)만 한다"(sqls/phase2/11_products.sql).
 *   .env.local 의 STMX_WEB_SUPABASE_SECRET_KEY 를 쓴다. publishable 키로는 한 행도 못 고친다.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 상품 대표 이미지가 사는 버킷(공개). 축소본도 같은 버킷의 `products/thumb/` 에 둔다. */
const BUCKET = "product-images";
const THUMB_DIR = "products/thumb";

/**
 * 축소본의 긴 변 최대 픽셀.
 *
 * 앱이 쓰는 가장 큰 상품 사진 자리가 58dp 다(`product-thumb.tsx`). @3x 화면에서 174px 이라
 * 200px 이면 또렷하면서 더 받을 것이 없다. 크게 보는 자리는 없다 — 상품을 누르면 네이버로 나간다.
 */
const MAX_EDGE = 200;
/** WebP 품질. 상품 사진에서 72 는 눈에 띄는 손상 없이 JPEG 대비 30% 가량 작다(loox 축소본과 같은 값). */
const WEBP_QUALITY = 72;
const THUMB_CONTENT_TYPE = "image/webp";
/** 축소본 주소에는 `?v=` 가 붙어 내용이 바뀌면 주소도 바뀐다. 그러니 오래 캐시해도 된다(1년). */
const THUMB_CACHE_CONTROL = "31536000";

/** PostgREST 한 번에 읽는 행 수. */
const PAGE_SIZE = 500;

const MIGRATION_SQL = "alter table public.products add column if not exists thumbnail text;";

// ── 실행 옵션 ───────────────────────────────────────────────────────────────

const USAGE = [
  "사용법: node scripts/backfill-product-thumbnails.mjs [옵션]",
  "",
  "  --dry-run            바꾸지 않고 대상만 센다",
  "  --force              thumbnail 이 이미 있는 행도 다시 만든다",
  "  --limit <n>          처리할 상품 수 상한 (기본: 전부)",
  "  --concurrency <n>    동시에 처리할 상품 수 (기본: 6)",
  "  -h, --help           이 도움말",
].join("\n");

function parseArgs(argv) {
  const options = { dryRun: false, force: false, help: false, limit: Infinity, concurrency: 6 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--limit") options.limit = Number.parseInt(argv[++i], 10);
    else if (arg === "--concurrency") options.concurrency = Number.parseInt(argv[++i], 10);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`알 수 없는 옵션: ${arg}`);
  }

  if (options.limit !== Infinity && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("--limit 은 1 이상의 숫자여야 한다");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error("--concurrency 는 1 이상의 숫자여야 한다");
  }
  return options;
}

// ── env ────────────────────────────────────────────────────────────────────
// Next.js 처럼 .env.local 을 읽는다(sync-brands.mjs 와 같은 방식). 다만 줄 앞의 공백을 먼저
// 턴다 — .env.local 의 STMX_WEB_* 세 줄은 한 칸 들여쓴 채로 있다.
function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const raw of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2").replace(/\\\$/g, "$");
    }
  }
}

// ── 주소 규칙 ───────────────────────────────────────────────────────────────

/**
 * 공개 URL 에서 우리 버킷 안의 경로를 뽑는다. 버킷 밖의 사진(네이버 등)이면 null —
 * 그런 사진은 URL 그대로 내려받는다.
 */
function storagePathOf(imageUrl) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = imageUrl.indexOf(marker);
  if (at < 0) return null;
  return decodeURIComponent(imageUrl.slice(at + marker.length).split("?")[0]);
}

/**
 * 축소본의 공개 URL. 판(version)은 원본의 `?v=` 를 그대로 물려받는다 — 원본이 그대로면 다시
 * 돌려도 주소가 같아 앱이 받아 둔 사진을 버리지 않는다. 원본에 판이 없으면 지금 시각으로 둔다.
 */
function thumbnailUrl(baseUrl, productId, imageUrl) {
  let version = "";
  try {
    version = new URL(imageUrl).searchParams.get("v") ?? "";
  } catch {
    // URL 로 못 읽는 주소면 판 없이 둔다.
  }
  if (!version) version = String(Math.floor(Date.now() / 1000));
  return `${baseUrl}/storage/v1/object/public/${BUCKET}/${THUMB_DIR}/${productId}.webp?v=${version}`;
}

// ── 축소본 ─────────────────────────────────────────────────────────────────

/** 사진 한 장을 줄인다. 못 줄이면 null — 그 행은 원본을 계속 쓴다. */
async function makeThumbnail(source) {
  try {
    return await sharp(source, { failOn: "error" })
      // 상품 사진은 EXIF 회전이 거의 없지만, 있으면 축소본만 누워 버린다. 먼저 픽셀에 적용한다.
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (cause) {
    console.warn(`  (줄이기 실패: ${cause instanceof Error ? cause.message : cause})`);
    return null;
  }
}

/** 원본 바이트. 우리 버킷 안이면 스토리지로, 밖이면 URL 로 받는다. */
async function downloadOriginal(client, imageUrl) {
  const storagePath = storagePathOf(imageUrl);
  if (storagePath) {
    const { data, error } = await client.storage.from(BUCKET).download(storagePath);
    if (error || !data) throw new Error(`내려받기 실패 (${error?.message ?? "빈 응답"})`);
    return Buffer.from(await data.arrayBuffer());
  }
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`내려받기 실패 (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** 상품 한 건. 집계할 수 있게 상태 한 마디와 설명을 돌려준다. */
async function backfillRow(client, baseUrl, row, options) {
  if (!row.image_url) return { status: "skipped", reason: "원본 사진이 없다" };
  if (options.dryRun) return { status: "would-fix", reason: `${THUMB_DIR}/${row.id}.webp` };

  let original;
  try {
    original = await downloadOriginal(client, row.image_url);
  } catch (cause) {
    return { status: "failed", reason: cause instanceof Error ? cause.message : String(cause) };
  }

  const thumbnail = await makeThumbnail(original);
  if (!thumbnail) return { status: "skipped", reason: "이 형식은 줄일 수 없다" };

  // 올리기 — upsert 를 켠다. 앞선 실행이 파일만 올리고 행을 못 고친 채 죽었을 수 있다.
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(`${THUMB_DIR}/${row.id}.webp`, thumbnail, {
      contentType: THUMB_CONTENT_TYPE,
      cacheControl: THUMB_CACHE_CONTROL,
      upsert: true,
    });
  if (uploadError) return { status: "failed", reason: `올리기 실패 (${uploadError.message})` };

  const { error: updateError } = await client
    .from("products")
    .update({ thumbnail: thumbnailUrl(baseUrl, row.id, row.image_url) })
    .eq("id", row.id);
  if (updateError) {
    // 파일은 올라갔지만 행이 안 고쳐졌다. 다음 실행이 같은 자리에 다시 올리고 고친다.
    return { status: "failed", reason: `행 갱신 실패 (${updateError.message})` };
  }

  const saved = Math.round((1 - thumbnail.length / original.length) * 100);
  return {
    status: "fixed",
    reason: `${original.length.toLocaleString()} → ${thumbnail.length.toLocaleString()} bytes (-${saved}%)`,
  };
}

/** 동시 실행 수를 묶어 순서대로 흘려보낸다. */
async function runPool(items, concurrency, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

const MARK = { fixed: "[O]", "would-fix": "[.]", skipped: "[-]", failed: "[X]" };

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }

  loadEnv();
  const url = process.env.STMX_WEB_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.STMX_WEB_SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || key.startsWith("sb_publishable_")) {
    throw new Error(
      ".env.local 에 STMX_WEB_SUPABASE_URL 과 STMX_WEB_SUPABASE_SECRET_KEY(sb_secret_…)가 있어야 한다.\n" +
        "publishable 키로는 products 를 고칠 수 없다(쓰기 정책이 없다)."
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 칼럼이 있는지 먼저 본다. 없으면 수천 장을 만든 뒤에야 알게 된다.
  const probe = await client.from("products").select("thumbnail").limit(1);
  if (probe.error) {
    if (probe.error.code === "42703") {
      throw new Error(
        "products 에 thumbnail 칼럼이 없다. stmx-web Supabase SQL Editor 에서 먼저 실행한다:\n\n" +
          `  ${MIGRATION_SQL}\n\n` +
          "(전문: stmx-web-phase2/supabase/migrations/12_product_thumbnails.sql)"
      );
    }
    throw new Error(`products 조회 실패: ${probe.error.message}`);
  }

  console.log(
    `상품 썸네일 백필 — ${options.dryRun ? "DRY RUN(바꾸지 않는다)" : "실제 실행"}` +
      `${options.force ? ", 이미 있는 축소본도 다시 만든다" : ""}` +
      `, 긴 변 ${MAX_EDGE}px WebP, 동시 ${options.concurrency}건` +
      `${options.limit === Infinity ? "" : `, 최대 ${options.limit}건`}`
  );

  const tally = { fixed: 0, "would-fix": 0, skipped: 0, failed: 0 };
  let processed = 0;
  // id 기준 키셋 페이징. 고친 행은 다음 조회의 필터에서 빠지지만 커서가 이미 지나가 있어
  // 같은 행을 다시 읽지 않는다 — 실패한 행 때문에 무한히 반복하는 일이 없다.
  let cursor = "";

  for (;;) {
    if (processed >= options.limit) break;

    let query = client
      .from("products")
      .select("id, image_url, thumbnail")
      .not("image_url", "is", null)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (!options.force) query = query.is("thumbnail", null);
    if (cursor) query = query.gt("id", cursor);

    const { data: rows, error } = await query;
    if (error) throw new Error(`products 조회 실패: ${error.message}`);
    if (!rows || rows.length === 0) break;

    cursor = rows[rows.length - 1].id;
    const batch = rows.slice(0, options.limit - processed);

    await runPool(batch, options.concurrency, async (row) => {
      const result = await backfillRow(client, url, row, options);
      tally[result.status] += 1;
      console.log(`  ${MARK[result.status]} ${row.id} — ${result.reason}`);
    });

    processed += batch.length;
  }

  console.log(
    `\n끝. 읽은 상품 ${processed}건 — 만듦 ${tally.fixed}, 대상 ${tally["would-fix"]}, ` +
      `건너뜀 ${tally.skipped}, 실패 ${tally.failed}`
  );
  if (tally.failed > 0) {
    console.log("실패한 행은 thumbnail 이 비어 있어 목록이 계속 원본을 쓴다. 다시 돌리면 재시도한다.");
    process.exitCode = 1;
  }
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exit(1);
});
