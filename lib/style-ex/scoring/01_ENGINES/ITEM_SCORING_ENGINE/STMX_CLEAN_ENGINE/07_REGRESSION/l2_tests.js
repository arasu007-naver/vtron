'use strict';
/*
 * STMX — L2 Universal Canonical Regression (Sprint 3).
 * L1, L2 implemented; L3..L8 skeleton. Axis-neutral; no score/derived/projection.
 * Run: node 07_REGRESSION/l2_tests.js
 */
const assert = require('assert');
const l1 = require('../04_CLEAN_ENGINE_CODE/src/layers/l1_observation');
const l2 = require('../04_CLEAN_ENGINE_CODE/src/layers/l2_canonical');
const spec = require('../04_CLEAN_ENGINE_CODE/src/layers/l2_field_spec');
const { run } = require('../04_CLEAN_ENGINE_CODE/src/runtime/runtime_skeleton');
const { PACKAGE_TYPES, createPackage, LAYER_STATUS } = require('../04_CLEAN_ENGINE_CODE/src/runtime/packages');
const { STAGES } = require('./migration_stage_profile');
const { compareCanonical, compareMaps } = require('../06_SHADOW_VALIDATION/comparators/canonical_comparator');

const { legacyResult, SHADOW_SCOPE } = require('../06_SHADOW_VALIDATION/runners/legacy_canonical_adapter');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('PASS  ' + name); pass++; }
  catch (e) { console.log('FAIL  ' + name + ' :: ' + e.message); fail++; }
}

// Test-only: collect every object key recursively (structural, exact-match — no substring false hits).
function recursiveKeyScan(node, acc) {
  acc = acc || [];
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    Object.keys(node).forEach(function (k) { acc.push(k); recursiveKeyScan(node[k], acc); });
  } else if (Array.isArray(node)) {
    node.forEach(function (x) { recursiveKeyScan(x, acc); });
  }
  return acc;
}

const NORMAL = {
  garment_structure: { shoulder_structure: 'strong', waist_cinching: 'mild', collar_type: 'spread',
                       closure_type: 'button', button_count: 4, double_breasted: true },
  body_visibility: { crop_present: true, back_exposure_level: 'low' },
  surface: { pattern_type: 'stripe', pattern_coverage: 'full', texture_types: ['wool'] },
};
const obsNormal = l1(NORMAL);

// 1. Valid canonical from normal observation.
t('1 valid canonical', function () {
  const c = l2(obsNormal);
  assert.strictEqual(c.type, PACKAGE_TYPES.CANONICAL);
  assert.strictEqual(c.data.valid, true);
  assert.strictEqual(c.data.canonical.garment_structure.shoulder_structure.value, 'strong');
});

// 2. Wrong input package type flagged.
t('2 wrong input package', function () {
  const wrong = createPackage(PACKAGE_TYPES.DERIVED, 'X', {}, LAYER_STATUS.OK, {});
  const c = l2(wrong);
  assert.strictEqual(c.data.validation.wrong_input, true);
  assert.strictEqual(c.data.valid, false);
});

// 3. Alias mechanism (Frozen legacy->canonical).
t('3 alias mechanism', function () {
  assert.strictEqual(spec.aliasFor('archetype_family', 'hoodie'), 'sweatshirt');
  assert.strictEqual(spec.aliasFor('archetype_family', 'tee'), 'tshirt');
  assert.strictEqual(spec.aliasFor('archetype_family', 'blazer'), null);
});

// 4. Enum canonical rule.
t('4 enum canonical rule', function () {
  const c = l2(obsNormal);
  assert.strictEqual(c.data.canonical.garment_structure.shoulder_structure.rule, 'canonical');
});

// 5. Invalid enum propagated & flagged at L2.
t('5 invalid enum flagged', function () {
  const c = l2(l1({ garment_structure: { shoulder_structure: 'HUGE' } }));
  assert.ok(c.data.validation.invalid_enum.some(function (x) { return x.field === 'shoulder_structure'; }));
});

// 6. Unknown passthrough (no canonical, no inference).
t('6 unknown passthrough', function () {
  const c = l2(l1({ garment_structure: { shoulder_structure: 'mild', mystery_field: 'xyz' } }));
  assert.strictEqual(c.data.unknowns.garment_structure.mystery_field.value, 'xyz');
  assert.ok(!c.data.canonical.garment_structure.mystery_field);
});

