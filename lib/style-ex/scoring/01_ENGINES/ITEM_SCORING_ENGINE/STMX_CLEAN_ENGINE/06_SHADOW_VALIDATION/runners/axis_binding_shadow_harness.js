'use strict';
/*
 * SHADOW / CANDIDATE INTEGRATION HARNESS — VERIFICATION_TOOL / NON_FROZEN.
 * Feeds governed inputs (e.g. a governed scoring-unit identity) into the Clean Engine's L7-owned axis-runtime binding
 * in SHADOW mode, where a CANDIDATE authority may execute. Not a forward runtime, not an application path, no
 * production side effects. It adds no logic: it only calls the binding and returns its envelopes.
 */
const { createAxisBinding } = require('../../04_CLEAN_ENGINE_CODE/src/layers/l7_axis_runtime_binding');

const HARNESS_ROLE = 'SHADOW / CANDIDATE INTEGRATION HARNESS';

function runShadow(axis, governedInputs) {
  const binding = createAxisBinding({ mode: 'SHADOW' });
  return governedInputs.map((input) => binding.invoke(axis, input));
}

module.exports = { runShadow, HARNESS_ROLE };
