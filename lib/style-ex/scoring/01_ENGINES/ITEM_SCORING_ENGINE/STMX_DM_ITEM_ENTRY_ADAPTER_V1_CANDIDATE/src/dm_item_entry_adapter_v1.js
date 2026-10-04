'use strict';
/**
 * STMX DM — ITEM ENTRY ADAPTER V1 (DM-local · delegation only · CANDIDATE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-27 · Order: STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D7 · §16–§18
 *   Reason:         The DM production pointer resolves by name, but its binding module exposes the frozen scorer as
 *                   engine.evaluateDm, one level deeper than the Clean Engine generic binding invokes. DM adapts locally;
 *                   the shared generic binding is not changed.
 *   Affected Scope: STMX_DM_ITEM_ENTRY_ADAPTER_V1_CANDIDATE/ (new) · Clean Engine registry DM entry. ⛔ No DM engine,
 *                   binding, pointer or seal file is modified.
 *
 *   generic binding → evaluateDm(dm_designed_detail_evidence) → frozen STMX_DM_ENGINE_V1 binding → engine.evaluateDm(block)
 *
 * ⛔ DELEGATION ONLY: the argument is passed through unchanged and the frozen result is returned unchanged.
 *    No admission, direction, strength, tier, notation, default or repair lives here.
 * ★ At load: the bound DM files are re-hashed against BOUND_INPUTS.json, the pointer must name STMX_DM_ENGINE_V1, and the
 *   frozen binding's own verifyFrozenBaseline() must report no drift and the pointer's full identity. Any failure throws.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const PKG_DIR = path.resolve(__dirname, '..');
const ISE = path.resolve(PKG_DIR, '..');
const ROOT = path.resolve(ISE, '..', '..');

const RUNTIME_ID = 'STMX_DM_ITEM_ENTRY_ADAPTER_V1_CANDIDATE';
const DM_POINTER = '01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_PRODUCTION_AUTHORITY_V1.json';
const DM_BLOCK = '★_current_production_dm_engine';

function fail(code, message) { const e = new Error(code + ': ' + message + ' ⛔ FAIL CLOSED.'); e.code = code; throw e; }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const bound = JSON.parse(fs.readFileSync(path.join(PKG_DIR, 'BOUND_INPUTS.json'), 'utf8'));
const drift = bound.inputs.filter((i) => { const abs = path.join(ROOT, i.file); return !fs.existsSync(abs) || sha(abs) !== i.sha256; }).map((i) => i.file);
if (drift.length) fail('DM_BOUND_INPUT_DRIFT', 'bound DM file(s) changed: ' + drift.join(', '));

const pointer = JSON.parse(fs.readFileSync(path.join(ROOT, DM_POINTER), 'utf8'))[DM_BLOCK];
if (!pointer || pointer.id !== 'STMX_DM_ENGINE_V1') fail('DM_AUTHORITY_UNRESOLVED', 'the DM production pointer does not name STMX_DM_ENGINE_V1');
const DM = require(path.join(ROOT, pointer.binding_file));
if (DM.ENGINE_ID !== pointer.id) fail('DM_AUTHORITY_MISMATCH', 'binding ENGINE_ID ' + DM.ENGINE_ID + ' ≠ ' + pointer.id);
const baseline = DM.verifyFrozenBaseline();
if (!baseline.checked || baseline.ok !== true || baseline.full_identity_sha256 !== pointer.full_identity_sha256) fail('DM_FROZEN_BASELINE_DRIFT', 'verifyFrozenBaseline ok=' + baseline.ok + ' drift=' + (baseline.drift || []).join(','));

/** @param {object} dmDesignedDetailEvidence the governed Producer V1_3 DM observation block (dm_designed_detail_evidence) */
function evaluateDm(dmDesignedDetailEvidence) { return DM.engine.evaluateDm(dmDesignedDetailEvidence); }

module.exports = { RUNTIME_ID, ENGINE_ID: DM.ENGINE_ID, FULL_IDENTITY_SHA256: pointer.full_identity_sha256, evaluateDm };
