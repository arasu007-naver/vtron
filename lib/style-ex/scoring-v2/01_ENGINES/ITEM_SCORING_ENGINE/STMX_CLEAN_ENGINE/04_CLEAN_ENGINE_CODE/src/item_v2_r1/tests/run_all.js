'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 R1 — REGRESSION SUITE (order §6 · §11). TEST SIDE ONLY. `node tests/run_all.js [--json]`
 * Writes nothing inside the repository (negative pin controls use an os.tmpdir() copy, removed afterwards).
 * Populations: P1 stored V1.3 (15 VLV) · P1C P1 + same-image stored Colour V1 · P2 corpus RAW evidence (raw_vision + raw_colour only) · L labels (tests/_labels.js,
 * evaluation only) · P4 synthetic controls (labelled; never counted as real-image validation). Oracle = the FROZEN public entries called directly.
 * Expectations are fixed here, never edited to pass. Z-03 is the open Suit gate (expected to FAIL until a separately authorized Suit implementation).
 */
const fs = require('fs'), path = require('path'), os = require('os');
const F = require('../../item_v2/tests/_fixtures'); const L = require('./_labels');
const R1 = require('../item_v2_r1_entry'); const C = require('../item_v2_r1_contracts'); const P = C.P;
const R0 = require('../../item_v2/item_v2_entry'); const { buildAxisInputs } = require('../../item_v2/item_v2_evidence_adapter');
const { selectProductR1, resolveByTitle } = require('../item_v2_r1_product_selector'); const { verifyPredecessor, PREDECESSOR } = require('../item_v2_r1_predecessor_pin');
const ROOT = F.ROOT; const ISE = ROOT + '01_ENGINES/ITEM_SCORING_ENGINE/'; const clone = F.clone;
const O = { EI: require(ISE + 'STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5/src/ei_v2_engine.js'), TC: require(ISE + 'STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE/src/tc_v2_engine.js'), TCS: require(ISE + 'STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE/src/tc_v2_serializer.js'), SR: require(ISE + 'STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE/src/sr_v2_engine.js'), DM: require(ISE + 'STMX_DM_ENGINE_V2_DIRECTION_REASON_CANDIDATE/src/dm_v2_engine.js'), DMS: require(ISE + 'STMX_DM_ENGINE_V2_DIRECTION_REASON_CANDIDATE/src/dm_v2_serializer.js') };
function oracle(ax) {
  const out = {};
  { const r = O.EI.evaluate(clone(ax.EI)); out.EI = r.error ? { rejected: r.error.code } : { direction: r.direction, reason: r.reason }; }
  if (ax.TC) { const r = O.TC.evaluateV13Record(clone(ax.TC)); out.TC = r.ok ? O.TCS.toCustomerOutput(r) : { rejected: r.code }; }
  if (ax.SR) { try { const r = O.SR.evaluate(clone(ax.SR)); out.SR = { direction: r.customer.direction, reason: r.customer.reason }; } catch (e) { out.SR = { rejected: e.code || e.name }; } }
  if (ax.DM) { const r = O.DM.evaluate(clone(ax.DM.dm_designed_detail_evidence)); out.DM = r.ok ? O.DMS.toCustomerOutput(r) : { rejected: r.code }; }
  return out;
}
const res = []; const ledger = { selection: [], metadata: [], user: [], equivalence_failures: [], colour: [], suit: [], strata: {} }; let eqN = 0, eqOk = 0;
const T = (id, pop, title, fn) => { let ok, ev; try { const r = fn(); ok = !!r[0]; ev = r[1]; } catch (e) { ok = false; ev = 'THROW ' + e.message; } res.push({ id, population: pop, title, pass: ok, evidence: ev }); };
const s1 = (input) => R1.scoreItemV2R1(clone(input)); const s0 = (input) => R0.scoreItemV2(clone(input));
const tr = (r) => r.internal.selection_trace || {};
function equivalent(input, r, label) {   /* standalone == integrated for every axis the R1 result executed */
  if (r.result_status === P.RESULT_STATUS.INVALID_PRODUCT_INPUT || r.result_status === C.RESULT_STATUS.PRODUCT_SELECTION_UNRESOLVED) return true;
  const t = tr(r); const { axisInputs } = buildAxisInputs({ unit: t.unit, target: t.selected_primary_target, members: t.selected_member_targets }, clone(input)); const o = oracle(axisInputs); let all = true;
  for (const a of P.AXES) { if (!o[a]) continue; eqN++; const integ = r.customer_output[a]; const d = r.internal.axis_diagnostics[a];
    const same = o[a].rejected ? d.outcome === P.AXIS_OUTCOME.AXIS_INPUT_REJECTED && d.code === o[a].rejected && integ.direction === null : integ.direction === o[a].direction && integ.reason === o[a].reason;
    if (same) eqOk++; else { all = false; ledger.equivalence_failures.push({ label, axis: a, oracle: o[a], integrated: integ }); } }
  return all;
}
const P1 = F.live(), P1C = F.liveWithSameImageColour(), P2 = F.corpusRaw();
const envOf = (rec) => ({ vision_envelope: clone(rec.envelope) });
const sameCustomer = (a, b) => JSON.stringify(a.customer_output) === JSON.stringify(b.customer_output) && JSON.stringify(a.incomplete_axes) === JSON.stringify(b.incomplete_axes);

