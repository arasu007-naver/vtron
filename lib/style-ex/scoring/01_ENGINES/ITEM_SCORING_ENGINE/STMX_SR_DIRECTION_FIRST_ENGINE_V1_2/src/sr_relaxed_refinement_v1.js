'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1 — RELAXED-SIDE ORDINAL REFINEMENT
 *
 * Existing governed combination semantics only — ADR-124 (CEO 2026-08-09), unchanged:
 *   RC1  extreme expansion alone ≠ automatic SR3
 *   RC2  SR3 ↔ SR2 is combination physics — SR3 = volume-dominant with structure still readable;
 *        SR2 = extreme release with structure yielding / collapsing
 *   RC4  SR1 is calibration-pending — never emitted
 * Evaluated only once Direction = RELAXED and Strength = STRONG.
 */
function refineRelaxed(ev, direction, strength) {
  if (direction !== 'RELAXED') return { refinement: null, basis: { why: 'not on the Relaxed side' } };
  if (strength !== 'STRONG') return { refinement: null, basis: { why: 'Relaxed / WEAK — baseline band, no refinement predicate applies' } };
  const collapsing = ev.fabric === 'Fluid' && (ev.release_support.includes('SHOULDER_DROPPED') || ev.release_support.some(r => r.startsWith('GEOMETRY_')));
  if (collapsing) return { refinement: 'SR2', basis: { rule: 'ADR-124 RC2', why: 'extreme release with structure yielding — Fluid fabric plus ' + ev.release_support.filter(r => r !== 'FABRIC_FLUID').join(' + ') } };
  return { refinement: 'SR3', basis: { rule: 'ADR-124 RC2', why: 'volume-dominant release with structure still readable (' + ev.release.join('') + ' + ' + ev.release_support.join(' + ') + ')' } };
}
module.exports = { refineRelaxed };
