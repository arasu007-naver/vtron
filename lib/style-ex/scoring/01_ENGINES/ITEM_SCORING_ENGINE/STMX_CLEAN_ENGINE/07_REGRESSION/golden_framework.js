'use strict';
/*
 * STMX Regression — Golden Framework (Sprint 1 skeleton).
 * Runs a suite of {name, input, expect} cases through the Clean runtime, collects
 * pass/fail/error, handles empty suite, exports JSON + human summary.
 * Sprint 1: SYNTHETIC contract tests only — NO real STMX image/score regression (order §3.4).
 */
const { run } = require('../04_CLEAN_ENGINE_CODE/src/runtime/runtime_skeleton');

/**
 * @param cases Array<{ name, input, opts?, check: (result)=>({pass:boolean, detail?:string}) }>
 */
function runSuite(cases) {
  const report = { total: 0, passed: 0, failed: 0, errored: 0, empty: false, results: [] };
  if (!cases || cases.length === 0) {
    report.empty = true;
    return Object.freeze(report);
  }
  cases.forEach(function (tc) {
    report.total += 1;
    let outcome;
    try {
      const result = run(tc.input, tc.opts || {});
      const checked = tc.check(result);
      outcome = { name: tc.name, status: checked.pass ? 'PASS' : 'FAIL', detail: checked.detail || '' };
      if (checked.pass) report.passed += 1; else report.failed += 1;
    } catch (e) {
      outcome = { name: tc.name, status: 'ERROR', detail: String(e.message) };
      report.errored += 1;
    }
    report.results.push(outcome);
  });
  return Object.freeze(report);
}

function toJSON(report) { return JSON.stringify(report, null, 2); }

function toSummary(report) {
  if (report.empty) return 'Regression: EMPTY SUITE (0 cases) — deterministic no-op.';
  return 'Regression: total=' + report.total + ' PASS=' + report.passed +
         ' FAIL=' + report.failed + ' ERROR=' + report.errored;
}

module.exports = { runSuite, toJSON, toSummary };
