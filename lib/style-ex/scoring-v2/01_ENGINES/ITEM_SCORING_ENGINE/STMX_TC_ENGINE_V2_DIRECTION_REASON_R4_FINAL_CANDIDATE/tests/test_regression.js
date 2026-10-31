'use strict';
/* TC V2 — full regression on the 114 governed units (+ the 126 member-level inputs): mandatory coverage, frozen V1 preservation (incl. pair / set units), former
   UNRESOLVED resolution, accuracy reported separately (GT joined after the engine decided), five critical cases individually, determinism. */
const H = require('./_harness'); const { ok, tally } = H;
const R1 = H.E.evaluateCorpus(), R2 = H.E.evaluateCorpus(); const units = H.F.corpusUnits(); const GT = H.gt(); const RC = H.researchOptionC();
const valid = R1.filter((r) => r.ok);
ok('RG-01', '114 governed units → every result ok and CLASSIC / TRANSFORMATIVE (coverage 100%)', R1.length === 114 && valid.length === 114 && valid.every((r) => ['CLASSIC', 'TRANSFORMATIVE'].includes(r.direction) && ['CLASSIC', 'TRANSFORMATIVE'].includes(r.customer.direction)), H.tally(R1, (r) => r.direction));
ok('RG-02', 'final Neutral / UNRESOLVED / NOT_SCORABLE / null = 0', valid.filter((r) => !['CLASSIC', 'TRANSFORMATIVE'].includes(r.direction)).length === 0);
ok('RG-03', 'frozen census reproduced (C 44 · T 53 · UNRESOLVED 17)', JSON.stringify(H.F.census()) === JSON.stringify({ CLASSIC: 44, TRANSFORMATIVE: 53, DIRECTION_UNRESOLVED: 17 }) || (H.F.census().CLASSIC === 44 && H.F.census().TRANSFORMATIVE === 53 && H.F.census().DIRECTION_UNRESOLVED === 17), H.F.census());
const decided = units.filter((u) => u.v1_direction !== 'DIRECTION_UNRESOLVED'); const changed = decided.filter((u) => { const r = R1.find((x) => x.unit === u.anchor); return r.direction !== u.v1_direction || r.trace.path !== 'FROZEN_V1'; });
ok('RG-04', 'existing frozen C / T (97) carried verbatim on path FROZEN_V1 — unintended changes 0', decided.length === 97 && changed.length === 0, changed.map((u) => u.anchor));
const pairs = units.filter((u) => u.members.length > 1); const pairBad = pairs.filter((u) => { const r = R1.find((x) => x.unit === u.anchor); return r.trace.path !== 'FROZEN_V1' || r.direction !== u.v1_direction; });
ok('RG-05', 'pair / set units (' + pairs.length + ') keep the frozen unit Direction (frozen pair rule, never re-derived member-wise)', pairs.length === 11 && pairBad.length === 0, pairBad.map((u) => u.anchor));
const former = units.filter((u) => u.v1_direction === 'DIRECTION_UNRESOLVED'); const fr = former.map((u) => R1.find((x) => x.unit === u.anchor));
ok('RG-06', 'former UNRESOLVED (17) → CLASSIC / TRANSFORMATIVE through a successor path only', former.length === 17 && fr.every((r) => ['CLASSIC', 'TRANSFORMATIVE'].includes(r.direction) && r.trace.path !== 'FROZEN_V1' && r.trace.provisional === true), tally(fr, (r) => r.trace.path));
const vsResearch = R1.filter((r) => RC.get(r.unit) !== r.direction);
ok('RG-07', 'candidate Direction == the research Option C simulation on all 114 units (implementation reproduces the analysed design)', vsResearch.length === 0, vsResearch.map((r) => r.unit));
ok('RG-08', 'deterministic: two full evaluations identical (Direction · path · Reason)', JSON.stringify(R1.map((r) => [r.unit, r.direction, r.trace.path, r.customer.reason])) === JSON.stringify(R2.map((r) => [r.unit, r.direction, r.trace.path, r.customer.reason])));
ok('RG-09', 'every Reason verified (VERIFIED or FALLBACK_VERIFIED); withheld 0', valid.every((r) => ['VERIFIED', 'FALLBACK_VERIFIED'].includes(r.reason_status)), tally(valid, (r) => r.reason_status));
/* member-level harness (126 inputs) */
const members = [].concat(...units.map((u) => u.members.map((m) => ({ u, m })))); const repro = members.filter(({ m }) => H.F.reproduces(m)); const residual = members.filter(({ m }) => !H.F.reproduces(m));
ok('RG-10', '126 member inputs: 120 reproduce the frozen channel verdicts; the 6 residual are all in V1-decided units; every former-UNRESOLVED member reproduces', members.length === 126 && repro.length === 120 && residual.every(({ u }) => u.v1_direction !== 'DIRECTION_UNRESOLVED') && former.every((u) => u.members.every((m) => H.F.reproduces(m))), { reproduce: repro.length, residual: residual.map(({ m }) => m.record.anchor_id) });
/* accuracy (reported; GT joined after) */
const side = (a) => (GT.get(a) || {}).side; const cmp = valid.filter((r) => ['CLASSIC', 'TRANSFORMATIVE'].includes(side(r.unit)));
const acc = { compared: cmp.length, agree: cmp.filter((r) => r.direction === side(r.unit)).length };
const v1cmp = decided.filter((u) => ['CLASSIC', 'TRANSFORMATIVE'].includes(side(u.anchor))); const v1acc = { compared: v1cmp.length, agree: v1cmp.filter((u) => u.v1_direction === side(u.anchor)).length };
const newCmp = fr.filter((r) => ['CLASSIC', 'TRANSFORMATIVE'].includes(side(r.unit))); const newAcc = { compared: newCmp.length, agree: newCmp.filter((r) => r.direction === side(r.unit)).length, opposite: newCmp.filter((r) => r.direction !== side(r.unit)).map((r) => r.unit) };
const preOpp = v1cmp.filter((u) => u.v1_direction !== side(u.anchor)).map((u) => u.anchor);
ok('RG-11', 'accuracy measured and reported separately from coverage (V1 decided · new mandatory · total)', acc.compared === 114, { total: acc, v1_decided: v1acc, new_mandatory: newAcc, pre_existing_opposite: preOpp });
const CRIT = ['REF_000139#SU1', 'REF_000141#SU1', 'REF_000430#SU1', 'REF_000469#SU1', 'REF_000599#SU1'];
const crit = CRIT.map((a) => { const r = R1.find((x) => x.unit === a); return { unit: a, direction: r.direction, path: r.trace.path, policy: r.trace.policy, fallback_basis: r.trace.fallback_basis, missing: r.trace.missing_fields, gt: (GT.get(a) || {}).gt, agrees: r.direction === side(a), reason: r.customer.reason }; });
ok('RG-12', 'five critical cases reported individually; none reaches T through a proxy (430 stays Classic with its open candidate cited)', crit.length === 5 && crit.find((c) => c.unit === 'REF_000430#SU1').direction === 'CLASSIC' && /소매 볼륨이 풍성한 편으로 관측되지만/.test(crit.find((c) => c.unit === 'REF_000430#SU1').reason), crit.map((c) => c.unit + ' ' + c.direction + ' ' + c.path));
const ze = valid.filter((r) => r.trace.path === 'ZERO_EVIDENCE');
ok('RG-13', 'zero-evidence path on real governed units reported (expected 0 — every unit has an observed carrier)', ze.length === 0, ze.map((r) => r.unit));
const row = (r) => ({ unit: r.unit, scoring_unit_type: r.scoring_unit_type, v1: r.trace.v1_direction, direction: r.direction, path: r.trace.path, policy: r.trace.policy, fallback_basis: r.trace.fallback_basis, missing: r.trace.missing_fields, opposing: r.trace.opposing_evidence, di: r.trace.domain_invariance ? r.trace.domain_invariance.map((d) => d.verdict || d.why) : null, reason: r.customer.reason, reason_status: r.reason_status, gt: (GT.get(r.unit) || {}).gt || null, gt_side: side(r.unit) || null });
H.summary('test_regression', { distribution: tally(valid, (r) => r.direction), paths: tally(valid, (r) => r.trace.path), accuracy: { total: acc, v1_decided: v1acc, new_mandatory: newAcc, pre_existing_opposite: preOpp }, critical: crit, member_harness: { reproduce: repro.length, residual: residual.map(({ m, u }) => ({ member: m.record.anchor_id + '|' + m.record.garment_ref, unit_v1: u.v1_direction })) }, rows: valid.map(row) });
