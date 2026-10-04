'use strict';
/*
 * Shadow — L1 Observation Equivalence Comparator (Sprint 2 + Correction).
 * Legacy observation view (fields Legacy consumed) vs Clean L1 (observations + unknowns).
 * Correction: (5) include Clean UNKNOWN fields; (6) deterministic deep equality; (8) pure compareMaps
 *             so mismatch detection is testable without touching production build.
 * Status: MATCH | EXPECTED_DIFF (forbidden excluded by L1) | MISMATCH. No new status vocabulary.
 */
const l1 = require('../../04_CLEAN_ENGINE_CODE/src/layers/l1_observation');
const { legacyObservationView } = require('../runners/legacy_adapter');
const { FORBIDDEN } = require('../../04_CLEAN_ENGINE_CODE/src/layers/l1_field_spec');
const { deepEqual } = require('../../04_CLEAN_ENGINE_CODE/src/runtime/deep_equal');

function flattenClean(cleanPkg) {
  var flat = {};
  var d = (cleanPkg && cleanPkg.data) || {};
  ['observations', 'unknowns'].forEach(function (bucket) {
    var b = d[bucket] || {};
    Object.keys(b).forEach(function (obj) {
      Object.keys(b[obj]).forEach(function (f) { flat[obj + '.' + f] = b[obj][f].value; });
    });
  });
  return flat;
}

/** Pure comparison of flattened maps. Testable in isolation (negative tests). */
function compareMaps(legacy, clean, cleanForbidden) {
  cleanForbidden = cleanForbidden || [];
  var result = { MATCH: 0, EXPECTED_DIFF: 0, MISMATCH: 0, items: [], map: {} };
  Object.keys(legacy).forEach(function (key) {
    var status, extra = {};
    if (FORBIDDEN.indexOf(key) !== -1) {
      status = (cleanForbidden.indexOf(key) !== -1) ? 'EXPECTED_DIFF' : 'MISMATCH';
    } else if (Object.prototype.hasOwnProperty.call(clean, key) && deepEqual(clean[key], legacy[key])) {
      status = 'MATCH';
    } else {
      status = 'MISMATCH'; extra = { legacy: legacy[key], clean: clean[key] };
    }
    result[status]++;
    result.map[key] = status;
    result.items.push(Object.assign({ key: key, status: status }, extra));
  });
  result.equivalent = (result.MISMATCH === 0);
  return result;
}

function compareObservation(vision, opts) {
  var legacy = legacyObservationView(vision);
  var cleanPkg = l1(vision, opts || {});
  var clean = flattenClean(cleanPkg);
  var cleanForbidden = (cleanPkg.data.validation.forbidden_present) || [];
  return compareMaps(legacy, clean, cleanForbidden);
}

module.exports = { compareObservation, compareMaps, flattenClean };
