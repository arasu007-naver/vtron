'use strict';
/**
 * STMX EI — PRODUCTION INTEGRATION V1 (EI-owned successor · entry · CANDIDATE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-27 · Order: STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D3 · §8–§12
 *   Reason:         Give the Clean Engine one governed EI entry without editing frozen EI: the frozen Direction runtime
 *                   (STMX_EI_DIRECTION_RUNTIME_V1_2_7 · frozen baseline STMX_EI_DIRECTION_FROZEN_BASELINE_V1) and the frozen
 *                   Numeric layer (STMX_EI_NUMERIC_V1_FROZEN_BASELINE_R1) are connected only by the mechanical bridge and the
 *                   structural Vision input projection in this directory.
 *   Affected Scope: STMX_EI_PRODUCTION_INTEGRATION_V1_CANDIDATE/ (new) · STMX_EI_PRODUCTION_INTEGRATION_AUTHORITY_V1.json (new).
 *
 *   unit ── GARMENT ────── projectToEiInput ─→ frozen run()     ─┐
 *        └─ MATCHING_PAIR ─────────────────── → frozen runPair() ─┴→ buildNumericState ─→ frozen resolve() ─→ result
 *
 * ⛔ No EI scoring rule lives here. ⛔ No GT, no REF identity, no image, no fallback, no retired engine.
 * ★ At load every bound frozen file is re-hashed against BOUND_INPUTS.json; any drift throws and fails closed.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const PKG_DIR = path.resolve(__dirname, '..');
const ISE = path.resolve(PKG_DIR, '..');
const ROOT = path.resolve(ISE, '..', '..');

const RUNTIME_ID = 'STMX_EI_PRODUCTION_INTEGRATION_V1_CANDIDATE';
const ENGINE_ID = 'STMX_EI_ENGINE_V1';
const UNIT_TYPES = Object.freeze(['GARMENT', 'MATCHING_PAIR']);

function fail(code, message) { const e = new Error(code + ': ' + message + ' ⛔ FAIL CLOSED.'); e.code = code; throw e; }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

/** drift check against the bound frozen authority set */
function verifyBoundInputs() {
  const recAbs = path.join(PKG_DIR, 'BOUND_INPUTS.json');
  if (!fs.existsSync(recAbs)) fail('EI_BOUND_INPUTS_MISSING', 'BOUND_INPUTS.json is missing');
  const rec = JSON.parse(fs.readFileSync(recAbs, 'utf8'));
  const drift = rec.inputs.filter((i) => { const abs = path.join(ROOT, i.file); return !fs.existsSync(abs) || sha(abs) !== i.sha256; }).map((i) => i.file);
  if (drift.length) fail('EI_FROZEN_AUTHORITY_DRIFT', 'bound frozen file(s) changed: ' + drift.join(', '));
  return { checked: rec.inputs.length, drift: 0 };
}
const BOUND = verifyBoundInputs();

const DIRECTION = require(path.join(ISE, 'STMX_EI_DIRECTION_RUNTIME_V1_2_7', 'src', 'ei_direction_runtime_v1_2_7.js'));
const NUMERIC = require(path.join(ISE, 'STMX_EI_NUMERIC_V1_FROZEN_BASELINE_R1', 'src', 'ei_numeric_layer_v1.js'));
const BRIDGE = require('./ei_direction_numeric_bridge_v1.js');
const COMPAT = require('./ei_vision_input_compatibility_v1.js');

/**
 * @param {object} unit  { scoring_unit_type: 'GARMENT', input: <governed EI garment input / Producer target record> }
 *                    or { scoring_unit_type: 'MATCHING_PAIR', members: [...], … } (the governed pair input, passed verbatim)
 */
function evaluateEI(unit) {
  if (!unit || typeof unit !== 'object' || !UNIT_TYPES.includes(unit.scoring_unit_type)) fail('EI_UNIT_TYPE_INVALID', 'scoring_unit_type must be GARMENT or MATCHING_PAIR');
  let trace, qualifiersFor;
  if (unit.scoring_unit_type === 'GARMENT') {
    const input = COMPAT.projectToEiInput(unit.input);
    trace = DIRECTION.run(input, {});
    const q = BRIDGE.qualifiersOf(input && input.observations);
    qualifiersFor = () => q;
  } else {
    trace = DIRECTION.runPair(unit);
    const byMember = new Map((Array.isArray(unit.members) ? unit.members : []).map((m) => [m && m.member_id, BRIDGE.qualifiersOf(m && m.observations)]));
    qualifiersFor = (e) => byMember.get(e.member_id) || [];
  }
  const state = BRIDGE.buildNumericState(trace, qualifiersFor);
  const numeric = NUMERIC.resolve(state);
  return Object.assign({ engine: ENGINE_ID, scoring_unit_type: unit.scoring_unit_type }, numeric, {
    trace, state,
    provenance: { runtime_id: RUNTIME_ID, direction_runtime: DIRECTION.RUNTIME_VERSION, numeric_layer: NUMERIC.NUMERIC_VERSION,
      bridge: BRIDGE.BRIDGE_ID, input_adapter: COMPAT.ADAPTER_ID, bound_producer: COMPAT.BOUND_PRODUCER, source_producer: COMPAT.SOURCE_PRODUCER,
      bound_frozen_files_verified: BOUND.checked },
  });
}

module.exports = { RUNTIME_ID, ENGINE_ID, UNIT_TYPES, evaluateEI, verifyBoundInputs };
