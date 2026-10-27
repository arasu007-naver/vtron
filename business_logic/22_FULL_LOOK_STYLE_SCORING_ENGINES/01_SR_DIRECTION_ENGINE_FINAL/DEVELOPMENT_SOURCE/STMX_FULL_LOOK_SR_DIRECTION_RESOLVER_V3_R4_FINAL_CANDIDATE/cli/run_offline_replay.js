'use strict';
/**
 * OFFLINE REPLAY RUNNER (V3_R4) — the same 43 sealed Full-Look packets as SR V1 / V2 / V3 / V3_R1 / V3_R2 / V3_R3. [R4] copy of the R3 runner: module
 * paths, ledger name and an R3 history column (sealed R3 ledger) only.
 *   node cli/run_offline_replay.js [outDir]        (default outDir = ../validation)
 * Per look: LANE A (SR V2 governed) · MODE A (frozen packet) · MODE B (MODE A input + ECC_V3 row, validation only) — never merged.
 * The sealed V3 / R1 / R2 ledgers (verified against their own manifests) are read for the V2 → V3 → R1 → R2 → R3 history. CEO anchors are joined AFTER prediction.
 * Writes <outDir>/sr_v3_r4_regression_ledger.json. 0 API calls.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const R = require('../src/fl_sr_direction_resolver_v3_r4.js'); const A = require('../src/fl_sr_authority_v3_r4.js');
const ROOT = A.ROOT; const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'validation')); fs.mkdirSync(OUT, { recursive: true });
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const REL = '01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/'; const CV2P = '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_DM_43_CASE_VISION_COMPLETION_AND_CSTAR_REVALIDATION_V2/';
const FDR = '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_DIRECTION_ARCHITECTURE_CEO_ADJUDICATION_INTEGRATION_FINAL_DESIGN_REVIEW_V1/';
const SUMS = Object.fromEntries(fs.readFileSync(ROOT + REL + 'SHA256SUMS.txt', 'utf8').trim().split('\n').map((l) => { const i = l.indexOf('  '); return [l.slice(i + 2).trim(), l.slice(0, i)]; }));
const CVM = J(ROOT + CV2P + 'PACKAGE_MANIFEST.json'); const cvSha = Object.fromEntries(CVM.files.map((f) => [f.path, f.sha256]));
const FDRM = J(ROOT + FDR + 'PACKAGE_MANIFEST.json'); const regRel = '02_CEO_ADJUDICATION_MASTER_REGISTER.json'; const regEntry = FDRM.files.find((f) => f.path === regRel);
if (!regEntry || regEntry.sha256 !== sha(ROOT + FDR + regRel)) throw new Error('CEO adjudication register changed');
const GT = {}; for (const a of J(ROOT + FDR + regRel).adjudications) if (a.axis === 'SR' && /^(RELAXED|STRUCTURED)$/.test(a.ceo)) GT[a.case] = a.ceo;
const ECCP = path.join(__dirname, '..', 'evidence_corrections', 'ECC_V3_CANDIDATE.json'); const ECC = J(ECCP); const eccBy = Object.fromEntries(ECC.rows.map((r) => [r.packet_sha256, r]));
// sealed predecessor ledgers (each verified against its own manifest)
const E = ROOT + '01_ENGINES/STYLE_SCORING_ENGINE/'; const hist = (dir, file) => { const M = J(E + dir + '/PACKAGE_MANIFEST.json'); const rel = 'validation/' + file; if (M.files.find((f) => f.path === rel).sha256 !== sha(E + dir + '/' + rel)) throw new Error('ledger changed ' + dir); return Object.fromEntries(J(E + dir + '/' + rel).rows.map((r) => [r.case_id, r])); };
const V3L = hist('STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_CANDIDATE', 'sr_v3_regression_ledger.json'), R1L = hist('STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R1_CLOSURE_CANDIDATE', 'sr_v3_r1_regression_ledger.json'), R2L = hist('STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R2_CG1_FINAL_CANDIDATE', 'sr_v3_r2_regression_ledger.json'), R3L = hist('STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R3_FINAL_CANDIDATE', 'sr_v3_r3_regression_ledger.json');
const SI = J(ROOT + REL + '04_SAMPLES/SAMPLE_INDEX.json');
const cases = SI.samples.map((s) => ({ id: s.image, cohort: 'release_12', dir: REL + '04_SAMPLES/expected_outputs/' + s.image + '/', sealed: (f) => SUMS['04_SAMPLES/expected_outputs/' + s.image + '/' + f] }))
  .concat(fs.readdirSync(ROOT + CV2P + '04_VISION_OUTPUTS/04_SAMPLES/expected_outputs').sort().map((id) => ({ id, cohort: 'cv2_31', dir: CV2P + '04_VISION_OUTPUTS/04_SAMPLES/expected_outputs/' + id + '/', sealed: (f) => cvSha['04_VISION_OUTPUTS/04_SAMPLES/expected_outputs/' + id + '/' + f] })));
const S = (o) => JSON.stringify(o); const lab = (o) => (o.status === 'RESOLVED' ? o.direction : o.status === 'TECHNICAL_EXCEPTION' ? 'EXC:' + o.exception.code : 'UNRESOLVED:' + (o.lane_a_category || ''));
const rows = cases.map((c) => {
  const pf = ROOT + c.dir + 'packet.json', rf = ROOT + c.dir + 'run_record.json'; const ph = sha(pf), rh = sha(rf);
  const input = { packet: J(pf), run_record: J(rf) }; const ecc = eccBy[ph] || null; const fresh = (x) => JSON.parse(JSON.stringify(x));
  const a = R.resolveSR(input, { lane: 'A' }), ma = R.resolveSR(input, { lane: 'B' }), mb = R.resolveSR(input, { lane: 'B', correction: ecc });
  const det = S(a) === S(R.resolveSR(fresh(input), { lane: 'A' })) && S(ma) === S(R.resolveSR(fresh(input), { lane: 'B' })) && S(mb) === S(R.resolveSR(fresh(input), { lane: 'B', correction: ecc }));
  const gt = GT[c.id] || null; const cmp = (o) => (!gt ? 'NO_CEO_GT' : o.status !== 'RESOLVED' ? 'GT_NOT_RESOLVED' : o.direction === gt ? 'MATCH' : 'CONFLICT');
  const m = (o) => ({ label: lab(o), rule: o.rule || null, direction: o.direction, status: o.status, input_failure: o.exception ? o.exception.code : null, evidence_used: o.basis ? o.basis.evidence_used : [], missing_observations: o.basis ? o.basis.missing_observations : [], sensitivity: o.basis ? o.basis.sensitivity : null, sensitive_to: o.basis ? o.basis.sensitive_to : [], possible_outcomes_if_observed: o.basis ? o.basis.possible_outcomes_if_observed : [] });
  return { case_id: c.id, cohort: c.cohort, packet_sha256: ph, run_record_sha256: rh, seals_ok: c.sealed('packet.json') === ph && c.sealed('run_record.json') === rh,
    ecc_v3_applied: ecc ? ecc.diff.map((d) => d.field + ' ' + JSON.stringify(d.frozen) + '→' + JSON.stringify(d.corrected) + ' [' + d.ecc_class + ']') : [],
    history_mode_a: { v2_lane_a: lab(a), v3: V3L[c.id].lane_b_frozen.label, r1: R1L[c.id].mode_a.label, r2: R2L[c.id].mode_a.label, r3: R3L[c.id].mode_a.label, r4: lab(ma) },
    history_mode_b: { v3: V3L[c.id].lane_b_corrected.label, r1: R1L[c.id].mode_b.label, r2: R2L[c.id].mode_b.label, r3: R3L[c.id].mode_b.label, r4: lab(mb) },
    lane_a: { label: lab(a), rule: a.rule, category: a.lane_a_category }, mode_a: m(ma), mode_b: m(mb),
    ceo_gt: gt, gt_lane_a: cmp(a), gt_mode_a: cmp(ma), gt_mode_b: cmp(mb), deterministic: det, trace_mode_a: ma.trace, trace_mode_b: mb.trace };
});
const dist = (k) => rows.reduce((m, r) => { const d = k(r); m[d] = (m[d] || 0) + 1; return m; }, {});
const gtSum = (k) => { const g = rows.filter((r) => r.ceo_gt); return { cases: g.length, resolved: g.filter((r) => r[k] === 'MATCH' || r[k] === 'CONFLICT').length, correct: g.filter((r) => r[k] === 'MATCH').length, incorrect: g.filter((r) => r[k] === 'CONFLICT').length, not_resolved: g.filter((r) => r[k] === 'GT_NOT_RESOLVED').length }; };
const scor = (k) => { const s = rows.filter((r) => !r[k].input_failure); return { scorable: s.length, input_failures: rows.length - s.length, structured: s.filter((r) => r[k].direction === 'STRUCTURED').length, relaxed: s.filter((r) => r[k].direction === 'RELAXED').length, unresolved_or_unknown: s.filter((r) => r[k].status !== 'RESOLVED').length, with_missing_observations: s.filter((r) => r[k].missing_observations.length).length, sensitivity_possible: s.filter((r) => r[k].sensitivity === 'POSSIBLE').length }; };
const neutral = rows.filter((r) => [r.lane_a, r.mode_a, r.mode_b].some((x) => /NEUTRAL/.test(x.label))).length;
const out = { document: 'STMX Full-Look SR Resolver V3_R4 — 43-case offline ledger (Lane A governed · MODE A frozen · MODE B ECC_V3 validation overlay)', at: new Date().toISOString(), resolver: A.RESOLVER_ID, live_api_calls: 0,
  ecc: { path: 'evidence_corrections/ECC_V3_CANDIDATE.json', sha256: sha(ECCP), status: 'NON-FROZEN CANDIDATE, NOT APPROVED (validation only)' },
  summary: { mode_a: scor('mode_a'), mode_b: scor('mode_b'), labels: { lane_a: dist((r) => r.lane_a.label), mode_a: dist((r) => r.mode_a.label), mode_b: dist((r) => r.mode_b.label) }, rules_mode_a: dist((r) => r.mode_a.rule || r.mode_a.label), ceo_gt: { lane_a: gtSum('gt_lane_a'), mode_a: gtSum('gt_mode_a'), mode_b: gtSum('gt_mode_b') }, neutral_rows: neutral, seals_ok: rows.every((r) => r.seals_ok), deterministic: rows.every((r) => r.deterministic) },
  rows };
fs.writeFileSync(path.join(OUT, 'sr_v3_r4_regression_ledger.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary, null, 1));
