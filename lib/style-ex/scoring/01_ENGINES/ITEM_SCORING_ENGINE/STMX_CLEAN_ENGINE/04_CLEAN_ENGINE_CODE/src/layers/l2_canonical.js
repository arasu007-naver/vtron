'use strict';
/*
 * L2 Universal Canonical — orchestrator (Sprint 3). Replaces the Sprint 1 stub.
 * Consumes L1 ObservationPackage (read-only), produces the Frozen CanonicalPackage.
 * Axis-neutral: NO axis judgement, NO score, NO projection, NO derivation.
 * status = execution (OK); data.valid = canonical contract validity (separation kept).
 */
const { PACKAGE_TYPES, createPackage, LAYER_STATUS } = require('../runtime/packages');
const builder = require('./l2_builder');
const validator = require('./l2_validator');

module.exports = function l2_canonical(observationPackage) {
  var built = builder.build(observationPackage);
  var v = validator.validate(observationPackage, built.canonical, built.unknowns);

  return createPackage(
    PACKAGE_TYPES.CANONICAL,
    'L2',
    {
      canonical: built.canonical,
      unknowns: built.unknowns,
      validation: v,
      implemented: true,
      valid: v.ok,
    },
    LAYER_STATUS.OK,          // execution succeeded; validity in data.valid
    { source_layer: 'L1', layer: 'L2', note: 'L2 Universal Canonical (real, Sprint 3)' }
  );
};
