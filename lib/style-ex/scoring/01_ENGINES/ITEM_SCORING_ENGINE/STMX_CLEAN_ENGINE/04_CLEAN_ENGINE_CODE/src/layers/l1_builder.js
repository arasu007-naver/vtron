'use strict';
/*
 * L1 Observation BUILDER (Sprint 2 Correction).
 * Responsibility: extract allowed observation fields (lossless), attach Provenance, preserve Unknown.
 * FORBIDS: canonicalization, inference, value correction, unknown promotion/deletion, validation.
 */
var spec = require('./l1_field_spec');

/**
 * @returns { observations: {obj:{field:{value,source}}}, unknowns: {obj:{field:{value,source,note}}} }
 */
function build(vision, source) {
  vision = (vision && typeof vision === 'object') ? vision : {};
  source = source || 'Vision';
  var observations = {};
  var unknowns = {};

  spec.allObjects().forEach(function (obj) {
    var src = vision[obj];
    if (!src || typeof src !== 'object') return;
    var known = spec.knownFields(obj);
    observations[obj] = observations[obj] || {};
    // allowed fields -> lossless copy + provenance
    known.forEach(function (field) {
      if (Object.prototype.hasOwnProperty.call(src, field)) {
        observations[obj][field] = { value: src[field], source: source };
      }
    });
    // unknown fields (present in Vision object, not in spec, not forbidden) -> preserved as-is
    Object.keys(src).forEach(function (field) {
      if (known.indexOf(field) === -1 && spec.FORBIDDEN.indexOf(field) === -1) {
        unknowns[obj] = unknowns[obj] || {};
        unknowns[obj][field] = { value: src[field], source: source, note: 'unknown preserved losslessly' };
      }
    });
  });

  return { observations: observations, unknowns: unknowns };
}

module.exports = { build };