/* ── R predecessor pin ── */
T('R-01', 'code', 'predecessor src/item_v2 verifies against its CANDIDATE seal (directory + runtime src aggregates pinned)', () => { const v = verifyPredecessor(); return [v.verified && v.directory_aggregate === PREDECESSOR.directory_aggregate_sha256, v.files + ' files · ' + v.directory_aggregate.slice(0, 16) + '…']; });
T('R-02', 'P4 tmp copy', 'pin fails closed: modified predecessor file · unsealed extra file · missing seal (os.tmpdir copy)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r1pin-')); const out = [];
  const copy = () => { fs.rmSync(path.join(tmp, 'p'), { recursive: true, force: true }); fs.cpSync(PREDECESSOR.directory, path.join(tmp, 'p'), { recursive: true }); return path.join(tmp, 'p'); };
  const code = (d) => { try { verifyPredecessor(d); return 'NO_ERROR'; } catch (e) { return e.code; } };
  try { let d = copy(); fs.appendFileSync(path.join(d, 'item_v2_product_selector.js'), '\n'); out.push(code(d));
    d = copy(); fs.writeFileSync(path.join(d, 'extra.js'), ''); out.push(code(d));
    d = copy(); fs.rmSync(path.join(d, PREDECESSOR.seal_file)); out.push(code(d));
    let thrown = 'NO_ERROR'; try { R1.createItemV2R1Runtime({ predecessorDir: d }); } catch (e) { thrown = e.code; } out.push('runtime:' + thrown);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return [JSON.stringify(out) === JSON.stringify(['PREDECESSOR_FILE_DRIFT', 'PREDECESSOR_UNSEALED_FILE', 'PREDECESSOR_SEAL_MISSING', 'runtime:PREDECESSOR_SEAL_MISSING']), out.join(' · ')]; });

/* ── S automatic selection: old vs new against independent labels (envelope only — no user, no merchandise) ── */
const sRows = P1.concat(P2).map((rec) => { const n = F.eligibleOf(rec.envelope).length; const lab = L.labelOf(rec.ref, rec.envelope); const a = s1(envOf(rec)), b = s1(envOf(rec)), o = s0(envOf(rec));
  const nt = tr(a), ot = o.internal.selection_trace || {};
  const verdict = (target, unresolved) => lab.kind === 'ITEM' ? (unresolved ? 'UNRESOLVED' : target === lab.expected ? 'MATCH' : 'MISMATCH') : lab.kind === 'SUIT' ? (unresolved ? 'UNRESOLVED (Suit product)' : 'WRONG_UNIT (Suit product → one garment)') : 'NOT_EVALUABLE';
  return { id: rec.id, ref: rec.ref, population: rec.id.split('|')[0], eligible: n, label: lab, candidates: F.eligibleOf(rec.envelope).map((t) => t.target_id + ':' + F.catOf(t) + ':' + (t.prominence || '-')),
    old: { target: ot.selected_product_target || null, status: ot.selection_status || o.input_issue && o.input_issue.code, basis: ot.selection_basis || null }, new: { target: nt.selected_primary_target || null, status: nt.selection_status || a.input_issue && a.input_issue.code, basis: nt.selection_decision_basis || null, ambiguity: nt.ambiguity_classification || null, result: a.result_status },
    old_verdict: n === 0 ? 'NO_CANDIDATE' : verdict(ot.selected_product_target, false), new_verdict: n === 0 ? 'NO_CANDIDATE' : verdict(nt.selected_primary_target, nt.selection_status === C.SELECTION_STATUS.UNRESOLVED),
    deterministic: JSON.stringify(a) === JSON.stringify(b), same_customer_when_same_target: nt.selected_primary_target && nt.selected_primary_target === ot.selected_product_target ? sameCustomer(a, o) : null, eq: equivalent(envOf(rec), a, 'S|' + rec.id) }; });
