(function () {
  "use strict";

  const logic = globalThis.ScafLogic;
  const modelEl = document.getElementById("model");
  if (!logic || !modelEl) return;

  let model;
  try {
    model = JSON.parse(modelEl.textContent || "{}");
  } catch {
    return;
  }

  const stage = document.getElementById("diagram-stage");
  const arrowSvg = document.getElementById("arrow-layer");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const expandAllBtn = document.getElementById("expand-all");
  const collapseAllBtn = document.getElementById("collapse-all");
  const toastEl = document.getElementById("toast");

  const cardById = new Map();
  const allCards = Array.from(document.querySelectorAll(".card[data-block-id]"));
  for (const card of allCards) {
    cardById.set(card.dataset.blockId, card);
  }

  const allRefChips = Array.from(document.querySelectorAll(".ref-chip[data-ref]"));
  const refChipByPair = new Map();
  for (const chip of allRefChips) {
    const key = `${chip.dataset.from || ""}\u0000${chip.dataset.ref || ""}`;
    refChipByPair.set(key, chip);
  }

  const allCommonGroups = Array.from(document.querySelectorAll(".common-group"));
  const allRouteItems = Array.from(document.querySelectorAll(".route-item[data-route-block]"));
  const allApiRows = Array.from(document.querySelectorAll(".api-row[data-api-name]"));
  const allUnresolvedItems = Array.from(document.querySelectorAll(".unresolved-item"));
  const highlightTargets = Array.from(
    document.querySelectorAll(
      ".copy.block-name, .copy.block-file, .copy.api-copy, .copy.api-name, .copy.api-file, .copy.meta-copy, .copy.ref-name",
    ),
  );

  // --- Toast ---
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
      toastTimer = null;
    }, 1200);
  }

  // --- Copy (clipboard API -> textarea fallback) ---
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      ta.setSelectionRange(0, text.length);
    } catch {
      // ignore if unsupported
    }
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text) {
    const onSuccess = () => showToast(`복사됨: ${text}`);
    const onFail = () => showToast(`복사 실패: ${text}`);
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(onSuccess, () => {
        if (fallbackCopy(text)) onSuccess();
        else onFail();
      });
      return;
    }
    if (fallbackCopy(text)) onSuccess();
    else onFail();
  }

  // --- Collapse / Expand ---
  function getCardToggleBtn(card) {
    const head = card.firstElementChild;
    if (!head || !head.classList.contains("card-head")) return null;
    const first = head.firstElementChild;
    if (first && first.classList.contains("toggle-btn")) return first;
    return null;
  }

  function setCardCollapsed(card, collapsed) {
    if (!card) return;
    const btn = getCardToggleBtn(card);
    if (!btn) return;
    card.dataset.collapsed = collapsed ? "true" : "false";
    btn.textContent = collapsed ? "▸" : "▾";
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function applyInitialCollapse() {
    for (const card of allCards) {
      const shouldCollapse = card.dataset.kind === "page";
      setCardCollapsed(card, shouldCollapse);
    }
  }

  function expandAncestorsOfElement(el, includeSelf) {
    let cur = includeSelf ? el : el.parentElement;
    while (cur) {
      if (cur.classList && cur.classList.contains("card")) {
        setCardCollapsed(cur, false);
      }
      cur = cur.parentElement;
    }
  }

  // --- SVG Arrows ---
  let arrowRaf = 0;
  let activeHover = null; // { target: string, from: string | null }

  function isPathHighlighted(path) {
    if (!activeHover) return false;
    if (path.dataset.arrowTarget !== activeHover.target) return false;
    if (activeHover.from !== null && path.dataset.arrowFrom !== activeHover.from) {
      return false;
    }
    return true;
  }

  function scheduleDrawArrows() {
    if (arrowRaf) return;
    arrowRaf = requestAnimationFrame(() => {
      arrowRaf = 0;
      drawArrows();
    });
  }

  function applyArrowHighlight() {
    if (!arrowSvg) return;
    const paths = arrowSvg.querySelectorAll("path.arrow-path");
    for (const path of paths) {
      path.classList.toggle("arrow-active", isPathHighlighted(path));
    }
  }

  function drawArrows() {
    if (!stage || !arrowSvg) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const width = stage.scrollWidth;
    const height = stage.scrollHeight;
    arrowSvg.setAttribute("width", String(width));
    arrowSvg.setAttribute("height", String(height));
    arrowSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    while (arrowSvg.firstChild) {
      arrowSvg.removeChild(arrowSvg.firstChild);
    }

    const defs = document.createElementNS(svgNS, "defs");
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", "scaf-arrowhead");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "5");
    marker.setAttribute("markerHeight", "5");
    marker.setAttribute("orient", "auto-start-reverse");
    const arrowPoly = document.createElementNS(svgNS, "path");
    arrowPoly.setAttribute("d", "M 0 1 L 10 5 L 0 9 z");
    arrowPoly.setAttribute("fill", "currentColor");
    marker.appendChild(arrowPoly);
    defs.appendChild(marker);
    arrowSvg.appendChild(defs);

    const stageRect = stage.getBoundingClientRect();

    for (const chip of allRefChips) {
      const chipRect = chip.getBoundingClientRect();
      if (chipRect.width === 0 && chipRect.height === 0) continue;

      const refId = chip.dataset.ref;
      const targetCard = cardById.get(refId);
      if (!targetCard) continue;

      const targetHead = targetCard.querySelector(".card-head") || targetCard;
      const headRect = targetHead.getBoundingClientRect();
      if (headRect.width === 0 && headRect.height === 0) continue;

      const x1 = chipRect.right - stageRect.left + stage.scrollLeft;
      const y1 = chipRect.top + chipRect.height / 2 - stageRect.top + stage.scrollTop;
      const x2 = headRect.left - stageRect.left + stage.scrollLeft;
      const y2 = headRect.top + headRect.height / 2 - stageRect.top + stage.scrollTop;

      let d;
      if (x2 > x1 + 12) {
        const dx = Math.max(32, Math.min(140, (x2 - x1) * 0.45));
        d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      } else {
        const bulge = 28;
        d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + bulge).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - bulge).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      }

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "arrow-path");
      path.setAttribute("marker-end", "url(#scaf-arrowhead)");
      path.style.color = "var(--arrow)";
      path.dataset.arrowTarget = refId;
      path.dataset.arrowFrom = chip.dataset.from || "";
      if (isPathHighlighted(path)) {
        path.classList.add("arrow-active");
      }
      arrowSvg.appendChild(path);
    }
  }

  // --- Highlight literal substring without regex or innerHTML ---
  function renderHighlight(el, queryLower) {
    const raw = el.dataset.copy;
    if (typeof raw !== "string") return;

    if (!queryLower) {
      if (el.childNodes.length !== 1 || el.firstChild.nodeType !== 3 || el.textContent !== raw) {
        el.textContent = raw;
      }
      return;
    }

    const lower = raw.toLowerCase();
    let idx = lower.indexOf(queryLower);
    if (idx === -1) {
      if (el.childNodes.length !== 1 || el.firstChild.nodeType !== 3 || el.textContent !== raw) {
        el.textContent = raw;
      }
      return;
    }

    const frag = document.createDocumentFragment();
    let pos = 0;
    const qLen = queryLower.length;
    while (idx !== -1) {
      if (idx > pos) {
        frag.appendChild(document.createTextNode(raw.slice(pos, idx)));
      }
      const mark = document.createElement("mark");
      mark.className = "hl";
      mark.textContent = raw.slice(idx, idx + qLen);
      frag.appendChild(mark);
      pos = idx + qLen;
      idx = lower.indexOf(queryLower, pos);
    }
    if (pos < raw.length) {
      frag.appendChild(document.createTextNode(raw.slice(pos)));
    }
    el.textContent = "";
    el.appendChild(frag);
  }

  // --- Search ---
  let savedCollapseState = null;

  function applySearch(rawQuery) {
    const q = String(rawQuery || "").trim();
    const qLower = q.toLowerCase();

    if (searchClear) {
      searchClear.hidden = q.length === 0;
    }

    if (!q) {
      for (const card of allCards) {
        card.classList.remove("is-hidden");
      }
      for (const chip of allRefChips) {
        chip.classList.remove("is-hidden");
      }
      for (const grp of allCommonGroups) {
        grp.classList.remove("is-hidden");
      }
      for (const item of allRouteItems) {
        item.classList.remove("is-hidden");
      }
      for (const row of allApiRows) {
        row.classList.remove("is-hidden");
      }
      for (const u of allUnresolvedItems) {
        u.classList.remove("is-hidden");
      }
      for (const el of highlightTargets) {
        renderHighlight(el, "");
      }
      if (savedCollapseState) {
        for (const [id, wasCollapsed] of savedCollapseState.entries()) {
          const card = cardById.get(id);
          if (card) setCardCollapsed(card, wasCollapsed);
        }
        savedCollapseState = null;
      }
      scheduleDrawArrows();
      return;
    }

    if (!savedCollapseState) {
      savedCollapseState = new Map();
      for (const card of allCards) {
        savedCollapseState.set(card.dataset.blockId, card.dataset.collapsed === "true");
      }
    }

    const visible = logic.visibleSet(model, q);
    const blocks = model.blocks || {};

    for (const card of allCards) {
      const id = card.dataset.blockId;
      const isVisible = visible.has(id);
      card.classList.toggle("is-hidden", !isVisible);
      if (isVisible) {
        const block = blocks[id];
        const hasVisibleChild =
          block &&
          Array.isArray(block.children) &&
          block.children.some((ch) => visible.has(ch.ref));
        if (hasVisibleChild) {
          setCardCollapsed(card, false);
        }
      }
    }

    for (const chip of allRefChips) {
      const show = visible.has(chip.dataset.ref) && visible.has(chip.dataset.from);
      chip.classList.toggle("is-hidden", !show);
    }

    for (const grp of allCommonGroups) {
      const hasAny = grp.querySelector(".card:not(.is-hidden)") !== null;
      grp.classList.toggle("is-hidden", !hasAny);
    }

    for (const item of allRouteItems) {
      const blockId = item.dataset.routeBlock;
      const routeText = (item.textContent || "").toLowerCase();
      const show = visible.has(blockId) || routeText.includes(qLower);
      item.classList.toggle("is-hidden", !show);
    }

    for (const row of allApiRows) {
      const apiName = (row.dataset.apiName || "").toLowerCase();
      const apiFile = (row.dataset.apiFile || "").toLowerCase();
      const apiObj = model.apis && model.apis[row.dataset.apiName];
      const usedMatch =
        apiObj &&
        Array.isArray(apiObj.usedBy) &&
        apiObj.usedBy.some((bid) => blocks[bid] && logic.matches(blocks[bid], q));
      const show = apiName.includes(qLower) || apiFile.includes(qLower) || Boolean(usedMatch);
      row.classList.toggle("is-hidden", !show);
    }

    for (const u of allUnresolvedItems) {
      const text = (u.textContent || "").toLowerCase();
      u.classList.toggle("is-hidden", !text.includes(qLower));
    }

    for (const el of highlightTargets) {
      renderHighlight(el, qLower);
    }

    scheduleDrawArrows();
  }

  // --- Navigation & Deep Links ---
  let flashTimer = null;
  let lastFlashed = null;

  function flashAndScroll(el) {
    if (!el) return;
    if (lastFlashed) {
      lastFlashed.classList.remove("flash-highlight");
    }
    if (flashTimer) clearTimeout(flashTimer);
    el.classList.add("flash-highlight");
    lastFlashed = el;
    if (typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    flashTimer = setTimeout(() => {
      el.classList.remove("flash-highlight");
      if (lastFlashed === el) lastFlashed = null;
      flashTimer = null;
    }, 1600);
  }

  function updateUrlHash(blockId) {
    const hash = logic.formatHash(blockId);
    try {
      history.replaceState(null, "", hash);
    } catch {
      try {
        window.location.hash = hash;
      } catch {
        // ignore if restricted
      }
    }
  }

  function clearSearchIfHidden(el) {
    if (!el) return;
    if (el.closest(".is-hidden") && searchInput && searchInput.value) {
      searchInput.value = "";
      applySearch("");
    }
  }

  function jumpToBlock(blockId, options) {
    const opts = options || {};
    const card = cardById.get(blockId);
    if (!card) return;
    clearSearchIfHidden(card);
    expandAncestorsOfElement(card, Boolean(opts.expandSelf));
    if (opts.updateHash !== false) {
      updateUrlHash(blockId);
    }
    scheduleDrawArrows();
    flashAndScroll(card);
  }

  function jumpToRefChip(fromId, refId) {
    const key = `${fromId}\u0000${refId}`;
    const chip = refChipByPair.get(key);
    if (!chip) {
      jumpToBlock(fromId, { expandSelf: true });
      return;
    }
    clearSearchIfHidden(chip);
    expandAncestorsOfElement(chip, false);
    updateUrlHash(fromId);
    activeHover = { target: refId, from: fromId };
    scheduleDrawArrows();
    flashAndScroll(chip);
  }

  // --- Delegated Click Handler ---
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const copyBtn = target.closest("button.copy");
    if (copyBtn) {
      const value = copyBtn.dataset.copy;
      if (typeof value === "string") {
        copyText(value);
      }
      return;
    }

    const toggleBtn = target.closest("button.toggle-btn");
    if (toggleBtn) {
      const card = toggleBtn.closest(".card[data-block-id]");
      if (card) {
        const isCollapsed = card.dataset.collapsed === "true";
        setCardCollapsed(card, !isCollapsed);
        scheduleDrawArrows();
      }
      return;
    }

    const jumpBtn = target.closest("button.jump");
    if (jumpBtn) {
      if (jumpBtn.dataset.jumpRef && jumpBtn.dataset.jumpFrom) {
        jumpToRefChip(jumpBtn.dataset.jumpFrom, jumpBtn.dataset.jumpRef);
      } else if (jumpBtn.dataset.jump) {
        const fromRouteIndex = Boolean(jumpBtn.closest("#route-index"));
        jumpToBlock(jumpBtn.dataset.jump, { expandSelf: fromRouteIndex });
      }
    }
  });

  // --- Hover Highlight for Arrows ---
  function setHover(next) {
    const same =
      (activeHover === null && next === null) ||
      (activeHover !== null &&
        next !== null &&
        activeHover.target === next.target &&
        activeHover.from === next.from);
    if (same) return;
    activeHover = next;
    applyArrowHighlight();
  }

  document.addEventListener("mouseover", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const chip = target.closest(".ref-chip[data-ref]");
    if (chip) {
      setHover({ target: chip.dataset.ref, from: chip.dataset.from || "" });
      return;
    }
    const commonCard = target.closest('.card[data-common="true"]');
    if (commonCard) {
      setHover({ target: commonCard.dataset.blockId, from: null });
      return;
    }
    setHover(null);
  });

  if (stage) {
    stage.addEventListener("mouseleave", () => {
      setHover(null);
    });
  }

  // --- Controls ---
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applySearch(searchInput.value);
    });
  }

  if (searchClear && searchInput) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      applySearch("");
      searchInput.focus();
    });
  }

  if (expandAllBtn) {
    expandAllBtn.addEventListener("click", () => {
      savedCollapseState = null;
      for (const card of allCards) {
        setCardCollapsed(card, false);
      }
      scheduleDrawArrows();
    });
  }

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener("click", () => {
      savedCollapseState = null;
      for (const card of allCards) {
        if (card.dataset.kind !== "layout") {
          setCardCollapsed(card, true);
        }
      }
      scheduleDrawArrows();
    });
  }

  // --- Keyboard Shortcuts (/ to focus search, Esc to clear) ---
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const active = document.activeElement;
      const inEditable =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable);
      if (!inEditable && searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === "Escape") {
      if (searchInput && (document.activeElement === searchInput || searchInput.value)) {
        searchInput.value = "";
        applySearch("");
        if (document.activeElement === searchInput) {
          searchInput.blur();
        }
      }
    }
  });

  // --- Resize & Hashchange ---
  window.addEventListener("resize", scheduleDrawArrows);
  if (typeof ResizeObserver === "function" && stage) {
    const ro = new ResizeObserver(() => scheduleDrawArrows());
    ro.observe(stage);
  }

  window.addEventListener("hashchange", () => {
    const id = logic.parseHash(window.location.hash);
    if (id && cardById.has(id)) {
      jumpToBlock(id, { updateHash: false });
    }
  });

  // --- Boot ---
  applyInitialCollapse();
  const initialHashId = logic.parseHash(window.location.hash);
  if (initialHashId && cardById.has(initialHashId)) {
    jumpToBlock(initialHashId, { updateHash: false });
  } else {
    scheduleDrawArrows();
  }
})();
