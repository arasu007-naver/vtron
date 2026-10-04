'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1 — ENGINE ENTRY (IMPLEMENTATION CANDIDATE)
 *
 *   STMX_VISION_PRODUCER_V1_3 record
 *       → sr_input_adapter        (SR-owned carriers · Two-Gate · N/A as key omission)
 *       → sr_evidence_admission   (governed evidence classes)
 *       → sr_direction_resolver   (RELAXED / NEUTRAL / STRUCTURED / UNKNOWN)   ← PRIMARY
 *       → sr_strength_resolver    (WEAK / STRONG / N/A / UNKNOWN)
 *       → refinement              (ADR-125 SR7/SR8 · ADR-124 SR2/SR3 — existing frozen facts only)
 *       → sr_ordinal_projector    (SR1…SR9 or null)                            ← SECONDARY
 *   Dress / Jumpsuit: UPPER and LOWER halves are read separately and composed SEMANTICALLY (sr_composition).
 *
 * The output contract (order §18) exposes direction · strength · score with a governed basis for each and the
 * unresolved reasons, so that any exact-tier mismatch can be classified as a Direction failure, a Strength
 * failure, or ordinal-only residue.
 *
 * ⛔ numeric tier first → derive Direction is structurally impossible: the projector runs last and consumes only
 *    the resolved semantic state; the resolvers never import it (proved by tests/test_module_dependencies.js).
 */
const B = require('./sr_producer_binding_v1');
const A = require('./sr_input_adapter_v1');
const E = require('./sr_evidence_admission_v1');
const D = require('./sr_direction_resolver_v1');
const S = require('./sr_strength_resolver_v1');
const RS = require('./sr_structured_refinement_v1');
const RR = require('./sr_relaxed_refinement_v1');
const C = require('./sr_composition_v1');
const P = require('./sr_ordinal_projector_v1');

function resolveHalf(adapted, half) {
  const ev = E.admit(adapted, half);
  const d = D.resolveDirection(ev);
  const s = S.resolveStrength(ev, d.direction);
  const rs = RS.refineStructured(ev, d.direction, s.strength);
  const rr = RR.refineRelaxed(ev, d.direction, s.strength);
  const refinement = rs.refinement || rr.refinement || null;
  const refinement_basis = rs.refinement ? rs.basis : rr.refinement ? rr.basis : (d.direction === 'STRUCTURED' ? rs.basis : d.direction === 'RELAXED' ? rr.basis : null);
  return { half, evidence: ev, direction: d.direction, direction_basis: d.basis, strength: s.strength, strength_basis: s.basis, refinement, refinement_basis, unresolved_reasons: d.unresolved_reasons };
}

/**
 * @param {object} record  a Producer V1_3 target record: { category, observations }
 * @returns engine result (order §18 contract)
 */
function evaluateSR(record) {
  const adapted = A.adapt(record, 'UPPER');
  const base = { engine: B.ENGINE_ID, engine_status: B.ENGINE_STATUS, observation_contract: B.OBSERVATION_CONTRACT_ID, category: adapted.category, region: adapted.region };
  if (!adapted.region) return Object.assign(base, { direction: 'UNKNOWN', strength: 'UNKNOWN', score: null, direction_basis: { rule: 'R-', why: 'category not an SR category' }, strength_basis: null, ordinal_basis: null, unresolved_reasons: adapted.notes, contract_warnings: adapted.contract_warnings });

  if (adapted.region === 'ONE_PIECE') {
    /* one-pieces are adapted twice — regional carriers (CA#5 byRegion) resolve per half */
    const upper = resolveHalf(adapted, 'UPPER'), lower = resolveHalf(A.adapt(record, 'LOWER'), 'LOWER');
    const comp = C.composeSemantic(upper, lower);
    /* refinement facts come from the UPPER half's governance (shoulder · waist · fit), as ADR-125 defines them */
    const refinement = comp.direction === 'STRUCTURED' && comp.strength === 'STRONG' ? RS.refineStructured(upper.evidence, 'STRUCTURED', 'STRONG').refinement
      : comp.direction === 'RELAXED' && comp.strength === 'STRONG' ? (RR.refineRelaxed(lower.evidence, 'RELAXED', 'STRONG').refinement || RR.refineRelaxed(upper.evidence, 'RELAXED', 'STRONG').refinement) : null;
    const pr = P.project(comp.direction, comp.strength, refinement, { bottom: false });
    const upperScore = P.project(upper.direction, upper.strength, upper.refinement, { bottom: false }).score;
    const lowerScore = P.project(lower.direction, lower.strength, lower.refinement, { bottom: true }).score;
    return Object.assign(base, {
      direction: comp.direction, strength: comp.strength, score: pr.score,
      direction_basis: { rule: comp.rule, why: comp.why, upper: upper.direction_basis, lower: lower.direction_basis },
      strength_basis: { rule: comp.rule, upper: upper.strength_basis, lower: lower.strength_basis },
      ordinal_basis: Object.assign({ composition: 'semantic (order §14)', halves: { upper: upperScore, lower: lowerScore }, frozen_midpoint_diagnostic: C.frozenMidpoint(upperScore, lowerScore), refinement }, pr.basis),
      unresolved_reasons: [].concat(upper.unresolved_reasons, lower.unresolved_reasons),
      contract_warnings: adapted.contract_warnings, halves: { upper: { direction: upper.direction, strength: upper.strength, refinement: upper.refinement }, lower: { direction: lower.direction, strength: lower.strength, refinement: lower.refinement } },
      admitted_evidence: { upper: upper.evidence, lower: lower.evidence },
    });
  }

  const half = adapted.region === 'BOTTOM' ? 'LOWER' : 'UPPER';
  const r = resolveHalf(half === 'LOWER' ? A.adapt(record, 'LOWER') : adapted, half);
  const pr = P.project(r.direction, r.strength, r.refinement, { bottom: adapted.region === 'BOTTOM' });
  return Object.assign(base, {
    direction: r.direction, strength: r.strength, score: pr.score,
    direction_basis: r.direction_basis, strength_basis: r.strength_basis,
    ordinal_basis: Object.assign({ refinement: r.refinement, refinement_basis: r.refinement_basis }, pr.basis),
    unresolved_reasons: r.unresolved_reasons, contract_warnings: adapted.contract_warnings,
    admitted_evidence: r.evidence,
  });
}

module.exports = { evaluateSR, resolveHalf, ENGINE_ID: B.ENGINE_ID, OBSERVATION_CONTRACT_ID: B.OBSERVATION_CONTRACT_ID, ENGINE_STATUS: B.ENGINE_STATUS };
