import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import config from "../../scripts/components-scafolder/config.mjs";
import { analyze, matchRoute } from "../../scripts/components-scafolder/analyze.mjs";
import { checkInvariants } from "./invariants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MINI_APP_ROOT = path.join(__dirname, "fixtures", "mini-app");

function miniConfig() {
  return { ...config, navLinksFile: "components/nav-links.ts" };
}

test("matchRoute: matches dynamic segment, wildcard fan-out, exact static, missing, and static precedence", () => {
  const routes = [
    "/api/items",
    "/api/items/[id]",
    "/api/cat/products",
    "/api/cat/brands",
    "/api/x/[id]",
    "/api/x/new",
  ];

  assert.deepEqual(matchRoute({ segments: ["api", "items", null] }, routes), [
    "/api/items/[id]",
  ]);
  assert.deepEqual(matchRoute({ segments: ["api", "cat", null] }, routes), [
    "/api/cat/brands",
    "/api/cat/products",
  ]);
  assert.deepEqual(matchRoute({ segments: ["api", "items"] }, routes), [
    "/api/items",
  ]);
  assert.deepEqual(matchRoute({ segments: ["api", "nowhere"] }, routes), []);
  assert.deepEqual(matchRoute({ segments: ["api", "x", "new"] }, routes), [
    "/api/x/new",
  ]);
});

test("apis: collects all fixture route.ts files in ascending order with sorted HTTP methods", () => {
  const model = analyze({ root: MINI_APP_ROOT, config: miniConfig() });

  assert.deepEqual(Object.keys(model.apis), [
    "/api/auth/login",
    "/api/auth/session",
    "/api/cat/brands",
    "/api/cat/products",
    "/api/items",
    "/api/items/[id]",
    "/api/things",
    "/api/unused",
  ]);
  assert.deepEqual(model.apis["/api/items"].methods, ["GET", "POST"]);
  assert.equal(
    model.apis["/api/items/[id]"].file,
    "app/api/items/[id]/route.ts"
  );
  assert.deepEqual(model.apis["/api/items/[id]"].methods, ["DELETE", "GET"]);
});

test("tree: surface root, RootLayout children order, and skipping non-component sub-layouts", () => {
  const model = analyze({ root: MINI_APP_ROOT, config: miniConfig() });

  assert.equal(model.surfaces.length, 1);
  assert.deepEqual(model.surfaces[0], {
    id: "app",
    label: "vtron 웹 (Next App Router)",
    root: "app/layout.tsx#RootLayout",
  });

  const rootBlock = model.blocks["app/layout.tsx#RootLayout"];
  assert.ok(rootBlock);
  assert.equal(rootBlock.kind, "layout");
  assert.deepEqual(rootBlock.children, [
    { ref: "components/NavBar.tsx#NavBar", via: "jsx" },
    { ref: "app/a/page.tsx#APage", via: "route" },
    { ref: "app/b/page.tsx#BPage", via: "route" },
    { ref: "app/c/page.tsx#app/c/page.tsx", via: "route" },
    { ref: "app/d/page.tsx#APage", via: "route" },
    { ref: "app/login/page.tsx#LoginPage", via: "route" },
  ]);

  // Sub-layout rendering only <div>{children}</div> is not lifted into a block
  assert.equal(
    Object.values(model.blocks).some((b) => b.file === "app/a/layout.tsx"),
    false
  );
});

test("pages: re-export merges routes, NAV_LINKS label, anonymous default name, and duplicate-names", () => {
  const model = analyze({ root: MINI_APP_ROOT, config: miniConfig() });

  // Re-export page app/page.tsx merges "/" into app/a/page.tsx#APage
  const aPage = model.blocks["app/a/page.tsx#APage"];
  assert.ok(aPage);
  assert.equal(aPage.kind, "page");
  assert.deepEqual(aPage.routes, ["/", "/a"]);
  assert.equal(aPage.label, "에이");
  assert.equal(
    Object.values(model.blocks).some((b) => b.file === "app/page.tsx"),
    false
  );

  // Anonymous default export uses file path as name
  const cPage = model.blocks["app/c/page.tsx#app/c/page.tsx"];
  assert.ok(cPage);
  assert.equal(cPage.name, "app/c/page.tsx");
  assert.deepEqual(cPage.routes, ["/c"]);

  // duplicate-names: both app/a/page.tsx#APage and app/d/page.tsx#APage exist
  const dPage = model.blocks["app/d/page.tsx#APage"];
  assert.ok(dPage);
  assert.equal(dPage.name, "APage");
  assert.equal(dPage.file, "app/d/page.tsx");
  assert.deepEqual(dPage.routes, ["/d"]);
});

