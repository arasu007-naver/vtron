'use strict';
/*
 * L1 Observation Field Spec (Sprint 2 + Correction).
 * Source: FROZEN L1 Observation Vocabulary Reference (Phase 2-D) + Vision schema (Phase 2-A, engine L7446-8391).
 * NO new vocabulary. Types included ONLY where the Vision schema / Frozen Reference gives grounding.
 * Per-object shape: { enums:{field:[...]}, boolean:[field...], other:{field:type} }.
 *   type in {string, number, array}. enum fields validated against their list. boolean fields -> boolean.
 * Fields with no type grounding are NOT invented -> default 'string', lossless preserved.
 */
var NMS = ['none', 'mild', 'strong'];

var PURE = {
  garment_structure: {
    enums: {
      lapel_shape: ['none', 'notch', 'peak', 'shawl'],
      closure_type: ['zip', 'button', 'snap', 'hook', 'toggle', 'none', 'uncertain'],
      sleeve_type: ['sleeved', 'sleeveless', 'uncertain'],
      hem_type: ['straight', 'banded', 'cinched', 'uncertain'],
    },
    boolean: ['double_breasted'],                  // Vision: boolean
    other: { collar_type: 'string', button_count: 'number', sleeve_length: 'string', cuff_type: 'string' },
  },
  body_visibility: {
    enums: { back_exposure_level: ['none', 'low', 'moderate', 'high'] },
    boolean: ['crop_present', 'midriff_exposed', 'sheer_present', 'full_sheer_body', 'cutout_present',
              'off_shoulder', 'bra_top_visible', 'lingerie_visible', 'shoulder_exposed',
              'upper_chest_visible', 'deep_neckline'],
    other: {},
  },
  surface: {
    enums: {
      pattern_coverage: ['none', 'partial', 'full'],
      hardware_density: ['none', 'accent', 'moderate', 'dominant'],
      surface_finish: ['none', 'metallic'],
    },
    boolean: ['fringe_present', 'lace_present', 'pleats_present', 'embroidery_present',
              'sequin_beading_present', 'button_field_present', 'patch_crest_present'],
    other: { pattern_type: 'string', button_material: 'string', hardware_type: 'string', texture_types: 'array' },
  },
  volume_observation: {
    enums: {
      volume_intensity: ['none', 'mild', 'moderate', 'strong', 'extreme'],
      volume_direction: ['none', 'width', 'length', 'mixed', 'uncertain'],
    },
    boolean: ['body_volume_dominant', 'body_erasure'],
    other: {},
  },
  color_observation: {
    enums: { color_lightness: ['Light', 'Normal', 'Dark'] },
    boolean: ['secondary_color_present', 'multi_color'],
    other: { primary_color_family: 'string' },
  },
};

var CANONICAL_INPUT = {
  garment_structure: {
    enums: { shoulder_structure: NMS, waist_cinching: NMS, body_fitting: NMS, fabric_behavior: ['fluid', 'structured'] },
    boolean: [],
    other: { length_class: 'string' }, // category-relative; canonicalized/split at L2
  },
};

var FORBIDDEN = ['tc_departure_evidence', 'register', 'type',
                 'register_basis', 'cut_reason', 'matching_basis', 'matching_basis_reason'];

var DUAL_SOURCE = [
  { field: 'shoulder_structure', objects: ['garment_structure', 'jacket_vision'], scalar: true },
  { field: 'waist_cinching', objects: ['garment_structure', 'jacket_vision'], scalar: true },
  { field: 'body_fitting', objects: ['garment_structure', 'jacket_vision'], scalar: true },
  { field: 'fabric_behavior', objects: ['garment_structure', 'jacket_vision'], scalar: true },
  { field: 'length_class', objects: ['garment_structure', 'jacket_vision'], scalar: true },
];

// garment_structure is the only object with frozen grounding as a required anchor (Vision schema L7509,
// always emitted). No frozen "fail-if-absent" rule exists for the other objects -> NOT expanded.
var REQUIRED_OBJECTS = ['garment_structure'];

function mergeObj(obj) {
  var p = PURE[obj] || {}, c = CANONICAL_INPUT[obj] || {};
  return {
    enums: Object.assign({}, p.enums || {}, c.enums || {}),
    boolean: (p.boolean || []).concat(c.boolean || []),
    other: Object.assign({}, p.other || {}, c.other || {}),
  };
}
function allObjects() {
  var s = {}; Object.keys(PURE).forEach(function (o) { s[o] = 1; }); Object.keys(CANONICAL_INPUT).forEach(function (o) { s[o] = 1; });
  return Object.keys(s);
}
function knownFields(obj) {
  var m = mergeObj(obj);
  return Object.keys(m.enums).concat(m.boolean).concat(Object.keys(m.other));
}
function enumFor(obj, field) { var m = mergeObj(obj); return m.enums[field] || null; }
function typeFor(obj, field) {
  var m = mergeObj(obj);
  if (m.enums[field]) return 'enum';
  if (m.boolean.indexOf(field) !== -1) return 'boolean';
  if (m.other[field]) return m.other[field];
  return 'string';
}

module.exports = {
  PURE, CANONICAL_INPUT, FORBIDDEN, DUAL_SOURCE, REQUIRED_OBJECTS,
  allObjects, knownFields, enumFor, typeFor,
};
