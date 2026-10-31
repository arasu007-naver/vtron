'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — AXIS AUTHORITY REGISTRY (data only, no logic) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING — INTEGRATED RUNTIME V2 IMPLEMENTATION … §8 · §11). Reason: the V1 registry / generic binding cannot
 * resolve the four frozen Item V2 engines (IV2A probe 8 / 8 refused); a versioned V2 registry pins each engine by its FINAL FREEZE authority record.
 * Affected Scope: this file (new). The V1 registry (runtime/axis_binding_contracts.js) is unchanged.
 *
 * Per axis: explicit freeze-record path (relative to the master root) + its sha256 + freeze id + frozen directory + src aggregate + entry module + exported entry
 * function(s) + the module's ENGINE_ID. ⛔ No latest, no glob, no directory scan, no fallback, no caller-selected runtime.
 */
const AXIS_V2_AUTHORITIES = Object.freeze({
  EI: Object.freeze({
    freeze_record: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_EI_V2_FINAL_FREEZE_AUTHORITY_V1.json',
    freeze_record_sha256: '14a5caa0dc6503288203147f0b9800ce59d0e822ac0cf897167fe0ba2ae810d7',
    freeze_id: 'ITEM-EI-V2-FINAL-FREEZE-V1-2026-10-29',
    frozen_directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5/',
    src_aggregate_sha256: '8266b0bac6b1fa3dcfbca3bb9c9bc8634e30010609ffa58f278457865a9ae22b',
    dependency_field: 'runtime_dependencies',
    entry: Object.freeze({ file: 'src/ei_v2_engine.js', engine_id: 'STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5', exports: Object.freeze(['evaluate', 'evaluateDiagnostic']) }),
    serializer: null,
  }),
  TC: Object.freeze({
    freeze_record: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_TC_V2_FINAL_FREEZE_AUTHORITY_V1.json',
    freeze_record_sha256: 'd6560c01d0fcbe15cbcd61a632466cccd784e6e0c13af0706069cde885c6c087',
    freeze_id: 'ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28',
    frozen_directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE/',
    src_aggregate_sha256: 'c340e66f165d908949a167e59801f41928ba8f05f15975bac604807a1c2c8c4f',
    dependency_field: 'runtime_dependencies',
    entry: Object.freeze({ file: 'src/tc_v2_engine.js', engine_id: 'STMX_TC_ENGINE_V2_DIRECTION_REASON', exports: Object.freeze(['evaluateV13Record']) }),
    serializer: Object.freeze({ file: 'src/tc_v2_serializer.js', exports: Object.freeze(['toCustomerOutput']) }),
  }),
  SR: Object.freeze({
    freeze_record: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_SR_V2_FINAL_FREEZE_AUTHORITY_V1.json',
    freeze_record_sha256: '71006214ffaab09a3693d5857df2bcea08dab6d5e91c662d5c7b370a583c6b2b',
    freeze_id: 'ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27',
    frozen_directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE/',
    src_aggregate_sha256: '3bcc45bc4170e11b87c9da0d059f92c9311f2ede3ea925ed52b056da9239c466',
    dependency_field: 'bound_runtime_dependencies',
    entry: Object.freeze({ file: 'src/sr_v2_engine.js', engine_id: 'STMX_SR_ENGINE_V2_DIRECTION_REASON', exports: Object.freeze(['evaluate']) }),
    serializer: null,
  }),
  DM: Object.freeze({
    freeze_record: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_DM_V2_FINAL_FREEZE_AUTHORITY_V1.json',
    freeze_record_sha256: '308059d62e2b3bf8e460cef14bf275781a384fc92c589e2bf0d76ca005ecebab',
    freeze_id: 'ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28',
    frozen_directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_V2_DIRECTION_REASON_CANDIDATE/',
    src_aggregate_sha256: '89a90a0e66fb80a45c7909b11bca10757ec8389c9b9285f3709d1cfc2fcc130e',
    dependency_field: 'bound_runtime_dependencies',
    entry: Object.freeze({ file: 'src/dm_v2_engine.js', engine_id: 'STMX_DM_ENGINE_V2_DIRECTION_REASON', exports: Object.freeze(['evaluate']) }),
    serializer: Object.freeze({ file: 'src/dm_v2_serializer.js', exports: Object.freeze(['toCustomerOutput']) }),
  }),
});

module.exports = { AXIS_V2_AUTHORITIES, REGISTRY_VERSION: 'ITEM_V2_AXIS_AUTHORITIES_V1_CANDIDATE' };
