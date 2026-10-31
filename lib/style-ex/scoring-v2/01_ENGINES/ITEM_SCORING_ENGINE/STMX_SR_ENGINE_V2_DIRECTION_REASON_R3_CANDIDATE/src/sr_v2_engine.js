'use strict';
/**
 * STMX SR ENGINE V2 — DIRECTION + REASON CANDIDATE · ENTRY POINT
 *
 *   received record { category, observations } (+ governed metadata { sr_evidence_eligibility })
 *     → frozen adapter + admission (by name, hash-verified)     product-level evidence classes
 *       → V2 Direction resolver                                   S / R (always)
 *         → Reason composer → independent verifier                Korean customer Reason + verification
 *           → customer output { direction: 'S' | 'R', reason }
 *
 * ⛔ No NEUTRAL / UNKNOWN / UNRESOLVED / NOT_SCORABLE / null result. ⛔ No score, tier, Strength, confidence or rule id in the
 * customer output. ⛔ No GT, REF, filename or image is read. ⛔ Nothing is deferred to a composer, integration layer or model.
 * Eligibility metadata is NOT a gate any more: it only selects the Reason wording (worn-body vs garment-cut) and is recorded
 * as a diagnostic. A record that is not a governed product (no observations / non-SR category) is a transport rejection
 * (SRV2TransportError) — never a product result and never read as a Direction.
 */
const B = require('./sr_v2_binding');
const EV = require('./sr_v2_evidence');
const RS = require('./sr_v2_direction_resolver');
const RC = require('./sr_v2_reason_composer');
const RV = require('./sr_v2_reason_verifier');
const CUSTOMER = { STRUCTURED: 'S', RELAXED: 'R' };
const ELIGIBILITY_STATES = ['ADJUDICABLE_WORN', 'NOT_ADJUDICABLE_FLAT_PRODUCT', 'WORN_BUT_INSUFFICIENT', 'UNRESOLVED'];
/**
 * @param {object} record  Producer V1_3 target record
 * @param {object} [meta]  { sr_evidence_eligibility } — wording policy + diagnostic only (missing → garment-cut wording)
 */
function evaluate(record, meta) {
  const pe = EV.productEvidence(record);
  const supplied = meta && typeof meta === 'object' && typeof meta.sr_evidence_eligibility === 'string' ? meta.sr_evidence_eligibility : null;
  const eligibility = supplied && ELIGIBILITY_STATES.includes(supplied) ? supplied : (supplied === null ? 'NOT_SUPPLIED' : 'OUT_OF_DOMAIN');
  const worn = eligibility === 'ADJUDICABLE_WORN';
  const d = RS.resolve(pe);
  const oneP = pe.region === 'ONE_PIECE';
  const reason = RC.compose(record, d, pe.category, oneP, worn);
  const verification = RV.verify(record, d.direction, reason, worn, d);
  const result = {
    engine: B.ENGINE_ID, engine_directory: B.ENGINE_DIRECTORY_ID, engine_status: B.ENGINE_STATUS, observation_contract: B.producerBinding.OBSERVATION_CONTRACT_ID,
    category: pe.category, region: pe.region,
    direction: d.direction, decisive_rule_id: d.rule, ceo_decision_pending: d.ceo_decision || null,
    supporting_observation_refs: reason.clauses.filter((c) => c.role === 'decisive').map((c) => c.provenance.path),
    opposing_observation_refs: reason.clauses.filter((c) => c.role === 'opposing').map((c) => c.provenance.path),
    actual_observed_values: reason.clauses.filter((c) => c.role !== 'limitation').map((c) => ({ path: c.provenance.path, value: c.provenance.value })),
    evidence_limitations: reason.clauses.filter((c) => c.role === 'limitation').map((c) => ({ path: c.provenance.path, state: c.provenance.state })),
    eligibility_metadata: { supplied: supplied, state: eligibility, worn_body_wording: worn, note: 'wording policy + diagnostic only — never blocks the Direction' },
    contradictory_pair_set_aside: !!d.x0,
    explanation_limitation: d.rule === 'SR-V2-Z0' ? { code: 'NO_PHYSICAL_SR_EVIDENCE', policy: 'SR-V2-Z0 — PROVISIONAL operational policy (S), not a physical judgment; decision authority pending CEO SR-D2; the Reason states the limitation and claims no directional observation' } : null,
    provisional_policy: !!d.provisional_policy, physically_grounded: d.rule !== 'SR-V2-Z0', reason_grounding_status: reason.grounding || null,
    evidence: pe.regions.map((e) => ({ rg: e.rg, governance: e.governance, structure_support: e.structure_support, release: e.release, release_support: e.release_support, preserves_under_release: e.preserves_under_release, form_retention_support: e.form_retention_support, release_corroboration: e.release_corroboration, volume_held: e.volume_held, fit_observed: e.fit_observed, fabric_observed: e.fabric_observed, contract_warnings: e.provenance.contract_warnings })),
    customer_reason_ko: reason.text, reason_clauses: reason.clauses, reason_validation_result: verification.length ? { status: 'FAIL', findings: verification } : { status: 'PASS', findings: [] },
    customer: customerOutput(d.direction, reason.text),
  };
  return result;
}
/** the customer-facing object — exactly two semantic elements */
function customerOutput(direction, reasonText) { if (!CUSTOMER[direction]) throw new Error('SRV2_OUTPUT_CONTRACT: direction ' + direction + ' is not S / R'); if (!reasonText) throw new Error('SRV2_OUTPUT_CONTRACT: reason missing'); return { direction: CUSTOMER[direction], reason: reasonText }; }
module.exports = { evaluate, customerOutput, CUSTOMER, ELIGIBILITY_STATES, ENGINE_ID: B.ENGINE_ID, ENGINE_DIRECTORY_ID: B.ENGINE_DIRECTORY_ID, ENGINE_STATUS: B.ENGINE_STATUS, binding: B, SRV2TransportError: EV.SRV2TransportError, SRV2BindingError: B.SRV2BindingError, RULES: RS.RULES };
