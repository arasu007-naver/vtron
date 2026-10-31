'use strict';
/* STMX SR V2 candidate — shared test harness. Builds the governed product population from the CEO calibration corpus with the
   corpus's own scoring-unit tool; attaches identity, eligibility metadata (registry — test-side only), historical GT (test-side only,
   attached AFTER the engine has decided) and the frozen V1 result (diagnostic). REF / GT never enter the engine. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const PKG = path.resolve(__dirname, '..'); const ISE = path.resolve(PKG, '..'); const ROOT = path.resolve(ISE, '..', '..');
const CORPUS = path.join(ROOT, '02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CEO_CALIBRATION_CORPUS');
const E = require('../src/sr_v2_engine');
const SU = require(path.join(CORPUS, 'TOOLS/scoring_units_v1.js'));
const V1 = require(path.join(ISE, 'STMX_SR_ENGINE_V1_FINAL_FREEZE/src/sr_engine_v1_final.js'));            // frozen V1 — diagnostic comparison only
const ELIG = JSON.parse(fs.readFileSync(V1.binding.ELIGIBILITY_REGISTRY, 'utf8')); const elig = {}; ELIG.units.forEach((u) => { elig[u.scoring_unit_id] = u.sr_evidence_eligibility; });
const DIRECT = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, '04_GOVERNANCE_AND_FINAL_DOCS/STMX_SR_ENGINE_FINAL_FREEZE_V1/02_STMX_SR_DIRECT_CEO_ORDINAL_AUTHORITY_FINAL_V1.json'), 'utf8')).rows.map((r) => [r.canonical_unit_id, r]));
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
/* R3: CEO versioned overlay (CEO R3 order 2026-10-27 §1) — applied HERE, in the test / regression layer only; src/ never reads it. Pinned by sha256.
   observation_overlays correct an input observation (the frozen corpus record is not changed); direction_overlays_audit_only give the current CEO
   Direction for audit comparison and never reach the engine. population({ overlay: false }) reproduces the un-corrected input. */
