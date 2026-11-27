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

function hasModifier(node, kind) {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((m) => m.kind === kind)
  );
}

function hasExportModifier(node) {
  return hasModifier(node, ts.SyntaxKind.ExportKeyword);
}

function hasDefaultModifier(node) {
  return hasModifier(node, ts.SyntaxKind.DefaultKeyword);
}

function globToRegExp(glob) {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    if (glob[i] === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 3;
      } else {
        re += ".*";
        i += 2;
      }
    } else if (glob[i] === "*") {
      re += "[^/]*";
      i += 1;
    } else if (glob[i] === "?") {
      re += "[^/]";
      i += 1;
    } else {
      re += glob[i].replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  re += "$";
  return new RegExp(re);
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => compareStr(a.name, b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function parseSourceFile(relFile, code) {
  const kind = relFile.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(relFile, code, ts.ScriptTarget.Latest, true, kind);
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

function routePathFromAppFile(relFile) {
  const dir = path.posix.dirname(relFile);
  const parts = dir.split("/");
  const withoutApp = parts[0] === "app" ? parts.slice(1) : parts;
  const routeParts = withoutApp.filter(
    (seg) => seg && seg !== "." && !/^\(.+\)$/.test(seg)
  );
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
    const sf = parseSourceFile(relFile, code);
    const routeName = routePathFromAppFile(relFile);
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

function unwrapExpression(expr) {
  let cur = expr;
  while (cur) {
    if (
      ts.isParenthesizedExpression(cur) ||
      ts.isAsExpression(cur) ||
      ts.isSatisfiesExpression(cur) ||
      ts.isTypeAssertionExpression(cur) ||
      ts.isNonNullExpression(cur)
    ) {
      cur = cur.expression;
    } else {
      break;
    }
  }
  return cur;
}

function unwrapReactHoc(expr) {
  let cur = unwrapExpression(expr);
  while (cur && ts.isCallExpression(cur) && cur.arguments.length > 0) {
    const callee = unwrapExpression(cur.expression);
    let calleeName = null;
    if (ts.isIdentifier(callee)) {
      calleeName = callee.text;
    } else if (
      ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.name)
    ) {
      calleeName = callee.name.text;
    }
    if (calleeName === "memo" || calleeName === "forwardRef") {
      cur = unwrapExpression(cur.arguments[0]);
    } else {
      break;
    }
  }
  return cur;
}

function containsJsx(node) {
  let found = false;
  function visit(n) {
    if (found) return;
    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  }
  if (node) visit(node);
  return found;
}

function isUpperCaseName(name) {
  return typeof name === "string" && /^[A-Z]/.test(name);
}

function scanProjectFiles(root, config) {
  const excludeRegexes = (config.exclude ?? []).map(globToRegExp);
  const scanRoots = config.scanRoots ?? ["app", "components", "lib"];
  const files = new Map();

  for (const scanRoot of scanRoots) {
    const absRoot = path.join(root, scanRoot);
    for (const absFile of walkFiles(absRoot)) {
      const relFile = toPosix(path.relative(root, absFile));
      if (!relFile.endsWith(".ts") && !relFile.endsWith(".tsx")) continue;
      if (relFile.endsWith(".d.ts")) continue;
      if (excludeRegexes.some((re) => re.test(relFile))) continue;
      if (files.has(relFile)) continue;

      const code = fs.readFileSync(absFile, "utf8");
      const sf = parseSourceFile(relFile, code);
      files.set(relFile, analyzeFileStructure(relFile, sf));
    }
  }
  return files;
}

function analyzeFileStructure(relFile, sourceFile) {
  const components = new Map(); // localName -> { name, node, relFile }
  const helpers = new Map(); // localName -> { name, node, relFile }
  const imports = new Map(); // localName -> { fromSpecifier, importedName }
  const exports = new Map(); // exportName -> { type: "local", localName } | { type: "reexport", fromSpecifier, importedName }
  const starReexports = []; // fromSpecifier[]

  for (const stmt of sourceFile.statements) {
    // Imports
    if (
      ts.isImportDeclaration(stmt) &&
      ts.isStringLiteral(stmt.moduleSpecifier) &&
      stmt.importClause &&
      !stmt.importClause.isTypeOnly
    ) {
      const fromSpecifier = stmt.moduleSpecifier.text;
      const clause = stmt.importClause;
      if (clause.name) {
        imports.set(clause.name.text, {
          fromSpecifier,
          importedName: "default",
        });
      }
      if (clause.namedBindings) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const el of clause.namedBindings.elements) {
            if (el.isTypeOnly) continue;
            const importedName = el.propertyName
              ? el.propertyName.text
              : el.name.text;
            imports.set(el.name.text, { fromSpecifier, importedName });
          }
        } else if (ts.isNamespaceImport(clause.namedBindings)) {
          imports.set(clause.namedBindings.name.text, {
            fromSpecifier,
            importedName: "*",
          });
        }
      }
      continue;
    }

    // Export declarations: export { a, b as c } [from "..."] or export * from "..."
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      const fromSpecifier =
        stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)
          ? stmt.moduleSpecifier.text
          : null;
      if (!stmt.exportClause && fromSpecifier) {
        starReexports.push(fromSpecifier);
      } else if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          if (el.isTypeOnly) continue;
          const exportName = el.name.text;
          const origName = el.propertyName ? el.propertyName.text : exportName;
          if (fromSpecifier) {
            exports.set(exportName, {
              type: "reexport",
              fromSpecifier,
              importedName: origName,
            });
          } else {
            exports.set(exportName, { type: "local", localName: origName });
          }
        }
      }
      continue;
    }

    // Export assignment: export default <expr>
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      const unwrapped = unwrapExpression(stmt.expression);
      if (ts.isIdentifier(unwrapped)) {
        exports.set("default", { type: "local", localName: unwrapped.text });
      } else {
        const inner = unwrapReactHoc(stmt.expression);
        if (
          inner &&
          (ts.isArrowFunction(inner) || ts.isFunctionExpression(inner)) &&
          containsJsx(inner.body)
        ) {
          const fnName =
            ts.isFunctionExpression(inner) &&
            inner.name &&
            isUpperCaseName(inner.name.text)
              ? inner.name.text
              : relFile;
          components.set(fnName, { name: fnName, node: inner, relFile });
          exports.set("default", { type: "local", localName: fnName });
        } else {
          helpers.set("default", {
            name: "default",
            node: stmt.expression,
            relFile,
          });
          exports.set("default", { type: "local", localName: "default" });
        }
      }
      continue;
    }

    // Function declarations
    if (ts.isFunctionDeclaration(stmt)) {
      const isExport = hasExportModifier(stmt);
      const isDefault = hasDefaultModifier(stmt);
      const hasJsx = stmt.body ? containsJsx(stmt.body) : false;

      if (stmt.name) {
        const name = stmt.name.text;
        if (isUpperCaseName(name) && hasJsx) {
          components.set(name, { name, node: stmt, relFile });
        } else {
          helpers.set(name, { name, node: stmt, relFile });
        }
        if (isExport && isDefault) {
          exports.set("default", { type: "local", localName: name });
        } else if (isExport) {
          exports.set(name, { type: "local", localName: name });
        }
      } else if (isExport && isDefault && hasJsx) {
        // Anonymous `export default function () { ... }` -> name is relFile
        components.set(relFile, { name: relFile, node: stmt, relFile });
        exports.set("default", { type: "local", localName: relFile });
      } else if (isExport && isDefault) {
        helpers.set("default", { name: "default", node: stmt, relFile });
        exports.set("default", { type: "local", localName: "default" });
      }
      continue;
    }

    // Variable statements: const X = ...
    if (ts.isVariableStatement(stmt)) {
      const isExport = hasExportModifier(stmt);
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const name = decl.name.text;
        const inner = decl.initializer ? unwrapReactHoc(decl.initializer) : null;
        const isComp =
          isUpperCaseName(name) &&
          inner &&
          (ts.isArrowFunction(inner) || ts.isFunctionExpression(inner)) &&
          containsJsx(inner.body);

        if (isComp) {
          components.set(name, { name, node: inner, relFile });
        } else if (decl.initializer) {
          helpers.set(name, { name, node: decl.initializer, relFile });
        }

        if (isExport) {
          exports.set(name, { type: "local", localName: name });
        }
      }
    }
  }

  return {
    relFile,
    sourceFile,
    components,
    helpers,
    imports,
    exports,
    starReexports,
  };
}

