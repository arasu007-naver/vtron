'use strict';
/**
 * STMX TC INTEGRATED RUNTIME V1 — CANDIDATE (orchestrator · SHADOW only · not frozen · not production).
 * Order: STMX TC MAINLINE V2.3.91 (TC ENGINE INTEGRATION). Bound by the Clean Engine L7 axis-runtime binding (registry TC entry, D-91-1).
 *
 * Chain (authority order, order §5): governed TC input → frozen Direction (STMX_TC_DIRECTION_FREEZE_V1) → Direction status →
 * Transformative Strength status (frozen contract + frozen automation limitation) → frozen ordinal projector (V1) → output payload.
 * This module consumes existing authority and creates none: it calls the frozen Direction chain and the ordinal projector, routes
 * status, and assembles provenance. It holds no Direction rule, no Strength rule, no tier, threshold, weight or score physics.
 * Downstream never overwrites upstream: the Direction value is passed through verbatim; the projector output is returned verbatim
 * (provenance is extended, never replaced). Every bound input is hash-verified at load; any drift fails closed.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RUNTIME_ID = 'STMX_TC_INTEGRATED_RUNTIME_V1_CANDIDATE';
const INPUT_SCHEMA = 'STMX_TC_INTEGRATED_INPUT_V1';
const DIRECTION_AUTHORITY = 'STMX_TC_DIRECTION_FREEZE_V1';
const STRENGTH_CONTRACT = 'STMX_TC_TRANSFORMATIVE_STRENGTH_SEMANTIC_CONTRACT_FREEZE_V1';
const STRENGTH_LIMITATION = 'STMX_TC_TRANSFORMATIVE_STRENGTH_AUTOMATION_LIMITATION_RECORD_V1';
// No governed automatic Transformative Strength exists (V2.3.89 limitation record: class D, no resolver; BL-89-1 not built).
const GOVERNED_STRENGTH_RESOLVER = null;

const PKG = path.resolve(__dirname, '..');
const ROOT = path.resolve(PKG, '..', '..', '..');

class IntegrationAuthorityError extends Error { constructor(code, msg) { super(code + ': ' + msg + ' ⛔ FAIL CLOSED.'); this.name = 'IntegrationAuthorityError'; this.code = code; } }
class IntegrationContractError extends Error { constructor(code, msg) { super(code + ': ' + msg); this.name = 'IntegrationContractError'; this.code = code; } }

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const BOUND = JSON.parse(fs.readFileSync(path.join(PKG, 'BOUND_INPUTS.json'), 'utf8'));
function bound(role) {
  const b = BOUND.inputs.find((i) => i.role === role);
  if (!b) throw new IntegrationAuthorityError('BOUND_INPUT_MISSING', role + ' is not a bound input');
  const abs = path.join(ROOT, b.path);
  if (!fs.existsSync(abs) || sha256(fs.readFileSync(abs)) !== b.sha256) throw new IntegrationAuthorityError('BOUND_INPUT_DRIFT', role + ' (' + b.path + ') does not match its bound hash');
  return abs;
}
for (const b of BOUND.inputs) bound(b.role); // every bound input verified before anything is loaded

const PROJECTOR = require(bound('ordinal_projector'));
if (PROJECTOR.RUNTIME_ID !== 'STMX_TC_ORDINAL_PROJECTOR_V1_CANDIDATE') throw new IntegrationAuthorityError('PROJECTOR_IDENTITY_MISMATCH', String(PROJECTOR.RUNTIME_ID));
const FREEZE = JSON.parse(fs.readFileSync(bound('direction_freeze_manifest'), 'utf8'));
if (FREEZE.freeze_id !== DIRECTION_AUTHORITY || !/CLOSED_AND_FROZEN/.test(String(FREEZE.status))) throw new IntegrationAuthorityError('DIRECTION_AUTHORITY_MISMATCH', String(FREEZE.freeze_id));

const DIRECTIONS = Object.freeze(['CLASSIC', 'TRANSFORMATIVE', 'DIRECTION_UNRESOLVED']);
const INPUT_FIELDS = Object.freeze(['schema_version', 'direction_authority', 'direction', 'subject_ref']);
const STRENGTH_KEYS = /^(strength|strength_status|transformative_strength)$/i;
const SCORE_KEYS = /^(score|score_status|tier|tc|tc_score|exact_tier)$/i;
const ORDINAL_KEYS = /^(ordinal_bounds|ordinal_status|ordinal_range)$/i;

/** Input-contract validation for one governed Direction result package. No coercion: anything outside the contract is refused. */
function validateInput(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new IntegrationContractError('INPUT_NOT_OBJECT', 'a governed TC input package is required');
  for (const k of Object.keys(pkg)) {
    if (STRENGTH_KEYS.test(k)) throw new IntegrationContractError('STRENGTH_SOURCE_NOT_GOVERNED', k + ' refused — no governed automatic Strength source exists (V2.3.89)');
    if (SCORE_KEYS.test(k)) throw new IntegrationContractError('SCORE_INJECTION_REFUSED', k + ' refused — a score is never an input');
    if (ORDINAL_KEYS.test(k)) throw new IntegrationContractError('ORDINAL_INJECTION_REFUSED', k + ' refused — ordinal representation is produced only by the projector');
    if (!INPUT_FIELDS.includes(k)) throw new IntegrationContractError('INPUT_FIELD_NOT_ALLOWED', k + ' is not a governed TC input field');
  }
  if (pkg.schema_version !== INPUT_SCHEMA) throw new IntegrationContractError('SCHEMA_VERSION_UNKNOWN', String(pkg.schema_version));
  if (pkg.direction_authority !== DIRECTION_AUTHORITY) throw new IntegrationContractError('DIRECTION_AUTHORITY_UNKNOWN', String(pkg.direction_authority));
  if (pkg.direction === undefined || pkg.direction === null || pkg.direction === '') throw new IntegrationContractError('DIRECTION_MISSING', 'direction is required');
  if (!DIRECTIONS.includes(pkg.direction)) throw new IntegrationContractError('DIRECTION_INVALID', String(pkg.direction));
  if (pkg.subject_ref !== undefined && typeof pkg.subject_ref !== 'string') throw new IntegrationContractError('SUBJECT_REF_INVALID', 'subject_ref must be a string when present');
}

