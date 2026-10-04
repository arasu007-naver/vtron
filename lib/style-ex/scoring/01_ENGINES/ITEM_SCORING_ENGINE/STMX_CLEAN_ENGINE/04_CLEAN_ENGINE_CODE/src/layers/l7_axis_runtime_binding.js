'use strict';
/*
 * STMX Clean Engine — L7-OWNED AXIS RUNTIME BINDING (subcomponent of L7) · CANDIDATE.
 * Authority: Blueprint Deliverable 3a · G42-A (CEO 2026-09-23 · STMX TC MAINLINE V2.3.46).
 *
 * The eight approved responsibilities, and nothing else (V2.3.45 13_):
 *   authority resolution · axis-runtime binding · input-contract validation · caller adaptation (shape only) ·
 *   runtime invocation · status propagation · provenance preservation · output collection into the envelope.
 *
 * This module knows how to call an authority. It does not know how to judge an item: it holds no axis rule, no
 * semantic criterion, no tier, threshold, weight or score physics, and it never reinterprets, repairs or re-decides a
 * result. The bound axis runtime remains the semantic authority (binding ≠ semantic ownership).
 * Resolution: explicit authority record → expected identity → seal / identity verification → input-contract
 * validation → invocation. ⛔ No latest, no scan, no fallback, no caller-selected runtime, no silent promotion.
 * A CANDIDATE authority executes only in SHADOW mode.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AXIS_BINDING_CONTRACTS } = require('../runtime/axis_binding_contracts');
const { ERROR_TYPE, LAYER_STATUS } = require('../runtime/packages');

const MASTER_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const AUTHORITY_STATUS = Object.freeze(['PRODUCTION', 'CANDIDATE']);
const MODES = Object.freeze(['PRODUCTION', 'SHADOW']);
const RECORD_KINDS = Object.freeze(['CODE_IDENTITY_SEAL', 'PRODUCTION_AUTHORITY_POINTER']);
const CALL_SHAPES = Object.freeze(['CORPUS', 'ARGS']);
const HEX64 = /^[0-9a-f]{64}$/;

class AxisAuthorityError extends Error {
  constructor(code, message) { super(code + ': ' + message); this.name = 'AxisAuthorityError'; this.code = code; }
}
const fail = (code, message) => { throw new AxisAuthorityError(code, message + ' ⛔ FAIL CLOSED.'); };
const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const clone = (x) => JSON.parse(JSON.stringify(x));

function insideRoot(root, rel, what) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || /[*?]/.test(rel)) fail('AXIS_AUTHORITY_INVALID', what + ' must be an explicit relative path');
  const base = path.resolve(root);
  const abs = path.resolve(base, rel);
  if (!abs.startsWith(base + path.sep)) fail('AXIS_AUTHORITY_INVALID', what + ' escapes the governed root');
  return abs;
}

function assertContractShape(c) {
  if (!c || typeof c !== 'object') fail('AXIS_CONTRACT_INVALID', 'binding contract missing');
  const ok = typeof c.axis === 'string' && c.authority_record && RECORD_KINDS.includes(c.authority_record.kind) && typeof c.authority_record.path === 'string' &&
    typeof c.authority_record.identity_field === 'string' && HEX64.test(String(c.expected_identity)) && typeof c.runtime_id === 'string' &&
    AUTHORITY_STATUS.includes(c.authority_status) && c.entry && typeof c.entry.runtime_id_export === 'string' && c.invocation &&
    typeof c.invocation.export === 'string' && CALL_SHAPES.includes(c.invocation.call) && c.input_contract && Array.isArray(c.input_contract.required) &&
    c.input_contract.required.length > 0 && Object.prototype.hasOwnProperty.call(c, 'score_output');
  if (!ok) fail('AXIS_CONTRACT_INVALID', 'binding contract for ' + (c && c.axis) + ' is incomplete');
}

/** Authority resolution + seal / identity verification. Pure with respect to the contract and root it is given. */
function resolveAuthority(contract, root) {
  const base = root || MASTER_ROOT;
  assertContractShape(contract);
  const recAbs = insideRoot(base, contract.authority_record.path, 'authority record');
  if (!fs.existsSync(recAbs) || !fs.statSync(recAbs).isFile()) fail('AXIS_AUTHORITY_UNRESOLVED', contract.axis + ' authority record ' + contract.authority_record.path + ' is missing');
  let rec;
  try { rec = JSON.parse(fs.readFileSync(recAbs, 'utf8')); } catch (e) { fail('AXIS_AUTHORITY_INVALID', contract.axis + ' authority record is not valid JSON'); }

  if (contract.authority_record.kind === 'CODE_IDENTITY_SEAL') {
    const recorded = rec[contract.authority_record.identity_field];
    if (recorded !== contract.expected_identity) fail('AXIS_IDENTITY_MISMATCH', contract.axis + ' seal identity ' + recorded + ' ≠ expected ' + contract.expected_identity);
    if (rec.package !== contract.runtime_id) fail('AXIS_RUNTIME_MISMATCH', contract.axis + ' seal names ' + rec.package + ' ≠ ' + contract.runtime_id);
    const sealStatus = String(rec.status || '');
    const sealIsCandidate = /CANDIDATE|NOT PRODUCTION/.test(sealStatus);
    if (contract.authority_status === 'PRODUCTION' && sealIsCandidate) fail('AXIS_AUTHORITY_STATUS_MISMATCH', contract.axis + ' candidate seal cannot be bound as PRODUCTION');
    if (contract.authority_status === 'CANDIDATE' && !sealIsCandidate) fail('AXIS_AUTHORITY_STATUS_MISMATCH', contract.axis + ' seal status does not declare a candidate');
    const pkgDir = path.dirname(recAbs);
    if (!Array.isArray(rec.files) || !rec.files.length) fail('AXIS_AUTHORITY_INVALID', contract.axis + ' seal lists no files');
    const h = crypto.createHash('sha256');
    for (const f of rec.files) {
      const abs = insideRoot(pkgDir, f.file, 'sealed file');
      if (!fs.existsSync(abs)) fail('AXIS_SEAL_DRIFT', contract.axis + ' sealed file ' + f.file + ' is missing');
      const now = sha256File(abs);
      if (now !== f.sha256) fail('AXIS_SEAL_DRIFT', contract.axis + ' sealed file ' + f.file + ' changed');
      h.update(f.file); h.update(now);
    }
    if (h.digest('hex') !== recorded) fail('AXIS_SEAL_DRIFT', contract.axis + ' seal aggregate does not recompute');
    if (!rec.files.some((f) => f.file === contract.entry.file)) fail('AXIS_ENTRY_NOT_SEALED', contract.axis + ' entry ' + contract.entry.file + ' is not a sealed file');
    return Object.freeze({ axis: contract.axis, runtime_id: contract.runtime_id, identity: recorded, authority_status: contract.authority_status, authority_record: contract.authority_record.path, entryAbs: path.join(pkgDir, contract.entry.file), pkgDir });
  }

  // PRODUCTION_AUTHORITY_POINTER (existing SR / DM convention). The axis's own binding module keeps its drift check.
  const block = rec[contract.authority_record.block];
  if (!block || typeof block !== 'object') fail('AXIS_AUTHORITY_INVALID', contract.axis + ' pointer has no authority block ' + contract.authority_record.block);
  if (block.id !== contract.runtime_id) fail('AXIS_RUNTIME_MISMATCH', contract.axis + ' pointer names ' + block.id + ' ≠ ' + contract.runtime_id);
  if (block[contract.authority_record.identity_field] !== contract.expected_identity) fail('AXIS_IDENTITY_MISMATCH', contract.axis + ' pointer identity ≠ expected');
  if (contract.authority_status === 'PRODUCTION' && !/PRODUCTION/.test(String(rec.status || ''))) fail('AXIS_AUTHORITY_STATUS_MISMATCH', contract.axis + ' pointer is not a production authority');
  const entryField = contract.authority_record.entry_field || 'entry';
  const entryAbs = insideRoot(base, block[entryField], 'pointer ' + entryField);
  if (!fs.existsSync(entryAbs)) fail('AXIS_AUTHORITY_UNRESOLVED', contract.axis + ' pointer entry is missing');
  if (block.seal_file && !fs.existsSync(insideRoot(base, block.seal_file, 'pointer seal'))) fail('AXIS_AUTHORITY_UNRESOLVED', contract.axis + ' pointer seal file is missing');
  return Object.freeze({ axis: contract.axis, runtime_id: contract.runtime_id, identity: block[contract.authority_record.identity_field], authority_status: contract.authority_status, authority_record: contract.authority_record.path, entryAbs, pkgDir: path.dirname(entryAbs) });
}

