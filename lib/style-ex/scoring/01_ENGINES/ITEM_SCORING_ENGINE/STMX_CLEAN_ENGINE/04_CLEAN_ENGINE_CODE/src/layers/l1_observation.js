'use strict';
/*
 * L1 Observation — orchestrator (Sprint 2 + Correction).
 * Calls Builder (extract+provenance+unknown) and Validator (required/forbidden/enum/type/duplicate),
 * then produces the Frozen ObservationPackage. External signature & package shape UNCHANGED.
 *
 * STATUS CONTRACT (audited):
 *   LAYER_STATUS enum = { OK, NOT_IMPLEMENTED, PARTIAL_KNOWLEDGE, KNOWLEDGE_MISSING, KNOWLEDGE_CONFLICT }.
 *   It has NO validation state, and adding one would be new vocabulary (forbidden).
 *   Contract (packages/runtime): layer status = EXECUTION success/failure; DATA validity is separate.
 *   => Execution status = LAYER_STATUS.OK (L1 ran successfully).
 *      Observation contract validity = data.valid (from validator). No dead ternary, no fabricated status.
 */
const { PACKAGE_TYPES, createPackage, LAYER_STATUS } = require('../runtime/packages');
const builder = require('./l1_builder');
const validator = require('./l1_validator');

module.exports = function l1_observation(visionInput, opts) {
  opts = opts || {};
  var source = opts.source || 'Vision';

  var built = builder.build(visionInput, source);        // observations + unknowns (lossless)
  var v = validator.validate(visionInput);               // validation record

  // Execution succeeded regardless of data validity (Hard Contract: violations flagged, not hidden).
  var status = LAYER_STATUS.OK;

  return createPackage(
    PACKAGE_TYPES.OBSERVATION,
    'L1',
    {
      observations: built.observations,
      unknowns: built.unknowns,
      validation: v,
      implemented: true,
      valid: v.ok,          // Observation Contract validity (separate from execution status)
    },
    status,
    { source: source, layer: 'L1', note: 'L1 Observation (real, Sprint 2)' }
  );
};
