import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import config from "../../scripts/components-scafolder/config.mjs";
import { analyze, matchRoute } from "../../scripts/components-scafolder/analyze.mjs";

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