function boundContracts(contract, auth) {
  if (!contract.bound_contracts_record) return null;
  const abs = insideRoot(auth.pkgDir, contract.bound_contracts_record, 'bound contracts record');
  const m = JSON.parse(fs.readFileSync(abs, 'utf8'));
  return { record: contract.bound_contracts_record, inputs: (m.inputs || []).map((i) => ({ role: i.role, sha256: i.sha256 })) };
}

/** The only factory. The registry is fixed; the caller may choose the mode and nothing else. */
function createAxisBinding(options) {
  const opts = options || {};
  for (const k of Object.keys(opts)) if (k !== 'mode') fail('CALLER_SELECTED_RUNTIME_REFUSED', 'option "' + k + '" is not accepted — the registry is fixed');
  const mode = opts.mode || 'PRODUCTION';
  if (!MODES.includes(mode)) fail('AXIS_MODE_INVALID', 'unknown mode ' + mode);
  const registry = AXIS_BINDING_CONTRACTS;
  const resolved = new Map();
  const corpus = new Map();

  function invoke(axis, callerInput) {
    const contract = registry[axis];
    if (!contract) fail('AXIS_NOT_REGISTERED', String(axis) + ' has no governed binding contract — no fallback');
    let auth = resolved.get(axis);
    if (!auth) { auth = resolveAuthority(contract); resolved.set(axis, auth); }
    const env = {
      axis: contract.axis,
      runtime: { id: auth.runtime_id, full_identity_sha256: auth.identity, authority_status: auth.authority_status },
      input_status: null,
      semantic: null,
      score: null,
      score_status: contract.score_output === null ? LAYER_STATUS.NOT_IMPLEMENTED : null,
      provenance: { realised_by: null, bound_contracts: null, axis_provenance: null },
    };
    if (auth.authority_status === 'CANDIDATE' && mode !== 'SHADOW') { env.provenance.not_executed = 'CANDIDATE_AUTHORITY_EXECUTES_ONLY_IN_SHADOW_MODE'; return env; }

    const input = {};
    for (const k of contract.input_contract.required) {
      const v = callerInput ? callerInput[k] : undefined;
      if (v === undefined || v === null || v === '') { env.input_status = ERROR_TYPE.MISSING_REQUIRED_INPUT; env.provenance.missing_input = k; return env; }
      input[k] = v;
    }

    const mod = require(auth.entryAbs);
    if (mod[contract.entry.runtime_id_export] !== auth.runtime_id) fail('AXIS_RUNTIME_MISMATCH', 'loaded module identity ≠ ' + auth.runtime_id);
    const fn = mod[contract.invocation.export];
    if (typeof fn !== 'function') fail('AXIS_ENTRY_UNRESOLVED', contract.axis + ' entry export ' + contract.invocation.export + ' is missing');
    let raw;
    if (contract.invocation.call === 'CORPUS') {
      let index = corpus.get(axis);
      if (!index) {
        const out = fn();
        index = new Map(out[contract.invocation.collection].map((u) => [u[contract.invocation.key], u]));
        corpus.set(axis, index);
      }
      raw = index.get(input[contract.invocation.key]);
      if (raw === undefined) { env.input_status = ERROR_TYPE.MISSING_REQUIRED_INPUT; env.provenance.missing_input = contract.invocation.key + ' not in the governed population'; return env; }
    } else {
      raw = fn(...contract.invocation.args.map((k) => input[k]));
    }

    env.input_status = LAYER_STATUS.OK;
    env.semantic = clone(raw);
    if (contract.score_output !== null) {
      const s = raw[contract.score_output];
      env.score = s === undefined ? null : s;
      env.score_status = env.score === null ? 'UNRESOLVED' : LAYER_STATUS.OK;
    }
    env.provenance = {
      realised_by: { runtime_id: auth.runtime_id, full_identity_sha256: auth.identity, authority_record: auth.authority_record, authority_status: auth.authority_status },
      bound_contracts: boundContracts(contract, auth),
      axis_provenance: { location: 'semantic' },
    };
    return env;
  }

  /** Status propagation for the L7 pipeline: an authority failure is recorded, never substituted, never halting other axes. */
  function collect(axis, callerInput) {
    try { return invoke(axis, callerInput); } catch (e) {
      const c = registry[axis];
      return {
        axis: String(axis), runtime: null, input_status: null, semantic: null, score: null,
        score_status: c && c.score_output === null ? LAYER_STATUS.NOT_IMPLEMENTED : null,
        provenance: { realised_by: null, bound_contracts: null, axis_provenance: null, error: { type: ERROR_TYPE.RUNTIME_FAILURE, code: e.code || e.name, message: String(e.message) } },
      };
    }
  }

  return Object.freeze({ mode, invoke, collect, axes: Object.freeze(Object.keys(registry)) });
}

module.exports = { createAxisBinding, resolveAuthority, AxisAuthorityError, AUTHORITY_STATUS, MODES, MASTER_ROOT };
