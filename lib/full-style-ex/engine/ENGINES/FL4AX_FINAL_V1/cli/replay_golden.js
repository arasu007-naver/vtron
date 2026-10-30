#!/usr/bin/env node
'use strict';
/* FL4AX_FINAL_V1 — golden replay: the 43 stored Frozen Vision outputs (golden/inputs/corpus43/<look>/packet.json + run_record.json) → integrated results,
   compared with the build-time results (golden/expected/corpus43.jsonl). node cli/replay_golden.js [--json]. No network, no GT. */
const fs = require('fs'), path = require('path'); const REL = path.join(__dirname, '..'); const E = require(path.join(REL, 'lib', 'release_entry.js'));
const GD = path.join(REL, 'golden', 'inputs', 'corpus43'); const EXP = fs.readFileSync(path.join(REL, 'golden', 'expected', 'corpus43.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const rows = EXP.map((x) => { const r = E.fromExtractorOutputDir(path.join(GD, x.look)); return { look: x.look, status: r.status, style_id: r.style_id, directions: r.directions, identical: JSON.stringify(r) === JSON.stringify(x.result) }; });
const summary = { total: rows.length, identical: rows.filter((r) => r.identical).length, complete: rows.filter((r) => r.status === 'COMPLETE').length, input_failure: rows.filter((r) => r.status === 'INPUT_FAILURE').length, contract_violation: rows.filter((r) => r.status === 'CONTRACT_VIOLATION').length, style_ids: rows.reduce((o, r) => (r.style_id ? ((o[r.style_id] = (o[r.style_id] || 0) + 1), o) : o), {}) };
if (process.argv.includes('--json')) console.log(JSON.stringify({ summary, rows })); else { for (const r of rows) console.log(r.look.padEnd(12), r.status.padEnd(14), (r.style_id || '—').padEnd(5), r.identical ? 'identical' : 'DIFFERENT'); console.log(JSON.stringify(summary)); }
process.exitCode = summary.identical === summary.total && summary.contract_violation === 0 ? 0 : 1;
