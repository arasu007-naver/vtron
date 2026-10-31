'use strict';
/* STMX ITEM EI V2 — CANDIDATE. COMMERCIAL NEUTRAL ELIGIBILITY + NEUTRAL-ON / NEUTRAL-OFF POLICY.
   Commercial Neutral = the frozen Registry V3 / Denim eligibility (a Category × Product Context × Colour hit, i.e. the frozen contextual starting state) AND no
   disqualifying expressive evidence. A reading is ELIGIBLE only when:
     1. its start is the Registry / Denim contextual start (observed colour + established category + every Registry predicate value it could take);
     2. the resolved evidence condition is NONE or WEAK_ONLY (frozen: one MEANINGFUL / STRONG → E);
     3. no UNRESOLVED observed carrier exists OUTSIDE the frozen Score Continuity scope (CEO 2026-09-06 · GFR scope read from the frozen materiality(): a pathway it
        marks score_always_exempt is a governed non-transitioning representation gap — it stays UNRESOLVED, is never relabelled WEAK / NO EFFECT, and does not erase an
        otherwise valid Registry Neutral). Any other force-unknown carrier cannot be declared non-disqualifying (CEO order R2 §6.2 · §7-D).
   The product is Commercial Neutral only if EVERY admissible reading is eligible. Missing data never creates eligibility.
   Neutral-Off: final = underlying. Neutral-On: final = eligible ? NEUTRAL : underlying. The underlying is computed identically in both modes. */
const { condition, CONTEXTUAL } = require('./ei_v2_underlying_resolver');
const { RT } = require('./ei_v2_frozen_bindings');
function readingEligible(r) {
  if (r.start !== CONTEXTUAL) return { eligible: false, why: 'NO_REGISTRY_OR_DENIM_HIT' };
  const cond = condition(r.pathways); if (!['NONE', 'WEAK_ONLY'].includes(cond)) return { eligible: false, why: 'DISQUALIFYING_EXPRESSIVE_EVIDENCE (' + cond + ')' };
  const unresolved = (r.pathways || []).filter((p) => p.resolution_status === 'UNRESOLVED');
  const governed = new Set(unresolved.length ? RT.materiality(r.start, r.pathways).findings.filter((f) => f.score_always_exempt).map((f) => f.pathway_id) : []);
  if (unresolved.some((p) => !governed.has(p.independent_pathway_id))) return { eligible: false, why: 'UNQUALIFIED_OBSERVED_CARRIER (force unknown, outside the Score Continuity scope)' };
  return { eligible: true, why: (r.registry_basis || 'REGISTRY_V3') + (governed.size ? ' · SCORE_CONTINUITY_GAP_RECORDED' : '') };
}
function resolveCommercial(readings, ctx) {
  if (!ctx.colour_established) return { eligible: false, why: 'COLOUR_NOT_ESTABLISHED', basis: null };
  const per = readings.map(readingEligible); const eligible = per.length > 0 && per.every((x) => x.eligible);
  return { eligible, why: eligible ? per[0].why : (per.find((x) => !x.eligible) || {}).why, basis: eligible ? per[0].why : null, readings: per };
}
const applyNeutralPolicy = (underlying, commercial, options) => ((options && options.commercialNeutral === false) ? underlying.direction : commercial.eligible ? 'NEUTRAL' : underlying.direction);
module.exports = { readingEligible, resolveCommercial, applyNeutralPolicy };
