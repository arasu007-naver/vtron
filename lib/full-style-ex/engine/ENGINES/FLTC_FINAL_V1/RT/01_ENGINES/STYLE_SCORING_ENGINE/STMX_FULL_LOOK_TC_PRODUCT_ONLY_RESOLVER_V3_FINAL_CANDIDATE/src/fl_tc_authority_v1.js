'use strict';
/**
 * STMX FULL-LOOK TC DIRECTION RESOLVER V1 — CANDIDATE · authority binding.
 * Binds BY NAME and BY HASH the frozen artefacts the resolver reads (read-only). A mismatch fails the load (fail-closed); nothing is ever
 * resolved through "latest", glob, readdir or mtime discovery.
 *   - frozen Item TC Step 2 predicates through the Step 2 semantic successor V4 (a bound dependency of the TC production engine STMX_TC_ENGINE_V1)
 *   - Item Vision Producer V1_3 value domains (the frozen Item value sets used for the irrelevance proof and the MULTI list)
 *   - Full-Look Vision release identity (FLV-FINAL-FREEZE-V1-2026-10-17) — the packet contract the adapter accepts
 * Approved semantic authorities applied by this resolver are listed in AUTHORITIES (provenance only; the resolver never reads a GT or a look id).
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..') + path.sep;   // master root
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const PINS = Object.freeze({
  step2_successor_v4: { path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V4_CANDIDATE/src/step2_semantic_successor_v4.js', sha256: '868850fdc40221c48437e24011c716d412f902d1a4fe79d590ba7cc960e2b9e1' },
  tc_production_authority: { path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_PRODUCTION_AUTHORITY_V1.json', sha256: '5b237300e9fc5b99b134077875f9e38ec0021702155ec08d62b64c281e362d9a' },
  item_vision_v1_3_rules: { path: '01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/producer_rules_v1.js', sha256: 'c22e59140deecb7ecc8a0adeec3f95694567b3e8965457283a931df91b2f7bad' },
  flv_freeze_seal: { path: '01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/FINAL_FREEZE_SEAL.json', sha256: null },   // existence + freeze_id checked below
  flv_integrated_gates: { path: '01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/01_RUNTIME/01_ENGINES/STYLE_VISION_EXTRACTOR/FLV_RC6_FINAL/src/integrated.js', sha256: '94cbb95945ef4986098d63546934d6a31be4709a37bcaad562b78aa2db2a93b7' },   // frozen conditional gates (sleeve_volume · closure_type · waist_definition)
});
class AuthorityError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; } }
const bound = {};
for (const [k, p] of Object.entries(PINS)) { const abs = ROOT + p.path; if (!fs.existsSync(abs)) throw new AuthorityError('AUTHORITY_MISSING', p.path); const h = sha(abs); if (p.sha256 && h !== p.sha256) throw new AuthorityError('AUTHORITY_HASH_MISMATCH', p.path + ' ' + h); bound[k] = { path: p.path, sha256: h }; }
const SEAL = JSON.parse(fs.readFileSync(ROOT + PINS.flv_freeze_seal.path, 'utf8'));
if (SEAL.freeze_id !== 'FLV-FINAL-FREEZE-V1-2026-10-17') throw new AuthorityError('VISION_FREEZE_ID_MISMATCH', String(SEAL.freeze_id));
const TCPA = JSON.parse(fs.readFileSync(ROOT + PINS.tc_production_authority.path, 'utf8'));
if (!/COMPLETE_AND_CLOSED_AND_FROZEN/.test(TCPA.status)) throw new AuthorityError('TC_AUTHORITY_NOT_FROZEN', TCPA.status);
const S2 = require(ROOT + PINS.step2_successor_v4.path).createSuccessor();          // frozen predicates (silhouette · proportion · construction · asymmetry · direction)
const IV = require(ROOT + PINS.item_vision_v1_3_rules.path);                          // frozen Item V1_3 value domains
const AUTHORITIES = Object.freeze([
  { id: 'TC_FREEZE_V1 · STMX_TC_ENGINE_V1', kind: 'FROZEN', use: 'product departure = frozen Step 2 predicates (silhouette · proportion · construction · asymmetry) per garment, through the bound Step 2 successor V4' },
  { id: 'CEO 2026-10-17 TC clarification (binding)', kind: 'CEO_APPROVED', use: 'one valid product departure on any participating garment → T; Classic elsewhere never cancels; no second gate; reuse frozen TC definitions and exclusions; styling pathway checked before C; missing ≠ Classic' },
  { id: 'CQ-TC-2 Option A (CEO 2026-10-18, ADJ-TC-07)', kind: 'CEO_APPROVED', use: 'sufficiently observable + no Product and no Styling departure → CLASSIC; the operational steps are the CQ-TC-2 A table of the Final Design Review V1 (doc 08 §4): TC-P1 · TC-P2 · TC-P3 · TC-S1 · TC-S2 · TC-S3 · TC-C' },
  { id: 'IX-1 (b) (CEO 2026-10-06)', kind: 'CEO_APPROVED', use: 'a fact hidden by another participating component is excluded (not positive, not negative); crop / framing / unreadability may leave a gate unresolved' },
  { id: 'TC-D-3 / TC-D-4b (CEO)', kind: 'CEO_APPROVED', use: 'styling-only T only through a governed grammar departure; accessories are outside the product gate (HELD)' },
  { id: 'ADJ-TC-01 … 06 (CEO 2026-10-18)', kind: 'CEO_CASES_ILLUSTRATIVE', use: 'NOT applied as rules (generalisation FA-TC-1 pending); used only as semantic-consistency tests where the packet can carry the case' },
  { id: 'FA-TC-1 · FA-TC-2 (candidates, pending)', kind: 'NOT_APPROVED', use: 'NOT implemented: no styling-departure generalisation; the look-level frame / layer gates are NOT narrowed' }]);
module.exports = { ROOT, PINS, bound, S2, IV, AUTHORITIES, AuthorityError, VISION_FREEZE_ID: SEAL.freeze_id };
