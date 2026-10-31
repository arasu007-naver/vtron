'use strict';
/**
 * STMX TC Step 4 SEMANTIC CARRIER RUNTIME V3.4 — CANDIDATE / SHADOW · CANONICAL ENTRY POINT · R1-FREE · GT-FREE.
 * Order: STMX TC MAINLINE V2.3.66 (CEO D-65 APPROVED — Option C). Versioned successor of the sealed V3.3 (V2.3.61 · 770cd533…); V3.3 stays byte-identical.
 * The V3.3 semantic carrier source and BOUND_INPUTS.json are carried BYTE-IDENTICAL in this package (their output is reproduced exactly).
 * V3.4 adds, and nothing else:
 *   (1) the Grammar Transformation PROCESS whole-unit organizational relation (tc_whole_unit_organizational_relation_v3_4.js), computed after
 *       whole_garment_reading from the bound Reference V2 candidate organization blocks;
 *   (2) the Grammar State SUCCESSOR resolution by the bound Step 3 successor V2 candidate (category-general), emitted ONLY in the non-canonical
 *       SHADOW object step3_successor_shadow. The frozen grammar_state_output echo is untouched.
 * Reads no CEO GT, no R1, no historical TC, no Descriptor, no Vector, no image; emits no tier, score or number. Not frozen, not production,
 * NOT registered in the Clean Engine registry.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const v33 = require('./tc_semantic_runtime_v3_3');
const adapter = require('./tc_semantic_binding_adapter_v3_3');
const ORG = require('./tc_whole_unit_organizational_relation_v3_4');

const RUNTIME_ID = 'STMX_TC_STEP4_SEMANTIC_CARRIER_RUNTIME_V3_4_CANDIDATE';
const STATUS = 'CANDIDATE / SHADOW';
const PKG = path.resolve(__dirname, '..'); const ROOT = path.resolve(PKG, '..', '..', '..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
class BoundInputV34Error extends Error {}

function loadBoundV34() {
  const M = JSON.parse(fs.readFileSync(path.join(PKG, 'BOUND_INPUTS_V3_4.json'), 'utf8')); const got = {};
  for (const b of M.inputs) { const buf = fs.readFileSync(path.join(ROOT, b.path)); if (sha(buf) !== b.sha256) throw new BoundInputV34Error('bound input changed: ' + b.role); got[b.role] = { path: b.path, sha256: b.sha256, buf }; }
  const REF = JSON.parse(got.reference_v2_candidate.buf.toString('utf8'));
  const RSEAL = JSON.parse(got.reference_v2_candidate_seal.buf.toString('utf8')); if (RSEAL.sha256 !== got.reference_v2_candidate.sha256) throw new BoundInputV34Error('Reference V2 candidate ≠ its seal');
  const LEDGER = new Map(JSON.parse(got.step3_predecessor_resolution.buf.toString('utf8')).rows.map((r) => [r.anchor_id, r]));
  const SUCCESSOR = require(path.join(ROOT, got.step3_successor_resolver.path));
  return { REF, referenceSha256: got.reference_v2_candidate.sha256, LEDGER, SUCCESSOR, manifest: M };
}

function runCorpus(options = {}) {
  const authority = options.authority || adapter.loadBound(options);
  const B = options.boundV34 || loadBoundV34();
  const base = v33.runCorpus({ authority });
  const units = adapter.buildUnits(authority);
  const out = base.units.map((u) => {
    const um = (units.find((x) => x.upstream.anchor_id === u.anchor_id) || { members: [] }).members;
    const processRelation = u.transformative ? ORG.computeRelation(u.transformative, um, B.REF, B.referenceSha256) : null;
    const row = B.LEDGER.get(u.anchor_id) || { grammar_state: 'NOT_EVALUATED', grammar_rule: null };
    const shadow = B.SUCCESSOR.resolve({ grammar_rule: row.grammar_rule, grammar_state: row.grammar_state, resolution_status: row.resolution_status, unresolved_category: row.unresolved_category }, { direction: u.direction }, processRelation);
    return Object.assign({}, u, { grammar_transformation_process: processRelation, step3_successor_shadow: shadow });
  });
  return { runtime: RUNTIME_ID, status: STATUS, predecessor_runtime: v33.RUNTIME_ID, units: out };
}

module.exports = { runCorpus, loadBoundV34, RUNTIME_ID, STATUS, BoundInputV34Error };
