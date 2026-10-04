'use strict';
/**
 * STMX SR — TERNARY STRENGTH RESOLVER · V1.3 CANDIDATE (sidecar semantic layer · ⛔ NOT PRODUCTION · ⛔ NOT FROZEN)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-15 — binary WEAK / STRONG Strength is insufficient; Structured and Relaxed Strength are each
 *                   WEAK / REGULAR / STRONG (CEO Strength Review V2 adjudications, listed in
 *                   04_GOVERNANCE_AND_FINAL_DOCS/STMX_SR_STRENGTH_TERNARY_RESOLVER_V1_3_CANDIDATE/01_…_CEO_AUTHORITY_V3.md)
 *   Reason:         Strength must describe HOW EMPHATICALLY the already-resolved Direction governs or releases the body,
 *                   as a whole-garment magnitude — not a two-way cut on token grade or cloth.
 *   Affected Scope: this module + sr_engine_v1_3_sidecar.js only. ⛔ SR V1.2 (Direction · R3d · binary Strength · ordinal
 *                   projector) is not modified. ⛔ No ordinal mapping. ⛔ No Producer field. ⛔ No Fit state.
 *
 * Consumes ONLY the V1.2 admitted-evidence object (governed classes and governed carrier values) and the V1.2 Direction.
 * ⛔ Imports nothing. ⛔ Never reads a tier, GT, REF, filename, prose, Descriptor, material token or surface token.
 * ⛔ Terminology: STRENGTH REGULAR is a magnitude of the resolved Direction — it is not Fit = Regular.
 *
 * STRUCTURED — whole-garment governance magnitude
 *   rigid          fabric_behavior = Structured                      (the cloth carries the garment's own architecture)
 *   shoulder hold  shoulder_structure ∈ {Mild, Strong, Extreme}      (construction holds the shoulder zone)
 *   waist hold     waist ∈ {Mild, Strong}   (waist_definition Defined / Cinched → ADR-123 mapping)
 *   governance     count of Strong-grade controls: fit Slim · shoulder Strong / Extreme · waist Strong
 *
 *   ST-3  STRONG    rigid AND fit Slim AND shoulder hold AND waist hold
 *                   — every governance zone engaged in cloth that holds its own form: emphatic (CEO anchor REF_000182)
 *   ST-2  REGULAR   built garment architecture: rigid AND (shoulder hold OR waist hold)        (CEO anchor REF_000172 — Regular fit, built coat)
 *                   OR multiple Strong-grade governance controls (governance ≥ 2) in non-rigid cloth   (CEO anchor REF_000811 — full triple, soft cloth)
 *   ST-1  WEAK      otherwise — Slim / body-following fit alone, form retention, ordinary fitted construction
 *                   (CEO anchors REF_000667 · 000671 · 000775 · 000508 · 000141 · 000190 · 000335 · 000410 …)
 *   ⛔ prohibited forms (CEO §4): Slim → REGULAR/STRONG · Slim one-piece → STRONG · Strong shoulder + Cinched + Slim → automatically STRONG ·
 *      token counting as such. governance ≥ 2 is a REGULAR floor (several Strong-grade controls are clearly more than modest), never STRONG.
 *
 * RELAXED — whole-garment release magnitude
 *   strong release fit   fit ∈ {Oversized, Voluminous}
 *   reinforcing signals  yielding cloth (Semi-Fluid / Fluid) · expanding lower geometry (Widening / Flared) · Voluminous grade
 *                        ⛔ a dropped shoulder is NOT a magnitude signal: on an oversized cut it is the same release fact
 *                           (CEO Weak anchors REF_000221 · 000011 · 000009 all carry Oversized + Dropped)
 *   RL-3  STRONG    strong release fit AND ≥ 2 reinforcing signals            (release on the cut, the cloth and a further zone)
 *   RL-2  REGULAR   strong release fit AND exactly 1 reinforcing signal
 *   RL-1  WEAK      otherwise — Relaxed (moderate) fit · Oversized with no reinforcing signal · governance-loss signal on a Regular fit
 *   ⛔ prohibited forms (CEO §5): Oversized → REGULAR/STRONG · holding cloth → cannot be STRONG (cloth is one signal, never a gate)
 *
 * NEUTRAL → N/A · UNKNOWN → UNKNOWN. No score is produced here (order §9).
 */
const STRENGTHS_V1_3 = ['WEAK', 'REGULAR', 'STRONG', 'N/A', 'UNKNOWN'];
const RESOLVER_ID = 'STMX_SR_STRENGTH_RESOLVER_V1_3_CANDIDATE';
const SHOULDER_HOLD = ['Mild', 'Strong', 'Extreme'];
const WAIST_HOLD = ['Mild', 'Strong'];
const YIELDING = ['Semi-Fluid', 'Fluid'];
const EXPANDING = ['Widening', 'Flared'];

