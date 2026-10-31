'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R3 PREDECESSOR + VISION-VALIDATOR PIN (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… SUIT DM INCOMPLETE ROOT-CAUSE RESOLUTION … §7). Reason: R3 delegates scoring to the sealed src/item_v2_r2/ and reads
 * the frozen Item Vision V1.3 validator; both may be loaded only while they equal their pinned identities. Affected Scope: this file (new).
 *
 * Verifies src/item_v2_r2/ (seal present · every sealed file · directory + runtime src aggregate == pinned · no unsealed file), then the sealed R2 pin (which
 * verifies item_v2_r1 → item_v2), then the two frozen V1.3 files the DM observation gate loads (validator + rules). ⛔ Any drift → PredecessorPinError (fail closed).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PREDECESSOR = Object.freeze({
  directory: path.resolve(__dirname, '..', 'item_v2_r2'),
  seal_file: 'CODE_IDENTITY_SEAL_ITEM_V2_INTEGRATED_RUNTIME_V2_R2_CANDIDATE.json',
  runtime_id: 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_R2_CANDIDATE',
  directory_aggregate_sha256: '6d3d77722e252222b234fdcd44dbab04e264891d1cb8df5b9c42d7f6f74581e7',
  runtime_src_aggregate_sha256: 'd64e1a3073c3fad84c6221bd3ae7bd9244af7772e4b734321353c551b4048c93',
});
const MASTER_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const VISION_V1_3 = Object.freeze({
  directory: '01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/',
  files: Object.freeze([
    Object.freeze({ file: 'producer_validator_v1.js', sha256: '26ad25a8a2b3477e83f4858ec5fe6450040025a26a2efab9bb4599d8416e2d81' }),
    Object.freeze({ file: 'producer_rules_v1.js', sha256: 'c22e59140deecb7ecc8a0adeec3f95694567b3e8965457283a931df91b2f7bad' }),
  ]),
  entry: 'producer_validator_v1.js', export: 'validateDmObservation',
});
class PredecessorPinError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'PredecessorPinError'; this.code = code; } }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const aggregate = (files) => sha(files.map((f) => f.file + ':' + f.sha256 + '\n').sort().join(''));

/** @param {{ r2Dir?, r1Dir?, predecessorDir?, root? }} [o] (negative controls pass copies) */
function verifyPredecessors(o) {
  const opt = o || {}; const d = opt.r2Dir || PREDECESSOR.directory; const sealPath = path.join(d, PREDECESSOR.seal_file);
  if (!fs.existsSync(sealPath)) throw new PredecessorPinError('PREDECESSOR_SEAL_MISSING', 'R2 seal not found');
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  if (seal.engine_id !== PREDECESSOR.runtime_id) throw new PredecessorPinError('PREDECESSOR_IDENTITY_MISMATCH', 'runtime id ' + seal.engine_id);
  for (const f of seal.files) { const p = path.join(d, f.file); if (!fs.existsSync(p) || sha(fs.readFileSync(p)) !== f.sha256) throw new PredecessorPinError('PREDECESSOR_FILE_DRIFT', 'item_v2_r2/' + f.file + ' ≠ sealed sha256'); }
  const dirAgg = aggregate(seal.files), srcAgg = aggregate(seal.files.filter((f) => f.file.endsWith('.js') && !f.file.startsWith('tests/')));
  if (dirAgg !== PREDECESSOR.directory_aggregate_sha256 || seal.DIRECTORY_AGGREGATE_SHA256 !== PREDECESSOR.directory_aggregate_sha256) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', 'R2 directory aggregate ' + dirAgg);
  if (srcAgg !== PREDECESSOR.runtime_src_aggregate_sha256 || seal.RUNTIME_SRC_AGGREGATE_SHA256 !== PREDECESSOR.runtime_src_aggregate_sha256) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', 'R2 runtime src aggregate ' + srcAgg);
  const onDisk = fs.readdirSync(d, { recursive: true }).filter((f) => fs.statSync(path.join(d, f)).isFile()).map((f) => f.split(path.sep).join('/'));
  const extra = onDisk.filter((f) => f !== PREDECESSOR.seal_file && !seal.files.some((s) => s.file === f)); if (extra.length) throw new PredecessorPinError('PREDECESSOR_UNSEALED_FILE', 'item_v2_r2/' + extra.join(', '));
  const chain = require(path.join(d, 'item_v2_r2_predecessor_pin.js')).verifyPredecessors(opt.r1Dir, opt.predecessorDir);   /* sealed R2 pin → R1 → item_v2 */
  const vdir = path.resolve(opt.root || MASTER_ROOT, VISION_V1_3.directory);
  for (const f of VISION_V1_3.files) { const p = path.join(vdir, f.file); if (!fs.existsSync(p) || sha(fs.readFileSync(p)) !== f.sha256) throw new PredecessorPinError('VISION_V1_3_VALIDATOR_DRIFT', VISION_V1_3.directory + f.file + ' missing or ≠ pinned sha256'); }
  return { verified: true, r2: { files: seal.files.length, directory_aggregate: dirAgg, runtime_src_aggregate: srcAgg }, r1: chain.r1, item_v2: chain.item_v2, vision_v1_3: { directory: VISION_V1_3.directory, files: VISION_V1_3.files.map((f) => f.file), entryAbs: path.join(vdir, VISION_V1_3.entry) } };
}

module.exports = { PREDECESSOR, VISION_V1_3, PredecessorPinError, verifyPredecessors, MASTER_ROOT };
