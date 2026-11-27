import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function compareStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isDynamicSegment(seg) {
  return /^\[.+\]$/.test(seg);
}

function hasExportModifier(node) {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => compareStr(a.name, b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function extractRouteMethods(sourceFile) {
  const methods = new Set();
  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && hasExportModifier(stmt) && stmt.name) {
      if (HTTP_METHODS.has(stmt.name.text)) {
        methods.add(stmt.name.text);
      }
    } else if (ts.isVariableStatement(stmt) && hasExportModifier(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && HTTP_METHODS.has(decl.name.text)) {
          methods.add(decl.name.text);
        }
      }
    } else if (
      ts.isExportDeclaration(stmt) &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause)
    ) {
      for (const spec of stmt.exportClause.elements) {
        if (HTTP_METHODS.has(spec.name.text)) {
          methods.add(spec.name.text);
        }
      }
    }
  }
  return [...methods].sort(compareStr);
}

function routePathFromApiFile(relFile) {
  const dir = path.posix.dirname(relFile);
  // relFile is e.g. "app/api/items/[id]/route.ts" -> dir "app/api/items/[id]"
  const parts = dir.split("/");
  // strip leading "app" and any Next.js route group segments like "(group)"
  const withoutApp = parts[0] === "app" ? parts.slice(1) : parts;
  const routeParts = withoutApp.filter((seg) => seg && !/^\(.+\)$/.test(seg));
  return "/" + routeParts.join("/");
}

function collectApiRoutes(root, config) {
  const apiDir = path.join(root, config.apiRoot ?? "app/api");
  const files = walkFiles(apiDir).filter((f) => {
    const base = path.basename(f);
    return base === "route.ts" || base === "route.tsx";
  });

  const entries = [];
  for (const absFile of files) {
    const relFile = toPosix(path.relative(root, absFile));
    const code = fs.readFileSync(absFile, "utf8");
    const kind = relFile.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(relFile, code, ts.ScriptTarget.Latest, true, kind);
    const routeName = routePathFromApiFile(relFile);
    const methods = extractRouteMethods(sf);
    entries.push([
      routeName,
      {
        name: routeName,
        file: relFile,
        methods,
        usedBy: [],
      },
    ]);
  }

  entries.sort((a, b) => compareStr(a[0], b[0]));
  return Object.fromEntries(entries);
}

/**
 * Normalize a sequence of literal text / dynamic expression pieces into
 * `{ segments: (string | null)[] }` according to SPEC §3.3 rule 1.
 * Pieces: Array<{ type: "text", value: string } | { type: "expr" }>
 */
export function normalizeApiPieces(pieces) {
  const segments = [];
  let curText = "";
  let curHasExpr = false;
  let curStarted = false;

  const flushSegment = () => {
    if (!curStarted) return;
    if (curHasExpr) {
      segments.push(null);
    } else if (curText.length > 0) {
      segments.push(curText);
    }
    curText = "";
    curHasExpr = false;
    curStarted = false;
  };

  let stopped = false;
  for (const piece of pieces) {
    if (stopped) break;
    if (piece.type === "text") {
      let text = piece.value;
      const qIdx = text.search(/[?#]/);
      if (qIdx !== -1) {
        text = text.slice(0, qIdx);
        stopped = true;
      }
      const parts = text.split("/");
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i > 0) {
          flushSegment();
        }
        if (part.length > 0) {
          curStarted = true;
          curText += part;
        }
      }
    } else if (piece.type === "expr") {
      curStarted = true;
      curHasExpr = true;
    }
  }
  flushSegment();
  return { segments };
}

/**
 * Match a normalized API literal `{ segments: (string | null)[] }` against
 * the known Next.js route patterns.
 */
export function matchRoute(literal, routes) {
  const litSegs = literal?.segments ?? [];
  if (litSegs.length === 0) return [];

  const hasWildcard = litSegs.some((s) => s === null);
  const candidates = [];

  for (const route of routes) {
    const routeSegs = route.split("/").filter(Boolean);
    if (routeSegs.length !== litSegs.length) continue;

    let ok = true;
    let staticCount = 0;
    for (let i = 0; i < litSegs.length; i++) {
      const lit = litSegs[i];
      const rSeg = routeSegs[i];
      const dynamic = isDynamicSegment(rSeg);
      if (!dynamic) staticCount++;
      if (lit === null) {
        continue;
      }
      if (!dynamic && rSeg !== lit) {
        ok = false;
        break;
      }
    }
    if (ok) {
      candidates.push({ route, staticCount });
    }
  }

  if (candidates.length === 0) return [];

  if (!hasWildcard) {
    candidates.sort(
      (a, b) => b.staticCount - a.staticCount || compareStr(a.route, b.route)
    );
    return [candidates[0].route];
  }

  return candidates.map((c) => c.route).sort(compareStr);
}

export function analyze({ root, config }) {
  const apis = collectApiRoutes(root, config);

  return {
    version: 1,
    project: config.project ?? "vtron",
    surfaces: [],
    blocks: {},
    apis,
    unresolved: [],
  };
}