function resolveModulePath(fromRelFile, specifier, config, files) {
  let base = null;
  const aliases = config.pathAlias ?? {};
  for (const [prefix, target] of Object.entries(aliases)) {
    if (specifier.startsWith(prefix)) {
      base = path.posix.normalize(target + specifier.slice(prefix.length));
      break;
    }
  }
  if (base === null) {
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      base = path.posix.normalize(
        path.posix.join(path.posix.dirname(fromRelFile), specifier)
      );
    } else {
      return null;
    }
  }

  const candidates = [];
  if (base.endsWith(".tsx") || base.endsWith(".ts")) {
    candidates.push(base);
  }
  candidates.push(`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`);

  for (const cand of candidates) {
    if (files.has(cand)) return cand;
  }
  return null;
}

function resolveExportTarget(relFile, exportName, config, files, visited = new Set()) {
  const visitKey = `${relFile}#${exportName}`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const info = files.get(relFile);
  if (!info) return null;

  const entry = info.exports.get(exportName);
  if (entry) {
    if (entry.type === "local") {
      if (
        info.components.has(entry.localName) ||
        info.helpers.has(entry.localName)
      ) {
        return { file: relFile, localName: entry.localName };
      }
      // Might be re-exporting an imported identifier: `import X from "./y"; export default X;`
      const imp = info.imports.get(entry.localName);
      if (imp && imp.importedName !== "*") {
        const targetFile = resolveModulePath(
          relFile,
          imp.fromSpecifier,
          config,
          files
        );
        if (targetFile) {
          return resolveExportTarget(
            targetFile,
            imp.importedName,
            config,
            files,
            visited
          );
        }
      }
      return null;
    }
    if (entry.type === "reexport") {
      const targetFile = resolveModulePath(
        relFile,
        entry.fromSpecifier,
        config,
        files
      );
      if (!targetFile) return null;
      return resolveExportTarget(
        targetFile,
        entry.importedName,
        config,
        files,
        visited
      );
    }
  }

  if (exportName !== "default") {
    for (const starSpec of info.starReexports) {
      const targetFile = resolveModulePath(relFile, starSpec, config, files);
      if (!targetFile) continue;
      const found = resolveExportTarget(
        targetFile,
        exportName,
        config,
        files,
        visited
      );
      if (found) return found;
    }
  }

  return null;
}

