'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — ENTRY (internal governed entry surface · not a public API) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING — INTEGRATED RUNTIME V2 IMPLEMENTATION, USER-DIRECTED PRODUCT SELECTION, AUTOMATIC PRIMARY FALLBACK,
 * COLOUR EVIDENCE INTEGRATION & FOUR-AXIS REGRESSION · §0 · §4 · §8 · §9). Reason: one executable V2 integration inside the Clean Engine (G42 / G42-A): validate →
 * select the product (USER → MERCHANDISE → AUTOMATIC) → route the product's own Vision / Colour evidence → the four FINAL FROZEN Item V2 engines → compose four
 * Directions + four Korean Reasons. Affected Scope: src/item_v2/ (new). V1 Item Entry / Composer / registry / binding unchanged.
 *
 * ⛔ No scoring semantics. ⛔ Axes are independent (no axis reads another's input or result); fixed order EI → TC → SR → DM is output order only.
 */
const C = require('./item_v2_contracts');
const { validateInput } = require('./item_v2_input_contract');
const { selectProduct } = require('./item_v2_product_selector');
const { buildAxisInputs } = require('./item_v2_evidence_adapter');
const { composeResult } = require('./item_v2_result_composer');
const { createItemV2Binding } = require('./item_v2_axis_binding');

function createItemV2Runtime() {
  const binding = createItemV2Binding();
  function scoreItemV2(input) {
    const v = validateInput(input);
    if (!v.ok) return composeResult({ inputIssue: v, imageReference: input && input.image_reference });
    const sel = selectProduct(input);
    if (!sel.ok) return composeResult({ inputIssue: sel, imageReference: input.image_reference });
    const { axisInputs, coverage } = buildAxisInputs(sel, input);
    const axisResults = {};
    for (const axis of C.AXES) {
      if (axisInputs[axis] === null) { axisResults[axis] = { axis, outcome: C.AXIS_OUTCOME.SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS, code: 'NO_FROZEN_WHOLE_SUIT_ENTRY', diagnostics: { note: 'the frozen ' + axis + ' V2 engine evaluates one product record; no member result is substituted (CEO decision required, order §10.5)' }, provenance: null }; continue; }
      axisResults[axis] = binding.invoke(axis, axisInputs[axis]);
    }
    const selectionTrace = { selection_source: sel.source, selection_status: sel.status, unit: sel.unit, selected_product_target: sel.unit === 'ITEM' ? sel.target : null, selected_member_targets: sel.unit === 'SUIT' ? sel.members : null,
      evidence_ownership: sel.unit === 'SUIT' ? sel.members.map((m) => ({ member: m, vision: 'own record', colour: input.colour_observations && input.colour_observations[m] ? 'own Colour V1' : 'absent' })) : [{ target: sel.target, vision: 'own record', colour: input.colour_observations && input.colour_observations[sel.target] ? 'own Colour V1' : 'absent' }],
      excluded_targets: sel.excluded, candidates: sel.candidates, tied_candidates: sel.tied || null, selection_basis: sel.basis, conflicts: sel.conflicts, validation_status: 'VALID_PRODUCT_INPUT' };
    return composeResult({ axisResults, selectionTrace, coverage, imageReference: input.image_reference, imageId: input.vision_envelope.image_id });
  }
  return Object.freeze({ id: C.RUNTIME_ID, scoreItemV2 });
}

let defaultRuntime = null;
function scoreItemV2(input) { if (!defaultRuntime) defaultRuntime = createItemV2Runtime(); return defaultRuntime.scoreItemV2(input); }

module.exports = { RUNTIME_ID: C.RUNTIME_ID, createItemV2Runtime, scoreItemV2 };
