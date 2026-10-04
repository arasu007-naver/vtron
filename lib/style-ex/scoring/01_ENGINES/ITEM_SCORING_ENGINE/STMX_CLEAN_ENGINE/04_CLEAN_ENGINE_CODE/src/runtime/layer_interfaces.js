'use strict';
/*
 * STMX Clean Engine — Layer Interface Contract Registry (Sprint 1 skeleton)
 * Architecture: FROZEN V1.0. Scope: I/O contract descriptors + contract validation ONLY.
 * Contract refs: Sprint 1 Spec A1/A6; Runtime Execution Architecture (single-direction, read-only).
 * NO business logic.
 */

const { PACKAGE_TYPES, ERROR_TYPE } = require('./packages');

// Frozen single-direction pipeline: each layer's expected input & output package.
// (Runtime Execution Architecture D3 — Package-level I/O contract.)
const LAYER_CONTRACTS = Object.freeze({
  L1: { input: 'Image',                                  output: PACKAGE_TYPES.OBSERVATION },
  L2: { input: PACKAGE_TYPES.OBSERVATION,                output: PACKAGE_TYPES.CANONICAL },
  L3: { input: PACKAGE_TYPES.CANONICAL,                  output: PACKAGE_TYPES.DERIVED },
  L4: { input: PACKAGE_TYPES.DERIVED,                    output: PACKAGE_TYPES.PROJECTION_CONTEXT },
  L5: { input: PACKAGE_TYPES.PROJECTION_CONTEXT,         output: PACKAGE_TYPES.APPLICABLE_KNOWLEDGE_SET },
  L6: { input: PACKAGE_TYPES.APPLICABLE_KNOWLEDGE_SET,   output: PACKAGE_TYPES.INTERACTION_CONTEXT },
  L7: { input: PACKAGE_TYPES.INTERACTION_CONTEXT,        output: PACKAGE_TYPES.DECISION },
  L8: { input: PACKAGE_TYPES.DECISION,                   output: PACKAGE_TYPES.OUTPUT },
});

const LAYER_ORDER = Object.freeze(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']);

/**
 * Contract validation (A6: Contract Violation -> Hard Stop).
 * Verifies an incoming package matches the layer's declared input type.
 * L1 accepts a raw Image (no upstream package).
 */
function validateInputContract(layer, inputPkg) {
  const contract = LAYER_CONTRACTS[layer];
  if (!contract) {
    throw new Error(ERROR_TYPE.CONTRACT_VIOLATION + ': unknown layer ' + layer);
  }
  if (contract.input === 'Image') return true; // L1 entry
  if (!inputPkg || inputPkg.type !== contract.input) {
    throw new Error(
      ERROR_TYPE.CONTRACT_VIOLATION +
      ': ' + layer + ' expected input ' + contract.input +
      ' but got ' + (inputPkg && inputPkg.type)
    );
  }
  return true;
}

/** Verifies a produced package matches the layer's declared output type. */
function validateOutputContract(layer, outputPkg) {
  const contract = LAYER_CONTRACTS[layer];
  if (!outputPkg || outputPkg.type !== contract.output) {
    throw new Error(
      ERROR_TYPE.CONTRACT_VIOLATION +
      ': ' + layer + ' expected output ' + contract.output +
      ' but produced ' + (outputPkg && outputPkg.type)
    );
  }
  return true;
}

module.exports = { LAYER_CONTRACTS, LAYER_ORDER, validateInputContract, validateOutputContract };
