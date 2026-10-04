'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1.2 — NAMED OBSERVATION CONTRACT BINDING (candidate)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-13 (named binding · V1) · 2026-09-14 (material + structure-relevant surface = bounded
 *                   SR Direction support) · 2026-09-15 (order: V1.2 cross-side closure implementation)
 *   Reason:         The SR candidate consumes exactly one observation contract, STMX_VISION_PRODUCER_V1_3, bound by
 *                   its governed name. V1.2 additionally binds the two already-governed observations the CEO admitted
 *                   as BOUNDED SUPPORT (`material` · `surface`) — by name, from the same contract. ⛔ No new
 *                   parameter, no new enum: both are existing members of the 37-parameter contract.
 *   Affected Scope: this module only. ⛔ The Producer itself is not altered.
 *
 * ⛔ NAMED, never "latest". No directory scan, no glob, no mtime comparison, no auto-discovery, no newest-folder.
 * ⛔ IMPLEMENTATION CANDIDATE — production promotion is NOT authorized by the issuing order.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ENGINE_ID = 'STMX_SR_ENGINE_V1_2';
const ENGINE_DIRECTORY_ID = 'STMX_SR_DIRECTION_FIRST_ENGINE_V1_2';
const ENGINE_STATUS = 'IMPLEMENTATION_CANDIDATE — NOT PRODUCTION';
const OBSERVATION_CONTRACT_ID = 'STMX_VISION_PRODUCER_V1_3';
const EXPECTED_PARAMETER_COUNT = 37;

const ISE = path.resolve(__dirname, '..', '..');
const IVE = path.resolve(ISE, '..', 'ITEM_VISION_EXTRACTOR');
const OBSERVATION_DIR = path.join(IVE, OBSERVATION_CONTRACT_ID);

if (!fs.existsSync(path.join(OBSERVATION_DIR, 'producer_rules_v1.js')))
  throw new Error('SR_OBSERVATION_CONTRACT_UNRESOLVED: ' + OBSERVATION_CONTRACT_ID + ' is missing at ' + OBSERVATION_DIR + '. ⛔ FAIL CLOSED — no implicit fallback to any other Producer generation.');

const rules = require(path.join(OBSERVATION_DIR, 'producer_rules_v1.js'));
if (!Array.isArray(rules.ALL_PARAMS) || rules.ALL_PARAMS.length !== EXPECTED_PARAMETER_COUNT)
  throw new Error('SR_OBSERVATION_CONTRACT_MISMATCH: expected ' + EXPECTED_PARAMETER_COUNT + ' parameters in ' + OBSERVATION_CONTRACT_ID + ', found ' + (rules.ALL_PARAMS || []).length + '. ⛔ FAIL CLOSED.');
/* every SR-owned carrier must exist in the bound contract, by name */
const SR_CARRIERS = ['fit', 'fabric_behavior', 'shoulder_structure', 'shoulder_drop', 'waist_definition', 'length', 'silhouette'];
/* V1.2 — bounded-support carriers (CEO 2026-09-14). They are NOT Direction carriers: they never appear in the SR
 * governed signature, they are never governance, they are never release. They exist in the contract as MULTI
 * observations (`values[]`), and V1.2 reads them only as such. */
const SR_SUPPORT_CARRIERS = ['material', 'surface'];
const missing = SR_CARRIERS.concat(SR_SUPPORT_CARRIERS).filter(c => !rules.ALL_PARAMS.includes(c));
if (missing.length)
  throw new Error('SR_OBSERVATION_CONTRACT_MISMATCH: ' + OBSERVATION_CONTRACT_ID + ' does not carry ' + missing.join(', ') + '. ⛔ FAIL CLOSED.');
const notMulti = SR_SUPPORT_CARRIERS.filter(c => !(Array.isArray(rules.MULTI) && rules.MULTI.includes(c)));
if (notMulti.length)
  throw new Error('SR_OBSERVATION_CONTRACT_MISMATCH: ' + notMulti.join(', ') + ' is not a MULTI observation in ' + OBSERVATION_CONTRACT_ID + '. ⛔ FAIL CLOSED.');
/* the retired Bottom carriers must NOT be present — the contract forbids them and so does this engine (Guard SR-DIR-9) */
const RETIRED = ['hip_thigh_control', 'release_behavior', 'silhouette_expansion', 'body_fitting'];
const resurrected = RETIRED.filter(c => rules.ALL_PARAMS.includes(c));
if (resurrected.length)
  throw new Error('SR_RETIRED_CARRIER_RESURRECTED: ' + resurrected.join(', ') + ' found in ' + OBSERVATION_CONTRACT_ID + '. ⛔ FAIL CLOSED.');

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const CONTRACT_MODULES = ['producer_rules_v1.js', 'producer_prompt_v1.js', 'producer_validator_v1.js', 'producer_controller_v1.js', 'producer_model_adapter_v1.js'];

/** contract facts the engine reads FROM the bound Producer, never asserts itself */
function applicableCarriers(category) {
  const set = rules.applicableSet(category);
  return SR_CARRIERS.filter(c => set.has(c));
}
function applicableSupportCarriers(category) {
  const set = rules.applicableSet(category);
  return SR_SUPPORT_CARRIERS.filter(c => set.has(c));
}
function domainFor(param, category) { try { return rules.domainFor(param, category); } catch (e) { return null; } }
function contractIdentity() {
  return {
    engine_id: ENGINE_ID, engine_directory: ENGINE_DIRECTORY_ID, engine_status: ENGINE_STATUS,
    observation_contract: OBSERVATION_CONTRACT_ID, observation_path: OBSERVATION_DIR,
    parameter_count: rules.ALL_PARAMS.length,
    modules: CONTRACT_MODULES.map(f => ({ file: f, sha256: fs.existsSync(path.join(OBSERVATION_DIR, f)) ? sha(path.join(OBSERVATION_DIR, f)) : null })),
  };
}

module.exports = { ENGINE_ID, ENGINE_DIRECTORY_ID, ENGINE_STATUS, OBSERVATION_CONTRACT_ID, OBSERVATION_DIR, SR_CARRIERS, SR_SUPPORT_CARRIERS, RETIRED, applicableCarriers, applicableSupportCarriers, domainFor, contractIdentity, rules };
