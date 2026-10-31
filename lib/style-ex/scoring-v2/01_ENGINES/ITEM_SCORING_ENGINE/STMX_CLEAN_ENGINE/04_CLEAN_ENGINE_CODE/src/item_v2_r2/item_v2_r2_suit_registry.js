'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R2 SUIT SUCCESSOR REGISTRY (data only, no logic) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (… CEO-APPROVED SUIT RULE IMPLEMENTATION … §2.2 · §8.1). Reason: the integrated runtime may delegate a valid Suit only
 * to the axis-owned TC / SR / DM Suit successors, each pinned by its own CANDIDATE code-identity seal (directory aggregate) and its frozen parent. EI has no
 * Suit successor: the frozen EI V2 ITEM_PRODUCT Suit path is used (predecessor binding). Affected Scope: this file (new).
 *
 * Per axis: explicit directory (relative to the master root) + seal file + pinned directory aggregate + entry module + export + ENGINE_ID + frozen parent id.
 * ⛔ No latest, no glob, no directory scan, no fallback, no caller-selected runtime. A successor change requires a new seal AND a new registry version.
 */
const SUIT_SUCCESSORS = Object.freeze({
  TC: Object.freeze({
    directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/',
    seal_file: 'CODE_IDENTITY_SEAL_STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE.json',
    directory_aggregate_sha256: '7bea12b478e3231d7954b5ed73f58b2ec25a8036092ca781e5a198f2606481c7',
    entry: Object.freeze({ file: 'src/tc_v2_suit_engine.js', engine_id: 'STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1', exports: Object.freeze(['evaluateSuit']) }),
    frozen_parent: 'ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28',
  }),
  SR: Object.freeze({
    directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/',
    seal_file: 'CODE_IDENTITY_SEAL_STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE.json',
    directory_aggregate_sha256: '09807059fcf7c0620d2326a38d562f7c78914af8302ef95258d21928543ebef8',
    entry: Object.freeze({ file: 'src/sr_v2_suit_engine.js', engine_id: 'STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1', exports: Object.freeze(['evaluateSuit']) }),
    frozen_parent: 'ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27',
  }),
  DM: Object.freeze({
    directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/',
    seal_file: 'CODE_IDENTITY_SEAL_STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE.json',
    directory_aggregate_sha256: '65cd173afb34c6185633d878d2bde081cb19d07ab1e09e157b4acd3acce9f39f',
    entry: Object.freeze({ file: 'src/dm_v2_suit_engine.js', engine_id: 'STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1', exports: Object.freeze(['evaluateSuit']) }),
    frozen_parent: 'ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28',
  }),
});

module.exports = { SUIT_SUCCESSORS, REGISTRY_VERSION: 'ITEM_V2_SUIT_SUCCESSORS_V1_CANDIDATE' };