ledger.selection = sRows;
const multi = sRows.filter((x) => x.eligible > 1), single = sRows.filter((x) => x.eligible === 1), labelled = multi.filter((x) => x.label.kind === 'ITEM'), suits = multi.filter((x) => x.label.kind === 'SUIT');
const cnt = (a, f) => a.filter(f).length; const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : 'n/a');
const M = { multi: multi.length, labelled: labelled.length,
  old: { selected: labelled.length, correct: cnt(labelled, (x) => x.old_verdict === 'MATCH'), wrong: cnt(labelled, (x) => x.old_verdict === 'MISMATCH'), unresolved: 0 },
  new: { selected: cnt(labelled, (x) => x.new_verdict !== 'UNRESOLVED'), correct: cnt(labelled, (x) => x.new_verdict === 'MATCH'), wrong: cnt(labelled, (x) => x.new_verdict === 'MISMATCH'), unresolved: cnt(labelled, (x) => x.new_verdict === 'UNRESOLVED') },
  suit_old_wrong_unit: cnt(suits, (x) => x.old_verdict.startsWith('WRONG_UNIT')), suit_new_wrong_unit: cnt(suits, (x) => x.new_verdict.startsWith('WRONG_UNIT')), suit_new_unresolved: cnt(suits, (x) => x.new_verdict.startsWith('UNRESOLVED')),
  regressed_previously_correct: labelled.filter((x) => x.old_verdict === 'MATCH' && x.new_verdict !== 'MATCH').map((x) => x.ref + '→' + x.new_verdict), newly_wrong: labelled.filter((x) => x.new_verdict === 'MISMATCH' && x.old_verdict !== 'MISMATCH').map((x) => x.ref) };
M.old.accuracy_of_selected = pct(M.old.correct, M.old.selected); M.new.accuracy_of_selected = pct(M.new.correct, M.new.selected); M.old.coverage = pct(M.old.selected, labelled.length); M.new.coverage = pct(M.new.selected, labelled.length);
ledger.automatic_metrics = M;
T('S-01', 'P2 + L', 'automatic: zero wrong-target selections on labelled ITEM multi-garment records (old ' + M.old.wrong + ')', () => [M.new.wrong === 0, 'new correct ' + M.new.correct + ' · wrong ' + M.new.wrong + ' · unresolved ' + M.new.unresolved + ' of ' + labelled.length + ' (old ' + M.old.correct + ' / ' + M.old.wrong + ' / 0)']);
T('S-02', 'P2 + L', 'automatic: every previously correct UNAMBIGUOUS selection is kept (no regression on evidence-based picks)', () => { const prev = labelled.filter((x) => x.old_verdict === 'MATCH' && x.old.status === 'AUTOMATIC_UNAMBIGUOUS'); return [prev.every((x) => x.new_verdict === 'MATCH'), prev.length + ' kept: ' + prev.map((x) => x.ref.slice(-3)).join(', ')]; });
T('S-03', 'P2 + L', 'automatic: previously correct TIE picks (target order) become UNRESOLVED — reported as coverage regression, not hidden', () => [M.regressed_previously_correct.every((x) => /UNRESOLVED/.test(x)) && M.newly_wrong.length === 0, M.regressed_previously_correct.length + ' previously-correct ties now unresolved: ' + M.regressed_previously_correct.join(', ')]);
T('S-04', 'P1 + P2', 'automatic: every multi-garment record is either selected with an evidence basis or UNRESOLVED with a classification (none silently tie-broken)', () => [multi.every((x) => (x.new.status === 'AUTOMATIC_SELECTED' && x.new.basis === 'UNIQUE_HIGHEST_PRESENTATION') || (x.new.status === 'UNRESOLVED' && /^UNRESOLVED_/.test(x.new.ambiguity))), multi.reduce((m, x) => { const k = x.new.status === 'UNRESOLVED' ? x.new.ambiguity : x.new.basis; m[k] = (m[k] || 0) + 1; return m; }, {})]);
T('S-05', 'P1 + P2', 'single-garment records: selected (SINGLE_ELIGIBLE_GARMENT), identical customer output to the predecessor', () => [single.every((x) => x.new.basis === 'SINGLE_ELIGIBLE_GARMENT' && x.same_customer_when_same_target === true), single.length + ' single-garment records']);
T('S-06', 'P1 + P2', 'Suit products (automatic): never a Suit unit; unique-presentation Jacket picks are WRONG_UNIT (policy: Suit only from user / merchandise input)', () => [multi.every((x) => !x.new.result || tr(s1(envOf(P1.concat(P2).find((r) => r.id === x.id)))).unit !== 'SUIT'), 'Suit products ' + suits.length + ' · new wrong-unit ' + M.suit_new_wrong_unit + ' (old ' + M.suit_old_wrong_unit + ') · unresolved ' + M.suit_new_unresolved]);
T('S-07', 'P2 + L', 'the five governed failures (586 · 593 · 598 · 657 · 851): no wrong target from the envelope alone', () => { const f = ['REF_000586', 'REF_000593', 'REF_000598', 'REF_000657', 'REF_000851'].map((r) => labelled.find((x) => x.ref === r)); return [f.every((x) => x && x.new_verdict !== 'MISMATCH'), f.map((x) => x.ref.slice(-3) + ' old ' + x.old_verdict + ' → new ' + x.new_verdict + ' (' + x.new.ambiguity + ')').join(' · ')]; });

