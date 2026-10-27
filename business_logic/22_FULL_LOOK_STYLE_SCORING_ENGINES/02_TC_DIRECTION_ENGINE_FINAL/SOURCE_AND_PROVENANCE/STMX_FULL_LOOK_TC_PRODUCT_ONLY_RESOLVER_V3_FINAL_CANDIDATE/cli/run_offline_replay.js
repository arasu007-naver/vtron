'use strict';
/**
 * OFFLINE REPLAY RUNNER (V3) — the same 43 frozen Full-Look packets as V1 / V2 (12 release samples + 31 DM-validation packets).
 *   node cli/run_offline_replay.js [outDir]        (default outDir = ../validation)
 * 1. dataset identity: every packet / run_record is hash-checked against its sealed manifest (release SHA256SUMS.txt · CV2 PACKAGE_MANIFEST.json).
 * 2. resolveTC() (V3) on every look, twice (determinism).
 * 3. row-by-row comparison with the V1 and V2 candidate ledgers (each hash-checked against its own PACKAGE_MANIFEST); every V2 → V3 change is classified
 *    INTENDED_CORRECTION | SEMANTIC_REGRESSION | TECHNICAL_REGRESSION | KNOWN_LIMITATION; the product stage must be identical to V2 on every look.
 * 4. reference join AFTER prediction: reference master v1_3 (governed human readings) — availability / provenance only. No Full-Look TC CEO GT exists,
 *    so accuracy is not computed. The look id is used only as the ledger key — never by the resolver.
 * Writes <outDir>/tc_regression_ledger.json. 0 API calls.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const R = require('../src/fl_tc_direction_resolver_v3.js'); const A = require('../src/fl_tc_authority_v3.js');
const ROOT = A.ROOT; const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'validation')); fs.mkdirSync(OUT, { recursive: true });
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const REL = '01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/'; const CV2P = '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_DM_43_CASE_VISION_COMPLETION_AND_CSTAR_REVALIDATION_V2/';
const V1C = '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_DIRECTION_RESOLVER_V1_CANDIDATE/'; const V2C = '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V2_CANDIDATE/';
const REFP = '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_STYLE_VISION_PROMPT_V1_2_EXPOSURE_THRESHOLD_REMOVAL_AND_FINAL_REFERENCE_RESEAL/_raw/phase1_reference_master_v1_3.json';
const SUMS = Object.fromEntries(fs.readFileSync(ROOT + REL + 'SHA256SUMS.txt', 'utf8').trim().split('\n').map((l) => { const i = l.indexOf('  '); return [l.slice(i + 2).trim(), l.slice(0, i)]; }));
const CVM = J(ROOT + CV2P + 'PACKAGE_MANIFEST.json'); const cvSha = Object.fromEntries(CVM.files.map((f) => [f.path, f.sha256]));
const ledgerOf = (dir) => { const M = J(ROOT + dir + 'PACKAGE_MANIFEST.json'); const rel = 'validation/tc_regression_ledger.json'; const e = M.files.find((f) => f.path === rel); if (!e || e.sha256 !== sha(ROOT + dir + rel)) throw new Error('candidate ledger changed: ' + dir + rel); return { path: dir + rel, sha256: e.sha256, rows: Object.fromEntries(J(ROOT + dir + rel).rows.map((r) => [r.case_id, r])) }; };
const V1 = ledgerOf(V1C), V2 = ledgerOf(V2C);
const REF = J(ROOT + REFP); const REFI = Object.fromEntries(REF.images.map((im) => [im.image_ref, im]));
const SI = J(ROOT + REL + '04_SAMPLES/SAMPLE_INDEX.json');
const cases = SI.samples.map((s) => ({ id: s.image, cohort: 'release_12', dir: REL + '04_SAMPLES/expected_outputs/' + s.image + '/', sealedBy: 'release SHA256SUMS.txt', sealed: (f) => SUMS['04_SAMPLES/expected_outputs/' + s.image + '/' + f] }))
  .concat(fs.readdirSync(ROOT + CV2P + '04_VISION_OUTPUTS/04_SAMPLES/expected_outputs').sort().map((id) => ({ id, cohort: 'cv2_31', dir: CV2P + '04_VISION_OUTPUTS/04_SAMPLES/expected_outputs/' + id + '/', sealedBy: 'CV2 PACKAGE_MANIFEST.json', sealed: (f) => cvSha['04_VISION_OUTPUTS/04_SAMPLES/expected_outputs/' + id + '/' + f] })));
const ids = cases.map((c) => c.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
const strip = (o) => JSON.stringify(o, (k, v) => (k === 'authority_provenance' ? undefined : v));
const label = (o) => (o.status === 'RESOLVED' ? o.direction : 'INPUT_FAILURE');
const v2label = (r) => (r.new_result.direction === 'DIRECTION_UNRESOLVED' ? 'UNRESOLVED' : r.new_result.direction);
/** classify the V2 → V3 change of one look */
function classify(v2, o) {
  const productSame = JSON.stringify(o.product_departure) === JSON.stringify(v2.product_departure) && JSON.stringify(o.evidence_trace.garments) === JSON.stringify(v2.evidence_trace.garments);
  if (!productSame) return { class: 'TECHNICAL_REGRESSION', why: 'product stage differs from V2 (it must be byte-equivalent)' };
  const was = v2.new_result.direction, now = label(o);
  if (was === now) return { class: 'UNCHANGED', why: 'same direction and rule as V2 (' + v2.new_result.rule + ')' };
  if (was === 'DIRECTION_UNRESOLVED' && now === 'CLASSIC' && o.basis.classic_support.length && !o.product_departure.departures.length) return { class: 'INTENDED_CORRECTION', why: 'FCR-TC-1: V2 withheld a direction (' + v2.new_result.rule + ' ' + v2.unresolved_reason.reason + '); no valid frozen departure exists and ' + o.basis.classic_support.map((g) => g.ref + ' ' + g.identity).join(', ') + ' carry observed conventional readings → CLASSIC on the available evidence (sensitivity ' + o.basis.sensitivity + ')' };
  if (was === 'DIRECTION_UNRESOLVED' && now === 'TRANSFORMATIVE') return { class: 'SEMANTIC_REGRESSION', why: 'V2 had no confirmed departure; V3 must not create one' };
  if (was === 'DIRECTION_UNRESOLVED' && now === 'INPUT_FAILURE' && o.exception.code === 'NO_TC_PRODUCT_EVIDENCE' && !o.product_departure.departures.length) return { class: 'INTENDED_CORRECTION', why: 'FCR-TC-1 input boundary: V2 ' + v2.new_result.rule + ' ' + v2.unresolved_reason.reason + '; the packet carries no product fact the frozen predicates can read (' + o.exception.detail + ') → technical input failure, not a style result' };
  return { class: 'SEMANTIC_REGRESSION', why: 'V2 ' + was + ' (' + v2.new_result.rule + ') vs V3 ' + now };
}
const rows = cases.map((c) => {
  const pf = ROOT + c.dir + 'packet.json', rf = ROOT + c.dir + 'run_record.json';
  const ph = sha(pf), rh = sha(rf); const prov = { cohort: c.cohort, packet: c.dir + 'packet.json', packet_sha256: ph, run_record_sha256: rh, sealed_by: c.sealedBy, packet_seal_ok: c.sealed('packet.json') === ph, run_record_seal_ok: c.sealed('run_record.json') === rh };
  const input = { packet: J(pf), run_record: J(rf) };
  const o1 = R.resolveTC(input), o2 = R.resolveTC(JSON.parse(JSON.stringify(input)));
  const v1 = V1.rows[c.id], v2 = V2.rows[c.id]; const ch = classify(v2, o1); const ref = REFI[c.id];
  return { case_id: c.id, provenance: prov,
    v1_result: { direction: v1.new_result.direction, rule: v1.new_result.rule }, v2_result: { direction: v2.new_result.direction, rule: v2.new_result.rule, unresolved_reason: v2.unresolved_reason },
    v3_result: { status: o1.status, direction: o1.direction, rule: o1.rule, resolved_by: o1.resolved_by, exception: o1.exception ? { code: o1.exception.code, detail: o1.exception.detail } : null },
    change: ch, basis: o1.basis, product_departure: o1.product_departure, rule_trace: o1.rule_trace, evidence_trace: o1.evidence_trace, deterministic: strip(o1) === strip(o2),
    reference: ref ? { in_reference_v1_3: true, ceo_gt_records: (ref.ceo_gt_records || []).length, provenance: 'phase1 reference master v1_3 (governed human readings; no TC direction field)' } : { in_reference_v1_3: false, ceo_gt_records: 0, provenance: 'none' },
    ceo_full_look_tc_gt: null, gt_comparison_status: 'NOT_COMPARABLE_NO_FULL_LOOK_TC_CEO_GT' }; });