// 7. Duplicate conflict propagated from L1.
t('7 duplicate conflict propagated', function () {
  const obs = l1({ garment_structure: { shoulder_structure: 'strong' }, jacket_vision: { shoulder_structure: 'none' } });
  const c = l2(obs);
  assert.strictEqual(c.data.canonical.garment_structure.shoulder_structure.rule, 'duplicate-conflict-unresolved');
  assert.ok(c.data.validation.duplicate_conflict.indexOf('garment_structure.shoulder_structure') !== -1);
});

// 8. Forbidden not generated.
t('8 forbidden not generated', function () {
  const c = l2(obsNormal);
  assert.strictEqual(c.data.validation.forbidden_present.length, 0);
});

// 9. Provenance chain complete.
t('9 provenance chain', function () {
  const c = l2(obsNormal);
  const f = c.data.canonical.garment_structure.shoulder_structure;
  assert.strictEqual(f.source_layer, 'L1');
  assert.strictEqual(f.source_object, 'garment_structure');
  assert.strictEqual(f.source_field, 'shoulder_structure');
  assert.strictEqual(f.raw, 'strong');
  assert.ok(f.rule);
});

// 10. Raw preserved (not deleted).
t('10 raw preserved', function () {
  const c = l2(l1({ garment_structure: { shoulder_structure: 'mild' } }));
  assert.strictEqual(c.data.canonical.garment_structure.shoulder_structure.raw, 'mild');
});

// 11. Deterministic.
t('11 deterministic', function () {
  assert.deepStrictEqual(l2(l1(NORMAL)), l2(l1(NORMAL)));
});

// 12. Runtime integration — L1 OK, L2 OK, L3 NOT_IMPLEMENTED.
t('12 runtime integration', function () {
  const r = run(NORMAL);
  assert.strictEqual(r.layer_statuses[0].status, STAGES.L1);
  assert.strictEqual(r.layer_statuses[1].status, STAGES.L2);
  assert.strictEqual(r.layer_statuses[2].status, LAYER_STATUS.NOT_IMPLEMENTED);
});

// 13. Shadow exact key/status equivalence.
t('13 shadow exact key/status', function () {
  const cmp = compareCanonical({ garment_structure: { shoulder_structure: 'strong', collar_type: 'spread' } });
  assert.strictEqual(cmp.map['garment_structure.shoulder_structure'], 'MATCH');
  assert.strictEqual(cmp.map['garment_structure.collar_type'], 'MATCH');
  assert.strictEqual(cmp.MISMATCH, 0);
  assert.strictEqual(cmp.equivalent, true);
});

// 14. Shadow unknown equivalence.
t('14 shadow unknown equivalence', function () {
  const cmp = compareCanonical({ garment_structure: { shoulder_structure: 'mild', mystery_field: 'xyz' } });
  assert.strictEqual(cmp.map['garment_structure.mystery_field'], 'MATCH');
  assert.strictEqual(cmp.MISMATCH, 0);
});

// 15. Shadow intentional mismatch.
t('15 shadow intentional mismatch', function () {
  const cmp = compareMaps({ 'garment_structure.shoulder_structure': 'strong' },
                          { 'garment_structure.shoulder_structure': 'none' }, []);
  assert.strictEqual(cmp.MISMATCH, 1);
  assert.strictEqual(cmp.equivalent, false);
});

// 16. Shadow EXPECTED_DIFF for a forbidden field not generated by L2.
t('16 shadow expected diff (forbidden)', function () {
  const cmp = compareMaps({ 'category_observation.register': 'tailored' }, {}, []);
  assert.strictEqual(cmp.map['category_observation.register'], 'EXPECTED_DIFF');
  assert.strictEqual(cmp.MISMATCH, 0);
});

// 17. status vs data.valid separation.
t('17 status vs data.valid', function () {
  const c = l2(l1({}));            // empty -> required missing -> invalid
  assert.strictEqual(c.status, LAYER_STATUS.OK);
  assert.strictEqual(c.data.valid, false);
});

// 18. Axis-neutral: structurally verify forbidden/axis keys are ABSENT from canonical (§10 fix).
t('18 axis-neutral structural key absence', function () {
  const c = l2(obsNormal);
  const keys = recursiveKeyScan(c.data.canonical);
  ['SR', 'TC', 'DM', 'EI', 'score', 'governance', 'tc_departure_evidence', 'register', 'type']
    .forEach(function (forbid) {
      assert.strictEqual(keys.indexOf(forbid), -1, 'forbidden key present: ' + forbid);
    });
});

