'use strict';
/**
 * RC4 — builds STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt from the Integrated Extraction Prompt CANDIDATE V1
 * (this directory, rebuilt by build_integrated_prompt.js; sha256 0eb3e6d9… checked) with ONE line replaced:
 *   §9 the comment on "look_detail_systems" that declared [] a positive no-detail record (V1 transport semantics) → the observed-only
 *   sentence of the DM Evidence Transport V2 contract (CEO 2026-10-15; CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md §5 / §9).
 * Every other byte is identical (prompt_version line aside). No new vocabulary; no new request; the model still emits neither look_components
 * nor dm_evidence_visibility.
 *   node prompts/build_integrated_prompt_v2.js
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const V1 = path.join(__dirname, 'STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V1.txt');
const OUT = path.join(__dirname, 'STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt');
const src = fs.readFileSync(V1, 'utf8'); if (!sha(src).startsWith('0eb3e6d9bd76c97f')) throw new Error('PROMPT_V1_HASH');
const SUBS = [
  { why: 'DM Evidence Transport V2 §5 / §9 (CEO 2026-10-15): the transported system list is OBSERVED-ONLY; [] is never a verified-negative conclusion',
    before: '  "look_detail_systems": [                                           // [] is a positive record: no designed detail visible in the look',
    after: '  "look_detail_systems": [                                           // the systems you OBSERVED; [] = you observed none — NOT a claim that the look has no designed detail' },
];
const lines = src.split('\n'); const changes = [];
const pv = lines.findIndex((l) => l.startsWith('prompt_version:')); if (pv < 0) throw new Error('prompt_version line not found');
changes.push({ line: pv + 1, why: 'identity line only', before: lines[pv], after: 'prompt_version: STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2 (successor of STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V1; one §9 line changed — DM Evidence Transport V2)' });
lines[pv] = changes[0].after;
for (const s of SUBS) { const idx = lines.indexOf(s.before); if (idx < 0 || lines.lastIndexOf(s.before) !== idx) throw new Error('substitution target not found exactly once'); lines[idx] = s.after; changes.push({ line: idx + 1, why: s.why, before: s.before, after: s.after }); }
const out = lines.join('\n'); fs.writeFileSync(OUT, out);
const manifest = { document: 'INTEGRATED_PROMPT_V2_DIFF_MANIFEST', source: { path: 'prompts/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V1.txt', sha256: sha(src) }, output: { path: 'prompts/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt', sha256: sha(out), bytes: Buffer.byteLength(out) }, lines_total: lines.length, lines_changed: changes, new_vocabulary: 'none', new_request: 'none' };
fs.writeFileSync(path.join(__dirname, 'INTEGRATED_PROMPT_V2_DIFF_MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log('prompt V2', manifest.output.sha256, manifest.output.bytes, 'bytes ·', changes.length, 'lines changed');
