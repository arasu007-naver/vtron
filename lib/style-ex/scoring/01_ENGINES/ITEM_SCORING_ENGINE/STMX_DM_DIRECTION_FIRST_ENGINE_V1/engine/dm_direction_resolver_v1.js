'use strict';
/**
 * STMX DM DIRECTION-FIRST ENGINE — WHOLE-GARMENT DIRECTION RESOLVER
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-10 (V1) · ★ RECONSTRUCTED 2026-09-10 (V2)
 *   Order:          STMX DM DIRECTION + STRENGTH + GT RE-ADJUDICATION CLOSURE V2 §9 / §15
 *   Reason:         V2 §9 required the Neutral rules to be re-derived from the FROZEN
 *                   CALIBRATION AUTHORITY alone, with no single-condition hidden threshold.
 *                   Re-running the V1 rules against SET A (the High-Tier calibration authority)
 *                   showed 5 of 16 mis-sided — mono3 and lacedr2 swallowed into NEUTRAL, mash2
 *                   and lacedr3 pushed onto the D side. The commanding test is rebuilt below
 *                   from what SET A actually says.
 *   Affected Scope: this module · dm_strength_resolver_v1.js · their tests.
 *
 * ═══ WHAT SET A ACTUALLY SAYS (order V2 §7 — rule derivation set) ════════════════════════════
 *   Every resolvable D-side case in SET A separates CLEARLY from the garment field:
 *     mono3 M/high/loc · grp1 L/high/loc · grp3 L/high/loc · dmdfloral2 L/high/whole ·
 *     shirtsprint2 L/high/whole · shirtsprint3 L/high/whole · logobr4 L/high/loc ·
 *     mash3 L/high/loc · mtdr2 L/high/whole · mtdr3 L/high/whole · mtdr4 L/high/whole ·
 *     lacedr2 M/high/loc · grp7 L/high/loc                     → contrast = high, size ≥ medium
 *   Both NEUTRAL cases separate only MODERATELY:
 *     mash2 L/medium/whole · lacedr3 L/medium/whole            → contrast = medium
 *
 *   ★ That is the whole rule. It is a conjunction of two Primitives, derived from 15 cases, and
 *     it replaces the V1 "large + at-least-medium" path that had no calibration support.
 *
 * ═══ PROHIBITIONS OBSERVED HERE (V2 §1 · §9 · §29 · §32) ═════════════════════════════════════
 *   ⛔ No tier is read, emitted or reverse-derived. Direction never sees a number.
 *   ⛔ No weight, coefficient, strength score, distance-from-centre number, primitive sum or
 *      numeric threshold. Primitives are compared by SET MEMBERSHIP over the frozen domains.
 *   ⛔ No single-condition hidden threshold ("medium → Neutral", "high/localized → Neutral",
 *      "two evidence → Neutral"). Every rule is a conjunction or a coexistence statement.
 *   ⛔ No REF branch, GT alias, case name, or descriptor/evidence_family branch.
 */

const A = require('./dm_admission_v1');
const { establishes, allows } = A;

const M = 'M', NEUTRAL = 'NEUTRAL', D = 'D', UNKNOWN = 'UNKNOWN';

