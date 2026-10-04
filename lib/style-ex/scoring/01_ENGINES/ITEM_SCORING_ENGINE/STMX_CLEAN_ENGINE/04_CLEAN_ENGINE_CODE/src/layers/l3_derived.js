'use strict';
/*
 * L3 Derived — Sprint 1 stub.
 * Owns: 결정론 파생 사실(Derivation Identity). Forbidden: canonical 수정·governance·score.
 */
const { PACKAGE_TYPES, emptyPackage } = require('../runtime/packages');

module.exports = function l3_derived(canonicalPackage) {
  void canonicalPackage; // read-only; no derivation logic in Sprint 1
  return emptyPackage(PACKAGE_TYPES.DERIVED, 'L3', 'L3 Derived stub');
};