/* ── M merchandise metadata ── */
const mRows = [];
for (const x of multi.filter((y) => y.label.kind === 'ITEM')) { const rec = P1.concat(P2).find((r) => r.id === x.id);
  const viaCat = s1(Object.assign(envOf(rec), { merchandise_metadata: { category: x.label.category } })); const oc = s0(Object.assign(envOf(rec), { merchandise_metadata: { category: x.label.category } }));
  const row = { ref: x.ref, label: x.label.expected, label_source: x.label.source, category: x.label.category, by_category: tr(viaCat).selected_primary_target || tr(viaCat).selection_status, old_by_category: (oc.internal.selection_trace || {}).selected_product_target, eq: equivalent(Object.assign(envOf(rec), { merchandise_metadata: { category: x.label.category } }), viaCat, 'M|' + x.id) };
  if (x.label.title) { const viaT = s1(Object.assign(envOf(rec), { merchandise_metadata: { product_title: x.label.title } })); row.title = x.label.title; row.by_title = tr(viaT).selected_primary_target || tr(viaT).selection_status; row.title_basis = tr(viaT).selection_decision_basis; row.title_evidence = tr(viaT).source_evidence_used; equivalent(Object.assign(envOf(rec), { merchandise_metadata: { product_title: x.label.title } }), viaT, 'MT|' + x.id); }
  mRows.push(row); }
