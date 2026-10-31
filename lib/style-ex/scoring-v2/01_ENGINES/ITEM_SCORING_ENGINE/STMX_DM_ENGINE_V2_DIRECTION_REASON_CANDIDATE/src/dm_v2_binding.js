'use strict';
/**
 * STMX DM ENGINE V2 — DIRECTION + REASON CANDIDATE · FROZEN-DEPENDENCY BINDING
 *
 * Order: STMX ITEM DM V2 — BINARY DIRECTION ENGINE IMPLEMENTATION, NEUTRAL ELIMINATION & FULL REGRESSION (CEO 2026-10-28).
 * Status: IMPLEMENTATION CANDIDATE — ⛔ NOT PRODUCTION · ⛔ not bound into the Item V1 registry · ⛔ the DM production pointer is unchanged.
 *
 * Reuses exactly ONE frozen module, BY NAME, read-only, hash-verified at load against BOUND_INPUTS.json:
 *   dm_admission_v1.js — the frozen reading of a governed DM observation block (three Primitives, frozen domains, establishes / allows).
 * ⛔ The frozen V1 Direction resolver (Neutral centre), Strength resolver, ordinal projector and M1 refinement are NOT loaded.
 * ⛔ No GT, REF, filename, registry or image is read. Any drift in the bound file throws (fail closed) — nothing falls back.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ENGINE_ID = 'STMX_DM_ENGINE_V2_DIRECTION_REASON';
const ENGINE_DIRECTORY_ID = 'STMX_DM_ENGINE_V2_DIRECTION_REASON_CANDIDATE';
const ENGINE_STATUS = 'IMPLEMENTATION_CANDIDATE — NOT PRODUCTION';
const PKG = path.resolve(__dirname, '..'); const ISE = path.resolve(PKG, '..'); const ROOT = path.resolve(ISE, '..', '..');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
class DMV2BindingError extends Error { constructor(code, msg) { super(code + ': ' + msg + ' ⛔ FAIL CLOSED.'); this.name = 'DMV2BindingError'; this.code = code; } }
const BOUND_FILE = path.join(PKG, 'BOUND_INPUTS.json');
if (!fs.existsSync(BOUND_FILE)) throw new DMV2BindingError('BOUND_INPUTS_MISSING', BOUND_FILE);
const BOUND = JSON.parse(fs.readFileSync(BOUND_FILE, 'utf8'));
function bound(role) {
  const b = BOUND.inputs.find((i) => i.role === role);
  if (!b) throw new DMV2BindingError('BOUND_INPUT_MISSING', role + ' is not a bound input');
  const abs = path.join(ROOT, b.path);
  if (!fs.existsSync(abs)) throw new DMV2BindingError('BOUND_INPUT_ABSENT', role + ' (' + b.path + ')');
  if (sha(abs) !== b.sha256) throw new DMV2BindingError('BOUND_INPUT_DRIFT', role + ' (' + b.path + ') does not match its bound hash');
  return abs;
}
for (const b of BOUND.inputs) bound(b.role);
const admission = require(bound('dm_admission'));
if (typeof admission.admit !== 'function' || typeof admission.establishes !== 'function') throw new DMV2BindingError('MODULE_SHAPE_MISMATCH', 'admit / establishes missing');
if (JSON.stringify(admission.RELATIVE_SIZE) !== '["small","medium","large"]' || JSON.stringify(admission.CONTRAST) !== '["low","medium","high"]' || JSON.stringify(admission.SPATIAL_POSITION) !== '["localized","distributed","whole_garment"]') throw new DMV2BindingError('FROZEN_DOMAIN_MISMATCH', 'Primitive domains differ from the frozen contract');
/** identity of the candidate's own source (for the seal and the regression record) */
function selfIdentity() {
  const dir = path.join(PKG, 'src'); const modules = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => ({ file: 'src/' + f, sha256: sha(path.join(dir, f)) }));
  const h = crypto.createHash('sha256'); modules.forEach((m) => h.update(m.file + ':' + m.sha256 + '\n'));
  return { engine_id: ENGINE_ID, engine_directory: ENGINE_DIRECTORY_ID, engine_status: ENGINE_STATUS, modules, aggregate_sha256: h.digest('hex'), bound_inputs: BOUND.inputs.map((b) => ({ role: b.role, path: b.path, sha256: b.sha256 })) };
}
module.exports = { ENGINE_ID, ENGINE_DIRECTORY_ID, ENGINE_STATUS, admission, selfIdentity, DMV2BindingError };
