'use strict';
/**
 * STMX SR ENGINE V1.1 — GOVERNED EVIDENCE ELIGIBILITY GATE
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-13
 *   Order:          STMX SR GOVERNED EVIDENCE ELIGIBILITY GATE + ENGINE CANDIDATE V1.1 §0 · §4 · §11
 *   Reason:         SR measures Body Governance / Release, so final SR adjudication requires sufficient
 *                   worn / on-body evidence. Eligibility is INPUT GOVERNANCE, evaluated before the
 *                   Direction Resolver — never a semantic factor.
 *   Affected Scope: this module (new) and sr_engine_v1_1.js (new orchestrator). ⛔ No V1 module is altered.
 *
 * `sr_evidence_eligibility`
 *   IS      governed metadata · input provenance · SR admission authority · required by the SR runtime
 *   IS NOT  Vision Parameter 38 · a fashion semantic factor · Direction / Strength / ordinal evidence ·
 *           a coefficient · a score
 *
 * ⛔ This module imports NOTHING (Guard SR-ELIG-12 · order §37 firewall): no ground truth, no REF identity,
 *    no Producer prose, no Direction / Strength / ordinal result, no registry. It reads one governed field.
 * ⛔ Eligibility is never inferred — not from filename, REF id, category, fabric, fit, free-text evidence[],
 *    regex over Producer prose, ground truth or a historical score (order §10 · §28). Missing = fail closed.
 */

/** the four governed states (order §4) — no other value is admissible */
const ELIGIBILITY_STATES = ['ADJUDICABLE_WORN', 'NOT_ADJUDICABLE_FLAT_PRODUCT', 'WORN_BUT_INSUFFICIENT', 'UNRESOLVED'];
/** the only state that may enter SR semantic resolution */
const ADMITTED_STATE = 'ADJUDICABLE_WORN';
const FIELD = 'sr_evidence_eligibility';

const REASON = {
  NOT_ADJUDICABLE_FLAT_PRODUCT: 'SR_EVIDENCE_NOT_ADJUDICABLE',
  WORN_BUT_INSUFFICIENT: 'SR_EVIDENCE_NOT_ADJUDICABLE',
  UNRESOLVED: 'SR_EVIDENCE_ELIGIBILITY_UNRESOLVED',
  MISSING: 'MISSING_SR_EVIDENCE_ELIGIBILITY',
  OUT_OF_DOMAIN: 'SR_EVIDENCE_ELIGIBILITY_OUT_OF_DOMAIN',
};

/**
 * Validate the governed eligibility metadata and decide admission.
 * @param {object|null|undefined} meta  governed input metadata, e.g. { sr_evidence_eligibility: 'ADJUDICABLE_WORN' }
 * @returns {{ eligibility: string, admitted: boolean, unresolved_reasons: string[], basis: object }}
 */
function evaluateEligibility(meta) {
  if (meta === null || meta === undefined || typeof meta !== 'object' || !(FIELD in meta))
    return { eligibility: 'UNRESOLVED', admitted: false, unresolved_reasons: [REASON.MISSING],
      basis: { rule: 'G0', why: 'governed eligibility metadata absent — fail closed (Guard SR-ELIG-11)', supplied: null } };

  const value = meta[FIELD];
  if (typeof value !== 'string' || ELIGIBILITY_STATES.indexOf(value) === -1)
    return { eligibility: 'UNRESOLVED', admitted: false, unresolved_reasons: [REASON.OUT_OF_DOMAIN],
      basis: { rule: 'G1', why: 'value outside the governed eligibility domain — fail closed', supplied: value === undefined ? null : value } };

  if (value === ADMITTED_STATE)
    return { eligibility: value, admitted: true, unresolved_reasons: [],
      basis: { rule: 'G2', why: 'worn evidence sufficient — SR semantic resolution admitted', supplied: value } };

  return { eligibility: value, admitted: false, unresolved_reasons: [REASON[value]],
    basis: { rule: 'G3', why: 'evidence cannot establish a garment-body relationship — ⛔ UNKNOWN, never NEUTRAL (Guard SR-ELIG-4)', supplied: value } };
}

/** the fixed ineligible product state (Guard SR-ELIG-5) */
function ineligibleResult(gate) {
  return { sr_evidence_eligibility: gate.eligibility, sr_eligibility_admitted: false,
    direction: 'UNKNOWN', strength: 'UNKNOWN', score: null,
    direction_basis: null, strength_basis: null, ordinal_basis: null,
    eligibility_basis: gate.basis, unresolved_reasons: gate.unresolved_reasons.slice() };
}

module.exports = { evaluateEligibility, ineligibleResult, ELIGIBILITY_STATES, ADMITTED_STATE, FIELD, REASON };
