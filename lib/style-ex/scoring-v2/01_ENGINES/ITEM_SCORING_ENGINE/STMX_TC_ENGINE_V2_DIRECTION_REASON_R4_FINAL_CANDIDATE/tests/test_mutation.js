'use strict';
/* TC V2 — mutation & negative tests (order §14, cases 1 – 22). Expected results come from the contract (order §4 – §10), written before running; never adjusted to GT. */
const H = require('./_harness'); const { ok, clone, O, U, NV } = H; const E = H.E;
const run = (u) => E.evaluateUnit(u, { skipGuard: true }); const units = H.F.corpusUnits(); const corpusOf = (a) => clone(units.find((u) => u.anchor === a));
const SHIRT = { fit: O('Regular'), length: O('Hip Length'), collar: O('Shirt'), closure_type: O('Button'), sleeve_volume: O('Regular'), material: { state: 'OBSERVED', value: null, values: ['Cotton'], values_detail: [{ value: 'Cotton' }] }, surface: { state: 'ABSENT', value: null, values: null } };
const shirtObs = { sleeve: 'Long', front_opening_extent: 'Full' };
const out = []; const rec = (n, r) => { out.push({ case: n, ok: r.ok, direction: r.direction || null, path: r.trace ? r.trace.path : null, policy: r.trace ? r.trace.policy : null, reason: r.customer ? r.customer.reason : null, code: r.code || null }); return r; };
/* 1 · all TC evidence UNKNOWN */
const all = {}; for (const f of Object.keys(SHIRT)) all[f] = U; const r1 = rec(1, run(H.synth(all, 'shirt', 'Shirt')));
ok('MU-01', 'all TC evidence UNKNOWN → CLASSIC via ZERO_EVIDENCE (TC-ZE), limitation-only Reason, no conformity claim', r1.direction === 'CLASSIC' && r1.trace.path === 'ZERO_EVIDENCE' && r1.reason_clauses.length === 0 && /제한된 정보/.test(r1.customer.reason), r1.trace);
/* 2 · some product Departure evidence missing (construction carriers UNKNOWN, fit observed) */
const t2 = clone(SHIRT); t2.collar = U; t2.closure_type = U; t2.length = NV; const r2 = rec(2, run(H.synth(t2, 'shirt', 'Shirt', { sleeve: '<UNKNOWN>', front_opening_extent: '<UNKNOWN>' })));
ok('MU-02', 'partial evidence (construction carriers unknown, fit observed) → mandatory C/T, never ZERO_EVIDENCE', ['CLASSIC', 'TRANSFORMATIVE'].includes(r2.direction) && r2.trace.path !== 'ZERO_EVIDENCE', r2.trace);
/* 3 · length UNKNOWN */
const t3 = clone(SHIRT); t3.length = NV; const r3 = rec(3, run(H.synth(t3, 'shirt', 'Shirt', shirtObs)));
ok('MU-03', 'length NOT_VISIBLE → successor path; the Reason names 기장 and states no length value', r3.trace.path !== 'FROZEN_V1' && r3.trace.missing_fields.includes('length') && /기장/.test(r3.customer.reason) && !/길이/.test(r3.customer.reason), r3.customer.reason);
/* 4 · fit UNKNOWN */
const t4 = clone(SHIRT); t4.fit = U; const r4 = rec(4, run(H.synth(t4, 'shirt', 'Shirt', shirtObs)));
ok('MU-04', 'fit UNKNOWN → successor path; the Reason names 핏 and states no fit value', r4.trace.path !== 'FROZEN_V1' && r4.trace.missing_fields.includes('fit') && /핏은/.test(r4.customer.reason) && !/(레귤러|슬림|릴랙스드|오버사이즈) 핏/.test(r4.customer.reason), r4.customer.reason);
/* 5 · product subtype UNKNOWN */
/* first run: one fixture expected MANDATORY_FALLBACK, but its notched single-breasted coat is Classic under EVERY admissible subtype, so the contract (§4 Level 1
   first) gives DOMAIN_INVARIANT — the expectation was wrong, not the engine. Split into (a) subtype-invariant and (b) subtype-dependent; disclosed in the report. */
