'use strict';
/*
 * STMX ITEM SCORING ENGINE V1 — THIN ITEM ENTRY (internal governed entry surface · not a public API) · PRODUCTION AUTHORITY (Final Freeze 2026-09-27).
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D1 · D2 · §21–§24 · §44).
 * Reason: one thin entry above the existing L7 generic axis binding that routes each axis’s own governed input to that axis.
 * It bypasses the legacy L1 → L6 path (not migrated in this Sprint) and does not call it.
 * Affected Scope: this file (new).
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FINAL FREEZE + PRODUCTION PROMOTION · Decision 1 · Decision 3 · §17 · §20).
 * Reason: production promotion (binding mode PRODUCTION via item_contracts_v1.js) and the Dictionary V1.10 category-D replacement
 * MISSING_REQUIRED_AXIS_INPUT → MISSING_REQUIRED_INPUT. Routing logic unchanged. Affected Scope: this file (header · one token).
 *
 * Owns only: request validation · item / request identity · requested axis set · per-axis input routing (namespace isolation) ·
 * provenance · invocation of the existing binding · hand-off to the Result Composer.
 * ⛔ ZERO scoring semantics. ⛔ No axis reads another axis’s namespace: each axis receives a private copy of inputs[<axis>] only.
 * ⛔ No execution order is semantic: axes run in registry order and results are keyed by axis, so any permutation of
 *    requested_axes yields the same result (future-parallel-safe; no cross-axis dependency exists).
 */
const C = require('./item_contracts_v1');
const { createAxisBinding } = require('../layers/l7_axis_runtime_binding');
const { AXIS_BINDING_CONTRACTS, REGISTRY_VERSION } = require('../runtime/axis_binding_contracts');
const { composeItemResult } = require('./item_result_composer_v1');

const ITEM_ENTRY_ID = 'STMX_ITEM_ENTRY_V1';
const isPlainObject = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const privateCopy = (x) => JSON.parse(JSON.stringify(x));

function validateRequest(req, axes) {
  const errors = [];
  if (!isPlainObject(req)) return ['request must be an object'];
  if (typeof req.item_identity !== 'string' || !req.item_identity.trim()) errors.push('item_identity must be a non-empty string');
  if (!Array.isArray(req.requested_axes) || !req.requested_axes.length) errors.push('requested_axes must be a non-empty array');
  else {
    const bad = req.requested_axes.filter((a) => typeof a !== 'string' || !axes.includes(a));
    if (bad.length) errors.push('requested_axes contains unregistered axis name(s): ' + bad.map(String).join(', '));
    if (new Set(req.requested_axes).size !== req.requested_axes.length) errors.push('requested_axes contains duplicates');
  }
  if (!isPlainObject(req.inputs)) errors.push('inputs must be an object keyed by axis');
  else { const unknown = Object.keys(req.inputs).filter((k) => !axes.includes(k)); if (unknown.length) errors.push('inputs carries unregistered namespace(s): ' + unknown.join(', ')); }
  return errors;
}

function createItemEntry() {
  const binding = createAxisBinding({ mode: C.BINDING_MODE });
  function scoreItem(request) {
    const errors = validateRequest(request, binding.axes);
    const common = { item_entry: ITEM_ENTRY_ID, registry_version: REGISTRY_VERSION, binding_mode: binding.mode };
    if (errors.length) return composeItemResult(Object.assign({ request_errors: errors, item_identity: isPlainObject(request) ? request.item_identity : undefined }, common));
    const requested = binding.axes.filter((a) => request.requested_axes.includes(a));
    const collected = {};
    for (const axis of requested) {
      const ns = request.inputs[axis];
      if (ns === undefined) { collected[axis] = { routing: C.AXIS_OUTCOME.MISSING_REQUIRED_INPUT, detail: 'no ' + axis + ' input namespace supplied' }; continue; }
      if (!isPlainObject(ns)) { collected[axis] = { routing: C.AXIS_OUTCOME.MALFORMED_INPUT, detail: axis + ' input namespace must be an object' }; continue; }
      const allowed = AXIS_BINDING_CONTRACTS[axis].input_contract.required;
      const extra = Object.keys(ns).filter((k) => !allowed.includes(k));
      if (extra.length) { collected[axis] = { routing: C.AXIS_OUTCOME.MALFORMED_INPUT, detail: 'keys outside the ' + axis + ' input contract: ' + extra.join(', ') }; continue; }
      collected[axis] = { envelope: binding.collect(axis, privateCopy(ns)) };
    }
    const unrouted = Object.keys(request.inputs).filter((k) => !requested.includes(k));
    return composeItemResult(Object.assign({ item_identity: request.item_identity, requested, collected, unrouted }, common));
  }
  return Object.freeze({ id: ITEM_ENTRY_ID, scoreItem, axes: binding.axes, mode: binding.mode });
}

let defaultEntry = null;
/** @param {object} request { item_identity, requested_axes: [...], inputs: { <axis>: <that axis's governed input namespace> } } */
function scoreItem(request) { if (!defaultEntry) defaultEntry = createItemEntry(); return defaultEntry.scoreItem(request); }

module.exports = { ITEM_ENTRY_ID, createItemEntry, scoreItem, validateRequest };
