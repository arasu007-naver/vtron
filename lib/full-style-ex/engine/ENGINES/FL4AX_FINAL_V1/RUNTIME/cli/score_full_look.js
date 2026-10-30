#!/usr/bin/env node
'use strict';
/* FL4AX — score one look: node cli/score_full_look.js <packet.json> <run_record.json>   |   node cli/score_full_look.js --dir <extractor output dir>
   Prints the four-axis result (JSON). No network, no GT, no image. */
const fs = require('fs'), path = require('path'); const R = require(path.join(__dirname, '..', 'src', 'fl4ax_integrated_runtime_v1.js'));
const a = process.argv.slice(2); const rd = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const r = a[0] === '--dir' ? R.fromExtractorOutputDir(a[1]) : R.scoreFullLook({ packet: rd(a[0]), run_record: rd(a[1]) });
console.log(JSON.stringify(process.argv.includes('--full') ? r : Object.assign({}, r, { engine_records: '(omitted; pass --full)' }), null, 1));
