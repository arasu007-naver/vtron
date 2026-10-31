'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R1 SELECTION CONTRACTS (data only, no logic) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX INTEGRATED ITEM SCORING RUNTIME V2 — PRIMARY ITEM AUTO-SELECTION CORRECTION & THREE-AXIS SUIT SCORING
 * CONSTITUTION CLOSURE · §2 · §5 · §11). Reason: versioned successor of the sealed src/item_v2/ product selection (seal 519dacaa…, not modified in place);
 * Rule 4 — an evidence-indistinguishable case is classified, never hidden by target order. Affected Scope: src/item_v2_r1/ (new).
 *
 * Everything not listed here is the predecessor's contract, reused unchanged (input fields · axis outcomes · customer tokens · result contract).
 * ⚠ The names below are CANDIDATE integration vocabulary — Canonical Dictionary registration is required before any freeze.
 *   `product_title` reuses the term already recorded by EI V2 R5 OVERLAY_V2 evidence_source.product_title.
 */
const P = require('../item_v2/item_v2_contracts');

const RUNTIME_ID = 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_R1_CANDIDATE';
const RUNTIME_STATUS = 'CANDIDATE — not production · not frozen (CEO order 2026-10-29: Primary selector correction + regression only)';

/* one more MERCHANDISE field; every other input field is the predecessor's */
const R1_MERCHANDISE_FIELDS = Object.freeze({ product_title: 'optional non-empty string (≤ 500 chars) — the merchandise title supplied upstream; matched only against the candidates\' own Vision category and descriptor text' });

const SELECTION_STATUS = Object.freeze({
  VALID: P.SELECTION_STATUS.VALID,                                     // USER / MERCHANDISE identified exactly one product
  AUTOMATIC_SELECTED: 'AUTOMATIC_SELECTED',                            // automatic evidence supports exactly one candidate
  UNRESOLVED: 'UNRESOLVED',                                            // evidence cannot distinguish the candidates — no axis executed (Rule 4)
});
const SELECTION_DECISION_BASIS = Object.freeze({
  EXPLICIT_PRIMARY_TARGET_ID: 'EXPLICIT_PRIMARY_TARGET_ID',
  EXPLICIT_SUIT_MEMBER_IDS: 'EXPLICIT_SUIT_MEMBER_IDS',
  SUIT_MEMBERS_BY_UNIQUE_CATEGORY: 'SUIT_MEMBERS_BY_UNIQUE_CATEGORY',
  DECLARED_CATEGORY_UNIQUE_CANDIDATE: 'DECLARED_CATEGORY_UNIQUE_CANDIDATE',
  TITLE_CATEGORY_TERM: 'TITLE_CATEGORY_TERM',                          // the title names exactly one candidate's own Vision category
  TITLE_DESCRIPTOR_OVERLAP: 'TITLE_DESCRIPTOR_OVERLAP',                // the title shares strictly more words with one candidate's Vision descriptor than with any other
  SINGLE_ELIGIBLE_GARMENT: 'SINGLE_ELIGIBLE_GARMENT',
  UNIQUE_HIGHEST_PRESENTATION: 'UNIQUE_HIGHEST_PRESENTATION',          // every candidate reports Vision prominence and exactly one holds the highest value
  NONE: 'NONE',
});
const AMBIGUITY_CLASSIFICATION = Object.freeze({
  NONE: 'NONE',
  UNRESOLVED_EQUAL_PRESENTATION: 'UNRESOLVED_EQUAL_PRESENTATION',                   // ≥ 2 candidates share the highest reported prominence
  UNRESOLVED_NO_PRESENTATION_EVIDENCE: 'UNRESOLVED_NO_PRESENTATION_EVIDENCE',       // the envelope reports no prominence for the candidates
  UNRESOLVED_PARTIAL_PRESENTATION_EVIDENCE: 'UNRESOLVED_PARTIAL_PRESENTATION_EVIDENCE', // some candidates report prominence, some do not (absence is not lower presentation)
  UNRESOLVED_WITHIN_DECLARED_CATEGORY: 'UNRESOLVED_WITHIN_DECLARED_CATEGORY',       // a declared category / title matches several candidates equally
});
const RESULT_STATUS = Object.freeze(Object.assign({}, P.RESULT_STATUS, { PRODUCT_SELECTION_UNRESOLVED: 'PRODUCT_SELECTION_UNRESOLVED' }));
const UNRESOLVED_CODE = 'PRODUCT_SELECTION_UNRESOLVED';
/* external information that resolves an UNRESOLVED case (diagnostic only — never a customer Reason) */
const RESOLVING_INPUTS = Object.freeze(['user_selection.product_identity.primary_target_id', 'merchandise_metadata.category', 'merchandise_metadata.product_title', 'merchandise_metadata.product_identity (ITEM target or SUIT members)']);

module.exports = { RUNTIME_ID, RUNTIME_STATUS, R1_MERCHANDISE_FIELDS, SELECTION_STATUS, SELECTION_DECISION_BASIS, AMBIGUITY_CLASSIFICATION, RESULT_STATUS, UNRESOLVED_CODE, RESOLVING_INPUTS, P };
