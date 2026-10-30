#!/usr/bin/env node
'use strict';
/* FL4AX — offline replay of stored Frozen Vision outputs: node cli/replay_corpus.js <dir with one sub-folder per look (packet.json + run_record.json)> [--json]
   Prints one row per look (status · Style ID · four letters) and a summary. No network, no GT. */
const fs = require('fs'), path = require('path'); const R = require(path.join(__dirname, '..', 'src', 'fl4ax_integrated_runtime_v1.js'));
const dir = path.resolve(process.argv[2]); const looks = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'packet.json'))).sort();
const rows = looks.map((l) => { const r = R.fromExtractorOutputDir(path.join(dir, l)); return { look: l, status: r.status, style_id: r.style_id, directions: r.directions, input_failure_axes: r.diagnostics.input_failure_axes, contract_violation_axes: r.diagnostics.contract_violation_axes, result: r }; });
const summary = { total: rows.length, complete: rows.filter((r) => r.status === 'COMPLETE').length, input_failure: rows.filter((r) => r.status === 'INPUT_FAILURE').length, contract_violation: rows.filter((r) => r.status === 'CONTRACT_VIOLATION').length, style_ids: rows.reduce((o, r) => (r.style_id ? ((o[r.style_id] = (o[r.style_id] || 0) + 1), o) : o), {}) };
if (process.argv.includes('--json')) console.log(JSON.stringify({ summary, rows })); else { for (const r of rows) console.log(r.look.padEnd(12), r.status.padEnd(14), r.style_id || '—', JSON.stringify(r.directions)); console.log(JSON.stringify(summary)); }
process.exitCode = summary.contract_violation === 0 ? 0 : 1;