function resolveStructured(ev) {
  const rigid = ev.fabric === 'Structured';
  const shoulderHold = SHOULDER_HOLD.includes(ev.shoulder);
  const waistHold = WAIST_HOLD.includes(ev.waist_sr);
  const governance = (ev.fit === 'Slim' ? 1 : 0) + (ev.shoulder === 'Strong' || ev.shoulder === 'Extreme' ? 1 : 0) + (ev.waist_sr === 'Strong' ? 1 : 0);
  const facts = { rigid, shoulder_hold: shoulderHold, waist_hold: waistHold, governance_controls: governance };
  if (rigid && ev.fit === 'Slim' && shoulderHold && waistHold) return { strength: 'STRONG', basis: { rule: 'ST-3', why: 'rigid cloth with every governance zone engaged (Slim · shoulder ' + ev.shoulder + ' · waist ' + ev.waist_sr + ') — emphatic whole-garment governance', facts } };
  if (rigid && (shoulderHold || waistHold)) return { strength: 'REGULAR', basis: { rule: 'ST-2', why: 'built garment architecture — rigid cloth with construction hold (' + [shoulderHold ? 'shoulder ' + ev.shoulder : null, waistHold ? 'waist ' + ev.waist_sr : null].filter(Boolean).join(' · ') + ')', facts } };
  if (governance >= 2) return { strength: 'REGULAR', basis: { rule: 'ST-2', why: 'multiple Strong-grade governance controls (' + governance + ') without rigid cloth — clearly more than modest, not emphatic', facts } };
  return { strength: 'WEAK', basis: { rule: 'ST-1', why: 'Structured by ' + (ev.fit === 'Slim' ? 'body-following fit' : ev.form_retention_support && ev.form_retention_support.length ? 'form retention' : 'ordinary fitted construction') + ' alone — governance limited / modest', facts } };
}

function resolveRelaxed(ev) {
  const strongReleaseFit = ev.fit === 'Oversized' || ev.fit === 'Voluminous';
  const signals = [];
  if (YIELDING.includes(ev.fabric)) signals.push('YIELDING_CLOTH_' + ev.fabric.toUpperCase().replace('-', '_'));
  if (EXPANDING.includes(ev.silhouette)) signals.push('EXPANDING_GEOMETRY_' + ev.silhouette.toUpperCase());
  if (ev.fit === 'Voluminous') signals.push('VOLUMINOUS_GRADE');
  const facts = { strong_release_fit: strongReleaseFit, reinforcing_signals: signals, dropped_shoulder_not_counted: ev.shoulder_drop === 'Dropped' };
  if (strongReleaseFit && signals.length >= 2) return { strength: 'STRONG', basis: { rule: 'RL-3', why: 'strong release fit (' + ev.fit + ') reinforced on ' + signals.length + ' further fronts (' + signals.join(' + ') + ') — emphatic whole-garment release', facts } };
  if (strongReleaseFit && signals.length === 1) return { strength: 'REGULAR', basis: { rule: 'RL-2', why: 'strong release fit (' + ev.fit + ') reinforced once (' + signals[0] + ') — clearly more than modest, not emphatic', facts } };
  return { strength: 'WEAK', basis: { rule: 'RL-1', why: strongReleaseFit ? 'strong release fit (' + ev.fit + ') with no reinforcing signal — the cut alone releases the body' : ev.fit === 'Relaxed' ? 'moderate release (Relaxed fit)' : 'governance-loss signal on a non-released fit', facts } };
}

/**
 * @param {object} ev         V1.2 admitted-evidence object for ONE half (sr_evidence_admission_v1.admit output)
 * @param {string} direction  V1.2 resolved Direction for that half
 */
function resolveStrengthV13(ev, direction) {
  if (direction === 'UNKNOWN') return { strength: 'UNKNOWN', basis: { rule: 'ST-0', why: 'Direction unresolved' } };
  if (direction === 'NEUTRAL') return { strength: 'N/A', basis: { rule: 'ST-0', why: 'Neutral has no within-side magnitude' } };
  if (!ev) return { strength: 'UNKNOWN', basis: { rule: 'ST-0', why: 'no admitted evidence' } };
  return direction === 'STRUCTURED' ? resolveStructured(ev) : resolveRelaxed(ev);
}

/**
 * One-piece composition (Dress / Jumpsuit) — semantic, no tiers (CEO 2026-09-14 §7: bodice / waist first; lower-half flow reduces
 * Strength, never Direction):
 *   STRUCTURED  strength = upper-half strength, reduced one step when the lower half is RELAXED (flow)
 *   RELAXED     strength = the weaker of the two halves (release must be whole-garment to be emphatic)
 */
const ORDER3 = ['WEAK', 'REGULAR', 'STRONG'];
function composeStrengthV13(direction, upper, lower) {
  if (direction === 'UNKNOWN') return { strength: 'UNKNOWN', basis: { rule: 'CS-0', why: 'Direction unresolved' } };
  if (direction === 'NEUTRAL') return { strength: 'N/A', basis: { rule: 'CS-0', why: 'Neutral has no within-side magnitude' } };
  if (direction === 'STRUCTURED') {
    const u = upper.direction === 'STRUCTURED' ? upper.strength : lower.strength;
    if (!ORDER3.includes(u)) return { strength: 'UNKNOWN', basis: { rule: 'CS-1', why: 'governing half unresolved' } };
    if (lower.direction === 'RELAXED' && ORDER3.indexOf(u) > 0) return { strength: ORDER3[ORDER3.indexOf(u) - 1], basis: { rule: 'CS-1', why: 'upper-half governance ' + u + ' reduced one step by lower-half release' } };
    return { strength: u, basis: { rule: 'CS-1', why: 'upper-half governance carries the garment' } };
  }
  const a = ORDER3.indexOf(upper.strength), b = ORDER3.indexOf(lower.strength);
  if (a < 0 || b < 0) { const one = a >= 0 ? upper.strength : lower.strength; return { strength: one || 'UNKNOWN', basis: { rule: 'CS-2', why: 'one half carries the release reading' } }; }
  return { strength: ORDER3[Math.min(a, b)], basis: { rule: 'CS-2', why: 'whole-garment release = the weaker half (' + upper.strength + ' · ' + lower.strength + ')' } };
}

module.exports = { resolveStrengthV13, composeStrengthV13, resolveStructured, resolveRelaxed, STRENGTHS_V1_3, RESOLVER_ID, SHOULDER_HOLD, WAIST_HOLD, YIELDING, EXPANDING };