function collectJsxChildren(compInfo, fileInfo, config, files) {
  const selfId = `${compInfo.relFile}#${compInfo.name}`;
  const seen = new Set();
  const children = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName;
      if (ts.isIdentifier(tag) && isUpperCaseName(tag.text)) {
        const tagName = tag.text;
        let targetId = null;

        if (fileInfo.components.has(tagName)) {
          targetId = `${fileInfo.relFile}#${tagName}`;
        } else {
          const imp = fileInfo.imports.get(tagName);
          if (imp && imp.importedName !== "*") {
            const targetFile = resolveModulePath(
              fileInfo.relFile,
              imp.fromSpecifier,
              config,
              files
            );
            if (targetFile) {
              const resolved = resolveExportTarget(
                targetFile,
                imp.importedName,
                config,
                files
              );
              if (resolved) {
                const targetInfo = files.get(resolved.file);
                if (targetInfo?.components.has(resolved.localName)) {
                  targetId = `${resolved.file}#${resolved.localName}`;
                }
              }
            }
          }
        }

        if (targetId && targetId !== selfId && !seen.has(targetId)) {
          seen.add(targetId);
          children.push({ ref: targetId, via: "jsx" });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(compInfo.node);
  return children;
}

function readNavLinks(root, config) {
  const map = new Map();
  if (!config.navLinksFile) return map;
  const absFile = path.join(root, config.navLinksFile);
  if (!fs.existsSync(absFile)) return map;

  const code = fs.readFileSync(absFile, "utf8");
  const sf = parseSourceFile(config.navLinksFile, code);

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== "NAV_LINKS") continue;
      const arr = decl.initializer ? unwrapExpression(decl.initializer) : null;
      if (!arr || !ts.isArrayLiteralExpression(arr)) continue;
      for (const el of arr.elements) {
        const obj = unwrapExpression(el);
        if (!obj || !ts.isObjectLiteralExpression(obj)) continue;
        let href = null;
        let label = null;
        for (const prop of obj.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const key = ts.isIdentifier(prop.name)
            ? prop.name.text
            : ts.isStringLiteral(prop.name)
              ? prop.name.text
              : null;
          const val = unwrapExpression(prop.initializer);
          if (key === "href" && ts.isStringLiteral(val)) href = val.text;
          if (key === "label" && ts.isStringLiteral(val)) label = val.text;
        }
        if (href && label) {
          map.set(href, label);
        }
      }
    }
  }
  return map;
}

