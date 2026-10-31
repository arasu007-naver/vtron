'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R2 SUIT SUCCESSOR BINDING (delegation only, non-scoring) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (… CEO-APPROVED SUIT RULE IMPLEMENTATION … §2.2 · §8). Reason: delegate a valid Suit Scoring Unit to the axis-owned
 * Suit successor by its sealed identity (the same verify → load → invoke → return-verbatim pattern as the frozen-V2 binding). Affected Scope: this file (new).
 *
 * Responsibilities only: verify the successor seal (every sealed file's sha256 · directory aggregate == pinned · no unsealed file) → load the entry by explicit
 * name → check ENGINE_ID + export → invoke evaluateSuit(packet) → return its customer output verbatim + status. The successor itself verifies its frozen parent.
 * ⛔ No axis rule. ⛔ No latest / glob / scan / fallback / frozen single-product substitute / V1 scorer. ⛔ A failure is recorded for that axis only.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SUIT_SUCCESSORS } = require('./item_v2_r2_suit_registry');
const C = require('./item_v2_r2_contracts');

const MASTER_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
class SuitSuccessorAuthorityError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'SuitSuccessorAuthorityError'; this.code = code; } }
const fail = (code, msg) => { throw new SuitSuccessorAuthorityError(code, msg); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/** pure resolution + full verification of one successor (exported so negative controls can exercise it on a copied root) */
function resolveSuitSuccessor(axis, contract, root) {
  const base = path.resolve(root || MASTER_ROOT);
  if (!contract || !contract.directory || !contract.seal_file || !contract.entry) fail('SUIT_SUCCESSOR_CONTRACT_INVALID', axis + ' has no governed Suit successor contract');
  if (path.isAbsolute(contract.directory) || /[*?]/.test(contract.directory)) fail('SUIT_SUCCESSOR_CONTRACT_INVALID', axis + ' directory must be explicit and relative');
  const dir = path.resolve(base, contract.directory); if (!dir.startsWith(base + path.sep)) fail('SUIT_SUCCESSOR_CONTRACT_INVALID', axis + ' directory escapes the governed root');
  const sealPath = path.join(dir, contract.seal_file); if (!fs.existsSync(sealPath)) fail('SUIT_SUCCESSOR_UNRESOLVED', axis + ' seal missing');
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  if (seal.engine_id !== contract.entry.engine_id) fail('SUIT_SUCCESSOR_IDENTITY_MISMATCH', axis + ' seal engine id ' + seal.engine_id);
  for (const f of seal.files) { const p = path.join(dir, f.file); if (!fs.existsSync(p) || sha(fs.readFileSync(p)) !== f.sha256) fail('SUIT_SUCCESSOR_SEAL_DRIFT', axis + ' ' + f.file + ' missing or changed'); }
  const agg = sha(seal.files.map((f) => f.file + ':' + f.sha256 + '\n').sort().join(''));
  if (agg !== contract.directory_aggregate_sha256 || seal.DIRECTORY_AGGREGATE_SHA256 !== contract.directory_aggregate_sha256) fail('SUIT_SUCCESSOR_VERSION_MISMATCH', axis + ' directory aggregate ' + agg + ' ≠ pinned');
  const onDisk = fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).map((f) => f.split(path.sep).join('/'));
  const extra = onDisk.filter((f) => f !== contract.seal_file && !seal.files.some((s) => s.file === f)); if (extra.length) fail('SUIT_SUCCESSOR_UNSEALED_FILE', axis + ' ' + extra.join(', '));
  if (!seal.files.some((f) => f.file === contract.entry.file)) fail('SUIT_SUCCESSOR_ENTRY_NOT_SEALED', axis + ' entry not sealed');
  return Object.freeze({ axis, engine_id: contract.entry.engine_id, directory: contract.directory, directory_aggregate_sha256: agg, sealed_files_verified: seal.files.length, frozen_parent: contract.frozen_parent, entryAbs: path.join(dir, contract.entry.file) });
}

function createSuitSuccessorBinding() {
  const resolved = new Map();
  function load(axis) {
    if (resolved.has(axis)) return resolved.get(axis);
    const contract = SUIT_SUCCESSORS[axis]; if (!contract) fail('SUIT_SUCCESSOR_NOT_REGISTERED', String(axis) + ' has no Suit successor — no fallback');
    const auth = resolveSuitSuccessor(axis, contract);
    const mod = require(auth.entryAbs); if (mod.ENGINE_ID !== contract.entry.engine_id) fail('SUIT_SUCCESSOR_RUNTIME_MISMATCH', axis + ' loaded ENGINE_ID ' + mod.ENGINE_ID);
    for (const ex of contract.entry.exports) if (typeof mod[ex] !== 'function') fail('SUIT_SUCCESSOR_ENTRY_UNRESOLVED', axis + ' export ' + ex + ' missing');
    const out = { auth, mod }; resolved.set(axis, out); return out;
  }
  /** invoke one axis Suit successor on the Suit packet (EI V2 ITEM_PRODUCT shape, members' own Vision records) */
  function invoke(axis, packet) {
    let b; try { b = load(axis); } catch (e) { return { axis, outcome: C.P.AXIS_OUTCOME.BINDING_FAILURE, code: e.code || e.name, diagnostics: { message: String(e.message).slice(0, 240) }, provenance: null }; }
    const parent = typeof b.mod.parentIdentity === 'function' ? b.mod.parentIdentity() : null;
    const provenance = { suit_successor: b.auth.engine_id, directory: b.auth.directory, directory_aggregate_sha256: b.auth.directory_aggregate_sha256, sealed_files_verified: b.auth.sealed_files_verified, freeze_id: parent ? parent.freeze_id : b.auth.frozen_parent, src_aggregate_sha256: parent ? parent.src_aggregate_sha256 : null, frozen_files_verified: parent ? parent.frozen_files_verified : null, runtime_dependencies_verified: parent ? parent.runtime_dependencies_verified : null };
    try {
      const r = b.mod.evaluateSuit(clone(packet));
      if (r && r.ok) return { axis, provenance, outcome: C.P.AXIS_OUTCOME.DIRECTION, customer: { direction: r.customer.direction, reason: r.customer.reason }, diagnostics: { suit_trace: r.suit_trace } };
      if (r && r.kind === 'SUIT_RULE_RECONCILIATION_FAILURE') return { axis, provenance, outcome: C.P.AXIS_OUTCOME.EXECUTION_FAILURE, code: r.code, diagnostics: { kind: r.kind, detail: r.detail } };
      return { axis, provenance, outcome: C.P.AXIS_OUTCOME.AXIS_INPUT_REJECTED, code: r && r.code, diagnostics: { kind: r && r.kind, detail: r && r.detail } };
    } catch (e) { return { axis, provenance, outcome: C.P.AXIS_OUTCOME.EXECUTION_FAILURE, code: e.code || e.name, diagnostics: { message: String(e.message).slice(0, 240) } }; }
  }
  return Object.freeze({ invoke, axes: Object.freeze(Object.keys(SUIT_SUCCESSORS)) });
}

module.exports = { createSuitSuccessorBinding, resolveSuitSuccessor, SuitSuccessorAuthorityError, MASTER_ROOT };
