function compareStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Verify all SPEC §6.1 invariants on a Model object.
 * Returns an array of violation messages (empty array means valid).
 */
export function checkInvariants(model) {
  const violations = [];
  const blocks = model?.blocks ?? {};
  const apis = model?.apis ?? {};
  const surfaces = model?.surfaces ?? [];
  const blockIds = new Set(Object.keys(blocks));
  const apiKeys = new Set(Object.keys(apis));

  // 1. Every children[].ref, usedBy, apis[].usedBy, and surface.root is an existing block id
  for (const s of surfaces) {
    if (!blockIds.has(s.root)) {
      violations.push(`surface "${s.id}" root "${s.root}" does not exist in blocks`);
    }
  }

  for (const [id, block] of Object.entries(blocks)) {
    for (const child of block.children ?? []) {
      if (!blockIds.has(child.ref)) {
        violations.push(`block "${id}" has child ref "${child.ref}" not in blocks`);
      }
    }
    for (const parentId of block.usedBy ?? []) {
      if (!blockIds.has(parentId)) {
        violations.push(`block "${id}" has usedBy "${parentId}" not in blocks`);
      }
    }

    // 2. Non-common component blocks have exactly 1 usedBy; page/layout cannot be common
    if (block.kind === "component" && block.common === false) {
      if ((block.usedBy?.length ?? 0) !== 1) {
        violations.push(
          `non-common component "${id}" must have usedBy.length === 1, got ${block.usedBy?.length ?? 0}`
        );
      }
    }
    if ((block.kind === "page" || block.kind === "layout") && block.common === true) {
      violations.push(`${block.kind} block "${id}" must not be marked common`);
    }

    // 3. Every entry in block.apis is a key in top-level apis
    for (const apiName of block.apis ?? []) {
      if (!apiKeys.has(apiName)) {
        violations.push(`block "${id}" references API "${apiName}" not in top-level apis`);
      }
    }
  }

  // 4. apis[x].usedBy equals reverse index of block.apis
  const expectedApiUsedBy = new Map([...apiKeys].map((k) => [k, new Set()]));
  for (const [id, block] of Object.entries(blocks)) {
    for (const apiName of block.apis ?? []) {
      if (expectedApiUsedBy.has(apiName)) {
        expectedApiUsedBy.get(apiName).add(id);
      }
    }
  }

  for (const [apiName, apiObj] of Object.entries(apis)) {
    for (const u of apiObj.usedBy ?? []) {
      if (!blockIds.has(u)) {
        violations.push(`api "${apiName}" has usedBy "${u}" not in blocks`);
      }
    }
    const expected = [...expectedApiUsedBy.get(apiName)].sort(compareStr);
    const actual = apiObj.usedBy ?? [];
    if (
      expected.length !== actual.length ||
      expected.some((v, idx) => v !== actual[idx])
    ) {
      violations.push(
        `api "${apiName}" usedBy mismatch: expected [${expected.join(", ")}], got [${actual.join(", ")}]`
      );
    }
  }

  // 5. All blocks in model.blocks must be reachable from surface roots
  const reachable = new Set();
  const queue = [];
  for (const s of surfaces) {
    if (blockIds.has(s.root) && !reachable.has(s.root)) {
      reachable.add(s.root);
      queue.push(s.root);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const child of blocks[cur]?.children ?? []) {
      if (blockIds.has(child.ref) && !reachable.has(child.ref)) {
        reachable.add(child.ref);
        queue.push(child.ref);
      }
    }
  }
  for (const id of blockIds) {
    if (!reachable.has(id)) {
      violations.push(`block "${id}" is unreachable from any surface root`);
    }
  }

  return violations;
}