const OVERLAY_FILE = path.join(ROOT, '04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SR_V2_FINAL_EVIDENCE_AND_SCORING_CORRECTION_R3/CEO_OVERLAY/STMX_ITEM_SR_V2_R3_CEO_OVERLAY_V1.json');
const OVERLAY_SHA256 = '9cf546502baa1e797fda1f224bcabb2d21edc015680e1855109748ff7ad6235d';
function overlay() { const b = fs.readFileSync(OVERLAY_FILE); if (crypto.createHash('sha256').update(b).digest('hex') !== OVERLAY_SHA256) throw new Error('CEO overlay drift — pinned hash mismatch'); return JSON.parse(b.toString('utf8')); }
const sha = (s) => crypto.createHash('sha256').update(typeof s === 'string' ? s : JSON.stringify(s)).digest('hex');
let pass = 0, fail = 0; const log = [];
function ok(id, title, cond, detail) { if (cond) { pass++; log.push({ id, title, result: 'PASS' }); console.log('  PASS  ' + id.padEnd(9) + title); } else { fail++; log.push({ id, title, result: 'FAIL', detail }); console.log('  FAIL  ' + id.padEnd(9) + title + (detail ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : '')); } }
function summary(name) { console.log('\n' + name + ': ' + pass + ' / ' + (pass + fail) + ' · fail ' + fail); return { name, pass, fail, total: pass + fail, log }; }
function corpus() { return fs.readFileSync(path.join(CORPUS, 'MASTER/STMX_CEO_CALIBRATION_CORPUS.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); }
function targetsOf(r) { const ex = (r.raw_vision && r.raw_vision.extractions) || []; const e = ex.slice().reverse().find((x) => (x.envelope && x.envelope.targets) || (x.raw_envelope && x.raw_envelope.targets)); if (!e) return []; return ((e.envelope && e.envelope.targets) || (e.raw_envelope && e.raw_envelope.targets) || []); }
const sideOf = (g) => { const n = g ? Number(String(g).replace(/\D/g, '')) : null; return n === null || isNaN(n) ? null : n === 5 ? 'NEUTRAL' : n < 5 ? 'RELAXED' : 'STRUCTURED'; };
/** the 123 governed product records (identity = corpus record # scoring unit / target) */
function population(opts) {
  const useOverlay = !(opts && opts.overlay === false); const OV = overlay(); const applied = [];
  const obsFix = (r, t, rec0) => { if (!useOverlay) return rec0; OV.observation_overlays.filter((o) => o.corpus_record_id === r.corpus_record_id && o.target_id === t.target_id).forEach((o) => { const n = rec0.observations[o.parameter]; if (!n || n.state !== 'OBSERVED' || n.value !== o.from) throw new Error('overlay ' + o.id + ': record value ' + JSON.stringify(n && n.value) + ' ≠ from ' + o.from); n.value = o.to; applied.push({ id: o.id, product: r.corpus_record_id + '/' + t.target_id, parameter: o.parameter, from: o.from, to: o.to }); }); return rec0; };
  const dirOv = new Map(OV.direction_overlays_audit_only.map((d) => [d.scoring_unit_id, d]));
  const P = []; const units = []; const usedTargets = new Set();
  corpus().forEach((r) => { const T = targetsOf(r); const byId = {}; T.forEach((t) => { byId[t.target_id] = t; }); const roster = (r.canonical_observation && r.canonical_observation.garments) || [];
    SU.resolveScoringUnits(r).forEach((u) => { const unitId = r.corpus_record_id + '#' + u.scoring_unit_id.split('#').pop(); const members = u.member_garment_refs || []; let targets = [];
      if (members.length) targets = members.map((m) => byId[m]).filter(Boolean);
      if (!targets.length) { const prim = roster.find((g) => g.scoring_role === 'Primary') || roster[0]; const t = prim ? byId[prim.garment_ref] : null; if (t) targets = [t]; else { const p = T.find((x) => x.role === 'Primary' && x.eligible !== false) || T.find((x) => x.eligible !== false) || T[0]; if (p) targets = [p]; } }
      const d = DIRECT.get(unitId); const gtStored = ((u.ceo_ground_truth && u.ceo_ground_truth.scores) || {}).SR || null; const gt = d ? d.ceo_sr : gtStored;
      units.push({ unitId, type: u.type, members: targets.length });
      targets.forEach((t) => { usedTargets.add(r.corpus_record_id + '|' + t.target_id); P.push({ product: unitId + '/' + t.target_id, corpus_record_id: r.corpus_record_id, scoring_unit_id: unitId, target_id: t.target_id, ref: r.identity && r.identity.ref_id, image_sha256: r.identity && r.identity.source_image_hash || null, unit_type: u.type, meta: { sr_evidence_eligibility: elig[unitId] || 'UNRESOLVED' }, record: obsFix(r, t, clone(t.record)), gt: u.type === 'GARMENT' ? gt : null, gt_set_level: u.type === 'MATCHING_PAIR' ? gt : null, gt_source: d ? 'DIRECT_CEO' : 'STORED', gt_side: u.type === 'GARMENT' ? sideOf(gt) : null,
        gt_current_side: u.type === 'GARMENT' ? (dirOv.has(unitId) ? dirOv.get(unitId).current_ceo_direction : sideOf(gt)) : null, gt_current_source: dirOv.has(unitId) ? 'CEO_R3_OVERLAY ' + dirOv.get(unitId).id : (d ? 'DIRECT_CEO' : 'STORED') }); }); }); });
  return { products: P, units, usedTargets, overlay_applied: applied, overlay_sha256: OVERLAY_SHA256 };
}
/** real target records in the corpus that are NOT scored products (no product GT) — the only real holdout material */
function unusedTargets(usedTargets) { const out = []; corpus().forEach((r) => { targetsOf(r).forEach((t) => { const k = r.corpus_record_id + '|' + t.target_id; if (!usedTargets.has(k) && t.record && t.record.observations) out.push({ corpus_record_id: r.corpus_record_id, target_id: t.target_id, ref: r.identity && r.identity.ref_id, record: clone(t.record) }); }); }); return out; }
/** build a Producer-shaped record from a compact tuple (synthetic tests only; omitted keys stay omitted) */
function rec(category, t) { const o = {}; const put = (k, v) => { if (v === undefined) return; if (v && typeof v === 'object' && (v.state || v.byRegion)) o[k] = v; else o[k] = { state: 'OBSERVED', value: v }; };
  put('fit', t.fit); put('sleeve_volume', t.sleeve_volume); put('fabric_behavior', t.fabric); put('shoulder_structure', t.shoulder); put('shoulder_drop', t.drop); put('waist_definition', t.waist); put('length', t.length); put('silhouette', t.silhouette);
  if (t.material) o.material = { state: 'OBSERVED', value: null, values: [].concat(t.material).map((v) => ({ value: v })) }; if (t.surface) o.surface = { state: 'OBSERVED', value: null, values: [].concat(t.surface).map((v) => ({ value: v })) };
  return { category: { value: category }, observations: o }; }
const UNKNOWN = { state: 'UNKNOWN', value: null }, NOT_VISIBLE = { state: 'NOT_VISIBLE', value: null };
const byRegion = (upper, lower) => ({ state: 'OBSERVED', value: null, byRegion: { upper: upper && typeof upper === 'object' ? upper : { state: 'OBSERVED', value: upper }, lower: lower && typeof lower === 'object' ? lower : { state: 'OBSERVED', value: lower } } });
function runV1(p) { try { return V1.evaluateSR(clone(p.record), clone(p.meta)); } catch (e) { return { direction: 'V1_ERROR', error: e.message }; } }
module.exports = { ok, summary, corpus, targetsOf, population, overlay, OVERLAY_SHA256, unusedTargets, rec, byRegion, UNKNOWN, NOT_VISIBLE, runV1, sideOf, clone, sha, E, V1, ROOT, ISE, PKG, CORPUS, DIRECT, elig, results: () => ({ pass, fail }) };