const t5 = { fit: O('Regular'), length: O('Knee Length'), collar: O('Notched'), closure_type: O('Single Breasted Button'), material: { state: 'OBSERVED', value: null, values: ['Wool'], values_detail: [{ value: 'Wool' }] } }; const r5 = rec('5a', run(H.synth(t5, 'COAT:<GRAMMAR_n/a>', 'Coat', { sleeve: 'Long' })));
ok('MU-05a', 'subtype unresolved but Classic under every admissible subtype → DOMAIN_INVARIANT; the Reason names 세부 아이템 유형 and no subtype', r5.direction === 'CLASSIC' && r5.trace.path === 'DOMAIN_INVARIANT' && /세부 아이템 유형/.test(r5.customer.reason) && !/테일러드|캐주얼|유틸리티|Tailored|Casual|Utility/.test(r5.customer.reason), r5.customer.reason);
const t5b = { fit: O('Regular'), length: O('Maxi Length'), collar: O('Tie'), material: { state: 'OBSERVED', value: null, values: ['Wool'], values_detail: [{ value: 'Wool' }] } }; const r5b = rec('5b', run(H.synth(t5b, 'COAT:<GRAMMAR_n/a>', 'Coat', { sleeve: 'Sleeveless' })));
ok('MU-05b', 'subtype unresolved and the subtype changes the result (mixed) → MANDATORY_FALLBACK (TC-Q2), no subtype named, "확인된 정보 안에서는" wording', r5b.direction === 'CLASSIC' && r5b.trace.path === 'MANDATORY_FALLBACK' && r5b.trace.policy === 'TC-Q2' && !/테일러드|캐주얼|유틸리티|Tailored|Casual|Utility/.test(r5b.customer.reason) && /확인된 정보 안에서는/.test(r5b.customer.reason), r5b.customer.reason);
/* 6 · every completion C (corpus REF_000145) */
const r6 = rec(6, run(corpusOf('REF_000145#SU1')));
ok('MU-06', 'every admissible completion Classic → DOMAIN_INVARIANT CLASSIC (REF_000145)', r6.direction === 'CLASSIC' && r6.trace.path === 'DOMAIN_INVARIANT', r6.trace.path);
/* 7 · mixed completions (corpus REF_000007) */
const r7 = rec(7, run(corpusOf('REF_000007#SU1')));
ok('MU-07', 'mixed C / T completions → no invariant conclusion; EVIDENCE_BOUNDED Classic (REF_000007)', r7.trace.path === 'EVIDENCE_BOUNDED', r7.trace.path);
/* 8 · some completion UNRESOLVED (corpus REF_000430) */
const r8 = rec(8, run(corpusOf('REF_000430#SU1')));
ok('MU-08', 'some completions UNRESOLVED (REF_000430) → MANDATORY_FALLBACK Classic with the open candidate cited', r8.trace.path === 'MANDATORY_FALLBACK' && r8.trace.opposing_evidence.length === 1, r8.trace);
/* 9 · strong shoulder only */
const t9 = { fit: O('Regular'), length: O('Hip Length'), collar: O('Notched'), closure_type: O('Single Breasted Button'), shoulder_structure: O('Strong'), sleeve_volume: O('Regular'), material: { state: 'OBSERVED', value: null, values: ['Wool'], values_detail: [{ value: 'Wool' }] } };
const r9 = rec(9, run(H.synth(t9, 'JACKET:Tailored', 'Jacket', { sleeve: 'Long', front_opening_extent: 'Full' })));
ok('MU-09', 'Strong shoulder alone (tailored jacket) never yields TRANSFORMATIVE (D-85-1)', r9.direction === 'CLASSIC', { direction: r9.direction, path: r9.trace.path });
/* 10 · voluminous sleeve only · 11 · enlarged cuff only · 12 · both */
const sw = { fit: O('Regular'), length: O('Regular'), collar: O('Stand'), closure_type: O('Zipper'), sleeve_volume: O('Regular'), cuff_type: O('Ribbed'), cuff_scale: O('Regular'), material: { state: 'OBSERVED', value: null, values: ['Knit'], values_detail: [{ value: 'Knit' }] } };
const sv = clone(sw); sv.sleeve_volume = O('Voluminous'); const r10 = rec(10, run(H.synth(sv, 'sweater', 'Sweater', { sleeve: 'Long', front_opening_extent: 'Full' })));
const cu = clone(sw); cu.cuff_scale = O('Enlarged'); const r11 = rec(11, run(H.synth(cu, 'sweater', 'Sweater', { sleeve: 'Long', front_opening_extent: 'Full' })));
const bo = clone(sw); bo.sleeve_volume = O('Voluminous'); bo.cuff_scale = O('Enlarged'); const r12 = rec(12, run(H.synth(bo, 'sweater', 'Sweater', { sleeve: 'Long', front_opening_extent: 'Full' })));
ok('MU-10', 'Voluminous sleeve alone never yields TRANSFORMATIVE', r10.direction === 'CLASSIC', { path: r10.trace.path });
ok('MU-11', 'Enlarged cuff alone never yields TRANSFORMATIVE', r11.direction === 'CLASSIC', { path: r11.trace.path });
ok('MU-12', 'Voluminous sleeve + Enlarged cuff never yields TRANSFORMATIVE (CEO R-1 REJECTED — no proxy)', r12.direction === 'CLASSIC', { path: r12.trace.path });
/* 13 · approved Departure evidence */
const t13 = { fit: O('Oversized'), length: O('Regular'), sleeve_volume: O('Regular'), material: { state: 'OBSERVED', value: null, values: ['Cotton'], values_detail: [{ value: 'Cotton' }] } }; const r13 = rec(13, run(H.synth(t13, 'tshirt', 'T-Shirt', { sleeve: 'Short' })));
ok('MU-13', 'an approved frozen Departure (Oversized t-shirt, SIL-TRUE-OVERSIZED) → TRANSFORMATIVE on FROZEN_V1 with the Departure cited', r13.direction === 'TRANSFORMATIVE' && r13.trace.path === 'FROZEN_V1' && /오버사이즈 핏/.test(r13.customer.reason), r13.customer.reason);
/* 14 · GT injection · 15 · REF change · 16 · input order */
const base = corpusOf('REF_000185#SU1'); const rb = run(clone(base)); const inj = clone(base); inj.ceo_ground_truth = { TC: 'TC9' }; inj.members[0].record.ceo_ground_truth = 'TC9'; inj.members[0].input.ceo_ground_truth = { state: 'OBSERVED', value: 'TC9' }; inj.gt = 'TRANSFORMATIVE';
const r14 = rec(14, run(inj)); ok('MU-14', 'GT fields injected into unit / record / tokens change nothing', r14.direction === rb.direction && r14.customer.reason === rb.customer.reason);
const ren = clone(base); ren.anchor = 'REF_999999#SU9'; ren.members[0].record.anchor_id = 'REF_999999#SU9'; ren.members[0].record.REF = 'REF_999999'; const r15 = rec(15, run(ren));
ok('MU-15', 'REF id renamed → same Direction, path and Reason', r15.direction === rb.direction && r15.trace.path === rb.trace.path && r15.customer.reason === rb.customer.reason);
const ord = clone(base); ord.members[0].input = Object.fromEntries(Object.entries(ord.members[0].input).reverse()); ord.members[0].record.observed = Object.fromEntries(Object.entries(ord.members[0].record.observed).reverse()); const r16 = rec(16, run(ord));
ok('MU-16', 'token / observation order permuted → same Direction and path', r16.direction === rb.direction && r16.trace.path === rb.trace.path);
/* 17 · pair / set member order */
const pair = corpusOf('REF_000010#SU1'); const pr = run(clone(pair)); const prRev = clone(pair); prRev.members.reverse(); const r17 = rec(17, run(prRev));
ok('MU-17', 'pair / set member order reversed → same frozen unit Direction (REF_000010 set)', r17.direction === pr.direction && r17.trace.path === 'FROZEN_V1');
/* 18 · numeric / Strength injected into the customer output */
let refused18 = 0; for (const k of ['score', 'tc_score', 'strength', 'ordinal', 'tier', 'path']) { try { H.S.toCustomerOutput(Object.assign({}, rb, { customer: Object.assign({}, rb.customer, { [k]: 'TC6' }) })); } catch (e) { refused18++; } }
let refusedDir = 0; for (const d of ['NEUTRAL', 'UNRESOLVED', 'NOT_SCORABLE', null, 'TC6', 6]) { try { H.S.toCustomerOutput(Object.assign({}, rb, { customer: { direction: d, reason: 'x' } })); } catch (e) { refusedDir++; } }
ok('MU-18', 'numeric / Strength / ordinal / tier / path fields and non-T/C Directions are refused by the serializer', refused18 === 6 && refusedDir === 6 && JSON.stringify(Object.keys(H.S.toCustomerOutput(rb))) === '["direction","reason"]');
/* 19 · zero admissible evidence (empty token set) */
const r19 = rec(19, run(H.synth({}, 'skirt', 'Skirt')));
ok('MU-19', 'empty token set (zero admissible evidence) → CLASSIC via ZERO_EVIDENCE only (frozen C-1 FALSE on empty tokens is NOT used as conformity)', r19.direction === 'CLASSIC' && r19.trace.path === 'ZERO_EVIDENCE' && r19.trace.grounded_channels.every((g) => g.length === 0), r19.trace);
/* 20 · invalid / corrupted payloads */
const bad = [null, {}, { members: [] }, { v1_direction: 'CLASSIC', members: [{}] }, { v1_direction: 'TC6', members: clone(base.members) }]; const r20 = bad.map((b) => E.evaluateUnit(b));
/* R3 (CEO 2026-10-28 §5): { category UNKNOWN, observations {} } is a VALID product with zero admissible evidence → C / T (checked below), no longer a corrupted payload */
const badV13 = [null, {}, { category: { state: 'OBSERVED', value: 'Shirt' } }].map((b) => E.evaluateV13Record(b)); const zeV13 = E.evaluateV13Record({ category: { state: 'UNKNOWN' }, observations: {} });
ok('MU-20', 'invalid / corrupted payloads → CONTRACT_ERROR with no Direction (never a product result, never zero evidence)', r20.concat(badV13).every((r) => r.ok === false && r.kind === 'CONTRACT_ERROR' && r.direction === undefined) && zeV13.ok === true && zeV13.direction === 'CLASSIC' && zeV13.trace.path === 'ZERO_EVIDENCE', r20.concat(badV13).map((r) => r.code));
/* 21 · Reason hallucination injection */
const x185 = { direction: rb.direction, path: rb.trace.path, members: base.members.map((m) => m.record), upstream: base.upstream, classic: base.classic, missing_fields: rb.trace.missing_fields };
const fakeLen = { text: '힙 길이와 ' + rb.customer.reason, clauses: rb.reason_clauses.concat([{ role: 'decisive', kind: 'CONFORMITY', member: 0, channel: 'proportion', field: 'length', value: 'Hip Length', phrase: '힙 길이' }]) };
const fakeDep = { text: rb.customer.reason.replace('Classic 방향', '변형 요소가 관측되지 않아 Classic 방향'), clauses: rb.reason_clauses };
const fakeNum = { text: rb.customer.reason.replace('Classic 방향', 'TC4 수준의 Classic 방향'), clauses: rb.reason_clauses };
ok('MU-21', 'injected hallucinations caught: unseen length stated · absence-of-transformation claim · numeric tier', H.V.verify(x185, fakeLen).length > 0 && H.V.verify(x185, fakeDep).length > 0 && H.V.verify(x185, fakeNum).length > 0);
/* 22 · frozen dependency hash mismatch */
let threw = null; try { H.B.verifyInput(Object.assign({}, H.B.BOUND.inputs[0], { sha256: '0'.repeat(64) })); } catch (e) { threw = e.code; }
ok('MU-22', 'frozen dependency hash mismatch → TCV2BindingError BOUND_INPUT_DRIFT (fail closed)', threw === 'BOUND_INPUT_DRIFT');
H.summary('test_mutation', { cases: out });