ledger.metadata = mRows;
T('M-01', 'P2 + L (mechanism)', 'merchandise category metadata selects the labelled product on every labelled multi-garment record; old == new (⚠ circular: L2 category fed and scored — mechanism only)', () => [mRows.every((r) => r.by_category === r.label && r.old_by_category === r.label), mRows.length + ' records']);
const titled = mRows.filter((r) => r.title);
T('M-02', 'P2 + L1 (real titles)', 'real upstream product titles (OVERLAY_V2 evidence_source) select the governed product with no category supplied', () => [titled.length === 2 && titled.every((r) => r.by_title === r.label), titled.map((r) => r.ref.slice(-3) + ' "' + r.title + '" → ' + r.by_title + ' (' + r.title_basis + ')').join(' · ')]);
const synth = (cands) => ({ vision_envelope: { image_id: 'P4', targets: cands.map(([id, cat, prom, desc]) => ({ target_id: id, role: 'Primary', eligible: true, prominence: prom, descriptor: desc, record: { category: { state: 'OBSERVED', value: cat }, observations: { fit: { state: 'OBSERVED', value: 'Regular' } } } })) } });
T('M-03', 'P4', 'title rules: "T-Shirt" not read as "Shirt" · plural category word · non-discriminating title passes to automatic (disclosed) · equal overlap does not pick', () => {
  const e1 = synth([['t1', 'Shirt', 'dominant', 'white oxford shirt'], ['t2', 'T-Shirt', 'dominant', 'grey cotton tee']]); const a = selectProductR1(e1, 'Essential Cotton T-Shirt');
  const e2 = synth([['t1', 'Shirt', 'dominant', 'blue shirt'], ['t2', 'Trouser', 'dominant', 'black trousers']]); const b = selectProductR1(e2, 'Tailored Trousers');
  const c = selectProductR1(e2, 'Summer Collection Look 04'); const d = resolveByTitle('blue black set', e2.vision_envelope.targets);
  return [a.target === 't2' && a.basis === 'TITLE_CATEGORY_TERM' && b.target === 't2' && c.status === 'UNRESOLVED' && c.notes.length === 1 && d.unresolved === true, [a.target + ' ' + a.basis, b.target + ' ' + b.basis, c.status + ' · note ' + (c.notes[0] || '').slice(0, 60), 'equal overlap → ' + (d.unresolved ? 'not resolved' : d.target.target_id)].join(' · ')]; });
T('M-04', 'P2', 'merchandise never replaced by presentation: category metadata naming the NON-dominant garment is honoured (unique-presentation records)', () => { const rows = multi.filter((x) => x.new.basis === 'UNIQUE_HIGHEST_PRESENTATION'); let ok = 0; const ev = [];
  for (const x of rows) { const rec = P1.concat(P2).find((r) => r.id === x.id); const other = F.eligibleOf(rec.envelope).find((t) => t.target_id !== x.new.target && F.eligibleOf(rec.envelope).filter((u) => F.catOf(u) === F.catOf(t)).length === 1); if (!other) continue; const r = s1(Object.assign(envOf(rec), { merchandise_metadata: { category: F.catOf(other) } })); if (tr(r).selected_primary_target === other.target_id) ok++; ev.push(x.ref.slice(-3) + '→' + F.catOf(other)); }
  return [ok === ev.length && ok > 0, ok + '/' + ev.length + ' (' + ev.join(', ') + ')']; });

/* ── U user selection ── */
let uN = 0, uSel = 0, uSame = 0, uEq = 0;
for (const rec of P1.concat(P2)) for (const t of F.eligibleOf(rec.envelope)) { uN++; const input = Object.assign(envOf(rec), { user_selection: { product_identity: { merchandise_type: 'ITEM', primary_target_id: t.target_id } } }, Object.keys(rec.colours || {}).length ? { colour_observations: clone(rec.colours) } : {});
  const a = s1(input), o = s0(input); if (tr(a).selected_primary_target === t.target_id && tr(a).selection_source === 'USER') uSel++; if (sameCustomer(a, o)) uSame++; if (equivalent(input, a, 'U|' + rec.id + '|' + t.target_id)) uEq++; }
ledger.user = { cases: uN, selected_as_given: uSel, same_customer_as_predecessor: uSame, equivalent: uEq };
T('U-01', 'P1 + P2', 'explicit user target: selected as given on every eligible garment of every record; customer output == predecessor', () => [uSel === uN && uSame === uN, uSel + '/' + uN + ' selected · ' + uSame + '/' + uN + ' identical to predecessor']);
T('U-02', 'P2', 'user beats merchandise metadata (conflict recorded) · invalid user target is an input issue, never an automatic fallback', () => { const rec = P2.find((r) => r.ref === 'REF_000586');
  const a = s1(Object.assign(envOf(rec), { user_selection: { product_identity: { merchandise_type: 'ITEM', primary_target_id: 'target_1' } }, merchandise_metadata: { product_title: 'The Wide Leg Linen Palazzo Pants (White)' } }));
  const b = s1(Object.assign(envOf(rec), { user_selection: { product_identity: { merchandise_type: 'ITEM', primary_target_id: 'target_9' } } }));
  return [tr(a).selected_primary_target === 'target_1' && tr(a).conflicts.some((c) => c.kind === 'USER_VS_MERCHANDISE_METADATA') && b.result_status === 'INVALID_PRODUCT_INPUT' && b.input_issue.code === 'EXPLICIT_TARGET_NOT_FOUND', 'user kept target_1 (conflict recorded) · invalid → ' + b.input_issue.code]; });
