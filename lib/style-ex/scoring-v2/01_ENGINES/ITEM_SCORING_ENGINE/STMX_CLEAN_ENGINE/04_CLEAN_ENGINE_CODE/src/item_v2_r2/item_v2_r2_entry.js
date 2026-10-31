'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R2 SUIT-CAPABLE ENTRY (internal governed entry surface · not a public API) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION, TC/SR/DM VERSIONED SUCCESSORS, FOUR-AXIS INTEGRATION …
 * §3 · §8 · §9). Reason: route a user- / merchandise-designated Suit to the axis-owned Suit successors while every ordinary product keeps the sealed predecessor
 * path (four FINAL FROZEN V2 engines, byte-identical outputs), and return a machine-readable target-selection request for an ambiguous multi-garment image.
 * Affected Scope: src/item_v2_r2/ (new); src/item_v2_r1/ and src/item_v2/ unchanged (pin-verified before reuse).
 *
 * validate (R1) → select (R1: USER → MERCHANDISE → AUTOMATIC; Suit only from explicit input, never inferred) →
 *   UNRESOLVED → no axis executed · result PRODUCT_SELECTION_UNRESOLVED + selection_request (candidates + resume contract) · resumeWithSelection() rescoring
 *   ITEM       → predecessor evidence adapter → predecessor frozen-V2 binding (EI · TC · SR · DM) → predecessor composer          [ORDINARY_PRODUCT_FROZEN_V2]
 *   SUIT       → EI: predecessor binding on the frozen EI V2 ITEM_PRODUCT Suit packet (members' own Vision + own Colour V1)
 *                TC · SR · DM: R2 Suit binding → the sealed axis-owned Suit successors (members' own Vision records)  → predecessor composer   [USER_DESIGNATED_SUIT]
 * ⛔ No axis rule here · no Direction changed after an axis returns · no fifth scorer · no Style ID / code / number / Strength · no V1 / legacy fallback.
 */
const { verifyPredecessors } = require('./item_v2_r2_predecessor_pin');

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function createItemV2R2Runtime(opts) {
  const pin = verifyPredecessors(opts && opts.r1Dir, opts && opts.predecessorDir);   // throws PredecessorPinError — fail closed before any predecessor module is loaded
  const C = require('./item_v2_r2_contracts'); const R1 = C.R1, P = C.P;
  const { validateInputR1 } = require('../item_v2_r1/item_v2_r1_input_contract');
  const { selectProductR1 } = require('../item_v2_r1/item_v2_r1_product_selector');
  const { buildAxisInputs } = require('../item_v2/item_v2_evidence_adapter');
  const { composeResult } = require('../item_v2/item_v2_result_composer');
  const { createItemV2Binding } = require('../item_v2/item_v2_axis_binding');
  const { createSuitSuccessorBinding } = require('./item_v2_r2_suit_binding');
  const binding = createItemV2Binding(); const suitBinding = createSuitSuccessorBinding();
  const runtime = { id: C.RUNTIME_ID, status: C.RUNTIME_STATUS, predecessor: { r1: { id: R1.RUNTIME_ID, directory_aggregate_sha256: pin.r1.directory_aggregate }, item_v2: { id: P.RUNTIME_ID, directory_aggregate_sha256: pin.item_v2.directory_aggregate }, verified: pin.verified } };
  const stamp = (r, route) => { r.runtime = runtime; if (r.internal) r.internal.scoring_route = route; return r; };
  const traceOf = (sel, input) => ({   /* the R1 selection trace fields (order R1 §5.3), unchanged */
    selection_source: sel.source, selection_status: sel.status, unit: sel.unit,
    candidate_garments: sel.candidates, selected_primary_target: sel.unit === 'ITEM' ? sel.target : null, selected_member_targets: sel.unit === 'SUIT' ? sel.members : null,
    source_evidence_used: sel.evidence, excluded_styling_targets: sel.excluded, ambiguity_classification: sel.ambiguity, tied_candidates: sel.tied || null,
    selection_decision_basis: sel.basis, product_identity_validation: sel.validation, conflicts: sel.conflicts, notes: sel.notes,
    evidence_ownership: sel.unit ? (sel.unit === 'SUIT' ? sel.members : [sel.target]).map((id) => ({ target: id, vision: 'own record', colour: input.colour_observations && input.colour_observations[id] ? 'own Colour V1' : 'absent' })) : [] });

  function scoreItemV2R2(input) {
    const v = validateInputR1(input);
    if (!v.ok) return stamp(composeResult({ inputIssue: v, imageReference: input && input.image_reference }), C.SCORING_ROUTE.NOT_EXECUTED);
    const sel = selectProductR1(v.input, v.productTitle);
    if (!sel.ok) return stamp(composeResult({ inputIssue: sel, imageReference: v.input.image_reference }), C.SCORING_ROUTE.NOT_EXECUTED);
    if (sel.status === R1.SELECTION_STATUS.UNRESOLVED) {
      const r = composeResult({ inputIssue: { issue: R1.UNRESOLVED_CODE, detail: sel.ambiguity + ' — ' + sel.evidence.join(' · ') + '; resolvable by: ' + R1.RESOLVING_INPUTS.join(' | '), trace: traceOf(sel, v.input) }, imageReference: v.input.image_reference });
      r.result_status = R1.RESULT_STATUS.PRODUCT_SELECTION_UNRESOLVED;
      r.selection_request = { status: C.SELECTION_REQUEST_STATUS, image_id: v.input.vision_envelope.image_id || null, ambiguity_classification: sel.ambiguity, candidates: sel.candidates.map((c) => ({ target_id: c.target_id, category: c.category, descriptor: c.descriptor, prominence: c.prominence })),
        resume: { field: 'user_selection.product_identity', item: { merchandise_type: 'ITEM', primary_target_id: '<one candidate target_id>' }, suit: { merchandise_type: 'SUIT', suit_component_target_ids: ['<Jacket target_id>', '<Trouser or Skirt target_id>'] } } };
      return stamp(r, C.SCORING_ROUTE.NOT_EXECUTED);
    }
    const { axisInputs, coverage } = buildAxisInputs({ unit: sel.unit, target: sel.target, members: sel.members }, v.input);
    const axisResults = {}; let route;
    if (sel.unit === 'SUIT') {
      route = C.SCORING_ROUTE.USER_DESIGNATED_SUIT;
      const byId = new Map(v.input.vision_envelope.targets.map((t) => [t.target_id, t]));
      const suitPacket = { scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: sel.members.slice() }, targets: sel.members.map((id) => ({ target_id: id, record: clone(byId.get(id).record) })) };   /* members' own Vision records, verbatim (TC / SR / DM read no colour) */
      axisResults.EI = binding.invoke('EI', axisInputs.EI);
      for (const axis of ['TC', 'SR', 'DM']) axisResults[axis] = suitBinding.invoke(axis, suitPacket);
    } else {
      route = C.SCORING_ROUTE.ORDINARY_PRODUCT_FROZEN_V2;
      for (const axis of P.AXES) axisResults[axis] = binding.invoke(axis, axisInputs[axis]);
    }
    return stamp(composeResult({ axisResults, selectionTrace: traceOf(sel, v.input), coverage, imageReference: v.input.image_reference, imageId: v.input.vision_envelope.image_id }), route);
  }
  /** resume a selection request: the SAME input + the user's chosen product identity (ITEM target or SUIT members) — validated exactly like any explicit input */
  function resumeWithSelection(previousInput, productIdentity) {
    const next = clone(previousInput) || {}; next.user_selection = { product_identity: clone(productIdentity) };
    return scoreItemV2R2(next);
  }
  return Object.freeze({ id: C.RUNTIME_ID, predecessor: runtime.predecessor, scoreItemV2R2, resumeWithSelection });
}

let defaultRuntime = null;
const rt = () => { if (!defaultRuntime) defaultRuntime = createItemV2R2Runtime(); return defaultRuntime; };
function scoreItemV2R2(input) { return rt().scoreItemV2R2(input); }
function resumeWithSelection(previousInput, productIdentity) { return rt().resumeWithSelection(previousInput, productIdentity); }

module.exports = { createItemV2R2Runtime, scoreItemV2R2, resumeWithSelection };
