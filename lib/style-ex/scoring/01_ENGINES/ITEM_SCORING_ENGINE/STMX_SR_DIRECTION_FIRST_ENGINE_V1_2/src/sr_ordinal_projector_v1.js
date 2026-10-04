'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1 — SECONDARY ORDINAL PROJECTOR
 *
 * Consumes ALREADY-RESOLVED semantic state (Direction · Strength · refinement fact) and nothing else.
 * ⛔ Never raw observations, never GT, never REF. Direction and Strength never import this module (order §28).
 *
 *   RELAXED + WEAK      → SR4 baseline
 *   NEUTRAL             → SR5
 *   STRUCTURED + WEAK   → SR6 baseline
 *   RELAXED + STRONG    → SR3, or SR2 when the ADR-124 collapse combination holds
 *   STRUCTURED + STRONG → SR7 / SR8 when the ADR-125 predicate holds, else the SR6 baseline
 *   UNKNOWN             → null
 *   SR1 and SR9 are never emitted — SR1 is calibration-pending (ADR-124 RC4), SR9 has no designed physics.
 *   SA-3: a Bottom projection may never exceed SR6.
 */
const ORDER = { SR1: 1, SR2: 2, SR3: 3, SR4: 4, SR5: 5, SR6: 6, SR7: 7, SR8: 8, SR9: 9 };

function project(direction, strength, refinement, opts) {
  const bottom = !!(opts && opts.bottom);
  let score = null, why;
  if (direction === 'UNKNOWN') { score = null; why = 'Direction unresolved — no tier is fabricated'; }
  else if (direction === 'NEUTRAL') { score = 'SR5'; why = 'Neutral is a real centre (N001)'; }
  else if (direction === 'STRUCTURED') {
    if (strength === 'STRONG' && (refinement === 'SR7' || refinement === 'SR8')) { score = refinement; why = 'Structured / STRONG with the ADR-125 ' + refinement + ' refinement'; }
    else { score = 'SR6'; why = strength === 'STRONG' ? 'Structured / STRONG without a met refinement predicate — baseline SR6' : 'Structured / WEAK baseline'; }
  } else if (direction === 'RELAXED') {
    if (strength === 'STRONG' && (refinement === 'SR2' || refinement === 'SR3')) { score = refinement; why = 'Relaxed / STRONG with the ADR-124 ' + refinement + ' combination'; }
    else { score = 'SR4'; why = 'Relaxed / WEAK baseline'; }
  }
  if (bottom && score && ORDER[score] > 6) { score = 'SR6'; why += ' · SA-3 Bottom ceiling applied'; }
  return { score, basis: { why, direction, strength, refinement: refinement || null, sa3_bottom_ceiling: bottom } };
}
module.exports = { project, ORDER };
