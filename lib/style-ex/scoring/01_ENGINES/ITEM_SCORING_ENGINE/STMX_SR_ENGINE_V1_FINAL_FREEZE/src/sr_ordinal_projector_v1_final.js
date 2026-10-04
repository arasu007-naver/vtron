'use strict';
/**
 * STMX SR — ORDINAL PROJECTOR V1 · FINAL (corrected successor of STMX_SR_ORDINAL_PROJECTOR_V1_CANDIDATE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-15 — "STMX SR — ORDINAL PROJECTOR FINAL CORRECTION + FULL ENGINE FINAL FREEZE" §0 / §2 / §3.
 *   Reason:         (1) The SR7 Full Governance rule of the candidate is CEO-approved as a generic ordinal rule (§2).
 *                   (2) The candidate's SR8 predicate carried an added gate "Strength ≠ WEAK" that is NOT in ADR-125. The
 *                       canonical SR8 predicate is exactly: shoulder Extreme AND waist Strong AND fit Slim (§3). The gate is
 *                       removed; Strength is not an SR8 authority.
 *   Affected Scope: this module only (new versioned artefact — the candidate module is preserved unchanged as history).
 *                   ⛔ V1.2 (eligibility · Direction) and V1.3 (ternary Strength) untouched.
 *
 * Precedence
 *   not SR-adjudicable → null · Direction UNKNOWN → null · Strength UNKNOWN → null · NEUTRAL → SR5 · RELAXED → relaxed resolver ·
 *   STRUCTURED → structured resolver.  Ordinal never determines or rewrites Direction or Strength (DR-3).
 *
 * STRUCTURED — Partial / Full / Dominant Governance
 *   SR8  shoulder Extreme AND waist Strong AND fit Slim                          ADR-125 §2 verbatim — sole escalator; no Strength gate;
 *                                                                                 fabric-created SR8 · alternate route · Extreme alone ·
 *                                                                                 non-Slim · non-Strong-waist all impossible here
 *   SR7  Strength ∈ {REGULAR, STRONG} AND rigid cloth (fabric_behavior Structured)  FULL GOVERNANCE (CEO §2 operational rule)
 *        AND (shoulder hold OR waist hold)                                        fabric alone ≠ SR7 · Strength alone ≠ SR7 ·
 *                                                                                 shoulder alone ≠ SR7 · waist alone ≠ SR7
 *   SR6  otherwise                                                                PARTIAL GOVERNANCE (binding counter-anchor REF_000811:
 *                                                                                 REGULAR, governance token-carried in non-rigid cloth)
 *   SR9  unreachable — not designed (ADR-125 §13)
 *
 * RELAXED — Released / Volume-Dominant (§6, unchanged)
 *   SR4  Strength WEAK · SR3  Strength ∈ {REGULAR, STRONG}
 *   SR2  Anti-Structure = ADR-124 RC2 combination physics; active runtime carrier path not proven → SR2_SCALE_ENDPOINT_PRESERVED ·
 *        SR2_RUNTIME_PATH_NOT_PROVEN. ⛔ no synthetic SR2.   SR1  calibration pending → endpoint preserved.
 *
 * ⛔ This module never recomputes Strength, never reads a score, GT, REF, filename, image, prose, material or surface token, and uses
 *    no weights / coefficients / counts. Output notation SR1…SR9 | null only.
 */
const PROJECTOR_ID = 'STMX_SR_ORDINAL_PROJECTOR_V1_FINAL';
const PREDECESSOR_PROJECTOR_ID = 'STMX_SR_ORDINAL_PROJECTOR_V1_CANDIDATE';
const TIER_NAME = { SR1: 'Body-Erasing', SR2: 'Anti-Structure', SR3: 'Volume-Dominant', SR4: 'Released', SR5: 'Neutral', SR6: 'Partial Governance', SR7: 'Full Governance', SR8: 'Dominant Governance', SR9: 'Armor Governance' };
const SHOULDER_HOLD = ['Mild', 'Strong', 'Extreme'], WAIST_HOLD = ['Mild', 'Strong'], SIDE_STRENGTH = ['WEAK', 'REGULAR', 'STRONG'];
const out = (score, status, reason, extra) => Object.assign({ projector: PROJECTOR_ID, score, tier_name: score ? TIER_NAME[score] : null, projection_status: status, reason_code: reason, residue_provenance: null }, extra || {});

