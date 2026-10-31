'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R3 CONTRACTS (data only, no logic) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — SUIT DM INCOMPLETE ROOT-CAUSE RESOLUTION, INTEGRATED RUNTIME CONTRACT CORRECTION … §4 CLASS D ·
 * §5 · §7 · §8). Reason: two proven defects of the sealed src/item_v2_r2/ (seal 6d3d7772…, not modified in place):
 *   (1) RESULT-STATE SEPARATION — a selected target whose Vision record fails the Item Vision V1.3 DM observation requiredness gate (validator error
 *       DM_OBSERVATION_BLOCK_REQUIRED: a pre-DM-layer Producer V1 record) is reported as a scoring result INCOMPLETE with three customer Directions, instead of
 *       being classified at the input-validation boundary (order §4 CLASS D · §5).
 *   (2) PRIMARY SELECTION POLICY — R1 still auto-selects a garment by unique highest Vision prominence among several eligible garments (order §8: several viable
 *       merchandise targets and no authoritative identity → user selection).
 * Affected Scope: src/item_v2_r3/ (new). Scoring is delegated UNCHANGED to the sealed R2 runtime (four frozen V2 engines · three Suit successors).
 *
 * ⚠ CANDIDATE integration vocabulary (Canonical Dictionary registration required before any freeze): INPUT_CONTRACT_NONCONFORMING · VISION_INPUT_NOT_V1_3_CONFORMING ·
 *   UNRESOLVED_MULTIPLE_PRODUCT_CANDIDATES · input_contract. Everything else is the R2 / R1 / item_v2 vocabulary, reused unchanged.
 */
const R2C = require('../item_v2_r2/item_v2_r2_contracts');
const R1 = R2C.R1, P = R2C.P;

const RUNTIME_ID = 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_R3_CANDIDATE';
const RUNTIME_STATUS = 'CANDIDATE — not production · not frozen (CEO order 2026-10-29: contract correction + offline regression only)';

const VISION_CONTRACT_ID = 'STMX_VISION_PRODUCER_V1_3';
/* the V1.3 gate applied: the DM observation requiredness / shape gate (validateDmObservation) of the frozen V1.3 validator — a gate SEPARATE from the 37-parameter
   completeness gate (producer_rules_v1.js DM_OBSERVATION_REQUIRED). Field-level parameter findings are NOT a conformance failure: they stay partial evidence
   decided by the frozen V2 engines (field-level salvage), exactly as before. */
const INPUT_CONTRACT_GATE = 'V1_3_DM_OBSERVATION_GATE';
const CONFORMANCE = Object.freeze({ CONFORMING: 'CONFORMING', NONCONFORMING: 'NONCONFORMING' });
const RESULT_STATUS = Object.freeze(Object.assign({}, R1.RESULT_STATUS, { INPUT_CONTRACT_NONCONFORMING: 'INPUT_CONTRACT_NONCONFORMING' }));
const INPUT_ISSUE_NONCONFORMING = 'VISION_INPUT_NOT_V1_3_CONFORMING';
const AMBIGUITY_MULTIPLE = 'UNRESOLVED_MULTIPLE_PRODUCT_CANDIDATES';   // several eligible garments, no authoritative identity — prominence never decides

module.exports = { RUNTIME_ID, RUNTIME_STATUS, VISION_CONTRACT_ID, INPUT_CONTRACT_GATE, CONFORMANCE, RESULT_STATUS, INPUT_ISSUE_NONCONFORMING, AMBIGUITY_MULTIPLE, R2C, R1, P };
