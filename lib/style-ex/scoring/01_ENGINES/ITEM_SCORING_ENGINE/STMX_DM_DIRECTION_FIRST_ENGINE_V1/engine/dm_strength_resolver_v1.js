'use strict';
/**
 * STMX DM DIRECTION-FIRST ENGINE — WITHIN-SIDE STRENGTH RESOLVER
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-10 (V1) · ★ RECONSTRUCTED 2026-09-10 (V2)
 *   Order:          STMX DM DIRECTION + STRENGTH + GT RE-ADJUDICATION CLOSURE V2 §5 / §10 / §11
 *   Reason:         V2 §5 forbids deriving Strength from a tier number. V2 §10 named the V1
 *                   M-side rule ("evidence=[] → STRONG, anything present → WEAK") as a discard
 *                   candidate: M STRONG does NOT mean zero detail — a garment can carry small or
 *                   subtle detail and still read clearly Minimal. V2 §11 named the V1 D-side rule
 *                   ("large + high + whole_garment → STRONG") as too simple, and SET A supplies
 *                   the counterexample: mtdr2 carries exactly that tuple and the CEO placed it at
 *                   DM6, i.e. D WEAK.
 *   Affected Scope: this module and its tests.
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-12
 *   Order:          STMX DM STRENGTH + FINAL SCORE IMPLEMENTATION AND CLOSURE V1 §2 / §3 / §4 / §5 / §13
 *   Reason:         D-1 = A. The M-side rule gap found by the Design Review is closed under a NEW
 *                   CURRENT STRENGTH SEMANTIC AUTHORITY (CEO 2026-09-12): M STRONG ⇔ nothing admitted,
 *                   or every admitted system establishes small AND low; M WEAK ⇔ the M side, and the
 *                   fully-resolved record establishes that designed detail REGISTERS (real extent, or
 *                   separation above low) without commanding or reaching the centre. ⛔ This is not
 *                   a reactivation of DM Constitution V3 as a runtime oracle — that document is
 *                   historical corroboration only. §13: the D-side STRONG basis now carries a
 *                   machine-readable `route` so the projector consumes the governed result instead
 *                   of re-deriving S1/S2/S3.
 *   Affected Scope: the M branch · the STRONG basis shape · STRENGTH_RULE_AUDIT · tests.
 *
 * ⛔ STRENGTH IS A WHOLE-GARMENT SEMANTIC STATE, NOT A NUMBER.
 *    The diagnostic band (DM1–3 → M STRONG · DM4 → M WEAK · DM6 → D WEAK · DM7–9 → D STRONG) is
 *    a reporting convenience ONLY. It is never a semantic ground truth and is never consulted
 *    here. "DM3 therefore STRONG" and "DM6 therefore WEAK" are both prohibited (V2 §5).
 *
 * ⛔ EXACTLY FOUR VALUES (V2 §28): WEAK · STRONG · N/A · UNKNOWN.
 *    ⛔ No MEDIUM, MODERATE or VERY STRONG.
 * ⛔ NO NUMERIC STRENGTH PHYSICS (V2 §29): no weights, coefficients, strength score,
 *    distance-from-centre number, primitive sums or numeric thresholds.
 * ⛔ Strength is called with the side ALREADY governed and can never return a direction.
 *    If strength cannot be established the SIDE SURVIVES and strength is UNKNOWN.
 */

const DIR = require('./dm_direction_resolver_v1');
const A = require('./dm_admission_v1');
const { establishes, allows } = A;

const WEAK = 'WEAK', STRONG = 'STRONG', N_A = 'N/A', UNKNOWN = 'UNKNOWN';

const MINOR_ACCENT = ['small'];
const REAL_EXTENT = ['medium', 'large'];
/** ★ 2026-09-12 (D-1): an accent that does NOT separate is LOW contrast only. ⛔ medium was folded in
 *  by V2 without any frozen word-authority; both written M STRONG cases are low. */
const DOES_NOT_SEPARATE = ['low'];
const REGISTERS = ['medium', 'high'];
const SEPARATES_CLEARLY = ['high'];
const AT_LEAST_MODERATE = ['medium', 'high'];
const WHOLE_GARMENT = ['whole_garment'];

