'use strict';
/*
 * L2 Universal Canonical BUILDER (Sprint 3).
 * Input: L1 ObservationPackage. Output: canonical fields (axis-neutral) + provenance chain + unknowns.
 * Allowed: enum normalization, alias->canonical, de-silo (duplicate resolution), provenance.
 * FORBIDDEN: inference, score, derivation, projection, axis judgement, unknown promotion.
 */
var spec = require('./l2_field_spec');

/** @param obsPkg L1 ObservationPackage (must expose data.observations/unknowns/validation) */
function build(obsPkg) {
  var d = (obsPkg && obsPkg.data) || {};
  var observations = d.observations || {};
  var l1unknowns = d.unknowns || {};
  var l1conflicts = (d.validation && d.validation.duplicate_conflict) || [];
  var conflictFields = {};
  l1conflicts.forEach(function (c) { conflictFields[c.field] = true; });

  var canonical = {};
  var unknowns = {};

  spec.canonicalObjects().forEach(function (obj) {
    var src = observations[obj];
    if (!src || typeof src !== 'object') return;
    canonical[obj] = canonical[obj] || {};
    Object.keys(src).forEach(function (field) {
      var raw = src[field].value;
      var rule, value, rule_source;

      if (conflictFields[field]) {
        // Dual-source conflict from L1 -> not resolvable to a single canonical; keep raw, flag.
        rule = 'duplicate-conflict-unresolved'; value = raw; rule_source = 'l1_validator.duplicate_conflict';
      } else {
        var alias = spec.aliasFor(field, raw);
        if (alias !== null) { rule = 'alias'; value = alias; rule_source = spec.ALIAS_SOURCE; } // LEGACY_AF_NORM
        else if (spec.enumFor(obj, field)) { rule = 'canonical'; value = raw; rule_source = 'l1_field_spec.enums'; }
        else { rule = 'identity'; value = raw; rule_source = 'L1_OBSERVATION'; }
      }

      canonical[obj][field] = {
        value: value,
        raw: raw,                 // Raw NOT deleted (provenance)
        rule: rule,
        rule_source: rule_source, // real source identifier (§6)
        source_layer: 'L1',
        source_object: obj,
        source_field: field,
      };
    });
  });

  // Unknown stays Unknown — passed through, NO canonicalization/inference.
  Object.keys(l1unknowns).forEach(function (obj) {
    unknowns[obj] = {};
    Object.keys(l1unknowns[obj]).forEach(function (f) {
      unknowns[obj][f] = { value: l1unknowns[obj][f].value, source_layer: 'L1', source_object: obj,
                           source_field: f, note: 'unknown preserved losslessly (no canonical)' };
    });
  });

  return { canonical: canonical, unknowns: unknowns };
}

module.exports = { build };
