'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R2 SUIT-CAPABLE CONTRACTS (data only, no logic) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION, TC/SR/DM VERSIONED SUCCESSORS, FOUR-AXIS INTEGRATION …
 * §2.3 · §3 · §8 · §9). Reason: versioned successor of the sealed src/item_v2_r1/ (seal 6020ab57…, not modified in place) that routes a user- / merchandise-
 * designated Suit to the axis-owned TC / SR / DM Suit successors and returns a machine-readable target-selection request for an ambiguous multi-garment image.
 * Affected Scope: src/item_v2_r2/ (new).
 *
 * Everything not listed here is the predecessor's contract, reused unchanged (input fields incl. R1 product_title · selection statuses / bases / ambiguity classes ·
 * axis outcomes · customer tokens · result contract · PRODUCT_SELECTION_UNRESOLVED).
 * ⚠ The names below are CANDIDATE integration vocabulary — Canonical Dictionary registration is required before any freeze.
 */
const R1 = require('../item_v2_r1/item_v2_r1_contracts');
const P = R1.P;

const RUNTIME_ID = 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_R2_CANDIDATE';
const RUNTIME_STATUS = 'CANDIDATE — not production · not frozen (CEO order 2026-10-29: Suit-capable successor implementation + offline regression only)';

/* internal routing record (never customer-facing) */
const SCORING_ROUTE = Object.freeze({
  ORDINARY_PRODUCT_FROZEN_V2: 'ORDINARY_PRODUCT_FROZEN_V2',   // EI / TC / SR / DM = the four FINAL FROZEN V2 engines (predecessor binding, unchanged)
  USER_DESIGNATED_SUIT: 'USER_DESIGNATED_SUIT',               // EI = frozen EI V2 ITEM_PRODUCT Suit path · TC / SR / DM = the axis-owned Suit successors
  NOT_EXECUTED: 'NOT_EXECUTED',                               // no legitimate scoring target yet (input issue or selection request)
});

/* machine-readable target-selection request (order §3.3 · §9): an input-resolution step, never a Direction */
const SELECTION_REQUEST_STATUS = 'TARGET_SELECTION_REQUIRED';
const SELECTION_REQUEST_FIELDS = Object.freeze({
  status: SELECTION_REQUEST_STATUS,
  ambiguity_classification: 'the R1 classification (UNRESOLVED_EQUAL_PRESENTATION · UNRESOLVED_NO_PRESENTATION_EVIDENCE · UNRESOLVED_PARTIAL_PRESENTATION_EVIDENCE · UNRESOLVED_WITHIN_DECLARED_CATEGORY)',
  candidates: '[{ target_id, category, descriptor, prominence }] — every eligible garment of THIS envelope (legitimate targets only; styling-only / ineligible targets excluded)',
  resume: '{ field: "user_selection.product_identity", item: { merchandise_type: "ITEM", primary_target_id }, suit: { merchandise_type: "SUIT", suit_component_target_ids } } — resubmit the same input with the chosen identity (resumeWithSelection)',
});

module.exports = { RUNTIME_ID, RUNTIME_STATUS, SCORING_ROUTE, SELECTION_REQUEST_STATUS, SELECTION_REQUEST_FIELDS, R1, P };
