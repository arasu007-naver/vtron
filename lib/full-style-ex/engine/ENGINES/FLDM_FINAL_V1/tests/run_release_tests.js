#!/usr/bin/env node
'use strict';
/* FLDM_FINAL_V1 — release tests (self-contained). node tests/run_release_tests.js [<out.json>]
   R-01 frozen runtime suite (RUNTIME/tests, 27) · R-02 golden replay identical (43) · R-03 binary: every golden look D / M, distribution == manifest ·
   R-04 accepted known limitations behave as registered (F012 · F472 M; F267 M; M134 D) · R-05 input failure is separate (no Direction). */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REL = path.join(__dirname, '..'); const M = JSON.parse(fs.readFileSync(path.join(REL, 'RELEASE_MANIFEST.json'), 'utf8')); const E = require(path.join(REL, 'lib', 'release_entry.js'));
const T = []; const t = (id, d, pass, ev) => T.push({ id, desc: d, pass: !!pass, evidence: ev === undefined ? null : ev });
const s = cp.spawnSync(process.execPath, [path.join(REL, 'RUNTIME', 'tests', 'run_tests.js'), '--json'], { cwd: path.join(REL, 'RUNTIME'), encoding: 'utf8' }); let j = null; try { j = JSON.parse(s.stdout); } catch (e) { j = null; }
t('R-01', 'frozen runtime suite RUNTIME/tests/run_tests.js', s.status === 0 && j && j.pass === M.runtime_tests.total && j.total === M.runtime_tests.total, j ? j.pass + '/' + j.total : 'no output');
const g = cp.spawnSync(process.execPath, [path.join(REL, 'cli', 'replay_golden.js'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 }); const G = JSON.parse(g.stdout);
t('R-02', 'golden replay identical', G.summary.total === M.golden.total && G.summary.identical === M.golden.total, G.summary.identical + '/' + G.summary.total);
t('R-03', 'binary output: every golden look D / M; distribution == manifest', G.rows.every((r) => r.status === 'SCORED' && ['D', 'M'].includes(r.direction)) && JSON.stringify(G.summary.distribution) === JSON.stringify(M.golden.distribution), JSON.stringify(G.summary.distribution));
const d = (id) => (G.rows.find((r) => r.look === id) || {}).direction;
t('R-04', 'registered known limitations unchanged: FLDM-LIM-001 F012 = M · FLDM-LIM-002 F472 = M · FLDM-HIST-001 F267 = M · M134 = D', d('F012') === 'M' && d('F472') === 'M' && d('F267') === 'M' && d('M134') === 'D');
const f = [E.score(null), E.score({}), E.score({ look_frame: { state: 'OBSERVED', limits: [] }, component_registry: [] })];
t('R-05', 'technically invalid input → INPUT_FAILURE with no Direction (separate from scoring)', f.every((r) => r.status === 'INPUT_FAILURE' && r.direction === null));
const out = { release_id: M.release_id, at: new Date().toISOString(), pass: T.filter((x) => x.pass).length, total: T.length, all_pass: T.every((x) => x.pass), tests: T };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
for (const x of T) console.log((x.pass ? 'PASS ' : 'FAIL ') + x.id + ' ' + x.desc + ' — ' + x.evidence); console.log(out.pass + '/' + out.total); process.exitCode = out.all_pass ? 0 : 1;
