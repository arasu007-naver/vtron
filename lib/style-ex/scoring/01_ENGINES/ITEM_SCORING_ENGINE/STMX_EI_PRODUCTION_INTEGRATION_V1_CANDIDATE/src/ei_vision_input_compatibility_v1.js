'use strict';
/**
 * STMX EI — VISION INPUT COMPATIBILITY ADAPTER V1 (EI-owned · production integration successor · CANDIDATE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-27 · Order: STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D3 · §11
 *   Reason:         The frozen EI Direction runtime binds STMX_VISION_PRODUCER_V1_1 by name; production Vision is
 *                   STMX_VISION_PRODUCER_V1_3. The production Vision pointer records that V1_3 "carries the 37-parameter
 *                   Producer closure of V1_1 UNCHANGED, plus the DM designed-detail observation layer", emitted as a SIBLING
 *                   of observations (never inside it). The projection below is therefore structural: it hands the frozen
 *                   runtime exactly the top-level fields it reads and nothing else.
 *   Affected Scope: this module only. ⛔ The frozen EI binding (producer_contract_binding_v1.js → V1_1) is NOT rebound.
 *
 * ⛔ Selection only: no value is renamed, normalized, repaired, defaulted or inferred. A missing field stays missing and
 *    the frozen Stage 1 validation decides (e.g. a record without Colour V1 returns the frozen INVALID_INPUT trace).
 * ⛔ The DM observation block is DM-owned evidence and never reaches EI.
 * ★ Executable guard: at load, every export the frozen V1_1 rules module defines must be identical in V1_3
 *   (values by JSON, functions by source). Any divergence throws EI_VISION_CONTRACT_BLOCKER and fails closed.
 */
const path = require('path');
const ISE = path.resolve(__dirname, '..', '..');
const IVE = path.resolve(ISE, '..', 'ITEM_VISION_EXTRACTOR');

const ADAPTER_ID = 'STMX_EI_VISION_INPUT_COMPATIBILITY_V1';
const BOUND_PRODUCER = 'STMX_VISION_PRODUCER_V1_1';     // what the frozen EI runtime executes against (unchanged)
const SOURCE_PRODUCER = 'STMX_VISION_PRODUCER_V1_3';    // current production Vision
/** the top-level fields the frozen EI Direction runtime run() reads from a garment input (runtime V1.2.7 · Stage 1 + readUserGender) */
const EI_INPUT_FIELDS = Object.freeze(['category', 'observations', 'color_observation', 'scoring_context', 'gender_or_provenance']);

function compatibilityGuard() {
  const R11 = require(path.join(IVE, BOUND_PRODUCER, 'producer_rules_v1.js'));
  const R13 = require(path.join(IVE, SOURCE_PRODUCER, 'producer_rules_v1.js'));
  const diverged = Object.keys(R11).filter((k) => {
    if (!Object.prototype.hasOwnProperty.call(R13, k)) return true;
    if (typeof R11[k] === 'function') return typeof R13[k] !== 'function' || String(R11[k]) !== String(R13[k]);
    return JSON.stringify(R11[k]) !== JSON.stringify(R13[k]);
  });
  if (diverged.length) {
    const e = new Error('EI_VISION_CONTRACT_BLOCKER: ' + SOURCE_PRODUCER + ' diverges from ' + BOUND_PRODUCER + ' on ' + diverged.join(', ') + ' ⛔ FAIL CLOSED.');
    e.code = 'EI_VISION_CONTRACT_BLOCKER';
    throw e;
  }
  return { shared_exports: Object.keys(R11).length, source_only_exports: Object.keys(R13).filter((k) => !Object.prototype.hasOwnProperty.call(R11, k)) };
}
const GUARD = compatibilityGuard();

/** @param {object} record a Producer target record (V1_1 or V1_3 shape) carrying the governed EI input fields */
function projectToEiInput(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;   // the frozen Stage 1 rejects it (INPUT_NOT_OBJECT)
  const out = {};
  for (const k of EI_INPUT_FIELDS) if (Object.prototype.hasOwnProperty.call(record, k)) out[k] = record[k];
  return out;
}

module.exports = { ADAPTER_ID, BOUND_PRODUCER, SOURCE_PRODUCER, EI_INPUT_FIELDS, GUARD, projectToEiInput };
