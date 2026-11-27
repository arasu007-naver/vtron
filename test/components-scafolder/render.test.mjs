import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "fixtures/model.json");
const model = JSON.parse(readFileSync(fixturePath, "utf8"));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count += 1;
    pos = idx + needle.length;
  }
  return count;
}

async function getRender() {
  const mod = await import("../../scripts/components-scafolder/render.mjs");
  return mod.render;
}

describe("render(model)", () => {
  it("starts with doctype, utf-8 meta, and generator header comment", async () => {
    const render = await getRender();
    const html = render(model);
    assert.equal(html.startsWith("<!doctype html>"), true);
    assert.equal(html.includes('<meta charset="utf-8">'), true);
    const headChunk = html.slice(0, 600);
    assert.equal(headChunk.includes("npm run docs:scafolder"), true);
    assert.equal(headChunk.includes("<!--"), true);
  });

  it("offline: contains no external http(s) resource references", async () => {
    const render = await getRender();
    const html = render(model);
    const externalRe = /(src|href)=["']https?:|url\(\s*["']?https?:/i;
    assert.equal(externalRe.test(html), false);
  });

  it("renders copy buttons with data-copy for every block name, child, API, file, and route", async () => {
    const render = await getRender();
    const html = render(model);

    const expectedCopyValues = new Set();
    for (const block of Object.values(model.blocks)) {
      expectedCopyValues.add(block.name);
      expectedCopyValues.add(block.file);
      for (const ch of block.children) {
        const target = model.blocks[ch.ref];
        if (target) expectedCopyValues.add(target.name);
      }
      for (const apiName of block.apis) {
        expectedCopyValues.add(apiName);
      }
      for (const route of block.routes) {
        expectedCopyValues.add(route);
      }
    }
    for (const api of Object.values(model.apis)) {
      expectedCopyValues.add(api.name);
      expectedCopyValues.add(api.file);
    }

    for (const value of expectedCopyValues) {
      const attr = `data-copy="${escapeHtml(value)}"`;
      assert.equal(
        html.includes(attr),
        true,
        `Expected copy button containing ${attr}`,
      );
    }
  });

  it("renders each block card exactly once and common reference chips matching usage count", async () => {
    const render = await getRender();
    const html = render(model);

    for (const block of Object.values(model.blocks)) {
      const cardAttr = `data-block-id="${escapeHtml(block.id)}"`;
      assert.equal(
        countOccurrences(html, cardAttr),
        1,
        `Block card ${block.id} should appear exactly once`,
      );
    }

    for (const block of Object.values(model.blocks)) {
      if (!block.common) continue;
      let expectedRefs = 0;
      for (const parent of Object.values(model.blocks)) {
        if (parent.children.some((c) => c.ref === block.id)) {
          expectedRefs += 1;
        }
      }
      const refAttr = `data-ref="${escapeHtml(block.id)}"`;
      assert.equal(
        countOccurrences(html, refAttr),
        expectedRefs,
        `Common block ${block.id} should have ${expectedRefs} reference chips`,
      );
    }
  });

  it("shows (없음) twice inside an empty block card", async () => {
    const render = await getRender();
    const html = render(model);

    const marker = `data-block-id="${escapeHtml("components/NavBar.tsx#NavBar")}"`;
    const startIdx = html.indexOf(marker);
    assert.notEqual(startIdx, -1);
    const endIdx = html.indexOf("</article>", startIdx);
    assert.notEqual(endIdx, -1);
    const cardHtml = html.slice(startIdx, endIdx);

    assert.equal(cardHtml.includes("하위 블록"), true);
    assert.equal(cardHtml.includes("API"), true);
    assert.equal(countOccurrences(cardHtml, "(없음)"), 2);
  });

  it("escapes-script-close: inline JSON has no </script> literal and round-trips to original model", async () => {
    const render = await getRender();
    const html = render(model);

    const match = html.match(
      /<script type="application\/json" id="model">([\s\S]*?)<\/script>/,
    );
    assert.ok(match, "Expected <script type=\"application/json\" id=\"model\"> block");
    const jsonChunk = match[1];
    assert.equal(jsonChunk.toLowerCase().includes("</script>"), false);
    assert.equal(jsonChunk.includes("<"), false);
    const parsed = JSON.parse(jsonChunk);
    assert.deepEqual(parsed, model);
  });

  it("cycle-safe: handles mutual recursion and renders non-common CycleLocal once", async () => {
    const render = await getRender();
    const html = render(model);

    const localAttr = `data-block-id="${escapeHtml("components/CycleLocal.tsx#CycleLocal")}"`;
    assert.equal(countOccurrences(html, localAttr), 1);

    const commonAttr = `data-block-id="${escapeHtml("components/CycleCommon.tsx#CycleCommon")}"`;
    assert.equal(countOccurrences(html, commonAttr), 1);

    // Defensive check: even a synthetic non-common <-> non-common cycle terminates safely
    const cyclicModel = structuredClone(model);
    cyclicModel.blocks["components/ParentBox.tsx#ParentBox"].children.push({
      ref: "components/GrandChild.tsx#GrandChild",
      via: "jsx",
    });
    cyclicModel.blocks["components/GrandChild.tsx#GrandChild"].children.push({
      ref: "components/ParentBox.tsx#ParentBox",
      via: "jsx",
    });
    const cyclicHtml = render(cyclicModel);
    assert.equal(typeof cyclicHtml, "string");
    assert.equal(
      countOccurrences(
        cyclicHtml,
        `data-block-id="${escapeHtml("components/ParentBox.tsx#ParentBox")}"`,
      ),
      1,
    );
  });

  it("renders full API list in ascending order, marks unused APIs, and shows unresolved calls", async () => {
    const render = await getRender();
    const html = render(model);

    const apiSectionStart = html.indexOf('id="api-list"');
    assert.notEqual(apiSectionStart, -1, "Expected #api-list section");
    const apiSection = html.slice(apiSectionStart);

    const apiNames = Object.keys(model.apis).sort();
    let prevPos = -1;
    for (const apiName of apiNames) {
      const pos = apiSection.indexOf(`data-api-name="${escapeHtml(apiName)}"`);
      assert.notEqual(pos, -1, `Expected API item ${apiName}`);
      assert.equal(pos > prevPos, true, `Expected ${apiName} in ascending order`);
      prevPos = pos;
    }

    assert.equal(apiSection.includes("화면 호출 없음"), true);
    assert.equal(apiSection.includes("미해결 호출"), true);
    assert.equal(apiSection.includes(escapeHtml("/api/nowhere/${id}")), true);
  });

  it("is deterministic: render(model) === render(model)", async () => {
    const render = await getRender();
    assert.equal(render(model), render(model));
  });

  it("inlines valid JS scripts and keeps copy, toggle, and jump buttons distinct", async () => {
    const render = await getRender();
    const html = render(model);

    const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scriptMatches.length, 2, "Expected logic.js and app.js inline script tags");
    for (const m of scriptMatches) {
      assert.equal(m[1].trim().length > 0, true, "Inline script should not be empty");
      assert.doesNotThrow(() => new vm.Script(m[1]), "Inline script must be valid JS");
    }

    // Ensure no button element combines copy with toggle-btn or jump
    const buttonTags = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
    for (const tag of buttonTags) {
      const clsMatch = tag.match(/class="([^"]*)"/);
      if (!clsMatch) continue;
      const classes = clsMatch[1].split(/\s+/);
      if (classes.includes("copy")) {
        assert.equal(classes.includes("toggle-btn"), false);
        assert.equal(classes.includes("jump"), false);
      }
    }
  });
});
