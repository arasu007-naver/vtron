'use strict';
/*
 * STMX Clean Engine — AXIS BINDING CONTRACT REGISTRY (runtime contract registry · data only, no logic).
 * Authority: Blueprint Deliverable 3a §4 · G42-A (CEO 2026-09-23 · STMX TC MAINLINE V2.3.46). CANDIDATE.
 * Per axis: explicit authority record (path relative to the master root) · expected identity · authority status ·
 * entry · invocation shape · input contract · score output. No rule, no threshold, no expected result, no item answer.
 * ⛔ No "latest", no glob, no directory scan, no fallback: an axis without an entry here is not bound.
 * EI / DM / SR are intentionally absent — their migration is separately staged (V2.3.45 28_ phase E).
 *   [SUPERSEDED 2026-09-27 — STMX ITEM SCORING ENGINE V1: EI · SR · DM are bound below; see the last Approval Anchor.]
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX TC MAINLINE V2.3.91 · D-91-1). Reason: TC engine integration — the TC entry is
 * rebound from the V2.3.43 Step 4 runtime to the integrated TC runtime (frozen Direction → Strength status → ordinal projector V1).
 * Rebinding in place follows the V2.3.45 transition design (rollback = restore the registry entry); the V2.3.46 bytes are preserved at
 * 04_GOVERNANCE_AND_FINAL_DOCS/STMX_TC_MAINLINE_V2_3_91_TC_ENGINE_INTEGRATION/prototypes/historical/axis_binding_contracts_V2_3_46.js.
 * Affected Scope: this file (TC entry + REGISTRY_VERSION only) · successor seal CODE_IDENTITY_SEAL_AXIS_RUNTIME_BINDING_V2_CANDIDATE.json.
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX TC MAINLINE V2.3.92 §16–§17 · TC FINAL FREEZE). Reason: production promotion — the
 * verified integrated TC runtime becomes the canonical TC production authority (STMX_TC_ENGINE_V1); same runtime, same code identity,
 * D-91-1 single-entry architecture preserved. The V2.3.91 bytes of this file are preserved at
 * 04_GOVERNANCE_AND_FINAL_DOCS/STMX_TC_MAINLINE_V2_3_92_TC_FINAL_FREEZE_AND_PRODUCTION_PROMOTION/prototypes/historical/axis_binding_contracts_V2_3_91.js.
 * Affected Scope: this file (TC authority_record path + authority_status + REGISTRY_VERSION only) · CODE_IDENTITY_SEAL_AXIS_RUNTIME_BINDING_V3_PRODUCTION.json.
 * The TC entry is FROZEN (TC Final Freeze V1): changing it requires an explicit TC REOPEN DECISION.
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D1 · D3 · D7 · §8–§19).
 * Reason: complete the approved P2 phase E — EI, SR and DM join TC in this single registry. EI binds its EI-owned production
 * integration successor (sealed, CANDIDATE); SR binds its existing production pointer unchanged; DM binds its DM-local entry
 * adapter (sealed, CANDIDATE, delegation only). A CANDIDATE entry executes only in SHADOW mode (generic binding rule, unchanged).
 * The pre-integration bytes of this file are preserved at
 * 04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SCORING_ENGINE_V1_FOUR_AXIS_PRODUCTION_INTEGRATION/prototypes/historical/axis_binding_contracts_V3_PRODUCTION_PRE_INTEGRATION.js.
 * Affected Scope: this file (EI · SR · DM entries + REGISTRY_VERSION only; the TC entry is byte-unchanged) · CODE_IDENTITY_SEAL_AXIS_RUNTIME_BINDING_V4_INTEGRATED_CANDIDATE.json.
 *
 * Approval Anchor — CEO Decision 2026-09-27 (STMX ITEM SCORING ENGINE V1 — FINAL FREEZE + PRODUCTION PROMOTION · Decision 1 · §17–§18).
 * Reason: production promotion of the verified four-axis composition. The EI and DM entries now bind the PRODUCTION seals of the same
 * sealed files (same code identities fd161703… · 6f1e3b0d…) with authority_status PRODUCTION; the TC and SR entries are unchanged.
 * The pre-promotion bytes of this file are preserved at
 * 04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SCORING_ENGINE_V1_FINAL_FREEZE_AND_PRODUCTION_PROMOTION/prototypes/pre_promotion_bytes/.
 * Affected Scope: this file (EI + DM authority_record path · authority_status · REGISTRY_VERSION) · CODE_IDENTITY_SEAL_AXIS_RUNTIME_BINDING_V5_PRODUCTION.json.
 * All four entries are FROZEN (STMX ITEM SCORING ENGINE V1 Final Freeze): changing any of them requires an explicit reopen decision.
 */
