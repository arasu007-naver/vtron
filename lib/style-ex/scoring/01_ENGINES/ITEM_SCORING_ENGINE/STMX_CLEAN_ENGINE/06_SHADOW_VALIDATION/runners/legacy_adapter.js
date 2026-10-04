'use strict';
/*
 * Shadow — Legacy Result Adapter (Sprint 1 interface + Sprint 2 L1 observation view).
 *
 * IMPORTANT HONESTY NOTE:
 *   The full Legacy ENGINE is NOT executed here (needs Vision runtime + browser; G11).
 *   `legacyResult()` stays NOT_CONNECTED — full-engine Shadow is a later Migration Track.
 *   `legacyObservationView()` is a FIELD-LEVEL mirror of what Legacy consumes as observation
 *   from a raw Vision JSON (Legacy passes raw Vision fields into flags.*). It lets Sprint 2
 *   prove L1 carries every observation field losslessly and drops Forbidden fields — it is
 *   NOT a behavioral run of the 11,600-line Legacy engine.
 */
const { PURE, CANONICAL_INPUT, FORBIDDEN } = require('../../04_CLEAN_ENGINE_CODE/src/layers/l1_field_spec');

/** Full-engine Legacy result — intentionally not connected in Sprint 1/2. */
function legacyResult(image, opts) {
  void image; void opts;
  return Object.freeze({ source: 'LEGACY', connected: false, execution_status: 'NOT_CONNECTED' });
}

/**
 * Legacy observation view: flatten the observation fields a raw Vision JSON provides,
 * as Legacy consumes them (includes Forbidden fields, because Legacy DID consume them).
 * Returns { 'object.field': value } plus top-level forbidden fields.
 */
function legacyObservationView(vision) {
  var flat = {};
  vision = (vision && typeof vision === 'object') ? vision : {};
  var objects = {};
  Object.keys(PURE).forEach(function (o) { objects[o] = true; });
  Object.keys(CANONICAL_INPUT).forEach(function (o) { objects[o] = true; });
  Object.keys(objects).forEach(function (obj) {
    var src = vision[obj];
    if (src && typeof src === 'object') {
      Object.keys(src).forEach(function (f) { flat[obj + '.' + f] = src[f]; });
    }
  });
  // Legacy also consumed these top-level interpretation/derived fields:
  FORBIDDEN.forEach(function (f) {
    if (Object.prototype.hasOwnProperty.call(vision, f)) flat[f] = vision[f];
  });
  return Object.freeze(flat);
}

module.exports = { legacyResult, legacyObservationView };
