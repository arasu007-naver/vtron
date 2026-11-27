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

function isApiPrefixNode(expr) {
  const u = unwrapExpression(expr);
  if (!u) return false;
  if (ts.isStringLiteral(u) || ts.isNoSubstitutionTemplateLiteral(u)) {
    return u.text.startsWith("/api/");
  }
  if (ts.isTemplateExpression(u)) {
    return u.head.text.startsWith("/api/");
  }
  return false;
}

function flattenPlusChain(expr, out = []) {
  const u = unwrapExpression(expr);
  if (
    u &&
    ts.isBinaryExpression(u) &&
    u.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    flattenPlusChain(u.left, out);
    flattenPlusChain(u.right, out);
  } else if (u) {
    out.push(u);
  }
  return out;
}

function isNonValueIdentifierPosition(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return true;
  if (ts.isParameter(parent) && parent.name === node) return true;
  if (ts.isVariableDeclaration(parent) && parent.name === node) return true;
  if (ts.isFunctionDeclaration(parent) && parent.name === node) return true;
  if (ts.isFunctionExpression(parent) && parent.name === node) return true;
  if (ts.isBindingElement(parent) && parent.name === node) return true;
  if (ts.isPropertySignature(parent) && parent.name === node) return true;
  if (ts.isJsxAttribute(parent) && parent.name === node) return true;
  if (ts.isJsxOpeningElement(parent) && parent.tagName === node) return true;
  if (ts.isJsxSelfClosingElement(parent) && parent.tagName === node) return true;
  if (ts.isJsxClosingElement(parent) && parent.tagName === node) return true;
  if (ts.isLabeledStatement(parent) && parent.label === node) return true;
  if (ts.isBreakOrContinueStatement(parent) && parent.label === node) return true;
  return false;
}

function isNonValueStringPosition(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isPropertySignature(parent) && parent.name === node) return true;
  if (ts.isLiteralTypeNode(parent)) return true;
  if (ts.isCaseClause(parent) && parent.expression === node) return false;
  return false;
}

function extractLiteralsAndRefs(rootNode, sourceFile) {
  const literals = [];
  const identifiers = new Set();
  const namespaceAccesses = []; // { ns: string, prop: string }

  function visit(node) {
    if (!node) return;
    if (
      ts.isTypeNode(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isImportDeclaration(node)
    ) {
      return;
    }

    // Binary '+' chain starting with "/api/"
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const operands = flattenPlusChain(node);
      if (operands.length > 0 && isApiPrefixNode(operands[0])) {
        const pieces = [];
        for (const op of operands) {
          if (ts.isStringLiteral(op) || ts.isNoSubstitutionTemplateLiteral(op)) {
            pieces.push({ type: "text", value: op.text });
          } else if (ts.isTemplateExpression(op)) {
            pieces.push({ type: "text", value: op.head.text });
            for (const span of op.templateSpans) {
              pieces.push({ type: "expr" });
              pieces.push({ type: "text", value: span.literal.text });
              visit(span.expression);
            }
          } else {
            pieces.push({ type: "expr" });
            visit(op);
          }
        }
        literals.push({
          raw: node.getText(sourceFile),
          normalized: normalizeApiPieces(pieces),
        });
        return;
      }
    }

    // Template expression starting with "/api/"
    if (ts.isTemplateExpression(node) && node.head.text.startsWith("/api/")) {
      const pieces = [{ type: "text", value: node.head.text }];
      for (const span of node.templateSpans) {
        pieces.push({ type: "expr" });
        pieces.push({ type: "text", value: span.literal.text });
        visit(span.expression);
      }
      const rawText = node.getText(sourceFile);
      literals.push({
        raw: rawText.slice(1, -1),
        normalized: normalizeApiPieces(pieces),
      });
      return;
    }

    // Plain string / no-substitution template literal starting with "/api/"
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      node.text.startsWith("/api/") &&
      !isNonValueStringPosition(node)
    ) {
      literals.push({
        raw: node.text,
        normalized: normalizeApiPieces([{ type: "text", value: node.text }]),
      });
      return;
    }

    // Track namespace property accesses (e.g. `client.fetchThings`)
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ts.isIdentifier(node.name)
    ) {
      namespaceAccesses.push({
        ns: node.expression.text,
        prop: node.name.text,
      });
    }

    // Track value identifiers
    if (ts.isIdentifier(node) && !isNonValueIdentifierPosition(node)) {
      identifiers.add(node.text);
    }

    // For JSX elements, skip tagName itself (handled by JSX child graph) but visit attributes and children
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      visit(node.attributes);
      return;
    }
    if (ts.isJsxClosingElement(node)) {
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(rootNode);
  return { literals, identifiers, namespaceAccesses };
}

function isTransportSymbol(relFile, symbolName, config) {
  const list = config.transport?.[relFile];
  return Array.isArray(list) && list.includes(symbolName);
}

