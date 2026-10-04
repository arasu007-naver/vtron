'use strict';
/*
 * L2 Universal Canonical Field Spec (Sprint 3).
 * Canonical vocabulary == L1 observation vocabulary (Vision already emits canonical values),
 * so field/enum definitions are REUSED from l1_field_spec (Frozen). NO new vocabulary.
 * Adds: ALIAS_MAP (Frozen legacy->canonical), L2 FORBIDDEN (must-not-generate), de-silo dual sources.
 */
var l1spec = require('./l1_field_spec');

// Legacy->canonical value aliases mirrored from engine LEGACY_AF_NORM (L9166).
// SOURCE: LEGACY_AF_NORM (engine L9166). APPROVAL: APPROVED as Clean Canonical Alias.
//   Approval Anchor — CEO Decision 2026-07-11. Basis: Category Architecture Reconciliation +
//   Category Audit Recovery. (Option (a).)
// COMPOUND: hoodie is NOT a plain scalar alias — it normalizes to sweatshirt AND requires
//   hood_present=true (feature must not be lost). Currently no-op (archetype_family not carried by L1);
//   when the field enters the pipeline, ALIAS_COMPOUND below MUST be honored.
var ALIAS_MAP = {
  archetype_family: { hoodie: 'sweatshirt', knitwear: 'sweater', tee: 'tshirt' },
};
var ALIAS_SOURCE = 'LEGACY_AF_NORM';                 // engine identifier (L9166)
var ALIAS_APPROVAL = 'APPROVED';                     // Clean Canonical Alias (CEO 2026-07-11)
var ALIAS_APPROVAL_ANCHOR = 'CEO 2026-07-11 — Category Architecture Reconciliation + Category Audit Recovery';
// Compound-normalization requirements (feature preservation), keyed by field->rawValue->[fields to set].
var ALIAS_COMPOUND = {
  archetype_family: { hoodie: { hood_present: true } },
};

// Canonical enum for alias-target validation ONLY (engine VALID_ARCHETYPE_FAMILY, L8414, Frozen).
// archetype_family field is NOT carried by current L1 spec; this enum is used to validate that every
// ALIAS_MAP target is a legitimate canonical value. No new vocabulary — mirrored from Frozen engine.
var ARCHETYPE_ENUM = ['shirt', 'tailoring_blazer', 'denim', 'coat', 'trench', 'bomber', 'puffer',
  'leather_jacket', 'tshirt', 'sweater', 'sweatshirt', 'hoodie', 'knitwear', 'tee',
  'trouser', 'skirt', 'dress', 'jumpsuit'];
var ALIAS_ENUM = { archetype_family: ARCHETYPE_ENUM };
function enumForAliasField(field) { return ALIAS_ENUM[field] || null; }

// Full alias-target integrity audit: every ALIAS_MAP target must be in its field's canonical enum.
function aliasTargetsValid() {
  var report = []; var allValid = true; var executable = true;
  Object.keys(ALIAS_MAP).forEach(function (field) {
    var e = enumForAliasField(field);
    Object.keys(ALIAS_MAP[field]).forEach(function (raw) {
      var target = ALIAS_MAP[field][raw];
      var inEnum = e ? (e.indexOf(target) !== -1) : null; // null = enum not exposed -> NOT_EXECUTABLE
      if (inEnum === false) allValid = false;
      if (inEnum === null) executable = false;
      report.push({ field: field, raw: raw, target: target, enumFound: e !== null,
                    result: inEnum === null ? 'NOT_EXECUTABLE' : (inEnum ? 'PASS' : 'FAIL') });
    });
  });
  return { allValid: allValid, executable: executable, report: report };
}

// L2 must NOT generate any of these (Interpretation/Derived/Score/Governance/Diagnostic).
var FORBIDDEN = ['tc_departure_evidence', 'register', 'type', 'register_basis', 'cut_reason',
                 'matching_basis', 'matching_basis_reason', 'score', 'governance', 'diagnostic'];

var REQUIRED_OBJECTS = l1spec.REQUIRED_OBJECTS; // garment_structure

function canonicalObjects() { return l1spec.allObjects(); }
function canonicalFields(obj) { return l1spec.knownFields(obj); }
function enumFor(obj, field) { return l1spec.enumFor(obj, field); }
function typeFor(obj, field) { return l1spec.typeFor(obj, field); }
function aliasFor(field, value) {
  var m = ALIAS_MAP[field];
  return (m && Object.prototype.hasOwnProperty.call(m, value)) ? m[value] : null;
}

module.exports = {
  ALIAS_MAP, ALIAS_SOURCE, ALIAS_APPROVAL, ALIAS_APPROVAL_ANCHOR, ALIAS_COMPOUND, ALIAS_ENUM,
  FORBIDDEN, REQUIRED_OBJECTS, DUAL_SOURCE: l1spec.DUAL_SOURCE,
  canonicalObjects, canonicalFields, enumFor, typeFor, aliasFor,
  enumForAliasField, aliasTargetsValid,
};
