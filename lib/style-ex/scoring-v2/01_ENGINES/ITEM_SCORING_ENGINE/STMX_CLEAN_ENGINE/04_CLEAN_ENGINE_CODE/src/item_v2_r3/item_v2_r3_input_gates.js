'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R3 INPUT GATES (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… SUIT DM INCOMPLETE ROOT-CAUSE RESOLUTION … §4 CLASS D · §5 · §8). Affected Scope: this file (new).
 *
 * (1) selectionPolicy(sel, input) — CEO §8 on top of the unchanged R1 selection result: a choice made ONLY by Vision prominence (basis UNIQUE_HIGHEST_PRESENTATION —
 *     automatic, or inside a declared category with several candidates) is replaced by a target-selection request (ambiguity UNRESOLVED_MULTIPLE_PRODUCT_CANDIDATES).
 *     Every other R1 outcome is kept as is (single eligible garment · explicit target · Suit members · unique declared category · product_title · existing
 *     UNRESOLVED classes). ⛔ No new selection evidence, no category preference, no Suit inference.
 * (2) visionConformance(validateDmObservation, records) — the frozen Item Vision V1.3 DM observation gate on the SELECTED target record(s) only (styling targets are
 *     never scored, so never gated). A record that fails it (absent block = a pre-DM-layer producer record, or a malformed block) is NOT a current V1.3 scoring
 *     input → classified at the input boundary, never scored, never turned into Minimal. ⛔ The gate never edits, fills or repairs a record.
 */
const C = require('./item_v2_r3_contracts');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function selectionPolicy(sel, input) {
  if (!sel || !sel.ok || sel.status === C.R1.SELECTION_STATUS.UNRESOLVED) return { sel, overridden: false };
  if (sel.basis !== C.R1.SELECTION_DECISION_BASIS.UNIQUE_HIGHEST_PRESENTATION) return { sel, overridden: false };
  const spec = sel.source === C.P.SELECTION_SOURCE.USER ? input.user_selection : sel.source === C.P.SELECTION_SOURCE.MERCHANDISE_METADATA ? input.merchandise_metadata : null;
  const pool = spec && spec.category ? sel.candidates.filter((c) => c.category === spec.category) : sel.candidates;
  const out = Object.assign({}, sel, { unit: null, status: C.R1.SELECTION_STATUS.UNRESOLVED, target: undefined, ambiguity: C.AMBIGUITY_MULTIPLE, tied: pool.map((c) => c.target_id), basis: C.R1.SELECTION_DECISION_BASIS.NONE, excluded: [],
    evidence: sel.evidence.concat(['R1 would choose ' + sel.target + ' by Vision prominence alone among ' + pool.length + ' eligible garment(s) — CEO 2026-10-29 §8: prominence never selects the product; the user selects']) });
  return { sel: out, overridden: true, r1_choice: sel.target };
}

function visionConformance(validateDmObservation, records) {
  const per = records.map(({ target_id, record }) => { const v = validateDmObservation(clone(record)); const codes = (v.errors || []).map((e) => e.code);
    return { target_id, conformance: codes.length ? C.CONFORMANCE.NONCONFORMING : C.CONFORMANCE.CONFORMING, gate_errors: codes, dm_block: record && record.dm_designed_detail_evidence === undefined ? 'ABSENT' : 'PRESENT' }; });
  return { contract: C.VISION_CONTRACT_ID, gate: C.INPUT_CONTRACT_GATE, conformance: per.every((p) => p.conformance === C.CONFORMANCE.CONFORMING) ? C.CONFORMANCE.CONFORMING : C.CONFORMANCE.NONCONFORMING, targets: per };
}

module.exports = { selectionPolicy, visionConformance };
