'use strict';
/*
 * STMX — L1 Observation Regression (Sprint 2 + Correction).
 * L1 implemented (Builder/Validator); L2..L8 skeleton. No scoring.
 * Run: node 07_REGRESSION/l1_tests.js
 */
const assert = require('assert');
const l1 = require('../04_CLEAN_ENGINE_CODE/src/layers/l1_observation');
const { run } = require('../04_CLEAN_ENGINE_CODE/src/runtime/runtime_skeleton');
const { LAYER_STATUS } = require('../04_CLEAN_ENGINE_CODE/src/runtime/packages');
const { deepEqual } = require('../04_CLEAN_ENGINE_CODE/src/runtime/deep_equal');
const { compareObservation, compareMaps } = require('../06_SHADOW_VALIDATION/comparators/observation_comparator');
const { STAGES } = require('./migration_stage_profile');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('PASS  ' + name); pass++; }
  catch (e) { console.log('FAIL  ' + name + ' :: ' + e.message); fail++; }
}

const NORMAL = {
  garment_structure: { shoulder_structure: 'strong', waist_cinching: 'mild', collar_type: 'spread',
                       closure_type: 'button', button_count: 4, double_breasted: true },
  body_visibility: { crop_present: true, back_exposure_level: 'low' },
  surface: { pattern_type: 'stripe', pattern_coverage: 'full', texture_types: ['wool'] },
};

// 1. Valid normal observation.
t('1 valid normal observation', function () {
  const p = l1(NORMAL);
  assert.strictEqual(p.data.valid, true);
  assert.strictEqual(p.data.observations.garment_structure.shoulder_structure.value, 'strong');
  assert.strictEqual(p.data.observations.garment_structure.button_count.value, 4);
});

// 2. Missing required object.
t('2 missing required object', function () {
  const p = l1({});
  assert.ok(p.data.validation.required_missing.indexOf('garment_structure') !== -1);
  assert.strictEqual(p.data.valid, false);
});

// 3. Forbidden field detected and excluded.
t('3 forbidden field excluded', function () {
  const p = l1({ garment_structure: { shoulder_structure: 'none' }, register: 'tailored', tc_departure_evidence: {} });
  assert.ok(p.data.validation.forbidden_present.indexOf('register') !== -1);
  assert.ok(p.data.validation.forbidden_present.indexOf('tc_departure_evidence') !== -1);
  assert.ok(!p.data.observations.register);
});

// 4. Invalid enum.
t('4 invalid enum', function () {
  const p = l1({ garment_structure: { shoulder_structure: 'HUGE' } });
  assert.ok(p.data.validation.invalid_enum.some(function (x) { return x.field === 'shoulder_structure'; }));
});

// 5. Invalid boolean type (string given to boolean field).
t('5 invalid boolean type', function () {
  const p = l1({ garment_structure: { shoulder_structure: 'none', double_breasted: 'yes' } });
  assert.ok(p.data.validation.invalid_type.some(function (x) { return x.field === 'double_breasted' && x.expected === 'boolean'; }));
});

// 6. Invalid array type (scalar given to array field).
t('6 invalid array type', function () {
  const p = l1({ garment_structure: { shoulder_structure: 'none' }, surface: { texture_types: 'wool' } });
  assert.ok(p.data.validation.invalid_type.some(function (x) { return x.field === 'texture_types' && x.expected === 'array'; }));
});

// 7. Unknown field preserved losslessly (not inferred/canonicalized/deleted).
t('7 unknown preserved losslessly', function () {
  const p = l1({ garment_structure: { shoulder_structure: 'mild', mystery_field: 'xyz' } });
  assert.strictEqual(p.data.unknowns.garment_structure.mystery_field.value, 'xyz');
  assert.ok(!p.data.observations.garment_structure.mystery_field);
});

// 8. Provenance preserved (custom source).
t('8 provenance preserved', function () {
  const p = l1(NORMAL, { source: 'Regression' });
  assert.strictEqual(p.data.observations.garment_structure.shoulder_structure.source, 'Regression');
  assert.strictEqual(p.provenance.source, 'Regression');
});

