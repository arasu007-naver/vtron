'use strict';
/*
 * L7 Governance & Scoring.
 * Owns: 정책·점수·결정. CRITICAL: NO fabricated scores. Does NOT emit default TC/SR/DM/EI=5.
 * Governance policy (floor · cap · override · verdict) is still NOT_IMPLEMENTED: without populated Knowledge (L5) L7
 * cannot produce an equivalent decision -> non-decision, status NOT_IMPLEMENTED, decisionComplete false.
 *
 * Blueprint Deliverable 3a · G42-A (CEO 2026-09-23 · V2.3.46): L7 fulfils axis scoring for a bound axis through its
 * L7-owned axis-runtime binding and collects each result into data.axis_results[axis] (common envelope).
 * `scores` stays ordinal notation only and is unchanged ({} — no axis score exists). The forward pipeline runs the
 * binding in PRODUCTION mode, so a CANDIDATE authority is resolved and verified but never executed here.
 */
const { PACKAGE_TYPES, createPackage, LAYER_STATUS } = require('../runtime/packages');
const { createAxisBinding } = require('./l7_axis_runtime_binding');

module.exports = function l7_governance_scoring(interactionContext) {
  const binding = createAxisBinding({ mode: 'PRODUCTION' });
  const callerInput = (interactionContext && interactionContext.data) || {};
  const axis_results = {};
  for (const axis of binding.axes) axis_results[axis] = binding.collect(axis, callerInput);
  return createPackage(
    PACKAGE_TYPES.DECISION,
    'L7',
    {
      scores: {},        // NO fabricated axis scores — ordinal notation only; no axis score is produced
      axis_results,      // per-axis common envelopes (semantic result ≠ score)
      verdict: null,     // no KEEP/UPGRADE/REPLACE without real governance
      decisionComplete: false,
    },
    LAYER_STATUS.NOT_IMPLEMENTED,
    { note: 'L7 governance policy not implemented; axis results collected through the L7-owned axis-runtime binding (PRODUCTION mode)' }
  );
};
