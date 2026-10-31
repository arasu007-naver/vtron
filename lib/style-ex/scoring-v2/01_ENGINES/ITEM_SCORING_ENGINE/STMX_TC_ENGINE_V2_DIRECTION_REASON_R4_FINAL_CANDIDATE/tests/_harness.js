'use strict';
/* STMX TC V2 candidate — shared test harness. Tests PRINT only; they never write a file. GT is read ONLY here, ONLY for reporting / comparison after the engine
   decided — never passed to the engine. The canonical representation is read with removal at parse (only anchor_id + final_observations kept). */
const fs = require('fs'), path = require('path');
const PKG = path.resolve(__dirname, '..'); const ISE = path.resolve(PKG, '..'); const ROOT = path.resolve(ISE, '..', '..'); const G = path.join(ROOT, '04_GOVERNANCE_AND_FINAL_DOCS');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const E = require('../src/tc_v2_engine'); const S = require('../src/tc_v2_serializer'); const R = require('../src/tc_v2_resolver'); const DI = require('../src/tc_v2_domain_invariance');
const F = require('../src/tc_v2_frozen_chain'); const V = require('../src/tc_v2_reason_verifier'); const C = require('../src/tc_v2_reason_composer'); const AD = require('../src/tc_v2_vision_adapter'); const B = require('../src/tc_v2_binding');
let GTM = null; function gt() { if (GTM) return GTM; const SU = require(path.join(ROOT, '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS/TOOLS/scoring_units_v1.js'));
  const corpus = fs.readFileSync(path.join(ROOT, '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS/MASTER/STMX_CEO_CALIBRATION_CORPUS.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  GTM = new Map(); for (const r of corpus) for (const u of SU.resolveScoringUnits(r)) { const tc = u.ceo_ground_truth && u.ceo_ground_truth.scores && u.ceo_ground_truth.scores.TC; if (!tc) continue; const n = Number(String(tc).replace(/\D/g, '')); GTM.set(r.identity.ref_id + '#' + String(u.scoring_unit_id).split('#').pop().replace('SU-', 'SU'), { gt: tc, side: n === 5 ? 'TC5' : n < 5 ? 'CLASSIC' : 'TRANSFORMATIVE' }); }
  return GTM; }
const RESEARCH = path.join(G, 'STMX_ITEM_TC_V2_FROZEN_V1_AUDIT_AND_MANDATORY_DIRECTION_GAP_ANALYSIS_V1/_raw/data');
function researchOptionC() { const D = J(path.join(RESEARCH, 't4_decisions.json')); const k = Object.keys(D).find((x) => x.startsWith('C ·')); return new Map(D[k].map((d) => [d.anchor, d.direction])); }
function liveRecords() { const D = path.join(G, 'STMX_ITEM_VISION_V1_3_G53_LIMITED_LIVE_VALIDATION_AND_SR_V2_R3_INTEGRATION_V1/_raw/processed'); if (!fs.existsSync(D)) return [];
  return fs.readdirSync(D).sort().map((f) => { const j = J(path.join(D, f)); const t = j.runProducer_returned.envelope.targets.find((x) => x.eligible && x.record); return { id: f.replace('_producer_output.json', ''), ref: j.ref, record: t.record }; }); }
function canonicalObservations() { const L = fs.readFileSync(path.join(ROOT, '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS/FINAL_REPRESENTATION/CANONICAL_FINAL_REPRESENTATION_V1_2.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean);
  return L.map((l) => { const o = JSON.parse(l); return { anchor_id: o.anchor_id, final_observations: o.final_observations.map((g) => ({ garment_ref: g.garment_ref, observations: g.observations })) }; }); }   /* removal at parse: every other key (incl. GT) dropped */
const LOG = []; let DATA = null;
function ok(id, title, cond, detail) { LOG.push({ id, title, result: cond ? 'PASS' : 'FAIL', detail: detail === undefined ? null : detail }); }
function summary(suite, data) { const pass = LOG.filter((l) => l.result === 'PASS').length; for (const l of LOG) console.log((l.result === 'PASS' ? 'PASS ' : 'FAIL ') + l.id + ' ' + l.title + (l.result === 'PASS' ? '' : ' — ' + JSON.stringify(l.detail).slice(0, 600)));
  console.log(suite + ': ' + pass + '/' + LOG.length); console.log('RESULT_JSON ' + JSON.stringify({ suite, pass, total: LOG.length, log: LOG, data: data || null })); process.exitCode = pass === LOG.length ? 0 : 1; }
const tally = (a, f) => a.reduce((m, x) => { const k = String(f(x)); m[k] = (m[k] || 0) + 1; return m; }, {});
const O = (v) => ({ state: 'OBSERVED', value: v, values: null }), U = { state: 'UNKNOWN', value: null, values: null }, NV = { state: 'NOT_VISIBLE', value: null, values: null };
const disp = (tokens) => { const o = {}; for (const f of AD.OBSERVED_FIELDS) { const t = tokens[f]; o[f] = !t ? 'n/a' : t.state === 'OBSERVED' && t.value != null ? String(t.value) : t.state === 'OBSERVED' && t.values ? t.values.join('+') : '<' + t.state + '>'; } return o; };
/** synthetic unit from a token set (frozen predicates decide its V1 state) */
const synth = (tokens, key, category, extraObserved) => E.unitFromTokens(clone(tokens), key, category, Object.assign(disp(tokens), extraObserved || {}), 'SYNTHETIC');
module.exports = { E, S, R, DI, F, V, C, AD, B, gt, researchOptionC, liveRecords, canonicalObservations, ok, summary, tally, clone, J, O, U, NV, synth, disp, ROOT, PKG, G };
