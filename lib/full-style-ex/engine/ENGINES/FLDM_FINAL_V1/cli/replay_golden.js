#!/usr/bin/env node
'use strict';
/* FLDM_FINAL_V1 — golden replay: every golden/inputs/corpus43/*.packet.json is scored and compared with golden/expected/corpus43.jsonl (build-time outputs).
   node cli/replay_golden.js [--json]  → summary { total, identical, distribution }. No network, no GT. */
const fs = require('fs'), path = require('path'); const E = require(path.join(__dirname, '..', 'lib', 'release_entry.js'));
const GD = path.join(__dirname, '..', 'golden'); const EXP = fs.readFileSync(path.join(GD, 'expected', 'corpus43.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const rows = EXP.map((x) => { const pk = JSON.parse(fs.readFileSync(path.join(GD, 'inputs', 'corpus43', x.look + '.packet.json'), 'utf8')); const r = E.score(pk); return { look: x.look, direction: r.direction, status: r.status, rule_trace: r.rule_trace, identical: JSON.stringify(r) === JSON.stringify(x.result) }; });
const dist = rows.reduce((o, r) => ((o[r.direction] = (o[r.direction] || 0) + 1), o), {});
const summary = { total: rows.length, identical: rows.filter((r) => r.identical).length, distribution: dist };
if (process.argv.includes('--json')) console.log(JSON.stringify({ summary, rows })); else { for (const r of rows) console.log(r.look.padEnd(12), r.direction, r.identical ? 'identical' : 'DIFFERENT'); console.log(JSON.stringify(summary)); }
process.exitCode = summary.identical === summary.total ? 0 : 1;
