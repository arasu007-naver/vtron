'use strict';
/**
 * STMX SR ENGINE — PRODUCTION CONTRACT BINDING V1 (full engine · FINAL FREEZE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-15
 *   Order:          STMX SR — ORDINAL PROJECTOR FINAL CORRECTION + FULL ENGINE FINAL FREEZE §8 / §14 / §15
 *   Reason:         The complete SR chain — governed evidence eligibility → Direction V1.2 → ternary Strength V1.3 → corrected
 *                   Ordinal Projector V1 — is bound deterministically BY NAME for production. No component is copied or rewritten:
 *                   each is resolved by its explicit directory / module name and verified against the FINAL seal.
 *   Affected Scope: this module · ../src/sr_engine_v1_final.js · ../CODE_FREEZE_SEAL_SR_ENGINE_V1_FINAL.json ·
 *                   ../../STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json
 *
 * ⛔ NAMED, never "latest". No directory scan, no glob, no mtime comparison, no auto-discovery, no auto-pick.
 * ⛔ A missing dependency throws and fails closed. Nothing falls back to V1 / V1.1 / the candidate projector.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ENGINE_ID = 'STMX_SR_ENGINE_V1';
const ENGINE_DIRECTORY_ID = 'STMX_SR_ENGINE_V1_FINAL_FREEZE';
const DIRECTION_ENGINE_DIRECTORY_ID = 'STMX_SR_DIRECTION_FIRST_ENGINE_V1_2';      /* eligibility gate + Direction V1.2 (+ legacy binary Strength / legacy ordinal, diagnostic only) */
const DIRECTION_ENGINE_ID = 'STMX_SR_ENGINE_V1_2';
const STRENGTH_ENGINE_DIRECTORY_ID = 'STMX_SR_STRENGTH_TERNARY_V1_3_CANDIDATE';   /* ternary Strength V1.3 — directory name retained verbatim (never renamed in place); frozen by hash in the seal */
const STRENGTH_ENGINE_ID = 'STMX_SR_ENGINE_V1_3_SIDECAR';
const ORDINAL_PROJECTOR_ID = 'STMX_SR_ORDINAL_PROJECTOR_V1_FINAL';
const OBSERVATION_CONTRACT_ID = 'STMX_VISION_PRODUCER_V1_3';
const ELIGIBILITY_AUTHORITY_ID = 'sr_evidence_eligibility_registry_v1';           /* authority identity only — ⛔ the engine never reads the registry; the caller supplies sr_evidence_eligibility */

const ISE = path.resolve(__dirname, '..', '..');
const IVE = path.resolve(ISE, '..', 'ITEM_VISION_EXTRACTOR');
const DIRECTION_DIR = path.join(ISE, DIRECTION_ENGINE_DIRECTORY_ID, 'src');
const STRENGTH_DIR = path.join(ISE, STRENGTH_ENGINE_DIRECTORY_ID, 'src');
const PROJECTOR_FILE = path.resolve(__dirname, '..', 'src', 'sr_ordinal_projector_v1_final.js');
const OBSERVATION_DIR = path.join(IVE, OBSERVATION_CONTRACT_ID);
const ELIGIBILITY_REGISTRY = path.join(ISE, DIRECTION_ENGINE_DIRECTORY_ID, 'registry', ELIGIBILITY_AUTHORITY_ID + '.json');
const SEAL_PATH = path.resolve(__dirname, '..', 'CODE_FREEZE_SEAL_SR_ENGINE_V1_FINAL.json');

/** Dependency resolution — exported so a test can prove the fail-closed behaviour with a stubbed existence check. */
function resolveDependencies(existsSync) {
  const ex = existsSync || fs.existsSync;
  if (!ex(path.join(DIRECTION_DIR, 'sr_engine_v1_2.js'))) throw new Error('SR_DIRECTION_ENGINE_UNRESOLVED: ' + DIRECTION_ENGINE_DIRECTORY_ID + ' is missing. ⛔ FAIL CLOSED.');
  if (!ex(path.join(DIRECTION_DIR, 'sr_evidence_eligibility_gate_v1.js'))) throw new Error('SR_ELIGIBILITY_GATE_UNRESOLVED: the governed eligibility gate is missing. ⛔ FAIL CLOSED.');
  if (!ex(path.join(STRENGTH_DIR, 'sr_engine_v1_3_sidecar.js')) || !ex(path.join(STRENGTH_DIR, 'sr_strength_resolver_v1_3_candidate.js'))) throw new Error('SR_STRENGTH_ENGINE_UNRESOLVED: ' + STRENGTH_ENGINE_DIRECTORY_ID + ' is missing. ⛔ FAIL CLOSED.');
  if (!ex(PROJECTOR_FILE)) throw new Error('SR_ORDINAL_PROJECTOR_UNRESOLVED: ' + ORDINAL_PROJECTOR_ID + ' is missing. ⛔ FAIL CLOSED — never fall back to the candidate projector.');
  if (!ex(path.join(OBSERVATION_DIR, 'producer_rules_v1.js'))) throw new Error('SR_OBSERVATION_CONTRACT_UNRESOLVED: ' + OBSERVATION_CONTRACT_ID + ' is missing. ⛔ FAIL CLOSED.');
  return true;
}
resolveDependencies();