function findNearestLayout(fileDir, activeLayoutsByDir, rootLayoutDir) {
  let cur = fileDir;
  while (true) {
    if (activeLayoutsByDir.has(cur)) {
      return activeLayoutsByDir.get(cur);
    }
    if (cur === rootLayoutDir || cur === "." || cur === "") {
      return activeLayoutsByDir.get(rootLayoutDir) ?? null;
    }
    const parent = path.posix.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return activeLayoutsByDir.get(rootLayoutDir) ?? null;
}

export function analyze({ root, config }) {
  const apis = collectApiRoutes(root, config);
  const files = scanProjectFiles(root, config);
  const navLinks = readNavLinks(root, config);

  // Build candidate blocks for every component across scanned files
  const allBlocks = new Map();
  for (const fileInfo of files.values()) {
    for (const compInfo of fileInfo.components.values()) {
      const id = `${compInfo.relFile}#${compInfo.name}`;
      const jsxChildren = collectJsxChildren(compInfo, fileInfo, config, files);
      allBlocks.set(id, {
        id,
        name: compInfo.name,
        file: compInfo.relFile,
        kind: "component",
        routes: [],
        label: null,
        common: false,
        commonReason: null,
        children: jsxChildren,
        apis: [],
        usedBy: [],
      });
    }
  }

  // Surface root layout
  const rootLayoutFile = config.surface?.rootLayout ?? "app/layout.tsx";
  const rootLayoutDir = path.posix.dirname(rootLayoutFile);
  const rootTarget = resolveExportTarget(rootLayoutFile, "default", config, files);
  const rootId = rootTarget ? `${rootTarget.file}#${rootTarget.localName}` : null;

  const activeLayoutsByDir = new Map();
  const layoutRouteChildren = new Map(); // layoutId -> Map<childId, primaryRoute>

  if (rootId && allBlocks.has(rootId)) {
    allBlocks.get(rootId).kind = "layout";
    activeLayoutsByDir.set(rootLayoutDir, rootId);
    layoutRouteChildren.set(rootId, new Map());
  }

  // Check sub-layouts: only promote to layout block if it renders at least 1 project component
  const subLayoutFiles = [...files.keys()]
    .filter(
      (f) =>
        f !== rootLayoutFile &&
        f.startsWith("app/") &&
        (f.endsWith("/layout.tsx") || f.endsWith("/layout.ts"))
    )
    .sort((a, b) => a.split("/").length - b.split("/").length || compareStr(a, b));

  for (const layoutFile of subLayoutFiles) {
    const target = resolveExportTarget(layoutFile, "default", config, files);
    if (!target) continue;
    const blockId = `${target.file}#${target.localName}`;
    const block = allBlocks.get(blockId);
    if (!block || block.children.length === 0) continue;

    block.kind = "layout";
    const dir = path.posix.dirname(layoutFile);
    const parentDir = path.posix.dirname(dir);
    const parentLayoutId = findNearestLayout(
      parentDir,
      activeLayoutsByDir,
      rootLayoutDir
    );
    activeLayoutsByDir.set(dir, blockId);
    layoutRouteChildren.set(blockId, new Map());

    if (parentLayoutId && parentLayoutId !== blockId) {
      const route = routePathFromAppFile(layoutFile);
      const map = layoutRouteChildren.get(parentLayoutId);
      if (!map.has(blockId) || compareStr(route, map.get(blockId)) < 0) {
        map.set(blockId, route);
      }
    }
  }

  // Collect pages and attach routes
  const pageFiles = [...files.keys()]
    .filter(
      (f) =>
        f.startsWith("app/") &&
        (f === "app/page.tsx" ||
          f === "app/page.ts" ||
          f.endsWith("/page.tsx") ||
          f.endsWith("/page.ts"))
    )
    .sort(compareStr);

  const pageRoutes = new Map(); // blockId -> Set<string>
  const pageParentLayout = new Map(); // blockId -> layoutId

  for (const pageFile of pageFiles) {
    const target = resolveExportTarget(pageFile, "default", config, files);
    if (!target) continue;
    const blockId = `${target.file}#${target.localName}`;
    const block = allBlocks.get(blockId);
    if (!block) continue;

    block.kind = "page";
    const route = routePathFromAppFile(pageFile);
    if (!pageRoutes.has(blockId)) pageRoutes.set(blockId, new Set());
    pageRoutes.get(blockId).add(route);

    // Attach to nearest active layout of the target page's directory (or pageFile's directory)
    const dir = path.posix.dirname(target.file);
    const layoutId = findNearestLayout(dir, activeLayoutsByDir, rootLayoutDir);
    if (layoutId && !pageParentLayout.has(blockId)) {
      pageParentLayout.set(blockId, layoutId);
    }
  }

  // Finalize page routes, labels, and register under their parent layout
  for (const [blockId, routeSet] of pageRoutes.entries()) {
    const block = allBlocks.get(blockId);
    const sortedRoutes = [...routeSet].sort(compareStr);
    block.routes = sortedRoutes;

    for (const r of sortedRoutes) {
      if (navLinks.has(r)) {
        block.label = navLinks.get(r);
        break;
      }
    }

    const layoutId = pageParentLayout.get(blockId);
    if (layoutId && layoutRouteChildren.has(layoutId)) {
      const primaryRoute = sortedRoutes[0];
      const map = layoutRouteChildren.get(layoutId);
      if (!map.has(blockId) || compareStr(primaryRoute, map.get(blockId)) < 0) {
        map.set(blockId, primaryRoute);
      }
    }
  }

  // Append route children (sorted by primary route ascending) after JSX children on each layout
  for (const [layoutId, routeMap] of layoutRouteChildren.entries()) {
    const layoutBlock = allBlocks.get(layoutId);
    const existingRefs = new Set(layoutBlock.children.map((c) => c.ref));
    const sortedRouteEntries = [...routeMap.entries()].sort(
      (a, b) => compareStr(a[1], b[1]) || compareStr(a[0], b[0])
    );
    for (const [childId] of sortedRouteEntries) {
      if (!existingRefs.has(childId)) {
        existingRefs.add(childId);
        layoutBlock.children.push({ ref: childId, via: "route" });
      }
    }
  }

  // Prune unreachable blocks starting from surface root
  const reachable = new Set();
  if (rootId && allBlocks.has(rootId)) {
    const queue = [rootId];
    reachable.add(rootId);
    while (queue.length > 0) {
      const curId = queue.shift();
      const block = allBlocks.get(curId);
      for (const child of block.children) {
        if (allBlocks.has(child.ref) && !reachable.has(child.ref)) {
          reachable.add(child.ref);
          queue.push(child.ref);
        }
      }
    }
  }

  // Build final sorted blocks map & usedBy reverse index
  const reachableIds = [...reachable].sort(compareStr);
  const blocks = {};
  for (const id of reachableIds) {
    blocks[id] = allBlocks.get(id);
  }

  const usedBySets = new Map(reachableIds.map((id) => [id, new Set()]));
  for (const id of reachableIds) {
    for (const child of blocks[id].children) {
      if (usedBySets.has(child.ref)) {
        usedBySets.get(child.ref).add(id);
      }
    }
  }
  for (const id of reachableIds) {
    blocks[id].usedBy = [...usedBySets.get(id)].sort(compareStr);
  }

  const surfaces =
    rootId && blocks[rootId]
      ? [
          {
            id: config.surface?.id ?? "app",
            label: config.surface?.label ?? "vtron 웹 (Next App Router)",
            root: rootId,
          },
        ]
      : [];

  return {
    version: 1,
    project: config.project ?? "vtron",
    surfaces,
    blocks,
    apis,
    unresolved: [],
  };
}
