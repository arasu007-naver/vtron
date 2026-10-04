'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1 — STRUCTURED-SIDE ORDINAL REFINEMENT
 *
 * Existing frozen refinements only — ADR-125 (CEO 2026-08-10), unchanged by the Direction-First amendment:
 *   SR7   Shoulder Strong  + Waist Strong + Fit Slim
 *   SR8   Shoulder Extreme + Waist Strong + Fit Slim        Extreme is the sole SR7 → SR8 escalator
 * These are ordinal refinements INSIDE the Structured side. They are not the definition of Structured Direction
 * (order §9.2), and they are evaluated only once Direction = STRUCTURED and Strength = STRONG.
 * SR9 has no designed current physics and is never emitted (order §10.1).
 */
function refineStructured(ev, direction, strength) {
  if (direction !== 'STRUCTURED') return { refinement: null, basis: { why: 'not on the Structured side' } };
  if (strength !== 'STRONG') return { refinement: null, basis: { why: 'Structured / WEAK — baseline band, no refinement predicate applies' } };
  const triple = ev.governance.includes('WAIST_STRONG') && ev.governance.includes('FIT_SLIM');
  if (ev.governance.includes('SHOULDER_EXTREME') && triple) return { refinement: 'SR8', basis: { rule: 'ADR-125', why: 'Shoulder Extreme + Waist Strong + Fit Slim' } };
  if (ev.governance.includes('SHOULDER_STRONG') && triple) return { refinement: 'SR7', basis: { rule: 'ADR-125', why: 'Shoulder Strong + Waist Strong + Fit Slim' } };
  return { refinement: null, basis: { rule: 'ADR-125', why: 'Structured / STRONG but the SR7 / SR8 predicate is not met (' + ev.governance.join(' + ') + ') — stays at the Structured baseline; recorded as within-side ordinal residue, not a Direction or Strength failure' } };
}
module.exports = { refineStructured };
