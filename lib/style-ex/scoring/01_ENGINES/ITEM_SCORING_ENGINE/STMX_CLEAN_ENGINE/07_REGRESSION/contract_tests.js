'use strict';
/*
 * STMX — Contract Test Suite (synthetic).
 * Current migration state: L1 implemented (real); L2..L8 skeleton; no scoring; no fabricated decision.
 * Expected per-layer status is read from migration_stage_profile.js (single source for tests).
 * Run: node 07_REGRESSION/contract_tests.js
 */
const assert = require('assert');
const { run } = require('../04_CLEAN_ENGINE_CODE/src/runtime/runtime_skeleton');
const { PACKAGE_TYPES, createPackage, LAYER_STATUS } = require('../04_CLEAN_ENGINE_CODE/src/runtime/packages');
const { compare } = require('../06_SHADOW_VALIDATION/comparators/comparator');
const { legacyResult } = require('../06_SHADOW_VALIDATION/runners/legacy_adapter');
const { cleanResult } = require('../06_SHADOW_VALIDATION/runners/clean_adapter');
const { runSuite } = require('./golden_framework');
const { STAGES } = require('./migration_stage_profile');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('PASS  ' + name); pass++; }
  catch (e) { console.log('FAIL  ' + name + ' :: ' + e.message); fail++; }
}

// 1. Pipeline runs L1..L8; each layer status matches the migration stage profile.
t('1 pipeline matches migration stage profile', function () {
  const r = run({});
  assert.strictEqual(r.layer_statuses.length, 8);
  r.layer_statuses.forEach(function (s) {
    assert.strictEqual(s.status, STAGES[s.layer], s.layer + ' expected ' + STAGES[s.layer]);
  });
});

// 2. undefined input does not crash.
t('2 undefined input does not crash', function () {
  const r = run(undefined);
  assert.ok(r.execution_status === 'OK' || r.execution_status === 'HALTED');
});

// 3. forbidden Vision-derived field is not turned into a score/decision (skeleton downstream).
t('3 forbidden field yields no decision', function () {
  const r = run({ tc_departure_evidence: { silhouette_departure: true } });
  assert.deepStrictEqual(r.decision_payload, {});
  assert.strictEqual(r.decision_status, 'NOT_IMPLEMENTED');
});

// 4. empty knowledge -> no fabricated scores.
t('4 empty knowledge yields non-decision', function () {
  const r = run({});
  assert.deepStrictEqual(r.decision_payload, {});
});

// 5. L3..L8 remain NOT_IMPLEMENTED per profile.
t('5 L3..L8 remain skeleton', function () {
  const r = run({});
  ['L3', 'L4', 'L5', 'L6', 'L7', 'L8'].forEach(function (L) {
    const s = r.layer_statuses.find(function (x) { return x.layer === L; });
    assert.strictEqual(s.status, LAYER_STATUS.NOT_IMPLEMENTED);
  });
});

// 6. Contract violation (wrong package type) is rejected (Hard Stop mechanism).
t('6 contract validation rejects wrong package type', function () {
  const { validateInputContract } = require('../04_CLEAN_ENGINE_CODE/src/runtime/layer_interfaces');
  const wrong = createPackage(PACKAGE_TYPES.CANONICAL, 'X', {}, LAYER_STATUS.NOT_IMPLEMENTED, {});
  assert.throws(function () { validateInputContract('L2', wrong); }, /CONTRACT_VIOLATION/);
});

// 7. Shadow full-engine comparison with unconnected legacy -> NOT_COMPARABLE.
t('7 shadow with unconnected legacy is NOT_COMPARABLE', function () {
  const c = compare(legacyResult({}), cleanResult({}));
  assert.strictEqual(c.status, 'NOT_COMPARABLE');
});

// 8. Empty regression suite handled deterministically.
t('8 empty regression suite', function () {
  const rep = runSuite([]);
  assert.strictEqual(rep.empty, true);
});

// 9. Determinism — same input twice yields identical output.
t('9 deterministic same-input same-output', function () {
  const a = run({ a: 1 }, { run_id: 'X' });
  const b = run({ a: 1 }, { run_id: 'X' });
  assert.deepStrictEqual(a, b);
});

// 10. L8 output skeleton schema shape.
t('10 L8 output skeleton schema', function () {
  const r = run({});
  ['run_id', 'architecture_version', 'migration_version', 'execution_status',
   'layer_statuses', 'decision_status', 'decision_payload', 'errors', 'diagnostics']
    .forEach(function (k) { assert.ok(Object.prototype.hasOwnProperty.call(r, k), 'missing ' + k); });
  assert.strictEqual(r.architecture_version, 'CLEAN_ARCHITECTURE_FREEZE_V1_0');
});

console.log('\n--- STMX Contract Tests: ' + pass + ' passed, ' + fail + ' failed ---');
console.log('SUMMARY: ' + (fail === 0 ? 'PASS' : 'FAIL') + ' (' + pass + '/' + (pass + fail) + ')');
if (fail > 0) process.exitCode = 1;