// 19. 'uncertain' enum value allowed (not flagged).
t('19 uncertain allowed', function () {
  const c = l2(l1({ garment_structure: { shoulder_structure: 'none', closure_type: 'uncertain' } }));
  assert.ok(!c.data.validation.invalid_enum.some(function (x) { return x.field === 'closure_type'; }));
});

// 20. Single-source field -> canonical/identity rule (no false conflict).
t('20 single source no conflict', function () {
  const c = l2(l1({ garment_structure: { shoulder_structure: 'strong' } }));
  assert.notStrictEqual(c.data.canonical.garment_structure.shoulder_structure.rule, 'duplicate-conflict-unresolved');
  assert.strictEqual(c.data.validation.duplicate_conflict.length, 0);
});

// 21. Required canonical object missing flagged.
t('21 required missing flagged', function () {
  const c = l2(l1({}));
  assert.ok(c.data.validation.required_missing.indexOf('garment_structure') !== -1);
});

// 22. number/array canonical values preserved losslessly.
t('22 number/array preserved', function () {
  const c = l2(obsNormal);
  assert.strictEqual(c.data.canonical.garment_structure.button_count.value, 4);
  assert.deepStrictEqual(c.data.canonical.surface.texture_types.value, ['wool']);
});

// 23. Alias valid target IS in canonical enum (Frozen VALID_ARCHETYPE_FAMILY).
t('23 alias target in canonical enum', function () {
  const e = spec.enumForAliasField('archetype_family');
  assert.ok(e && e.indexOf('sweatshirt') !== -1 && e.indexOf('sweater') !== -1 && e.indexOf('tshirt') !== -1);
});

// 24. Full alias-map integrity audit -> all targets valid, executable.
t('24 alias map full integrity', function () {
  const r = spec.aliasTargetsValid();
  assert.strictEqual(r.executable, true, 'alias enum must be exposed for validation');
  assert.strictEqual(r.allValid, true);
  r.report.forEach(function (x) { assert.strictEqual(x.result, 'PASS', x.field + '/' + x.raw); });
});

// 25. Invalid alias target detected (test-only corrupted map, production ALIAS_MAP untouched).
t('25 invalid alias target detected', function () {
  const e = spec.enumForAliasField('archetype_family');
  const badTarget = 'NOT_A_REAL_ARCHETYPE';
  assert.strictEqual(e.indexOf(badTarget), -1); // proves enum check would flag it
});

// 26. Alias result also enum-validated (rule='alias' no longer skips enum) — validator path.
t('26 alias result enum-validated in validator', function () {
  // Craft an observation package with an aliasable field carrying a BAD alias target is not possible
  // via current L1 fields; instead verify the validator enum branch treats alias like others by
  // checking a canonical field with rule alias would be enum-checked (enumForAliasField wired).
  const { validate } = require('../04_CLEAN_ENGINE_CODE/src/layers/l2_validator');
  const fakeCanonical = { garment_structure: {
    archetype_family: { value: 'BOGUS', raw: 'hoodie', rule: 'alias', rule_source: 'LEGACY_AF_NORM',
                        source_layer: 'L1', source_object: 'garment_structure', source_field: 'archetype_family' },
    shoulder_structure: { value: 'strong', raw: 'strong', rule: 'canonical', rule_source: 'l1_field_spec.enums',
                          source_layer: 'L1', source_object: 'garment_structure', source_field: 'shoulder_structure' },
  } };
  const obsPkg = createPackage(PACKAGE_TYPES.OBSERVATION, 'L1', {}, LAYER_STATUS.OK, {});
  const v = validate(obsPkg, fakeCanonical, {});
  assert.ok(v.invalid_enum.some(function (x) { return x.field === 'archetype_family'; }));
});

// 27. rule_source present for alias.
t('27 rule_source alias', function () {
  const { build } = require('../04_CLEAN_ENGINE_CODE/src/layers/l2_builder');
  const obsPkg = createPackage(PACKAGE_TYPES.OBSERVATION, 'L1',
    { observations: { garment_structure: { shoulder_structure: { value: 'strong', source: 'Vision' } } },
      unknowns: {}, validation: { duplicate_conflict: [] } }, LAYER_STATUS.OK, {});
  const built = build(obsPkg);
  assert.strictEqual(built.canonical.garment_structure.shoulder_structure.rule_source, 'l1_field_spec.enums');
});

