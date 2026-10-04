'use strict';
/*
 * STMX Clean Engine — Runtime Package Contracts (Sprint 1 skeleton)
 * Architecture: FROZEN V1.0 (CLEAN_ARCHITECTURE_FREEZE_V1_0)
 * Scope: Package factory + status/error/comparator enums ONLY.
 *        NO scoring, NO governance, NO knowledge, NO calibration logic.
 * Contract refs: Sprint 1 Spec A1 (Package Matrix), A2 (Stub), A3 (Empty-Knowledge),
 *                A4 (Error), A5 (Comparator).
 * Vocabulary: Frozen Reference package names only. No new vocabulary.
 */

// The 8 Frozen Runtime Packages (Runtime Execution Architecture, D3/D5).
const PACKAGE_TYPES = Object.freeze({
  OBSERVATION: 'ObservationPackage',        // L1 output
  CANONICAL: 'CanonicalPackage',            // L2 output
  DERIVED: 'DerivedPackage',                // L3 output
  PROJECTION_CONTEXT: 'ProjectionContext',  // L4 output
  APPLICABLE_KNOWLEDGE_SET: 'ApplicableKnowledgeSet', // L5 output
  INTERACTION_CONTEXT: 'InteractionContext',// L6 output
  DECISION: 'DecisionPackage',              // L7 output
  OUTPUT: 'OutputPackage',                  // L8 output
});

// Layer implementation status (A2/A3). Stubs return NOT_IMPLEMENTED.
const LAYER_STATUS = Object.freeze({
  OK: 'OK',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  PARTIAL_KNOWLEDGE: 'PARTIAL_KNOWLEDGE',
  KNOWLEDGE_MISSING: 'KNOWLEDGE_MISSING',
  KNOWLEDGE_CONFLICT: 'KNOWLEDGE_CONFLICT',
});

// Error/status taxonomy (A4) — kept distinct, never merged into one 'error'.
const ERROR_TYPE = Object.freeze({
  CONTRACT_VIOLATION: 'CONTRACT_VIOLATION',       // Hard Stop
  MISSING_REQUIRED_INPUT: 'MISSING_REQUIRED_INPUT', // Hard Stop
  LAYER_NOT_IMPLEMENTED: 'LAYER_NOT_IMPLEMENTED',   // Not Comparable
  KNOWLEDGE_MISSING: 'KNOWLEDGE_MISSING',           // partial
  KNOWLEDGE_CONFLICT: 'KNOWLEDGE_CONFLICT',         // flag
  RUNTIME_FAILURE: 'RUNTIME_FAILURE',               // stop + log
  COMPARATOR_MISMATCH: 'COMPARATOR_MISMATCH',       // record
  NOT_COMPARABLE: 'NOT_COMPARABLE',                 // normal, not failure
});

// Comparator result states (A5) — CANDIDATE vocabulary, pending Vocabulary Governance review.
const COMPARATOR_STATUS = Object.freeze({
  MATCH: 'MATCH',
  MISMATCH: 'MISMATCH',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  NOT_COMPARABLE: 'NOT_COMPARABLE',
  MISSING_KNOWLEDGE: 'MISSING_KNOWLEDGE',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
});

/**
 * Create an immutable Runtime Package (transfer bundle, NOT a new Identity).
 * A1: owns only its layer's output; carries provenance; upstream never mutated.
 * Object.freeze enforces Immutable Upstream (mutation attempts throw in strict mode).
 */
function createPackage(type, producer, data, status, provenance) {
  if (!Object.values(PACKAGE_TYPES).includes(type)) {
    throw new Error(ERROR_TYPE.CONTRACT_VIOLATION + ': unknown package type ' + type);
  }
  const pkg = {
    type: type,
    producer: producer,          // owning layer, e.g. 'L1'
    status: status || LAYER_STATUS.NOT_IMPLEMENTED,
    data: Object.freeze(data || {}),           // layer output payload (empty in Sprint 1)
    provenance: Object.freeze(provenance || {}), // source trace (A1 Provenance Preservation)
  };
  return Object.freeze(pkg);
}

/** Empty output package for a stub layer (A2: empty output + explicit status). */
function emptyPackage(type, producer, note) {
  return createPackage(type, producer, {}, LAYER_STATUS.NOT_IMPLEMENTED, {
    note: note || 'Sprint 1 stub — layer logic not implemented',
    architecture: 'CLEAN_ARCHITECTURE_FREEZE_V1_0',
  });
}

module.exports = {
  PACKAGE_TYPES,
  LAYER_STATUS,
  ERROR_TYPE,
  COMPARATOR_STATUS,
  createPackage,
  emptyPackage,
};
