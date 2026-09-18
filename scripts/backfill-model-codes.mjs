#!/usr/bin/env node
/**
 * 내재화된 상품의 품번을 저장된 이름에서 다시 계산해 `brand_catalog_models.model_code` 에 넣는다.
 *
 *   npm run backfill:model-codes                 # 전부
 *   npm run backfill:model-codes -- --only=디올   # 브랜드 몇 개만
 *   npm run backfill:model-codes -- --dry-run    # 세어만 보고 쓰지 않는다
 *
 * 쓸 때는 정책 그대로다 — **이름에서 품번이 나오면 담고, 안 나오면 null 로 둔다.** 네이버를
 * 부르지 않는다(이름은 이미 우리 DB 에 있다). 그래서 8천 건도 몇 초면 끝난다.
 *
 * 언제 쓰나
 *   - 0006_model_code.sql 을 막 실행했을 때 — 기존 행의 품번을 채운다.
 *   - lib/playground/product-link.ts 의 `modelCodeOf` 규칙을 고쳤을 때 — 이미 담긴 값은
 *     옛 규칙으로 나온 것이라 다시 계산해야 새 규칙과 어긋나지 않는다.
 *
 * 규칙은 화면 · sync-brand-catalog 와 같은 파일에서 온다(노드가 타입만 걷어내고 읽는다).
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/naver-commerce.mjs";
import { modelCodeOf } from "../lib/playground/product-link.ts";

/** PostgREST 가 한 번에 주는 행 수. */
const PAGE = 1000;
/** 한 번에 보내는 갱신 행 수. */
const CHUNK = 500;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY = args
  .find((a) => a.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const chunk = (rows, size = CHUNK) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 있어야 합니다.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const fail = (error, what) => {
  if (!error) return;
  console.error(`${what} 실패 — ${error.message}`);
  process.exit(1);
};

// 브랜드 이름을 붙여 보여주려고 먼저 읽는다.
const brands = await supabase.from("brands").select("id, display_name");
fail(brands.error, "brands 조회");
const nameOf = Object.fromEntries((brands.data ?? []).map((b) => [b.id, b.display_name]));
const onlyIds = ONLY
  ? new Set((brands.data ?? []).filter((b) => ONLY.includes(b.display_name)).map((b) => b.id))
  : null;
if (onlyIds && onlyIds.size === 0) {
  console.error(`--only 에 준 브랜드를 brands 에서 찾지 못했습니다: ${ONLY.join(", ")}`);
  process.exit(1);
}

// 상품을 모두 읽어 이름에서 품번을 다시 뽑는다.
const rows = [];
for (let from = 0; ; from += PAGE) {
  let page = await supabase
    .from("brand_catalog_models")
    .select("id, brand_id, name, model_code")
    .range(from, from + PAGE - 1);
  if (page.error) {
    // 0006 을 아직 안 돌린 DB — 어느 열이 없는지 분명히 알린다.
    if (/model_code/.test(page.error.message)) {
      console.error(
        "brand_catalog_models.model_code 열이 없습니다." +
          " Supabase SQL Editor 에서 supabase/migrations/0006_model_code.sql 을 먼저 실행하세요."
      );
      process.exit(1);
    }
    fail(page.error, "brand_catalog_models 조회");
  }
  rows.push(...(page.data ?? []));
  if ((page.data ?? []).length < PAGE) break;
}

const target = onlyIds ? rows.filter((r) => onlyIds.has(r.brand_id)) : rows;
const changed = [];
const stats = new Map();

for (const row of target) {
  const code = modelCodeOf(row.name);
  const s = stats.get(row.brand_id) ?? { total: 0, withCode: 0, changed: 0 };
  s.total++;
  if (code) s.withCode++;
  if ((row.model_code ?? null) !== code) {
    s.changed++;
    changed.push({ id: row.id, model_code: code });
  }
  stats.set(row.brand_id, s);
}

for (const [brandId, s] of [...stats.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const ratio = s.total ? Math.round((s.withCode / s.total) * 100) : 0;
  console.log(
    `${(nameOf[brandId] ?? brandId).padEnd(8)} 품번 ${String(s.withCode).padStart(5)}/${String(s.total).padStart(5)} (${String(ratio).padStart(3)}%) · 바뀔 것 ${s.changed}`
  );
}
console.log(`\n대상 ${target.length.toLocaleString()}건 · 갱신할 것 ${changed.length.toLocaleString()}건`);

if (DRY_RUN) {
  console.log("--dry-run 이라 쓰지 않았습니다.");
  process.exit(0);
}
if (changed.length === 0) {
  console.log("바뀐 것이 없습니다.");
  process.exit(0);
}

// 품번만 갈아끼운다. upsert 는 나머지 열을 비워 버리므로 행마다 update 한다.
let done = 0;
for (const part of chunk(changed)) {
  await Promise.all(
    part.map(async ({ id, model_code }) => {
      const { error } = await supabase
        .from("brand_catalog_models")
        .update({ model_code })
        .eq("id", id);
      fail(error, `상품 ${id} 품번 갱신`);
      done++;
    })
  );
  console.log(`  ${done.toLocaleString()} / ${changed.length.toLocaleString()}`);
}
console.log(`품번 ${done.toLocaleString()}건을 갱신했습니다.`);
