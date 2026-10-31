'use strict';
/**
 * STMX SR V2 — PRODUCT-LEVEL BINARY DIRECTION RESOLVER (mandatory S / R)
 *
 * Authority: the closure design (STMX_ITEM_V2_FOUR_AXIS_MANDATORY_DIRECTION_REASON_ARCHITECTURE_CLOSURE_V1, D7 / D14) under the
 * CEO mandate 2026-10-26 (every valid product → S or R). Semantics: STRUCTURED = observed evidence supports body governance or
 * structural form retention; RELAXED = observed evidence supports release, ease or loss of structural control (SR Constitution §0
 * Structure Preservation · §1 · AP-4 · 금지4; Fabric = Level 0, ADR-028 M3 — never decides alone).
 *
 * Every branch terminates in S or R. There is no NEUTRAL, UNKNOWN, NOT_SCORABLE or null. Missing carriers never become a value:
 * a branch that cannot be reached because a carrier is unobserved falls through to the next branch over the carriers that ARE
 * observed, and the branch records the unobserved decisive carriers as `limitations` (internal diagnostic, cited in the Reason as
 * "확인되지 않지만", never as a physical fact).
 *
 * Inputs: evidence classes only (tokens of the frozen admission). ⛔ No category default, no REF, no GT, no Strength, no tier.
 *
 *   P1a  governance observed (FIT_SLIM · SHOULDER_STRONG / EXTREME · WAIST_STRONG) ............................................ S
 *   P1b  one-piece: governance in one region AND another region released in Semi-Fluid / Fluid cloth ......................... R
 *   M2   released fit; cloth unobserved; nothing observed holding it (replaces the former U2) ................................. R
 *   P2a  released fit held by full structure, or a moderate release held by form retention (padding / quilting / leather) ..... S
 *   P2b  released fit not held ............................................................................................... R
 *   P3a  Regular fit + loss signal (Dropped · Widening / Flared) held by full structure in that region ......................... S
 *   P3b  one-piece: loss signal in one region, another region retains form (full structure, or support in Semi-/Structured cloth) S
 *   P3c  Regular fit + loss signal not held .................................................................................. R
 *   P4   Regular fit, no signal, positive structure support observed ......................................................... S
 *   P5r  (R3) Regular fit, no signal, no support, drape cloth observed AND soft sleeve volume or openwork observed in drape cloth . R
 *   P5   Regular fit, no signal, no support, drape cloth observed (CEO SR-Q1 · design policy S) ............................... S
 *   P5b  Regular fit, no signal, no support, cloth unobserved (replaces the former U3) ........................................ S
 *   Z1   fit and cloth unobserved, nothing admitted: the remaining observed SR carrier decides (non-dropped shoulder line /
 *        held silhouette); limitations recorded (CEO SR-Q4) ................................................................. S
 */