const direction = require(path.join(DIRECTION_DIR, 'sr_engine_v1_2'));
const strength = require(path.join(STRENGTH_DIR, 'sr_engine_v1_3_sidecar'));
const projector = require(PROJECTOR_FILE);
/* identity assertions — a renamed or substituted module fails closed */
if (direction.ENGINE_ID !== DIRECTION_ENGINE_ID) throw new Error('SR_DIRECTION_ENGINE_IDENTITY_MISMATCH: ' + direction.ENGINE_ID + ' ≠ ' + DIRECTION_ENGINE_ID + '. ⛔ FAIL CLOSED.');
if (direction.OBSERVATION_CONTRACT_ID !== OBSERVATION_CONTRACT_ID) throw new Error('SR_OBSERVATION_CONTRACT_IDENTITY_MISMATCH: ' + direction.OBSERVATION_CONTRACT_ID + '. ⛔ FAIL CLOSED.');
if (strength.ENGINE_ID !== STRENGTH_ENGINE_ID || strength.BASE_ENGINE_ID !== DIRECTION_ENGINE_ID) throw new Error('SR_STRENGTH_ENGINE_IDENTITY_MISMATCH. ⛔ FAIL CLOSED.');
if (projector.PROJECTOR_ID !== ORDINAL_PROJECTOR_ID) throw new Error('SR_ORDINAL_PROJECTOR_IDENTITY_MISMATCH: ' + projector.PROJECTOR_ID + '. ⛔ FAIL CLOSED.');

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
/** ★ Drift check against the FINAL seal — Direction modules, Strength modules, projector, engine, this binding, observation contract, eligibility authority. */
function verifyFrozenBaseline() {
  if (!fs.existsSync(SEAL_PATH)) return { checked: false, ok: null, drift: [] };
  const seal = JSON.parse(fs.readFileSync(SEAL_PATH, 'utf8'));
  const ROOT = path.resolve(ISE, '..', '..');
  const drift = [];
  const check = list => (list || []).forEach(m => { const f = path.resolve(ROOT, m.file); if (!fs.existsSync(f) || sha(f) !== m.sha256) drift.push(m.file); });
  check(seal.direction_modules); check(seal.strength_modules); check(seal.ordinal_projector_modules); check(seal.engine_modules);
  ((seal.observation_contract && seal.observation_contract.modules) || []).forEach(m => { const f = path.join(OBSERVATION_DIR, m.file); if (!fs.existsSync(f) || sha(f) !== m.sha256) drift.push(OBSERVATION_CONTRACT_ID + '/' + m.file); });
  if (seal.eligibility_authority && (!fs.existsSync(ELIGIBILITY_REGISTRY) || sha(ELIGIBILITY_REGISTRY) !== seal.eligibility_authority.sha256)) drift.push(seal.eligibility_authority.file);
  return { checked: true, ok: drift.length === 0, drift, full_sr_engine_aggregate_sha256: seal.full_sr_engine_aggregate_sha256, full_identity_sha256: seal.full_identity_sha256, status: seal['★_status'] };
}

module.exports = {
  ENGINE_ID, ENGINE_DIRECTORY_ID, DIRECTION_ENGINE_DIRECTORY_ID, DIRECTION_ENGINE_ID, STRENGTH_ENGINE_DIRECTORY_ID, STRENGTH_ENGINE_ID, ORDINAL_PROJECTOR_ID, OBSERVATION_CONTRACT_ID, ELIGIBILITY_AUTHORITY_ID,
  DIRECTION_DIR, STRENGTH_DIR, PROJECTOR_FILE, OBSERVATION_DIR, ELIGIBILITY_REGISTRY, SEAL_PATH, resolveDependencies, verifyFrozenBaseline, sha,
  direction, strength, projector,
};
