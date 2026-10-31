'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R4 PREDECESSOR + COLOUR-SUCCESSOR PIN (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … INTEGRATED RUNTIME R4 §9 · §14). Reason: R4 delegates scoring to the sealed src/item_v2_r3/ and
 * reads the target-aware colour successor; both may be loaded only while they equal their pinned identities. Affected Scope: this file (new).
 *
 * Verifies src/item_v2_r3/ (seal · every sealed file · directory + runtime src aggregate == pinned · no unsealed file), then the sealed R3 pin (R2 → R1 → item_v2 +
 * the frozen V1.3 DM gate files), then the colour successor (seal · every file · aggregate == pinned · no unsealed file). ⛔ Any drift → PredecessorPinError.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const PREDECESSOR = Object.freeze({
  directory: path.resolve(__dirname, '..', 'item_v2_r3'),
  seal_file: 'CODE_IDENTITY_SEAL_ITEM_V2_INTEGRATED_RUNTIME_V2_R3_CANDIDATE.json',
  runtime_id: 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_R3_CANDIDATE',
  directory_aggregate_sha256: '368ba72d67b0a660c600bf95b0829c1c01b5bb6766e3cb76474f6e50b58dafc8',
  runtime_src_aggregate_sha256: '7c6141a13f8251f5e705b27debd1b2fae5e6f394f473d994dbe1c8c7b9da5fdc',
});
const MASTER_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const COLOUR_SUCCESSOR = Object.freeze({
  directory: '01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_COLOUR_TARGET_AWARE_V1_CANDIDATE/',
  seal_file: 'CODE_IDENTITY_SEAL_COLOUR_TARGET_AWARE_V1_CANDIDATE.json',
  engine_id: 'STMX_COLOUR_TARGET_AWARE_ACQUISITION_V1_CANDIDATE',
  directory_aggregate_sha256: '8040f1bc277c1b163577ad3fec9f68c31b19f4591cc41eca20dac9d84e64129b',
  entry: 'index.js',
});
class PredecessorPinError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'PredecessorPinError'; this.code = code; } }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const aggregate = (files) => sha(files.map((f) => f.file + ':' + f.sha256 + '\n').sort().join(''));
const listFiles = (d) => fs.readdirSync(d, { recursive: true }).filter((f) => fs.statSync(path.join(d, f)).isFile()).map((f) => f.split(path.sep).join('/'));

function checkSealedDir(d, sealFile, id, dirAgg, srcAgg, label) {
  const sealPath = path.join(d, sealFile); if (!fs.existsSync(sealPath)) throw new PredecessorPinError('PREDECESSOR_SEAL_MISSING', label + ' seal not found');
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8')); if (seal.engine_id !== id) throw new PredecessorPinError('PREDECESSOR_IDENTITY_MISMATCH', label + ' id ' + seal.engine_id);
  for (const f of seal.files) { const p = path.join(d, f.file); if (!fs.existsSync(p) || sha(fs.readFileSync(p)) !== f.sha256) throw new PredecessorPinError('PREDECESSOR_FILE_DRIFT', label + '/' + f.file + ' ≠ sealed sha256'); }
  const a = aggregate(seal.files); if (a !== dirAgg || seal.DIRECTORY_AGGREGATE_SHA256 !== dirAgg) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', label + ' directory aggregate ' + a);
  if (srcAgg) { const s = aggregate(seal.files.filter((f) => f.file.endsWith('.js') && !f.file.startsWith('tests/') && f.file !== 'verify_identity.js')); if (s !== srcAgg || seal.RUNTIME_SRC_AGGREGATE_SHA256 !== srcAgg) throw new PredecessorPinError('PREDECESSOR_AGGREGATE_MISMATCH', label + ' runtime src aggregate ' + s); }
  const extra = listFiles(d).filter((f) => f !== sealFile && !seal.files.some((s) => s.file === f)); if (extra.length) throw new PredecessorPinError('PREDECESSOR_UNSEALED_FILE', label + '/' + extra.join(', '));
  return { files: seal.files.length, directory_aggregate: a };
}

/** @param {{ r3Dir?, colourDir?, root?, r2Dir?, r1Dir?, predecessorDir? }} [o] (negative controls pass copies) */
function verifyPredecessors(o) {
  const opt = o || {};
  const r3 = checkSealedDir(opt.r3Dir || PREDECESSOR.directory, PREDECESSOR.seal_file, PREDECESSOR.runtime_id, PREDECESSOR.directory_aggregate_sha256, PREDECESSOR.runtime_src_aggregate_sha256, 'item_v2_r3');
  const chain = require(path.join(opt.r3Dir || PREDECESSOR.directory, 'item_v2_r3_predecessor_pin.js')).verifyPredecessors({ r2Dir: opt.r2Dir, r1Dir: opt.r1Dir, predecessorDir: opt.predecessorDir, root: opt.root });   /* sealed R3 pin → R2 → R1 → item_v2 + V1.3 gate */
  const cdir = opt.colourDir || path.resolve(opt.root || MASTER_ROOT, COLOUR_SUCCESSOR.directory);
  const colour = checkSealedDir(cdir, COLOUR_SUCCESSOR.seal_file, COLOUR_SUCCESSOR.engine_id, COLOUR_SUCCESSOR.directory_aggregate_sha256, null, 'colour successor');
  return { verified: true, r3, r2: chain.r2, r1: chain.r1, item_v2: chain.item_v2, vision_v1_3: chain.vision_v1_3, colour_successor: Object.assign(colour, { directory: COLOUR_SUCCESSOR.directory, entryAbs: path.join(cdir, COLOUR_SUCCESSOR.entry) }) };
}

module.exports = { PREDECESSOR, COLOUR_SUCCESSOR, PredecessorPinError, verifyPredecessors, MASTER_ROOT };
