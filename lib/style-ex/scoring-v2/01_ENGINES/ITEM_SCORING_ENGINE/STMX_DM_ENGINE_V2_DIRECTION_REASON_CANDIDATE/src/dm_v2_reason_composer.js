'use strict';
/**
 * STMX DM V2 — Korean Reason composer (1–2 sentences). Cites only OBSERVED Primitive readings of admitted systems, by provenance path
 * `dm_designed_detail_evidence.evidence.<i>.<relative_size|contrast|spatial_position>`; an unread Primitive is named only as a limitation.
 * Forms follow the design composer (four-axis closure D8 / SR-DM design V2 D7); one correction: the medium-contrast D tail states the OBSERVED placement
 * (the design wrote "옷 전체에 걸쳐" also for a distributed system). compose() = primary · fallback() = generic grounded form used when the primary fails.
 */
const L = require('./dm_v2_reason_lexicon');
const R = require('./dm_v2_direction_resolver');
const { josa } = L;
const fam = (e) => L.FAMILY[e.evidence_family] || L.FAMILY_DEFAULT;
const one = (r) => (r && r.resolved && r.values.length === 1 ? r.values[0] : null);
const rank = (prim, v) => R.ORD[prim].indexOf(v);
const ph = (param, r, i) => { const a = L.allowed(param, r); return a[i] !== undefined ? a[i] : a[0] || null; };
const clauseOf = (adm, e, param, kind, phrase) => { const i = adm.evidence.indexOf(e); const n = (e.raw && e.raw[param]) || null;
  return { role: 'decisive', kind, param, phrase, provenance: { path: 'dm_designed_detail_evidence.evidence.' + i + '.' + param, evidence_id: e.evidence_id, state: n ? n.state : 'MISSING', value: n ? (n.value !== undefined ? n.value : (n.min !== undefined ? { min: n.min, max: n.max } : null)) : null } }; };
const END_D = ' 옷의 인상을 이끄는 디자인 요소가 되어 Detail 방향으로 판단됩니다.', END_M = ' Minimal 방향으로 판단됩니다.';
const M0_TEXT = '등록된 디자인 디테일 시스템이 관측되지 않은 기본 구성이라 Minimal 방향으로 판단됩니다.';
const Z0_TEXT = '등록된 디자인 요소는 있지만 크기와 대비, 배치 범위가 사진에서 확인되지 않아 디테일의 영향을 관측 근거로 설명할 수 없습니다. 확인되지 않은 특징을 근거로 삼지 않고, 제한된 정보에 따른 기본 분류로 Minimal 방향으로 표시됩니다.';
function composeD(adm, d, withTail) {
  const e = d.decisive.slice().sort((a, b) => (rank('contrast', one(b.contrast)) - rank('contrast', one(a.contrast))) || (rank('size', one(b.size)) - rank('size', one(a.size))))[0];
  const sp = one(e.spatial); const spW = sp ? ph('spatial_position', e.spatial, 0) : null; const szW = ph('relative_size', e.size, 0); const cw = ph('contrast', e.contrast, 0);
  const np = [spW, szW, fam(e)].filter(Boolean).join(' '); const medium = one(e.contrast) === 'medium';
  const tailW = withTail && medium && e.spatial.resolved ? ph('spatial_position', e.spatial, 1) : null;
  const clauses = [clauseOf(adm, e, 'contrast', 'QUALIFYING_SYSTEM', cw)].concat(szW ? [clauseOf(adm, e, 'relative_size', 'QUALIFYING_SYSTEM', szW)] : [], spW ? [clauseOf(adm, e, 'spatial_position', 'QUALIFYING_SYSTEM', spW)] : [], tailW ? [clauseOf(adm, e, 'spatial_position', 'QUALIFYING_SYSTEM', tailW)] : []);
  return { text: np + josa(np, '이', '가') + ' ' + cw + (tailW ? ' ' + tailW : '') + END_D, clauses, form: withTail ? 'D_PRIMARY' : 'D_FALLBACK' };
}
/* M: the non-qualifying cause of one admitted system (design forms), else null */
function causeM(adm, e) { const r = R.qualSettled(e); const sz = one(e.size), ct = one(e.contrast), sp = one(e.spatial); const spW = sp ? ph('spatial_position', e.spatial, 0) : null;
  if (ct === 'low') { const w = [spW, sz ? ph('relative_size', e.size, 0) : null, fam(e)].filter(Boolean).join(' '); const p = ph('contrast', e.contrast, 0);
    return { kind: 'tonal', np: w, conn: w + josa(w, '은', '는') + ' ' + p + ' 디테일로 두드러지지 않고', fin: w + josa(w, '이', '가') + ' ' + p + ' 디테일로 두드러지지 않아', used: [['contrast', p]].concat(sz ? [['relative_size', ph('relative_size', e.size, 0)]] : [], sp ? [['spatial_position', spW]] : []) }; }
  if (sz === 'small') { const w = [spW, fam(e)].filter(Boolean).join(' '); const p = ph('relative_size', e.size, 1);
    return { conn: w + josa(w, '은', '는') + ' ' + p + '이고', fin: w + josa(w, '이', '가') + ' ' + p + '여서 옷 전체 인상에 주는 영향이 제한적이라', used: [['relative_size', p]].concat(sp ? [['spatial_position', spW]] : []) }; }
  if (r.s.open === 'RANGE' && r.s.value === 'small') { const w = [spW, fam(e)].filter(Boolean).join(' '); const p = ph('relative_size', e.size, 1); const cp = ct === 'high' ? ph('contrast', e.contrast, 1) : null; const pre = w + josa(w, '은', '는') + ' ' + (cp ? cp + ' ' : '');
    return { conn: pre + p + ' 관측되고', fin: pre + p + ' 관측되어 옷 전체 인상을 이끌 만큼 크다고 보기 어려워', used: [['relative_size', p]].concat(cp ? [['contrast', cp]] : [], sp ? [['spatial_position', spW]] : []) }; }
  if (sp === 'localized' && ct === 'medium' && sz) { const sw = ph('relative_size', e.size, 0); const w = spW + ' ' + sw + ' ' + fam(e); const p = ph('contrast', e.contrast, 1);
    return { conn: w + josa(w, '은', '는') + ' ' + p, fin: w + josa(w, '이', '가') + ' ' + p + ' 한 곳에 머물러 옷 전체를 이끌지 않아', used: [['relative_size', sw], ['contrast', p], ['spatial_position', spW]] }; }
  return null; }