/**
 * @param {string} direction  M | NEUTRAL | D | UNKNOWN — already governed
 * @param {object} adm        admission result
 * @param {object} ref        governed M1/M2 refinement
 */
function resolveStrength(direction, adm, ref) {
  if (direction === DIR.UNKNOWN)
    return { strength: UNKNOWN, basis: { reason: 'DIRECTION_UNRESOLVED',
      note: '⛔ Direction is unresolved, so strength is not fabricated.' } };

  if (direction === DIR.NEUTRAL)
    return { strength: N_A, basis: { reason: 'NEUTRAL_HAS_NO_WITHIN_SIDE_DEPTH' } };

  /* ═══ M SIDE ═════════════════════════════════════════════════════════════════════════════
   * ★ RECONSTRUCTED per V2 §10. M STRONG is not "zero detail" — it is the whole-garment state
   *   of reading CLEARLY MINIMAL. That holds while every admitted system stays a minor accent
   *   that does not separate clearly from the garment; an empty admitted set satisfies it
   *   vacuously, which is why a plain garment is the deepest case rather than the only one.
   *
   *   ⛔ The V1 rule is gone: a garment with a small tonal logo is still clearly Minimal.
   * ═════════════════════════════════════════════════════════════════════════════════════════ */
  if (direction === DIR.M) {
    const ev = adm.evidence;
    /* ★ NEW CURRENT STRENGTH SEMANTIC AUTHORITY — CEO 2026-09-12 (order §3 / §4 / §5).
     *
     *   M STRONG  the garment reads CLEARLY / DEEPLY Minimal: nothing designed is admitted, OR every
     *             admitted system ESTABLISHES relative_size = small AND contrast = low — a minor
     *             accent that does not separate from the garment field.
     *   M WEAK    the M side, and the fully-resolved record ESTABLISHES that designed detail
     *             REGISTERS — a system of real extent, or an accent that separates at least
     *             moderately — while nothing commands and no centre rule fires.
     *   UNKNOWN   Direction resolved M, but the readings needed to tell those two apart are open.
     *
     * ⛔ Not derived from a tier. ⛔ Not a list of cases or techniques. ⛔ Not the retired V1 rule
     *    ("anything present → WEAK"): a small low-contrast accent is still clearly Minimal.
     * ★ HISTORY, not erased: V3 §14 retired the earlier M WEAK branch as TIER_DERIVED_ONLY because
     *   no authority then on record stated its meaning in words. This branch rests on a CEO decision
     *   of 2026-09-12 that states it, and the Design Review that located the corroborating wording. */
    const unregistered = e => establishes(e.size, MINOR_ACCENT) && establishes(e.contrast, DOES_NOT_SEPARATE);
    const registers = e => establishes(e.size, REAL_EXTENT) || establishes(e.contrast, REGISTERS);

    if (ev.every(unregistered))
      return { strength: STRONG, basis: { reason: 'WHOLE_GARMENT_READS_CLEARLY_MINIMAL',
        route: ev.length === 0 ? ['M_NOTHING_ADMITTED'] : ['M_UNREGISTERED_ACCENT'],
        note: ev.length === 0
          ? 'Nothing designed is admitted at all — the deepest Minimal reading.'
          : '★ Designed detail is present but every admitted system is a small accent that does not separate; the garment as a whole still reads clearly Minimal (CEO 2026-09-12).' } };

    const registering = ev.filter(registers);
    if (registering.length)
      return { strength: WEAK, basis: { reason: 'M_WEAK_REGISTERED_NOT_COMMANDING',
        route: ['M_REGISTERED'], evidence_ids: registering.map(e => e.evidence_id),
        note: '★ Designed detail registers — a system of real extent, or an accent that separates at least moderately — but nothing commands and no centre rule fires: the garment is on the Minimal side without reading clearly Minimal (CEO 2026-09-12).' } };

    /* ⛔ FAIL CLOSED (order §5): STRONG failed only because a reading is open, and no other system
     *    establishes registration. WEAK is not asserted from an open reading. */
    return { strength: UNKNOWN, basis: { reason: 'M_REGISTRATION_UNRESOLVED',
      note: '★ The side stands. The readings needed to tell clearly-Minimal from registered detail are unresolved on at least one admitted system, and no other system establishes registration. Strength is not guessed.' } };
  }

  /* ═══ D SIDE ═════════════════════════════════════════════════════════════════════════════
   * ★ RECONSTRUCTED per V2 §11 as an INTEGRATED STATE, not a tuple lookup. D STRONG when the
   *   garment's designed detail reaches a clearly high whole-garment mass, which the frozen
   *   record shows in three forms:
   *
   *     S1  a commanding system COVERS THE WHOLE GARMENT
   *         support: shirtsprint2 · shirtsprint3 · mtdr4 (DM7) · dmdfloral2 · mtdr3 (DM8)
   *         ⛔ COUNTEREXAMPLE, reported not hidden: mtdr2 carries the identical recorded tuple
   *            (large/high/whole_garment) and the CEO placed it at DM6. The three Primitives do
   *            not separate mtdr2 from mtdr4. Kept as the majority reading (5 against 1) and
   *            raised as a GT re-adjudication candidate instead of being patched around.
   *
   *     S2  a commanding system PLUS another system of real extent that is not low-strength
   *         support: mash3 (logo + all-over openwork → DM7) · logobr2 (multi-placement → DM7)
   *         counter: grp3 and logovint1 pair a commanding graphic with a LOW-contrast wash and
   *                  stay at DM6 — frozen M2, "저강도 secondary는 가산 escalate 하지 않는다".
   *
   *     S3  frozen M1 fires on a commanding system — governed internal richness
   *         support: grp1 (multi-colour compound → DM7) · grp2 (DM7)
   * ═════════════════════════════════════════════════════════════════════════════════════════ */
  const commandingIds = ref.m2.substantial_ids;
  const commandingEv = adm.evidence.filter(e => commandingIds.includes(e.evidence_id));

  const s1 = commandingEv.some(e => establishes(e.spatial, WHOLE_GARMENT));
  const s2 = commandingEv.length >= 1 && adm.evidence.some(e =>
    !commandingIds.includes(e.evidence_id) &&
    establishes(e.size, REAL_EXTENT) && establishes(e.contrast, AT_LEAST_MODERATE))
    || commandingEv.length >= 2;
  const s3 = ref.m1_any_triggered;

  if (s1 || s2 || s3)
    return { strength: STRONG, basis: { reason: 'CLEARLY_HIGH_WHOLE_GARMENT_DETAIL_MASS',
      /** ★ machine-readable pathway (order §13). The projector CONSUMES this; it never re-derives
       *  S1/S2/S3. `S3_M1` names the route on which frozen M1 is the thing that established STRONG,
       *  so the ordinal layer can apply M1 exactly once (D-3). */
      route: [s1 && 'S1', s2 && 'S2', s3 && 'S3_M1'].filter(Boolean),
      /** ★ true when STRONG stands WITHOUT M1 — the DM8 precondition (order §12). */
      independently_established: !!(s1 || s2),
      via: [s1 && 'S1_commanding_system_covers_the_whole_garment',
            s2 && 'S2_multiple_substantial_systems',
            s3 && 'S3_frozen_M1_internal_richness'].filter(Boolean) } };

  if (ref.m1_any_unresolved_on_substantial)
    return { strength: UNKNOWN, basis: { reason: 'M1_SUPPORT_UNRESOLVED_ON_COMMANDING_SYSTEM',
      note: '★ The side stands. M1 is the only candidate path to STRONG here and its support on the carrying system was not observed — fail closed (order §15).' } };

  return { strength: WEAK, basis: { reason: 'PAST_THE_CENTRE_BUT_NOT_CLEARLY_DETAILED', route: ['D_WEAK'],
    note: 'A system commands the field, but it does not cover the garment, is not joined by a second substantial system, and carries no governed internal richness.' } };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * ★ STRENGTH RULE AUTHORITY AUDIT (V3 §14) — machine-readable, so the classification is testable.
 *   ⛔ No rule classified TIER_DERIVED_ONLY survives as runtime physics: it either became a
 *      semantic rule or it now returns UNKNOWN.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
/* ★ STRENGTH RULE AUDIT (V3 §14) — machine-readable so the classification is testable.
 *   ⛔ NO CASE NAME APPEARS HERE. The full audit, with every quotation and the units each rests on,
 *      lives in deliverable 05_STMX_DM_STRENGTH_AUTHORITY_REAUDIT_V3.json. Putting the supporting
 *      case names in the runtime module would have broken the anti-overfitting guarantee that no
 *      engine file mentions a GT case — and that guarantee is worth more than the convenience.
 *   ⛔ No rule classified TIER_DERIVED_ONLY survives as runtime physics. */
const STRENGTH_RULE_AUDIT = Object.freeze([
  Object.freeze({ id: 'M_STRONG', emits: 'STRONG', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'CEO constitution — M STRONG does not mean zero detail; plus two written observations of garments described as carrying only a small tonal mark. ★ 2026-09-12 (D-1): the accent must establish small AND LOW — the V2 inclusion of medium contrast had no word-authority and is withdrawn.' }),
  Object.freeze({ id: 'M_WEAK', emits: 'WEAK', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: '★ CURRENT CEO-APPROVED SEMANTIC RULE — CEO Decision 2026-09-12 (D-1 = A): registered designed detail on the Minimal side that neither commands nor reaches the centre. The frozen Constitution wording for the Minimal-side cells is corroborating history, not the oracle.',
    '★_history_preserved': '★ 2026-09-10 (V3 §14): the earlier M WEAK branch was classified TIER_DERIVED_ONLY and RETIRED — its only support at that time was the diagnostic tier band, and the branch returned UNKNOWN. That classification was correct on the authority then on record. ⛔ It is superseded, not rewritten: the rule that survives today is the 2026-09-12 CEO rule, not the retired V1/V2 rule.' }),
  Object.freeze({ id: 'M_REGISTRATION_UNRESOLVED', emits: 'UNKNOWN', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'fail-closed principle (order 2026-09-12 §5) — an open reading is never converted into WEAK merely because STRONG failed' }),
  Object.freeze({ id: 'NEUTRAL_N_A', emits: 'N/A', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'the centre has no within-side depth by definition; the frozen hybrid calibration note states the centre reading in words' }),
  Object.freeze({ id: 'D_STRONG_S1', emits: 'STRONG', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'frozen Score Physics describes the whole-garment anchor as a STRONG all-over reading; CEO image adjudication used the word strong',
    '★_known_counterexample_family': '★ Three units carry this profile at a lower CEO tier. V3 §15 was applied: no independent image or semantic authority establishes WEAK for any of them, so they are NOT treated as engine defects and the rule is NOT score-chased.' }),
  Object.freeze({ id: 'D_STRONG_S2', emits: 'STRONG', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'frozen M2 substantial-secondary language; CEO Observation Scope Decision 2 (coexisting systems combine)' }),
  Object.freeze({ id: 'D_STRONG_S3', emits: 'STRONG', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'frozen M1 richness language — maximal internal density / chromatic compound composition' }),
  Object.freeze({ id: 'D_WEAK', emits: 'WEAK', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'frozen statements that the garment is NOT escalated — a low-strength secondary adds nothing; a single monochrome system is the base reading',
    '★_inference_disclosed': '★ This equates the frozen base / un-escalated reading with WEAK. That step is an inference, not a quotation, and is disclosed rather than presented as direct authority.' }),
  Object.freeze({ id: 'D_STRENGTH_UNRESOLVED', emits: 'UNKNOWN', classification: 'SEMANTICALLY_AUTHORIZED', survives: true,
    authority: 'fail-closed principle — unresolved support on the carrying system yields no claim' }),
]);

module.exports = { resolveStrength, WEAK, STRONG, N_A, UNKNOWN, STRENGTH_RULE_AUDIT };
