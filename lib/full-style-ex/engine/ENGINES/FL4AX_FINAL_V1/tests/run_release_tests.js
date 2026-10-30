#!/usr/bin/env node
'use strict';
/* FL4AX_FINAL_V1 — release tests. node tests/run_release_tests.js [<out.json>]
   R-01 frozen runtime suite (RUNTIME/tests, 12) · R-02 golden replay identical (43) · R-03 exhaustive 16 Style IDs (EI → TC → SR → DM) + invalid enums refused ·
   R-04 golden statuses: 41 COMPLETE with canonical Style IDs + 2 governed INPUT_FAILURE (no Style ID) · R-05 registered known limitations behave as registered ·
   R-06 technically invalid input → INPUT_FAILURE on every axis · R-07 the four bound releases still match their pins (seal · manifest · fingerprint). */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REL = path.join(__dirname, '..'); const M = JSON.parse(fs.readFileSync(path.join(REL, 'RELEASE_MANIFEST.json'), 'utf8')); const E = require(path.join(REL, 'lib', 'release_entry.js')); const B = require(path.join(REL, 'RUNTIME', 'src', 'fl4ax_bindings_v1.js'));
const T = []; const t = (id, d, pass, ev) => T.push({ id, desc: d, pass: !!pass, evidence: ev === undefined ? null : ev });
const s = cp.spawnSync(process.execPath, [path.join(REL, 'RUNTIME', 'tests', 'run_tests.js'), '--json'], { cwd: path.join(REL, 'RUNTIME'), encoding: 'utf8', maxBuffer: 1 << 28 }); let j = null; try { j = JSON.parse(s.stdout); } catch (e) { j = null; }
t('R-01', 'frozen runtime suite RUNTIME/tests/run_tests.js', s.status === 0 && j && j.pass === M.runtime_tests.total && j.total === M.runtime_tests.total, j ? j.pass + '/' + j.total : 'no output');
const g = cp.spawnSync(process.execPath, [path.join(REL, 'cli', 'replay_golden.js'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 }); const G = JSON.parse(g.stdout);
t('R-02', 'golden replay identical', G.summary.total === M.golden.total && G.summary.identical === M.golden.total, G.summary.identical + '/' + G.summary.total);
const combos = []; for (const e of ['E', 'I']) for (const c of ['T', 'C']) for (const r of ['S', 'R']) for (const d of ['D', 'M']) combos.push([e, c, r, d]); const ids = combos.map((x) => E.resolveStyleId(...x));
const refused = [['NEUTRAL', 'C', 'S', 'D'], ['E', 'UNKNOWN', 'S', 'D'], ['E', 'C', 'UNRESOLVED', 'D'], ['E', 'C', 'S', 'N'], [null, 'C', 'S', 'D']].every((x) => { try { E.resolveStyleId(...x); return false; } catch (e) { return e.code === 'INVALID_DIRECTION_ENUM'; } });
t('R-03', 'exhaustive 16 binary combinations → the 16 canonical Style IDs (EI → TC → SR → DM); Neutral / UNKNOWN / UNRESOLVED / N / null refused', JSON.stringify(ids) === JSON.stringify(M.style_ids) && JSON.stringify(E.STYLE_IDS) === JSON.stringify(M.style_ids) && new Set(ids).size === 16 && refused, ids.join(' '));
t('R-04', 'golden statuses == manifest (COMPLETE with a canonical Style ID · governed INPUT_FAILURE with none · no CONTRACT_VIOLATION)', G.summary.complete === M.golden.complete && G.summary.input_failure === M.golden.input_failure && G.summary.contract_violation === 0 && G.rows.every((r) => (r.status === 'COMPLETE' ? M.style_ids.includes(r.style_id) : r.style_id === null)) && JSON.stringify(G.summary.style_ids) === JSON.stringify(M.golden.style_ids), JSON.stringify({ complete: G.summary.complete, input_failure: G.summary.input_failure }));
const row = (l) => G.rows.find((r) => r.look === l) || { directions: {} };
const lim = M.known_limitation_checks.every((k) => (k.expect === null ? row(k.look).status === 'INPUT_FAILURE' && row(k.look).directions[k.axis] === null : row(k.look).directions[k.axis] === k.expect));
t('R-05', 'registered known limitations unchanged (' + M.known_limitation_checks.map((k) => k.look + ' ' + k.axis + '=' + (k.expect || 'INPUT_FAILURE')).join(' · ') + ')', lim);
const f = [E.scoreFullLook(null), E.scoreFullLook({}), E.scoreFullLook({ packet: { packet_contract: 'WRONG' }, run_record: {} })];
t('R-06', 'technically invalid input → INPUT_FAILURE on all four axes, no Style ID', f.every((r) => r.status === 'INPUT_FAILURE' && r.style_id === null && r.diagnostics.input_failure_axes.length === 4));
let bound = null; try { bound = B.bind(); } catch (e) { bound = { error: e.code }; }
t('R-07', 'the four Full-Look releases bind and verify against the pins (seal · manifest · runtime fingerprint)', bound && !bound.error && ['EI', 'TC', 'SR', 'DM'].every((a) => bound.engines && bound.engines[a]), bound && bound.error ? bound.error : 'bound at ' + (bound && bound.root));
const out = { release_id: M.release_id, at: new Date().toISOString(), pass: T.filter((x) => x.pass).length, total: T.length, all_pass: T.every((x) => x.pass), tests: T };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
for (const x of T) console.log((x.pass ? 'PASS ' : 'FAIL ') + x.id + ' ' + x.desc + ' — ' + x.evidence); console.log(out.pass + '/' + out.total); process.exitCode = out.all_pass ? 0 : 1;
