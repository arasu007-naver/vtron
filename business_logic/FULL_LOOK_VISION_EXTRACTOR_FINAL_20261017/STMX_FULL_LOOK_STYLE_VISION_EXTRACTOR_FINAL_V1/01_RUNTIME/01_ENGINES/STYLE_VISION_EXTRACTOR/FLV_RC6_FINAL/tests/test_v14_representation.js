'use strict';
/** V1.4 P3 — CDM-18 MULTI representation comparator (candidate view; sealed evaluator, reference and records untouched). */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { X, C, assert, G, EX02, EX02_RUNS, J, ex02Record } = require('./v14_helpers');
const CMP = require('../validation/cdm18_comparator_v1_4_candidate');
const H = require(path.join(G, 'STMX_FULL_LOOK_STYLE_VISION_PHASE1_REFERENCE_CLOSURE_AND_LIVE_INFERENCE_AUTHORIZATION_DESIGN_V1', '_raw', 's6_phase1_eval_harness_v1.js'));
const REF_P = path.join(G, 'STMX_FULL_LOOK_STYLE_VISION_PROMPT_V1_2_EXPOSURE_THRESHOLD_REMOVAL_AND_FINAL_REFERENCE_RESEAL', '_raw', 'phase1_reference_master_v1_3.json');
const INV = J(path.join(G, 'STMX_FULL_LOOK_STYLE_VISION_CANONICAL_PARAMETER_CLOSURE_AND_LIVE_VALIDATION_DESIGN_V1', '_raw', 'canonical_style_vision_parameter_inventory_candidate_v1_1.json'));
const crit = Object.fromEntries(INV.parameters.filter((p) => p.validation_criticality).map((p) => [p.parameter_id, p.validation_criticality]));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const refFor = (recs) => { const R = J(REF_P); return { ...R, images: R.images.filter((i) => recs.some((r) => r.image_ref === i.image_ref)) }; };
const CORRECT = new Set(['OBSERVED_CORRECT', 'STATE_CORRECT_NON_OBSERVED']);
const miniRef = (key, value) => ({ images: [{ image_ref: 'T', parameter_reference: [{ key, parameter_id: key.split('@')[0], expected_state: 'OBSERVED', expected_value: value }] }] });
const miniRec = (key, value) => ({ image_ref: 'T', parameters: { [key]: { observed_state: 'OBSERVED', observed_value: value } } });
module.exports = [
  { name: 'RP-1 MULTI facts are exactly the Item V1_3 MULTI set restricted to requestable facts (material · surface · decorative_detail · attachment); the comparator never touches any other parameter', fn: () => {
    assert(CMP.MULTI_FACTS.slice().sort().join() === ['attachment', 'decorative_detail', 'material', 'surface'].join(), 'MULTI set = ' + CMP.MULTI_FACTS.join()); assert(/Item Vision V1_3 producer_rules_v1\.js MULTI/.test(CMP.AUTHORITY), 'authority named');
    const n = CMP.normalizeRecord(miniRec('SVP-104@c1', ['Regular']), miniRef('SVP-104@c1', 'Regular')); assert(n.changes.length === 0 && Array.isArray(n.record.parameters['SVP-104@c1'].observed_value), 'fit (single-value fact) is NOT normalised'); } },
  { name: 'RP-2 MULTI single: ["Leather"] vs expected "Leather" → one normalisation, SEMANTICALLY_EQUIVALENT, authority recorded; the original record object is not mutated', fn: () => {
    const rec = miniRec('SVP-124@c1', ['Leather']); const n = CMP.normalizeRecord(rec, miniRef('SVP-124@c1', 'Leather')); assert(n.changes.length === 1 && n.record.parameters['SVP-124@c1'].observed_value === 'Leather' && /SEMANTICALLY_EQUIVALENT/.test(n.changes[0].equivalence), 'normalised'); assert(Array.isArray(rec.parameters['SVP-124@c1'].observed_value), 'original untouched'); } },
  { name: 'RP-3 MULTI multiple: ["Cotton","Wool"] vs expected "Cotton" → NOT normalised, recorded as NOT_EQUIVALENT (cardinality)', fn: () => {
    const n = CMP.normalizeRecord(miniRec('SVP-124@c1', ['Cotton', 'Wool']), miniRef('SVP-124@c1', 'Cotton')); assert(n.record.parameters['SVP-124@c1'].observed_value.length === 2 && n.changes.length === 1 && /NOT_EQUIVALENT/.test(n.changes[0].equivalence), 'cardinality kept'); } },
  { name: 'RP-4 scalar-only and invalid type: a scalar on a MULTI fact against a one-element reference list is wrapped (equivalent); an object value or a non-OBSERVED state is left alone; a cell with no reference entry is left alone', fn: () => {
    const a = CMP.normalizeRecord(miniRec('SVP-126@c1', 'Belt'), miniRef('SVP-126@c1', ['Belt'])); assert(Array.isArray(a.record.parameters['SVP-126@c1'].observed_value) && a.changes.length === 1, 'wrapped');
    const b = CMP.normalizeRecord(miniRec('SVP-124@c1', { bad: 1 }), miniRef('SVP-124@c1', 'Leather')); assert(b.changes.length === 0, 'object untouched');
    const c = CMP.normalizeRecord({ image_ref: 'T', parameters: { 'SVP-124@c1': { observed_state: 'UNKNOWN' } } }, miniRef('SVP-124@c1', 'Leather')); assert(c.changes.length === 0, 'UNKNOWN untouched');
    const d = CMP.normalizeRecord(miniRec('SVP-124@c9', ['Leather']), miniRef('SVP-124@c1', 'Leather')); assert(d.changes.length === 0, 'no reference entry → untouched'); } },
  { name: 'RP-5 sealed-evaluator reproducibility: the comparator\'s ORIGINAL pass on the four EX-02 aligned records reproduces the sealed EX-02 tally exactly (259 correct of 390 reference-expected cells; all-row tally identical to the sealed observation_evaluation.json)', fn: () => {
    const recs = EX02_RUNS.map(([run]) => ex02Record(run)); const out = CMP.compare({ records: recs, reference: refFor(recs), evaluate: H.evaluate, criticality: crit });
    const sealed = J(path.join(EX02, 'manifests', 'observation_evaluation.json')); assert(JSON.stringify(out.original.tally) === JSON.stringify(sealed.extras.after_tally_all_rows), 'all-row tally reproduced: ' + JSON.stringify(out.original.tally));
    const K = new Set(sealed.cells_390.map((c) => c.image + '|' + c.key)); const corr = out.original.rows.filter((r) => K.has(r.image_ref + '|' + r.key) && CORRECT.has(r.outcome)).length; assert(corr === 259, '390-cell correct = ' + corr); } },
  { name: 'RP-6 candidate view on the EX-02 records: exactly 13 cells change, all 13 are MULTI one-element lists vs scalar references, all improve, none worsens; exactly one cardinality case (F390 c6 material ["Other","Leather"] vs "Other") is reported and NOT normalised; 390-cell candidate correct = 272; the sealed rows are returned unchanged alongside and labelled', fn: () => {
    const recs = EX02_RUNS.map(([run]) => ex02Record(run)); const out = CMP.compare({ records: recs, reference: refFor(recs), evaluate: H.evaluate, criticality: crit });
    assert(out.summary.cells_changed === 13 && out.summary.cells_improved === 13 && out.summary.cells_worsened === 0 && out.summary.cardinality_not_normalised === 1, 'summary ' + JSON.stringify(out.summary));
    const card = out.normalisations.filter((n) => /NOT_EQUIVALENT/.test(n.equivalence)); assert(card.length === 1 && card[0].image_ref === 'F390' && card[0].key === 'SVP-124@c6' && JSON.stringify(card[0].from) === '["Other","Leather"]', 'cardinality case identified and left as WRONG_VALUE');
    const changed = out.matrix.filter((m) => m.original_verdict !== m.candidate_verdict); assert(changed.length === 13 && changed.every((m) => ['SVP-123', 'SVP-124', 'SVP-125', 'SVP-126'].includes(m.parameter_id) && /array\[1\]/.test(m.actual_representation) && /^string/.test(m.expected_representation) && m.ceo_cdm18_approval_still_required === true), 'every changed cell is a MULTI singleton vs scalar and still needs CDM-18');
    const same = out.matrix.filter((m) => m.original_verdict === m.candidate_verdict); assert(out.matrix.length === 16 && same.length === 3, 'matrix = 13 improved + 3 unchanged (' + out.matrix.length + ' / ' + same.length + ')');
    assert(same.some((m) => m.key === 'SVP-124@c6' && m.image_ref === 'F390' && /array\[2\]/.test(m.actual_representation)), 'the cardinality row is reported with an unchanged verdict');
    assert(same.filter((m) => /array\[1\]/.test(m.actual_representation)).length === 2 && same.every((m) => m.candidate_verdict === 'WRONG_VALUE'), 'two singleton cells stay WRONG_VALUE because the VALUE differs (M269 c9 Leather ≠ Other · F298 c1 attachment Other ≠ Belt): normalisation never rescues a real error');
    const sealed = J(path.join(EX02, 'manifests', 'observation_evaluation.json')); const K = new Set(sealed.cells_390.map((c) => c.image + '|' + c.key)); const corr = out.candidate.rows.filter((r) => K.has(r.image_ref + '|' + r.key) && CORRECT.has(r.outcome)).length; assert(corr === 272, 'candidate 390-cell correct = ' + corr); assert(/not the sealed score/.test(out.candidate.label), 'labelled'); } },
  { name: 'RP-7 nothing on disk is touched by the comparator: EX-02 run records, reference v1_3 and the sealed evaluator hash are identical before and after', fn: () => {
    const files = EX02_RUNS.map(([run]) => path.join(EX02, 'evaluation', run, 'run_record_aligned.json')).concat([REF_P, path.join(__dirname, '..', 'validation', 'evaluate_run.js')]); const before = files.map((f) => sha(fs.readFileSync(f)));
    const recs = EX02_RUNS.map(([run]) => ex02Record(run)); CMP.compare({ records: recs, reference: refFor(recs), evaluate: H.evaluate, criticality: crit }); const after = files.map((f) => sha(fs.readFileSync(f))); assert(before.join() === after.join(), 'untouched'); assert(before[4].startsWith('82adeb1b'), 'reference v1_3 identity'); } },
];