/* M fallback: name what was observed and what was not, claim nothing else */
const M_CONTRAST_IDX = { high: 1, medium: 2, low: 1, 'medium/high': 1, 'low/medium': 1, 'low/medium/high': 0 };
function causeMFallback(e) { const spW = e.spatial.resolved ? ph('spatial_position', e.spatial, 0) : null; const szW = e.size.resolved ? ph('relative_size', e.size, 0) : null;
  const np = [spW, szW, fam(e)].filter(Boolean).join(' '); const cp = e.contrast.resolved ? ph('contrast', e.contrast, M_CONTRAST_IDX[L.keyOf(e.contrast)] || 0) : null;
  const missing = [['relative_size', e.size], ['contrast', e.contrast], ['spatial_position', e.spatial]].filter(([, r]) => !r.resolved).map(([p]) => p);
  const mw = missing.map((p) => L.LIMIT[p]); const mp = mw.length ? (mw.length === 1 ? mw[0] : mw.slice(0, -1).join(', ') + josa(mw[mw.length - 2], '과', '와') + ' ' + mw[mw.length - 1]) : null;
  const body = np + josa(np, '은', '는') + ' ' + (cp ? cp + ' ' : '') + (mp ? mp + josa(mp, '이', '가') + ' 사진에서 확인되지 않아 ' : '') + '옷 전체 인상을 이끄는 디테일이라고 보기 어려';
  return { conn: body + '우며', fin: body + '워', used: [].concat(szW ? [['relative_size', szW]] : [], cp ? [['contrast', cp]] : [], spW ? [['spatial_position', spW]] : []), limits: missing.map((p) => [p, L.LIMIT[p]]) }; }
function composeM(adm, d, primary) {
  const prom = (e) => [rank('size', one(e.size)), rank('spatial', one(e.spatial)), rank('contrast', one(e.contrast))];
  const cmp = (a, b) => { const x = prom(a), y = prom(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; };
  const ordered = d.decisive.slice().sort(cmp);
  const cands = ordered.slice(0, 2).map((e) => ({ e, c: (primary ? causeM(adm, e) : null) || causeMFallback(e) }));
  const both = cands.length === 2 && cands[0].c.kind === 'tonal' && cands[1].c.kind === 'tonal';
  const text = (both ? cands[0].c.np + josa(cands[0].c.np, '과', '와') + ' ' + cands[1].c.np + josa(cands[1].c.np, '이', '가') + ' 모두 ' + L.allowed('contrast', cands[1].e.contrast)[0] + ' 디테일로 두드러지지 않아' : cands.length === 2 ? cands[0].c.conn + ' ' + cands[1].c.fin : cands[0].c.fin) + END_M;
  const clauses = [].concat(...cands.map(({ e, c }) => c.used.map(([p, w]) => clauseOf(adm, e, p, 'NON_QUALIFYING_SYSTEM', w)).concat((c.limits || []).map(([p, w]) => clauseOf(adm, e, p, 'LIMITATION', w)))));
  if (both) clauses.forEach((cl) => { if (cl.param === 'contrast') cl.phrase = L.allowed('contrast', cands[0].e.contrast)[0]; });
  return { text, clauses, most_prominent_cited: cands[0].e === ordered[0], form: primary ? 'M_PRIMARY' : 'M_FALLBACK' };
}
function composeZ0(adm, d) { return { text: Z0_TEXT, clauses: [].concat(...d.decisive.map((e) => ['relative_size', 'contrast', 'spatial_position'].map((p) => clauseOf(adm, e, p, 'LIMITATION', L.LIMIT[p])))), form: 'Z0_LIMITATION' }; }
function compose(adm, d) { if (d.rule === 'DM-V2-M0') return { text: M0_TEXT, clauses: [{ role: 'decisive', kind: 'EVIDENCE_EMPTY', param: null, phrase: null, provenance: { path: 'dm_designed_detail_evidence.evidence', state: 'OBSERVED_EMPTY', value: [] } }], form: 'M0' };
  if (d.rule === 'DM-V2-Z0') return composeZ0(adm, d); return d.direction === 'D' ? composeD(adm, d, true) : composeM(adm, d, true); }
function fallback(adm, d) { if (d.rule === 'DM-V2-M0' || d.rule === 'DM-V2-Z0') return compose(adm, d); return d.direction === 'D' ? composeD(adm, d, false) : composeM(adm, d, false); }
module.exports = { compose, fallback, M0_TEXT, Z0_TEXT };
