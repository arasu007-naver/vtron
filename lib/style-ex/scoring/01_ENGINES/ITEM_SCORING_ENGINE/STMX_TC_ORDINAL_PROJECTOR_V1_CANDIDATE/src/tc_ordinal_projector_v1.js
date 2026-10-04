'use strict';
/**
 * STMX TC ORDINAL PROJECTOR V1 — CANDIDATE (bounded · fail-closed · identity-free).
 * Order: STMX TC MAINLINE V2.3.90. Contract: 04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_TC_ORDINAL_REPRESENTATION_CONTRACT_FREEZE_V1.md (O-1 … O-8).
 * Represents upstream semantics (frozen Direction · frozen Transformative Strength contract · frozen Classic limitation) as an ordinal output; never changes them.
 * Inputs are an allowlisted governed package; no REF / subject identity, Grammar State, Magnitude, count, prominence, Reference or GT field is accepted.
 * No exact tier is derivable under current authority, so no code path emits an exact score (O-6); TC5 is never emitted (O-3).
 */
const RUNTIME_ID = 'STMX_TC_ORDINAL_PROJECTOR_V1_CANDIDATE';
const CONTRACT = 'STMX_TC_ORDINAL_REPRESENTATION_CONTRACT_FREEZE_V1';
const ALLOWED_INPUT = Object.freeze(['subject_ref', 'direction', 'direction_status', 'strength', 'strength_status']);
const DIRECTIONS = Object.freeze(['CLASSIC', 'TRANSFORMATIVE', 'DIRECTION_UNRESOLVED']);
const STRENGTH_STATUS = Object.freeze({ WEAK: 'GOVERNED', REGULAR: 'GOVERNED', STRONG: 'GOVERNED', UNRESOLVED: 'KNOWN_INFORMATION_OR_REPRESENTATION_LIMITATION', NOT_APPLICABLE: 'NOT_APPLICABLE', NOT_ELIGIBLE: 'NOT_ELIGIBLE' });
const SIDE_BOUNDS = Object.freeze({ CLASSIC: Object.freeze({ side: 'CLASSIC', min: 'TC1', max: 'TC4' }), TRANSFORMATIVE: Object.freeze({ side: 'TRANSFORMATIVE', min: 'TC6', max: 'TC9' }) });

class ContractError extends Error { constructor(code, msg) { super(code + ': ' + msg); this.name = 'ContractError'; this.code = code; } }

function validate(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new ContractError('INPUT_NOT_OBJECT', 'governed input package required');
  for (const k of Object.keys(pkg)) if (!ALLOWED_INPUT.includes(k)) throw new ContractError('INPUT_FIELD_NOT_ALLOWED', k + ' is not a governed projector input (O-7)');
  if (!DIRECTIONS.includes(pkg.direction)) throw new ContractError('DIRECTION_INVALID', String(pkg.direction));
  const expectDs = pkg.direction === 'DIRECTION_UNRESOLVED' ? 'UNRESOLVED' : 'RESOLVED';
  if (pkg.direction_status !== expectDs) throw new ContractError('DIRECTION_STATUS_INCONSISTENT', pkg.direction + ' requires direction_status ' + expectDs);
  if (!Object.prototype.hasOwnProperty.call(STRENGTH_STATUS, pkg.strength)) throw new ContractError('STRENGTH_INVALID', String(pkg.strength));
  if (pkg.strength_status !== STRENGTH_STATUS[pkg.strength]) throw new ContractError('STRENGTH_STATUS_INCONSISTENT', pkg.strength + ' requires strength_status ' + STRENGTH_STATUS[pkg.strength]);
  const okStrength = pkg.direction === 'DIRECTION_UNRESOLVED' ? ['NOT_ELIGIBLE'] : pkg.direction === 'CLASSIC' ? ['NOT_APPLICABLE'] : ['WEAK', 'REGULAR', 'STRONG', 'UNRESOLVED'];
  if (!okStrength.includes(pkg.strength)) throw new ContractError('DIRECTION_STRENGTH_COMBINATION_INVALID', pkg.direction + ' with strength ' + pkg.strength + ' (O-5)');
}

function project(pkg) {
  validate(pkg);
  const base = { direction: pkg.direction, direction_status: pkg.direction_status, strength: pkg.strength, strength_status: pkg.strength_status, score: null, score_status: 'UNRESOLVED', authority_status: 'CANDIDATE' };
  let row;
  if (pkg.direction === 'DIRECTION_UNRESOLVED') row = { ordinal_status: 'NOT_ELIGIBLE', ordinal_bounds: null, unresolved_cause: 'DIRECTION_UNRESOLVED', rule: 'O-5/U' };
  else if (pkg.direction === 'CLASSIC') row = { ordinal_status: 'SIDE_KNOWN_WITHIN_SIDE_UNRESOLVED', ordinal_bounds: { ...SIDE_BOUNDS.CLASSIC }, unresolved_cause: 'CLASSIC_IDENTITY_LIMITATION', rule: 'O-5/C' };
  else if (pkg.strength === 'UNRESOLVED') row = { ordinal_status: 'SIDE_KNOWN_WITHIN_SIDE_UNRESOLVED', ordinal_bounds: { ...SIDE_BOUNDS.TRANSFORMATIVE }, unresolved_cause: 'TRANSFORMATIVE_STRENGTH_AUTOMATION_LIMITATION', rule: 'O-5/T-U' };
  else row = { ordinal_status: 'SIDE_KNOWN_WITHIN_SIDE_UNRESOLVED', ordinal_bounds: { ...SIDE_BOUNDS.TRANSFORMATIVE }, unresolved_cause: 'STRENGTH_TIER_RELATION_NOT_ESTABLISHED', rule: 'O-5/T-WRS' };
  const out = Object.assign(base, { ordinal_status: row.ordinal_status, ordinal_bounds: row.ordinal_bounds, unresolved_cause: row.unresolved_cause, provenance: { projector: RUNTIME_ID, contract: CONTRACT, rule: row.rule } });
  if (pkg.subject_ref !== undefined) out.subject_ref = pkg.subject_ref; // echoed for joining only; never read by any rule
  return out;
}

module.exports = { RUNTIME_ID, CONTRACT, ALLOWED_INPUT, SIDE_BOUNDS, ContractError, project };
