'use strict';
/* TC V2 R3 — CEO mandatory best-supported Direction (order 2026-10-28 §1 · §5 · §6 · §11.3). Every VALID product input — complete, partial (fields absent or
   UNKNOWN, product type unknown), or with zero admissible TC evidence — returns CLASSIC or TRANSFORMATIVE. Missingness is never evidence of corruption.
   Only an input that cannot be read as a product record (not an object · observation container absent / not an object / an array · a field whose value is not a
   state object · a corrupted category value) is a CONTRACT_ERROR. Expectations come from the frozen TC predicates and the documented V2 decision order — never GT. */
const H = require('./_harness'); const { ok, clone } = H; const E = H.E, AD = H.AD, S = H.S;
const LIVE = H.liveRecords(); const L = (p) => clone(LIVE.find((l) => l.id.startsWith(p)).record);
const ev = (rec) => { try { return E.evaluateV13Record(rec); } catch (e) { return { ok: false, thrown: e.message }; } };
const TC = (r) => r && r.ok === true && ['CLASSIC', 'TRANSFORMATIVE'].includes(r.direction) && typeof r.customer.reason === 'string';
const ERR = (r) => r && r.ok === false && r.kind === 'CONTRACT_ERROR' && r.direction === undefined && !r.customer;
const sh = (r) => r.ok ? r.direction + ' ' + r.trace.path : 'ERROR ' + (r.code || r.thrown);
const con = (rec) => { const a = AD.adapt(rec); return H.F.evaluateTokens(a.member.tokens, a.member.archetype_key).construction; };
const surf = (rec, values) => { rec.observations.surface = { state: 'OBSERVED', value: null, region: 'whole_garment', values }; return rec; };
const D = {};
/* 1 – 3 · complete · partial · optional field missing */
const all = LIVE.map((l) => ev(clone(l.record))); D[1] = all.map(sh);
ok('MB-01', 'valid complete Vision packets (15 stored live records) → CLASSIC / TRANSFORMATIVE', all.every(TC), D[1]);
const p2 = L('call05'); delete p2.observations.surface; delete p2.observations.pattern; const p2b = L('call04'); delete p2b.observations.material; const r2 = [ev(p2), ev(p2b)]; D[2] = r2.map(sh);
ok('MB-02', 'valid partial packet (universal fields surface + pattern / material absent) → T / C, the absent fields recorded as gaps only', r2.every(TC) && r2.every((r) => r.adapter && r.adapter.gaps.some((g) => g.gap === 'NOT_EMITTED_BY_V1_3_RECORD')), D[2]);
const p3 = L('call04'); for (const k of ['collar_scale', 'cuff_scale', 'silhouette', 'closure_type']) delete p3.observations[k]; const r3 = ev(p3); D[3] = sh(r3);
ok('MB-03', 'missing optional (conditional) fields → T / C', TC(r3), D[3]);
/* 4 – 7 · UNKNOWN length / fit / material / subtype · product type */
const u = (p, f) => { const x = L(p); x.observations[f] = { state: 'UNKNOWN', value: null }; return ev(x); };
const r4 = u('call05', 'length'), r5 = u('call05', 'fit'), r6 = u('call04', 'material'); D[4] = sh(r4); D[5] = sh(r5); D[6] = sh(r6);
ok('MB-04', 'UNKNOWN length → T / C (Reason names 기장 when length is a missing input, never claims a length)', TC(r4) && (!r4.trace.missing_fields.includes('length') || r4.customer.reason.includes('기장')), D[4]);
ok('MB-05', 'UNKNOWN fit → T / C (Reason names 핏 when fit is a missing input)', TC(r5) && (!r5.trace.missing_fields.includes('fit') || r5.customer.reason.includes('핏')), D[5]);
ok('MB-06', 'UNKNOWN material → T / C', TC(r6), D[6]);
const j7 = L('call04'); j7.category = { state: 'OBSERVED', value: 'Jacket' }; j7.observations.grammar = { state: 'UNKNOWN', value: null }; const c7 = L('call04'); c7.category = { state: 'UNKNOWN', value: null }; const a7 = L('call04'); delete a7.category;
const r7 = [ev(j7), ev(c7), ev(a7)]; D[7] = r7.map(sh);
ok('MB-07', 'UNKNOWN subtype (Jacket grammar UNKNOWN) · product type UNKNOWN · product type key absent → T / C with the unresolved key recorded (never a scoring stop)', r7.every(TC) && r7.every((r) => r.adapter && r.adapter.key_resolved === false), D[7]);
/* 8 – 10 · missing surface location · construction role · zero admissible evidence */
const r8 = ev(surf(L('call03'), [{ value: 'Lace', coverage: 'Dominant' }])); D[8] = sh(r8) + ' · ' + con(surf(L('call03'), [{ value: 'Lace', coverage: 'Dominant' }])).rule;
ok('MB-08', 'missing surface location (Lace, no D-4 binding) → T / C; the unbound Lace is never a Departure (Classic, open candidate cited)', TC(r8) && r8.direction === 'CLASSIC' && r8.trace && r8.trace.opposing_evidence.some((o) => /OPENWORK-ROLE/.test(o)), D[8]);
const p9 = L('call02'); p9.observations.surface = { state: 'UNKNOWN', value: null }; const r9 = ev(p9); D[9] = sh(r9);
ok('MB-09', 'missing construction role (surface UNKNOWN) → T / C, no Departure invented', TC(r9) && con(p9).v !== 'TRUE', D[9]);
const z1 = ev({ category: L('call05').category, observations: {} }); const z2 = L('call05'); for (const k of Object.keys(z2.observations)) z2.observations[k] = { state: 'NOT_VISIBLE', value: null }; const rz = [z1, ev(z2)]; D[10] = rz.map(sh);
ok('MB-10', 'valid zero-admissible-evidence (empty observation object · every field NOT_VISIBLE) → explicit deterministic ZE policy → CLASSIC, Reason states the limitation (never a fabricated observation)', rz.every((r) => TC(r) && r.trace && r.trace.path === 'ZERO_EVIDENCE' && r.direction === 'CLASSIC' && /확인되지 않아/.test(r.customer.reason)), D[10]);
/* 11 – 14 · invalid JSON · corrupted envelope · transport field loss · empty but valid structure */
const r11 = [ev('{"category":{"state":"OBSERVED"'), ev(null), ev(42)]; D[11] = r11.map(sh);
ok('MB-11', 'invalid JSON / non-object payload → CONTRACT_ERROR (not a product result)', r11.every(ERR), D[11]);
const cat = L('call05').category; const r12 = [ev({ category: cat, observations: [] }), ev({ category: cat, observations: 'fit=Regular' }), ev({ category: cat }), ev([{ category: cat, observations: {} }]), ev({ category: 'Shirt', observations: {} })]; D[12] = r12.map(sh);
/* R4 (CEO 2026-10-28 · R3-B1 §4.2): the corrupted CATEGORY value is one observation field — excluded (traced), the product scored with its type unknown; the four envelope defects stay CONTRACT_ERROR */
ok('MB-12', 'corrupted envelope (observation container array / string / absent · record is an array) → CONTRACT_ERROR; R4: a corrupted category value alone → category excluded, T / C', r12.slice(0, 4).every(ERR) && TC(r12[4]) && r12[4].trace.excluded_fields.includes('category'), D[12]);
const p13 = L('call04'); delete p13.observations.surface; delete p13.observations.asymmetry; delete p13.observations.fit; const r13 = ev(p13); const p13m = L('call04'); p13m.observations.fit = 'Regular'; const r13m = ev(p13m); D[13] = { field_loss: sh(r13), value_corrupted: sh(r13m) };
/* R4 (CEO 2026-10-28 · R3-B1 §4.2): a corrupted field VALUE is excluded field by field, never a whole-record CONTRACT_ERROR */
ok('MB-13', 'transport field loss (keys absent) is NOT corruption → T / C with the loss recorded as gaps; R4: a field whose VALUE is corrupted → that field excluded (traced), T / C', TC(r13) && TC(r13m) && r13m.trace.excluded_fields.includes('fit')   /* call04 also carries graphic = OBSERVED "None" (outside the V1.3 domain) — excluded too */, D[13]);
const r14 = [ev({ category: L('call04').category, observations: {} }), ev({ category: { state: 'UNKNOWN', value: null }, observations: {} })]; D[14] = r14.map(sh);
ok('MB-14', 'empty but valid observation structure (with known or unknown product type) → T / C', r14.every(TC), D[14]);
/* 15 – 18 · one carrier · contradictory · boundary · tie */
const r15 = [ev({ category: { state: 'OBSERVED', value: 'T-Shirt' }, observations: { fit: { state: 'OBSERVED', value: 'Oversized' } } }), ev({ category: { state: 'OBSERVED', value: 'Shirt' }, observations: { collar: { state: 'OBSERVED', value: 'Shirt' } } })]; D[15] = r15.map(sh);
ok('MB-15', 'valid packet with only one useful TC carrier → T / C decided on that carrier', r15.every(TC), D[15]);
const r16 = ev(L('call02')); const o16 = H.F.evaluateTokens(AD.adapt(L('call02')).member.tokens, 'shirt'); D[16] = sh(r16) + ' · S ' + o16.silhouette.v + ' P ' + o16.proportion.v + ' C ' + o16.construction.v;
ok('MB-16', 'contradictory directional evidence (one sufficient Departure + conventional channels) → the frozen order decides: a sufficient Departure → TRANSFORMATIVE', r16.direction === 'TRANSFORMATIVE' && [o16.silhouette.v, o16.proportion.v].every((v) => v === 'FALSE') && o16.construction.v === 'TRUE', D[16]);
const hi = surf(L('call03'), [{ value: 'Lace', coverage: 'Localized', locations: [{ component: 'Body' }] }]); const lo = surf(L('call03'), [{ value: 'Lace', coverage: 'Dominant', locations: [{ component: 'Cuff' }] }]); const r17 = [ev(hi), ev(lo)]; D[17] = r17.map(sh);
ok('MB-17', 'boundary with marginal preference ("5.1 / 4.9"): the smallest sufficient Departure (Localized Lace bound to the Body) → T; a larger but trim-bound Lace (Dominant @Cuff) → C', r17[0].direction === 'TRANSFORMATIVE' && r17[1].direction === 'CLASSIC', D[17]);
const tie = { category: { state: 'OBSERVED', value: 'T-Shirt' }, observations: { fit: { state: 'UNKNOWN', value: null }, length: { state: 'OBSERVED', value: 'Regular' }, sleeve: { state: 'OBSERVED', value: 'Short' }, collar: { state: 'OBSERVED', value: 'None' } } };
const r18 = [ev(clone(tie)), ev(clone(tie)), ev(clone(tie))]; D[18] = { runs: r18.map(sh), di: r18[0].trace && r18[0].trace.domain_invariance && r18[0].trace.domain_invariance.verdict };
ok('MB-18', 'deterministic tie (fit unknown: some admissible completions T, others C) → one Direction, identical on every run, by the documented order (no T from an unobserved possibility)', r18.every(TC) && new Set(r18.map((r) => JSON.stringify([r.direction, r.trace && r.trace.path, r.customer && r.customer.reason]))).size === 1 && r18[0].direction === 'CLASSIC', D[18]);
/* 19 – 22 · GT injection · dependency drift · numeric contamination · Reason hallucination */
const g = L('call02'); g.ceo_ground_truth = { TC: 'TC1' }; g.ref_id = 'REF_000246'; g.observations.surface.tc_gt = 'TC1'; const r19 = ev(g), r19c = ev(L('call02')); D[19] = sh(r19);
ok('MB-19', 'REF / GT injection → output identical to the clean record', TC(r19) && r19.direction === r19c.direction && r19.customer.reason === r19c.customer.reason && r19.trace.path === r19c.trace.path, D[19]);
let c20 = null; try { H.B.verifyInput(Object.assign({}, H.B.BOUND.inputs[2], { sha256: 'f'.repeat(64) })); } catch (e) { c20 = e.code; }
ok('MB-20', 'frozen dependency mismatch → BOUND_INPUT_DRIFT (fail closed)', c20 === 'BOUND_INPUT_DRIFT', c20);
const n = L('call05'); n.observations.tc_score = { state: 'OBSERVED', value: 7 }; n.observations.strength = { state: 'OBSERVED', value: 'Strong' }; n.score = 6.2; const r21 = ev(n); const cust = S.toCustomerOutput(r21); const blob = JSON.stringify(r21);
ok('MB-21', 'numeric / Strength / ordinal contamination in the input → customer output is exactly { direction, reason }, no TC1–TC9 / score / strength / ordinal anywhere in the result', JSON.stringify(Object.keys(cust).sort()) === '["direction","reason"]' && !/"(score|strength|ordinal|tc_score)"/.test(blob) && !/\bTC[1-9]\b/.test(r21.customer.reason), Object.keys(cust));
const a22 = L('call01'); const r22 = ev(a22); const ad22 = AD.adapt(a22); const u22 = E.unitFromTokens(ad22.member.tokens, ad22.member.archetype_key, ad22.member.category, ad22.member.observed); const x22 = { direction: r22.direction, path: r22.trace.path, members: u22.members.map((m) => m.record), upstream: u22.upstream, missing_fields: r22.trace.missing_fields };
const fakes = [{ text: '레이스가 몸판 전체를 구성하여 Transformative 방향으로 판단됩니다.', clauses: r22.reason_clauses }, { text: r22.customer.reason.replace('방향으로', '방향(TC4)으로'), clauses: r22.reason_clauses }, { text: r22.customer.reason, clauses: r22.reason_clauses.filter((c) => c.kind !== 'OPEN_CONSTRUCTION_CANDIDATE') }];
ok('MB-22', 'Reason hallucination (claimed Departure with a Classic Direction · numeric label · omitted opposing lace evidence) → caught by the verifier', fakes.every((f) => H.V.verify(x22, f).length > 0), fakes.map((f) => H.V.verify(x22, f)));
/* 23 – 25 · lace-only · real lace Departure · sleeve / cuff proxy */
const r23 = [ev(surf(L('call03'), [{ value: 'Lace' }])), ev(surf(L('call03'), [{ value: 'Lace', coverage: 'Dominant' }, { value: 'Semi Transparent', coverage: 'Dominant' }]))]; D[23] = r23.map(sh);
ok('MB-23', 'Lace-only material evidence (no structural role observed) → CLASSIC, never a Lace proxy', r23.every((r) => r.direction === 'CLASSIC'), D[23]);
const r24 = ev(L('call02')); D[24] = sh(r24) + ' · ' + con(L('call02')).rule;
ok('MB-24', 'actual valid Lace Construction Departure (Lace D-4-bound to the Body) → TRANSFORMATIVE via CON-TRUE-R1-OPENWORK-BODY-CONSTRUCTION', r24.direction === 'TRANSFORMATIVE' && con(L('call02')).rule === 'CON-TRUE-R1-OPENWORK-BODY-CONSTRUCTION', D[24]);
const sc = L('call04'); sc.observations.sleeve_volume = { state: 'OBSERVED', value: 'Voluminous' }; sc.observations.cuff_type = { state: 'OBSERVED', value: 'Standard' }; sc.observations.cuff_scale = { state: 'OBSERVED', value: 'Enlarged' }; const r25 = ev(sc); D[25] = sh(r25);
ok('MB-25', 'Voluminous sleeve + Enlarged cuff (REF_000430-type relational proxy) → never TRANSFORMATIVE by that pair (CEO R-1)', TC(r25) && r25.direction === 'CLASSIC', D[25]);
/* 26 · corpus */
const corpus = E.evaluateCorpus(); ok('MB-26', '114 governed units → T / C (no UNKNOWN · UNRESOLVED · NOT_SCORABLE · Neutral · null)', corpus.length === 114 && corpus.every(TC), corpus.filter((r) => !TC(r)).map((r) => r.unit));
H.summary('test_mandatory_boundary', { controls: D });
