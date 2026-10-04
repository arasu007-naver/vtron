'use strict';
/**
 * STMX_EI_NUMERIC_LAYER_V1  —  FINAL AUTHORITY CORRECTION build.
 *
 * Approval Anchor
 *   CEO Decision: 2026-09-08
 *   Reason:       Two authority defects were found by Independent Review in the predecessor build.
 *                 (A) a persistent lower-body realization qualifier produced EI7 automatically,
 *                     which is stronger than CEO authority. That rule is REMOVED.
 *                 (B) a persistence assertion had been inferred for one unit without independent
 *                     CEO adjudication. That assertion is REMOVED upstream in the evidence layer.
 *   Affected Scope: ei_numeric_layer_v1.js  ->  the predecessor's persistent-lower lift was removed and
 *                 NUM-E-LIFT-2 was rewritten as the governed upper/lower exposure conjunction.
 *
 * The removed rule is named here by RULE ID only. Naming the old function identifier would make a
 * naive grep report the rule as still present — a false positive this project has already paid for.
 *
 * Consumes STMX_EI_DIRECTION_RUNTIME_V1_2_7. It NEVER writes Direction.
 *
 * Prohibitions honoured mechanically, checked by the Architecture Guard:
 *   no reference identifiers  ·  no ground-truth reads  ·  no TC / SR / DM fields
 *   no numeric coefficients   ·  no magnitude vocabulary  ·  no prose reads
 *   no garment-geometry shortcuts  ·  fail-closed on every ungoverned distinction
 */

/** The frozen Class-A exposure regions, split into the governed upper / lower halves. */
const CLASS_A_UPPER = ["Shoulder","Chest / Décolletage","Midriff / Waist","Back"];
const CLASS_A_LOWER = ["Upper Thigh"];
/** Canonical realization identifiers from the frozen Direction runtime. */
const CANON = { SEE_THROUGH: 'S08', OPENWORK: 'S10' };
/** Governed realization modes of the exposure_realization qualifier. */
const MODE = { PERSISTENT: 'INHERENT_PERSISTENT', CONDITIONAL: 'CONDITIONAL_OPENING_MEDIATED', UNKNOWN: 'UNKNOWN' };
/** §16 side lock — the only tiers each frozen Direction side may ever produce. */
const SIDE_LOCK = { I: [1, 2, 3, 4], NEUTRAL: [5], E: [6, 7, 8, 9] };

const NOT_EMITTED_BY_V1 = {
  EI1: 'RESERVED / CURRENTLY UNCALIBRATED',
  EI2: 'RESERVED / CURRENTLY UNCALIBRATED',
  EI3: 'RESERVED / CURRENTLY UNCALIBRATED',
  EI8: 'OBSERVED IN GROUND TRUTH · no governed condition in current EI authority separates it from EI7. Classified WITHIN_SIDE_CALIBRATION_LIMITATION. EI8 remains a legitimate E-side tier and its ground truth is preserved unchanged.',
  EI9: 'RESERVED / CURRENTLY UNCALIBRATED',
};

/** An admitted exposure region carried by a resolved, strong independent pathway. */
function strongRegions(st, klass) {
  return (st.exposure || []).filter(e => e.klass === klass
    && e.resolution_status === 'RESOLVED' && e.force === 'STRONG');
}

/**
 * NUM-E-LIFT-1  —  governed see-through realization resolving strong, together with an
 * independently admitted openwork realization on a different pathway.
 */
function liftSeeThroughOpenwork(st) {
  const seeThrough = (st.pathways || []).find(p => p.dedup_group === CANON.SEE_THROUGH
    && p.resolution_status === 'RESOLVED' && p.force === 'STRONG');
  if (!seeThrough) return null;
  const openwork = (st.admitted || []).find(e => e.canonical_id === CANON.OPENWORK);
  if (!openwork) return null;
  const openworkPathway = (st.pathways || []).find(p => p.dedup_group === CANON.OPENWORK);
  if (!openworkPathway || openworkPathway.id === seeThrough.id) return null;
  return { rule_id: 'NUM-E-LIFT-1', tier: 7,
    basis: 'governed see-through realization resolved strong, with an independently admitted openwork realization',
    evidence: [seeThrough.dedup_group + ':' + seeThrough.id, openworkPathway.dedup_group + ':' + openworkPathway.id] };
}

/**
 * NUM-E-LIFT-2  —  the governed semantic conjunction stated by CEO authority: strong admitted
 * upper-body exposure together with an INDEPENDENT strong admitted lower-body exposure.
 *
 * This is a relationship between two governed exposure pathways. It is NOT a count of regions:
 * a unit with two upper regions and no lower region does not satisfy it, while a unit with one
 * upper and one lower region does.
 *
 * It reads the region CLASS only. It does NOT read the realization qualifier, so the tier it
 * produces cannot depend on a persistence assertion.
 */