// 9. Duplicate conflict across dual sources.
t('9 duplicate conflict', function () {
  const p = l1({ garment_structure: { shoulder_structure: 'strong' }, jacket_vision: { shoulder_structure: 'none' } });
  assert.ok(p.data.validation.duplicate_conflict.some(function (x) { return x.field === 'shoulder_structure'; }));
});

// 10. Same input deterministic.
t('10 same input deterministic', function () {
  assert.deepStrictEqual(l1(NORMAL), l1(NORMAL));
});

// 11. Runtime integration — L1 OK, L2..L8 per profile.
t('11 runtime integration', function () {
  const r = run(NORMAL);
  assert.strictEqual(r.layer_statuses[0].status, STAGES.L1);
  assert.strictEqual(r.layer_statuses[2].status, STAGES.L3);
  assert.strictEqual(r.decision_status, 'NOT_IMPLEMENTED');
});

// 12. Exact Shadow key/status equivalence (per-key map, not just counts).
t('12 exact shadow key/status', function () {
  const cmp = compareObservation({
    garment_structure: { shoulder_structure: 'strong', collar_type: 'spread' },
    body_visibility: { crop_present: true },
    tc_departure_evidence: { silhouette_departure: true },
  });
  assert.strictEqual(cmp.map['garment_structure.shoulder_structure'], 'MATCH');
  assert.strictEqual(cmp.map['garment_structure.collar_type'], 'MATCH');
  assert.strictEqual(cmp.map['body_visibility.crop_present'], 'MATCH');
  assert.strictEqual(cmp.map['tc_departure_evidence'], 'EXPECTED_DIFF');
  assert.strictEqual(cmp.MISMATCH, 0);
  assert.strictEqual(cmp.equivalent, true);
});

// 13. Unknown Shadow equivalence — unknown field is MATCH (lossless), not MISMATCH.
t('13 unknown shadow equivalence', function () {
  const cmp = compareObservation({ garment_structure: { shoulder_structure: 'mild', mystery_field: 'xyz' } });
  assert.strictEqual(cmp.map['garment_structure.mystery_field'], 'MATCH');
  assert.strictEqual(cmp.MISMATCH, 0);
  assert.strictEqual(cmp.equivalent, true);
});

// 14. Array deep comparison.
t('14 array deep comparison', function () {
  assert.strictEqual(deepEqual(['a', 'b'], ['a', 'b']), true);
  assert.strictEqual(deepEqual(['a', 'b'], ['b', 'a']), false); // order-sensitive
});

// 15. Object deep comparison + primitive type distinction.
t('15 object deep comparison', function () {
  assert.strictEqual(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);   // key order irrelevant
  assert.strictEqual(deepEqual({ a: 1 }, { a: 2 }), false);
  assert.strictEqual(deepEqual(1, '1'), false);                          // number vs string
});

// 16. Intentional mismatch -> equivalent false (via pure compareMaps).
t('16 intentional mismatch detected', function () {
  const legacy = { 'garment_structure.shoulder_structure': 'strong' };
  const clean = { 'garment_structure.shoulder_structure': 'none' }; // corrupted
  const cmp = compareMaps(legacy, clean, []);
  assert.strictEqual(cmp.MISMATCH, 1);
  assert.strictEqual(cmp.equivalent, false);
});

// 17. Contract-invalid observation: execution status OK, data.valid false (separation of concerns).
t('17 status vs data.valid separation', function () {
  const p = l1({ tc_departure_evidence: {} }); // forbidden present, required missing
  assert.strictEqual(p.status, LAYER_STATUS.OK);   // execution succeeded
  assert.strictEqual(p.data.valid, false);         // observation contract invalid
});

console.log('\n--- STMX L1 Tests: ' + pass + ' passed, ' + fail + ' failed ---');
console.log('SUMMARY: ' + (fail === 0 ? 'PASS' : 'FAIL') + ' (' + pass + '/' + (pass + fail) + ')');
if (fail > 0) process.exitCode = 1;
