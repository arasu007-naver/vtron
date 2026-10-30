#!/usr/bin/env node
'use strict';
/* FLDM_FINAL_V1 — score one look: node cli/score.js <packet.json>  → prints the governed DM Direction result (JSON). No network, no GT. */
const fs = require('fs'), path = require('path'); const E = require(path.join(__dirname, '..', 'lib', 'release_entry.js'));
let pk = null; try { pk = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { pk = null; }
console.log(JSON.stringify(E.score(pk), null, 1));
