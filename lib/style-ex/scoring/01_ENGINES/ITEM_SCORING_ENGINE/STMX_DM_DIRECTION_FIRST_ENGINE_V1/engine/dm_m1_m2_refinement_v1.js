'use strict';
/**
 * STMX DM DIRECTION-FIRST ENGINE — M1 / M2 GOVERNED REFINEMENT V1
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-10
 *   Order:          STMX DM DIRECTION-FIRST CLOSURE + ENGINE IMPLEMENTATION V1 §9 / §25
 *   Reason:         M1/M2 are CEO-ratified canonical Score Physics (2026-07-30) and are NOT
 *                   deleted or redesigned. Direction-First fixes their EXECUTION PRECEDENCE:
 *                   Direction is the primary whole-garment side resolution; M1/M2 operate
 *                   INSIDE the already-governed side, on within-side strength and on the
 *                   secondary ordinal tier.
 *   Affected Scope: STMX_DM_DIRECTION_FIRST_ENGINE_V1/engine only.
 *
 * ═══ THE FIREWALL THIS MODULE EXISTS TO ENFORCE (order §8 / §9 / §25) ════════════════════════
 *   ⛔ M1/M2 CANNOT OVERTURN AN ALREADY GOVERNED DIRECTION. Nothing in this file returns,
 *      computes or influences a direction, and `refine()` is not even given one. The engine
 *      calls it only AFTER Direction is resolved, and the projector clamps every tier to the
 *      band the Direction already fixed.
 *   ⛔ In particular M1 must never be used to cross the centre: "Direction M + M1 adjustment →
 *      D-side crossing" is prohibited, and is prevented structurally rather than by convention.
 *
 * ═══ M1 IS NOT REIMPLEMENTED HERE ════════════════════════════════════════════════════════════
 *   The frozen M1 predicate is loaded from the module the CEO closed in
 *   STMX_DM_OBSERVATION_LAYER_IMPLEMENTATION_V1/engine/dm_m1_predicate_v1.js, which has been
 *   byte-identical since that order. ⛔ It is required by NAME, never copied, so this engine
 *   cannot drift from the ratified predicate. Its states are reused verbatim.
 */

const path = require('path');
const A = require('./dm_admission_v1');
const { establishes } = A;

/** ⛔ NAMED binding to the frozen predicate. No glob, no "latest", no local copy.
 *  A missing predicate FAILS CLOSED rather than being re-implemented inline. */
const M1_PREDICATE_PATH = path.resolve(
  __dirname, '..', '..', 'STMX_DM_OBSERVATION_LAYER_IMPLEMENTATION_V1', 'engine', 'dm_m1_predicate_v1.js');
let M1;
try {
  M1 = require(M1_PREDICATE_PATH);
} catch (e) {
  throw new Error('DM_M1_PREDICATE_UNRESOLVED: the frozen M1 predicate could not be loaded from ' +
    M1_PREDICATE_PATH + '. ⛔ FAIL CLOSED — this engine must NOT re-implement ratified Score Physics.');
}

const IS_LARGE = ['large'];
const CLEARLY_SEPARATES = ['high'];

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * M2 — STRENGTH-GATED AGGREGATION (frozen, verbatim intent)
 *   "DM은 dominant designed system이 설정한다. secondary evidence는 그 자체가 substantial일
 *    때만 기여하고, 저강도 secondary는 가산 escalate 하지 않는다."
 *
 * In Direction-First terms M2 answers ONE question inside an already-governed side: does the
 * garment carry MORE THAN ONE substantial designed system, or one dominant system plus
 * low-strength companions that add nothing?
 *
 * ⛔ This is NOT a count and NOT an additive model. A garment with five low-strength companions
 *    is exactly as strong as the same garment with one — which is the whole point of M2 and is
 *    asserted directly in the regression (frozen grp3: dominant graphic + low wash → no add).
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
function substantialSet(evList, commandsFn) {
  const substantial = evList.filter(e => commandsFn(e).yes);
  return {
    substantial_ids: substantial.map(e => e.evidence_id),
    multi_substantial: substantial.length >= 2,
    /** low-strength companions, recorded so it is visible that they were seen and NOT added */
    non_contributing_ids: evList.filter(e => !commandsFn(e).yes).map(e => e.evidence_id),
  };
}

/** M1 on one admitted evidence — delegated verbatim to the frozen predicate. */
function m1For(e) {
  const r = M1.evaluateM1(e.raw || {});
  return { evidence_id: e.evidence_id, state: r.state, reason: r.reason, inputs: r.inputs, family: r.family };
}

/**
 * Governed refinement inside an already-decided side.
 * ⛔ Takes NO direction argument and returns NO direction. See the firewall note above.
 *
 * @returns {{m1:Array, m1_any_triggered:boolean, m1_any_unresolved_on_substantial:boolean,
 *            m2:object, covers_whole_garment_clearly:boolean}}
 */
function refine(evList, commandsFn) {
  const m1 = evList.map(m1For);
  const m2 = substantialSet(evList, commandsFn);

  const byId = new Map(m1.map(x => [x.evidence_id, x]));
  const substantialM1 = m2.substantial_ids.map(id => byId.get(id)).filter(Boolean);

  /** ★ M1 only refines a system that is actually carrying the garment. A triggered M1 on a
   *  low-strength companion is recorded but does not strengthen the side — that is M2. */
  const m1_any_triggered = substantialM1.some(x => x.state === M1.M1_TRIGGERED);
  const m1_any_unresolved_on_substantial = substantialM1.some(x => x.state === M1.M1_UNRESOLVED);

  /** the frozen strong all-over reading: a substantial system that covers the whole garment and
   *  clearly separates from it (mono4 · dmdch1 · dmdch2 · shirtsprint1 · mash1 · mtdr1 ·
   *  dmdanimal1 · lacedr1 — every one of them DM7 or DM8). */
  const covers_whole_garment_clearly = evList.some(e =>
    m2.substantial_ids.includes(e.evidence_id) &&
    establishes(e.spatial, ['whole_garment']) &&
    establishes(e.contrast, CLEARLY_SEPARATES) &&
    establishes(e.size, IS_LARGE));

  return { m1, m1_any_triggered, m1_any_unresolved_on_substantial, m2, covers_whole_garment_clearly };
}

module.exports = {
  refine, m1For, substantialSet, M1_PREDICATE_PATH,
  M1_TRIGGERED: M1.M1_TRIGGERED, M1_NOT_TRIGGERED: M1.M1_NOT_TRIGGERED,
  M1_NOT_ELIGIBLE: M1.M1_NOT_ELIGIBLE, M1_UNRESOLVED: M1.M1_UNRESOLVED,
  frozenPredicate: M1,
};
