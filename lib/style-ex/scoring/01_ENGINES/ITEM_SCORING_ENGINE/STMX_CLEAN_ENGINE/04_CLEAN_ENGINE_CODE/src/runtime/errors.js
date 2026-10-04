'use strict';
/*
 * STMX Clean Engine — Error Contract (Sprint 1 skeleton)
 * Contract ref: Sprint 1 Order §7. Distinct error taxonomy (never merged into one 'error').
 * No stack trace / sensitive internals in the error object (§7).
 */

const ERROR_CODE = Object.freeze({
  CONTRACT_VALIDATION: 'CONTRACT_VALIDATION',
  MISSING_REQUIRED_INPUT: 'MISSING_REQUIRED_INPUT',
  FORBIDDEN_INPUT: 'FORBIDDEN_INPUT',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  EMPTY_KNOWLEDGE: 'EMPTY_KNOWLEDGE',
  LAYER_EXECUTION_FAILURE: 'LAYER_EXECUTION_FAILURE',
  COMPARATOR_FAILURE: 'COMPARATOR_FAILURE',
  REGRESSION_FAILURE: 'REGRESSION_FAILURE',
});

/**
 * Build an immutable error record.
 * fields (§7): code, layer, stage, message, recoverable, cause, context.
 */
function makeError(code, layer, stage, message, opts) {
  opts = opts || {};
  return Object.freeze({
    code: code,
    layer: layer || null,
    stage: stage || null,
    message: message || '',
    recoverable: !!opts.recoverable,
    cause: opts.cause || null,     // short cause label, NOT a stack trace
    context: Object.freeze(opts.context || {}),
  });
}

module.exports = { ERROR_CODE, makeError };