/** ADR-125 §2 — the exact canonical Dominant Governance predicate. Strength is deliberately NOT an input. */
function isDominantGovernance(ev) {
  return ev.shoulder === 'Extreme' && ev.waist_sr === 'Strong' && ev.fit === 'Slim';
}
/** CEO §2 — Full Governance operational predicate (rigid governed cloth AND at least one governed structural hold). */
function isBuiltForm(ev) {
  const rigid = ev.fabric === 'Structured';
  return rigid && (SHOULDER_HOLD.includes(ev.shoulder) || WAIST_HOLD.includes(ev.waist_sr));
}
function projectStructured(strength, ev) {
  const rigid = ev.fabric === 'Structured';
  const shoulderHold = SHOULDER_HOLD.includes(ev.shoulder), waistHold = WAIST_HOLD.includes(ev.waist_sr);
  const facts = { rigid_cloth: rigid, shoulder_hold: shoulderHold, waist_hold: waistHold, built_form: rigid && (shoulderHold || waistHold), shoulder: ev.shoulder || null, waist_sr: ev.waist_sr || null, fit: ev.fit || null };
  if (isDominantGovernance(ev)) return out('SR8', 'PROJECTED', 'ADR125_SR8_EXTREME_ESCALATOR', { facts });
  if ((strength === 'REGULAR' || strength === 'STRONG') && isBuiltForm(ev)) return out('SR7', 'PROJECTED', 'FULL_GOVERNANCE_BUILT_FORM', { facts });
  return out('SR6', 'PROJECTED', strength === 'WEAK' ? 'PARTIAL_GOVERNANCE_WEAK' : 'PARTIAL_GOVERNANCE_LOCALIZED', { facts });
}
function projectRelaxed(strength) {
  if (strength === 'WEAK') return out('SR4', 'PROJECTED', 'RELEASED_WEAK');
  return out('SR3', 'PROJECTED', 'VOLUME_DOMINANT_' + strength, { note: 'SR2 (Anti-Structure) = ADR-124 combination physics — SR2_RUNTIME_PATH_NOT_PROVEN under the active contract; endpoint preserved' });
}
/**
 * @param {object} input  { admitted: boolean, direction, strength, evidence } — evidence = the V1.2 admitted-evidence object for the
 *                        governing half (upper for one-pieces); Direction and Strength are consumed as already resolved.
 */
function project(input) {
  if (!input || input.admitted === false) return out(null, 'NOT_ADJUDICABLE', 'ELIGIBILITY_FAIL_CLOSED');
  const d = input.direction, s = input.strength;
  if (d === 'UNKNOWN' || !d) return out(null, 'UNRESOLVED', 'DIRECTION_UNKNOWN');
  if (d === 'NEUTRAL') return out('SR5', 'PROJECTED', 'NEUTRAL');
  if (s === 'UNKNOWN' || !SIDE_STRENGTH.includes(s)) return out(null, 'UNRESOLVED', 'STRENGTH_UNKNOWN');
  if (d === 'RELAXED') return projectRelaxed(s);
  if (d === 'STRUCTURED') return projectStructured(s, input.evidence || {});
  return out(null, 'UNRESOLVED', 'DIRECTION_OUT_OF_DOMAIN');
}
const ENDPOINTS = { SR1: 'SR1_SCALE_ENDPOINT_PRESERVED · SR1_RUNTIME_PATH_NOT_PROVEN (ADR-124 RC4 calibration pending)', SR2: 'SR2_SCALE_ENDPOINT_PRESERVED · SR2_RUNTIME_PATH_NOT_PROVEN (ADR-124 RC2 combination physics; active carrier path not proven)', SR8: 'ADR-125 §2 exact: shoulder Extreme + waist Strong + fit Slim — implemented without any Strength gate; reachable only when the Extreme carrier value is observed', SR9: 'SR9_SCALE_ENDPOINT_PRESERVED · RUNTIME_UNREACHABLE (not designed, ADR-125 §13)' };
module.exports = { project, projectStructured, projectRelaxed, isDominantGovernance, isBuiltForm, PROJECTOR_ID, PREDECESSOR_PROJECTOR_ID, TIER_NAME, ENDPOINTS };
