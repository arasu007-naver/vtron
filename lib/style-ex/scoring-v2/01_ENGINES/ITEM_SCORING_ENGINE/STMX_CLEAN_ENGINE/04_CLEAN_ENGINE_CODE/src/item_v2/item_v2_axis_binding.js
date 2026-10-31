'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — FROZEN V2 AXIS BINDING (versioned successor of the V1 L7 generic binding pattern) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING — INTEGRATED RUNTIME V2 IMPLEMENTATION … §8 · §11). Reason: bind the four FINAL FROZEN Item V2
 * engines by their freeze records (the V1 binding cannot resolve them and is not weakened). Affected Scope: this file (new); layers/l7_axis_runtime_binding.js unchanged.
 *
 * Responsibilities only: resolve the pinned freeze record → verify its sha256 + freeze id + src aggregate → verify EVERY frozen directory file and EVERY pinned
 * runtime dependency → load the entry by explicit name → check ENGINE_ID → invoke the axis's own public function → return its output verbatim + status.
 * ⛔ No axis rule. ⛔ No latest / glob / scan / fallback / V1 scorer. ⛔ An authority failure is recorded for that axis only and never halts the others.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AXIS_V2_AUTHORITIES } = require('./item_v2_axis_registry');
const C = require('./item_v2_contracts');

const MASTER_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
class AxisV2AuthorityError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'AxisV2AuthorityError'; this.code = code; } }
const fail = (code, msg) => { throw new AxisV2AuthorityError(code, msg); };
const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function inside(root, rel, what) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || /[*?]/.test(rel)) fail('AXIS_V2_AUTHORITY_INVALID', what + ' must be an explicit relative path');
  const base = path.resolve(root); const abs = path.resolve(base, rel);
  if (!abs.startsWith(base + path.sep)) fail('AXIS_V2_AUTHORITY_INVALID', what + ' escapes the governed root');
  return abs;
}

/** Pure resolution + full verification of one pinned authority (exported so negative controls can exercise it on a copied root). */
function resolveV2Authority(axis, contract, root) {
  const base = root || MASTER_ROOT;
  if (!contract || !contract.entry || !contract.freeze_record) fail('AXIS_V2_CONTRACT_INVALID', axis + ' has no governed V2 contract');
  const recAbs = inside(base, contract.freeze_record, 'freeze record');
  if (!fs.existsSync(recAbs)) fail('AXIS_V2_AUTHORITY_UNRESOLVED', axis + ' freeze record missing');
  if (sha256File(recAbs) !== contract.freeze_record_sha256) fail('AXIS_V2_FREEZE_RECORD_DRIFT', axis + ' freeze record bytes ≠ pinned sha256');
  const rec = JSON.parse(fs.readFileSync(recAbs, 'utf8'));
  if (rec.freeze_id !== contract.freeze_id) fail('AXIS_V2_VERSION_MISMATCH', axis + ' freeze id ' + rec.freeze_id + ' ≠ pinned ' + contract.freeze_id);
  if (!rec.engine || rec.engine.frozen_directory !== contract.frozen_directory || rec.engine.src_aggregate_sha256 !== contract.src_aggregate_sha256) fail('AXIS_V2_VERSION_MISMATCH', axis + ' frozen directory / src aggregate ≠ pinned');
  const dir = inside(base, contract.frozen_directory, 'frozen directory');
  const files = rec.engine.directory_files || [];
  if (!files.length) fail('AXIS_V2_AUTHORITY_INVALID', axis + ' freeze record lists no directory files');
  for (const f of files) { const abs = inside(dir, f.file, 'frozen file'); if (!fs.existsSync(abs)) fail('AXIS_V2_SEAL_DRIFT', axis + ' frozen file ' + f.file + ' missing'); if (sha256File(abs) !== f.sha256) fail('AXIS_V2_SEAL_DRIFT', axis + ' frozen file ' + f.file + ' changed'); }
  if (!files.some((f) => f.file === contract.entry.file)) fail('AXIS_V2_ENTRY_NOT_FROZEN', axis + ' entry ' + contract.entry.file + ' is not a frozen file');
  const deps = rec[contract.dependency_field] || [];
  for (const d of deps) { const abs = inside(base, d.path, 'runtime dependency'); if (!fs.existsSync(abs)) fail('AXIS_V2_DEPENDENCY_MISSING', axis + ' runtime dependency ' + d.path + ' missing'); if (sha256File(abs) !== d.sha256) fail('AXIS_V2_DEPENDENCY_DRIFT', axis + ' runtime dependency ' + d.path + ' changed'); }
  return Object.freeze({ axis, freeze_id: rec.freeze_id, freeze_record: contract.freeze_record, src_aggregate_sha256: contract.src_aggregate_sha256, frozen_files_verified: files.length, runtime_dependencies_verified: deps.length, entryAbs: path.join(dir, contract.entry.file), serializerAbs: contract.serializer ? path.join(dir, contract.serializer.file) : null });
}

