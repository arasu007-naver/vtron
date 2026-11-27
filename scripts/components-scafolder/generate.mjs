import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import defaultConfig from "./config.mjs";
import { analyze } from "./analyze.mjs";
import { render } from "./render.mjs";

/**
 * Analyze the repository at `root` and render the offline single-file HTML.
 */
export function generate({ root = process.cwd(), config = defaultConfig } = {}) {
  const model = analyze({ root, config });
  const html = render(model);
  return { model, html };
}

function warnUnresolved(unresolved) {
  if (!Array.isArray(unresolved) || unresolved.length === 0) return;
  console.error(`warn: 미해결 API 호출 ${unresolved.length}건`);
  for (const item of unresolved) {
    console.error(`  - ${item.raw} (${item.file}, ${item.block})`);
  }
}

function runCli(argv = process.argv.slice(2), root = process.cwd(), config = defaultConfig) {
  let checkMode = false;
  let jsonMode = false;

  for (const arg of argv) {
    if (arg === "--check") {
      checkMode = true;
    } else if (arg === "--json") {
      jsonMode = true;
    } else {
      console.error(`Unknown option: ${arg}`);
      return 2;
    }
  }

  if (checkMode && jsonMode) {
    console.error("Cannot combine --check and --json");
    return 2;
  }

  const { model, html } = generate({ root, config });
  warnUnresolved(model.unresolved);

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(model, null, 2)}\n`);
    return 0;
  }

  const outPath = path.resolve(root, config.outFile);

  if (checkMode) {
    const expected = Buffer.from(html, "utf8");
    const actual = existsSync(outPath) ? readFileSync(outPath) : null;
    if (!actual || Buffer.compare(actual, expected) !== 0) {
      console.log(`stale: ${config.outFile} — run npm run docs:scafolder`);
      return 1;
    }
    return 0;
  }

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");

  const allBlocks = Object.values(model.blocks);
  const blockCount = allBlocks.length;
  const commonCount = allBlocks.filter((b) => b.common).length;
  const apiCount = Object.keys(model.apis).length;
  const unresolvedCount = model.unresolved.length;
  console.log(
    `블록 ${blockCount} · 공통 ${commonCount} · API ${apiCount} · 미해결 ${unresolvedCount}`
  );
  return 0;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return (
      path.resolve(process.argv[1]) ===
      path.resolve(fileURLToPath(import.meta.url))
    );
  }
}

if (isMainModule()) {
  process.exitCode = runCli();
}