T('U-03', 'P1 + P2', 'user / merchandise CATEGORY matching several candidates: R1 classifies UNRESOLVED_WITHIN_DECLARED_CATEGORY unless title / presentation separate them (predecessor took the first in target order) — reported', () => { const rows = []; for (const rec of P1.concat(P2)) { const by = {}; for (const t of F.eligibleOf(rec.envelope)) (by[F.catOf(t)] = by[F.catOf(t)] || []).push(t); for (const [cat, ts] of Object.entries(by)) if (ts.length > 1) { const a = s1(Object.assign(envOf(rec), { user_selection: { category: cat } })); rows.push(rec.id + ' ' + cat + ' ×' + ts.length + ' → ' + (tr(a).selected_primary_target || tr(a).ambiguity_classification)); } } return [true, rows.length ? rows.join(' · ') : 'no stored record has two eligible garments of one category']; });

/* ── K colour + Neutral ── */
let kN = 0, kOwn = 0, kSame = 0; const neutral = [];
for (const rec of P1C) for (const t of F.eligibleOf(rec.envelope)) { if (!rec.colours[t.target_id]) continue; kN++; const input = Object.assign(envOf(rec), { user_selection: { product_identity: { merchandise_type: 'ITEM', primary_target_id: t.target_id } }, colour_observations: clone(rec.colours) });
  const a = s1(input), o = s0(input); const cov = a.internal.evidence_coverage || []; if (cov.length === 1 && cov[0].target_id === t.target_id && /^SUPPLIED/.test(cov[0].colour_v1)) kOwn++; if (sameCustomer(a, o)) kSame++; if (a.customer_output.EI.direction === 'NEUTRAL') neutral.push(rec.ref + ':' + t.target_id); equivalent(input, a, 'K|' + rec.id); }
const unresolvedColour = multi.filter((x) => x.new.status === 'UNRESOLVED').map((x) => { const rec = P2.find((r) => r.id === x.id); const r = s1(Object.assign(envOf(rec), Object.keys(rec.colours).length ? { colour_observations: clone(rec.colours) } : {})); return r.internal.evidence_coverage === null && r.customer_output === null; });
ledger.colour = { cases: kN, own_colour_only: kOwn, same_as_predecessor: kSame, neutral };
T('K-01', 'P1C', 'colour attaches only to the selected target; EI (incl. Commercial Neutral) identical to predecessor', () => [kN > 0 && kOwn === kN && kSame === kN, kOwn + '/' + kN + ' own colour · identical ' + kSame + '/' + kN + ' · NEUTRAL ' + (neutral.join(', ') || 'none')]);
T('K-02', 'P2', 'UNRESOLVED selection attaches no colour and executes no axis (no evidence of an unselected garment reaches an engine)', () => [unresolvedColour.every(Boolean), unresolvedColour.length + ' unresolved records with their stored colour supplied']);

/* ── E equivalence ── */
T('E-01', 'all executed results', 'standalone frozen entries == integrated R1 (Direction + Reason, or the same axis rejection) on every executed result', () => [eqOk === eqN && eqN > 0, eqOk + '/' + eqN + (ledger.equivalence_failures.length ? ' · failures ' + ledger.equivalence_failures.length : '')]);

