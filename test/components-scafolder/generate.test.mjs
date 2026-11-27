import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import config from "../../scripts/components-scafolder/config.mjs";
import { render } from "../../scripts/components-scafolder/render.mjs";
import { generate } from "../../scripts/components-scafolder/generate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const MINI_APP_ROOT = path.join(__dirname, "fixtures", "mini-app");
const GENERATE_SCRIPT = path.join(REPO_ROOT, "scripts/components-scafolder/generate.mjs");

function copyMiniAppToTmp() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "scafolder-cli-"));
  cpSync(MINI_APP_ROOT, tmp, { recursive: true });
  return tmp;
}

test("generate(): returns { model, html } where html === render(model)", () => {
  const tmp = copyMiniAppToTmp();
  try {
    const result = generate({ root: tmp, config });
    assert.equal(result.model.version, 1);
    assert.equal(result.html, render(result.model));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI: writes outFile, --check passes when fresh and fails with stale: when modified", () => {
  const tmp = copyMiniAppToTmp();
  try {
    const run = spawnSync(process.execPath, [GENERATE_SCRIPT], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(run.status, 0, `expected exit 0, stderr=${run.stderr}`);
    assert.match(run.stdout, /블록 \d+ · 공통 \d+ · API \d+ · 미해결 \d+/);
    // mini-app has 1 unresolved call (/api/nowhere) -> stderr warning, still exit 0
    assert.match(run.stderr, /\/api\/nowhere/);

    const outPath = path.join(tmp, config.outFile);
    assert.equal(existsSync(outPath), true, "expected outFile to be created");

    // Immediately running --check must exit 0
    const checkFresh = spawnSync(process.execPath, [GENERATE_SCRIPT, "--check"], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(checkFresh.status, 0, `expected --check exit 0, stdout=${checkFresh.stdout}, stderr=${checkFresh.stderr}`);

    // Mutating one character makes --check fail with exit 1 and stdout containing "stale:"
    const original = readFileSync(outPath, "utf8");
    writeFileSync(outPath, `${original} `, "utf8");

    const checkStale = spawnSync(process.execPath, [GENERATE_SCRIPT, "--check"], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(checkStale.status, 1, "expected --check exit 1 on stale HTML");
    assert.match(checkStale.stdout, /stale:/);
    assert.match(checkStale.stdout, /docs\/components-scafolder\.html/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI --check: exits 1 with stale: when output file does not exist", () => {
  const tmp = copyMiniAppToTmp();
  try {
    const checkMissing = spawnSync(process.execPath, [GENERATE_SCRIPT, "--check"], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(checkMissing.status, 1);
    assert.match(checkMissing.stdout, /stale:/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI --json: outputs valid JSON with version === 1", () => {
  const tmp = copyMiniAppToTmp();
  try {
    const run = spawnSync(process.execPath, [GENERATE_SCRIPT, "--json"], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(run.status, 0, `expected exit 0, stderr=${run.stderr}`);
    const parsed = JSON.parse(run.stdout);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.project, "vtron");
    assert.ok(parsed.blocks && typeof parsed.blocks === "object");
    assert.ok(parsed.apis && typeof parsed.apis === "object");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