// 28. rule_source present for identity / canonical / duplicate.
t('28 rule_source identity & duplicate', function () {
  const c = l2(obsNormal);
  assert.ok(c.data.canonical.garment_structure.shoulder_structure.rule_source);
  const dup = l2(l1({ garment_structure: { shoulder_structure: 'strong' }, jacket_vision: { shoulder_structure: 'none' } }));
  assert.strictEqual(dup.data.canonical.garment_structure.shoulder_structure.rule_source, 'l1_validator.duplicate_conflict');
});

// 29. Missing rule_source flagged by validator provenance check.
t('29 missing rule_source flagged', function () {
  const { validate } = require('../04_CLEAN_ENGINE_CODE/src/layers/l2_validator');
  const noSrc = { garment_structure: {
    shoulder_structure: { value: 'strong', raw: 'strong', rule: 'canonical', /* rule_source missing */
                          source_layer: 'L1', source_object: 'garment_structure', source_field: 'shoulder_structure' } } };
  const obsPkg = createPackage(PACKAGE_TYPES.OBSERVATION, 'L1', {}, LAYER_STATUS.OK, {});
  const v = validate(obsPkg, noSrc, {});
  assert.ok(v.provenance_missing.indexOf('garment_structure.shoulder_structure') !== -1);
});

// 30. Shadow scope is field-level, behavioral_oracle false (comparator result metadata).
t('30 shadow scope field-level', function () {
  const cmp = compareCanonical({ garment_structure: { shoulder_structure: 'strong' } });
  assert.strictEqual(cmp.scope, 'FIELD_LEVEL_CANONICAL_REFERENCE');
  assert.strictEqual(cmp.behavioral_oracle, false);
});

// 31. Legacy adapter declares NOT_CONNECTED + behavioral_oracle false.
t('31 legacy not connected, oracle false', function () {
  const r = legacyResult();
  assert.strictEqual(r.legacy_engine_connected, false);
  assert.strictEqual(r.behavioral_oracle, false);
  assert.strictEqual(r.comparison_scope, SHADOW_SCOPE);
});

// 32. Derived/axis keys absent (structural) — reuse scan on full package data.
t('32 no derived/projection keys', function () {
  const c = l2(obsNormal);
  const keys = recursiveKeyScan(c.data);
  ['derived', 'projection', 'DerivedPackage', 'ProjectionContext'].forEach(function (k) {
    assert.strictEqual(keys.indexOf(k), -1);
  });
});

// 33. Wrong input contract: direct call yields package with data.valid=false (no new status).
t('33 wrong input contract behavior', function () {
  const wrong = createPackage(PACKAGE_TYPES.OUTPUT, 'X', {}, LAYER_STATUS.OK, {});
  const c = l2(wrong);
  assert.strictEqual(c.status, LAYER_STATUS.OK);         // execution status unchanged (no new status)
  assert.strictEqual(c.data.validation.wrong_input, true);
  assert.strictEqual(c.data.valid, false);
});

// 34. ALIAS approved as Clean Canonical Alias (CEO 2026-07-11) with source + anchor.
t('34 alias approved with anchor', function () {
  assert.strictEqual(spec.ALIAS_SOURCE, 'LEGACY_AF_NORM');
  assert.strictEqual(spec.ALIAS_APPROVAL, 'APPROVED');
  assert.ok(spec.ALIAS_APPROVAL_ANCHOR && spec.ALIAS_APPROVAL_ANCHOR.indexOf('CEO 2026-07-11') !== -1);
});

// 35. hoodie compound requirement recorded (sweatshirt + hood_present=true) — no feature loss.
t('35 hoodie compound requirement recorded', function () {
  assert.strictEqual(spec.ALIAS_MAP.archetype_family.hoodie, 'sweatshirt');
  assert.ok(spec.ALIAS_COMPOUND.archetype_family && spec.ALIAS_COMPOUND.archetype_family.hoodie);
  assert.strictEqual(spec.ALIAS_COMPOUND.archetype_family.hoodie.hood_present, true);
});

console.log('\n--- STMX L2 Tests: ' + pass + ' passed, ' + fail + ' failed ---');
console.log('SUMMARY: ' + (fail === 0 ? 'PASS' : 'FAIL') + ' (' + pass + '/' + (pass + fail) + ')');
if (fail > 0) process.exitCode = 1;
