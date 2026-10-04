'use strict';
/*
 * Shadow — Comparator (Sprint 1 skeleton).
 * Compares a Legacy-normalized result vs a Clean-normalized result.
 * Comparator status vocabulary is CANDIDATE/PROVISIONAL — defined ONCE here, isolated,
 * NOT frozen as external API vocabulary (per order §3.3, Sprint 1 Spec A5).
 * Replaceable when the final Comparator Contract is approved via Vocabulary Governance.
 */
const { COMPARATOR_STATUS } = require('../../04_CLEAN_ENGINE_CODE/src/runtime/packages');

// PROVISIONAL: single source of truth for comparator states. Do not scatter string literals.
const PROVISIONAL_STATUS = Object.freeze({
  MATCH: COMPARATOR_STATUS.MATCH,
  MISMATCH: COMPARATOR_STATUS.MISMATCH,
  NOT_COMPARABLE: COMPARATOR_STATUS.NOT_COMPARABLE,
  RUNTIME_ERROR: COMPARATOR_STATUS.RUNTIME_ERROR,
  _provisional: true,
});

/**
 * Compare two normalized results. Deterministic; no comparison target -> NOT_COMPARABLE.
 * Sprint 1: Legacy is not connected -> always NOT_COMPARABLE (never a false MISMATCH/failure).
 */
function compare(legacyRec, cleanRec) {
  if (!legacyRec || !cleanRec) {
    return { status: PROVISIONAL_STATUS.NOT_COMPARABLE, reason: 'missing operand' };
  }
  if (legacyRec.connected === false || legacyRec.execution_status === 'NOT_CONNECTED') {
    return { status: PROVISIONAL_STATUS.NOT_COMPARABLE, reason: 'legacy oracle not connected (Sprint 1)' };
  }
  if (cleanRec.execution_status === 'HALTED') {
    return { status: PROVISIONAL_STATUS.RUNTIME_ERROR, reason: 'clean runtime halted' };
  }
  // Full equivalence comparison is defined in a later Migration Track.
  return { status: PROVISIONAL_STATUS.NOT_COMPARABLE, reason: 'skeleton — no scoring to compare' };
}

module.exports = { compare, PROVISIONAL_STATUS };
