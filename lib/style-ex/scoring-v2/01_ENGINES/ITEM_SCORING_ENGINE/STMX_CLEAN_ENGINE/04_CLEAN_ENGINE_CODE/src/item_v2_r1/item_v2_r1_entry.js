'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R1 ENTRY (internal governed entry surface · not a public API) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX INTEGRATED ITEM SCORING RUNTIME V2 — PRIMARY ITEM AUTO-SELECTION CORRECTION & THREE-AXIS SUIT SCORING
 * CONSTITUTION CLOSURE · §5 · §10 · §11). Reason: replace only the product-selection step of the sealed src/item_v2/ candidate; everything after selection is
 * the predecessor's code, loaded only after its seal verifies. Affected Scope: src/item_v2_r1/ (new); src/item_v2/ unchanged.
 *
 * validate (R1: + merchandise product_title) → select (R1) → UNRESOLVED: no axis executed, result PRODUCT_SELECTION_UNRESOLVED (Rule 4) · otherwise the
 * predecessor evidence adapter → predecessor four-axis binding (four FINAL FROZEN V2 engines) → predecessor result composer (four Directions + four Reasons).
 * ⛔ No scoring semantics · no Suit rule (TC / SR / DM Suit stay SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS) · selection diagnostics stay in internal.selection_trace.
 */
const { verifyPredecessor } = require('./item_v2_r1_predecessor_pin');

function createItemV2R1Runtime(opts) {
  const pin = verifyPredecessor(opts && opts.predecessorDir);   // throws PredecessorPinError — fail closed before any predecessor module is loaded
  const C = require('./item_v2_r1_contracts'); const P = C.P;
  const { validateInputR1 } = require('./item_v2_r1_input_contract');
  const { selectProductR1 } = require('./item_v2_r1_product_selector');
  const { buildAxisInputs } = require('../item_v2/item_v2_evidence_adapter');
  const { composeResult } = require('../item_v2/item_v2_result_composer');
  const { createItemV2Binding } = require('../item_v2/item_v2_axis_binding');
  const binding = createItemV2Binding();
  const runtime = { id: C.RUNTIME_ID, status: C.RUNTIME_STATUS, predecessor: { id: P.RUNTIME_ID, directory_aggregate_sha256: pin.directory_aggregate, verified: pin.verified } };
  const stamp = (r) => Object.assign(r, { runtime });
  const traceOf = (sel, input) => ({
    selection_source: sel.source, selection_status: sel.status, unit: sel.unit,
    candidate_garments: sel.candidates, selected_primary_target: sel.unit === 'ITEM' ? sel.target : null, selected_member_targets: sel.unit === 'SUIT' ? sel.members : null,
    source_evidence_used: sel.evidence, excluded_styling_targets: sel.excluded, ambiguity_classification: sel.ambiguity, tied_candidates: sel.tied || null,
    selection_decision_basis: sel.basis, product_identity_validation: sel.validation, conflicts: sel.conflicts, notes: sel.notes,
    evidence_ownership: sel.unit ? (sel.unit === 'SUIT' ? sel.members : [sel.target]).map((id) => ({ target: id, vision: 'own record', colour: input.colour_observations && input.colour_observations[id] ? 'own Colour V1' : 'absent' })) : [] });

  function scoreItemV2R1(input) {
    const v = validateInputR1(input);
    if (!v.ok) return stamp(composeResult({ inputIssue: v, imageReference: input && input.image_reference }));
    const sel = selectProductR1(v.input, v.productTitle);
    if (!sel.ok) return stamp(composeResult({ inputIssue: sel, imageReference: v.input.image_reference }));
    if (sel.status === C.SELECTION_STATUS.UNRESOLVED) {
      const r = composeResult({ inputIssue: { issue: C.UNRESOLVED_CODE, detail: sel.ambiguity + ' — ' + sel.evidence.join(' · ') + '; resolvable by: ' + C.RESOLVING_INPUTS.join(' | '), trace: traceOf(sel, v.input) }, imageReference: v.input.image_reference });
      r.result_status = C.RESULT_STATUS.PRODUCT_SELECTION_UNRESOLVED; return stamp(r);
    }
    const { axisInputs, coverage } = buildAxisInputs({ unit: sel.unit, target: sel.target, members: sel.members }, v.input);
    const axisResults = {};
    for (const axis of P.AXES) {
      if (axisInputs[axis] === null) { axisResults[axis] = { axis, outcome: P.AXIS_OUTCOME.SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS, code: 'NO_FROZEN_WHOLE_SUIT_ENTRY', diagnostics: { note: 'the frozen ' + axis + ' V2 engine evaluates one product record; no member result is substituted (Suit semantics await a CEO decision)' }, provenance: null }; continue; }
      axisResults[axis] = binding.invoke(axis, axisInputs[axis]);
    }
    return stamp(composeResult({ axisResults, selectionTrace: traceOf(sel, v.input), coverage, imageReference: v.input.image_reference, imageId: v.input.vision_envelope.image_id }));
  }
  return Object.freeze({ id: C.RUNTIME_ID, predecessor: runtime.predecessor, scoreItemV2R1 });
}

let defaultRuntime = null;
function scoreItemV2R1(input) { if (!defaultRuntime) defaultRuntime = createItemV2R1Runtime(); return defaultRuntime.scoreItemV2R1(input); }

module.exports = { createItemV2R1Runtime, scoreItemV2R1 };
