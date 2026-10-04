'use strict';
/*
 * L1 Observation VALIDATOR (Sprint 2 Correction).
 * Responsibility: Required / Forbidden / Enum / Type / Dual-source conflict checks.
 * Produces a validation record. Does NOT correct values, delete unknowns, or promote to canonical.
 */
var spec = require('./l1_field_spec');
var deepEqual = require('../runtime/deep_equal').deepEqual;

function isNullish(v) { return v === null || v === undefined; }

function validate(vision) {
  vision = (vision && typeof vision === 'object') ? vision : {};
  var v = { required_missing: [], forbidden_present: [], invalid_enum: [], invalid_type: [], duplicate_conflict: [] };

  // Required objects
  spec.REQUIRED_OBJECTS.forEach(function (obj) {
    if (!vision[obj] || typeof vision[obj] !== 'object') v.required_missing.push(obj);
  });

  // Forbidden (top-level interpretation/derived/diagnostic)
  spec.FORBIDDEN.forEach(function (f) {
    if (Object.prototype.hasOwnProperty.call(vision, f)) v.forbidden_present.push(f);
  });

  // Enum + Type validation over allowed fields present
  spec.allObjects().forEach(function (obj) {
    var src = vision[obj];
    if (!src || typeof src !== 'object') return;
    spec.knownFields(obj).forEach(function (field) {
      if (!Object.prototype.hasOwnProperty.call(src, field)) return;
      var value = src[field];
      if (isNullish(value)) return; // nullable: present-but-empty, not a type error
      var t = spec.typeFor(obj, field);
      if (t === 'enum') {
        var e = spec.enumFor(obj, field);
        if (e && e.indexOf(value) === -1 && value !== 'uncertain') {
          v.invalid_enum.push({ object: obj, field: field, value: value });
        }
      } else if (t === 'boolean') {
        if (typeof value !== 'boolean') v.invalid_type.push({ object: obj, field: field, expected: 'boolean', value: value });
      } else if (t === 'number') {
        if (typeof value !== 'number') v.invalid_type.push({ object: obj, field: field, expected: 'number', value: value });
      } else if (t === 'array') {
        if (!Array.isArray(value)) v.invalid_type.push({ object: obj, field: field, expected: 'array', value: value });
      } else { // string
        if (typeof value !== 'string') v.invalid_type.push({ object: obj, field: field, expected: 'string', value: value });
      }
    });
  });

  // Dual-source conflict (deterministic deep equality; dual-source fields are scalar per Frozen schema)
  spec.DUAL_SOURCE.forEach(function (d) {
    var vals = [];
    d.objects.forEach(function (obj) {
      if (vision[obj] && typeof vision[obj] === 'object' &&
          Object.prototype.hasOwnProperty.call(vision[obj], d.field)) {
        vals.push({ object: obj, value: vision[obj][d.field] });
      }
    });
    if (vals.length > 1) {
      var conflict = false;
      for (var i = 1; i < vals.length; i++) { if (!deepEqual(vals[0].value, vals[i].value)) { conflict = true; break; } }
      if (conflict) v.duplicate_conflict.push({ field: d.field, sources: vals });
    }
  });

  v.ok = (v.required_missing.length === 0 && v.forbidden_present.length === 0 &&
          v.invalid_enum.length === 0 && v.invalid_type.length === 0 && v.duplicate_conflict.length === 0);
  return v;
}

module.exports = { validate };
