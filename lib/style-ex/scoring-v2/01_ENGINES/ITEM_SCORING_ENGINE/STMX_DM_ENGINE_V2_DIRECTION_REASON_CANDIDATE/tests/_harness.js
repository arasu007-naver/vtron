'use strict';
/* STMX DM V2 candidate — shared test harness (TEST SIDE ONLY: src never reads anything loaded here).
   Populations: DM 75-case main (A 16 · B 47 · C 12) · BSC-1 77 · guard 220 (75 + live-8 + 135 lattice probes + empty + absent) · live V1_3 records (VLV package,
   stored outputs of the expired G53 exception VLV) · 27-cell lattice. V1 baseline = the FROZEN DM V1 production engine, run read-only. GT / historical records
   are attached AFTER the V2 decision, for comparison only. Previous design = four-axis closure simulation results (stored). */
const fs = require('fs'), path = require('path');
const PKG = path.resolve(__dirname, '..'); const ISE = path.resolve(PKG, '..'); const ROOT = path.resolve(ISE, '..', '..'); const G = path.join(ROOT, '04_GOVERNANCE_AND_FINAL_DOCS');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const E = require('../src/dm_v2_engine'); const S = require('../src/dm_v2_serializer');
const V1 = require(path.join(ISE, 'STMX_DM_ENGINE_V1_FINAL_FREEZE/production/dm_engine_binding_v1.js'));
const SETA = require(path.join(ISE, 'STMX_DM_DIRECTION_STRENGTH_CLOSURE_V2/tests/dm_setA_calibration_authority_v2.js')), SETB = require(path.join(ISE, 'STMX_DM_DIRECTION_FIRST_ENGINE_V1/tests/dm_gt47_direction_fixtures_v1.js')), SETC = require(path.join(ISE, 'STMX_DM_DIRECTION_STRENGTH_CLOSURE_V2/tests/dm_setC_phase1_final_v2.js'));
const BSC = path.join(G, 'STMX_DM_DIRECTION_BSC1_CONTRACT_CORRECTION_FULL_FREEZE_V1'); const CX = require(path.join(BSC, 'tests/dm_bsc1_targeted_corpus_v1.js')); const LIVE8 = require(path.join(ISE, 'STMX_DM_DIRECTION_FIRST_ENGINE_V1/tests/dm_live8_replay_fixtures_v1.js'));
const R15 = new Map(J(path.join(BSC, '15_STMX_DM_75_CASE_FINAL_REPLAY_V1.json')).rows.map((x) => [x.set + '|' + x.case, x]));
const DESIGN = path.join(G, 'STMX_ITEM_V2_FOUR_AXIS_MANDATORY_DIRECTION_REASON_ARCHITECTURE_CLOSURE_V1/_raw/data');
const design = new Map([].concat(J(path.join(DESIGN, 'dm_cases_75.json')), J(path.join(DESIGN, 'dm_cases_bsc77.json')), J(path.join(DESIGN, 'dm_cases_guard220.json'))).map((x) => [x.group + '::' + x.id, x]));
const sideOf = (g) => { const n = g === null || g === undefined ? null : Number(String(g).replace(/\D/g, '')); return n === null || isNaN(n) || !String(g).match(/\d/) ? null : n === 5 ? 'NEUTRAL' : n < 5 ? 'M' : 'D'; };
const o_ = (v) => ({ state: 'OBSERVED', value: v }); const m1r = (c, f) => ({ internal_chromatic_composition: c ? o_(c) : { state: 'UNKNOWN', value: null }, internal_fill_realization: f ? o_(f) : { state: 'UNKNOWN', value: null } });
const gline = fs.readFileSync(path.join(BSC, 'tests/direction_guard_220_bsc1_v1.js'), 'utf8').split('\n').find((l) => /corpus\.push\(\{ set: 'PROBE', case: 'probe-' \+ probe/.test(l));
const mk = new Function('o', 'm1r', 's', 'c', 'sp', 'pair', 'return (' + gline.slice(gline.indexOf('block: ') + 7, gline.lastIndexOf('});')) + ');');
const REALP = [['multi_colour_compound', 'dense_varied'], ['limited_or_uniform', 'uniform_or_sparse'], ['multi_colour_compound', 'uniform_or_sparse'], ['limited_or_uniform', 'dense_varied'], [null, null]];
const ORD = { size: ['small', 'medium', 'large'], contrast: ['low', 'medium', 'high'], spatial: ['localized', 'distributed', 'whole_garment'] };
function v1Of(block) { try { const r = V1.engine.evaluateDm(clone(block)); return r.direction; } catch (e) { return 'V1_ERROR'; } }
function pop75() { return [].concat(SETA.UNITS.map((u) => ['A|' + u.case, u.block]), SETB.UNITS.map((u) => ['B|' + u.case, u.block]), SETC.UNITS.map((u) => ['C|' + u.case, u.block])).map(([id, block]) => ({ group: 'DM_ONLY_75', id, block, gt: (R15.get(id) || {}).gt || null })); }
function pop77() { return CX.UNITS.map((u) => ({ group: 'DM_ONLY_BSC1_77', id: 'BSC1|' + u.id, block: u.block, gt: u.ceo_gt || null })); }
function pop220() { const g = pop75().map((x) => ({ group: 'DM_ONLY_GUARD', id: 'G|' + x.id, block: x.block, gt: null })).concat(LIVE8.load().map((r) => ({ group: 'DM_ONLY_GUARD', id: 'G|LIVE|' + r.case + ' ' + r.nickname, block: r.dm_block, gt: null })));
  let probe = 0; ORD.size.forEach((s) => ORD.contrast.forEach((c) => ORD.spatial.forEach((sp) => REALP.forEach((pair) => { probe++; g.push({ group: 'DM_ONLY_GUARD', id: 'G|PROBE|' + probe + '|' + s + '·' + c + '·' + sp, block: mk(o_, m1r, s, c, sp, pair), gt: null, cell: s + '|' + c + '|' + sp, pair }); }))));
  g.push({ group: 'DM_ONLY_GUARD', id: 'G|PROBE|empty', block: { evidence: [], excluded: [] }, gt: null }); g.push({ group: 'DM_ONLY_GUARD', id: 'G|PROBE|absent', block: undefined, gt: null }); return g; }
/* live V1_3 records (VLV package, stored) — DM GT from the corpus scoring unit (attached after the decision) */
function popLive() { const VLV = path.join(G, 'STMX_ITEM_VISION_V1_3_G53_LIMITED_LIVE_VALIDATION_AND_SR_V2_R3_INTEGRATION_V1/_raw/processed'); if (!fs.existsSync(VLV)) return [];
  const SU = require(path.join(ROOT, '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS/TOOLS/scoring_units_v1.js'));
  const corpus = fs.readFileSync(path.join(ROOT, '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS/MASTER/STMX_CEO_CALIBRATION_CORPUS.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const gtOf = (ref) => { const r = corpus.find((x) => x.identity && x.identity.ref_id === ref); if (!r) return null; const u = SU.resolveScoringUnits(r).find((x) => x.type === 'GARMENT'); return u && u.ceo_ground_truth && u.ceo_ground_truth.scores ? u.ceo_ground_truth.scores.DM : null; };
  return fs.readdirSync(VLV).sort().map((f) => { const j = J(path.join(VLV, f)); const t = j.runProducer_returned.envelope.targets.find((x) => x.eligible && x.record); return { group: 'LIVE_V1_3', id: 'LIVE|slot' + j.slot + '|' + j.ref, ref: j.ref, block: t.record.dm_designed_detail_evidence, category: t.record.category && t.record.category.value, gt: gtOf(j.ref) }; }); }
/* run V2 (decision first) then attach V1 / GT / design (comparison only) */
function run(rows) { return rows.map((x) => { const r = E.evaluate(clone(x.block)); const v1 = v1Of(x.block); const d = design.get(x.group + '::' + x.id);
  return Object.assign({}, x, { result: r, v2: r.ok ? r.customer.direction : null, rule: r.ok ? r.decisive_rule_id : r.rule, reason: r.ok ? r.customer.reason : null, reason_status: r.ok ? r.reason_status : null, v1, v1_side: v1 === 'DETAIL' || v1 === 'D' ? 'D' : v1 === 'MINIMAL' || v1 === 'M' ? 'M' : v1, gt_side: sideOf(x.gt), design: d ? { v2: d.v2, rule: d.rule, reason: d.reason_ko, status: d.status } : null }); }); }
let pass = 0, fail = 0; const log = [];
function ok(id, title, cond, detail) { if (cond) { pass++; log.push({ id, title, result: 'PASS' }); console.log('  PASS  ' + id.padEnd(8) + title); } else { fail++; log.push({ id, title, result: 'FAIL', detail }); console.log('  FAIL  ' + id.padEnd(8) + title + (detail ? '  — ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : '')); } }
function summary(name, data) { console.log('\n' + name + ': ' + pass + ' / ' + (pass + fail) + ' · fail ' + fail); console.log('RESULT_JSON ' + JSON.stringify({ suite: name, pass, fail, total: pass + fail, log, data: data || null })); return fail === 0; }
const tally = (a, f) => a.reduce((m, x) => { const k = String(f(x)); m[k] = (m[k] || 0) + 1; return m; }, {});
module.exports = { E, S, V1, v1Of, pop75, pop77, pop220, popLive, run, ok, summary, tally, clone, sideOf, mk, o_, m1r, REALP, ORD, ROOT, ISE, PKG, design };
