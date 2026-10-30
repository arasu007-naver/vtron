'use strict';
// STMX_TC_STEP2_EVALUATOR_V2_2 — versioned; sealed before the clean run. Generic; no REF id, no stored score.
const EVALUATOR_VERSION = 'STMX_TC_STEP2_EVALUATOR_V2_2 · r1';
function f(o, p) { const x = o && o[p]; if (x === undefined || x === null) return { present: false, state: 'NOT_APPLICABLE' }; if (x.state !== 'OBSERVED') return { present: true, observed: false, state: x.state }; return { present: true, observed: true, state: 'OBSERVED', value: x.value != null ? String(x.value) : (x.values ? x.values.map((v) => (v && typeof v === 'object') ? v.value : v).filter(Boolean).slice().sort().join('+') : null) }; }
const V = (o, p) => { const x = f(o, p); return x.observed ? x.value : (x.present ? '<' + x.state + '>' : 'n/a'); };
const TOPS = ['tshirt', 'shirt', 'sweater', 'sweatshirt'];

// SILHOUETTE — unchanged (frozen ladder · Q1 · Q3 · preserved morphology)
function silh(o) {
  const fit = f(o, 'fit'), sv = f(o, 'sleeve_volume'), sh = f(o, 'shoulder_structure'), sp = f(o, 'shoulder_span');
  if (fit.observed && fit.value === 'Oversized') return { v: 'TRUE', rule: 'SIL-TRUE-OVERSIZED', why: 'fit = Oversized — frozen TRUE', carrier: 'fit', strong: false };
  const ev = []; if (sv.observed && sv.value === 'Voluminous') ev.push('sleeve_volume = Voluminous'); if (sh.observed && (sh.value === 'Strong' || sh.value === 'Extreme')) ev.push('shoulder_structure = ' + sh.value); if (sp.observed && sp.value === 'Extended') ev.push('shoulder_span = Extended');
  if (ev.length) return { v: 'UNRESOLVED', rule: 'SIL-MORPH', why: 'preserved departure-eligible morphology: ' + ev.join(' · '), carrier: ev.join('+') };
  if (fit.observed && ['Regular', 'Relaxed'].includes(fit.value)) return { v: 'FALSE', rule: 'SIL-FALSE-LADDER', why: 'fit = ' + fit.value, carrier: 'fit' };
  if (fit.observed && fit.value === 'Slim') return { v: 'FALSE', rule: 'SIL-FALSE-SLIM-Q1', why: 'fit = Slim — CEO Q1', carrier: 'fit' };
  if (fit.observed && fit.value === 'Voluminous') return { v: 'FALSE', rule: 'SIL-FALSE-VOLUM-Q3', why: 'fit = Voluminous — CEO Q3', carrier: 'fit' };
  if (fit.present) return { v: 'UNRESOLVED', rule: 'SIL-STATE', why: 'fit state = ' + fit.state, carrier: 'fit' };
  return { v: 'UNRESOLVED', rule: 'SIL-NA', why: 'fit not applicable', carrier: null };
}
// PROPORTION — envelopes (Q2/Q5/Q6/Q7). Asymmetry no longer touches the channel (§6 makes it an ownerless departure).
const ENVELOPE = {
  tshirt: { FALSE: ['Regular', 'Long'], TRUE: ['Cropped'], q: 'Q7' }, shirt: { FALSE: ['Regular', 'Long'], TRUE: ['Cropped'], q: 'Q7' }, sweater: { FALSE: ['Regular', 'Long'], TRUE: ['Cropped'], q: 'Q7' }, sweatshirt: { FALSE: ['Regular', 'Long'], TRUE: ['Cropped'], q: 'Q7' },
  trouser: { FALSE: ['Short', 'Knee Length', 'Calf', 'Ankle', 'Full Length', 'Extended Length'], TRUE: [], q: 'Q2' }, jumpsuit: { FALSE: ['Short', 'Knee Length', 'Calf', 'Ankle', 'Full Length', 'Extended Length'], TRUE: [], q: 'Q2' },
  skirt: { FALSE: ['Mini', 'Midi', 'Maxi Length'], TRUE: [], q: 'Q2' }, dress: { FALSE: ['Mini', 'Midi', 'Maxi Length'], TRUE: [], q: 'Q2' },
  'JACKET:Tailored': { FALSE: ['Hip Length'], TRUE: ['Waist Length', 'Cropped'], q: 'Q5' }, 'JACKET:Casual': { FALSE: ['Waist Length', 'Hip Length'], TRUE: ['Cropped'], q: 'Q5' }, 'JACKET:Utility': { FALSE: ['Waist Length', 'Hip Length'], TRUE: ['Cropped'], q: 'Q5' },
  'COAT:Tailored': { FALSE: ['Hip Length', 'Thigh Length', 'Knee Length', 'Maxi Length'], TRUE: [], q: 'Q6' }, 'COAT:Casual': { FALSE: ['Hip Length', 'Thigh Length', 'Knee Length', 'Maxi Length'], TRUE: [], q: 'Q6' }, 'COAT:Utility': { FALSE: ['Hip Length', 'Thigh Length', 'Knee Length', 'Maxi Length'], TRUE: [], q: 'Q6' },
};
function prop(o, key) {
  const e = ENVELOPE[key]; if (!e) return { v: 'UNRESOLVED', rule: 'U-KEY', why: 'no key', carrier: null };
  const len = f(o, 'length');
  if (!len.observed) return { v: 'UNRESOLVED', rule: 'PRO-STATE', why: 'length state = ' + (len.present ? len.state : 'NOT_APPLICABLE'), carrier: 'length' };
  if (e.TRUE.includes(len.value)) return { v: 'TRUE', rule: 'PRO-TRUE-' + e.q, why: 'length = ' + len.value + ' on `' + key + '` (CEO ' + e.q + ')', carrier: 'length', strong: false };
  if (e.FALSE.includes(len.value)) return { v: 'FALSE', rule: 'PRO-FALSE-' + e.q, why: 'length = ' + len.value + ' inside the conventional envelope (CEO ' + e.q + ')', carrier: 'length' };
  return { v: 'UNRESOLVED', rule: 'PRO-TOKEN-UNKNOWN', why: 'length = ' + len.value + ' not in domain', carrier: 'length' };
}
// CONSTRUCTION — Q8 + §4 (jacket) · G-1 + §5 (coat) · C-1 archetype-relative · §22/§23 sufficiency (V2.1, preserved)
const TAILORED = {
  'JACKET:Tailored': { sleeve: { TRUE: ['Sleeveless'] }, collar: { FALSE: ['Notched', 'Peak', 'Shawl'], TRUE: ['None', 'Stand', 'Shirt', 'Sailor', 'Peter Pan', 'Tie', 'Ruffle'] }, closure_type: { FALSE: ['Button', 'Single Breasted Button', 'Double Breasted Button'], TRUE: ['Zipper', 'Snap Button', 'Hook Closure', 'Open'] }, front_opening_extent: { FALSE: ['Full'], STRONG: ['Partial', 'None'] }, src: 'Q8 + V2.2 §4' },
  'COAT:Tailored': { sleeve: { TRUE: ['Sleeveless'] }, collar: { FALSE: ['Notched', 'Peak', 'Shawl'], TRUE: ['None', 'Stand', 'Shirt', 'Sailor', 'Peter Pan', 'Tie', 'Ruffle'] }, closure_type: { FALSE: ['Button', 'Single Breasted Button', 'Double Breasted Button'], TRUE: ['Zipper', 'Snap Button', 'Hook Closure', 'Open'] }, front_opening_extent: { FALSE: ['Full'], TRUE: ['Partial'], UNRESOLVED: ['None'] }, src: 'G-1 + V2.2 §5' },
};
const TSHIRT_NONCONV = { collar: ['Sailor', 'Peter Pan', 'Tie', 'Ruffle', 'Shawl', 'Notched', 'Peak', 'Stand'], front_opening_extent: ['Full'] };
const OPENWORK_SURFACE = ['Transparent', 'Semi Transparent', 'Lace', 'Mesh'];
const CONV_ATTACHMENT = { 'JACKET:Utility': ['Storm Flap', 'Belt', 'Epaulette', 'Metal Hardware'], 'COAT:Utility': ['Storm Flap', 'Belt', 'Epaulette', 'Metal Hardware'], 'COAT:Tailored': ['Belt'], 'COAT:Casual': ['Belt'], 'JACKET:Casual': ['Metal Hardware'] };
const CONV_VOLUMETRIC = ['trouser', 'JACKET:Utility', 'COAT:Utility'];
function representationGap(o, key) {
  const gaps = [];
  const mat = f(o, 'material'); if (mat.observed && mat.value && mat.value.includes('+')) gaps.push('material = ' + mat.value + ' — multi-material: C-3 candidate (firewall both ways)');
  const surf = f(o, 'surface'); if (surf.observed && surf.value) { const hit = surf.value.split('+').filter((v) => OPENWORK_SURFACE.includes(v)); if (hit.length) gaps.push('surface = ' + surf.value + ' — openwork / transparent body: R1 candidate'); }
  const att = f(o, 'attachment'); if (att.observed && att.value) { const conv = CONV_ATTACHMENT[key] || []; const out = att.value.split('+').filter((v) => !conv.includes(v)); if (out.length) gaps.push('attachment = ' + att.value + ' — ' + out.join('/') + ' outside this key\'s conventional set'); }
  const pp = f(o, 'pocket_projection'); if (pp.observed && pp.value === 'Volumetric' && !CONV_VOLUMETRIC.includes(key)) gaps.push('pocket_projection = Volumetric on `' + key + '` — component-system candidate');
  const sc = f(o, 'shoulder_connection'); if (sc.observed && sc.value !== 'Standard' && TOPS.includes(key)) gaps.push('shoulder_connection = ' + sc.value + ' on a TOP key — not adjudicated');
  return gaps;
}
function constr(o, key) {
  const T = TAILORED[key];
  if (T) {
    const fired = [], unres = []; let strong = false;
    for (const [p, r] of Object.entries(T)) { if (p === 'src') continue; const x = f(o, p); if (!x.observed) continue;
      if (r.STRONG && r.STRONG.includes(x.value)) { fired.push(p + ' = ' + x.value + ' — STRONG constitutive front-opening reconstruction (CEO §4.3/§4.4 → TC7)'); strong = true; }
      else if (r.TRUE && r.TRUE.includes(x.value)) fired.push(p + ' = ' + x.value + ' — constitutive ' + (p === 'sleeve' ? 'sleeve system removed' : p === 'collar' ? 'lapel system removed/replaced' : p === 'closure_type' ? 'closure system replaced/absent' : 'front opening reconstructed') + ' (' + T.src + ')');
      else if (r.UNRESOLVED && r.UNRESOLVED.includes(x.value)) unres.push(p + ' = ' + x.value + ' — not extended for `' + key + '` (§5.3)'); }
    if (fired.length) return { v: 'TRUE', rule: strong ? 'CON-TRUE-CONSTITUTIVE-STRONG' : 'CON-TRUE-CONSTITUTIVE', why: fired.join(' · '), carrier: fired.map((x) => x.split(' = ')[0]).join('+'), strong };
    const gaps = representationGap(o, key);
    if (unres.length || gaps.length) return { v: 'UNRESOLVED', rule: unres.length ? 'CON-UNRES-NOT-EXTENDED' : 'CON-UNRES-REPRESENTATION-GAP', why: unres.concat(gaps).join(' · '), carrier: unres.concat(gaps).map((x) => x.split(' = ')[0]).join('+') };
    return { v: 'FALSE', rule: 'CON-FALSE-C1-TAILORED', why: 'constitutive systems conventionally realised; every other carrier a conventional option; no relational candidate ⇒ C-1 FALSE', carrier: 'sleeve+collar+closure_type+front_opening_extent' };
  }
  if (key === 'tshirt') { const out = []; for (const [p, bad] of Object.entries(TSHIRT_NONCONV)) { const x = f(o, p); if (x.observed && bad.includes(x.value)) out.push(p + ' = ' + x.value + ' — outside the frozen t-shirt library (C-2 question)'); } if (out.length) return { v: 'UNRESOLVED', rule: 'CON-UNRES-C2-TSHIRT', why: out.join(' · '), carrier: out.map((x) => x.split(' = ')[0]).join('+') }; }
  const gaps = representationGap(o, key);
  if (gaps.length) return { v: 'UNRESOLVED', rule: 'CON-UNRES-REPRESENTATION-GAP', why: gaps.join(' · '), carrier: gaps.map((x) => x.split(' = ')[0]).join('+') };
  return { v: 'FALSE', rule: 'CON-FALSE-C1', why: 'every observed construction carrier a conventional option OF THIS KEY; no relational candidate ⇒ C-1 FALSE', carrier: 'all' };
}
// §6 ASYMMETRY — ownerless valid departure (not a fourth channel; owner unresolved)
function asymmetry(o) {
  const a = f(o, 'asymmetry');
  if (a.observed && a.value === 'Present') return { departure_exists: true, axis_owner: 'UNRESOLVED', rule: 'ASYM-DEPARTURE-OWNER-UNRESOLVED', why: 'asymmetry = Present (governed) — at least one valid TC Departure exists (CEO §6); S/P/C owner not recoverable from the generic carrier; not fabricated', carrier: 'asymmetry', strong: false };
  return { departure_exists: false, axis_owner: null, rule: null };
}
// Member-level direction
function direction(S, P, C, ASY) {
  const t = [S.v, P.v, C.v];
  if (t.includes('TRUE') || (ASY && ASY.departure_exists)) return 'TRANSFORMATIVE';
  if (t.every((x) => x === 'FALSE')) return 'CLASSIC';
  return 'DIRECTION_UNRESOLVED';
}
// §3 tier evidence — STRONG only where explicit
function tierEvidence(S, P, C, ASY, dir) {
  if (dir !== 'TRANSFORMATIVE') return null;
  const strong = [S, P, C].some((x) => x && x.v === 'TRUE' && x.strong) || (ASY && ASY.departure_exists && ASY.strong);
  return strong ? 'TC7' : 'TC6_MIN_EXACT_UNRESOLVED';
}
// §7 MATCHING_PAIR resolver — pair-level direction from member results
function pairDirection(members) {
  const dirs = members.map((m) => m.direction);
  if (dirs.includes('TRANSFORMATIVE')) return 'TRANSFORMATIVE';
  if (dirs.every((d) => d === 'CLASSIC')) return 'CLASSIC';
  return 'UNKNOWN_HOLD';
}
function pairTier(members, pdir) { if (pdir !== 'TRANSFORMATIVE') return null; return members.some((m) => m.tier_evidence === 'TC7') ? 'TC7' : 'TC6_MIN_EXACT_UNRESOLVED'; }
module.exports = { EVALUATOR_VERSION, f, V, silh, prop, constr, asymmetry, direction, tierEvidence, pairDirection, pairTier, ENVELOPE, TAILORED, OPENWORK_SURFACE, CONV_ATTACHMENT, CONV_VOLUMETRIC, TSHIRT_NONCONV };