/* ── Z Suit (explicit only) ── */
const zRows = [['REF_000810', ['target_1', 'target_2']], ['REF_000816', ['target_1', 'target_3']], ['REF_000817', ['target_1', 'target_3']], ['REF_000840', ['target_1', 'target_3']], ['REF_000841', ['target_1', 'target_2']]].map(([ref, ids]) => { const rec = P2.find((r) => r.ref === ref); const input = Object.assign(envOf(rec), { user_selection: { product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: ids } } }, Object.keys(rec.colours).length ? { colour_observations: clone(rec.colours) } : {}); const a = s1(input), o = s0(input); return { ref, members: ids, ei: a.customer_output.EI.direction, others: ['TC', 'SR', 'DM'].map((x) => a.internal.axis_diagnostics[x].outcome), same: sameCustomer(a, o), result: a.result_status }; });
ledger.suit = zRows;
T('Z-01', 'P2', 'explicit Suit: EI whole-Suit Direction; customer output identical to the predecessor', () => [zRows.every((z) => z.ei && z.same), zRows.map((z) => z.ref.slice(-3) + ' EI ' + z.ei).join(' · ')]);
T('Z-02', 'P2', 'explicit Suit: TC / SR / DM stay SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS (no member result substituted, no aggregation)', () => [zRows.every((z) => z.others.every((x) => x === 'SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS')), zRows.map((z) => z.ref.slice(-3) + ' ' + z.result).join(' · ')]);
T('Z-03', 'P2', '[OPEN GATE] whole-Suit four Directions (TC / SR / DM Suit semantics not authorized in this order)', () => [zRows.every((z) => z.result === 'COMPLETE'), zRows.filter((z) => z.result !== 'COMPLETE').length + '/5 Suits INCOMPLETE (expected until a CEO Suit decision is implemented)']);

/* ── N negatives ── */
const base = envOf(P2.find((r) => r.ref === 'REF_000586'));
const neg = [['empty title', { merchandise_metadata: { product_title: '  ' } }, 'MALFORMED_REQUEST'], ['numeric title', { merchandise_metadata: { product_title: 42 } }, 'MALFORMED_REQUEST'], ['title too long', { merchandise_metadata: { product_title: 'x'.repeat(501) } }, 'MALFORMED_REQUEST'], ['title on user_selection', { user_selection: { product_title: 'Pants' } }, 'MALFORMED_REQUEST'], ['unknown merchandise field', { merchandise_metadata: { sku: 'A1' } }, 'MALFORMED_REQUEST'], ['category not in envelope', { merchandise_metadata: { category: 'Coat' } }, 'EXPLICIT_CATEGORY_NOT_FOUND'], ['merchandise target not found', { merchandise_metadata: { product_identity: { merchandise_type: 'ITEM', primary_target_id: 'target_7' } } }, 'EXPLICIT_TARGET_NOT_FOUND'], ['colour for foreign target', { colour_observations: { target_9: { primary_color_family: 'red' } } }, 'COLOUR_TARGET_NOT_IN_ENVELOPE'], ['Suit members wrong categories', { user_selection: { product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: ['target_1', 'target_2'] } } }, 'SUIT_MEMBER_ASSOCIATION_FAILED']]
  .map(([what, extra, code]) => { const r = s1(Object.assign(clone(base), extra)); return { what, expect: code, got: r.input_issue && r.input_issue.code, status: r.result_status, ok: r.result_status === 'INVALID_PRODUCT_INPUT' && r.input_issue.code === code && r.customer_output === null }; });
neg.push((() => { const r = s1({}); return { what: 'no envelope', expect: 'NO_VISION_ENVELOPE', got: r.input_issue && r.input_issue.code, ok: r.input_issue && r.input_issue.code === 'NO_VISION_ENVELOPE' }; })());
T('N-01', 'P2 + P4', 'invalid inputs → INVALID_PRODUCT_INPUT with their own code; never an automatic fallback, never a Direction', () => [neg.every((n) => n.ok), neg.map((n) => n.what + ' → ' + n.got).join(' · ')]);

/* ── D determinism + order invariance ── */
T('D-01', 'P1 + P2', 'repeated execution byte-identical', () => [sRows.every((x) => x.deterministic), cnt(sRows, (x) => x.deterministic) + '/' + sRows.length]);
T('D-02', 'P1 + P2', 'reversing Vision target order changes no selection (selected stays selected · unresolved stays unresolved) — the predecessor tie rule was order-dependent', () => { let same = 0; for (const x of multi) { const rec = P1.concat(P2).find((r) => r.id === x.id); const rev = clone(rec.envelope); rev.targets.reverse(); const r = s1({ vision_envelope: rev }); const t = tr(r); if ((t.selected_primary_target || null) === x.new.target && t.selection_status === x.new.status) same++; } return [same === multi.length, same + '/' + multi.length]; });

/* ── J source + output scans ── */
const SRC = path.resolve(__dirname, '..'); const srcFiles = fs.readdirSync(SRC).filter((f) => f.endsWith('.js'));
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
/* test correction (disclosed, D14): the first version flagged any `.role` read; the only read is the predecessor-copied error DETAIL text
   "(role …)" of EXPLICIT_TARGET_NOT_SCORABLE. The requirement is that role never decides selection → the scan now targets role in a comparison. */
