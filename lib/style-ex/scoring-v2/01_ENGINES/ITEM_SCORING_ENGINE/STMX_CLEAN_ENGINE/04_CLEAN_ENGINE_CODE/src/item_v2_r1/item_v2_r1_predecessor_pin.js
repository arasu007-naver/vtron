'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R1 PREDECESSOR PIN (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… PRIMARY ITEM AUTO-SELECTION CORRECTION … §10 · §11). Reason: R1 reuses the sealed src/item_v2/ binding, evidence
 * adapter, input validation and result composer unchanged; it may load them only while the predecessor files equal their CANDIDATE seal. Affected Scope: this file (new).
 *
 * Verifies: seal file present · every sealed file's sha256 · directory aggregate + runtime src aggregate (rule stated in the seal) == the values pinned here ·
 * no unsealed file in the directory. ⛔ Any drift → PredecessorPinError (fail closed; never a partial load, never a V1 fallback).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PREDECESSOR = Object.freeze({
  directory: path.resolve(__dirname, '..', 'item_v2'),
  seal_file: 'CODE_IDENTITY_SEAL_ITEM_V2_INTEGRATED_RUNTIME_V1_CANDIDATE.json',
  runtime_id: 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_CANDIDATE',
  directory_aggregate_sha256: '519dacaa99ec5134535a7cf647a47b90bce8eaa422685a43d28386dd20c0cc40',
  runtime_src_aggregate_sha256: '297f40d31c6c3f2d88e99c1a34a71103c5a02e5d8ed4aa00ba6362ae12a5102f',
});
class PredecessorPinError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'PredecessorPinError'; this.code = code; } }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const aggregate = (files) => sha(files.map((f) => f.file + ':' + f.sha256 + '\n').sort().join(''));

/** @param {string} [dir] predecessor directory (negative controls pass a copy) @returns {{ verified:true, files:number, directory_aggregate, runtime_src_aggregate }} */
function verifyPredecessor(dir) {
  const d = dir || PREDECESSOR.directory; const sealPath = path.join(d, PREDECESSOR.seal_file);
  if (!fs.existsSync(sealPath)) throw new PredecessorPinError('PREDECESSOR_SEAL_MISSING', 'predecessor seal not found');
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  if (seal.runtime_id !== PREDECESSOR.runtime_id) throw new PredecessorPinError('PREDECESSOR_IDENTITY_MISMATCH', 'runtime id ' + seal.runtime_id);
  for (const f of seal.files) { const p = path.join(d, f.file); if (!fs.existsSync(p) || sha(fs.readFileSync(p)) !== f.sha256) throw new PredecessorPinError('PREDECESSOR_FILE_DRIFT', f.file + ' ≠ sealed sha256'); }
  const dirAgg = aggregate(seal.files), srcAgg = aggregate(seal.files.filter((f) => f.file.endsWith('.js') && !f.file.startsWith('tests/')));
  if (dirAgg !== PREDECESSOR.directory_aggregate_sha256 || seal.DIRECTORY_AGGREGATE_SHA256 !== PREDECESSOR.directory_aggregate_sha256) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', 'directory aggregate ' + dirAgg);
  if (srcAgg !== PREDECESSOR.runtime_src_aggregate_sha256 || seal.RUNTIME_SRC_AGGREGATE_SHA256 !== PREDECESSOR.runtime_src_aggregate_sha256) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', 'runtime src aggregate ' + srcAgg);
  const onDisk = fs.readdirSync(d, { recursive: true }).filter((f) => fs.statSync(path.join(d, f)).isFile()).map((f) => f.split(path.sep).join('/'));
  const extra = onDisk.filter((f) => f !== PREDECESSOR.seal_file && !seal.files.some((s) => s.file === f));
  if (extra.length) throw new PredecessorPinError('PREDECESSOR_UNSEALED_FILE', extra.join(', '));
  return { verified: true, files: seal.files.length, directory_aggregate: dirAgg, runtime_src_aggregate: srcAgg };
}

module.exports = { PREDECESSOR, PredecessorPinError, verifyPredecessor };
