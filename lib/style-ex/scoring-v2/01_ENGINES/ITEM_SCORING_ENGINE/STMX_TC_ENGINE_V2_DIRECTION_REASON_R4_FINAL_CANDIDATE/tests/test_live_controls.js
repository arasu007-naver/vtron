'use strict';
/* TC V2 R2 — live-audit order §12.4 mutation / negative controls (20), built on the stored live V1.3 records. Expectations come from the frozen TC predicates
   (structural-role doctrine: openwork is a Departure only when D-4-bound to a substantial BODY zone; transparency is EI-owned; coverage is not location) and the
   implemented candidate policies — never from GT. No Lace / transparency proxy: material identity alone never yields Transformative. */
const H = require('./_harness'); const { ok, clone } = H; const E = H.E, AD = H.AD;
const LIVE = H.liveRecords(); const L = (p) => clone(LIVE.find((l) => l.id.startsWith(p)).record);
const ev = (rec) => E.evaluateV13Record(rec); const xOf = (rec) => { const r = ev(rec); const ad = AD.adapt(rec); const u = E.unitFromTokens(ad.member.tokens, ad.member.archetype_key, ad.member.category, ad.member.observed); return { r, x: { direction: r.direction, path: r.trace.path, members: u.members.map((m) => m.record), upstream: u.upstream, missing_fields: r.trace.missing_fields } }; };
const con = (rec) => { const ad = AD.adapt(rec); return H.F.evaluateTokens(ad.member.tokens, ad.member.archetype_key).construction; };
const surf = (rec, values) => { rec.observations.surface = { state: 'OBSERVED', value: null, region: 'whole_garment', values }; return rec; };
const lace = (extra) => Object.assign({ value: 'Lace' }, extra || {}); const semi = (extra) => Object.assign({ value: 'Semi Transparent' }, extra || {});
const C = {};
/* 1–3 · material / surface identity alone is never a Departure */
const c1 = surf(L('call03'), [lace({ coverage: 'Dominant' })]); C[1] = { con: con(c1).v + '/' + con(c1).rule, dir: ev(c1).direction };
ok('LC-01', 'Lace only (coverage Dominant, no D-4 binding) → construction not TRUE (role not observed) → not Transformative', con(c1).v !== 'TRUE' && ev(c1).direction === 'CLASSIC', C[1]);
const c2 = surf(L('call03'), [semi({ coverage: 'Dominant', locations: [{ component: 'Body' }] })]); C[2] = { con: con(c2).v + '/' + con(c2).rule, dir: ev(c2).direction };
ok('LC-02', 'Semi-Transparent only (even Dominant and Body-bound) → transparency is EI-owned, never a TC carrier → not Transformative', con(c2).v !== 'TRUE' && ev(c2).direction === 'CLASSIC', C[2]);
const c3 = L('call03'); C[3] = { con: con(c3).v + '/' + con(c3).rule, dir: ev(c3).direction };
ok('LC-03', 'Lace + Semi-Transparent without a D-4 binding (stored call03) → not Transformative (no Lace / transparency proxy)', con(c3).v !== 'TRUE' && ev(c3).direction === 'CLASSIC', C[3]);
/* 4 · the approved Departure */
const c4 = L('call02'); C[4] = { con: con(c4).rule, dir: ev(c4).direction, path: ev(c4).trace.path };
ok('LC-04', 'approved Product Departure evidence — Lace D-4-bound to the Body (stored call02) → CON-TRUE-R1-OPENWORK-BODY-CONSTRUCTION → Transformative (frozen V1 path)', con(c4).rule === 'CON-TRUE-R1-OPENWORK-BODY-CONSTRUCTION' && ev(c4).direction === 'TRANSFORMATIVE' && ev(c4).trace.path === 'FROZEN_V1', C[4]);
/* 5–6 · unknown role / coverage */
const c5 = L('call02'); c5.observations.surface = { state: 'UNKNOWN', value: null, region: 'whole_garment' }; const r5 = ev(c5); C[5] = { con: con(c5).v + '/' + con(c5).rule, dir: r5.direction, path: r5.trace.path };
ok('LC-05', 'Construction role UNKNOWN (surface state UNKNOWN) → mandatory C / T, no Departure invented, surface not cited in the Reason', r5.ok && ['CLASSIC', 'TRANSFORMATIVE'].includes(r5.direction) && con(c5).v !== 'TRUE' && !/레이스|시스루/.test(r5.customer.reason || ''), C[5]);
const c6a = surf(L('call03'), [lace({ locations: [{ component: 'Body' }] })]); const c6b = surf(L('call03'), [lace({ coverage: 'Dominant' })]); C[6] = { bound_no_coverage: ev(c6a).direction, dominant_unbound: ev(c6b).direction };
ok('LC-06', 'Surface coverage UNKNOWN: binding is the test, not coverage — Body-bound Lace without coverage → T; Dominant Lace without binding → not T', ev(c6a).direction === 'TRANSFORMATIVE' && ev(c6b).direction === 'CLASSIC', C[6]);
/* 7–9 · subtype / length / fit unknown */
const c7 = L('call04'); c7.category = { state: 'OBSERVED', value: 'Jacket' }; c7.observations.grammar = { state: 'UNKNOWN', value: null }; const r7 = ev(c7); C[7] = { key: r7.adapter && r7.adapter.archetype_key, dir: r7.direction, path: r7.trace && r7.trace.path };
ok('LC-07', 'Product subtype UNKNOWN (Jacket, grammar UNKNOWN) → key unresolved, gap reported, still mandatory C / T', r7.ok && /<GRAMMAR_UNKNOWN>/.test(r7.adapter.archetype_key) && r7.adapter.gaps.some((g) => g.field === 'grammar') && ['CLASSIC', 'TRANSFORMATIVE'].includes(r7.direction), C[7]);
const c8 = L('call05'); c8.observations.length = { state: 'UNKNOWN', value: null }; const r8 = ev(c8); C[8] = { dir: r8.direction, path: r8.trace.path, missing: r8.trace.missing_fields };
ok('LC-08', 'Length UNKNOWN → mandatory C / T; when length is a missing input the Reason names it (기장), never claims a length', r8.ok && ['CLASSIC', 'TRANSFORMATIVE'].includes(r8.direction) && (!r8.trace.missing_fields.includes('length') || r8.customer.reason.includes('기장')) && !/크롭|미니|맥시/.test(r8.customer.reason), C[8]);
const c9 = L('call05'); c9.observations.fit = { state: 'UNKNOWN', value: null }; const r9 = ev(c9); C[9] = { dir: r9.direction, path: r9.trace.path, missing: r9.trace.missing_fields };
ok('LC-09', 'Fit UNKNOWN → mandatory C / T; when fit is a missing input the Reason names it (핏), never claims a fit value', r9.ok && ['CLASSIC', 'TRANSFORMATIVE'].includes(r9.direction) && (!r9.trace.missing_fields.includes('fit') || r9.customer.reason.includes('핏')) && !/슬림 핏|레귤러 핏|오버사이즈/.test(r9.customer.reason), C[9]);
/* 10–11 · canonical values_detail form ≡ live values[] form */
const c10 = L('call02'); const lv = c10.observations.surface.values; c10.observations.surface = { state: 'OBSERVED', value: null, values: lv.map((v) => v.value), values_detail: lv.map((v) => ({ value: v.value, coverage: v.coverage, locations: v.locations })) }; const c11 = L('call02');
C[10] = { canonical: ev(c10).direction + ' ' + con(c10).rule, live: ev(c11).direction + ' ' + con(c11).rule };
ok('LC-10', 'values_detail (canonical form) → same frozen verdict and Direction as the live form', ev(c10).direction === ev(c11).direction && con(c10).rule === con(c11).rule, C[10]);
ok('LC-11', 'live values[] objects (stored call02) → coverage + D-4 locations carried through the allowlist (value · coverage · locations)', (() => { const t = AD.adapt(c11).member.tokens.surface; return t.values_detail.some((d) => d.value === 'Lace' && d.coverage === 'Dominant' && d.locations && d.locations[0].component === 'Body') && !t.values_detail.some((d) => 'evidence' in d); })(), AD.adapt(c11).member.tokens.surface);
/* 12–13 · governed overlay present (historical) vs absent (live) */
const u671 = E.evaluateCorpusUnit('REF_000671#SU1'); const r13 = ev(L('call14')); C[12] = { corpus: u671.direction + ' ' + u671.trace.path }; C[13] = { live: r13.direction, material: AD.adapt(L('call14')).member.tokens.material.values };
ok('LC-12', 'approved overlay present (REF_000671 governed material correction in the frozen chain) → historical unit Transformative via FROZEN_V1', u671.direction === 'TRANSFORMATIVE' && u671.trace.path === 'FROZEN_V1', C[12]);
ok('LC-13', 'approved overlay absent (live call14: one material system observed) → the overlay is never injected; Direction from the live evidence only', r13.direction === 'CLASSIC' && JSON.stringify(C[13].material) === JSON.stringify(['Synthetic']), C[13]);
/* 14 · repeated observation */
const a1 = JSON.stringify(ev(L('call01'))), a2 = JSON.stringify(ev(L('call01'))); const reps = ['call01', 'call02', 'call03'].map((p) => ev(L(p)).direction); C[14] = { deterministic: a1 === a2, ref246_runs: reps };
ok('LC-14', 'repeated Vision observation: the same record → byte-identical output; differing runs of one product are reported per run (upstream variance, not engine nondeterminism)', a1 === a2 && reps.length === 3, C[14]);
/* 15 · GT / REF injection */
const c15 = L('call02'); c15.ceo_ground_truth = { TC: 'TC1' }; c15.ref_id = 'REF_000246'; c15.observations.surface.tc_gt = 'TC1'; c15.observations.tc_score = { state: 'OBSERVED', value: 9 }; c15.observations.surface.values[0].gt = 'C';
const r15 = ev(c15), r15c = ev(L('call02')); C[15] = { injected: r15.direction + ' ' + r15.trace.path, clean: r15c.direction + ' ' + r15c.trace.path };
ok('LC-15', 'GT / REF injection (record, observation and value level) → output identical to the clean record (never read)', r15.direction === r15c.direction && r15.trace.path === r15c.trace.path && r15.customer.reason === r15c.customer.reason && !JSON.stringify(AD.adapt(c15).member.tokens).includes('TC1'), C[15]);
/* 16 · frozen dependency hash mismatch */
let c16 = null; try { H.B.verifyInput(Object.assign({}, H.B.BOUND.inputs[0], { sha256: '0'.repeat(64) })); } catch (e) { c16 = e.code; }
ok('LC-16', 'frozen dependency hash mismatch → TCV2BindingError BOUND_INPUT_DRIFT (fail closed)', c16 === 'BOUND_INPUT_DRIFT', c16);
/* 17–19 · zero evidence · partial evidence · transport loss */
const base = L('call05'); const z = { category: base.category, observations: {} }; for (const k of Object.keys(base.observations)) z.observations[k] = { state: 'UNKNOWN', value: null }; const r17 = ev(z);
ok('LC-17', 'valid zero admissible TC evidence → ZERO_EVIDENCE · CLASSIC (TC-ZE candidate policy) · limitation-only Reason', r17.ok && r17.trace.path === 'ZERO_EVIDENCE' && r17.direction === 'CLASSIC', { path: r17.trace.path, reason: r17.customer.reason });
const c18 = L('call05'); c18.observations.fit = { state: 'UNKNOWN', value: null }; c18.observations.length = { state: 'NOT_VISIBLE', value: null }; const r18 = ev(c18);
ok('LC-18', 'partial evidence (fit + length unknown, others observed) → resolved on the observed evidence, never ZERO_EVIDENCE', r18.ok && r18.trace.path !== 'ZERO_EVIDENCE' && ['CLASSIC', 'TRANSFORMATIVE'].includes(r18.direction), { path: r18.trace.path, missing: r18.trace.missing_fields });
const c19 = L('call05'); c19.observations.surface = 'Treated Surface'; delete c19.observations.material; const r19 = ev(c19);
/* R3 (CEO 2026-10-28 §5): the lost key (material) is partial evidence, not corruption — only the corrupted surface VALUE makes this a CONTRACT_ERROR */
/* R4 (CEO 2026-10-28 · R3-B1 §4.2): the corrupted surface VALUE is no longer promoted to a whole-record CONTRACT_ERROR — it is excluded (traced) and the rest decides */
ok('LC-19', 'R4: one TC observation value corrupted + one key lost → the corrupted field excluded (traced), the lost key a NOT_EMITTED gap, mandatory C / T from the rest', r19.ok === true && ['CLASSIC', 'TRANSFORMATIVE'].includes(r19.direction) && JSON.stringify(r19.trace.excluded_fields) === '["surface"]' && r19.adapter.gaps.some((g) => g.field === 'material' && g.gap === 'NOT_EMITTED_BY_V1_3_RECORD'), { direction: r19.direction, excluded: r19.trace && r19.trace.excluded_fields });
/* 20 · Reason hallucination injection (live) */
const M = { flipped: [0, 0], numeric: [0, 0], absence: [0, 0], opposing_omitted: [0, 0], cross_axis: [0, 0] };
for (const l of LIVE) { const { r, x } = xOf(clone(l.record)); const b = { text: r.customer.reason, clauses: r.reason_clauses };
  { const flip = r.direction === 'CLASSIC' ? 'TRANSFORMATIVE' : 'CLASSIC'; M.flipped[0]++; if (H.V.verify(Object.assign({}, x, { direction: flip }), { text: b.text.replace(/Classic 방향|Transformative 방향/, flip === 'CLASSIC' ? 'Classic 방향' : 'Transformative 방향'), clauses: b.clauses }).length) M.flipped[1]++; }
  M.numeric[0]++; if (H.V.verify(x, { text: b.text.replace('방향으로', '방향(TC6)으로'), clauses: b.clauses }).length) M.numeric[1]++;
  if (r.direction === 'CLASSIC') { M.absence[0]++; if (H.V.verify(x, { text: b.text.replace(' Classic 방향', ' 변형 요소가 전혀 없어 Classic 방향'), clauses: b.clauses }).length) M.absence[1]++; }
  if (b.clauses.some((c) => c.kind === 'OPEN_CONSTRUCTION_CANDIDATE')) { M.opposing_omitted[0]++; if (H.V.verify(x, { text: b.text, clauses: b.clauses.filter((c) => c.kind !== 'OPEN_CONSTRUCTION_CANDIDATE') }).length) M.opposing_omitted[1]++; }
  M.cross_axis[0]++; if (H.V.verify(x, { text: b.text, clauses: b.clauses.concat([{ role: 'decisive', kind: 'CONFORMITY', member: 0, channel: 'construction', field: 'relative_size', value: 'large', phrase: '' }]) }).length) M.cross_axis[1]++; }
ok('LC-20', 'Reason hallucination injection on every live record caught in every class (flipped label · numeric · absence claim · opposing lace evidence omitted · cross-axis field)', Object.values(M).every(([n, c]) => n > 0 && n === c), M);
H.summary('test_live_controls', { controls: C, reason_mutations: M });
