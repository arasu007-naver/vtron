'use strict';
/* VERIFICATION_TOOL / NON_FROZEN — Step 2 successor V2 preload hook (V2.3.68). Any attempt to open a GT source, CEO rationale / re-adjudication /
 * CEO review record, R1 corpus, raw or blind observation batch, member map, Descriptor, Vector, image, the frozen Step 2 driver (reads the GT-bearing
 * corpus) or a V2.3.67 package-local prediction / GT comparison throws FORBIDDEN_READ and is logged to $V2368_READ_LOG.denied; every other opened
 * path is appended to $V2368_READ_LOG on exit. */
const fs = require('fs');
const LOG = process.env.V2368_READ_LOG;
const DENY = /CANONICAL_FINAL_REPRESENTATION|STMX_CEO_CALIBRATION_CORPUS|READJUDICATION|CEO_REVIEW|R1_CANONICAL_OBSERVATION_CORPUS|R1_OBSERVATION_CONTRACT|observation_batches|OBSERVATION_BATCH|REOBSERVATION_BATCH|member_map|[\\/]DESCRIPTORS[\\/]|VECTOR_DB|REFERENCE_IMAGES|\.(jpe?g|png|webp)$|run_clean_v2_3_2|33_GT_FREE_114_UNIT_DRY_REPLAY|step2_successor_prototype|post_seal_comparison|traces\.json|inert_rows_check/i;
const seen = [];
const wrap = (name) => { const orig = fs[name]; if (typeof orig !== 'function') return;
  fs[name] = function (p, ...rest) { const s = String(p && p.href ? p.href : p);
    if (typeof p !== 'number' && DENY.test(s)) { if (LOG) fs.appendFileSync.call(fs, LOG + '.denied', s + '\n'); throw new Error('FORBIDDEN_READ ' + s); }
    if (LOG && typeof p !== 'number' && !seen.includes(s)) seen.push(s); return orig.call(this, p, ...rest); }; };
const origAppend = fs.appendFileSync;
['readFileSync', 'openSync', 'readFile', 'createReadStream', 'readdirSync', 'statSync'].forEach(wrap);
if (fs.promises && fs.promises.readFile) { const o = fs.promises.readFile; fs.promises.readFile = function (p, ...r) { const s = String(p); if (DENY.test(s)) return Promise.reject(new Error('FORBIDDEN_READ ' + s)); seen.push(s); return o.call(this, p, ...r); }; }
process.on('exit', () => { if (LOG) origAppend.call(fs, LOG, seen.join('\n') + '\n'); });
module.exports = { DENY };
