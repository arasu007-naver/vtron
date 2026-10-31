'use strict';
/* STMX SR V2 candidate — run the complete regression: `node tests/run_all.js` (exit 0 = every test passed). Writes _run_all_result.json. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const suites = ['replay_123.js', 'test_guards.js', 'test_holdout.js', 'test_r3.js']; /* R3: + test_r3.js */ const results = [];
for (const s of suites) { const r = cp.spawnSync(process.execPath, [path.join(__dirname, s)], { encoding: 'utf8', maxBuffer: 1 << 26 }); process.stdout.write(r.stdout); if (r.stderr) process.stderr.write(r.stderr); const m = r.stdout.match(/\n(\S+): (\d+) \/ (\d+) · fail (\d+)/); results.push({ suite: s, pass: m ? Number(m[2]) : 0, total: m ? Number(m[3]) : 0, fail: m ? Number(m[4]) : 1, exit: r.status }); }
const B = require('../src/sr_v2_binding');
const out = { at: new Date().toISOString(), engine: B.selfIdentity(), suites: results, pass: results.reduce((a, r) => a + r.pass, 0), total: results.reduce((a, r) => a + r.total, 0), all_pass: results.every((r) => r.fail === 0 && r.exit === 0) };
fs.writeFileSync(path.join(__dirname, '_run_all_result.json'), JSON.stringify(out, null, 1));
console.log('\nRUN ALL: ' + out.pass + ' / ' + out.total + (out.all_pass ? ' — ALL PASS' : ' — FAIL'));
process.exit(out.all_pass ? 0 : 1);
