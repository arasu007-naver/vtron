'use strict';
/*
 * L2 Universal Canonical VALIDATOR (Sprint 3).
 * Checks: input package type, required, forbidden(generated), enum, alias resolution, duplicate, provenance.
 * Does NOT auto-correct values.
 */
var spec = require('./l2_field_spec');
var { PACKAGE_TYPES } = require('../runtime/packages');

function validate(obsPkg, canonical, unknowns) {
  var v = { wrong_input: false, required_missing: [], forbidden_present: [], invalid_enum: [],
            unresolved_alias: [], duplicate_conflict: [], provenance_missing: [] };

  // Input package type must be an ObservationPackage (from L1).
  if (!obsPkg || obsPkg.type !== PACKAGE_TYPES.OBSERVATION) v.wrong_input = true;

  // Required canonical object present.
  spec.REQUIRED_OBJECTS.forEach(function (obj) {
    if (!canonical[obj] || Object.keys(canonical[obj]).length === 0) v.required_missing.push(obj);
  });

  // Forbidden field names must not appear in canonical output.
  spec.FORBIDDEN.forEach(function (f) {
    Object.keys(canonical).forEach(function (obj) {
      if (Object.prototype.hasOwnProperty.call(canonical[obj], f)) v.forbidden_present.push(obj + '.' + f);
    });
  });

  // Enum validity + provenance completeness + duplicate/alias status.
  Object.keys(canonical).forEach(function (obj) {
    Object.keys(canonical[obj]).forEach(function (field) {
      var c = canonical[obj][field];
      // Provenance chain must be complete — including rule_source (§6).
      if (!c.source_layer || !c.source_object || !c.source_field || !('raw' in c) || !c.rule || !c.rule_source) {
        v.provenance_missing.push(obj + '.' + field);
      }
      if (c.rule === 'duplicate-conflict-unresolved') v.duplicate_conflict.push(obj + '.' + field);
      // Enum: the FINAL canonical value must be in the enum, regardless of rule (canonical/identity/
      // ALIAS all validated — §4). Exceptions: 'uncertain', unresolved conflict.
      // Alias fields may have their enum exposed only via ALIAS_ENUM.
      var e = spec.enumFor(obj, field) || spec.enumForAliasField(field);
      if (e && c.value !== 'uncertain' && c.rule !== 'duplicate-conflict-unresolved' &&
          e.indexOf(c.value) === -1) {
        v.invalid_enum.push({ object: obj, field: field, value: c.value, rule: c.rule });
      }
    });
  });

  v.ok = (!v.wrong_input && v.required_missing.length === 0 && v.forbidden_present.length === 0 &&
          v.invalid_enum.length === 0 && v.duplicate_conflict.length === 0 && v.provenance_missing.length === 0);
  return v;
}

module.exports = { validate };
