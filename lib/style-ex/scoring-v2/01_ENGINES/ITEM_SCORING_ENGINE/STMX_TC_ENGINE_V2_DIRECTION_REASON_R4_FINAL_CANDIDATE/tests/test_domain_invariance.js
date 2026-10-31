'use strict';
/* TC V2 — domain-invariance (TC-Q3) verification: reproduction guard, verdict distribution on the 17 former UNRESOLVED, completion values never leaking into
   evidence / Reason, a Transformative invariant only from a channel independent of the completed input, guard on a non-reproducing member. */
const H = require('./_harness'); const { ok, tally, clone } = H;
const units = H.F.corpusUnits(); const former = units.filter((u) => u.v1_direction === 'DIRECTION_UNRESOLVED');
const di = former.map((u) => ({ unit: u.anchor, d: H.DI.evaluate(u.members[0]) }));
const dist = tally(di, (x) => x.d.verdict || x.d.why);
ok('DI-01', 'every former-UNRESOLVED member is DI-applicable (reproduction guard passes)', di.every((x) => x.d.applicable), di.filter((x) => !x.d.applicable).map((x) => x.unit + ' ' + x.d.why));
ok('DI-02', 'verdict distribution on the 17: INVARIANT_CLASSIC 2 · MIXED_C_T 13 · MIXED_WITH_UNRESOLVED 2 (== research)', dist.INVARIANT_CLASSIC === 2 && dist.MIXED_C_T === 13 && dist.MIXED_WITH_UNRESOLVED === 2, dist);
ok('DI-03', 'invariant Classic units are REF_000145 and REF_000599', JSON.stringify(di.filter((x) => x.d.verdict === 'INVARIANT_CLASSIC').map((x) => x.unit)) === JSON.stringify(['REF_000145#SU1', 'REF_000599#SU1']));
ok('DI-04', 'every completion is flagged HYPOTHETICAL_COMPLETION and only completes a missing input', di.every((x) => x.d.trace.every((c) => c.flag === 'HYPOTHETICAL_COMPLETION' && (c.fit === null || x.d.missing.includes('fit')) && (c.length === null || x.d.missing.includes('length')))));
const res = H.E.evaluateCorpus().filter((r) => r.trace.path !== 'FROZEN_V1');
ok('DI-05', 'no completion value appears in a successor Reason or clause (length / fit phrases absent when that input is missing)', res.every((r) => r.reason_validation.findings.length === 0 && !r.reason_clauses.some((c) => r.trace.missing_fields.includes(c.field === 'length' ? 'length' : c.field === 'fit' ? 'fit' : '_'))));
const m508 = units.find((u) => u.anchor === 'REF_000508#SU1').members[0]; const fake = clone(m508); fake.record.proportion = { v: 'UNRESOLVED', rule: 'PRO-STATE', why: 'test', carrier: 'length' }; fake.input.length = { state: 'NOT_VISIBLE', value: null, values: null };
ok('DI-06', 'guard: a member whose input does not reproduce its frozen verdicts is NOT_APPLICABLE (REF_000508 frozen-ledger Construction)', H.DI.evaluate(fake).applicable === false && H.DI.evaluate(fake).why === 'INPUT_DOES_NOT_REPRODUCE_FROZEN_VERDICTS');
const C = (s, p, c, d) => ({ silhouette: s, proportion: p, construction: c, direction: d });
const viaCompletion = H.DI.classify([C('FALSE/x', 'TRUE/PRO-TRUE-Q7', 'FALSE/x', 'TRANSFORMATIVE'), C('FALSE/x', 'TRUE/PRO-TRUE-Q7', 'FALSE/x', 'TRANSFORMATIVE')], ['length']);
ok('DI-07', 'a Transformative produced only by the completed input itself is NOT admitted (INVARIANT_TRANSFORMATIVE_VIA_COMPLETION)', viaCompletion.verdict === 'INVARIANT_TRANSFORMATIVE_VIA_COMPLETION' && viaCompletion.channel === null);
const independent = H.DI.classify([C('FALSE/x', 'FALSE/x', 'TRUE/CON-TRUE-CONSTITUTIVE', 'TRANSFORMATIVE'), C('FALSE/x', 'TRUE/PRO-TRUE-Q7', 'TRUE/CON-TRUE-CONSTITUTIVE', 'TRANSFORMATIVE')], ['length']);
ok('DI-08', 'a Transformative on a channel independent of the completed input in every completion IS admitted (channel construction)', independent.verdict === 'INVARIANT_TRANSFORMATIVE' && independent.channel === 'construction');
/* synthetic DI-T: REF_000139 member with the key fixed to COAT:Tailored and fit removed → construction (Sleeveless constitutive) TRUE for every fit */
const m139 = clone(units.find((u) => u.anchor === 'REF_000139#SU1').members[0]); const tok = clone(m139.input); delete tok.fit; tok.fit = { state: 'UNKNOWN', value: null, values: null };
const u139 = H.E.unitFromTokens(tok, 'COAT:Tailored', 'Coat', Object.assign({}, m139.record.observed, { fit: '<UNKNOWN>' }), 'SYNTHETIC');
const r139 = H.E.evaluateUnit(u139, { skipGuard: true });
ok('DI-09', 'synthetic: frozen construction Departure independent of the missing fit → V1 already TRANSFORMATIVE (DI not needed; departure-first)', u139.v1_direction === 'TRANSFORMATIVE' && r139.direction === 'TRANSFORMATIVE' && r139.trace.path === 'FROZEN_V1', { v1: u139.v1_direction, path: r139.trace.path });
const mixed = di.filter((x) => x.d.verdict === 'MIXED_C_T').map((x) => x.unit); const mixedRes = res.filter((r) => mixed.includes(r.unit));
ok('DI-10', 'a mixed completion set never yields a DOMAIN_INVARIANT conclusion', mixedRes.every((r) => r.trace.path !== 'DOMAIN_INVARIANT'));
H.summary('test_domain_invariance', { distribution: dist, per_unit: di.map((x) => ({ unit: x.unit, applicable: x.d.applicable, missing: x.d.missing, completions: x.d.completions, directions: x.d.directions, verdict: x.d.verdict })) });
