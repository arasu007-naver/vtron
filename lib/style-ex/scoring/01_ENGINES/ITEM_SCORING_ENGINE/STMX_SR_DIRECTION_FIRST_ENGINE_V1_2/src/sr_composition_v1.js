'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1 — DRESS / JUMPSUIT COMPOSITION
 *
 * A one-piece is read as UPPER (fit · fabric · shoulder · drop · waist) and LOWER (fit · fabric · silhouette).
 * Composition consumes the two halves' SEMANTIC states, not their tiers (order §14 — "consume semantic
 * Direction/Strength outputs rather than independently back-solving numeric tiers").
 *
 * Preserved (ADR-125 · ADR-035 MR-1 · CEO 2026-07-23): Midpoint composition remains; a half-step resolves
 * upward; ⛔ no one-piece product ceiling; Dress/Jumpsuit are category-neutral for SR7/SR8.
 *
 * Semantic composition table (one row per unordered pair):
 *   same Direction                 → that Direction. Structured: STRONG if either half STRONG (half-step resolves upward).
 *                                    Relaxed: STRONG only if both halves STRONG (upward = less released).
 *   STRUCTURED + NEUTRAL           → STRUCTURED / WEAK
 *   RELAXED/WEAK + NEUTRAL         → NEUTRAL
 *   RELAXED/STRONG + NEUTRAL       → RELAXED / WEAK
 *   STRUCTURED/STRONG + RELAXED/WEAK → STRUCTURED / WEAK   (dominant bodice governance over a mildly released skirt)
 *   any other STRUCTURED + RELAXED → NEUTRAL
 *   any UNKNOWN half               → UNKNOWN (fail closed)
 * The frozen numeric midpoint is computed alongside for DIAGNOSTIC comparison only (never as the product state).
 */
function composeSemantic(upper, lower) {
  const U = upper.direction, Lo = lower.direction, us = upper.strength, ls = lower.strength;
  if (U === 'UNKNOWN' || Lo === 'UNKNOWN') return { direction: 'UNKNOWN', strength: 'UNKNOWN', rule: 'C0', why: 'a half is unresolved — fail closed' };
  if (U === Lo) {
    if (U === 'NEUTRAL') return { direction: 'NEUTRAL', strength: 'N/A', rule: 'C1', why: 'both halves Neutral' };
    if (U === 'STRUCTURED') return { direction: 'STRUCTURED', strength: (us === 'STRONG' || ls === 'STRONG') ? 'STRONG' : 'WEAK', rule: 'C1', why: 'both halves Structured — half-step resolves upward' };
    return { direction: 'RELAXED', strength: (us === 'STRONG' && ls === 'STRONG') ? 'STRONG' : 'WEAK', rule: 'C1', why: 'both halves Relaxed — half-step resolves upward (less released)' };
  }
  const has = d => U === d || Lo === d;
  const strengthOf = d => U === d ? us : ls;
  if (has('NEUTRAL')) {
    if (has('STRUCTURED')) return { direction: 'STRUCTURED', strength: 'WEAK', rule: 'C2', why: 'Structured half over a Neutral half — half-step resolves upward' };
    return strengthOf('RELAXED') === 'STRONG'
      ? { direction: 'RELAXED', strength: 'WEAK', rule: 'C3', why: 'strongly released half over a Neutral half' }
      : { direction: 'NEUTRAL', strength: 'N/A', rule: 'C3', why: 'mildly released half over a Neutral half resolves to the centre' };
  }
  /* STRUCTURED + RELAXED */
  if (strengthOf('STRUCTURED') === 'STRONG' && strengthOf('RELAXED') === 'WEAK') return { direction: 'STRUCTURED', strength: 'WEAK', rule: 'C4', why: 'dominant governance on one half over mild release on the other' };
  return { direction: 'NEUTRAL', strength: 'N/A', rule: 'C4', why: 'opposed halves — neither dominant' };
}

/** frozen numeric midpoint, diagnostic only: midpoint of the two half tiers, non-integer resolves upward (Math.ceil) */
function frozenMidpoint(upperScore, lowerScore) {
  const n = s => s ? +String(s).replace('SR', '') : null;
  const a = n(upperScore), b = n(lowerScore);
  if (!a || !b) return null;
  return 'SR' + Math.ceil((a + b) / 2);
}

module.exports = { composeSemantic, frozenMidpoint };
