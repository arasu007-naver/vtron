import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import config from "../../scripts/components-scafolder/config.mjs";
import { render } from "../../scripts/components-scafolder/render.mjs";
import { generate } from "../../scripts/components-scafolder/generate.mjs";
import { checkInvariants } from "./invariants.mjs";

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

function walkFiles(dir, filename) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, filename));
    } else if (entry.isFile() && entry.name === filename) {
      out.push(full);
    }
  }
  return out;
}

function pageFileToRoute(relPageFile) {
  const dir = path.posix.dirname(relPageFile.replaceAll("\\", "/"));
  if (dir === "app") return "/";
  const segments = dir
    .slice("app/".length)
    .split("/")
    .filter((seg) => seg.length > 0 && !(seg.startsWith("(") && seg.endsWith(")")));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

test("real repo: invariants, routes, APIs, blocks, and vtron-specific expectations", () => {
  const { model, html } = generate({ root: REPO_ROOT, config });

  // 1. SPEC §6.1 invariants
  assert.deepEqual(checkInvariants(model), []);

  // 2. API count matches actual route.ts files under app/api
  const routeFiles = walkFiles(path.join(REPO_ROOT, "app/api"), "route.ts");
  assert.equal(Object.keys(model.apis).length, routeFiles.length);

  // 3. Every app/**/page.tsx route appears in some page block's routes (including "/")
  const pageFiles = walkFiles(path.join(REPO_ROOT, "app"), "page.tsx");
  const expectedRoutes = new Set(
    pageFiles.map((f) => pageFileToRoute(path.relative(REPO_ROOT, f)))
  );
  assert.equal(expectedRoutes.has("/"), true);

  const coveredRoutes = new Set();
  for (const block of Object.values(model.blocks)) {
    if (block.kind === "page") {
      for (const r of block.routes) coveredRoutes.add(r);
    }
  }
  for (const route of expectedRoutes) {
    assert.equal(
      coveredRoutes.has(route),
      true,
      `expected route "${route}" to be covered by a page block`
    );
  }

  // 4. Every non-anonymous block's file contains its name; every API's file exists
  for (const block of Object.values(model.blocks)) {
    const absFile = path.join(REPO_ROOT, block.file);
    assert.equal(existsSync(absFile), true, `block file missing: ${block.file}`);
    if (block.name !== block.file) {
      const src = readFileSync(absFile, "utf8");
      assert.equal(
        src.includes(block.name),
        true,
        `expected ${block.file} to contain "${block.name}"`
      );
    }
  }
  for (const api of Object.values(model.apis)) {
    assert.equal(
      existsSync(path.join(REPO_ROOT, api.file)),
      true,
      `API route file missing: ${api.file}`
    );
  }

  // 5. Duplicate page component names in two files exist as distinct blocks
  const fullStyleEx = Object.values(model.blocks).find(
    (b) => b.kind === "page" && b.file === "app/full-style-ex/page.tsx"
  );
  const fullStyleIdEx = Object.values(model.blocks).find(
    (b) => b.kind === "page" && b.file === "app/full-style-id-extraction/page.tsx"
  );
  assert.ok(fullStyleEx, "missing page block for app/full-style-ex/page.tsx");
  assert.ok(fullStyleIdEx, "missing page block for app/full-style-id-extraction/page.tsx");
  assert.notEqual(fullStyleEx.id, fullStyleIdEx.id);

  // 6. RootLayout JSX children include NavBar and ChatAgent
  const rootLayout = model.blocks["app/layout.tsx#RootLayout"];
  assert.ok(rootLayout, "missing app/layout.tsx#RootLayout");
  const rootJsxChildNames = rootLayout.children
    .filter((c) => c.via === "jsx")
    .map((c) => model.blocks[c.ref]?.name);
  assert.equal(rootJsxChildNames.includes("NavBar"), true);
  assert.equal(rootJsxChildNames.includes("ChatAgent"), true);

  // 7. VtonStudioPage APIs superset check (app/studio/page.tsx exports VtonStudioPage)
  const studioPage = model.blocks["app/studio/page.tsx#VtonStudioPage"];
  assert.ok(studioPage, "missing app/studio/page.tsx#VtonStudioPage");
  for (const expectedApi of [
    "/api/vton/projects",
    "/api/vton/projects/[id]",
    "/api/vton/render",
    "/api/vton/upload",
  ]) {
    assert.equal(
      studioPage.apis.includes(expectedApi),
      true,
      `expected VtonStudioPage.apis to include ${expectedApi}, got [${studioPage.apis.join(", ")}]`
    );
  }

  // 8. components/api-mng/ui.tsx#Modal is common
  const modal = model.blocks["components/api-mng/ui.tsx#Modal"];
  assert.ok(modal, "missing components/api-mng/ui.tsx#Modal");
  assert.equal(modal.common, true);

  // 9. Transport exclusion: no block has /api/auth/session
  for (const block of Object.values(model.blocks)) {
    assert.equal(
      block.apis.includes("/api/auth/session"),
      false,
      `block ${block.id} unexpectedly includes /api/auth/session`
    );
  }

  // Sanity: generated HTML matches render(model) and has no external resource URLs
  assert.equal(html, render(model));
  assert.doesNotMatch(html, /(src|href)=["']https?:|url\(\s*["']?https?:/i);
});
