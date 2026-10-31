'use strict';
/*
 * STMX TC ENGINE V2 — SUIT SUCCESSOR V1 · FROZEN PARENT PIN (non-scoring) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … §0.1 · §2.1 · §8.1). Reason: the TC Suit successor reuses
 * the FINAL FROZEN TC V2 engine unchanged; it may load it only while the freeze record, every frozen directory file and every pinned runtime dependency equal
 * their frozen sha256. Affected Scope: this file (new). The frozen TC V2 directory is never written.
 *
 * ⛔ No latest / glob / scan / fallback. Any drift → TCSuitParentPinError (fail closed before a frozen module is loaded).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MASTER_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PARENT = Object.freeze({
  freeze_record: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_TC_V2_FINAL_FREEZE_AUTHORITY_V1.json',
  freeze_record_sha256: 'd6560c01d0fcbe15cbcd61a632466cccd784e6e0c13af0706069cde885c6c087',
  freeze_id: 'ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28',
  frozen_directory: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE/',
  src_aggregate_sha256: 'c340e66f165d908949a167e59801f41928ba8f05f15975bac604807a1c2c8c4f',
  dependency_field: 'runtime_dependencies',
  engine_id: 'STMX_TC_ENGINE_V2_DIRECTION_REASON',
});
class TCSuitParentPinError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'TCSuitParentPinError'; this.code = code; } }
const fail = (code, msg) => { throw new TCSuitParentPinError(code, msg); };
const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function inside(root, rel, what) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || /[*?]/.test(rel)) fail('PARENT_AUTHORITY_INVALID', what + ' must be an explicit relative path');
  const base = path.resolve(root); const abs = path.resolve(base, rel); if (!abs.startsWith(base + path.sep)) fail('PARENT_AUTHORITY_INVALID', what + ' escapes the governed root'); return abs;
}

/** @param {string} [root] master root (a restore test passes its capsule root) @returns frozen identity + absolute frozen directory */
function verifyParent(root) {
  const base = root || MASTER_ROOT;
  const recAbs = inside(base, PARENT.freeze_record, 'freeze record');
  if (!fs.existsSync(recAbs)) fail('PARENT_FREEZE_RECORD_MISSING', 'TC V2 freeze record missing');
  if (sha256File(recAbs) !== PARENT.freeze_record_sha256) fail('PARENT_FREEZE_RECORD_DRIFT', 'TC V2 freeze record bytes ≠ pinned sha256');
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

module.exports = { PARENT, verifyParent, TCSuitParentPinError, MASTER_ROOT };
