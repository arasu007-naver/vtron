'use strict';
/*
 * STMX ITEM SCORING ENGINE V1 — ITEM REQUEST / RESULT CONTRACTS (data only, no logic) · PRODUCTION (Final Freeze 2026-09-27).
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D2 · D4 · D8 · §21–§31).
 * Reason: the thin Item Entry and the Result Composer need one explicit request contract and one explicit result contract.
 * Affected Scope: this file (new) · item_entry_v1.js · item_result_composer_v1.js.
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FINAL FREEZE + PRODUCTION PROMOTION · Decision 1 · Decision 3 · §8–§9 · §17 · §22).
 * Reason: production promotion — the binding mode becomes PRODUCTION (all four registry entries are production authorities); the candidate
 * token MISSING_REQUIRED_AXIS_INPUT is replaced by the existing Clean Engine A4 token MISSING_REQUIRED_INPUT (Dictionary V1.10, category D:
 * same meaning). Every contract term is registered in the Canonical Dictionary V1.10. No semantic change.
 * Affected Scope: this file (header · MISSING_REQUIRED_INPUT · NOT_EXECUTED note · BINDING_MODE) · item_entry_v1.js · item_result_composer_v1.js.
 *
 * ⛔ No axis rule, tier, threshold, weight or score lives here. Axis input keys are NOT restated: each axis namespace carries
 *    exactly the keys its own registry entry names (runtime/axis_binding_contracts.js · input_contract.required).
 */
const ITEM_ENGINE_ID = 'STMX_ITEM_SCORING_ENGINE_V1';

const REQUEST_CONTRACT = Object.freeze({
  id: 'STMX_ITEM_REQUEST_CONTRACT_V1',
  fields: Object.freeze({
    item_identity: 'non-empty string — the caller’s item / request identity (never interpreted, never used for routing or branching)',
    requested_axes: 'non-empty array of unique registered axis names; one, several or all four',
    inputs: 'object keyed by axis name; each value is that axis’s own governed input namespace holding exactly the keys its registry input_contract names',
  }),
});

/** per-axis outcome — the four cases the order distinguishes (§31) plus the binding’s candidate gate */
const AXIS_OUTCOME = Object.freeze({
  GOVERNED_RESULT: 'GOVERNED_RESULT',                         // the axis returned its own governed result (exact, bounded, UNRESOLVED, NOT_ELIGIBLE, …)
  EXECUTION_FAILURE: 'EXECUTION_FAILURE',                     // the authority failed to resolve or the runtime threw (binding RUNTIME_FAILURE)
  MALFORMED_INPUT: 'MALFORMED_INPUT',                         // the axis namespace is not an object or carries keys outside its input contract
  MISSING_REQUIRED_INPUT: 'MISSING_REQUIRED_INPUT',           // the namespace is absent or lacks a required key (existing Clean Engine A4 token)
  NOT_EXECUTED: 'NOT_EXECUTED',                               // a CANDIDATE authority met a PRODUCTION-mode binding (cannot occur in V1: every registry entry is PRODUCTION)
});

const REQUEST_STATUS = Object.freeze({
  COMPLETE: 'COMPLETE',                   // D8: every requested axis returned a governed result / status (a null score is allowed)
  INCOMPLETE: 'INCOMPLETE',               // at least one requested axis did not return a governed result; the others are preserved
  MALFORMED_REQUEST: 'MALFORMED_REQUEST', // the request envelope failed validation; no axis was executed
});

/**
 * Fields an axis authority itself names as legacy / diagnostic, withheld from the canonical composed result (§28).
 * Source (verbatim authority, not composer judgment): STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json → ★_canonical_output_contract
 *   strength_legacy_v1_2_binary — "explicitly named LEGACY / DIAGNOSTIC — never an authority"
 *   score_legacy_v1_2           — "explicitly named DIAGNOSTIC provenance — never canonical SR#"
 * EI · TC · DM name no diagnostic output field.
 */
const WITHHELD_DIAGNOSTIC_FIELDS = Object.freeze({
  SR: Object.freeze(['strength_legacy_v1_2_binary', 'score_legacy_v1_2']),
});

const RESULT_CONTRACT = Object.freeze({
  id: 'STMX_ITEM_RESULT_CONTRACT_V1',
  fields: Object.freeze({
    contract: 'STMX_ITEM_RESULT_CONTRACT_V1',
    engine: '{ id, status } of the composition (not a scorer)',
    item_identity: 'echoed verbatim',
    requested_axes: 'registry order (order-independent: the same set always yields the same result)',
    request_status: 'COMPLETE | INCOMPLETE | MALFORMED_REQUEST',
    completion: '{ requested, governed, not_governed[] }',
    axis_results: '{ <axis>: { axis_outcome, envelope (the generic-binding envelope verbatim, minus authority-named diagnostic fields), withheld_diagnostic_fields[], detail } }',
    request_errors: 'MALFORMED_REQUEST only — the validation errors',
    provenance: '{ item_entry, result_composer, contracts, registry_version, binding_mode, unrouted_input_namespaces[] }',
  }),
  invariants: Object.freeze([
    'each axis payload is the axis authority’s own output, unchanged (null stays null; bounds, status and provenance preserved)',
    'no score is produced, filled, averaged, combined or chosen inside a range',
    'no axis reads another axis’s input or result',
    'display notation is derived only at the presentation boundary through stmx_score_notation_v1.js, and only from an exact score the axis itself returned',
  ]),
});

const BINDING_MODE = 'PRODUCTION';   // V1 production: all four registry entries are PRODUCTION authorities (the candidate composition ran SHADOW)

module.exports = { ITEM_ENGINE_ID, REQUEST_CONTRACT, RESULT_CONTRACT, AXIS_OUTCOME, REQUEST_STATUS, WITHHELD_DIAGNOSTIC_FIELDS, BINDING_MODE };
