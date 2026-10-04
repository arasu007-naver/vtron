'use strict';
/**
 * STMX SR ENGINE V1.3 — SIDECAR (IMPLEMENTATION CANDIDATE · ⛔ NOT PRODUCTION)
 *
 *   V1.2 (unchanged, loaded read-only by name)      → eligibility · Direction · binary Strength · ordinal (legacy, untouched)
 *          ↓ admitted evidence + Direction
 *   TERNARY STRENGTH RESOLVER V1.3 CANDIDATE         → strength_v1_3 ∈ WEAK / REGULAR / STRONG / N/A / UNKNOWN
 *
 * The sidecar never re-resolves eligibility or Direction and never projects a score from the ternary Strength (order §9):
 * the V1.2 fields `direction` · `strength` (binary, legacy) · `score` are passed through byte-for-byte; V1.3 adds
 * `strength_v1_3`, `strength_v1_3_basis`, `strength_v1_3_halves`. ⛔ No REF / GT / filename / prose / registry is read.
 */
const path = require('path');
const V12 = path.resolve(__dirname, '..', '..', 'STMX_SR_DIRECTION_FIRST_ENGINE_V1_2', 'src');
const E12 = require(path.join(V12, 'sr_engine_v1_2'));
const T = require('./sr_strength_resolver_v1_3_candidate');

const ENGINE_ID = 'STMX_SR_ENGINE_V1_3_SIDECAR';
const ENGINE_STATUS = 'IMPLEMENTATION_CANDIDATE — NOT PRODUCTION · ternary Strength sidecar over unchanged V1.2';
const BASE_ENGINE_ID = E12.ENGINE_ID;

function evaluateSR(record, meta) {
  const r = E12.evaluateSR(record, meta);
  const out = Object.assign({}, r, { engine: ENGINE_ID, engine_status: ENGINE_STATUS, base_engine: BASE_ENGINE_ID, strength_binary_legacy: r.strength });
  if (!r.sr_eligibility_admitted) { out.strength_v1_3 = 'UNKNOWN'; out.strength_v1_3_basis = { rule: 'ST-0', why: 'not SR-adjudicable — eligibility fail-closed preserved' }; return out; }
  if (r.halves && r.admitted_evidence && r.admitted_evidence.upper) {
    const up = T.resolveStrengthV13(r.admitted_evidence.upper, r.halves.upper.direction);
    const lo = T.resolveStrengthV13(r.admitted_evidence.lower, r.halves.lower.direction);
    const c = T.composeStrengthV13(r.direction, { direction: r.halves.upper.direction, strength: up.strength }, { direction: r.halves.lower.direction, strength: lo.strength });
    out.strength_v1_3 = c.strength; out.strength_v1_3_basis = c.basis; out.strength_v1_3_halves = { upper: up, lower: lo };
    return out;
  }
  const s = T.resolveStrengthV13(r.admitted_evidence, r.direction);
  out.strength_v1_3 = s.strength; out.strength_v1_3_basis = s.basis;
  return out;
}

module.exports = { evaluateSR, ENGINE_ID, ENGINE_STATUS, BASE_ENGINE_ID, STRENGTHS_V1_3: T.STRENGTHS_V1_3 };
