'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R2 PREDECESSOR PIN (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… CEO-APPROVED SUIT RULE IMPLEMENTATION … §2.1 · §8). Reason: R2 reuses the sealed src/item_v2_r1/ selection + input
 * validation and — through it — the sealed src/item_v2/ evidence adapter, frozen-V2 binding and result composer, unchanged; it may load them only while both
 * directories equal their CANDIDATE seals. Affected Scope: this file (new).
 *
 * Verifies src/item_v2_r1/: seal present · every sealed file's sha256 · directory aggregate + runtime src aggregate == the values pinned here · no unsealed file;
 * then the R1 pin itself verifies src/item_v2/. ⛔ Any drift → PredecessorPinError (fail closed; never a partial load, never a V1 fallback).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PREDECESSOR = Object.freeze({
  directory: path.resolve(__dirname, '..', 'item_v2_r1'),
  seal_file: 'CODE_IDENTITY_SEAL_ITEM_V2_INTEGRATED_RUNTIME_V2_R1_CANDIDATE.json',
  runtime_id: 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_R1_CANDIDATE',
  directory_aggregate_sha256: '6020ab57f3241ab850206a75977d8572a02fac281984b8b051a0edfffd841f96',
  runtime_src_aggregate_sha256: 'e1325e956fe084183417a4d65743cceaf44f90e4ef95363cb0d4c0a3fe244396',
});
class PredecessorPinError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'PredecessorPinError'; this.code = code; } }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const aggregate = (files) => sha(files.map((f) => f.file + ':' + f.sha256 + '\n').sort().join(''));

/** @param {string} [dir] R1 directory (negative controls pass a copy) @param {string} [v2dir] item_v2 directory for the R1 pin @returns {{ verified:true, r1, item_v2 }} */
function verifyPredecessors(dir, v2dir) {
  const d = dir || PREDECESSOR.directory; const sealPath = path.join(d, PREDECESSOR.seal_file);
  if (!fs.existsSync(sealPath)) throw new PredecessorPinError('PREDECESSOR_SEAL_MISSING', 'R1 seal not found');
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  if (seal.runtime_id !== PREDECESSOR.runtime_id) throw new PredecessorPinError('PREDECESSOR_IDENTITY_MISMATCH', 'runtime id ' + seal.runtime_id);
  for (const f of seal.files) { const p = path.join(d, f.file); if (!fs.existsSync(p) || sha(fs.readFileSync(p)) !== f.sha256) throw new PredecessorPinError('PREDECESSOR_FILE_DRIFT', 'item_v2_r1/' + f.file + ' ≠ sealed sha256'); }
  const dirAgg = aggregate(seal.files), srcAgg = aggregate(seal.files.filter((f) => f.file.endsWith('.js') && !f.file.startsWith('tests/')));
  if (dirAgg !== PREDECESSOR.directory_aggregate_sha256 || seal.DIRECTORY_AGGREGATE_SHA256 !== PREDECESSOR.directory_aggregate_sha256) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', 'R1 directory aggregate ' + dirAgg);
  if (srcAgg !== PREDECESSOR.runtime_src_aggregate_sha256 || seal.RUNTIME_SRC_AGGREGATE_SHA256 !== PREDECESSOR.runtime_src_aggregate_sha256) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', 'R1 runtime src aggregate ' + srcAgg);
  const onDisk = fs.readdirSync(d, { recursive: true }).filter((f) => fs.statSync(path.join(d, f)).isFile()).map((f) => f.split(path.sep).join('/'));
  const extra = onDisk.filter((f) => f !== PREDECESSOR.seal_file && !seal.files.some((s) => s.file === f));
  if (extra.length) throw new PredecessorPinError('PREDECESSOR_UNSEALED_FILE', 'item_v2_r1/' + extra.join(', '));
  const v2 = require(path.join(d, 'item_v2_r1_predecessor_pin.js')).verifyPredecessor(v2dir);   /* the sealed R1 pin verifies src/item_v2 (throws its own PredecessorPinError) */
  return { verified: true, r1: { files: seal.files.length, directory_aggregate: dirAgg, runtime_src_aggregate: srcAgg }, item_v2: v2 };
}

module.exports = { PREDECESSOR, PredecessorPinError, verifyPredecessors };