const AXIS_BINDING_CONTRACTS = Object.freeze({
  TC: Object.freeze({
    axis: 'TC',
    authority_record: Object.freeze({
      kind: 'CODE_IDENTITY_SEAL',
      path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_INTEGRATED_RUNTIME_V1_CANDIDATE/CODE_IDENTITY_SEAL_TC_INTEGRATED_RUNTIME_V1_PRODUCTION.json',
      identity_field: 'CODE_IDENTITY_AGGREGATE_SHA256',
    }),
    expected_identity: '88e6982f13efc409a7e5c45e6952f6c65989fd8e7fd98875eda7b4f3f830a21d',
    runtime_id: 'STMX_TC_INTEGRATED_RUNTIME_V1_CANDIDATE',
    authority_status: 'PRODUCTION',
    entry: Object.freeze({ file: 'src/tc_integrated_runtime_v1.js', runtime_id_export: 'RUNTIME_ID' }),
    invocation: Object.freeze({ export: 'runCorpus', call: 'CORPUS', collection: 'units', key: 'anchor_id' }),
    input_contract: Object.freeze({ required: Object.freeze(['anchor_id']) }),
    score_output: 'score',
    bound_contracts_record: 'BOUND_INPUTS.json',
  }),
  EI: Object.freeze({
    axis: 'EI',
    authority_record: Object.freeze({
      kind: 'CODE_IDENTITY_SEAL',
      path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_PRODUCTION_INTEGRATION_V1_CANDIDATE/CODE_IDENTITY_SEAL_EI_PRODUCTION_INTEGRATION_V1_PRODUCTION.json',
      identity_field: 'CODE_IDENTITY_AGGREGATE_SHA256',
    }),
    expected_identity: 'fd1617037ce09fef6a05e2288e7584bdd92b26337a22ca44fc1cef37f3c0a401',
    runtime_id: 'STMX_EI_PRODUCTION_INTEGRATION_V1_CANDIDATE',
    authority_status: 'PRODUCTION',
    entry: Object.freeze({ file: 'src/ei_production_integration_v1.js', runtime_id_export: 'RUNTIME_ID' }),
    invocation: Object.freeze({ export: 'evaluateEI', call: 'ARGS', args: Object.freeze(['unit']) }),
    input_contract: Object.freeze({ required: Object.freeze(['unit']) }),
    score_output: 'ei_numeric',
    bound_contracts_record: 'BOUND_INPUTS.json',
  }),
  SR: Object.freeze({
    axis: 'SR',
    authority_record: Object.freeze({
      kind: 'PRODUCTION_AUTHORITY_POINTER',
      path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json',
      identity_field: 'full_identity_sha256',
      block: '★_current_production_sr_engine',
    }),
    expected_identity: '59ea6dfdcca30ba8813a06733069daf9efab917df6b5103717d7cb334aebf1e3',
    runtime_id: 'STMX_SR_ENGINE_V1',
    authority_status: 'PRODUCTION',
    entry: Object.freeze({ runtime_id_export: 'ENGINE_ID' }),
    invocation: Object.freeze({ export: 'evaluateSR', call: 'ARGS', args: Object.freeze(['record', 'meta']) }),
    input_contract: Object.freeze({ required: Object.freeze(['record', 'meta']) }),
    score_output: 'score',
  }),
  DM: Object.freeze({
    axis: 'DM',
    authority_record: Object.freeze({
      kind: 'CODE_IDENTITY_SEAL',
      path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ITEM_ENTRY_ADAPTER_V1_CANDIDATE/CODE_IDENTITY_SEAL_DM_ITEM_ENTRY_ADAPTER_V1_PRODUCTION.json',
      identity_field: 'CODE_IDENTITY_AGGREGATE_SHA256',
    }),
    expected_identity: '6f1e3b0d879a6f2b0fab32cea6bf1bdc5f908309be88f10e61a6373995bd0f81',
    runtime_id: 'STMX_DM_ITEM_ENTRY_ADAPTER_V1_CANDIDATE',
    authority_status: 'PRODUCTION',
    entry: Object.freeze({ file: 'src/dm_item_entry_adapter_v1.js', runtime_id_export: 'RUNTIME_ID' }),
    invocation: Object.freeze({ export: 'evaluateDm', call: 'ARGS', args: Object.freeze(['dm_designed_detail_evidence']) }),
    input_contract: Object.freeze({ required: Object.freeze(['dm_designed_detail_evidence']) }),
    score_output: 'ordinal_tier',
    bound_contracts_record: 'BOUND_INPUTS.json',
  }),
});

module.exports = { AXIS_BINDING_CONTRACTS, REGISTRY_VERSION: 'AXIS_BINDING_CONTRACTS_V5_PRODUCTION' };
