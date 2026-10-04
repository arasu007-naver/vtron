'use strict';
/*
 * L4 Projection — Sprint 1 stub.
 * Owns: 축별 View 선택(Projection Profile). Forbidden: 새 의미·score·cross-axis.
 * Consumes Canonical + Derived; here receives DerivedPackage per single-direction contract.
 */
const { PACKAGE_TYPES, emptyPackage } = require('../runtime/packages');

module.exports = function l4_projection(derivedPackage) {
  void derivedPackage; // read-only; no projection logic in Sprint 1
  return emptyPackage(PACKAGE_TYPES.PROJECTION_CONTEXT, 'L4', 'L4 Projection stub');
};
