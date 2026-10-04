'use strict';
/*
 * L8 Decision Output — Sprint 1 stub.
 * Owns: Output 조립(verdict/evidence/confidence). Does NOT compute score; assembles only.
 * Returns explicit incomplete/non-decision output (§9 output skeleton shape).
 */
const { PACKAGE_TYPES, createPackage, LAYER_STATUS } = require('../runtime/packages');

module.exports = function l8_output(decisionPackage) {
  var complete = !!(decisionPackage && decisionPackage.data && decisionPackage.data.decisionComplete);
  return createPackage(
    PACKAGE_TYPES.OUTPUT,
    'L8',
    {
      decision_status: complete ? 'DECIDED' : 'NOT_IMPLEMENTED',
      decision_payload: {}, // empty until L7 produces a real decision
    },
    LAYER_STATUS.NOT_IMPLEMENTED,
    { note: 'L8 Output stub — incomplete/non-decision output assembly' }
  );
};
