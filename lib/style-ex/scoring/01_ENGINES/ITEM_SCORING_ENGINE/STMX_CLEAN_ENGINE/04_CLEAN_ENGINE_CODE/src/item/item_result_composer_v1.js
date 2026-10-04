'use strict';
/*
 * STMX ITEM SCORING ENGINE V1 — RESULT COMPOSER (non-scoring) · PRODUCTION AUTHORITY (Final Freeze 2026-09-27).
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D4 · D8 · §25–§31).
 * Reason: collect the per-axis results side by side without changing them, and report request-level completion.
 * Affected Scope: this file (new).
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FINAL FREEZE + PRODUCTION PROMOTION · Decision 1 · Decision 3 · §17 · §21–§22).
 * Reason: production promotion (engine status label) and the Dictionary V1.10 category-D replacement MISSING_REQUIRED_AXIS_INPUT →
 * MISSING_REQUIRED_INPUT. Composition logic unchanged. Affected Scope: this file (header · two token uses · engine status label).
 *
 * Owns only: collect · namespace · preserve payload / status / bounds / null / provenance · classify the per-axis outcome ·
 * report completion. ⛔ No score is produced, filled, averaged, combined, flattened or chosen inside a range. ⛔ No axis
 * result is reinterpreted. The only removal is of fields an axis authority itself names diagnostic (item_contracts_v1.js).
 */
const path = require('path');
const C = require('./item_contracts_v1');
const { ERROR_TYPE, LAYER_STATUS } = require('../runtime/packages');
const NOTATION = require(path.resolve(__dirname, '..', '..', '..', '..', 'stmx_score_notation_v1.js'));

const RESULT_COMPOSER_ID = 'STMX_ITEM_RESULT_COMPOSER_V1';
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/** outcome of one axis from what the entry routed / the binding returned — status reading only */
function classify(entry) {
  if (entry.routing) return entry.routing;
  const env = entry.envelope;
  if (env.provenance && env.provenance.error) return C.AXIS_OUTCOME.EXECUTION_FAILURE;
  if (env.provenance && env.provenance.not_executed) return C.AXIS_OUTCOME.NOT_EXECUTED;
  if (env.input_status === ERROR_TYPE.MISSING_REQUIRED_INPUT) return C.AXIS_OUTCOME.MISSING_REQUIRED_INPUT;
  if (env.input_status === LAYER_STATUS.OK) return C.AXIS_OUTCOME.GOVERNED_RESULT;
  return C.AXIS_OUTCOME.EXECUTION_FAILURE;
}

function composeAxis(axis, entry) {
  const outcome = classify(entry);
  const out = { axis_outcome: outcome, envelope: entry.envelope ? clone(entry.envelope) : null, withheld_diagnostic_fields: [], detail: entry.detail || null };
  const withheld = C.WITHHELD_DIAGNOSTIC_FIELDS[axis] || [];
  if (out.envelope && out.envelope.semantic && typeof out.envelope.semantic === 'object') {
    for (const f of withheld) if (Object.prototype.hasOwnProperty.call(out.envelope.semantic, f)) { delete out.envelope.semantic[f]; out.withheld_diagnostic_fields.push(f); }
  }
  if (outcome === C.AXIS_OUTCOME.MISSING_REQUIRED_INPUT && !out.detail && out.envelope) out.detail = 'missing input: ' + out.envelope.provenance.missing_input;
  if (outcome === C.AXIS_OUTCOME.EXECUTION_FAILURE && !out.detail && out.envelope && out.envelope.provenance.error) out.detail = out.envelope.provenance.error.code;
  return out;
}

/**
 * @param {object} p { request_errors?, item_identity, requested (registry order), collected {axis → {envelope} | {routing, detail}},
 *                     registry_version, binding_mode, item_entry, unrouted }
 */
function composeItemResult(p) {
  const base = { contract: C.RESULT_CONTRACT.id, engine: { id: C.ITEM_ENGINE_ID, status: 'COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION — composition of four frozen axis authorities; not a scorer' },
    item_identity: p.item_identity === undefined ? null : p.item_identity };
  const provenance = { item_entry: p.item_entry, result_composer: RESULT_COMPOSER_ID, contracts: [C.REQUEST_CONTRACT.id, C.RESULT_CONTRACT.id], registry_version: p.registry_version, binding_mode: p.binding_mode, unrouted_input_namespaces: p.unrouted || [] };
  if (p.request_errors && p.request_errors.length) {
    return Object.assign(base, { requested_axes: [], request_status: C.REQUEST_STATUS.MALFORMED_REQUEST, completion: { requested: 0, governed: 0, not_governed: [] }, axis_results: {}, request_errors: p.request_errors.slice(), provenance });
  }
  const axis_results = {};
  for (const axis of p.requested) axis_results[axis] = composeAxis(axis, p.collected[axis]);
  const notGoverned = p.requested.filter((a) => axis_results[a].axis_outcome !== C.AXIS_OUTCOME.GOVERNED_RESULT);
  return Object.assign(base, { requested_axes: p.requested.slice(), request_status: notGoverned.length ? C.REQUEST_STATUS.INCOMPLETE : C.REQUEST_STATUS.COMPLETE,
    completion: { requested: p.requested.length, governed: p.requested.length - notGoverned.length, not_governed: notGoverned }, axis_results, request_errors: [], provenance });
}

/**
 * PRESENTATION BOUNDARY ONLY (§29): display labels through the canonical notation authority, from an exact score the axis
 * itself returned. A null score stays null (TC bounded results, UNRESOLVED, NOT_ELIGIBLE …). Never part of axis_results.
 */
function presentNotation(result) {
  const out = {};
  for (const [axis, r] of Object.entries(result.axis_results || {})) {
    const s = r.axis_outcome === C.AXIS_OUTCOME.GOVERNED_RESULT && r.envelope ? r.envelope.score : null;
    if (s === null || s === undefined) out[axis] = null;
    else if (typeof s === 'string') out[axis] = NOTATION.isValid(axis, s) ? s : null;
    else if (Number.isInteger(s)) out[axis] = NOTATION.formatScore(axis, s);
    else out[axis] = null;
  }
  return out;
}

module.exports = { RESULT_COMPOSER_ID, composeItemResult, presentNotation, classify };