function liftExposureConjunction(st) {
  const upper = strongRegions(st, 'CLASS_A_UPPER');
  const lower = strongRegions(st, 'CLASS_A_LOWER');
  if (!upper.length || !lower.length) return null;
  const independent = upper.some(u => lower.some(l => u.pathway_id && l.pathway_id && u.pathway_id !== l.pathway_id));
  if (!independent) return null;
  return { rule_id: 'NUM-E-LIFT-2', tier: 7,
    basis: 'strong admitted upper-body exposure with an independent strong admitted lower-body exposure',
    evidence: upper.map(u => u.region + ':' + u.pathway_id).concat(lower.map(l => l.region + ':' + l.pathway_id)) };
}

/**
 * NUM-E-FAILCLOSED-1  —  an admitted lower-body exposure whose governed realization is NOT the
 * conditional, opening-mediated case, where no governed lift applies.
 *
 * CEO authority calibrates the conditional case at the base tier. It states that persistent
 * realization is STRONGER evidence than conditional, but it does not authorize a tier for it.
 * Emitting the base tier would assert an equivalence CEO authority denies; emitting a lift
 * would exceed CEO authority. The layer therefore declines and reports the blocker.
 */
function failClosedLower(st) {
  const lower = strongRegions(st, 'CLASS_A_LOWER');
  const ungoverned = lower.filter(e => e.mode !== MODE.CONDITIONAL);
  if (!ungoverned.length) return null;
  return { rule_id: 'NUM-E-FAILCLOSED-1',
    blocker: 'LOWER_BODY_REALIZATION_WITHOUT_GOVERNED_LIFT',
    basis: 'admitted lower-body exposure with realization ' + ungoverned.map(e => e.mode).join(',')
      + ' and no governed lift satisfied — no tier is authorized',
    evidence: ungoverned.map(e => e.region + ':' + e.pathway_id + ':' + e.mode) };
}

function sideLocked(direction, tier) {
  const allowed = SIDE_LOCK[direction];
  return !!allowed && allowed.indexOf(tier) !== -1;
}

/**
 * resolve(state) -> { ei_numeric, numeric_rule, numeric_status, numeric_blocker, numeric_provenance }
 * The state argument is the admission-aware semantic state derived from the frozen Direction trace.
 */
function resolve(st) {
  const dir = st.frozen_direction;
  const out = (tier, rule, prov) => {
    if (tier !== null && !sideLocked(dir, tier)) {
      return { ei_numeric: null, numeric_rule: 'NUM-FAILCLOSED-SIDE-LOCK', numeric_status: 'UNRESOLVED',
        numeric_blocker: 'SIDE_LOCK_VIOLATION',
        numeric_provenance: { direction: dir, attempted_tier: tier, attempted_rule: rule,
          note: 'the layer may only refine within the side the frozen Direction runtime already resolved' } };
    }
    return { ei_numeric: tier, numeric_rule: rule,
      numeric_status: tier === null ? 'UNRESOLVED' : 'RESOLVED',
      numeric_blocker: tier === null ? (prov && prov.blocker) || null : null,
      numeric_provenance: Object.assign({ direction: dir, side_allowed: SIDE_LOCK[dir] || null }, prov || {}) };
  };

  if (dir === 'NEUTRAL') return out(5, 'NUM-N-1', { basis: 'frozen Direction Neutral' });
  if (dir === 'I') return out(4, 'NUM-I-1',
    { basis: 'frozen Direction I; EI4 is the calibrated I tier, EI1 to EI3 are reserved and uncalibrated' });
  if (dir !== 'E') return out(null, 'NUM-FAILCLOSED-DIRECTION',
    { blocker: 'DIRECTION_UNRESOLVED', basis: 'the frozen Direction runtime did not resolve a side; no fallback exists' });

  const lifts = [liftSeeThroughOpenwork(st), liftExposureConjunction(st)].filter(Boolean);
  if (lifts.length) {
    return out(7, lifts.map(l => l.rule_id).join('+'),
      { basis: 'E-side base with governed lift', base_tier: 6, applied_lifts: lifts });
  }
  const fc = failClosedLower(st);
  if (fc) return out(null, fc.rule_id, fc);
  return out(6, 'NUM-E-BASE',
    { basis: 'frozen Direction E with no governed lift condition satisfied', base_tier: 6, applied_lifts: [] });
}

module.exports = { resolve, SIDE_LOCK, NOT_EMITTED_BY_V1, MODE, CANON,
  CLASS_A_UPPER, CLASS_A_LOWER, NUMERIC_VERSION: 'STMX_EI_NUMERIC_LAYER_V1' };
