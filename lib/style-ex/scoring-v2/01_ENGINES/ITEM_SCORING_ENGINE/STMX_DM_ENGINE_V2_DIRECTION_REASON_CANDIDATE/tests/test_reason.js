'use strict';
/* DM V2 — Reason grounding: every valid output's Reason re-verified against the received block; mutation guards on real outputs must be caught. */
const H = require('./_harness'); const { ok, clone } = H; const V = require('../src/dm_v2_reason_verifier'); const L = require('../src/dm_v2_reason_lexicon');
const rows = H.run([].concat(H.pop75(), H.pop77(), H.pop220(), H.popLive())).filter((r) => r.result.ok);
const dOf = (r) => ({ direction: r.result.customer.direction, rule: r.result.decisive_rule_id });
const reasonOf = (r) => ({ text: r.result.customer.reason, clauses: r.result.reason_clauses });
const reverify = rows.filter((r) => V.verify(clone(r.block), dOf(r), reasonOf(r)).length);
ok('RS-01', 'every valid output\'s Reason re-verifies against the received block (75 · 77 · 220 · live)', reverify.length === 0, reverify.map((r) => r.id));
ok('RS-02', 'every Reason states its Direction label and no internal / GT / tier / rule term; ≤ 2 sentences', rows.every((r) => (r.v2 === 'D' ? /Detail 방향/ : /Minimal 방향/).test(r.reason) && !L.INTERNAL.test(r.reason) && (r.reason.match(/다\./g) || []).length <= 2));
const M = { removed: [0, 0], flipped: [0, 0], cross_axis: [0, 0], range_as_definite: [0, 0], foreign_copy: [0, 0], direction_missing: [0, 0], d_label_on_m: [0, 0], value_swap: [0, 0], internal_term: [0, 0], limitation_on_observed: [0, 0], extra_sentence: [0, 0] };
const hit = (k, caught) => { M[k][0]++; if (caught) M[k][1]++; };
rows.forEach((r) => { const b = r.block, d = dOf(r), rs = reasonOf(r); const c0 = rs.clauses.find((c) => c.kind !== 'EVIDENCE_EMPTY' && c.kind !== 'LIMITATION');
  if (c0) { const bb = clone(b); const i = Number(c0.provenance.path.split('.')[2]); bb.evidence[i][c0.param] = { state: 'UNKNOWN', value: null }; hit('removed', V.verify(bb, d, rs).length > 0); }
  hit('flipped', V.verify(b, Object.assign({}, d, { direction: d.direction === 'D' ? 'M' : 'D' }), rs).length > 0);
  hit('cross_axis', V.verify(b, d, { text: rs.text, clauses: rs.clauses.concat([{ kind: 'QUALIFYING_SYSTEM', param: 'fit', phrase: '슬림', provenance: { path: 'observations.fit', state: 'OBSERVED', value: 'Slim' } }]) }).length > 0);
  const rc = rs.clauses.find((c) => c.provenance && c.provenance.value && typeof c.provenance.value === 'object' && c.phrase);
  if (rc) { const single = rc.param === 'relative_size' ? '큰' : rc.param === 'contrast' ? '주변과 선명하게 대비되어' : '옷 전체에 걸친'; hit('range_as_definite', V.verify(b, d, { text: rs.text.replace(rc.phrase, single), clauses: rs.clauses.map((c) => (c === rc ? Object.assign({}, c, { phrase: single }) : c)) }).length > 0); }
  const foreign = rows.find((q) => q !== r && q.v2 === r.v2 && q.reason !== r.reason && V.verify(b, d, reasonOf(q)).length > 0); if (foreign) hit('foreign_copy', true); else { const any = rows.find((q) => q !== r && q.reason !== r.reason && q.v2 === r.v2); if (any) hit('foreign_copy', V.verify(b, d, reasonOf(any)).length > 0 || JSON.stringify(any.block) === JSON.stringify(b)); }
  hit('direction_missing', V.verify(b, Object.assign({}, d, { direction: null }), rs).length > 0);
  if (d.direction === 'M') hit('d_label_on_m', V.verify(b, Object.assign({}, d, { direction: 'D' }), { text: rs.text.replace('Minimal 방향', 'Detail 방향'), clauses: rs.clauses }).length > 0);
  const vc = rs.clauses.find((c) => c.kind !== 'EVIDENCE_EMPTY' && c.kind !== 'LIMITATION' && typeof c.provenance.value === 'string');
  if (vc) { const dom = { relative_size: ['small', 'medium', 'large'], contrast: ['low', 'medium', 'high'], spatial_position: ['localized', 'distributed', 'whole_garment'] }[vc.param]; const other = dom.find((x) => x !== vc.provenance.value); hit('value_swap', V.verify(b, d, { text: rs.text, clauses: rs.clauses.map((c) => (c === vc ? Object.assign({}, c, { provenance: Object.assign({}, c.provenance, { value: other }) }) : c)) }).length > 0); }
  hit('internal_term', V.verify(b, d, { text: rs.text.replace('방향으로', '방향(DM7 단계)으로'), clauses: rs.clauses }).length > 0);
  if (c0) hit('limitation_on_observed', V.verify(b, d, { text: rs.text + ' ', clauses: rs.clauses.concat([Object.assign({}, c0, { kind: 'LIMITATION', phrase: L.LIMIT[c0.param] })]) }).length > 0);
  hit('extra_sentence', V.verify(b, d, { text: rs.text + ' 추가 설명입니다. 또 다른 설명입니다.', clauses: rs.clauses }).length > 0); });
[undefined, { evidence: [{ evidence_id: 'e1' }] }].forEach((b) => hit('removed', V.verify(b, { direction: 'M', rule: 'DM-V2-M1' }, { text: '등록된 디자인 디테일 시스템이 관측되지 않은 기본 구성이라 Minimal 방향으로 판단됩니다.', clauses: [{ kind: 'EVIDENCE_EMPTY', provenance: { path: 'dm_designed_detail_evidence.evidence' } }] }).length > 0));
Object.entries(M).forEach(([k, [n, c]]) => ok('RS-M-' + k, 'mutation "' + k + '" caught ' + c + ' / ' + n, n > 0 && c === n, { n, caught: c }));
H.summary('test_reason', { verified: rows.length, mutations: M, distinct_texts: new Set(rows.map((r) => r.reason)).size, forms: H.tally(rows, (r) => r.result.reason_form), status: H.tally(rows, (r) => r.reason_status) });
