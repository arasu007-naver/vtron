'use strict';
/**
 * STMX DM DIRECTION-FIRST ENGINE — SECONDARY ORDINAL PROJECTOR V1
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-10
 *   Order:          STMX DM DIRECTION-FIRST CLOSURE + ENGINE IMPLEMENTATION V1 §8 / §10 / §26 / §27
 *   Reason:         The DM1–DM9 scale is retained, but a tier is a SECONDARY ORDINAL
 *                   REPRESENTATION of an already-governed Direction + Strength. It is projected
 *                   last, never first, and never back-derived into a side.
 *   Affected Scope: STMX_DM_DIRECTION_FIRST_ENGINE_V1/engine only.
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-12
 *   Order:          STMX DM STRENGTH + FINAL SCORE IMPLEMENTATION AND CLOSURE V1 §7 / §11 / §12 / §13 / §14 / §15 / §28
 *   Reason:         D-3 = A and D-5 = A. The final DM1–DM9 map is implemented as approved, and the
 *                   M1 double-count is removed: the earlier projector escalated STRONG + M1 to DM8
 *                   without asking WHICH pathway established STRONG, so a localized commanding
 *                   graphic whose only route to STRONG was M1 (S3) received M1 twice — once to reach
 *                   STRONG, once more to reach DM8 — against the ratified physics "base tier +1".
 *                   The projector now CONSUMES the governed Strength result (its `route`) and never
 *                   re-derives S1/S2/S3. Signature changed from project(direction, strength, ref) to
 *                   project(direction, strengthResult, ref, admission) — §14 permits it.
 *   Affected Scope: this module · dm_engine_v1.js (call site) · tests.
 *
 * ═══ HARD INVARIANT (order §8) — enforced structurally, not by convention ════════════════════
 *      Direction = M        → a tier, if any, is 1–4
 *      Direction = NEUTRAL  → tier = 5
 *      Direction = D        → a tier, if any, is 6–9
 *   ⛔ A refinement result may never pull a tier out of its side's band. Direction authority
 *      wins, and `assertBand()` below throws rather than emit a violating tier.
 *
 * ═══ THE CURRENT FINAL SCORE MAP (CEO 2026-09-12 · order §28) ═══════════════════════════════
 *      DM1  conceptual minimum · no CEO anchor · ⛔ NEVER EMITTED
 *      DM2  M STRONG with evidence[] = []
 *      DM3  M STRONG with admitted evidence, every system small + low
 *      DM4  M WEAK
 *      DM5  NEUTRAL
 *      DM6  D WEAK
 *      DM7  D STRONG base — S1 or S2 without M1, OR S3 (M1 alone established STRONG)
 *      DM8  D STRONG established INDEPENDENTLY by S1 and/or S2, PLUS frozen M1 triggered
 *      DM9  conceptual maximum · no CEO anchor · ⛔ NEVER EMITTED
 *   ★ M1 fires EXACTLY ONCE across Strength and projection: it may carry a garment from D WEAK to
 *     D STRONG (S3 → DM7) or from the strong base to DM8 (S1/S2 + M1) — never both.
 *
 * ═══ WHY SOME TIERS ARE NULL (order §26 / §27 · 2026-09-12 §15) ═════════════════════════════
 *   Where Direction is clear but the exact tier is not, the tier is NOT manufactured. It is
 *   null with tier_status = WITHIN_SIDE_UNRESOLVED, and the Direction + Strength above it stand
 *   untouched. ⛔ No tier is ever invented to look complete.
 */

const DIR = require('./dm_direction_resolver_v1');
const STR = require('./dm_strength_resolver_v1');

const RESOLVED = 'RESOLVED';
const WITHIN_SIDE_UNRESOLVED = 'WITHIN_SIDE_UNRESOLVED';
const STRENGTH_UNRESOLVED = 'STRENGTH_UNRESOLVED';
const DIRECTION_UNRESOLVED = 'DIRECTION_UNRESOLVED';

/** The frozen band each governed side owns. ⛔ Bands are the frozen 1–9 semantics (order §4),
 *  not a new scale, and the projector may never emit outside its own band. */
const BAND = { M: [1, 2, 3, 4], NEUTRAL: [5], D: [6, 7, 8, 9] };

/** ⛔ The two conceptual endpoints. They exist in the frozen scale and have NO CEO anchor; the
 *  projector refuses to emit them (order §7 / §12 / §28). */
const NEVER_EMITTED = Object.freeze([1, 9]);

function assertBand(direction, tier) {
  if (tier === null) return tier;
  const band = BAND[direction];
  if (!band || !band.includes(tier))
    throw new Error('DM_DIRECTION_BAND_VIOLATION: direction=' + direction + ' tier=' + tier +
      ' — ⛔ a secondary tier may never leave the band its Direction already fixed (order §8).');
  if (NEVER_EMITTED.includes(tier))
    throw new Error('DM_CONCEPTUAL_ENDPOINT_EMITTED: tier=' + tier +
      ' — ⛔ DM1 and DM9 are conceptual endpoints with no CEO anchor and are never emitted (order §28).');
  return tier;
}

/** Read the governed Strength result in either shape: the full result object from the resolver
 *  (preferred — carries the route) or a bare strength string (legacy callers; no route). */
