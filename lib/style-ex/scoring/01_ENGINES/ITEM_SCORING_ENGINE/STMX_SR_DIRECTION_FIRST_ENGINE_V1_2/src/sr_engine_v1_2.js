'use strict';
/**
 * STMX SR ENGINE V1.2 — ENGINE ENTRY (IMPLEMENTATION CANDIDATE · NOT PRODUCTION)
 *
 * V1.2 = V1.1 pipeline, unchanged in order, with the CEO-approved BOUNDED material / structure-relevant surface
 *        support consumed inside the Direction Resolver only.
 *
 *   NAMED PRODUCER BINDING            (STMX_VISION_PRODUCER_V1_3, by name · fails closed · + material · surface bound by name)
 *        ↓
 *   ELIGIBILITY METADATA VALIDATION   (governed enum · missing = fail closed)                       unchanged
 *        ↓
 *   SR ELIGIBILITY GATE               ← admission decided HERE, before any semantics                 unchanged
 *        ↓ admitted only
 *   SR INPUT ADAPTER                  (+ reads the two MULTI support carriers as value sets)         V1.2
 *        ↓
 *   EVIDENCE ADMISSION                (+ class form_retention_support)                               V1.2
 *        ↓
 *   DIRECTION RESOLVER                (+ rule R3d — moderate release + form retention → STRUCTURED)  V1.2
 *        ↓
 *   STRENGTH RESOLVER → REFINEMENT → ORDINAL PROJECTOR                                                unchanged
 *
 * ⛔ For an ineligible unit the Direction Resolver, the Strength Resolver and the ordinal projector are never
 *    reached: this module returns the gate's fixed product before the semantic core is called
 *    (proved by tests/test_eligibility.js ELIG-10 · ELIG-11 · ELIG-12).
 * ⛔ Strength physics, refinement, composition and ordinal projection are BYTE-IDENTICAL to V1.1 — this order tunes
 *    none of them (order §15 · §18 · §19). Proved by tests/test_v1_2_dependencies.js.
 * ⛔ No case-specific rule: this module never looks at a REF id, a batch, a filename, ground truth or a registry
 *    (order §21). It reads one governed metadata field, supplied by the caller.
 */
const B = require('./sr_producer_binding_v1');
const G = require('./sr_evidence_eligibility_gate_v1');
const CORE = require('./sr_engine_v1');

const ENGINE_ID = 'STMX_SR_ENGINE_V1_2';
const ENGINE_DIRECTORY_ID = 'STMX_SR_DIRECTION_FIRST_ENGINE_V1_2';
const ENGINE_STATUS = 'IMPLEMENTATION_CANDIDATE — NOT PRODUCTION';
const SEMANTIC_CORE_ID = B.ENGINE_ID;                 /* STMX_SR_ENGINE_V1_2 — V1 core with the V1.2 Direction delta */
const PREDECESSOR_ENGINE_ID = 'STMX_SR_ENGINE_V1_1';

/**
 * @param {object} record  a Producer V1_3 target record: { category, observations }
 * @param {object} meta    governed input metadata: { sr_evidence_eligibility: <governed state> }
 * @returns engine result (V1.1 output contract, unchanged)
 */
function evaluateSR(record, meta) {
  /* 1 — named observation contract binding (the binding module already failed closed at require time) */
  const base = { engine: ENGINE_ID, engine_status: ENGINE_STATUS, semantic_core: SEMANTIC_CORE_ID,
    observation_contract: B.OBSERVATION_CONTRACT_ID };

  /* 2 + 3 — eligibility metadata validation and the gate */
  const gate = G.evaluateEligibility(meta);
  if (!gate.admitted) {
    const out = G.ineligibleResult(gate);
    out.category = record && record.category ? (record.category.value || record.category) : null;
    return Object.assign(base, out);
  }

  /* 4… — admitted: the semantic pipeline */
  const semantic = CORE.evaluateSR(record);
  return Object.assign(base, semantic, {
    engine: ENGINE_ID, engine_status: ENGINE_STATUS, semantic_core: SEMANTIC_CORE_ID,
    sr_evidence_eligibility: gate.eligibility, sr_eligibility_admitted: true, eligibility_basis: gate.basis,
    unresolved_reasons: (semantic.unresolved_reasons || []).slice(),
  });
}

module.exports = { evaluateSR, ENGINE_ID, ENGINE_DIRECTORY_ID, ENGINE_STATUS, SEMANTIC_CORE_ID, PREDECESSOR_ENGINE_ID,
  OBSERVATION_CONTRACT_ID: B.OBSERVATION_CONTRACT_ID, ELIGIBILITY_STATES: G.ELIGIBILITY_STATES, ADMITTED_STATE: G.ADMITTED_STATE };