const dist = (k) => rows.reduce((m, r) => { const d = k(r); m[d] = (m[d] || 0) + 1; return m; }, {});
const scorable = rows.filter((r) => r.v3_result.status === 'RESOLVED');
const out = { document: 'STMX Full-Look TC Product-Only Resolver V3 Final Candidate — 43-case offline replay ledger (V1 · V2 · V3; development diagnostics, not a holdout)', at: new Date().toISOString(), resolver: R.RESOLVER_ID, constitution: A.CONSTITUTION_ID, decision_anchors: [A.AEMS_ANCHOR, A.PRODUCT_ONLY_ANCHOR], live_api_calls: 0,
  dataset: { total: rows.length, release_12: rows.filter((r) => r.provenance.cohort === 'release_12').length, cv2_31: rows.filter((r) => r.provenance.cohort === 'cv2_31').length, duplicates: dup, seals_ok: rows.every((r) => r.provenance.packet_seal_ok && r.provenance.run_record_seal_ok) },
  v1_ledger: { path: V1.path, sha256: V1.sha256 }, v2_ledger: { path: V2.path, sha256: V2.sha256 }, reference: { path: REFP, sha256: sha(ROOT + REFP) },
  summary: { total_input: rows.length, valid_scorable: scorable.length, technical_input_failure: rows.length - scorable.length, input_failures: rows.filter((r) => r.v3_result.status !== 'RESOLVED').map((r) => r.case_id + ' ' + r.v3_result.exception.code),
    v3: dist((r) => (r.v3_result.status === 'RESOLVED' ? r.v3_result.direction : 'INPUT_FAILURE')), v2: dist((r) => r.v2_result.direction), v1: dist((r) => r.v1_result.direction),
    final_unresolved: rows.filter((r) => r.v3_result.status === 'RESOLVED' && !['CLASSIC', 'TRANSFORMATIVE'].includes(r.v3_result.direction)).length,
    missing_evidence_cases: scorable.filter((r) => r.basis.missing_observations.length || r.basis.unknown_identity.length || r.basis.interpretive_gaps.length).length,
    resolved_by: dist((r) => r.v3_result.resolved_by || 'INPUT_FAILURE'), sensitivity: dist((r) => (r.basis ? r.basis.sensitivity : 'n/a')),
    change_classes: dist((r) => r.change.class), changed: rows.filter((r) => r.change.class !== 'UNCHANGED').map((r) => ({ case_id: r.case_id, v2: r.v2_result.direction + ' ' + r.v2_result.rule, v3: (r.v3_result.direction || 'INPUT_FAILURE') + ' ' + (r.v3_result.rule || r.v3_result.exception.code), class: r.change.class, why: r.change.why })),
    unexplained_changes: rows.filter((r) => ['SEMANTIC_REGRESSION', 'TECHNICAL_REGRESSION'].includes(r.change.class)).length,
    coverage: { scorable_with_direction: scorable.length, scorable: scorable.length, total: rows.length }, accuracy: { gt_rows: 0, value: null, note: 'not computable — no Full-Look TC CEO GT exists for these packets; coverage is not accuracy' }, deterministic: rows.every((r) => r.deterministic) },
  rows };
fs.writeFileSync(path.join(OUT, 'tc_regression_ledger.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ dataset: out.dataset, summary: Object.assign({}, out.summary, { changed: out.summary.changed.map((c) => c.case_id + ' ' + c.v2 + ' → ' + c.v3 + ' [' + c.class + ']') }) }, null, 1));
