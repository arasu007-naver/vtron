'use strict';
/** V1.4 test helpers: minimal 8a-shaped model outputs built in code (no fixture edited), full-demand pipeline, EX-01 / EX-02 stored outputs (read-only). */
const fs = require('fs'); const path = require('path');
const { X, assert } = require('./helpers'); const C = X.contracts;
const G = path.join(C.ROOT, '04_GOVERNANCE_AND_FINAL_DOCS');
const EX01 = path.join(G, 'STMX_FULL_LOOK_VISION_CEO_APPROVED_4_IMAGE_LIVE_API_EXECUTION_AND_EVIDENCE_REVIEW_V1', '_raw');
const EX02 = path.join(G, 'STMX_FULL_LOOK_VISION_V1_3_EX02_LIVE_EXECUTION_RESULTS_V1', '_raw');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const EX02_RUNS = [['RUN-EX02-0001', 'F147'], ['RUN-EX02-0002', 'M269'], ['RUN-EX02-0003', 'F298'], ['RUN-EX02-0004', 'F390']];
const ex02Output = (run) => J(path.join(EX02, 'evaluation', run, 'model_output.json'));
const ex02Text = (run) => fs.readFileSync(path.join(EX02, 'evaluation', run, 'model_text.txt'), 'utf8');
const ex02Packet13 = (run) => J(path.join(EX02, 'evaluation', run, 'packet.json'));
const ex02Record = (run) => J(path.join(EX02, 'evaluation', run, 'run_record_aligned.json'));
const ex01Output = (run) => J(path.join(EX01, 'parsed', run + '.model_output.json'));
/** minimal valid 8a output: one coat c1 (+ optional extra objects / facts / relations) */
function mo(o) {
  const base = { frame: { state: 'OBSERVED', limits: [] }, objects: [{ ref: 'c1', identity: 'Coat', participates: true }], front_state: { c1: { value: 'fastened', state: 'OBSERVED' } }, layer_relations: [], securing_relations: [], colour_areas: [{ carrier: 'c1', family: 'brown', lightness: 'normal', effect: 'none', role: 'field' }], upper: { governing_ref: 'c1', relation: { value: 'Oversized', state: 'OBSERVED' }, shoulder: { value: 'Strong', state: 'OBSERVED' }, shape: { value: 'Structured', state: 'OBSERVED' } }, exposure_supplement: [], facts: { c1: { material: ['Leather'], fit: 'Oversized', pocket: 'None', pattern: 'ABSENT', graphic: 'ABSENT', surface: 'ABSENT', decorative_detail: 'ABSENT', attachment: 'ABSENT', asymmetry: 'None', length: 'Knee Length', sleeve: 'Long', shoulder_drop: 'None', shoulder_structure: 'Strong', collar: 'Shirt', front_opening_extent: 'Full', closure_type: 'Zipper', grammar: 'Casual', waist_definition: 'Undefined', sleeve_volume: 'Regular' } } };
  const out = JSON.parse(JSON.stringify(base)); for (const [k, v] of Object.entries(o || {})) { if (k === 'facts' || k === 'front_state') out[k] = { ...out[k], ...v }; else out[k] = v; } return out;
}
function pipeline(obj) { const cv = X.transport.convertModelOutput(JSON.parse(JSON.stringify(obj))); const r = X.extract({ provider: new X.providers.FixtureProvider(cv.case), gateAuthority: new X.routers.GateAuthority() }); return { cv, ...r }; }
const pool = (r, ref) => r.packet.component_fact_pool.filter((f) => f.component_ref === ref);
const poolFact = (r, ref, fact) => pool(r, ref).find((f) => f.fact === fact);
const reg = (r, ref) => r.packet.component_registry.find((e) => e.component_ref === ref);
module.exports = { X, C, assert, G, EX01, EX02, EX02_RUNS, J, ex02Output, ex02Text, ex02Packet13, ex02Record, ex01Output, mo, pipeline, pool, poolFact, reg };