function collectBlockApis(compInfo, fileInfo, config, files, routeList) {
  const MAX_CROSS_FILE_DEPTH = 4;
  const matchedRoutes = new Set();
  const unresolvedMap = new Map(); // `${file}\0${raw}` -> { raw, file }
  const visited = new Set();

  function recordLiterals(literals, sourceRelFile) {
    for (const lit of literals) {
      const matched = matchRoute(lit.normalized, routeList);
      if (matched.length > 0) {
        for (const r of matched) matchedRoutes.add(r);
      } else {
        const key = `${sourceRelFile}\0${lit.raw}`;
        if (!unresolvedMap.has(key)) {
          unresolvedMap.set(key, { raw: lit.raw, file: sourceRelFile });
        }
      }
    }
  }

  function followSymbol(curRelFile, astNode, depth) {
    const curInfo = files.get(curRelFile);
    if (!curInfo) return;

    const { literals, identifiers, namespaceAccesses } = extractLiteralsAndRefs(
      astNode,
      curInfo.sourceFile
    );
    recordLiterals(literals, curRelFile);

    // 1. Same-file non-component helpers (transitive, cycle-guarded)
    for (const ident of identifiers) {
      if (curInfo.helpers.has(ident)) {
        if (isTransportSymbol(curRelFile, ident, config)) continue;
        const visitKey = `${curRelFile}#${ident}`;
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);
        followSymbol(curRelFile, curInfo.helpers.get(ident).node, depth);
      }
    }

    // 2. Imported project value identifiers (up to MAX_CROSS_FILE_DEPTH)
    if (depth >= MAX_CROSS_FILE_DEPTH) return;

    const followImportTarget = (fromSpecifier, importedName) => {
      const targetFile = resolveModulePath(
        curRelFile,
        fromSpecifier,
        config,
        files
      );
      if (!targetFile) return;
      if (isTransportSymbol(targetFile, importedName, config)) return;

      const resolved = resolveExportTarget(
        targetFile,
        importedName,
        config,
        files
      );
      if (!resolved) return;
      if (isTransportSymbol(resolved.file, resolved.localName, config)) return;

      const targetInfo = files.get(resolved.file);
      if (!targetInfo || !targetInfo.helpers.has(resolved.localName)) return;

      const visitKey = `${resolved.file}#${resolved.localName}`;
      if (visited.has(visitKey)) return;
      visited.add(visitKey);
      followSymbol(
        resolved.file,
        targetInfo.helpers.get(resolved.localName).node,
        depth + 1
      );
    };

    for (const ident of identifiers) {
      if (curInfo.helpers.has(ident) || curInfo.components.has(ident)) continue;
      const imp = curInfo.imports.get(ident);
      if (!imp || imp.importedName === "*") continue;
      followImportTarget(imp.fromSpecifier, imp.importedName);
    }

    for (const { ns, prop } of namespaceAccesses) {
      const imp = curInfo.imports.get(ns);
      if (!imp || imp.importedName !== "*") continue;
      followImportTarget(imp.fromSpecifier, prop);
    }
  }

  visited.add(`${fileInfo.relFile}#${compInfo.name}`);
  followSymbol(fileInfo.relFile, compInfo.node, 0);

  return {
    apis: [...matchedRoutes].sort(compareStr),
    unresolved: [...unresolvedMap.values()],
  };
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

  // Common detection (SPEC §2)
  const isUiDir = typeof config.isUiDir === "function" ? config.isUiDir : () => false;
  for (const id of reachableIds) {
    const block = blocks[id];
    if (block.kind === "page" || block.kind === "layout") {
      block.common = false;
      block.commonReason = null;
    } else if (block.usedBy.length >= 2) {
      block.common = true;
      block.commonReason = "multi-parent";
    } else if (isUiDir(block.file)) {
      block.common = true;
      block.commonReason = "ui-dir";
    } else {
      block.common = false;
      block.commonReason = null;
    }
  }

  // API attribution (SPEC §3.2 & §3.3)
  const routeList = Object.keys(apis);
  const apiUsedBySets = new Map(routeList.map((r) => [r, new Set()]));
  const unresolved = [];

  for (const id of reachableIds) {
    const block = blocks[id];
    const fileInfo = files.get(block.file);
    const compInfo = fileInfo?.components.get(block.name);
    if (!fileInfo || !compInfo) continue;

    const { apis: blockApis, unresolved: blockUnresolved } = collectBlockApis(
      compInfo,
      fileInfo,
      config,
      files,
      routeList
    );
    block.apis = blockApis;
    for (const r of blockApis) {
      apiUsedBySets.get(r)?.add(id);
    }
    for (const item of blockUnresolved) {
      unresolved.push({ raw: item.raw, file: item.file, block: id });
    }
  }

  for (const route of routeList) {
    apis[route].usedBy = [...apiUsedBySets.get(route)].sort(compareStr);
  }

  unresolved.sort(
    (a, b) =>
      compareStr(a.block, b.block) ||
      compareStr(a.file, b.file) ||
      compareStr(a.raw, b.raw)
  );

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
    unresolved,
  };
}
