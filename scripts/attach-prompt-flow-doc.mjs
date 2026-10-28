#!/usr/bin/env node
/**
 * 관찰 프롬프트 버전에 흐름도(HTML)를 붙인다 — style_ex_prompt_versions.flow_doc (0022_prompt_flow_doc.sql).
 * 화면의 [흐름도 → .html 올리기]와 같은 일을 명령줄에서 한다(처음 짝을 맞출 때 · 여러 개를 한꺼번에).
 *
 *   node --env-file=.env.local scripts/attach-prompt-flow-doc.mjs <target> <version> <file.html>
 *   node --env-file=.env.local scripts/attach-prompt-flow-doc.mjs <target> <version> --inherit <from-version>
 *
 *   target   item (/style-ex) | full (인덱스 Full-Look)
 *   version  버전 표의 번호 (화면 목록의 vN)
 *   --inherit <from-version>  같은 target 의 다른 버전 흐름도를 물려받게 한다 (flow_doc_from 에 그 버전을 남긴다)
 *
 * 관찰 프롬프트(kind = observe)만 다룬다. 같은 명령을 다시 돌리면 덮어쓴다.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [target, versionArg, third, fourth] = process.argv.slice(2);
const usage = () => {
  console.error("사용: attach-prompt-flow-doc.mjs <item|full> <version> <file.html | --inherit <from-version>>");
  process.exit(1);
};
if (!["item", "full"].includes(target) || !/^\d+$/.test(versionArg ?? "") || !third) usage();
if (third === "--inherit" && !/^\d+$/.test(fourth ?? "")) usage();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (--env-file=.env.local).");
  process.exit(1);
}
const db = createClient(url, key);
const TABLE = "style_ex_prompt_versions";

const versionRow = async (version) => {
  const { data, error } = await db
    .from(TABLE)
    .select("id, version, flow_doc, flow_doc_updated_at, flow_doc_from")
    .eq("target", target)
    .eq("kind", "observe")
    .eq("version", Number(version))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${target} observe v${version} 버전이 없습니다.`);
  return data;
};

try {
  const row = await versionRow(versionArg);
  let update;
  if (third === "--inherit") {
    const src = await versionRow(fourth);
    if (!src.flow_doc) throw new Error(`${target} v${fourth} 에 흐름도가 없습니다 — 먼저 붙이세요.`);
    update = { flow_doc: src.flow_doc, flow_doc_updated_at: src.flow_doc_updated_at, flow_doc_from: src.flow_doc_from ?? src.id };
  } else {
    const html = readFileSync(third, "utf8");
    if (!/<html[\s>]/i.test(html)) throw new Error(`${third} 는 HTML 문서가 아닙니다.`);
    update = { flow_doc: html, flow_doc_updated_at: new Date().toISOString(), flow_doc_from: null };
  }
  const { error } = await db.from(TABLE).update(update).eq("id", row.id);
  if (error) throw new Error(error.message);
  console.log(
    `${target} v${row.version} ← ${third === "--inherit" ? `v${fourth} 의 흐름도 (물려받음)` : third} · ${update.flow_doc.length.toLocaleString()}자`
  );
} catch (e) {
  console.error("실패:", e instanceof Error ? e.message : e);
  process.exit(1);
}
