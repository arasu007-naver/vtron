'use strict';
/*
 * ============================================================================
 *  TEMPORARY FIELD-LEVEL REFERENCE ADAPTER
 *  NOT A LEGACY BEHAVIORAL ORACLE
 *  DO NOT USE THIS ADAPTER TO CLAIM FULL LEGACY EQUIVALENCE
 * ============================================================================
 * Shadow — Legacy Canonical Adapter (Sprint 3, field-level).
 * The full Legacy engine (applyNormalizer, 11,600 lines) is NOT executed (needs Vision runtime; G11).
 * legacyCanonicalView() mirrors ONLY the documented deterministic canonicalization (alias + identity)
 * applied to the SAME L1 observation. It proves field-level canonical carry, NOT behavioral equivalence.
 * legacyResult() stays NOT_CONNECTED.
 */
var spec = require('../../04_CLEAN_ENGINE_CODE/src/layers/l2_field_spec');

var SHADOW_SCOPE = 'FIELD_LEVEL_CANONICAL_REFERENCE';

function legacyResult() {
  return Object.freeze({
    source: 'LEGACY',
    connected: false,
    legacy_engine_connected: false,
    behavioral_oracle: false,
    comparison_scope: SHADOW_SCOPE,
    execution_status: 'NOT_CONNECTED',
  });
}

/** @param obsPkg L1 ObservationPackage -> flat { 'obj.field': canonicalValue } (+ unknowns). */
function legacyCanonicalView(obsPkg) {
  var flat = {};
  var d = (obsPkg && obsPkg.data) || {};
  var obs = d.observations || {};
  spec.canonicalObjects().forEach(function (obj) {
    var src = obs[obj];
    if (!src) return;
    Object.keys(src).forEach(function (field) {
      var raw = src[field].value;
      var alias = spec.aliasFor(field, raw);
      flat[obj + '.' + field] = (alias !== null) ? alias : raw;
    });
  });
  var unk = d.unknowns || {};
  Object.keys(unk).forEach(function (obj) {
    Object.keys(unk[obj]).forEach(function (f) { flat[obj + '.' + f] = unk[obj][f].value; });
  });
  return Object.freeze(flat);
}

module.exports = { legacyResult, legacyCanonicalView, SHADOW_SCOPE };
