'use strict';
/*
 * Shadow — Clean Result Adapter (Sprint 1 skeleton).
 * Runs the Clean runtime skeleton and normalizes its output for the Comparator.
 * No production side effects.
 */
const { run } = require('../../04_CLEAN_ENGINE_CODE/src/runtime/runtime_skeleton');

/** Produce a normalized comparable record from the Clean engine. */
function cleanResult(image, opts) {
  const r = run(image, opts);
  return Object.freeze({
    source: 'CLEAN',
    execution_status: r.execution_status,
    layer_statuses: r.layer_statuses,
    decision_status: r.decision_status,
    scores: {},                 // Sprint 1: none fabricated
    errors: r.errors,
  });
}

module.exports = { cleanResult };
