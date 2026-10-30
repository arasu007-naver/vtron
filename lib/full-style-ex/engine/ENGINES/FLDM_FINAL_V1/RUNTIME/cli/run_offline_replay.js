'use strict';
/* STMX Full-Look DM Direction V3.1 CANDIDATE — offline replay CLI. Reads frozen Full-Look Vision Evidence Packets given on the command line (or a JSON list file with
   --list <file>), scores each, prints one JSON line per packet. No GT, no network, no image. usage: node cli/run_offline_replay.js <packet.json> ... | --list <files.json> */
const fs = require('fs'), path = require('path'); const R = require('../src/fl_dm_direction_resolver_v3_1.js');
const a = process.argv.slice(2); const files = a[0] === '--list' ? JSON.parse(fs.readFileSync(a[1], 'utf8')) : a;
for (const f of files) { let pk = null; try { pk = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { pk = null; } console.log(JSON.stringify({ packet: path.basename(path.dirname(f)) + '/' + path.basename(f), result: R.scorePacket(pk) })); }