const FLUID = ['Semi-Fluid', 'Fluid'], HOLDING = ['Structured', 'Semi-Structured'];
const signals = (e) => e.release_support.filter((t) => !/^FABRIC_/.test(t));
const fabTok = (e) => 'FABRIC_' + e.fabric.toUpperCase().replace('-', '_');
function resolve(pe) {
  const R = pe.regions; const oneP = pe.region === 'ONE_PIECE'; const T = (e, list) => list.map((t) => ({ rg: e.rg, t }));
  const lim = (param, regions) => regions.map((e) => ({ param, rg: e.rg }));
  const base = { x0: R.some((e) => e.x0) };
  const out = (o) => Object.assign(base, { status: 'SCORED' }, o);
  const G = [].concat(...R.map((e) => T(e, e.governance))); const REL = R.filter((e) => e.release.length);
  if (G.length) { const softRel = REL.filter((e) => !e.governance.length && FLUID.includes(e.fabric));
    if (softRel.length) return out({ direction: 'RELAXED', rule: 'SR-V2-P1b', opposing: G, decisive: [].concat(...softRel.map((e) => T(e, e.release.concat([fabTok(e)])))), limitations: [] });
    return out({ direction: 'STRUCTURED', rule: 'SR-V2-P1a', decisive: G, opposing: [].concat(...R.map((e) => T(e, e.release.concat(signals(e))))), limitations: [] }); }
  if (REL.length) { const unheldUnobs = REL.filter((e) => !e.fabric_observed && !e.release_support.length && !e.preserves_under_release.length && !e.form_retention_support.length);
    if (unheldUnobs.length) return out({ direction: 'RELAXED', rule: 'SR-V2-M2', decisive: [].concat(...REL.map((e) => T(e, e.release))), opposing: [], limitations: lim('fabric_behavior', unheldUnobs) });
    const held = (e) => (e.preserves_under_release.length ? e.preserves_under_release : (!e.strong_release_fit && e.form_retention_support.length ? e.form_retention_support : null));
    if (REL.every(held)) return out({ direction: 'STRUCTURED', rule: 'SR-V2-P2a', decisive: [].concat(...REL.map((e) => T(e, held(e)))), opposing: [].concat(...REL.map((e) => T(e, e.release))), limitations: [] });
    const loose = REL.filter((e) => !held(e)); return out({ direction: 'RELAXED', rule: 'SR-V2-P2b', decisive: [].concat(...loose.map((e) => T(e, e.release.concat(e.fabric_observed && FLUID.includes(e.fabric) ? [fabTok(e)] : [])))), opposing: [], limitations: [] }); }
  const SIG = R.filter((e) => signals(e).length);
  if (SIG.length) { const own = SIG.every((e) => e.preserves_under_release.length);
    const other = oneP ? R.filter((e) => !signals(e).length && (e.preserves_under_release.length || (e.structure_support.length && HOLDING.includes(e.fabric)))) : [];
    if (own) return out({ direction: 'STRUCTURED', rule: 'SR-V2-P3a', decisive: [].concat(...SIG.map((e) => T(e, e.preserves_under_release))), opposing: [].concat(...SIG.map((e) => T(e, signals(e)))), limitations: [] });
    if (other.length) return out({ direction: 'STRUCTURED', rule: 'SR-V2-P3b', decisive: [].concat(...other.map((e) => T(e, e.preserves_under_release.length ? e.preserves_under_release : e.structure_support))), opposing: [].concat(...SIG.map((e) => T(e, signals(e)))), limitations: [] });
    return out({ direction: 'RELAXED', rule: 'SR-V2-P3c', decisive: [].concat(...SIG.map((e) => T(e, signals(e).concat(e.fabric_observed && FLUID.includes(e.fabric) ? [fabTok(e)] : [])))), opposing: [], limitations: [] }); }
  const fitAll = R.every((e) => e.fit_observed); const fitMissing = R.filter((e) => !e.fit_observed);
  const SUP = R.filter((e) => e.structure_support.length || e.preserves_under_release.length || e.form_retention_support.length);
  if (SUP.length) return out({ direction: 'STRUCTURED', rule: 'SR-V2-P4', decisive: [].concat(...R.map((e) => T(e, (e.fit_observed ? ['FIT_REGULAR'] : []).concat(e.structure_support, e.form_retention_support)))), opposing: [], limitations: lim('fit', fitMissing) });
  const heldLine = (e) => [e.rg === 'lower' || pe.region === 'BOTTOM' ? 'SILHOUETTE_HELD' : 'SHOULDER_LINE_HELD'];
  /* R3 · SR-V2-P5r — reached only where Regular fit is the sole S carrier (no governance, no structure support, no form retention, no
     released fit, no loss signal) and the cloth is drape: the garment's own release is corroborated by an existing Vision observation in a
     drape region — soft sleeve volume or openwork (sr_v2_evidence). Regular + drape cloth WITHOUT corroboration stays P5 (S; CEO anchors
     323 · 398). Neither corroboration decides alone and none overrides governance or structure support. (CEO R3 order 2026-10-27) */
  const CORR = R.filter((e) => e.fabric_observed && FLUID.includes(e.fabric) && (e.release_corroboration || []).length);
  if (fitAll && R.every((e) => e.fabric_observed) && CORR.length) return out({ direction: 'RELAXED', rule: 'SR-V2-P5r', decisive: [].concat(...CORR.map((e) => T(e, [fabTok(e)].concat(e.release_corroboration)))), opposing: [].concat(...R.map((e) => T(e, ['FIT_REGULAR'].concat(heldLine(e))))), limitations: [], ceo_decision: 'SR-R3-D1' });
  if (fitAll && R.every((e) => e.fabric_observed)) return out({ direction: 'STRUCTURED', rule: 'SR-V2-P5', decisive: [].concat(...R.map((e) => T(e, ['FIT_REGULAR'].concat(heldLine(e))))), opposing: [].concat(...R.map((e) => T(e, e.release_support))), limitations: [], ceo_decision: 'SR-Q1' });
  if (fitAll) return out({ direction: 'STRUCTURED', rule: 'SR-V2-P5b', decisive: [].concat(...R.map((e) => T(e, ['FIT_REGULAR'].concat(heldLine(e))))), opposing: [].concat(...R.map((e) => T(e, e.release_support))), limitations: lim('fabric_behavior', R.filter((e) => !e.fabric_observed)), ceo_decision: 'SR-Q1' });
  /* Z1 (partial evidence, R2 scope): fit is unobserved in at least one region and nothing was admitted; decide from the S-side carriers that ARE
     observed — a non-dropped shoulder line (upper region), a maintained silhouette (lower / bottom region) or a Regular fit observed in another
     region of the same product. Limitations name only the carriers actually unobserved. */
  const isLowerish = (e) => e.rg === 'lower' || pe.region === 'BOTTOM';
  const heldObserved = R.filter((e) => (isLowerish(e) ? ['Straight', 'Tapered', 'Narrowing'].includes(e.silhouette) : e.shoulder_drop === 'None'));
  const regularObserved = R.filter((e) => e.fit_observed && e.fit === 'Regular');
  if (heldObserved.length || regularObserved.length) return out({ direction: 'STRUCTURED', rule: 'SR-V2-Z1', decisive: [].concat(...regularObserved.map((e) => T(e, ['FIT_REGULAR'])), ...heldObserved.map((e) => T(e, heldLine(e)))), opposing: [].concat(...R.map((e) => T(e, e.release_support))), limitations: lim('fit', fitMissing).concat(lim('fabric_behavior', R.filter((e) => !e.fabric_observed))), ceo_decision: 'SR-Q4' });
  /* Z0 — ZERO DIRECTIONAL SR EVIDENCE (order R2 §6). Reached ONLY when no region carries any directional SR observation: no fit, no governance,
     no release, no loss signal, no structure / form-retention support, no held line. (Non-directional observations may exist: drape cloth — Level 0,
     never decides alone — shoulder_structure None, waist Undefined.) Neither S nor R is physically established. The S output is an EXPLICIT,
     PROVISIONAL OPERATIONAL POLICY pending CEO SR-D2 — not a physical judgment; the customer Reason is limitation-only and is counted separately. */
  const unobserved = (e) => [].concat(e.fit_observed ? [] : [{ param: 'fit', rg: e.rg }], { param: isLowerish(e) ? 'silhouette' : 'shoulder_drop', rg: e.rg }, e.fabric_observed ? [] : [{ param: 'fabric_behavior', rg: e.rg }]);
  return out({ direction: 'STRUCTURED', rule: 'SR-V2-Z0', zero_evidence: true, provisional_policy: true, physically_grounded: false, decisive: [], opposing: [].concat(...R.map((e) => T(e, e.release_support))), limitations: [].concat(...R.map(unobserved)), ceo_decision: 'SR-D2' });
}
const RULES = ['SR-V2-P1a', 'SR-V2-P1b', 'SR-V2-M2', 'SR-V2-P2a', 'SR-V2-P2b', 'SR-V2-P3a', 'SR-V2-P3b', 'SR-V2-P3c', 'SR-V2-P4', 'SR-V2-P5r', 'SR-V2-P5', 'SR-V2-P5b', 'SR-V2-Z1', 'SR-V2-Z0'];
module.exports = { resolve, RULES, FLUID, HOLDING, signals };
