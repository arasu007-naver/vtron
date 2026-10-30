#!/usr/bin/env node
'use strict';
/**
 * Score ONE Full-Look look for EI Direction (production entry).
 *   node cli/score.js <packet.json> <run_record.json>        → prints the EI Direction record (JSON) to stdout
 * Inputs = the outputs of the Frozen Full-Look Vision Extractor Final V1 (packet contract STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET · V1_RC4).
 * Exit 0 = RESOLVED (EXPRESSIVE | INTROVERT) · 2 = input failure (TECHNICAL_EXCEPTION, class INPUT_FAILURE) · 1 = usage error. No network, no credential.
 */
const fs = require('fs'); const P = require('../lib/release_paths.js');
const [pk, rr] = process.argv.slice(2);
if (!pk || !rr) { console.error('usage: node cli/score.js <packet.json> <run_record.json>'); process.exit(1); }
const out = P.score(JSON.parse(fs.readFileSync(pk, 'utf8')), JSON.parse(fs.readFileSync(rr, 'utf8')));
console.log(JSON.stringify(out, null, 1)); process.exitCode = out.status === 'RESOLVED' ? 0 : 2;
