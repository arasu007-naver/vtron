'use strict';
/**
 * STMX SR ENGINE V2 — DIRECTION + REASON CANDIDATE · FROZEN-DEPENDENCY BINDING
 *
 * Order: STMX ITEM SCORING ENGINE V2 — SR BINARY DIRECTION + VISION-GROUNDED REASON CANDIDATE IMPLEMENTATION & FULL REGRESSION (CEO 2026-10-26, step 1 of 6).
 * Status: IMPLEMENTATION CANDIDATE — ⛔ NOT PRODUCTION · ⛔ not bound into the Item V1 registry · ⛔ the SR production pointer is unchanged.
 *
 * The candidate reuses exactly three frozen V1.2 modules, BY NAME, read-only, hash-verified at load against BOUND_INPUTS.json:
 *   sr_producer_binding_v1.js   named Vision contract binding (STMX_VISION_PRODUCER_V1_3 · 37 parameters · carrier applicability / domains)
 *   sr_input_adapter_v1.js      carrier read (KEY_OMITTED ≠ None · Waist Two-Gate · one-piece byRegion · MULTI support sets)
 *   sr_evidence_admission_v1.js governed evidence classes (governance · structure support · release · release support · preservation · form retention)
 * ⛔ The frozen Direction resolver, Strength sidecar and ordinal projector are NOT loaded: Direction is decided here from evidence classes.
 * ⛔ No GT, REF, filename, registry or image is read. Any drift in a bound file throws (fail closed) — nothing falls back.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ENGINE_ID = 'STMX_SR_ENGINE_V2_DIRECTION_REASON';
const ENGINE_DIRECTORY_ID = 'STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE';   // R3: versioned copy of the R1/R2 candidate (CEO R3 order 2026-10-27); R1/R2 kept unchanged
const ENGINE_STATUS = 'IMPLEMENTATION_CANDIDATE — NOT PRODUCTION';
const PKG = path.resolve(__dirname, '..'); const ISE = path.resolve(PKG, '..'); const ROOT = path.resolve(ISE, '..', '..');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
class SRV2BindingError extends Error { constructor(code, msg) { super(code + ': ' + msg + ' ⛔ FAIL CLOSED.'); this.name = 'SRV2BindingError'; this.code = code; } }
const BOUND_FILE = path.join(PKG, 'BOUND_INPUTS.json');
if (!fs.existsSync(BOUND_FILE)) throw new SRV2BindingError('BOUND_INPUTS_MISSING', BOUND_FILE);
const BOUND = JSON.parse(fs.readFileSync(BOUND_FILE, 'utf8'));
function bound(role) {
  const b = BOUND.inputs.find((i) => i.role === role);
  if (!b) throw new SRV2BindingError('BOUND_INPUT_MISSING', role + ' is not a bound input');
  const abs = path.join(ROOT, b.path);
  if (!fs.existsSync(abs)) throw new SRV2BindingError('BOUND_INPUT_ABSENT', role + ' (' + b.path + ')');
  if (sha(abs) !== b.sha256) throw new SRV2BindingError('BOUND_INPUT_DRIFT', role + ' (' + b.path + ') does not match its bound hash');
  return abs;
}
for (const b of BOUND.inputs) bound(b.role);   // every bound input verified before anything is loaded
const producerBinding = require(bound('producer_binding'));
const adapter = require(bound('input_adapter'));
const admission = require(bound('evidence_admission'));
if (producerBinding.OBSERVATION_CONTRACT_ID !== 'STMX_VISION_PRODUCER_V1_3') throw new SRV2BindingError('OBSERVATION_CONTRACT_IDENTITY_MISMATCH', String(producerBinding.OBSERVATION_CONTRACT_ID));
if (typeof adapter.adapt !== 'function' || typeof admission.admit !== 'function') throw new SRV2BindingError('MODULE_SHAPE_MISMATCH', 'adapter.adapt / admission.admit missing');
/** identity of the candidate's own source (for the candidate seal and the regression record) */
function selfIdentity() {
  const dir = path.join(PKG, 'src'); const files = fs.readdirSync(dir).filter((f) => /\.js$/.test(f)).sort();
  const mods = files.map((f) => ({ file: 'src/' + f, sha256: sha(path.join(dir, f)) }));
  const h = crypto.createHash('sha256'); mods.forEach((m) => { h.update(m.file); h.update(m.sha256); });
  return { engine_id: ENGINE_ID, engine_directory: ENGINE_DIRECTORY_ID, engine_status: ENGINE_STATUS, modules: mods, aggregate_sha256: h.digest('hex'), bound_inputs: BOUND.inputs.map((b) => ({ role: b.role, path: b.path, sha256: b.sha256 })) };
}
module.exports = { ENGINE_ID, ENGINE_DIRECTORY_ID, ENGINE_STATUS, ROOT, ISE, PKG, BOUND, SRV2BindingError, producerBinding, adapter, admission, selfIdentity, sha };
