'use strict';
/*
 * STMX SR ENGINE V2 — SUIT SUCCESSOR V1 · FROZEN PARENT PIN (non-scoring) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … §0.1 · §2.1 · §8.1). Reason: the SR Suit successor reuses
 * the FINAL FROZEN SR V2 engine unchanged; it may load it only while the freeze record, every frozen directory file and every bound runtime dependency equal
 * their frozen sha256. Affected Scope: this file (new). The frozen SR V2 directory is never written.
 *
 * ⛔ No latest / glob / scan / fallback. Any drift → SRSuitParentPinError (fail closed before a frozen module is loaded).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MASTER_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PARENT = Object.freeze({
  freeze_record: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_SR_V2_FINAL_FREEZE_AUTHORITY_V1.json',
  freeze_record_sha256: '71006214ffaab09a3693d5857df2bcea08dab6d5e91c662d5c7b370a583c6b2b',
  freeze_id: 'ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27',
  frozen_directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE/',
  src_aggregate_sha256: '3bcc45bc4170e11b87c9da0d059f92c9311f2ede3ea925ed52b056da9239c466',
  dependency_field: 'bound_runtime_dependencies',
  engine_id: 'STMX_SR_ENGINE_V2_DIRECTION_REASON',
});
class SRSuitParentPinError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'SRSuitParentPinError'; this.code = code; } }
const fail = (code, msg) => { throw new SRSuitParentPinError(code, msg); };
const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function inside(root, rel, what) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || /[*?]/.test(rel)) fail('PARENT_AUTHORITY_INVALID', what + ' must be an explicit relative path');
  const base = path.resolve(root); const abs = path.resolve(base, rel); if (!abs.startsWith(base + path.sep)) fail('PARENT_AUTHORITY_INVALID', what + ' escapes the governed root'); return abs;
}

/** @param {string} [root] master root (a restore test passes its capsule root) @returns frozen identity + absolute frozen directory */
function verifyParent(root) {
  const base = root || MASTER_ROOT;
  const recAbs = inside(base, PARENT.freeze_record, 'freeze record');
  if (!fs.existsSync(recAbs)) fail('PARENT_FREEZE_RECORD_MISSING', 'SR V2 freeze record missing');
  if (sha256File(recAbs) !== PARENT.freeze_record_sha256) fail('PARENT_FREEZE_RECORD_DRIFT', 'SR V2 freeze record bytes ≠ pinned sha256');
  const rec = JSON.parse(fs.readFileSync(recAbs, 'utf8'));
  if (rec.freeze_id !== PARENT.freeze_id) fail('PARENT_VERSION_MISMATCH', 'freeze id ' + rec.freeze_id);
  if (!rec.engine || rec.engine.frozen_directory !== PARENT.frozen_directory || rec.engine.src_aggregate_sha256 !== PARENT.src_aggregate_sha256) fail('PARENT_VERSION_MISMATCH', 'frozen directory / src aggregate ≠ pinned');
  const dir = inside(base, PARENT.frozen_directory, 'frozen directory'); const files = rec.engine.directory_files || [];
  if (!files.length) fail('PARENT_AUTHORITY_INVALID', 'freeze record lists no directory files');
  for (const f of files) { const abs = inside(dir, f.file, 'frozen file'); if (!fs.existsSync(abs) || sha256File(abs) !== f.sha256) fail('PARENT_SEAL_DRIFT', 'frozen file ' + f.file + ' missing or changed'); }
  const deps = rec[PARENT.dependency_field] || [];
  for (const d of deps) { const abs = inside(base, d.path, 'runtime dependency'); if (!fs.existsSync(abs) || sha256File(abs) !== d.sha256) fail('PARENT_DEPENDENCY_DRIFT', 'runtime dependency ' + d.path + ' missing or changed'); }
  return Object.freeze({ freeze_id: rec.freeze_id, freeze_record: PARENT.freeze_record, src_aggregate_sha256: PARENT.src_aggregate_sha256, frozen_files_verified: files.length, runtime_dependencies_verified: deps.length, dir });
}

module.exports = { PARENT, verifyParent, SRSuitParentPinError, MASTER_ROOT };
