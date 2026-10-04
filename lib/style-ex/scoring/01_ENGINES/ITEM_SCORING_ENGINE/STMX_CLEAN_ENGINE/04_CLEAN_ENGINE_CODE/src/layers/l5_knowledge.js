'use strict';
/*
 * L5 Calibration Knowledge — Sprint 1 stub.
 * Owns: 승인 지식 관리·검색(Knowledge Unit). Passive — L7 consults; NO score.
 * A3 Empty-Knowledge: returns a deterministic EMPTY Applicable Knowledge Set.
 * Knowledge is NOT populated in Sprint 1 -> no KU retrieved, but pipeline must not crash.
 */
const { PACKAGE_TYPES, createPackage, LAYER_STATUS } = require('../runtime/packages');

module.exports = function l5_knowledge(projectionContext) {
  void projectionContext; // read-only; no retrieval logic in Sprint 1
  // Deterministic empty set: no fabricated knowledge.
  return createPackage(
    PACKAGE_TYPES.APPLICABLE_KNOWLEDGE_SET,
    'L5',
    { knowledgeUnits: [] },
    LAYER_STATUS.NOT_IMPLEMENTED,
    { note: 'L5 Knowledge stub — registry not populated; empty Applicable Knowledge Set' }
  );
};
