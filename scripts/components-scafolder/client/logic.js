(function () {
  "use strict";

  function normalizeQuery(query) {
    if (query == null) return "";
    return String(query).trim().toLowerCase();
  }

  function matches(block, query) {
    const q = normalizeQuery(query);
    if (!q) return true;
    if (!block || typeof block !== "object") return false;

    if (typeof block.name === "string" && block.name.toLowerCase().includes(q)) {
      return true;
    }
    if (typeof block.file === "string" && block.file.toLowerCase().includes(q)) {
      return true;
    }
    if (Array.isArray(block.apis)) {
      for (let i = 0; i < block.apis.length; i += 1) {
        const api = block.apis[i];
        if (typeof api === "string" && api.toLowerCase().includes(q)) {
          return true;
        }
      }
    }
    return false;
  }

  function ancestors(model, id) {
    const blocks = model && model.blocks ? model.blocks : null;
    if (!blocks || !Object.prototype.hasOwnProperty.call(blocks, id)) {
      return [];
    }

    const visited = new Set([id]);
    const result = [];
    const queue = [];

    const startParents = blocks[id].usedBy;
    if (Array.isArray(startParents)) {
      for (let i = 0; i < startParents.length; i += 1) {
        queue.push(startParents[i]);
      }
    }

    let head = 0;
    while (head < queue.length) {
      const parentId = queue[head];
      head += 1;
      if (visited.has(parentId)) continue;
      if (!Object.prototype.hasOwnProperty.call(blocks, parentId)) continue;

      visited.add(parentId);
      result.push(parentId);

      const nextParents = blocks[parentId].usedBy;
      if (Array.isArray(nextParents)) {
        for (let i = 0; i < nextParents.length; i += 1) {
          if (!visited.has(nextParents[i])) {
            queue.push(nextParents[i]);
          }
        }
      }
    }

    return result;
  }

  function visibleSet(model, query) {
    const blocks = model && model.blocks ? model.blocks : {};
    const ids = Object.keys(blocks);
    const q = normalizeQuery(query);
    if (!q) {
      return new Set(ids);
    }

    const visible = new Set();
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (matches(blocks[id], q)) {
        visible.add(id);
        const chain = ancestors(model, id);
        for (let j = 0; j < chain.length; j += 1) {
          visible.add(chain[j]);
        }
      }
    }
    return visible;
  }

  function parseHash(hash) {
    if (typeof hash !== "string") return null;
    if (!hash.startsWith("#b=")) return null;
    const raw = hash.slice(3);
    if (!raw) return null;
    try {
      const decoded = decodeURIComponent(raw);
      return decoded || null;
    } catch {
      return null;
    }
  }

  function formatHash(id) {
    return "#b=" + encodeURIComponent(String(id));
  }

  globalThis.ScafLogic = {
    matches,
    visibleSet,
    ancestors,
    parseHash,
    formatHash,
  };
})();
