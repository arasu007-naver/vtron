'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — VISION V1.3 + COLOUR V1 EVIDENCE ADAPTER (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… INTEGRATED RUNTIME V2 IMPLEMENTATION §7 · §10.1). Affected Scope: this file (new).
 *
 * Routes the SELECTED product's own evidence to each axis, verbatim:
 *   EI  ITEM → { scoring_unit_type: 'GARMENT', record } · SUIT → { scoring_unit_type: 'ITEM_PRODUCT', product_identity: SUIT, targets: [both members] }
 *       (record = the Vision V1.3 record + that SAME target's Colour V1 color_observation when supplied — EI's own adapter validates it)
 *   TC / SR / DM  ITEM → the Vision V1.3 record exactly as emitted (they read no colour) · SUIT → no input (no frozen whole-Suit entry, order §10.5)
 * ⛔ No field renamed, filled, inferred or dropped. ⛔ Colour is attached only to the target whose id it is keyed by (no leakage between garments; styling
 *    targets never contribute). ⛔ Members are never concatenated. Missing colour is recorded as an internal evidence-coverage limitation.
 */
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const OBS_STATES = ['OBSERVED', 'ABSENT', 'NOT_VISIBLE', 'UNKNOWN'];

function coverageOf(target, colour) {
  const obs = target.record.observations || {}; const states = {};
  for (const v of Object.values(obs)) { const s = v && OBS_STATES.includes(v.state) ? v.state : Array.isArray(v && v.values) ? 'MULTI_VALUES' : 'OTHER'; states[s] = (states[s] || 0) + 1; }
  return { target_id: target.target_id, category: target.record.category && target.record.category.value, observation_states: states, dm_designed_detail_evidence: target.record.dm_designed_detail_evidence === undefined ? 'ABSENT' : 'PRESENT', colour_v1: colour ? 'SUPPLIED (validated by EI against the frozen Colour V1 contract)' : 'ABSENT — EI runs colour NOT_ESTABLISHED: Commercial Neutral cannot be evaluated and colour evidence is unused (coverage limitation, not a fabricated value)' };
}

/** @returns {{ axisInputs: { EI, TC, SR, DM }, coverage: [] }} */
function buildAxisInputs(selection, input) {
  const byId = new Map(input.vision_envelope.targets.map((t) => [t.target_id, t])); const colours = input.colour_observations || {};
  const withColour = (t) => { const r = clone(t.record); if (colours[t.target_id]) r.color_observation = clone(colours[t.target_id]); return r; };
  if (selection.unit === 'SUIT') {
    const members = selection.members.map((id) => byId.get(id));
    return { axisInputs: { EI: { scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: selection.members.slice() }, targets: members.map((t) => ({ target_id: t.target_id, record: withColour(t) })) }, TC: null, SR: null, DM: null },
      coverage: members.map((t) => coverageOf(t, colours[t.target_id])) };
  }
  const t = byId.get(selection.target);
  return { axisInputs: { EI: { scoring_unit_type: 'GARMENT', record: withColour(t) }, TC: clone(t.record), SR: clone(t.record), DM: clone(t.record) }, coverage: [coverageOf(t, colours[t.target_id])] };
}

module.exports = { buildAxisInputs };
