import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const logicPath = path.join(rootDir, "scripts/components-scafolder/client/logic.js");
const fixturePath = path.join(__dirname, "fixtures/model.json");

function loadLogic() {
  const code = readFileSync(logicPath, "utf8");
  const ctx = {};
  ctx.globalThis = ctx;
  vm.runInNewContext(code, ctx);
  return ctx.ScafLogic;
}

const model = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("ScafLogic", () => {
  it("search-literal: treats regex special characters as plain substrings", () => {
    const { matches } = loadLogic();
    assert.equal(matches({ name: "a.b" }, "."), true);
    assert.equal(matches({ name: "ab" }, "."), false);
    assert.equal(matches({ name: "Foo", apis: ["/api/items/[id]"] }, "[id]"), true);
    assert.equal(matches({ name: "Foo", apis: ["/api/items/id"] }, "[id]"), false);
    assert.equal(matches({ name: "Foo(Bar)" }, "("), true);
    assert.equal(matches({ name: "FooBar" }, "("), false);
    assert.equal(matches({ name: "a*b+c?" }, "*b+"), true);
  });

  it("matches case-insensitively on name, file path, and API names", () => {
    const { matches } = loadLogic();
    assert.equal(matches({ name: "StudioPage" }, "studio"), true);
    assert.equal(matches({ name: "StudioPage" }, "STUDIOPAGE"), true);
    assert.equal(
      matches({ name: "X", file: "components/StudioHeader.tsx", apis: [] }, "studioheader"),
      true,
    );
    assert.equal(
      matches({ name: "X", file: "app/a/page.tsx", apis: ["/api/vton/projects/[id]"] }, "VTON/PROJECTS"),
      true,
    );
    assert.equal(
      matches({ name: "X", file: "app/a/page.tsx", apis: ["/api/items"] }, "nomatch"),
      false,
    );
    assert.equal(matches({ name: "X" }, ""), true);
    assert.equal(matches({ name: "X" }, "   "), true);
  });

  it("ancestors walks parent chain and handles mutual recursion without infinite loop", () => {
    const { ancestors } = loadLogic();
    assert.deepEqual(Array.from(ancestors(model, "components/GrandChild.tsx#GrandChild")), [
      "components/ParentBox.tsx#ParentBox",
      "app/a/page.tsx#APage",
      "app/layout.tsx#RootLayout",
    ]);
    assert.deepEqual(Array.from(ancestors(model, "app/layout.tsx#RootLayout")), []);
    assert.deepEqual(Array.from(ancestors(model, "nonexistent#Id")), []);

    const cycleAnc = Array.from(ancestors(model, "components/CycleLocal.tsx#CycleLocal"));
    assert.equal(cycleAnc.includes("components/CycleCommon.tsx#CycleCommon"), true);
    assert.equal(cycleAnc.includes("app/a/page.tsx#APage"), true);
    assert.equal(cycleAnc.includes("app/layout.tsx#RootLayout"), true);
    assert.equal(cycleAnc.includes("components/CycleLocal.tsx#CycleLocal"), false);
  });

  it("visibleSet includes grandchild and full ancestor chain up to RootLayout", () => {
    const { visibleSet } = loadLogic();
    const set = visibleSet(model, "GrandChild");
    assert.deepEqual(
      [...set].sort(),
      [
        "app/a/page.tsx#APage",
        "app/layout.tsx#RootLayout",
        "components/GrandChild.tsx#GrandChild",
        "components/ParentBox.tsx#ParentBox",
      ],
    );
  });

  it("visibleSet includes common block and all ancestor chains of its usages", () => {
    const { visibleSet } = loadLogic();
    const set = visibleSet(model, "UiButton");
    assert.deepEqual(
      [...set].sort(),
      [
        "app/a/page.tsx#APage",
        "app/b/page.tsx#BPage",
        "app/layout.tsx#RootLayout",
        "components/SharedModal.tsx#SharedModal",
        "components/ui/Button.tsx#UiButton",
      ],
    );
  });

  it("visibleSet returns all block ids for empty query", () => {
    const { visibleSet } = loadLogic();
    const set = visibleSet(model, "");
    assert.deepEqual([...set].sort(), Object.keys(model.blocks).sort());
  });

  it("parseHash and formatHash round-trip block ids and reject invalid hashes", () => {
    const { parseHash, formatHash } = loadLogic();
    assert.equal(parseHash("#b=app%2Fx.tsx%23X"), "app/x.tsx#X");
    assert.equal(formatHash("app/x.tsx#X"), "#b=app%2Fx.tsx%23X");
    assert.equal(parseHash(formatHash("components/Evil.tsx#</script><b>Evil</b>")), "components/Evil.tsx#</script><b>Evil</b>");

    assert.equal(parseHash(""), null);
    assert.equal(parseHash("#"), null);
    assert.equal(parseHash("#b="), null);
    assert.equal(parseHash("#other=app%2Fx.tsx%23X"), null);
    assert.equal(parseHash("b=app%2Fx.tsx%23X"), null);
    assert.equal(parseHash("#b=%E0%A4%A"), null);
    assert.equal(parseHash(null), null);
    assert.equal(parseHash(undefined), null);
  });
});