/** Direction status: RESOLVED for a resolved side, UNRESOLVED for DIRECTION_UNRESOLVED (ordinal contract O-4 input vocabulary). */
const directionStatus = (direction) => (direction === 'DIRECTION_UNRESOLVED' ? 'UNRESOLVED' : 'RESOLVED');

/** Strength applicability / status routing (order §7). Never infers a Strength value. */
function strengthStatus(direction) {
  if (direction === 'CLASSIC') return { strength: 'NOT_APPLICABLE', strength_status: 'NOT_APPLICABLE' };
  if (direction === 'DIRECTION_UNRESOLVED') return { strength: 'NOT_ELIGIBLE', strength_status: 'NOT_ELIGIBLE' };
  if (direction === 'TRANSFORMATIVE') {
    if (GOVERNED_STRENGTH_RESOLVER === null) return { strength: 'UNRESOLVED', strength_status: 'KNOWN_INFORMATION_OR_REPRESENTATION_LIMITATION' };
    throw new IntegrationAuthorityError('STRENGTH_RESOLVER_NOT_GOVERNED', 'no governed resolver may be wired without CEO authorization');
  }
  throw new IntegrationContractError('DIRECTION_INVALID', String(direction));
}

/** Output guard (fail closed): ordinal contract O-3 · O-5 · O-6 as emitted by the projector. Checks, never repairs. */
function assertOutput(out, direction) {
  const bad = (m) => { throw new IntegrationAuthorityError('OUTPUT_CONTRACT_VIOLATION', m); };
  if (/"TC5"/.test(JSON.stringify(out))) bad('TC5 is retired (O-3)');
  if (out.direction !== direction) bad('Direction changed downstream');
  if (out.score !== null) bad('no CEO-authorized exact relation exists (O-6); score must be null');
  if (out.score_status !== 'UNRESOLVED') bad('score_status must be UNRESOLVED for a null score');
  const b = out.ordinal_bounds;
  if (direction === 'DIRECTION_UNRESOLVED') { if (b !== null || out.ordinal_status !== 'NOT_ELIGIBLE') bad('Direction-U must be NOT_ELIGIBLE with no bounds'); }
  else if (direction === 'CLASSIC') { if (!b || b.side !== 'CLASSIC' || b.min !== 'TC1' || b.max !== 'TC4') bad('Classic bounds must be TC1–TC4'); }
  else if (!b || b.side !== 'TRANSFORMATIVE' || b.min !== 'TC6' || b.max !== 'TC9') bad('Transformative bounds must be TC6–TC9');
}

/** One governed Direction result package → integrated TC output (projector output verbatim + chain provenance). */
function integrateUnit(pkg) {
  validateInput(pkg);
  const s = strengthStatus(pkg.direction);
  const projectorInput = { direction: pkg.direction, direction_status: directionStatus(pkg.direction), strength: s.strength, strength_status: s.strength_status };
  if (pkg.subject_ref !== undefined) projectorInput.subject_ref = pkg.subject_ref; // echoed for joining only; no rule reads it
  const out = PROJECTOR.project(projectorInput);
  assertOutput(out, pkg.direction);
  out.provenance = Object.assign({}, out.provenance, {
    direction_authority: DIRECTION_AUTHORITY,
    strength_authority: { contract: STRENGTH_CONTRACT, limitation_record: STRENGTH_LIMITATION, automatic_resolver: 'NONE' },
    integrated_runtime: RUNTIME_ID,
  });
  return out;
}

/** Governed corpus execution: the frozen Direction chain (verified against its freeze fingerprint) → integrateUnit per scoring unit. */
function runCorpus() {
  const chain = require(bound('direction_chain_binding'));
  const r = chain.runShadow({ registry: 'BOUND' });
  const fp = sha256(JSON.stringify(r.output));
  if (fp !== FREEZE.expected.chain_fingerprint) throw new IntegrationAuthorityError('DIRECTION_FREEZE_NOT_REPRODUCED', 'chain fingerprint ' + fp + ' ≠ frozen ' + FREEZE.expected.chain_fingerprint);
  const units = r.output.units.map((u) => Object.assign({ anchor_id: u.anchor_id }, integrateUnit({ schema_version: INPUT_SCHEMA, direction_authority: DIRECTION_AUTHORITY, direction: u.direction })));
  return { runtime: RUNTIME_ID, status: 'CANDIDATE', direction_authority: { freeze_id: DIRECTION_AUTHORITY, chain_fingerprint: fp, verified: true }, units };
}

module.exports = { RUNTIME_ID, INPUT_SCHEMA, DIRECTION_AUTHORITY, GOVERNED_STRENGTH_RESOLVER, IntegrationAuthorityError, IntegrationContractError, validateInput, directionStatus, strengthStatus, assertOutput, integrateUnit, runCorpus };
