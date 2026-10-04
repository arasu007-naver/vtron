'use strict';
/* shared test harness — fixtures are built here so tests never hand-write Producer records inconsistently */
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CORPUS = path.join(ROOT, '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS');
const E = require('../src/sr_engine_v1');

let pass = 0, fail = 0; const log = [];
function ok(id, title, cond, detail) { if (cond) { pass++; log.push({ id, title, result: 'PASS' }); console.log('  PASS  ' + id.padEnd(8) + title); } else { fail++; log.push({ id, title, result: 'FAIL', detail }); console.log('  FAIL  ' + id.padEnd(8) + title + (detail ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
function summary(name) { console.log('\n' + name + ': ' + pass + ' / ' + (pass + fail) + ' · fail ' + fail); return { name, pass, fail, total: pass + fail, log }; }

/** build a Producer-shaped record from a compact tuple; omitted keys stay omitted (carrier absence ≠ None) */
function rec(category, t) {
  const o = {};
  const put = (k, v) => { if (v === undefined) return; if (v && typeof v === 'object' && v.state) o[k] = v; else o[k] = { state: 'OBSERVED', value: v }; };
  put('fit', t.fit); put('fabric_behavior', t.fabric); put('shoulder_structure', t.shoulder); put('shoulder_drop', t.drop); put('waist_definition', t.waist); put('length', t.length); put('silhouette', t.silhouette);
  return { category, observations: o };
}
const UNKNOWN = { state: 'UNKNOWN', value: null }, NOT_VISIBLE = { state: 'NOT_VISIBLE', value: null };

/** corpus access for control tests — REF identity is used here ONLY to select fixtures, never inside the engine */
function corpus() { return fs.readFileSync(path.join(CORPUS, 'MASTER/STMX_CEO_CALIBRATION_CORPUS.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)); }
/* the governed envelope: `envelope.targets` (Batch 001 / 003+) or `raw_envelope.targets` (Batch 002 layout) — always the LAST extraction */
function targetsOf(r) { const ex = (r.raw_vision && r.raw_vision.extractions) || []; const e = ex.slice().reverse().find(x => (x.envelope && x.envelope.targets) || (x.raw_envelope && x.raw_envelope.targets)); if (!e) return []; return ((e.envelope && e.envelope.targets) || (e.raw_envelope && e.raw_envelope.targets) || []); }
function primaryRecord(r) {
  const T = targetsOf(r);
  const roster = (r.canonical_observation && r.canonical_observation.garments) || [];
  const prim = roster.find(g => g.scoring_role === 'Primary') || roster[0];
  const t = prim ? T.find(x => x.target_id === prim.garment_ref) : (T.find(x => x.role === 'Primary' && x.eligible !== false) || T.find(x => x.eligible !== false) || T[0]);
  return t ? t.record : null;
}
function gtOf(r) { const SU = require(path.join(CORPUS, 'TOOLS/scoring_units_v1.js')); const u = SU.resolveScoringUnits(r); return u.map(x => ({ unit: x.scoring_unit_id, type: x.type, members: x.member_garment_refs || [], sr: ((x.ceo_ground_truth && x.ceo_ground_truth.scores) || {}).SR || null })); }

module.exports = { ok, summary, rec, UNKNOWN, NOT_VISIBLE, corpus, targetsOf, primaryRecord, gtOf, E, ROOT, CORPUS, results: () => ({ pass, fail }) };