/** the axis's own public call shape — returns { outcome, customer?, code?, diagnostics } — no interpretation of the result */
const CALL = {
  EI(mod, _ser, request) {
    const r = mod.evaluate(clone(request));
    if (r.error) return { outcome: C.AXIS_OUTCOME.AXIS_INPUT_REJECTED, code: r.error.code, diagnostics: { detail: r.error.detail } };
    const d = mod.evaluateDiagnostic(clone(request)); const off = mod.evaluateDiagnostic(clone(request), { commercialNeutral: false });
    return { outcome: C.AXIS_OUTCOME.DIRECTION, customer: { direction: r.direction, reason: r.reason }, diagnostics: { underlying_direction: d.state.underlying_direction, commercial_neutral_eligible: d.state.commercial_neutral_eligible, neutral_ineligible_reason: d.state.neutral_ineligible_reason, neutral_off_direction: off.direction, scoring_unit: d.state.scoring_unit, verify_failures: d.verify().length } };
  },
  TC(mod, ser, record) {
    const r = mod.evaluateV13Record(clone(record));
    if (!r.ok) return { outcome: C.AXIS_OUTCOME.AXIS_INPUT_REJECTED, code: r.code, diagnostics: { kind: r.kind } };
    return { outcome: C.AXIS_OUTCOME.DIRECTION, customer: ser.toCustomerOutput(r), diagnostics: { path: r.trace.path, reason_status: r.reason_status, excluded_fields: (r.adapter && r.adapter.excluded || []).map((x) => x.field) } };
  },
  SR(mod, _ser, record) {
    let r; try { r = mod.evaluate(clone(record)); } catch (e) { if (e && e.name === 'SRV2TransportError') return { outcome: C.AXIS_OUTCOME.AXIS_INPUT_REJECTED, code: e.code || e.name, diagnostics: { message: String(e.message).slice(0, 200) } }; throw e; }
    return { outcome: C.AXIS_OUTCOME.DIRECTION, customer: { direction: r.customer.direction, reason: r.customer.reason }, diagnostics: { rule: r.decisive_rule_id, reason_validation: r.reason_validation_result.status, provisional_policy: r.provisional_policy } };
  },
  DM(mod, ser, record) {
    const r = mod.evaluate(clone(record.dm_designed_detail_evidence));
    if (!r.ok) return { outcome: C.AXIS_OUTCOME.AXIS_INPUT_REJECTED, code: r.code, diagnostics: { kind: r.kind } };
    return { outcome: C.AXIS_OUTCOME.DIRECTION, customer: ser.toCustomerOutput(r), diagnostics: { rule: r.decisive_rule_id, reason_status: r.reason_status } };
  },
};

/** The only factory. The registry and the root are fixed; nothing is caller-selectable. */
function createItemV2Binding() {
  const resolved = new Map();
  function load(axis) {
    if (resolved.has(axis)) return resolved.get(axis);
    const contract = AXIS_V2_AUTHORITIES[axis]; if (!contract) fail('AXIS_V2_NOT_REGISTERED', String(axis) + ' has no V2 authority — no fallback');
    const auth = resolveV2Authority(axis, contract);
    const mod = require(auth.entryAbs); if (mod.ENGINE_ID !== contract.entry.engine_id) fail('AXIS_V2_RUNTIME_MISMATCH', axis + ' loaded ENGINE_ID ' + mod.ENGINE_ID + ' ≠ ' + contract.entry.engine_id);
    for (const ex of contract.entry.exports) if (typeof mod[ex] !== 'function') fail('AXIS_V2_ENTRY_UNRESOLVED', axis + ' export ' + ex + ' missing');
    const ser = auth.serializerAbs ? require(auth.serializerAbs) : null;
    if (contract.serializer) for (const ex of contract.serializer.exports) if (typeof ser[ex] !== 'function') fail('AXIS_V2_ENTRY_UNRESOLVED', axis + ' serializer export ' + ex + ' missing');
    const out = { auth, mod, ser }; resolved.set(axis, out); return out;
  }
  /** invoke one axis on its own input (EI: the request object · TC / SR / DM: the selected Vision record) */
  function invoke(axis, input) {
    let b; try { b = load(axis); } catch (e) { return { axis, outcome: C.AXIS_OUTCOME.BINDING_FAILURE, code: e.code || e.name, diagnostics: { message: String(e.message).slice(0, 240) }, provenance: null }; }
    const provenance = { freeze_id: b.auth.freeze_id, freeze_record: b.auth.freeze_record, src_aggregate_sha256: b.auth.src_aggregate_sha256, frozen_files_verified: b.auth.frozen_files_verified, runtime_dependencies_verified: b.auth.runtime_dependencies_verified };
    try { return Object.assign({ axis, provenance }, CALL[axis](b.mod, b.ser, input)); } catch (e) { return { axis, provenance, outcome: C.AXIS_OUTCOME.EXECUTION_FAILURE, code: e.code || e.name, diagnostics: { message: String(e.message).slice(0, 240) } }; }
  }
  return Object.freeze({ invoke, axes: C.AXES });
}

module.exports = { createItemV2Binding, resolveV2Authority, AxisV2AuthorityError, MASTER_ROOT };
