'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — INPUT / RESULT CONTRACTS (data only, no logic) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING — INTEGRATED RUNTIME V2 IMPLEMENTATION … §1 · §5 · §9).
 * Reason: one governed, non-scoring Item V2 input contract (user selection → merchandise identity → automatic Primary fallback) and one result contract
 * (four Directions + four Korean Reasons). Affected Scope: this file (new) and the other files of src/item_v2/ (new). No V1 file changes.
 *
 * ⛔ No axis rule, threshold, weight or score lives here. Existing authority names are reused: product_identity { merchandise_type ITEM | SUIT,
 *    primary_target_id, suit_component_target_ids } (EI V2 R4 / R5 ITEM_PRODUCT) · Vision V1.3 envelope / record · Colour V1 color_observation.
 * ⚠ The container / status names below are CANDIDATE integration vocabulary — Canonical Dictionary registration is required before any freeze.
 */
const RUNTIME_ID = 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_CANDIDATE';
const RUNTIME_STATUS = 'CANDIDATE — not production · not frozen (CEO order 2026-10-29: implementation + regression only)';
const INPUT_CONTRACT_ID = 'STMX_ITEM_V2_INPUT_CONTRACT_V1_CANDIDATE';
const RESULT_CONTRACT_ID = 'STMX_ITEM_V2_RESULT_CONTRACT_V1_CANDIDATE';

const INPUT_FIELDS = Object.freeze({
  image_reference: 'optional string — echoed into provenance, never read for selection or scoring',
  user_selection: 'optional { product_identity?: { merchandise_type: ITEM | SUIT, primary_target_id?, suit_component_target_ids? }, category? } — the user’s product (highest precedence)',
  merchandise_metadata: 'optional { product_identity?, category? } — authoritative upstream merchandise input (second precedence)',
  vision_envelope: 'required — one Item Vision Producer V1.3 envelope { image_id, targets[{ target_id, role, eligible, prominence?, record? }], relationships? }',
  colour_observations: 'optional { <target_id>: Colour V1 color_observation } — governed Colour V1 evidence for targets of THIS envelope only',
});

const AXES = Object.freeze(['EI', 'TC', 'SR', 'DM']);   // canonical axis order EI → TC → SR → DM (output order only; no cross-axis dependency)
const CUSTOMER_TOKENS = Object.freeze({ EI: Object.freeze(['E', 'I', 'NEUTRAL']), TC: Object.freeze(['CLASSIC', 'TRANSFORMATIVE']), SR: Object.freeze(['S', 'R']), DM: Object.freeze(['D', 'M']) });

const SELECTION_SOURCE = Object.freeze({ USER: 'USER', MERCHANDISE_METADATA: 'MERCHANDISE_METADATA', AUTOMATIC_FALLBACK: 'AUTOMATIC_FALLBACK' });
const SELECTION_STATUS = Object.freeze({
  VALID: 'VALID',
  AUTOMATIC_UNAMBIGUOUS: 'AUTOMATIC_UNAMBIGUOUS',   // exactly one candidate after the evidence rules
  AUTOMATIC_AMBIGUOUS: 'AUTOMATIC_AMBIGUOUS',       // several equally supported candidates; deterministic tie rule applied and disclosed
});
const INPUT_ISSUE = Object.freeze({   // invalid PRODUCT INPUT — never confused with partial Vision evidence
  MALFORMED_REQUEST: 'MALFORMED_REQUEST',
  NO_VISION_ENVELOPE: 'NO_VISION_ENVELOPE',
  NO_IDENTIFIABLE_MERCHANDISE_GARMENT: 'NO_IDENTIFIABLE_MERCHANDISE_GARMENT',
  EXPLICIT_TARGET_NOT_FOUND: 'EXPLICIT_TARGET_NOT_FOUND',
  EXPLICIT_TARGET_NOT_SCORABLE: 'EXPLICIT_TARGET_NOT_SCORABLE',
  EXPLICIT_CATEGORY_NOT_FOUND: 'EXPLICIT_CATEGORY_NOT_FOUND',
  SUIT_MEMBER_ASSOCIATION_FAILED: 'SUIT_MEMBER_ASSOCIATION_FAILED',
  COLOUR_TARGET_NOT_IN_ENVELOPE: 'COLOUR_TARGET_NOT_IN_ENVELOPE',
});

const AXIS_OUTCOME = Object.freeze({
  DIRECTION: 'DIRECTION',                                           // the frozen axis returned its governed Direction (+ its Reason)
  AXIS_INPUT_REJECTED: 'AXIS_INPUT_REJECTED',                       // the frozen axis itself rejected the evidence (EI TECHNICAL_INVALID_REQUEST · TC CONTRACT_ERROR · SR SRV2TransportError · DM TRANSPORT_ERROR)
  SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS: 'SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS', // the frozen axis has no whole-Suit entry (order §10.5) — no member result is substituted
  BINDING_FAILURE: 'BINDING_FAILURE',                               // the pinned authority failed verification — fail closed, never a V1 fallback
  EXECUTION_FAILURE: 'EXECUTION_FAILURE',                           // the frozen entry threw an unexpected error (recorded, never converted into a Direction)
  NOT_EXECUTED: 'NOT_EXECUTED',                                     // invalid product input: no axis executed
});
const RESULT_STATUS = Object.freeze({ COMPLETE: 'COMPLETE', INCOMPLETE: 'INCOMPLETE', INVALID_PRODUCT_INPUT: 'INVALID_PRODUCT_INPUT' });

const RESULT_FIELDS = Object.freeze({
  contract: RESULT_CONTRACT_ID,
  result_status: 'COMPLETE (four Directions) · INCOMPLETE (at least one axis without a Direction — named, never hidden) · INVALID_PRODUCT_INPUT',
  customer_output: '{ EI:{direction,reason}, TC:{direction,reason}, SR:{direction,reason}, DM:{direction,reason} } — exact frozen tokens and Reasons; an axis without a Direction carries null + is listed in incomplete_axes',
  incomplete_axes: '[{ axis, outcome, code }]',
  internal: 'NOT customer-facing: selection_trace · evidence_coverage · axis_diagnostics (EI underlying / Neutral eligibility, axis error codes) · provenance (frozen identities)',
});
const FORBIDDEN_CUSTOMER_KEYS = Object.freeze(['score', 'numeric', 'strength', 'ordinal', 'tier', 'style_id', 'code', 'direction_code', 'underlying', 'confidence']);

module.exports = { RUNTIME_ID, RUNTIME_STATUS, INPUT_CONTRACT_ID, RESULT_CONTRACT_ID, INPUT_FIELDS, AXES, CUSTOMER_TOKENS, SELECTION_SOURCE, SELECTION_STATUS, INPUT_ISSUE, AXIS_OUTCOME, RESULT_STATUS, RESULT_FIELDS, FORBIDDEN_CUSTOMER_KEYS };
