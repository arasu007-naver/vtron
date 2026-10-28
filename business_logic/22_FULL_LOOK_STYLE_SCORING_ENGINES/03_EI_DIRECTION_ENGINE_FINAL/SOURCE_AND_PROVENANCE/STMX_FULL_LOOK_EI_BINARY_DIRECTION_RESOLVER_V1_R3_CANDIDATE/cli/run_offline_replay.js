'use strict';
/**
 * OFFLINE REPLAY RUNNER — V1_R3 candidate · the 43 frozen Full-Look packets (12 release samples + 31 DM-validation packets). Successor of the V1_R2 runner.
 *   node cli/run_offline_replay.js [outDir]        (default outDir = ../validation)
 * 1. dataset identity: every packet / run_record is hash-checked against its sealed manifest (release SHA256SUMS.txt · CV2 PACKAGE_MANIFEST.json).
 * 2. four-way replay: the V1, V1_R1 and V1_R2 candidate resolvers are loaded READ-ONLY (their directories are protected) and re-run on every packet; their
 *    outputs must equal their sealed ledgers (hash-checked through their manifests). resolveEI() of V1_R3 runs twice (determinism).
 * 3. per look: added / removed / retained E evidence vs V1_R2 and vs V1, each with the rule (R3 rule tag, qualification route or PS-1 role note) that explains it;
 *    re-labelled bases (same item, different route) are listed separately.
 * 4. CEO judgments joined AFTER prediction (the look id is only the ledger key — never read by a resolver):
 *    full-look GT — M320 E · M308 E (CEO 2026-10-19) · M178 I (CEO 2026-10-25);
 *    evidence-path adjudications (not look GT) — M210 pocket square not an independent qualifying point · F065 / F258 exposure not qualifying.
 * Writes <outDir>/ei_r3_replay_ledger.json. 0 API calls.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const R = require('../src/fl_ei_direction_resolver_v1.js'); const A = require('../src/fl_ei_authority_v1.js');
const ROOT = A.ROOT; const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'validation')); fs.mkdirSync(OUT, { recursive: true });
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const SE = '01_ENGINES/STYLE_SCORING_ENGINE/'; const V1P = SE + 'STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_CANDIDATE/', R1P = SE + 'STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_R1_CANDIDATE/', R2P = SE + 'STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_R2_CANDIDATE/';
const REL = '01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/'; const CV2P = '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_DM_43_CASE_VISION_COMPLETION_AND_CSTAR_REVALIDATION_V2/';
const SUMS = Object.fromEntries(fs.readFileSync(ROOT + REL + 'SHA256SUMS.txt', 'utf8').trim().split('\n').map((l) => { const i = l.indexOf('  '); return [l.slice(i + 2).trim(), l.slice(0, i)]; }));
const CVM = J(ROOT + CV2P + 'PACKAGE_MANIFEST.json'); const cvSha = Object.fromEntries(CVM.files.map((f) => [f.path, f.sha256]));
const pinned = (pkg, rel) => { const M = J(ROOT + pkg + 'PACKAGE_MANIFEST.json'); const e = M.files.find((f) => f.path === rel); if (!e || e.sha256 !== sha(ROOT + pkg + rel)) throw new Error('predecessor output changed: ' + pkg + rel); return { data: J(ROOT + pkg + rel), sha256: e.sha256, code_identity: M.code_identity ? M.code_identity.aggregate_sha256 : null }; };
const V1L = pinned(V1P, 'validation/ei_replay_ledger.json'), R1L = pinned(R1P, 'validation/ei_r1_replay_ledger.json'), R2L = pinned(R2P, 'validation/ei_r2_replay_ledger.json');
const V1R = require(ROOT + V1P + 'src/fl_ei_direction_resolver_v1.js'), R1R = require(ROOT + R1P + 'src/fl_ei_direction_resolver_v1.js'), R2R = require(ROOT + R2P + 'src/fl_ei_direction_resolver_v1.js');
const FLEI = pinned('04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_EI_ARCHITECTURE_CONSOLIDATION_AND_IMPLEMENTATION_READINESS_V1/', '_raw/manifests/e2_ei_feasibility_43.json');
const ORDER_R1 = '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_EI_CEO_ADJUDICATION_INTEGRATION_AND_PRE_FREEZE_VALIDATION_V1/AUTHORIZATION/EI_R1_ADJUDICATION_CORRECTION_CEO_ORDER_VERBATIM.md';
const ORDER_R1_SHA = '2c11e8eba38f5c3b27ccf19e08bba2af24e932f33351532dca5ac6861af4ede1'; if (sha(ROOT + ORDER_R1) !== ORDER_R1_SHA) throw new Error('CEO order (M178 GT source) changed');
const GT = Object.fromEntries(FLEI.data.ceo_corpus_judgments_joined_after.map((a) => [a.look, { ceo: a.ceo_full_look_ei, source: a.source }]));
GT.M178 = { ceo: 'INTROVERT', source: 'CEO 2026-10-25 final EI direction (R1 order §3.1, sha256 ' + ORDER_R1_SHA.slice(0, 16) + '…)' };
const PATH_ADJ = {
  M210: { what: 'conventional pocket square is not an independent qualifying E point', holds: (o) => !o.evidence_trace.expressive_bases.some((b) => /pocket_square/.test(b.component)) },
  F065: { what: 'ordinary shirt neckline opening is not Expressive exposure', holds: (o) => !o.evidence_trace.expressive_bases.some((b) => b.pathway === 'EX') },
  F258: { what: 'ordinary shorts leg visibility + normal neckline are not Expressive exposure', holds: (o) => !o.evidence_trace.expressive_bases.some((b) => b.pathway === 'EX') } };
const SI = J(ROOT + REL + '04_SAMPLES/SAMPLE_INDEX.json');
const cases = SI.samples.map((s) => ({ id: s.image, cohort: 'release_12', dir: REL + '04_SAMPLES/expected_outputs/' + s.image + '/', sealed: (f) => SUMS['04_SAMPLES/expected_outputs/' + s.image + '/' + f] }))
  .concat(fs.readdirSync(ROOT + CV2P + '04_VISION_OUTPUTS/04_SAMPLES/expected_outputs').sort().map((id) => ({ id, cohort: 'cv2_31', dir: CV2P + '04_VISION_OUTPUTS/04_SAMPLES/expected_outputs/' + id + '/', sealed: (f) => cvSha['04_VISION_OUTPUTS/04_SAMPLES/expected_outputs/' + id + '/' + f] })));
const strip = (o) => JSON.stringify(o, (k, v) => (k === 'authority_provenance' ? undefined : v));
const short = (d) => (d === 'EXPRESSIVE' ? 'E' : d === 'INTROVERT' ? 'I' : d);
const bk = (b) => b.pathway + '@' + b.ref + ' ' + b.evidence;
const why = (b) => b.qualification || b.role_note || b.authority;
const explain = (o, x) => { const n = o.evidence_trace.not_qualifying.find((m) => m.ref === x.ref && x.evidence.startsWith(m.item)) || o.evidence_trace.not_qualifying.find((m) => m.pathway === 'EX' && x.pathway === 'EX' && x.evidence.startsWith(m.item.split(' · ')[0])); return n ? (n.rule ? n.rule + ' — ' : '') + n.why : 'not in this candidate'; };
const rows = cases.map((c) => {
  const files = ['packet.json', 'run_record.json'].map((f) => ({ f, sha256: sha(ROOT + c.dir + f), sealed: c.sealed(f) })); const identity_ok = files.every((x) => x.sha256 === x.sealed);
  const input = () => ({ packet: J(ROOT + c.dir + 'packet.json'), run_record: J(ROOT + c.dir + 'run_record.json') });
  const o1 = R.resolveEI(input()), o2 = R.resolveEI(input()); const deterministic = strip(o1) === strip(o2);
  const ov1 = V1R.resolveEI(input()), or1 = R1R.resolveEI(input()), or2 = R2R.resolveEI(input());
  const sv1 = V1L.data.rows.find((r) => r.look === c.id), sr1 = R1L.data.rows.find((r) => r.look === c.id), sr2 = R2L.data.rows.find((r) => r.look === c.id);
  const same = (s, o) => !!s && s.direction === o.direction && JSON.stringify(s.expressive_bases) === JSON.stringify(o.evidence_trace.expressive_bases.map(bk));
  const predecessors_reproduce = same(sv1, ov1) && same(sr1, or1) && same(sr2, or2);
  const B3 = o1.evidence_trace.expressive_bases, B2 = or2.evidence_trace.expressive_bases, B0 = ov1.evidence_trace.expressive_bases;
  const k3 = B3.map(bk), k2 = B2.map(bk);
  const added_vs_r2 = B3.filter((b) => !k2.includes(bk(b))).map((b) => bk(b) + ' — ' + why(b));
  const removed_vs_r2 = B2.filter((b) => !k3.includes(bk(b))).map((b) => bk(b) + ' — ' + explain(o1, b));
  const removed_vs_v1 = B0.filter((b) => !k3.includes(bk(b))).map((b) => bk(b) + ' — ' + explain(o1, b));
  const added_vs_v1 = B3.filter((b) => !B0.map(bk).includes(bk(b))).map((b) => bk(b) + ' — ' + why(b));
  const relabelled_vs_r2 = B3.filter((b) => { const p = B2.find((x) => bk(x) === bk(b)); return p && ((p.qualification || '') !== (b.qualification || '') || (b.role_note || '') !== ''); }).map((b) => { const p = B2.find((x) => bk(x) === bk(b)); return bk(b) + ' — R2: ' + (p.qualification || 'governed point rule') + ' → R3: ' + (b.qualification || b.role_note || 'governed point rule'); });
  const retained = B3.filter((b) => k2.includes(bk(b))).map((b) => bk(b) + (b.qualification ? ' — ' + b.qualification : b.role_note ? ' — ' + b.role_note : ''));
  const label = o1.status === 'RESOLVED' ? short(o1.direction) : 'INPUT_FAILURE ' + o1.exception.code;
  const adj = PATH_ADJ[c.id] ? { what: PATH_ADJ[c.id].what, holds: PATH_ADJ[c.id].holds(o1) } : null;
  return { look: c.id, cohort: c.cohort, dataset_identity_ok: identity_ok, inputs: files, status: o1.status, direction: o1.direction, rule: o1.rule, resolved_by: o1.resolved_by, deterministic,
    v1_direction: short(ov1.direction), r1_direction: short(or1.direction), r2_direction: short(or2.direction), r3_direction: label, predecessors_reproduce_sealed_ledgers: predecessors_reproduce,
    changed_vs_r2: short(or2.direction) !== label, changed_vs_r1: short(or1.direction) !== label, changed_vs_v1: short(ov1.direction) !== label,
    expressive_bases: k3, added_vs_r2, removed_vs_r2, relabelled_vs_r2, added_vs_v1, removed_vs_v1, retained_from_r2: retained,
    r3_exclusions: o1.evidence_trace.not_qualifying.filter((n) => n.rule).map((n) => n.rule + ' ' + n.pathway + ' ' + n.item + ' — ' + n.why),
    introvert_ground: o1.basis ? o1.basis.introvert_ground : null, unobserved: o1.basis ? o1.basis.unobserved : null,
    ceo_gt: GT[c.id] || null, gt_result: GT[c.id] ? (short(GT[c.id].ceo) === label ? 'AGREE' : 'DISAGREE') : 'NO_GT', classification: GT[c.id] ? 'CEO_GT' : PATH_ADJ[c.id] ? 'SEMANTIC_ANCHOR (evidence path)' : 'NO_GT', path_adjudication: adj, record: o1 };
});
const dist = (f) => rows.reduce((m, r) => ((m[f(r)] = (m[f(r)] || 0) + 1), m), {});
const summary = { looks: rows.length, duplicate_ids: rows.map((r) => r.look).filter((x, i, a) => a.indexOf(x) !== i), dataset_identity_ok: rows.filter((r) => r.dataset_identity_ok).length, valid_inputs: rows.filter((r) => r.status === 'RESOLVED').length, input_failures: rows.filter((r) => r.status !== 'RESOLVED').map((r) => r.look),
  direction: dist((r) => r.direction || 'none'), r2_direction: dist((r) => r.r2_direction), r1_direction: dist((r) => r.r1_direction), v1_direction: dist((r) => r.v1_direction), predecessors_reproduce_sealed_ledgers: rows.filter((r) => r.predecessors_reproduce_sealed_ledgers).length,
  neutral: rows.filter((r) => r.direction === 'NEUTRAL').length, unknown_or_unresolved: rows.filter((r) => r.status === 'RESOLVED' && !['EXPRESSIVE', 'INTROVERT'].includes(r.direction)).length, resolved_by: dist((r) => r.resolved_by || 'none'), deterministic: rows.filter((r) => r.deterministic).length,
  ceo_gt: rows.filter((r) => r.ceo_gt).map((r) => r.look + ' ' + r.ceo_gt.ceo + ' → ' + r.gt_result), no_gt: rows.filter((r) => !r.ceo_gt).length,
  path_adjudications: rows.filter((r) => r.path_adjudication).map((r) => r.look + ' ' + (r.path_adjudication.holds ? 'HOLDS' : 'VIOLATED') + ' — ' + r.path_adjudication.what),
  changed_vs_r2: rows.filter((r) => r.changed_vs_r2).map((r) => r.look + ' ' + r.r2_direction + '→' + r.r3_direction), changed_vs_v1: rows.filter((r) => r.changed_vs_v1).map((r) => r.look + ' ' + r.v1_direction + '→' + r.r3_direction),
  bases_added_vs_r2: rows.filter((r) => r.added_vs_r2.length).map((r) => r.look + ' +' + r.added_vs_r2.length), bases_removed_vs_r2: rows.filter((r) => r.removed_vs_r2.length).map((r) => r.look + ' −' + r.removed_vs_r2.length), bases_relabelled_vs_r2: rows.filter((r) => r.relabelled_vs_r2.length).map((r) => r.look + ' ~' + r.relabelled_vs_r2.length),
  r3_rule_hits: rows.reduce((m, r) => { for (const x of r.r3_exclusions) { const k = x.split(' ')[0]; m[k] = (m[k] || 0) + 1; } return m; }, {}),
  qualification_routes: rows.reduce((m, r) => { for (const b of r.record.evidence_trace.expressive_bases) if (b.qualification) { const k = b.qualification.split(':')[0]; m[k] = (m[k] || 0) + 1; } return m; }, {}),
  ps1_role_notes: rows.reduce((m, r) => m + r.record.evidence_trace.expressive_bases.filter((b) => b.role_note).length, 0),
  pathways: rows.reduce((m, r) => { for (const b of r.expressive_bases) { const p = b.split(' ')[0].split('@')[0]; m[p] = (m[p] || 0) + 1; } return m; }, {}), e_on_single_basis: rows.filter((r) => r.direction === 'EXPRESSIVE' && r.expressive_bases.length === 1).map((r) => r.look + ' ' + r.expressive_bases[0]) };
fs.writeFileSync(path.join(OUT, 'ei_r3_replay_ledger.json'), JSON.stringify({ document: 'Full-Look EI binary resolver V1_R3 candidate — 43-packet offline four-way replay (V1 · V1_R1 · V1_R2 · V1_R3)', resolver: R.RESOLVER_ID, api_calls: 0,
  predecessors: { v1: { ledger_sha256: V1L.sha256, code_identity: V1L.code_identity }, v1_r1: { ledger_sha256: R1L.sha256, code_identity: R1L.code_identity }, v1_r2: { ledger_sha256: R2L.sha256, code_identity: R2L.code_identity }, flei_e2_sha256: FLEI.sha256, gt_order_sha256: ORDER_R1_SHA },
  gt_note: 'CEO judgments joined after prediction; full-look GT and evidence-path adjudications are reported separately; coverage is not accuracy', summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
