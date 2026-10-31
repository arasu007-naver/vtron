'use strict';
/* STMX TC V2 candidate — runs every suite as a child process; prints a summary (and, with --json, one final JSON line). Writes nothing. Exit 0 = all passed. */
const path = require('path'), cp = require('child_process');
const suites = ['test_regression', 'test_domain_invariance', 'test_mutation', 'test_reason', 'test_adapter', 'test_guards', 'test_transport', 'test_live_controls', 'test_mandatory_boundary', 'test_r4_corrections'];   /* R4: + R3-B1 / R3-B2 corrections (CEO 2026-10-28 §4.4 · §6 · §10.3) */   /* R3: + mandatory boundary (CEO §11.3) */   /* R2: + transport (§11.1 C) + live controls (§12.4) */ const res = []; const data = {};
for (const s of suites) { const r = cp.spawnSync(process.execPath, [path.join(__dirname, s + '.js')], { encoding: 'utf8', maxBuffer: 1 << 29 }); const lines = (r.stdout || '').split('\n'); const rj = lines.find((l) => l.startsWith('RESULT_JSON '));
  const o = rj ? JSON.parse(rj.slice(12)) : { suite: s, pass: 0, total: 1, log: [{ id: s, result: 'FAIL', detail: (r.stderr || '').slice(0, 1500) }] }; res.push({ suite: s, pass: o.pass, total: o.total, fail: o.total - o.pass, exit: r.status }); data[s] = { log: o.log, data: o.data };
  if (!process.argv.includes('--json')) { for (const l of o.log) if (l.result !== 'PASS') console.log('FAIL ' + s + ' ' + l.id + ' ' + l.title + ' — ' + JSON.stringify(l.detail).slice(0, 800)); console.log(s + ': ' + o.pass + '/' + o.total); } }
const B = require('../src/tc_v2_binding'); const pass = res.reduce((n, r) => n + r.pass, 0), total = res.reduce((n, r) => n + r.total, 0);
if (process.argv.includes('--json')) console.log(JSON.stringify({ engine: B.selfIdentity(), suites: res, pass, total, all_pass: pass === total && res.every((r) => r.exit === 0), data }));
else console.log('TOTAL ' + pass + '/' + total);
process.exitCode = pass === total ? 0 : 1;
