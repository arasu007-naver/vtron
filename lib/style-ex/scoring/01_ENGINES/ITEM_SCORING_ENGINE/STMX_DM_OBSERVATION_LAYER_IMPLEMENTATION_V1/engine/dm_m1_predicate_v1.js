'use strict';
/**
 * STMX DM — M1 PREDICATE V1  (DM ENGINE SIDE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-09
 *   Order:          STMX DM OBSERVATION LAYER + M1 PRODUCTION IMPLEMENTATION V1 §5
 *   Reason:         The single HOLD of the preceding design order was the M1 predicate. The CEO
 *                   closed it: M1 fires on governed internal-richness realization; Spatial
 *                   Position is NOT a trigger; graphic accepts either realization, non-graphic
 *                   requires dense_varied; unresolved support fails closed.
 *   Affected Scope: this module and its tests only.
 *
 * ⛔ THIS IS ENGINE CODE, NOT VISION CODE. It lives outside the Producer closure on purpose
 *    (order §19: "observation module과 scoring predicate module을 물리적으로 분리한다").
 *    A Vision record must never contain this module's output.
 * ⛔ NOT A SCORE. This resolves ONE frozen mechanism's eligibility. It emits no tier, no number,
 *    no weight and no DM1–DM9. Base-tier placement and aggregation are not implemented in this
 *    order (order §26).
 * ⛔ NO GT LOOKUP, NO REF RULE, NO ANCHOR TABLE, NO TOKEN GUESS. The predicate reads only the
 *    governed realization on the evidence in front of it.
 */

/** Frozen M1, verbatim (STMX_DM_SCORE_PHYSICS_ARCHITECTURE.md · ratified CEO 2026-07-30):
 *  admitted designed system의 realized 내부 richness(multi-color 복합 구성 · 또는 dense
 *  embellishment)가 그 primitive tuple의 base tier보다 한 단계 위로 detail mass를 올린다.
 *  단순 반복 · monochrome · 2-color moderate · surface-relief 단독은 trigger 아님. */

const GRAPHIC_FAMILY = 'graphic';
const M1_ELIGIBLE_FAMILIES = ['graphic', 'surface_pattern', 'surface_treatment', 'attached_detail'];
const CHROMATIC = 'internal_chromatic_composition';
const FILL = 'internal_fill_realization';
const COMPOUND = 'multi_colour_compound';
const DENSE = 'dense_varied';

/** governed result states — ⛔ non-numeric by construction */
const M1_TRIGGERED = 'M1_TRIGGERED';
const M1_NOT_TRIGGERED = 'M1_NOT_TRIGGERED';
const M1_NOT_ELIGIBLE = 'M1_NOT_ELIGIBLE_FAMILY';
const M1_UNRESOLVED = 'NOT_TRIGGERED_DUE_TO_UNRESOLVED_SUPPORT';

/** A realization field is RESOLVED only when it was actually OBSERVED with a governed value.
 *  UNKNOWN, NOT_VISIBLE, missing and malformed are all unresolved — order §5.5 / §19. */
function readRealization(m1, field) {
  if (!m1 || typeof m1 !== 'object') return { resolved: false, value: null, why: 'realization block missing' };
  const f = m1[field];
  if (f === undefined || f === null) return { resolved: false, value: null, why: field + ' missing' };
  if (typeof f !== 'object') return { resolved: false, value: null, why: field + ' malformed' };
  if (f.state !== 'OBSERVED') return { resolved: false, value: null, why: field + ' state=' + f.state };
  if (typeof f.value !== 'string' || !f.value) return { resolved: false, value: null, why: field + ' value missing' };
  return { resolved: true, value: f.value, why: null };
}

/**
 * Evaluate the frozen M1 mechanism for ONE admitted evidence.
 * @returns {{state:string, reason:string, family:string, inputs:object}}
 */
function evaluateM1(evidence) {
  const family = evidence && evidence.evidence_family;
  const inputs = { chromatic: null, fill: null };

  if (!M1_ELIGIBLE_FAMILIES.includes(family)) {
    return { state: M1_NOT_ELIGIBLE, family: family || null, inputs,
      reason: 'family "' + family + '" carries no internal composition in the M1 sense; no frozen ' +
        'M1 calibration case fires on it' };
  }

  const m1 = evidence.m1_supporting_realization;
  const c = readRealization(m1, CHROMATIC);
  const f = readRealization(m1, FILL);
  inputs.chromatic = c.resolved ? c.value : null;
  inputs.fill = f.resolved ? f.value : null;

  if (family === GRAPHIC_FAMILY) {
    // ── CEO §5.2 — graphic: either realization is sufficient ────────────────────────────────
    // ★ Fail-closed over a DISJUNCTION is asymmetric and that asymmetry is deliberate:
    //   ONE observed sufficient condition proves the disjunction true even if the other side is
    //   unreadable, but proving it FALSE requires BOTH sides to be resolved.
    if ((c.resolved && c.value === COMPOUND) || (f.resolved && f.value === DENSE)) {
      return { state: M1_TRIGGERED, family, inputs,
        reason: 'graphic with ' + (c.value === COMPOUND ? CHROMATIC + '=' + COMPOUND
          : FILL + '=' + DENSE) + ' — CEO §5.2' };
    }
    if (!c.resolved || !f.resolved) {
      return { state: M1_UNRESOLVED, family, inputs,
        reason: 'graphic: neither sufficient condition was observed and support is unresolved (' +
          [c.why, f.why].filter(Boolean).join('; ') + ') — no inference, no default (CEO §5.5)' };
    }
    return { state: M1_NOT_TRIGGERED, family, inputs,
      reason: 'graphic with ' + CHROMATIC + '=' + c.value + ' and ' + FILL + '=' + f.value +
        ' — neither sufficient condition holds' };
  }

  // ── CEO §5.3 — non-graphic: ONLY dense_varied. multi_colour_compound alone never fires. ────
  if (f.resolved && f.value === DENSE) {
    return { state: M1_TRIGGERED, family, inputs,
      reason: 'non-graphic family with ' + FILL + '=' + DENSE + ' — CEO §5.3' };
  }
  if (!f.resolved) {
    return { state: M1_UNRESOLVED, family, inputs,
      reason: 'non-graphic family: ' + FILL + ' unresolved (' + f.why +
        ') — no inference, no default, no GT lookup (CEO §5.5 / §22)' };
  }
  return { state: M1_NOT_TRIGGERED, family, inputs,
    reason: 'non-graphic family with ' + FILL + '=' + f.value +
      (c.resolved && c.value === COMPOUND
        ? '. ⛔ ' + CHROMATIC + '=' + COMPOUND + ' alone does NOT fire M1 on a non-graphic family (CEO §5.3)'
        : '') };
}

/** Evaluate every evidence in a governed DM observation block. ⛔ Emits no aggregate and no tier. */
function evaluateBlock(dmBlock) {
  const ev = (dmBlock && Array.isArray(dmBlock.evidence)) ? dmBlock.evidence : [];
  return ev.map(e => Object.assign({ evidence_id: e && e.evidence_id }, evaluateM1(e)));
}

module.exports = {
  evaluateM1, evaluateBlock, readRealization,
  M1_TRIGGERED, M1_NOT_TRIGGERED, M1_NOT_ELIGIBLE, M1_UNRESOLVED,
  M1_ELIGIBLE_FAMILIES, GRAPHIC_FAMILY, CHROMATIC, FILL, COMPOUND, DENSE,
};