T('J-01', 'code', 'runtime source reads no corpus / overlay / GT / REF / folder / scoring_units and never compares a role value', () => { const bad = []; for (const f of srcFiles) { const s = strip(fs.readFileSync(path.join(SRC, f), 'utf8')); for (const re of [/CORPUS/i, /OVERLAY/, /ground_truth/i, /REF_0/, /scoring_units/, /source_relative_path/, /\.role\s*(===|!==|==|!=)/, /(===|!==|==|!=)\s*\w*\.role\b/, /'Primary'/]) if (re.test(s)) bad.push(f + ' ' + re); } return [bad.length === 0, bad.join(' · ') || srcFiles.length + ' files clean (role appears only in an error detail string)']; });
T('J-02', 'code', 'no garment-category preference: category literals appear only in the Suit member association (CEO Suit constitution)', () => { const s = strip(fs.readFileSync(path.join(SRC, 'item_v2_r1_product_selector.js'), 'utf8')).split('\n'); const lines = s.filter((l) => /'(Trouser|Skirt|Jacket|Shirt|Coat|Dress)'/.test(l)); return [lines.every((l) => /SUIT_SETS|jackets|lowers/.test(l)), lines.length + ' lines, all Suit association']; });
let allOut = 0, forb = 0; for (const rec of P1.concat(P2)) { allOut++; const r = s1(envOf(rec)); if (r.customer_output) for (const a of P.AXES) for (const k of Object.keys(r.customer_output[a])) if (!['direction', 'reason'].includes(k)) forb++; if (JSON.stringify(r.customer_output || {}).match(/style_id|"score"|strength|ordinal/i)) forb++; }
T('J-03', 'P2', 'customer output = { direction, reason } per axis only — no Style ID / code / number / Strength', () => [forb === 0, allOut + ' scanned results · forbidden ' + forb]);
T('J-04', 'code', 'selection diagnostics never enter customer Reasons (trace keys absent from customer_output)', () => { const r = s1(Object.assign(clone(base), { merchandise_metadata: { product_title: 'The Wide Leg Linen Palazzo Pants (White)' } })); const c = JSON.stringify(r.customer_output); return [!/selection|TITLE_|candidate|target_/.test(c) && r.internal.selection_trace.selection_decision_basis === 'TITLE_DESCRIPTOR_OVERLAP', 'trace in internal only']; });

/* strata (order §6) — counts from the ledger */
const catsOf = (x) => x.candidates.map((c) => c.split(':')[1]);
ledger.strata = { single_garment: single.length, multi_garment: multi.length, jacket_with_styling_shirt: cnt(multi, (x) => catsOf(x).includes('Jacket') && catsOf(x).includes('Shirt')), trouser_with_styling_upper: cnt(labelled, (x) => x.label.category === 'Trouser'), skirt_with_styling_upper: cnt(labelled, (x) => x.label.category === 'Skirt'), coat_with_layers: cnt(multi, (x) => catsOf(x).includes('Coat')), dress_or_jumpsuit: cnt(sRows, (x) => catsOf(x).some((c) => ['Dress', 'Jumpsuit'].includes(c))), layered_three_plus: cnt(multi, (x) => x.eligible >= 3), explicit_user_cases: uN, merchandise_metadata_cases: mRows.length + titled.length, neither: multi.length, worn_cut_or_flat_lay_identifiable: 'not identifiable — V1.3 carries no presentation-context field' };

const pass = res.filter((r) => r.pass).length; const OUT = { pass, total: res.length, failed: res.filter((r) => !r.pass).map((r) => r.id), equivalence: { equal: eqOk, total: eqN }, results: res, ledger };
if (process.argv.includes('--json')) { console.log(JSON.stringify(OUT)); } else { for (const r of res) console.log((r.pass ? 'PASS' : 'FAIL') + ' ' + r.id + ' [' + r.population + '] ' + r.title + '\n      ' + (typeof r.evidence === 'string' ? r.evidence : JSON.stringify(r.evidence))); console.log('\n' + pass + '/' + res.length + ' · equivalence ' + eqOk + '/' + eqN + ' · automatic ' + JSON.stringify(M)); }
