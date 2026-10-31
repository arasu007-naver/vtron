'use strict';
/* DM V2 — 27-cell Primitive lattice: monotonicity (raising any Primitive never turns D into M), internal composition never moves a Direction, cell map. */
const H = require('./_harness'); const { ok, ORD } = H;
const cell = {}; const byPair = {};
ORD.size.forEach((s) => ORD.contrast.forEach((c) => ORD.spatial.forEach((sp) => { const k = s + '|' + c + '|' + sp;
  const ds = H.REALP.map((pair) => H.E.evaluate(H.mk(H.o_, H.m1r, s, c, sp, pair))); byPair[k] = [...new Set(ds.map((r) => r.customer.direction))]; cell[k] = ds[1].customer.direction; })));
const viol = []; Object.keys(cell).forEach((k) => { const [s, c, sp] = k.split('|'); [['size', s], ['contrast', c], ['spatial', sp]].forEach(([dim, v]) => { const i = ORD[dim].indexOf(v); if (i < 2) { const nk = [dim === 'size' ? ORD.size[i + 1] : s, dim === 'contrast' ? ORD.contrast[i + 1] : c, dim === 'spatial' ? ORD.spatial[i + 1] : sp].join('|'); if (cell[k] === 'D' && cell[nk] === 'M') viol.push(k + ' → ' + nk); } }); });
ok('LT-01', '27 cells, every cell D or M', Object.keys(cell).length === 27 && Object.values(cell).every((d) => ['D', 'M'].includes(d)));
ok('LT-02', 'monotonicity: raising any one Primitive never turns D into M (violations 0)', viol.length === 0, viol);
ok('LT-03', 'internal composition (5 states) never changes a cell Direction', Object.values(byPair).every((v) => v.length === 1), Object.entries(byPair).filter(([, v]) => v.length > 1).map(([k]) => k));
const D = Object.keys(cell).filter((k) => cell[k] === 'D');
const expectD = Object.keys(cell).filter((k) => { const [s, c, sp] = k.split('|'); return ['medium', 'large'].includes(s) && (c === 'high' || (['medium', 'high'].includes(c) && ['distributed', 'whole_garment'].includes(sp))); });
ok('LT-04', 'D cells = exactly the D1 definition (real extent AND (clear OR moderate beyond one place))', JSON.stringify(D.sort()) === JSON.stringify(expectD.sort()), { D: D.length, expected: expectD.length });
ok('LT-05', 'small size never D; low contrast never D (single readings)', Object.keys(cell).filter((k) => /^small\||\|low\|/.test(k)).every((k) => cell[k] === 'M'));
H.summary('test_lattice', { cells: cell, D_cells: D.length, M_cells: 27 - D.length, violations: viol });
