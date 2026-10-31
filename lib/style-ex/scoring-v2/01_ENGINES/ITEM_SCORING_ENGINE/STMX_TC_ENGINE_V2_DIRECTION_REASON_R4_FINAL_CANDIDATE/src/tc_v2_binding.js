'use strict';
/**
 * STMX TC ENGINE V2 — DIRECTION + REASON CANDIDATE · FROZEN-DEPENDENCY BINDING
 *
 * Order: STMX ITEM TC V2 — MANDATORY DIRECTION RESOLVER IMPLEMENTATION & FULL REGRESSION (CEO 2026-10-28).
 * R2 successor: STMX ITEM TC V2 — LIVE VISION V1.3 EVIDENCE FIDELITY AUDIT, ROOT-CAUSE ISOLATION & TARGETED CANDIDATE CORRECTION (CEO 2026-10-28) — predecessor STMX_TC_ENGINE_V2_DIRECTION_REASON_CANDIDATE (protected, unchanged).
 * R3 final candidate: STMX ITEM TC V2 — MANDATORY BEST-SUPPORTED DIRECTION, R3 FINAL CORRECTION & FREEZE READINESS (CEO 2026-10-28) — predecessor STMX_TC_ENGINE_V2_DIRECTION_REASON_R2_CANDIDATE (protected, unchanged).
 * R4 final candidate: STMX ITEM TC V2 — R3-B1 / R3-B2 FINAL CORRECTION, BEST-SUPPORTED DIRECTION VALIDATION & FULL REGRESSION (CEO 2026-10-28) — predecessor STMX_TC_ENGINE_V2_DIRECTION_REASON_R3_FINAL_CANDIDATE (protected, unchanged).
 * Status: IMPLEMENTATION CANDIDATE — ⛔ NOT PRODUCTION · ⛔ not bound into the Item V1 registry · ⛔ the TC production pointer (STMX_TC_ENGINE_V1) is unchanged.
 *
 * Binds the frozen TC V1 Direction chain READ-ONLY, by name and hash (BOUND_INPUTS.json). Nothing is copied or edited; any drift throws (fail closed).
 * ⛔ The TC Strength resolver, ordinal projector and score are NOT loaded. ⛔ No GT, REF list, rationale or image is read.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ENGINE_ID = 'STMX_TC_ENGINE_V2_DIRECTION_REASON';
const ENGINE_DIRECTORY_ID = 'STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE';
const ENGINE_STATUS = 'IMPLEMENTATION_CANDIDATE — NOT PRODUCTION';
const PKG = path.resolve(__dirname, '..'); const ISE = path.resolve(PKG, '..'); const ROOT = path.resolve(ISE, '..', '..');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
class TCV2BindingError extends Error { constructor(code, msg) { super(code + ': ' + msg + ' ⛔ FAIL CLOSED.'); this.name = 'TCV2BindingError'; this.code = code; } }
const BOUND_FILE = path.join(PKG, 'BOUND_INPUTS.json');
if (!fs.existsSync(BOUND_FILE)) throw new TCV2BindingError('BOUND_INPUTS_MISSING', BOUND_FILE);
const BOUND = JSON.parse(fs.readFileSync(BOUND_FILE, 'utf8'));
/** verify one bound input against an expected hash (exported for the dependency-drift test) */
function verifyInput(b, root) { const abs = path.join(root || ROOT, b.path); if (!fs.existsSync(abs)) throw new TCV2BindingError('BOUND_INPUT_ABSENT', b.role + ' (' + b.path + ')'); if (sha(abs) !== b.sha256) throw new TCV2BindingError('BOUND_INPUT_DRIFT', b.role + ' (' + b.path + ') does not match its bound hash'); return abs; }
const ABS = {}; for (const b of BOUND.inputs) ABS[b.role] = verifyInput(b);
const json = (role) => JSON.parse(fs.readFileSync(ABS[role], 'utf8'));
const SUCC = require(ABS.successor_v4);                 // frozen Step 2 successor V4 (verifies its own bound inputs at load)
const SHADOW = require(ABS.shadow_binding_v3);          // frozen chain entry (runShadow)
const R13 = require(ABS.vision_v1_3_rules);             // Vision V1.3 domains (length by category · grammar)
const SUCC_BOUND = json('successor_v4_bound_inputs'); const succRole = (r) => SUCC_BOUND.inputs.find((b) => b.role === r);
const HIST = require(path.join(ROOT, succRole('historical_materialization_reader').path));   // hash-verified by the successor at load
const V5 = JSON.parse(fs.readFileSync(path.join(ROOT, succRole('projection_v5').path), 'utf8'));
const GRC_FIELDS = new Map(); for (const b of SUCC_BOUND.inputs.filter((x) => x.role.startsWith('governed_correction:'))) { const R = JSON.parse(fs.readFileSync(path.join(ROOT, b.path), 'utf8')); const k = R.identity.anchor_id + '|' + R.identity.garment_ref; GRC_FIELDS.set(k, (GRC_FIELDS.get(k) || []).concat(Object.keys(R.after))); }
/* R4 (CEO 2026-10-28 R3-B2): the frozen V2.3.2 evaluator (relational resolvers · bind · multi) — the same hash-pinned module the successor loads, reached through the
   bound successor inputs and verified here again (fail closed); read-only, never re-implemented */
const EVALUATOR_INPUT = succRole('frozen_step2_predicates:evaluator_v2_3_2.js'); const FZ = require(verifyInput(EVALUATOR_INPUT));
const FIT_DOMAIN = json('successor_v2_contract').frozen_observation_domain.fit;
const ALLOWLIST = json('projection_allowlist_v1'); const ALLOWLIST_V5 = json('projection_allowlist_v5_amendment');
if (R13.ALL_PARAMS.length !== 37) throw new TCV2BindingError('VISION_CONTRACT_MISMATCH', 'Vision V1.3 ALL_PARAMS is not the 37-parameter contract');
/** identity of the candidate's own source (seal / regression record) */
function selfIdentity() {
  const dir = path.join(PKG, 'src'); const modules = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => ({ file: 'src/' + f, sha256: sha(path.join(dir, f)) }));
  const h = crypto.createHash('sha256'); modules.forEach((m) => h.update(m.file + ':' + m.sha256 + '\n'));
  return { engine_id: ENGINE_ID, engine_directory: ENGINE_DIRECTORY_ID, engine_status: ENGINE_STATUS, modules, aggregate_sha256: h.digest('hex'), bound_inputs: BOUND.inputs.map((b) => ({ role: b.role, path: b.path, sha256: b.sha256 })) };
}
module.exports = { ENGINE_ID, ENGINE_DIRECTORY_ID, ENGINE_STATUS, BOUND, SUCC, SHADOW, R13, HIST, V5, GRC_FIELDS, FIT_DOMAIN, ALLOWLIST, ALLOWLIST_V5, FZ, EVALUATOR_INPUT, verifyInput, selfIdentity, TCV2BindingError, ROOT };
