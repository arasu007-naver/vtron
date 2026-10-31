'use strict';
/* STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1 — seal check (non-scoring): every file listed in the seal has its sealed sha256, the directory aggregate matches, no unsealed file exists. usage: node verify_identity.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const D = __dirname; const SEAL = path.join(D, 'CODE_IDENTITY_SEAL_STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE.json');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const s = JSON.parse(fs.readFileSync(SEAL, 'utf8')); const bad = s.files.filter((f) => !fs.existsSync(path.join(D, f.file)) || sha(fs.readFileSync(path.join(D, f.file))) !== f.sha256).map((f) => f.file);
const agg = sha(s.files.map((f) => f.file + ':' + f.sha256 + '\n').sort().join(''));
const walk = (d, rel = '', o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(path.join(d, e.name), r, o); else o.push(r); } return o; };
const extra = walk(D).filter((f) => f !== path.basename(SEAL) && !s.files.some((x) => x.file === f));
const okAll = !bad.length && !extra.length && agg === s.DIRECTORY_AGGREGATE_SHA256;
console.log(JSON.stringify({ engine: s.engine_id, files: s.files.length, changed: bad, unsealed: extra, directory_aggregate: agg, matches_seal: okAll }));
process.exitCode = okAll ? 0 : 1;
