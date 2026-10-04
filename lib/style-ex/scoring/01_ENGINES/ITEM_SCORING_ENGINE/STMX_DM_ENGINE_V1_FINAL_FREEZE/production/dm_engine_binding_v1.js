'use strict';
/**
 * STMX DM ENGINE — PRODUCTION CONTRACT BINDING V1 (full engine · FINAL FREEZE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-13
 *   Order:          STMX DM DIRECTION-BSC-1 OBSERVATION CONTRACT COVERAGE CORRECTION + FULL ENGINE FINAL FREEZE V1 §44 / §45 / §46 / §48
 *   Reason:         DIRECTION-BSC-1 closed by the observation-contract coverage correction (Option A).
 *                   The engine bytes are UNCHANGED from the 2026-09-12 HOLD build; what changed is the
 *                   observation contract the engine consumes: STMX_VISION_PRODUCER_V1_3. This binding
 *                   names that contract explicitly and fails closed if it — or the coverage guarantee it
 *                   exists to provide — is missing. The HOLD build's binding (STMX_DM_ENGINE_V1_PRODUCTION_
 *                   CLOSURE/production/dm_engine_binding_v1.js) is kept as historical evidence and remains
 *                   the rollback entry point.
 *   Affected Scope: this module · CODE_FREEZE_SEAL_DM_ENGINE_V1_FINAL.json · STMX_DM_ENGINE_PRODUCTION_AUTHORITY_V1.json
 *
 * ⛔ NAMED, never "latest". No directory scan, no glob, no mtime comparison, no auto-discovery.
 * ⛔ No Direction V2, no Strength V2, no Final Score V2. Engine identity STMX_DM_ENGINE_V1 is unchanged.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ENGINE_ID = 'STMX_DM_ENGINE_V1';
const ENGINE_DIRECTORY_ID = 'STMX_DM_DIRECTION_FIRST_ENGINE_V1';
/** ★ the Observation contract this engine consumes — the coverage-corrected successor */
const OBSERVATION_CONTRACT_ID = 'STMX_VISION_PRODUCER_V1_3';
/** the HOLD build's contract, retained as the named rollback target of the observation dependency */
const OBSERVATION_CONTRACT_ROLLBACK_ID = 'STMX_VISION_PRODUCER_V1_2';

const ISE = path.resolve(__dirname, '..', '..');
const IVE = path.resolve(ISE, '..', 'ITEM_VISION_EXTRACTOR');
const ENGINE_DIR = path.join(ISE, ENGINE_DIRECTORY_ID, 'engine');
const M1_PREDICATE = path.join(ISE, 'STMX_DM_OBSERVATION_LAYER_IMPLEMENTATION_V1', 'engine', 'dm_m1_predicate_v1.js');
const OBSERVATION_DIR = path.join(IVE, OBSERVATION_CONTRACT_ID);

if (!fs.existsSync(path.join(ENGINE_DIR, 'dm_engine_v1.js')))
  throw new Error('DM_ENGINE_UNRESOLVED: ' + ENGINE_DIRECTORY_ID + ' is missing. ⛔ FAIL CLOSED.');
if (!fs.existsSync(M1_PREDICATE))
  throw new Error('DM_M1_PREDICATE_UNRESOLVED: the frozen M1 predicate is missing. ⛔ FAIL CLOSED.');
if (!fs.existsSync(path.join(OBSERVATION_DIR, 'producer_rules_v1.js')))
  throw new Error('DM_OBSERVATION_CONTRACT_UNRESOLVED: ' + OBSERVATION_CONTRACT_ID + ' is missing. ⛔ FAIL CLOSED — never fall back to ' + OBSERVATION_CONTRACT_ROLLBACK_ID + ' implicitly.');

const observationRules = require(path.join(OBSERVATION_DIR, 'producer_rules_v1.js'));
/** ★ the two facts this binding exists to guarantee, read FROM the bound contract, never asserted here */
if (observationRules.DM_OBSERVATION_REQUIRED !== true)
  throw new Error('DM_OBSERVATION_CONTRACT_UNRESOLVED: ' + OBSERVATION_CONTRACT_ID + ' does not enforce DM observation requiredness. ⛔ FAIL CLOSED.');
const missingCoverage = (observationRules.DM_DESCRIPTORS || []).filter(f => !(observationRules.DM_REALIZATION_ELIGIBLE_FAMILIES || []).includes(f));
if (missingCoverage.length)
  throw new Error('DM_REALIZATION_COVERAGE_UNRESOLVED: ' + OBSERVATION_CONTRACT_ID + ' cannot carry the bounded-support observation on ' + missingCoverage.join(', ') + ' — DIRECTION-BSC-1 would be open. ⛔ FAIL CLOSED.');

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const SEAL_PATH = path.join(__dirname, '..', 'CODE_FREEZE_SEAL_DM_ENGINE_V1_FINAL.json');

/** ★ Drift check against the FINAL seal — engine modules, M1 predicate and the observation contract. */
function verifyFrozenBaseline() {
  if (!fs.existsSync(SEAL_PATH)) return { checked: false, ok: null, drift: [] };
  const seal = JSON.parse(fs.readFileSync(SEAL_PATH, 'utf8'));
  const drift = seal.engine_modules.filter(m => sha(path.join(ISE, ENGINE_DIRECTORY_ID, m.file)) !== m.sha256).map(m => m.file);
  if (sha(M1_PREDICATE) !== seal.m1_predicate.sha256) drift.push(seal.m1_predicate.file);
  seal.observation_contract.modules.forEach(m => { if (sha(path.join(OBSERVATION_DIR, m.file)) !== m.sha256) drift.push(OBSERVATION_CONTRACT_ID + '/' + m.file); });
  return { checked: true, ok: drift.length === 0, drift, engine_aggregate_sha256: seal.engine_aggregate_sha256, full_identity_sha256: seal.full_identity_sha256, status: seal['★_status'] };
}

module.exports = {
  ENGINE_ID, ENGINE_DIRECTORY_ID, OBSERVATION_CONTRACT_ID, OBSERVATION_CONTRACT_ROLLBACK_ID, ENGINE_DIR, M1_PREDICATE, OBSERVATION_DIR, SEAL_PATH, verifyFrozenBaseline, sha,
  engine: require(path.join(ENGINE_DIR, 'dm_engine_v1.js')),
  admission: require(path.join(ENGINE_DIR, 'dm_admission_v1.js')),
  direction: require(path.join(ENGINE_DIR, 'dm_direction_resolver_v1.js')),
  strength: require(path.join(ENGINE_DIR, 'dm_strength_resolver_v1.js')),
  projector: require(path.join(ENGINE_DIR, 'dm_ordinal_projector_v1.js')),
  refinement: require(path.join(ENGINE_DIR, 'dm_m1_m2_refinement_v1.js')),
  observation: {
    rules: observationRules,
    validator: require(path.join(OBSERVATION_DIR, 'producer_validator_v1.js')),
    controller: require(path.join(OBSERVATION_DIR, 'producer_controller_v1.js')),
    promptSource: () => fs.readFileSync(path.join(OBSERVATION_DIR, 'producer_prompt_v1.js'), 'utf8'),
  },
};
