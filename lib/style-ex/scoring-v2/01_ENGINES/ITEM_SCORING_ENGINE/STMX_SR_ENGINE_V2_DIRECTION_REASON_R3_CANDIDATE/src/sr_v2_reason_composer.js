'use strict';
/**
 * STMX SR V2 — VISION-GROUNDED REASON COMPOSER
 * Receives the DECIDED Direction and its decisive / opposing evidence tokens; turns each token into a clause only when the
 * record actually carries the OBSERVED value (value read from the record, never from the token). At most 1 opposing clause
 * (concessive) + 3 decisive clauses; unobserved decisive carriers become one limitation clause ("…은 확인되지 않지만").
 * ⛔ The composer never decides a Direction and never invents a value.
 */
const L = require('./sr_v2_reason_lexicon');
const { obsAt } = require('./sr_v2_evidence');
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
const TOK2PARAM = (t) => (/^FIT_/.test(t) ? 'fit' : /^SHOULDER_DROPPED/.test(t) ? 'shoulder_drop' : /^SHOULDER_/.test(t) ? 'shoulder_structure' : /^WAIST_/.test(t) ? 'waist_definition' : /^FABRIC_/.test(t) ? 'fabric_behavior' : /^GEOMETRY_/.test(t) ? 'silhouette' : /^MATERIAL_/.test(t) ? 'material' : /^SURFACE_/.test(t) ? 'surface' : null);
function clause(record, param, region, wantValue, form, cat, oneP, LX) { const o = obsAt(record, param, region); let v = o.value;
  if (param === 'material' || param === 'surface') { if (o.state !== 'OBSERVED' || !Array.isArray(v) || !v.includes(wantValue)) return null; v = wantValue; }
  else if (o.state !== 'OBSERVED' || v === null || (wantValue && v !== wantValue)) return null;
  const e = LX[param] && LX[param][v]; if (!e) return null;
  return { param, region: region || null, value: v, text: e[{ c: 0, r: 1, k: 2 }[form]], form, region_label: oneP && region ? L.REGION_LABEL(region, cat) : null, provenance: { path: o.path, state: o.state, value: v } }; }
function tokClause(record, x, form, cat, oneP, LX) { if (x.t === 'FIT_REGULAR') return clause(record, 'fit', x.rg, 'Regular', form, cat, oneP, LX);
  if (x.t === 'SHOULDER_LINE_HELD') return clause(record, 'shoulder_drop', x.rg, 'None', form, cat, oneP, LX);
  if (x.t === 'SLEEVE_VOLUMINOUS_SOFT') return clause(record, 'sleeve_volume', null, 'Voluminous', form, cat, oneP, LX);   // R3
  if (x.t === 'SILHOUETTE_HELD') { const o = obsAt(record, 'silhouette', null); return o.state === 'OBSERVED' && ['Straight', 'Tapered', 'Narrowing'].includes(o.value) ? clause(record, 'silhouette', null, o.value, form, cat, oneP, LX) : null; }
  const p = TOK2PARAM(x.t); if (!p) return null; const want = p === 'material' || p === 'surface' ? (Object.keys(LX[p]).find((v) => x.t === p.toUpperCase() + '_' + v.toUpperCase().replace(/[^A-Z0-9]+/g, '_')) || '__NO_LEXICON__') : null; return clause(record, p, ['fit', 'fabric_behavior'].includes(p) ? x.rg : null, want, form, cat, oneP, LX); }
/**
 * @param record   the received record
 * @param d        resolver output { direction, decisive, opposing, limitations }
 * @param cat      category · @param oneP one-piece · @param worn  true only when eligibility metadata = ADJUDICABLE_WORN
 */
function compose(record, d, cat, oneP, worn) { const LX = worn ? L.WORN : L.FLAT; const seen = new Set();
  const pick = (list, form) => list.map((x) => tokClause(record, x, form, cat, oneP, LX)).filter((c) => c && !seen.has(c.provenance.path + c.value) && seen.add(c.provenance.path + c.value));
  const decAll = pick(d.decisive, 'c'); const dec = decAll.slice(0, 3); const oppAll = pick(d.opposing || [], 'k'); const opp = oppAll.slice(0, 1);
  /* a limitation clause names a carrier whose GOVERNED reading is not established: the record node is unobserved, or it is OBSERVED
     with a value outside the bound contract domain (the frozen adapter reads that as UNKNOWN, never coerced) */
  const limC = []; const ls = new Set(); (d.limitations || []).forEach((l) => { if (ls.has(l.param)) return; ls.add(l.param); const o = obsAt(record, l.param, l.rg); limC.push({ role: 'limitation', param: l.param, region: l.rg, provenance: { path: o.path, state: o.state, governed_state: o.state === 'OBSERVED' ? 'OUT_OF_DOMAIN' : o.state, raw_value: o.state === 'OBSERVED' ? o.value : null, value: null } }); });
  const limText = limC.length ? '사진에서 ' + limC.map((c) => L.LIMITATION_NAMES[c.param]).join('과 ') + josa(L.LIMITATION_NAMES[limC[limC.length - 1].param], '은', '는') + ' 확인되지 않지만' : null;
  /* SR-V2-Z0: no directional SR carrier — limitation-only statement. It names only unobserved carriers (limC) and, when a drape cloth is observed,
     acknowledges it in concessive form (it is real, but never decides alone). No decisive physical clause exists. */
  if (d.rule === 'SR-V2-Z0') { const names = [...new Set(limC.map((c) => L.LIMITATION_NAMES[c.param]))]; const fab = oppAll.find((c) => c.param === 'fabric_behavior');
    return { text: L.zeroEvidenceText(names, fab ? fab.text : null), worn, zero_evidence: true, grounding: 'LIMITATION_ONLY', decisive_groundable: 0, decisive_cited: 0, opposing_groundable: oppAll.length, clauses: limC.concat(fab ? [Object.assign({ role: 'opposing' }, fab)] : []) }; }
  if (!dec.length) return { text: null, clauses: [], failure: 'NO_GROUNDABLE_DECISIVE_CLAUSE', opposing_groundable: oppAll.length };
  dec[dec.length - 1] = Object.assign({}, dec[dec.length - 1], { text: LX[dec[dec.length - 1].param][dec[dec.length - 1].value][1], form: 'r' });
  let lastRegion = null; const say = (c) => { const pre = c.region_label && c.region_label !== lastRegion ? c.region_label + ' ' : ''; lastRegion = c.region_label || lastRegion; return pre + c.text; };
  const parts = (limText ? [limText] : []).concat(opp.map(say), dec.map(say)); const text = parts.join(' ') + L.ENDINGS[worn ? 'WORN' : 'FLAT'][d.direction];
  return { text, worn, grounding: 'PHYSICAL', decisive_groundable: decAll.length, decisive_cited: dec.length, opposing_groundable: oppAll.length, clauses: limC.concat(opp.map((c) => Object.assign({ role: 'opposing' }, c)), dec.map((c) => Object.assign({ role: 'decisive' }, c))) }; }
module.exports = { compose, clause, tokClause, TOK2PARAM, josa };
