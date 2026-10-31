'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R3 ENTRY (internal governed entry surface · not a public API) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — SUIT DM INCOMPLETE ROOT-CAUSE RESOLUTION, INTEGRATED RUNTIME CONTRACT CORRECTION … §4 · §5 · §7 · §8).
 * Reason: correct the two proven R2 defects (result-state separation of non-V1.3 inputs · prominence-based Primary selection) WITHOUT re-implementing scoring.
 * Affected Scope: src/item_v2_r3/ (new); src/item_v2_r2/, src/item_v2_r1/, src/item_v2/ unchanged and pin-verified before reuse.
 *
 *   R1 validate → R1 select → R3 selection policy (§8) ─ UNRESOLVED → PRODUCT_SELECTION_UNRESOLVED + selection_request (the R2 shape) — no axis executed
 *                                                      └ selected (ITEM target | SUIT members) → frozen V1.3 DM observation gate on the selected record(s)
 *        NONCONFORMING → INPUT_CONTRACT_NONCONFORMING (input boundary · no axis executed · no Direction · the reason codes per target)
 *        CONFORMING    → the SEALED R2 runtime scores the identical input (same selection — R3 only ever narrows R2's choices) — its result returned verbatim,
 *                        R3 adds internal.input_contract and its runtime stamp.
 * ⛔ No axis rule here · no Direction changed · no fifth scorer · no fabricated DM block · no GT · no V1 / legacy fallback.
 */
const { verifyPredecessors } = require('./item_v2_r3_predecessor_pin');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function createItemV2R3Runtime(opts) {
  const pin = verifyPredecessors(opts);   // throws PredecessorPinError — fail closed before any predecessor / validator module is loaded
  const C = require('./item_v2_r3_contracts'); const R1 = C.R1, P = C.P;
  const { validateInputR1 } = require('../item_v2_r1/item_v2_r1_input_contract');
  const { selectProductR1 } = require('../item_v2_r1/item_v2_r1_product_selector');
  const { composeResult } = require('../item_v2/item_v2_result_composer');
  const { createItemV2R2Runtime } = require('../item_v2_r2/item_v2_r2_entry');
  const V13 = require(pin.vision_v1_3.entryAbs); if (typeof V13.validateDmObservation !== 'function') throw new Error('R3: frozen V1.3 validateDmObservation missing');
  const { selectionPolicy, visionConformance } = require('./item_v2_r3_input_gates');
  const r2 = createItemV2R2Runtime(opts && { r1Dir: opts.r1Dir, predecessorDir: opts.predecessorDir });
  const runtime = { id: C.RUNTIME_ID, status: C.RUNTIME_STATUS, predecessor: { r2: { id: C.R2C.RUNTIME_ID, directory_aggregate_sha256: pin.r2.directory_aggregate }, r1: { directory_aggregate_sha256: pin.r1.directory_aggregate }, item_v2: { directory_aggregate_sha256: pin.item_v2.directory_aggregate }, vision_v1_3_gate: pin.vision_v1_3.files, verified: pin.verified } };
  const stamp = (r) => Object.assign(r, { runtime });
  const traceOf = (sel, input, extra) => Object.assign({ selection_source: sel.source, selection_status: sel.status, unit: sel.unit, candidate_garments: sel.candidates, selected_primary_target: null, selected_member_targets: null,
    source_evidence_used: sel.evidence, excluded_styling_targets: [], ambiguity_classification: sel.ambiguity, tied_candidates: sel.tied || null, selection_decision_basis: sel.basis, product_identity_validation: sel.validation, conflicts: sel.conflicts, notes: sel.notes, evidence_ownership: [] }, extra || {});
  const request = (sel, input) => ({ status: C.R2C.SELECTION_REQUEST_STATUS, image_id: input.vision_envelope.image_id || null, ambiguity_classification: sel.ambiguity, candidates: sel.candidates.map((c) => ({ target_id: c.target_id, category: c.category, descriptor: c.descriptor, prominence: c.prominence })),
    resume: { field: 'user_selection.product_identity', item: { merchandise_type: 'ITEM', primary_target_id: '<one candidate target_id>' }, suit: { merchandise_type: 'SUIT', suit_component_target_ids: ['<Jacket target_id>', '<Trouser or Skirt target_id>'] } } });

  function scoreItemV2R3(input) {
    const v = validateInputR1(input);
    if (!v.ok) return stamp(r2.scoreItemV2R2(input));   /* invalid product input: identical to R2 (no axis executed) */
    const s0 = selectProductR1(v.input, v.productTitle);
    if (!s0.ok) return stamp(r2.scoreItemV2R2(input));
    const pol = selectionPolicy(s0, v.input); const sel = pol.sel;
    if (sel.status === R1.SELECTION_STATUS.UNRESOLVED) {
      if (!pol.overridden) { const r = r2.scoreItemV2R2(input); r.internal.selection_policy = { r3_override: false }; return stamp(r); }   /* R2 already returns the request */
      const r = composeResult({ inputIssue: { issue: R1.UNRESOLVED_CODE, detail: sel.ambiguity + ' — ' + sel.evidence.join(' · ') + '; resolvable by: ' + R1.RESOLVING_INPUTS.join(' | '), trace: traceOf(sel, v.input) }, imageReference: v.input.image_reference });
      r.result_status = R1.RESULT_STATUS.PRODUCT_SELECTION_UNRESOLVED; r.selection_request = request(sel, v.input); r.internal.scoring_route = C.R2C.SCORING_ROUTE.NOT_EXECUTED; r.internal.selection_policy = { r3_override: true, r1_prominence_choice: pol.r1_choice, rule: 'CEO 2026-10-29 §8' };
      return stamp(r);
    }
    const ids = sel.unit === 'SUIT' ? sel.members : [sel.target]; const byId = new Map(v.input.vision_envelope.targets.map((t) => [t.target_id, t]));
    const ic = visionConformance(V13.validateDmObservation, ids.map((id) => ({ target_id: id, record: byId.get(id).record })));
    if (ic.conformance === C.CONFORMANCE.NONCONFORMING) {
      const bad = ic.targets.filter((t) => t.conformance === C.CONFORMANCE.NONCONFORMING);
      const r = composeResult({ inputIssue: { issue: C.INPUT_ISSUE_NONCONFORMING, detail: 'selected ' + sel.unit + ' target(s) ' + bad.map((t) => t.target_id + ' [' + t.gate_errors.join(',') + ']').join(' · ') + ' do not satisfy the ' + C.VISION_CONTRACT_ID + ' DM observation gate (a pre-DM-layer or malformed record) — re-extract with the current Item Vision V1.3 producer; no Direction is produced from a non-conforming record', trace: traceOf(sel, v.input, { selected_primary_target: sel.unit === 'ITEM' ? sel.target : null, selected_member_targets: sel.unit === 'SUIT' ? sel.members : null }) }, imageReference: v.input.image_reference });
      r.result_status = C.RESULT_STATUS.INPUT_CONTRACT_NONCONFORMING; r.internal.scoring_route = C.R2C.SCORING_ROUTE.NOT_EXECUTED; r.internal.input_contract = ic; r.internal.selection_policy = { r3_override: false };
      return stamp(r);
    }
    const r = r2.scoreItemV2R2(input); r.internal.input_contract = ic; r.internal.selection_policy = { r3_override: false };
    return stamp(r);
  }
  function resumeWithSelection(previousInput, productIdentity) { const next = clone(previousInput) || {}; next.user_selection = { product_identity: clone(productIdentity) }; return scoreItemV2R3(next); }
  return Object.freeze({ id: C.RUNTIME_ID, predecessor: runtime.predecessor, scoreItemV2R3, resumeWithSelection });
}

let defaultRuntime = null;
const rt = () => { if (!defaultRuntime) defaultRuntime = createItemV2R3Runtime(); return defaultRuntime; };
function scoreItemV2R3(input) { return rt().scoreItemV2R3(input); }
function resumeWithSelection(previousInput, productIdentity) { return rt().resumeWithSelection(previousInput, productIdentity); }

module.exports = { createItemV2R3Runtime, scoreItemV2R3, resumeWithSelection };
