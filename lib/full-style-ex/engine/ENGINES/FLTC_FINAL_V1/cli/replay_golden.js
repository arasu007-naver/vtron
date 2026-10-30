#!/usr/bin/env node
'use strict';
/**
 * Replay every golden input of the release and compare with the golden expected output (exact JSON equality).
 *   node cli/replay_golden.js [--json]
 * golden/inputs/corpus43/<look>/{packet,run_record}.json  — the 43 sealed Full-Look packets (frozen Vision outputs)
 * golden/expected/corpus43/<look>.json                    — the output of the V3 final candidate recorded at release build time
 * Exit 0 = all identical. No GT is read or contained.
 */
const fs = require('fs'); const P = require('../lib/release_paths.js');
const G = P.REL + 'golden/'; const rows = [];
for (const set of ['corpus43']) for (const id of fs.readdirSync(G + 'inputs/' + set).sort()) {
  const d = G + 'inputs/' + set + '/' + id + '/'; const out = P.score(JSON.parse(fs.readFileSync(d + 'packet.json', 'utf8')), JSON.parse(fs.readFileSync(d + 'run_record.json', 'utf8')));
  const exp = fs.readFileSync(G + 'expected/' + set + '/' + id + '.json', 'utf8'); const same = JSON.stringify(out, null, 1) === exp;
  rows.push({ set, id, label: out.status === 'RESOLVED' ? out.direction : 'INPUT_FAILURE:' + out.exception.code, rule: out.rule || null, resolved_by: out.resolved_by || null, identical: same });
}
const summary = { total: rows.length, identical: rows.filter((r) => r.identical).length, by_set: {} };
for (const r of rows) { const s = (summary.by_set[r.set] = summary.by_set[r.set] || { looks: 0, CLASSIC: 0, TRANSFORMATIVE: 0, input_failures: 0 }); s.looks++; if (r.label === 'CLASSIC' || r.label === 'TRANSFORMATIVE') s[r.label]++; else s.input_failures++; }
if (process.argv.includes('--json')) console.log(JSON.stringify({ summary, rows }, null, 1)); else { console.log(JSON.stringify(summary)); rows.filter((r) => !r.identical).forEach((r) => console.log('DIFF', r.set, r.id)); }
process.exitCode = summary.identical === summary.total ? 0 : 1;
