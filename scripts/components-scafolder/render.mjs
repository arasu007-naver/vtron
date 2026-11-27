import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, "client");

function readClientAsset(filename) {
  const fullPath = path.join(clientDir, filename);
  if (!existsSync(fullPath)) return "";
  return readFileSync(fullPath, "utf8");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeModelJson(model) {
  return JSON.stringify(model)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function copyButton(value, extraClass = "") {
  const escaped = escapeHtml(value);
  const cls = extraClass ? `copy ${extraClass}` : "copy";
  return `<button type="button" class="${cls}" data-copy="${escaped}">${escaped}</button>`;
}

function dirnamePosix(filePath) {
  const idx = String(filePath).lastIndexOf("/");
  return idx === -1 ? "." : filePath.slice(0, idx);
}

function compareText(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function renderKindBadge(block) {
  if (block.common) {
    const reasonText = block.commonReason === "ui-dir" ? "공통 · UI" : "공통";
    return `<span class="badge badge-common">${reasonText}</span>`;
  }
  if (block.kind === "layout") {
    return `<span class="badge badge-layout">layout</span>`;
  }
  if (block.kind === "page") {
    return `<span class="badge badge-page">page</span>`;
  }
  return `<span class="badge badge-component">component</span>`;
}

function renderRoutesMeta(block) {
  if (!Array.isArray(block.routes) || block.routes.length === 0) return "";
  const routeBtns = block.routes.map((r) => copyButton(r, "route-badge")).join("");
  const labelHtml = block.label
    ? `<span class="page-label">${escapeHtml(block.label)}</span>`
    : "";
  return `<span class="card-routes">${routeBtns}${labelHtml}</span>`;
}

function renderChildrenSummary(block, blocks) {
  if (!Array.isArray(block.children) || block.children.length === 0) {
    return `<span class="empty-val">(없음)</span>`;
  }
  return block.children
    .map((ch) => {
      const target = blocks[ch.ref];
      const targetName = target ? target.name : ch.ref;
      const prefix = target && target.common ? `<span class="ref-prefix" aria-hidden="true">⟶</span>` : "";
      return `<span class="meta-chip">${prefix}${copyButton(targetName, "meta-copy")}</span>`;
    })
    .join(`<span class="sep" aria-hidden="true">·</span>`);
}

function renderApisSummary(block) {
  if (!Array.isArray(block.apis) || block.apis.length === 0) {
    return `<span class="empty-val">(없음)</span>`;
  }
  return block.apis
    .map((apiName) => `<span class="meta-chip">${copyButton(apiName, "api-copy")}</span>`)
    .join(`<span class="sep" aria-hidden="true">·</span>`);
}

function renderUsedBySummary(block, blocks) {
  if (!block.common) return "";
  const parents = Array.isArray(block.usedBy) ? block.usedBy : [];
  const items =
    parents.length === 0
      ? `<span class="empty-val">(없음)</span>`
      : parents
          .map((parentId) => {
            const parent = blocks[parentId];
            const parentName = parent ? parent.name : parentId;
            return (
              `<span class="usage-item">` +
              `${copyButton(parentName, "meta-copy")}` +
              `<button type="button" class="jump" data-jump-ref="${escapeHtml(block.id)}" data-jump-from="${escapeHtml(parentId)}" title="사용처 참조 칩으로 이동" aria-label="사용처 참조 칩으로 이동">↗</button>` +
              `</span>`
            );
          })
          .join(`<span class="sep" aria-hidden="true">·</span>`);

  return (
    `<div class="card-row card-used-by">` +
    `<span class="row-label">사용처:</span>` +
    `<span class="row-items">${items}</span>` +
    `</div>`
  );
}

function renderRefChip(parentId, target) {
  return (
    `<div class="ref-chip" data-ref="${escapeHtml(target.id)}" data-from="${escapeHtml(parentId)}">` +
    `<span class="ref-arrow" aria-hidden="true">⟶</span>` +
    `${copyButton(target.name, "ref-name")}` +
    `<button type="button" class="jump" data-jump="${escapeHtml(target.id)}" title="공통 블록으로 이동" aria-label="공통 블록으로 이동">↗</button>` +
    `</div>`
  );
}

function renderCard(block, blocks, renderedCards, stack) {
  if (!block || renderedCards.has(block.id) || stack.has(block.id)) {
    return "";
  }
  renderedCards.add(block.id);
  stack.add(block.id);

  const children = Array.isArray(block.children) ? block.children : [];
  const bodyParts = [];

  for (const ch of children) {
    const child = blocks[ch.ref];
    if (!child) continue;
    if (child.common) {
      bodyParts.push(renderRefChip(block.id, child));
    } else if (!stack.has(child.id) && !renderedCards.has(child.id)) {
      bodyParts.push(renderCard(child, blocks, renderedCards, stack));
    }
  }

  stack.delete(block.id);

  const hasBody = bodyParts.length > 0;
  const toggleHtml = hasBody
    ? `<button type="button" class="toggle-btn" data-toggle="${escapeHtml(block.id)}" aria-expanded="true" title="접기/펼치기">▾</button>`
    : `<span class="toggle-spacer" aria-hidden="true"></span>`;

  const kindClass = block.common ? "card-common" : `card-${block.kind || "component"}`;
  const bodyHtml = hasBody
    ? `<div class="card-body">${bodyParts.join("")}</div>`
    : "";

  return (
    `<article class="card ${kindClass}" data-block-id="${escapeHtml(block.id)}" data-kind="${escapeHtml(block.kind || "component")}" data-common="${block.common ? "true" : "false"}" data-collapsed="false">` +
    `<div class="card-head">` +
    `${toggleHtml}` +
    `<div class="card-title-group">` +
    `<div class="card-title-line">` +
    `${copyButton(block.name, "block-name")}` +
    `${renderKindBadge(block)}` +
    `${renderRoutesMeta(block)}` +
    `</div>` +
    `<div class="card-file-line">${copyButton(block.file, "block-file")}</div>` +
    `</div>` +
    `</div>` +
    `<div class="card-meta">` +
    `<div class="card-row"><span class="row-label">하위 블록:</span><span class="row-items">${renderChildrenSummary(block, blocks)}</span></div>` +
    `<div class="card-row"><span class="row-label">API:</span><span class="row-items">${renderApisSummary(block)}</span></div>` +
    `${renderUsedBySummary(block, blocks)}` +
    `</div>` +
    `${bodyHtml}` +
    `</article>`
  );
}

function renderRouteIndex(blocks) {
  const entries = [];
  for (const block of Object.values(blocks)) {
    if (block.kind !== "page" || !Array.isArray(block.routes)) continue;
    for (const route of block.routes) {
      entries.push({
        route,
        label: block.label || null,
        blockId: block.id,
        blockName: block.name,
      });
    }
  }
  entries.sort((a, b) => compareText(a.route, b.route) || compareText(a.blockId, b.blockId));

  if (entries.length === 0) {
    return `<p class="empty-val">(없음)</p>`;
  }

  return (
    `<ul class="route-list">` +
    entries
      .map((item) => {
        const labelHtml = item.label
          ? `<span class="route-label">${escapeHtml(item.label)}</span>`
          : "";
        return (
          `<li class="route-item" data-route-block="${escapeHtml(item.blockId)}">` +
          `<div class="route-item-main">` +
          `${copyButton(item.route, "route-path")}` +
          `${labelHtml}` +
          `</div>` +
          `<button type="button" class="jump" data-jump="${escapeHtml(item.blockId)}" title="${escapeHtml(item.blockName)} 블록으로 이동" aria-label="${escapeHtml(item.blockName)} 블록으로 이동">↗</button>` +
          `</li>`
        );
      })
      .join("") +
    `</ul>`
  );
}

function renderCommonColumn(blocks, renderedCards) {
  const commonBlocks = Object.values(blocks)
    .filter((b) => b.common)
    .sort((a, b) => compareText(a.file, b.file) || compareText(a.name, b.name) || compareText(a.id, b.id));

  if (commonBlocks.length === 0) {
    return `<p class="empty-val">(없음)</p>`;
  }

  const groups = new Map();
  for (const block of commonBlocks) {
    const dir = dirnamePosix(block.file);
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(block);
  }

  const dirs = [...groups.keys()].sort(compareText);
  return dirs
    .map((dir) => {
      const cards = groups
        .get(dir)
        .map((block) => renderCard(block, blocks, renderedCards, new Set()))
        .join("");
      return (
        `<div class="common-group" data-dir="${escapeHtml(dir)}">` +
        `<h3 class="group-title">${escapeHtml(dir)}</h3>` +
        `<div class="common-group-cards">${cards}</div>` +
        `</div>`
      );
    })
    .join("");
}

function renderApiSection(model) {
  const blocks = model.blocks || {};
  const apis = model.apis || {};
  const apiNames = Object.keys(apis).sort(compareText);

  const apiRows =
    apiNames.length === 0
      ? `<p class="empty-val">(없음)</p>`
      : `<div class="api-table">` +
        apiNames
          .map((name) => {
            const api = apis[name];
            const methods = Array.isArray(api.methods) ? api.methods : [];
            const methodHtml = methods
              .map(
                (m) =>
                  `<span class="method method-${escapeHtml(m.toLowerCase())}">${escapeHtml(m)}</span>`,
              )
              .join("");

            const usedBy = Array.isArray(api.usedBy) ? api.usedBy : [];
            const usedByHtml =
              usedBy.length === 0
                ? `<span class="unused-label">화면 호출 없음</span>`
                : usedBy
                    .map((blockId) => {
                      const blk = blocks[blockId];
                      const blkName = blk ? blk.name : blockId;
                      return (
                        `<span class="usage-item">` +
                        `${copyButton(blkName, "meta-copy")}` +
                        `<button type="button" class="jump" data-jump="${escapeHtml(blockId)}" title="블록으로 이동" aria-label="블록으로 이동">↗</button>` +
                        `</span>`
                      );
                    })
                    .join(`<span class="sep" aria-hidden="true">·</span>`);

            return (
              `<div class="api-row" data-api-name="${escapeHtml(api.name)}" data-api-file="${escapeHtml(api.file)}">` +
              `<div class="api-col-main">` +
              `<div class="api-name-line">${copyButton(api.name, "api-name")}<span class="api-methods">${methodHtml}</span></div>` +
              `<div class="api-file-line">${copyButton(api.file, "api-file")}</div>` +
              `</div>` +
              `<div class="api-col-used">${usedByHtml}</div>` +
              `</div>`
            );
          })
          .join("") +
        `</div>`;

  const unresolved = Array.isArray(model.unresolved) ? model.unresolved : [];
  const unresolvedHtml =
    unresolved.length === 0
      ? `<p class="empty-val">(없음)</p>`
      : `<ul class="unresolved-list">` +
        unresolved
          .map((item) => {
            const blk = blocks[item.block];
            const blkName = blk ? blk.name : item.block;
            return (
              `<li class="unresolved-item">` +
              `<code class="unresolved-raw">${escapeHtml(item.raw)}</code>` +
              `<span class="sep" aria-hidden="true">·</span>` +
              `${copyButton(item.file, "block-file")}` +
              `<span class="sep" aria-hidden="true">·</span>` +
              `<span class="usage-item">` +
              `${copyButton(blkName, "meta-copy")}` +
              `<button type="button" class="jump" data-jump="${escapeHtml(item.block)}" title="블록으로 이동" aria-label="블록으로 이동">↗</button>` +
              `</span>` +
              `</li>`
            );
          })
          .join("") +
        `</ul>`;

  return (
    `<section class="api-section" id="api-list">` +
    `<div class="section-header">` +
    `<h2>프로젝트 전체 API 목록 <span class="count-pill" id="api-count">${apiNames.length}</span></h2>` +
    `</div>` +
    `${apiRows}` +
    `<div class="unresolved-section" id="unresolved-list">` +
    `<h3>미해결 호출 <span class="count-pill">${unresolved.length}</span></h3>` +
    `${unresolvedHtml}` +
    `</div>` +
    `</section>`
  );
}

export function render(model) {
  const blocks = model.blocks || {};
  const surfaces = Array.isArray(model.surfaces) ? model.surfaces : [];
  const apis = model.apis || {};
  const unresolved = Array.isArray(model.unresolved) ? model.unresolved : [];

  const allBlocks = Object.values(blocks);
  const totalBlocks = allBlocks.length;
  const commonCount = allBlocks.filter((b) => b.common).length;
  const apiCount = Object.keys(apis).length;
  const unresolvedCount = unresolved.length;

  const renderedCards = new Set();

  const surfaceHtml = surfaces
    .map((surface) => {
      const rootBlock = blocks[surface.root];
      const treeHtml = rootBlock
        ? renderCard(rootBlock, blocks, renderedCards, new Set())
        : `<p class="empty-val">(없음)</p>`;
      return (
        `<div class="surface-block" data-surface-id="${escapeHtml(surface.id)}">` +
        `<h2 class="col-title">${escapeHtml(surface.label)}</h2>` +
        `<div class="tree-root">${treeHtml}</div>` +
        `</div>`
      );
    })
    .join("");

  const commonHtml = renderCommonColumn(blocks, renderedCards);
  const routeIndexHtml = renderRouteIndex(blocks);
  const apiSectionHtml = renderApiSection(model);

  const css = readClientAsset("app.css");
  const logicJs = readClientAsset("logic.js");
  const appJs = readClientAsset("app.js");
  const safeJson = serializeModelJson(model);

  const statsParts = [
    `블록 ${totalBlocks}`,
    `공통 ${commonCount}`,
    `API ${apiCount}`,
  ];
  if (unresolvedCount > 0) {
    statsParts.push(`미해결 ${unresolvedCount}`);
  }

  const projectName = escapeHtml(model.project || "vtron");

  return [
    `<!doctype html>`,
    `<!-- 생성 파일 — 직접 고치지 말 것. npm run docs:scafolder 로 다시 만든다. -->`,
    `<html lang="ko">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${projectName} 컴포넌트 블록 계층도</title>`,
    `<style>`,
    css,
    `</style>`,
    `</head>`,
    `<body>`,
    `<header class="topbar">`,
    `  <div class="topbar-title">`,
    `    <h1>${projectName} 컴포넌트 블록 계층도</h1>`,
    `    <span class="stats" id="stats">${escapeHtml(statsParts.join(" · "))}</span>`,
    `  </div>`,
    `  <div class="topbar-controls">`,
    `    <div class="search-wrap">`,
    `      <input type="search" id="search-input" class="search-input" placeholder="블록·파일·API 검색 (/ 포커스, Esc 지우기)" autocomplete="off" spellcheck="false" aria-label="블록·파일·API 검색">`,
    `      <button type="button" id="search-clear" class="btn btn-ghost" title="검색 비우기" hidden>×</button>`,
    `    </div>`,
    `    <div class="btn-group">`,
    `      <button type="button" id="expand-all" class="btn">모두 펼치기</button>`,
    `      <button type="button" id="collapse-all" class="btn">모두 접기</button>`,
    `    </div>`,
    `  </div>`,
    `</header>`,
    `<div class="layout">`,
    `  <aside class="sidebar" id="route-index">`,
    `    <h2 class="col-title">라우트 색인</h2>`,
    `    ${routeIndexHtml}`,
    `  </aside>`,
    `  <main class="main-content">`,
    `    <div class="diagram-stage" id="diagram-stage">`,
    `      <section class="tree-col" id="surface-tree">`,
    `        ${surfaceHtml}`,
    `      </section>`,
    `      <section class="common-col" id="common-blocks">`,
    `        <h2 class="col-title">공통 블록 <span class="count-pill">${commonCount}</span></h2>`,
    `        ${commonHtml}`,
    `      </section>`,
    `      <svg class="arrow-layer" id="arrow-layer" aria-hidden="true"></svg>`,
    `    </div>`,
    `    ${apiSectionHtml}`,
    `  </main>`,
    `</div>`,
    `<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`,
    `<script type="application/json" id="model">${safeJson}</script>`,
    `<script>`,
    logicJs,
    `</script>`,
    `<script>`,
    appJs,
    `</script>`,
    `</body>`,
    `</html>`,
    ``,
  ].join("\n");
}