test("jsx children: source order, filters non-project elements, self-recursion, and unreachable Solo", () => {
  const model = analyze({ root: MINI_APP_ROOT, config: miniConfig() });

  const aPage = model.blocks["app/a/page.tsx#APage"];
  assert.deepEqual(aPage.children, [
    { ref: "app/a/page.tsx#Row", via: "jsx" },
    { ref: "components/Shared.tsx#Shared", via: "jsx" },
    { ref: "components/x/ui/button.tsx#Button", via: "jsx" },
    { ref: "components/Tree.tsx#Tree", via: "jsx" },
  ]);

  // self-recursion: Tree does not include itself as a child
  const tree = model.blocks["components/Tree.tsx#Tree"];
  assert.ok(tree);
  assert.deepEqual(tree.children, []);

  // Solo is imported only for CONST and never rendered -> excluded
  assert.equal(model.blocks["components/Solo.tsx#Solo"], undefined);
  assert.equal(
    Object.values(model.blocks).some((b) => b.file === "components/Solo.tsx"),
    false
  );

  // usedBy reverse index
  assert.deepEqual(model.blocks["components/Shared.tsx#Shared"].usedBy, [
    "app/a/page.tsx#APage",
    "app/b/page.tsx#BPage",
  ]);
});

test("common detection: multi-parent, ui-dir, and non-common local component", () => {
  const model = analyze({ root: MINI_APP_ROOT, config: miniConfig() });

  const shared = model.blocks["components/Shared.tsx#Shared"];
  assert.equal(shared.common, true);
  assert.equal(shared.commonReason, "multi-parent");

  const button = model.blocks["components/x/ui/button.tsx#Button"];
  assert.equal(button.common, true);
  assert.equal(button.commonReason, "ui-dir");

  const row = model.blocks["app/a/page.tsx#Row"];
  assert.equal(row.common, false);
  assert.equal(row.commonReason, null);
});

test("api attribution: literals, module helper, transitive lib import, transport exclusion, and unresolved", () => {
  const model = analyze({ root: MINI_APP_ROOT, config: miniConfig() });

  const aPage = model.blocks["app/a/page.tsx#APage"];
  assert.deepEqual(aPage.apis, [
    "/api/items",
    "/api/items/[id]",
    "/api/things",
  ]);

  const bPage = model.blocks["app/b/page.tsx#BPage"];
  assert.deepEqual(bPage.apis, ["/api/cat/brands", "/api/cat/products"]);
  assert.deepEqual(model.unresolved, [
    {
      raw: "/api/nowhere",
      file: "app/b/page.tsx",
      block: "app/b/page.tsx#BPage",
    },
  ]);

  const loginPage = model.blocks["app/login/page.tsx#LoginPage"];
  assert.deepEqual(loginPage.apis, ["/api/auth/login"]);

  assert.deepEqual(model.apis["/api/unused"].usedBy, []);
  assert.deepEqual(model.apis["/api/auth/session"].usedBy, []);
});

test("invariants: SPEC §6.1 invariants hold on mini-app model", () => {
  const model = analyze({ root: MINI_APP_ROOT, config: miniConfig() });
  assert.deepEqual(checkInvariants(model), []);
});

test("deterministic: repeated analyze calls produce identical JSON", () => {
  const m1 = JSON.stringify(analyze({ root: MINI_APP_ROOT, config: miniConfig() }));
  const m2 = JSON.stringify(analyze({ root: MINI_APP_ROOT, config: miniConfig() }));
  assert.equal(m1, m2);
});
