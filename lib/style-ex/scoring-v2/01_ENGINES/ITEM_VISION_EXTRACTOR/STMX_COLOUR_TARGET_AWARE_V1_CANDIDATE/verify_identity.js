'use strict';
/* identity check (read-only): every sealed file == its sealed sha256 · no unsealed file · directory aggregate == the sealed aggregate. usage: node verify_identity.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const SEAL = 'CODE_IDENTITY_SEAL_COLOUR_TARGET_AWARE_V1_CANDIDATE.json';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const s = JSON.parse(fs.readFileSync(path.join(__dirname, SEAL), 'utf8'));
const drift = s.files.filter((f) => !fs.existsSync(path.join(__dirname, f.file)) || sha(fs.readFileSync(path.join(__dirname, f.file))) !== f.sha256).map((f) => f.file);
const onDisk = fs.readdirSync(__dirname, { recursive: true }).filter((f) => fs.statSync(path.join(__dirname, f)).isFile()).map((f) => f.split(path.sep).join('/'));
const unsealed = onDisk.filter((f) => f !== SEAL && !s.files.some((x) => x.file === f));
const agg = sha(s.files.map((f) => f.file + ':' + f.sha256 + '\n').sort().join(''));
const out = { engine_id: s.engine_id, files: s.files.length, directory_aggregate: agg, matches_seal: !drift.length && !unsealed.length && agg === s.DIRECTORY_AGGREGATE_SHA256, drift, unsealed };
console.log(JSON.stringify(out)); process.exitCode = out.matches_seal ? 0 : 1;
