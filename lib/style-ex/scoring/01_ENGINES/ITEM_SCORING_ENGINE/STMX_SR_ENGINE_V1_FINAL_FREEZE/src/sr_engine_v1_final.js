'use strict';
/**
 * STMX SR ENGINE V1 — FINAL (production entry · FULL ENGINE FINAL FREEZE)
 *
 *   governed SR evidence eligibility (caller-supplied metadata · gate inside V1.2 · fail closed)
 *     → Direction V1.2                      RELAXED / NEUTRAL / STRUCTURED / UNKNOWN
 *       → ternary Strength V1.3             WEAK / REGULAR / STRONG / N/A / UNKNOWN      ← canonical Strength authority (§8)
 *         → Ordinal Projector V1 FINAL      SR1 … SR9 | null                            ← canonical SR#
 *
 * Canonical output contract (§8) — explicit field promotion, recorded in 12_STMX_SR_PRODUCTION_BINDING_AUDIT_V1.md and the migration log:
 *   strength                     = V1.3 ternary state (was: V1.2 binary WEAK/STRONG under the same name in the V1.2 / V1.3 candidate outputs)
 *   score                        = corrected projector SR# (was: V1.2 legacy ordinal under the same name)
 *   strength_legacy_v1_2_binary  = V1.2 binary Strength — explicitly named LEGACY / DIAGNOSTIC output, never an authority
 *   score_legacy_v1_2            = V1.2 legacy ordinal — explicitly named DIAGNOSTIC provenance, never canonical SR#
 * ⛔ No score → Direction feedback, no score → Strength feedback, no Strength recomputation, no REF / GT / prose / image / registry read.
 */
const B = require('../production/sr_engine_binding_v1');
const ENGINE_ID = B.ENGINE_ID;
const ENGINE_DIRECTORY_ID = B.ENGINE_DIRECTORY_ID;
const ENGINE_STATUS = 'COMPLETE_AND_CLOSED_AND_FROZEN — production baseline (CEO 2026-09-15)';
const CHAIN = { eligibility_gate: B.DIRECTION_ENGINE_DIRECTORY_ID + '/src/sr_evidence_eligibility_gate_v1.js', direction: B.DIRECTION_ENGINE_ID + ' (' + B.DIRECTION_ENGINE_DIRECTORY_ID + ')', strength: B.STRENGTH_ENGINE_ID + ' (' + B.STRENGTH_ENGINE_DIRECTORY_ID + ')', ordinal: B.ORDINAL_PROJECTOR_ID, observation_contract: B.OBSERVATION_CONTRACT_ID };

/**
 * @param {object} record  a Producer V1_3 target record: { category, observations }
 * @param {object} meta    governed input metadata: { sr_evidence_eligibility: <governed state> } — missing / out-of-domain fails closed
 */
function evaluateSR(record, meta) {
  const r = B.strength.evaluateSR(record, meta);                                     /* V1.2 (gate + Direction + legacy) → V1.3 ternary Strength */
  const admitted = r.sr_eligibility_admitted === true;
  const evidence = admitted && r.admitted_evidence ? (r.admitted_evidence.upper || r.admitted_evidence) : null;   /* one-piece: bodice / upper half governs */
  const o = B.projector.project({ admitted, direction: r.direction, strength: r.strength_v1_3, evidence });
  const out = {
    engine: ENGINE_ID, engine_directory: ENGINE_DIRECTORY_ID, engine_status: ENGINE_STATUS, chain: CHAIN, observation_contract: r.observation_contract || B.OBSERVATION_CONTRACT_ID,
    category: r.category === undefined ? null : r.category, region: r.region === undefined ? null : r.region,
    sr_evidence_eligibility: r.sr_evidence_eligibility, sr_eligibility_admitted: admitted, eligibility_basis: r.eligibility_basis || null,
    direction: r.direction, direction_basis: r.direction_basis || null,
    strength: r.strength_v1_3, strength_basis: r.strength_v1_3_basis || null,
    score: o.score, tier_name: o.tier_name, projection_status: o.projection_status, reason_code: o.reason_code, ordinal_facts: o.facts || null,
    strength_legacy_v1_2_binary: r.strength === undefined ? null : r.strength, score_legacy_v1_2: r.score === undefined ? null : r.score,
    admitted_evidence: r.admitted_evidence || null, unresolved_reasons: (r.unresolved_reasons || []).slice(), contract_warnings: r.contract_warnings || [],
  };
  if (r.halves) out.halves = r.halves;
  if (r.strength_v1_3_halves) out.strength_halves = r.strength_v1_3_halves;
  return out;
}
module.exports = { evaluateSR, ENGINE_ID, ENGINE_DIRECTORY_ID, ENGINE_STATUS, CHAIN, binding: B };