function readStrength(strengthResult) {
  if (strengthResult && typeof strengthResult === 'object')
    return { strength: strengthResult.strength, route: (strengthResult.basis && strengthResult.basis.route) || [],
      independently_established: !!(strengthResult.basis && strengthResult.basis.independently_established) };
  return { strength: strengthResult, route: [], independently_established: false };
}

/**
 * Project a secondary ordinal tier.
 * @param {string} direction        M | NEUTRAL | D | UNKNOWN
 * @param {object|string} strengthResult  the governed Strength result {strength, basis} (or a bare string)
 * @param {object} ref              governed M1/M2 refinement — the ONLY source of M1 state used here
 * @param {object} [admission]      admission result — read only for `empty` (DM2 vs DM3)
 */
function project(direction, strengthResult, ref, admission) {
  const s = readStrength(strengthResult);

  if (direction === DIR.UNKNOWN)
    return { ordinal_tier: null, tier_status: DIRECTION_UNRESOLVED, route: [],
      why: '⛔ Direction is unresolved. Nothing below it is projected.' };

  if (direction === DIR.NEUTRAL)
    return { ordinal_tier: assertBand(direction, 5), tier_status: RESOLVED, route: ['NEUTRAL'],
      why: 'DM5 is the perceptual neutral centre itself — the band holds exactly one tier.' };

  if (s.strength === STR.UNKNOWN)
    return { ordinal_tier: null, tier_status: STRENGTH_UNRESOLVED, route: [],
      why: '★ The side stands, but within-side strength was not established, so no tier is manufactured (order §27).' };

  if (direction === DIR.M) {
    if (s.strength === STR.STRONG) {
      /* ★ DM2 vs DM3 turns on an admission fact that already exists: is anything admitted at all?
       *  ⛔ Not a third Strength level. */
      const empty = !!(admission && admission.empty);
      return { ordinal_tier: assertBand(direction, empty ? 2 : 3), tier_status: RESOLVED,
        route: [empty ? 'M_STRONG_NOTHING_ADMITTED' : 'M_STRONG_UNREGISTERED_ACCENT'],
        why: empty
          ? 'M STRONG with evidence[] = [] — nothing designed is admitted. DM1 remains a conceptual endpoint with no representative and is never emitted.'
          : 'M STRONG with admitted evidence — every admitted system is small and low. The unregistered-accent cell above the plain garment.' };
    }
    return { ordinal_tier: assertBand(direction, 4), tier_status: RESOLVED, route: ['M_WEAK'],
      why: 'M WEAK = the DM4 zone — designed detail registers on the Minimal side without commanding or reaching the centre (CEO 2026-09-12).' };
  }

  // ── D SIDE ────────────────────────────────────────────────────────────────────────────────
  if (s.strength === STR.WEAK)
    return { ordinal_tier: assertBand(direction, 6), tier_status: RESOLVED, route: ['D_WEAK'],
      why: 'D WEAK = the DM6 zone, the band cell adjacent to the centre on the Detailed side.' };

  /* D STRONG. The projector reads WHICH pathway established it — it does not recompute S1/S2/S3.
   *   independently_established (S1 and/or S2)  + M1 triggered   → DM8
   *   independently_established                  + M1 unresolved  → tier null (WITHIN_SIDE_UNRESOLVED)
   *   independently_established                  + M1 not fired   → DM7
   *   S3_M1 only (M1 is what made it STRONG)                      → DM7   ★ M1 already spent */
  if (s.independently_established) {
    if (ref.m1_any_unresolved_on_substantial)
      return { ordinal_tier: null, tier_status: WITHIN_SIDE_UNRESOLVED, route: s.route,
        why: '★ D STRONG is independently established, but the frozen M1 support that separates DM7 from DM8 was not observed. Direction and Strength stand; the exact tier is not invented (order §15).' };
    if (ref.m1_any_triggered)
      return { ordinal_tier: assertBand(direction, 8), tier_status: RESOLVED, route: s.route.concat(['M1_ESCALATION']),
        why: 'D STRONG established independently by ' + s.route.filter(r => r !== 'S3_M1').join('+') + ', plus frozen M1 fired on the carrying system — the ratified one-step escalation above the strong base.' };
    return { ordinal_tier: assertBand(direction, 7), tier_status: RESOLVED, route: s.route,
      why: 'D STRONG established by ' + s.route.join('+') + ' with frozen M1 not fired — the strong base tier. DM9 remains a conceptual endpoint with no CEO anchor and is never emitted.' };
  }
  if (s.route.includes('S3_M1'))
    return { ordinal_tier: assertBand(direction, 7), tier_status: RESOLVED, route: s.route,
      why: '★ D STRONG established by frozen M1 alone (S3). M1 is the one escalation that carried the garment from the DM6 base to DM7 and is NOT applied again (CEO 2026-09-12, D-3).' };

  /* a STRONG result with no route — a legacy caller passed a bare string. Fail closed. */
  return { ordinal_tier: null, tier_status: WITHIN_SIDE_UNRESOLVED, route: [],
    why: '⛔ D STRONG was reported without a governed route, so the projector cannot know whether M1 was already spent. No tier is invented.' };
}

module.exports = { project, assertBand, readStrength, BAND, NEVER_EMITTED, RESOLVED, WITHIN_SIDE_UNRESOLVED, STRENGTH_UNRESOLVED, DIRECTION_UNRESOLVED };
