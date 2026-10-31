'use strict';
/* STMX DM V2 candidate — complete regression: `node tests/run_all.js` (exit 0 = every test passed). Prints results only; ⛔ writes NOTHING (the candidate stays byte-identical).
   `node tests/run_all.js --json` prints one JSON object with every suite's data on the last line. */
const path = require('path'), cp = require('child_process');
const suites = ['test_regression.js', 'test_lattice.js', 'test_mandatory.js', 'test_reason.js', 'test_guards.js']; const results = []; const json = process.argv.includes('--json');
for (const s of suites) { const r = cp.spawnSync(process.execPath, [path.join(__dirname, s)], { encoding: 'utf8', maxBuffer: 1 << 28 }); const lines = r.stdout.split('\n'); const rj = lines.find((l) => l.startsWith('RESULT_JSON '));
  if (!json) process.stdout.write(lines.filter((l) => !l.startsWith('RESULT_JSON ')).join('\n')); if (r.stderr) process.stderr.write(r.stderr);
  const d = rj ? JSON.parse(rj.slice(12)) : { suite: s, pass: 0, fail: 1, total: 1, log: [], data: null }; results.push(Object.assign({ exit: r.status }, d)); }
const B = require('../src/dm_v2_binding');
const out = { engine: B.selfIdentity(), suites: results.map((r) => ({ suite: r.suite, pass: r.pass, total: r.total, fail: r.fail, exit: r.exit })), pass: results.reduce((a, r) => a + r.pass, 0), total: results.reduce((a, r) => a + r.total, 0), all_pass: results.every((r) => r.fail === 0 && r.exit === 0) };
if (json) console.log(JSON.stringify(Object.assign({}, out, { data: Object.fromEntries(results.map((r) => [r.suite, { log: r.log, data: r.data }])) })));
else console.log('\nRUN ALL: ' + out.pass + ' / ' + out.total + (out.all_pass ? ' — ALL PASS' : ' — FAIL'));
process.exit(out.all_pass ? 0 : 1);
