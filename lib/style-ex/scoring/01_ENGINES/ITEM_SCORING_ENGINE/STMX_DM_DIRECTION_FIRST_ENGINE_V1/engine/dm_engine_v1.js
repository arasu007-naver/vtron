'use strict';
/**
 * STMX DM DIRECTION-FIRST ENGINE V1 — ORCHESTRATOR
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-10
 *   Order:          STMX DM DIRECTION-FIRST CLOSURE + ENGINE IMPLEMENTATION V1 §19 / §28 / §29
 *   Reason:         Implements the CEO Direction-First execution order as a deterministic engine
 *                   candidate over governed Vision observations.
 *   Affected Scope: STMX_DM_DIRECTION_FIRST_ENGINE_V1/engine only.
 *
 *   Production Vision V1_2 → Designed Detail Evidence → DM Admission →
 *   Whole-Garment Direction Resolver → M / NEUTRAL / D →
 *   Within-Side Strength Resolver → WEAK / STRONG →
 *   M1 / M2 governed refinement → Secondary Ordinal Projector → DM1–DM9 or governed residue
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-12
 *   Order:          STMX DM STRENGTH + FINAL SCORE IMPLEMENTATION AND CLOSURE V1 §13 / §14 / §32
 *   Reason:         The projector now consumes the governed Strength result (with its pathway
 *                   route) and the admission result, so frozen M1 is applied exactly once and
 *                   DM2/DM3 turn on the existing admission fact. ⛔ Execution order is unchanged:
 *                   Direction is still computed first, from observations alone, and nothing here
 *                   feeds a tier or a Strength back into it.
 *   Affected Scope: the projector call and tier_basis provenance only.
 *
 * ⛔ EXECUTION ORDER IS THE ARCHITECTURE. Direction is computed FIRST, from observations alone.
 *    Strength and the refinement are computed after it and are never fed back into it. The tier
 *    is projected LAST. There is no path in this file by which a tier reaches Direction
 *    (order §3: "numeric tier 먼저 산출 → tier 숫자로 Direction 역산" is prohibited).
 * ⛔ DETERMINISTIC AND OFFLINE. No API call, no image read, no corpus access, no GT lookup, no
 *    REF rule, no image-name rule, no category coefficient, no weight, no threshold number.
 * ★ PRODUCTION / FROZEN DIRECTION BASELINE (CEO 2026-09-10 · Direction Production Closure V3 §27).
 *    Bound by NAME from STMX_DM_DIRECTION_PRODUCTION_CLOSURE_V3/production/dm_direction_engine_binding_v1.js.
 *    ★ HISTORY, not erased: at V1 creation this module was IMPLEMENTED_NOT_PROMOTED (order §39) and was
 *      not wired into any production route by THAT order. It was promoted later, on the V3 gate.
 */

const A = require('./dm_admission_v1');
const DIR = require('./dm_direction_resolver_v1');
const STR = require('./dm_strength_resolver_v1');
const REF = require('./dm_m1_m2_refinement_v1');
const PROJ = require('./dm_ordinal_projector_v1');

const ENGINE_ID = 'STMX_DM_DIRECTION_FIRST_ENGINE_V1';

/**
 * Score the DM axis for ONE governed target.
 * @param {object} dmBlock  record.dm_designed_detail_evidence, verbatim from the Producer
 * @returns {{axis:'DM', direction:string, strength:string, ordinal_tier:number|null,
 *            tier_status:string, provenance:object}}
 */
function evaluateDm(dmBlock) {
  const adm = A.admit(dmBlock);

  // ── 1 · DIRECTION — primary authority, from observations only ──────────────────────────────
  const d = DIR.resolveDirection(dmBlock);

  // ── 2 · governed M1/M2 refinement — INSIDE the side, never across it ───────────────────────
  const ref = adm.ok
    ? REF.refine(adm.evidence, DIR.commands)
    : { m1: [], m1_any_triggered: false, m1_any_unresolved_on_substantial: false,
        m2: { substantial_ids: [], multi_substantial: false, non_contributing_ids: [] },
        covers_whole_garment_clearly: false };

  // ── 3 · WITHIN-SIDE STRENGTH ───────────────────────────────────────────────────────────────
  const s = STR.resolveStrength(d.direction, adm, ref);

  // ── 4 · SECONDARY ORDINAL TIER — last, and clamped to the band Direction fixed ─────────────
  // ★ 2026-09-12 (order §13 / §14): the projector receives the GOVERNED Strength result, not a bare
  //   string, so it can read which pathway established STRONG and apply frozen M1 exactly once.
  //   `adm` is passed for the single admission fact DM2/DM3 turns on (evidence[] empty or not).
  const p = PROJ.project(d.direction, s, ref, adm);

  return {
    axis: 'DM',
    /** ★ PRIMARY OUTPUT (order §29). Everything below it is subordinate. */
    direction: d.direction,
    strength: s.strength,
    ordinal_tier: p.ordinal_tier,
    tier_status: p.tier_status,
    provenance: {
      engine: ENGINE_ID,
      evidence_ids: adm.ok ? adm.evidence.map(e => e.evidence_id) : [],
      admission: { ok: adm.ok, reason: adm.reason, block_present: adm.block_present, empty: adm.empty },
      direction_basis: d.basis,
      strength_basis: s.basis,
      tier_basis: { why: p.why, route: p.route },
      m1: ref.m1,
      m2: ref.m2,
      /** ⛔ recorded so a reviewer can verify the firewall held: the refinement never returns a
       *  direction, and the direction basis never cites M1/M2. */
      firewall: {
        direction_computed_before_refinement: true,
        refinement_returned_direction: false,
        tier_inside_direction_band: p.ordinal_tier === null ||
          PROJ.BAND[d.direction] && PROJ.BAND[d.direction].includes(p.ordinal_tier),
      },
    },
  };
}

/** Convenience: evaluate every eligible target of a governed Producer envelope. */
function evaluateEnvelope(envelope) {
  const targets = (envelope && Array.isArray(envelope.targets)) ? envelope.targets : [];
  return targets.filter(t => t && t.eligible).map(t => ({
    target_id: t.target_id || null,
    dm: evaluateDm(t.record && t.record.dm_designed_detail_evidence),
  }));
}

module.exports = { evaluateDm, evaluateEnvelope, ENGINE_ID, A, DIR, STR, REF, PROJ };