/** frozen-domain value SETS. ⛔ Sets, not ranks; membership, not arithmetic. */
const IS_LARGE = ['large'];
const REAL_EXTENT = ['medium', 'large'];        // "more than a minor accent"
const MINOR_ACCENT = ['small'];
const SEPARATES_CLEARLY = ['high'];
const SEPARATES_MODERATELY = ['medium'];
const AT_LEAST_MODERATE = ['medium', 'high'];
const DOES_NOT_SEPARATE = ['low'];
const BEYOND_ONE_PLACE = ['distributed', 'whole_garment'];
const ONE_PLACE = ['localized'];

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * COMMANDS THE GARMENT'S VISUAL FIELD  →  D SIDE
 *
 *   a designed system COMMANDS when it separates CLEARLY from the garment field
 *   (contrast = high) AND is more than a minor accent (relative size ≥ medium).
 *
 * ⛔ Contrast alone never commands — every small high-contrast accent in the record sits at or
 *    below the centre (techybrid4 · techybrid3 · hybridred1 · techybrid6 · logotee4).
 * ⛔ Size alone never commands — every large low-contrast tonal field sits below the centre
 *    (logovint2 · shirtspk1 · logovint4 · techybrid7).
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
function commands(e) {
  /* ── PASS 1 · THE THREE FROZEN PRIMITIVES ALONE ────────────────────────────────────────────
   * ★ V3 §7 — the three Primitives are the FIRST pass and remain primary. When they settle the
   *   question, Direction resolution stops here and internal composition is never consulted. */
  if (establishes(e.size, REAL_EXTENT) && establishes(e.contrast, SEPARATES_CLEARLY))
    return { yes: true, no: false, via: 'three_primitives:separates_clearly_with_real_extent',
      internal_composition_consulted: false };

  const resolved = e.size.resolved && e.contrast.resolved && e.spatial.resolved;
  const cannot = !allows(e.size, REAL_EXTENT) || !allows(e.contrast, SEPARATES_CLEARLY);

  /* ── PASS 2 · BOUNDED SUPPORT, ONLY AT A LEGITIMATE THREE-PRIMITIVE BOUNDARY ───────────────
   * ⛔ Reached ONLY when moderateSeparation(e) holds. It is not a first-pass force and not a
   *    universal tie-breaker: every other unresolved shape falls through to PASS 3 untouched. */
  if (moderateSeparation(e)) {
    const r = internalRichness(e);
    if (r.resolved && r.rich)
      return { yes: true, no: false, via: 'bounded_support:moderate_separation_with_observed_internal_richness',
        internal_composition_consulted: true, support: r.why };
    if (r.resolved)
      return { yes: false, no: true, via: null, internal_composition_consulted: true, support: r.why };
    // ⛔ unresolved composition → fail closed. No default, no lean.
    return { yes: false, no: false, via: null, internal_composition_consulted: true, support: r.why };
  }

  /* ── PASS 3 · three Primitives again, for the definitely-does-not-command answer ────────────
   * ⛔ Internal composition is NOT consulted here. A clear M-side or clear D-side reading can
   *    never be moved by it — proved by MUT-IC1 and MUT-IC2. */
  return { yes: false, no: resolved && cannot, via: null, internal_composition_consulted: false };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * ★ MODERATE SEPARATION — resolved by the GOVERNED INTERNAL-COMPOSITION OBSERVATION
 *
 *   A system with real extent, deployed beyond one place, that separates only MODERATELY sits on
 *   a genuine boundary. The frozen record shows BOTH answers for the identical recorded tuple
 *   large / medium / whole_garment:
 *       mash2 · lacedr3   (SET A calibration authority)   → DM5, the centre
 *       mtdr1 · mtdr3     (CEO §14 direct image review)   → "clearly D-side / strong detail"
 *
 *   ★ Direct image review settles WHY, and it is not a Primitive:
 *       mash2  is a plain open-mesh tee — a UNIFORM texture, nothing composed inside it.
 *       mtdr3  is a rose-gold sequin dress whose contrast is genuinely moderate (sequin against
 *              matte ground in ONE colour family) but whose surface is a dense, varied GEOMETRIC
 *              composition. Its "medium" is textural, not a weak observation.
 *
 *   So at moderate separation the deciding fact is whether the system carries INTERNAL RICHNESS,
 *   and that fact is already a governed observation on the evidence.
 *
 * ⛔ THIS IS NOT M1. It reads the raw governed realization field, never the M1 predicate's
 *    verdict. This module does not require the predicate or the refinement module, and the
 *    regression asserts that by grepping the source. V2 §12's hierarchy is intact: the M1/M2
 *    MECHANISMS still cannot overturn a governed Direction — only Strength and the tier.
 * ⛔ Unresolved richness fails closed: no default, no guess.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
const RICH_CHROMATIC = 'multi_colour_compound';
const RICH_FILL = 'dense_varied';

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * ★ CEO SCOPE AMENDMENT — BOUNDED DIRECTION-SUPPORT (approved 2026-09-10, order V3 §4/§5)
 *
 *   "When the three frozen DM Primitives alone are insufficient to resolve a whole-garment
 *    M / Neutral / D boundary, an already-governed internal-composition observation may be used
 *    as bounded supporting evidence describing the organized or compound internal structure of
 *    the admitted Designed Detail Evidence."
 *
 *   This declaration is machine-readable ON PURPOSE. V3 §17 requires that no use of internal
 *   composition be hidden, and the regression asserts against this object rather than against
 *   prose. If a future edit widens the scope, the assertion breaks.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
const DIRECTION_SUPPORT_SCOPE = Object.freeze({
  approved: 'CEO 2026-09-10 · STMX DM DIRECTION PRODUCTION CLOSURE V3 §4',
  observations_consulted: Object.freeze(['internal_chromatic_composition', 'internal_fill_realization']),
  /** ★ the ONLY predicate under which the resolver may consult them */
  consulted_only_when: 'moderateSeparation(e) — the system has real extent, is deployed beyond one ' +
    'place, and separates only MODERATELY, so the three Primitives do not settle the boundary',
  '⛔_is_not': Object.freeze([
    '⛔ a fourth Primitive',
    '⛔ an independent scoring factor',
    '⛔ a numeric complexity score',
    '⛔ an automatic D-raising force',
    '⛔ a universal tie-breaker',
    '⛔ a substitute for Relative Size, Contrast or Spatial Position',
    '⛔ an M1 verdict consumed by Direction',
  ]),
  '★_primitive_count_contribution': 0,
  '★_frozen_primitive_count': 3,
});

function moderateSeparation(e) {
  return establishes(e.size, REAL_EXTENT) &&
         establishes(e.contrast, SEPARATES_MODERATELY) &&
         establishes(e.spatial, BEYOND_ONE_PLACE);
}

/** Read the governed internal-composition observation. ⛔ A bare string, a missing field, an
 *  unobserved state or a malformed envelope are all UNRESOLVED — never guessed. */
function internalRichness(e) {
  const m = e.raw && e.raw.m1_supporting_realization;
  if (!m || typeof m !== 'object') return { resolved: false, rich: false, why: 'realization absent' };
  const read = f => {
    const v = m[f];
    if (!v || typeof v !== 'object') return null;           // ⛔ bare string / missing → unresolved
    if (v.state !== 'OBSERVED') return null;
    return typeof v.value === 'string' && v.value ? v.value : null;
  };
  const c = read('internal_chromatic_composition'), f = read('internal_fill_realization');
  if (c === RICH_CHROMATIC || f === RICH_FILL) return { resolved: true, rich: true, why: 'internal richness observed' };
  if (c === null || f === null) return { resolved: false, rich: false, why: 'internal composition not observed' };
  return { resolved: true, rich: false, why: 'internal composition observed and not rich' };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * THE CENTRE (NEUTRAL) — coexistence patterns, ⛔ never a count
 *
 *   N1  a designed system IN ONE PLACE that is more than a minor accent, and does not command.
 *       support: logosw1 (medium/medium/localized) · pintuck2 (medium/low/localized)
 *       counter: every M-side localized system in the record is established SMALL.
 *
 *   N2  TWO OR MORE coexisting LARGE designed systems.
 *       support: hybridlong1 · techybrid5 · techybrid6 · hybridred1 · techybrid10, and the frozen
 *       calibration note for techybrid10 (Case 09): "서로 다른 surface/material appearance
 *       공존이 visual attention↑ → 기본 hybrid = DM5".
 *
 *   N3  a LARGE designed field coexisting with a CLEARLY SEPARATING accent.
 *       support: techybrid4 · techybrid3.
 *       counter: logovint4 pairs its large tonal field with a MEDIUM-contrast logo → stays DM4,
 *                so the partner must separate CLEARLY, not merely be present.
 *
 * ⛔ No rule grows stronger as evidence is added; low-strength companions never accumulate.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
function centerRules(evList) {
  const isLarge = e => establishes(e.size, IS_LARGE);
  const mayBeLarge = e => allows(e.size, IS_LARGE);
  const realExtent = e => establishes(e.size, REAL_EXTENT);
  const mayHaveRealExtent = e => allows(e.size, REAL_EXTENT);
  const inOnePlace = e => establishes(e.spatial, ONE_PLACE);
  const mayBeInOnePlace = e => allows(e.spatial, ONE_PLACE);
  const clear = e => establishes(e.contrast, SEPARATES_CLEARLY);
  const mayBeClear = e => allows(e.contrast, SEPARATES_CLEARLY);

  const fired = [];
  const n1 = evList.filter(e => inOnePlace(e) && realExtent(e));
  if (n1.length) fired.push({ rule: 'N1', why: 'a designed system in one place that is more than a minor accent', evidence_ids: n1.map(e => e.evidence_id) });

  const large = evList.filter(isLarge);
  if (large.length >= 2) fired.push({ rule: 'N2', why: 'two or more coexisting large designed systems', evidence_ids: large.map(e => e.evidence_id) });

  const n3 = large.some(L => evList.some(e => e !== L && clear(e)));
  if (n3) fired.push({ rule: 'N3', why: 'a large designed field coexisting with a clearly separating accent', evidence_ids: large.map(e => e.evidence_id) });

  /* N4  a designed system with real extent, deployed beyond one place, separating at least
   *     MODERATELY, that does not command.
   *     ★ Such a system is a real designed surface covering the garment — it is emphatically NOT
   *       incidental, so the garment cannot read below the centre. It sits AT the centre.
   *     support: mash2 · lacedr3 (SET A) — large/medium/whole_garment → DM5.
   *     ⛔ The contrast floor matters: every M-side large field in the record is LOW contrast
   *        (logovint2 · shirtspk1 · logovint4 · techybrid7), so a low-contrast tonal field still
   *        reads below the centre and N4 does not reach it. */
  const n4 = evList.filter(e => realExtent(e) &&
    establishes(e.spatial, BEYOND_ONE_PLACE) && establishes(e.contrast, ['medium', 'high']));
  if (n4.length) fired.push({ rule: 'N4', why: 'a designed system of real extent covering the garment that separates at least moderately, yet does not command', evidence_ids: n4.map(e => e.evidence_id) });

  const couldFireN1 = evList.some(e => mayBeInOnePlace(e) && mayHaveRealExtent(e));
  const couldFireN2 = evList.filter(mayBeLarge).length >= 2;
  const couldFireN3 = evList.some(mayBeLarge) && evList.some(e => mayBeClear(e)) &&
    evList.filter(e => mayBeLarge(e) || mayBeClear(e)).length >= 2;
  return { fired, undecidable: fired.length === 0 && (couldFireN1 || couldFireN2 || couldFireN3) };
}

/**
 * Resolve whole-garment Direction from a governed DM observation block.
 * ★ FAIL-CLOSED: when the observation does not ESTABLISH a side, the answer is UNKNOWN.
 *   ⛔ No default, no lean toward the centre, no tier back-inference.
 */
function resolveDirection(dmBlock) {
  const adm = A.admit(dmBlock);
  if (!adm.ok)
    return { direction: UNKNOWN, basis: { reason: adm.reason,
      note: '★ A missing or malformed DM observation block is NOT "no designed detail". The side is unknown.' } };

  if (adm.empty)
    return { direction: M, basis: { reason: 'NO_ADMITTED_DESIGNED_DETAIL', rules_fired: [],
      note: 'evidence[] = [] is a positive observation: the garment carries no admitted designed detail.' } };

  // ── D SIDE ────────────────────────────────────────────────────────────────────────────────
  const cmd = adm.evidence.map(e => ({ e, c: commands(e) }));
  const commanding = cmd.filter(x => x.c.yes);
  if (commanding.length)
    return { direction: D, basis: { reason: 'COMMANDING_SYSTEM_PRESENT',
      commanding: commanding.map(x => ({ evidence_id: x.e.evidence_id, via: x.c.via })),
      rules_fired: ['COMMANDS'] } };

  const undecided = cmd.filter(x => !x.c.yes && !x.c.no);
  if (undecided.length)
    return { direction: UNKNOWN, basis: { reason: 'COMMANDING_STATUS_UNDECIDABLE',
      undecided: undecided.map(x => ({ evidence_id: x.e.evidence_id,
        size: x.e.size.values, contrast: x.e.contrast.values, spatial: x.e.spatial.values })),
      note: '★ The record leaves the commanding test open on at least one system. Fail closed (order §27 / V2 §1).' } };

  // ── CENTRE vs M SIDE ──────────────────────────────────────────────────────────────────────
  // ★ A moderate-separation system that was OBSERVED to carry no internal richness has already
  //   been settled as non-commanding inside commands(); it falls through to the centre rules,
  //   which is how mash2 and lacedr3 reach the centre.
  const center = centerRules(adm.evidence);
  if (center.fired.length)
    return { direction: NEUTRAL, basis: { reason: 'AT_PERCEPTUAL_NEUTRAL_CENTRE',
      rules_fired: center.fired.map(f => f.rule), detail: center.fired } };
  if (center.undecidable)
    return { direction: UNKNOWN, basis: { reason: 'CENTRE_TEST_UNDECIDABLE',
      note: '★ No centre rule is established and at least one could still fire on the open readings. Fail closed.' } };

  return { direction: M, basis: { reason: 'DESIGNED_DETAIL_PRESENT_BUT_INCIDENTAL', rules_fired: [],
    note: 'No system commands the field and no centre rule fires: the admitted detail is incidental.' } };
}

module.exports = {
  resolveDirection, commands, centerRules, moderateSeparation, internalRichness,
  DIRECTION_SUPPORT_SCOPE,
  M, NEUTRAL, D, UNKNOWN,
  IS_LARGE, REAL_EXTENT, MINOR_ACCENT, SEPARATES_CLEARLY, SEPARATES_MODERATELY,
  AT_LEAST_MODERATE, DOES_NOT_SEPARATE, BEYOND_ONE_PLACE, ONE_PLACE,
};
