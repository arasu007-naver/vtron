'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1 — STRENGTH RESOLVER (SECONDARY SEMANTIC LAYER)
 *
 * Resolved only AFTER Direction. Consumes admitted evidence classes and the resolved Direction — never a tier,
 * never GT, never REF. ⛔ Strength is not tier-derived (order §27).
 *
 *   STRUCTURED
 *     STRONG   reinforcing governance across at least two of the three governance axes (shoulder · waist · fit)
 *              — the frozen S7 name is "Full Governance — multiple reinforcing structural controls"
 *     WEAK     governance carried by a single morphology, or by form retention without any dominant carrier
 *              — the frozen S6 name is "Partial Governance — one clear structural morphology"; the seven
 *                Batch-001 Jacket controls are calibration examples of this band (order §1 · §9.1)
 *   RELAXED
 *     STRONG   dominant release: a strongly released fit (Oversized / Voluminous) AND yielding cloth (fluid-side
 *              fabric) — ADR-124: magnitude alone is insufficient; Constitution §0: Oversized + Fluid → SR3
 *     WEAK     release present but moderate — Relaxed fit; or a strongly released cut whose cloth still holds
 *              (Semi-Structured); or a governance-loss signal on a Regular fit
 *   NEUTRAL  → N/A        UNKNOWN → UNKNOWN
 */
const STRENGTHS = ['WEAK', 'STRONG', 'N/A', 'UNKNOWN'];

function resolveStrength(ev, direction) {
  if (direction === 'UNKNOWN') return { strength: 'UNKNOWN', basis: { rule: 'S0', why: 'Direction unresolved' } };
  if (direction === 'NEUTRAL') return { strength: 'N/A', basis: { rule: 'S0', why: 'Neutral has no within-side magnitude' } };
  if (direction === 'STRUCTURED') {
    const axes = [];
    if (ev.governance.some(g => g.startsWith('SHOULDER_'))) axes.push('shoulder');
    if (ev.governance.includes('WAIST_STRONG')) axes.push('waist');
    if (ev.governance.includes('FIT_SLIM')) axes.push('fit');
    if (axes.length >= 2) return { strength: 'STRONG', basis: { rule: 'S1', why: 'multiple reinforcing structural controls (' + axes.join(' + ') + ')', governance_axes: axes } };
    return { strength: 'WEAK', basis: { rule: 'S2', why: axes.length === 1 ? 'one clear structural morphology (' + axes[0] + ')' : 'form retention without a dominant governance carrier (' + ev.structure_support.join(' + ') + ')', governance_axes: axes } };
  }
  /* RELAXED — dominant release needs the cloth to YIELD as well as the cut to release. Constitution §0 gives the
   * gradient: Oversized + Structured → SR5 · Oversized + Fluid → SR3; Semi-Structured under an oversized cut sits
   * between them and is moderate release (SR4), whatever the shoulder does. */
  const yields = ev.release_support.some(r => r.startsWith('FABRIC_'));
  if (ev.strong_release_fit && yields) return { strength: 'STRONG', basis: { rule: 'S3', why: 'dominant release — ' + ev.release.join('') + ' with yielding cloth (' + ev.release_support.join(' + ') + ')' } };
  return { strength: 'WEAK', basis: { rule: 'S4', why: ev.release.length ? 'moderate release — ' + ev.release.join('') + (ev.release_support.length ? ' with ' + ev.release_support.join(' + ') : '') + (yields ? '' : ' — cloth does not yield') : 'governance-loss signal on a non-released fit (' + ev.release_support.join(' + ') + ')' } };
}

module.exports = { resolveStrength, STRENGTHS };
