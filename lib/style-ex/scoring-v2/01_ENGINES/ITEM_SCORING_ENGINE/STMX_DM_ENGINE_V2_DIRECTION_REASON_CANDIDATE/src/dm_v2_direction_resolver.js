'use strict';
/**
 * STMX DM V2 — BINARY DIRECTION RESOLVER (Detail / Minimal). ⛔ No Neutral, no UNKNOWN, no Strength, no ordinal, no number.
 *
 * Rules, evaluated in order (CEO order 2026-10-28 · design: STMX_ITEM_V2_FOUR_AXIS_MANDATORY_DIRECTION_REASON_ARCHITECTURE_CLOSURE_V1 D8):
 *   DM-V2-T0  block absent / malformed            → TRANSPORT error (not a product; never a Direction value)
 *   DM-V2-M0  complete empty block (evidence = [])   → M   (a positive observation: nothing designed was admitted)
 *   DM-V2-D1  some system ESTABLISHES size ∈ {medium, large} AND (contrast = high OR (contrast ∈ {medium, high} AND spatial ∈ {distributed, whole_garment})) → D
 *   DM-V2-D2  else some system qualifies after DM-V2-O open-reading adjudication → D                          (CEO DM-Q3 — candidate working policy)
 *   DM-V2-Z0  else no admitted system carries ANY readable Primitive → M, PROVISIONAL policy, limitation Reason (CEO ZE-1 — candidate working policy)
 *   DM-V2-M2  else some reading is open (range / unread) → M                                                    (CEO DM-Q3 — candidate working policy)
 *   DM-V2-M1  else → M                                                                                           (CEO DM-Q1 — candidate working policy)
 * DM-V2-O (open-reading adjudication): a RANGE resolves to its conservative state (small / low / localized) when that state is inside the observed range,
 *   otherwise to its upper observed state; an UNREAD Primitive is never assumed: an unread size is answered only by observed deployment beyond one place,
 *   an unread contrast leaves separation unestablished, an unread placement leaves "beyond one place" unestablished.
 * Set membership only — no count, density, number of systems, internal composition, family, category, weight or threshold. One qualifying system suffices.
 */
const { admission } = require('./dm_v2_binding');
const { establishes } = admission;
const REAL = ['medium', 'large'], HIGH = ['high'], SEP = ['medium', 'high'], BEYOND = ['distributed', 'whole_garment'];
const ORD = { size: admission.RELATIVE_SIZE, contrast: admission.CONTRAST, spatial: admission.SPATIAL_POSITION };
const CONS = { size: 'small', contrast: 'low', spatial: 'localized' };
const RULES = ['DM-V2-T0', 'DM-V2-M0', 'DM-V2-D1', 'DM-V2-D2', 'DM-V2-Z0', 'DM-V2-M2', 'DM-V2-M1'];
const qualDefinite = (e) => establishes(e.size, REAL) && (establishes(e.contrast, HIGH) || (establishes(e.contrast, SEP) && establishes(e.spatial, BEYOND)));
function settle(f, prim) { const v = (f && f.resolved && f.values) || [];
  if (v.length === 1) return { read: true, value: v[0], open: null, values: v.slice() };
  if (v.length > 1) { const sorted = v.slice().sort((a, b) => ORD[prim].indexOf(a) - ORD[prim].indexOf(b)); return { read: true, value: v.includes(CONS[prim]) ? CONS[prim] : sorted[sorted.length - 1], open: 'RANGE', values: sorted }; }
  return { read: false, value: null, open: 'UNREAD', values: [] }; }
function qualSettled(e) { const s = settle(e.size, 'size'), c = settle(e.contrast, 'contrast'), sp = settle(e.spatial, 'spatial');
  const open = [s, c, sp].some((x) => x.open); const extent = s.read ? REAL.includes(s.value) : (sp.read && BEYOND.includes(sp.value));
  if (!c.read) return { q: false, s, c, sp, via: null, open };
  const A = extent && c.value === 'high'; const B = extent && SEP.includes(c.value) && sp.read && BEYOND.includes(sp.value);
  return { q: A || B, s, c, sp, via: A ? 'clear_separation_with_extent' : B ? 'moderate_separation_beyond_one_place' : null, open }; }
const qualifies = (e) => qualDefinite(e) || qualSettled(e).q;
const anyRead = (e) => !!((e.size && e.size.resolved) || (e.contrast && e.contrast.resolved) || (e.spatial && e.spatial.resolved));
/** @returns {{ok:true, direction:'D'|'M', rule, decisive:Array, ceo_decision?, provisional?} | {ok:false, rule:'DM-V2-T0', transport_code}} */
function resolve(adm) {
  if (!adm || !adm.ok) return { ok: false, rule: 'DM-V2-T0', transport_code: (adm && adm.reason) || 'DM_OBSERVATION_BLOCK_ABSENT' };
  if (adm.empty) return { ok: true, direction: 'M', rule: 'DM-V2-M0', decisive: [] };
  const def = adm.evidence.filter(qualDefinite); if (def.length) return { ok: true, direction: 'D', rule: 'DM-V2-D1', decisive: def };
  const st = adm.evidence.map((e) => ({ e, r: qualSettled(e) })); const q = st.filter((x) => x.r.q);
  if (q.length) return { ok: true, direction: 'D', rule: 'DM-V2-D2', decisive: q.map((x) => x.e), ceo_decision: 'DM-Q3' };
  if (!adm.evidence.some(anyRead)) return { ok: true, direction: 'M', rule: 'DM-V2-Z0', decisive: adm.evidence, ceo_decision: 'ZE-1', provisional: true };
  const open = st.some((x) => x.r.open); return { ok: true, direction: 'M', rule: open ? 'DM-V2-M2' : 'DM-V2-M1', decisive: adm.evidence, ceo_decision: open ? 'DM-Q3' : 'DM-Q1' };
}
module.exports = { resolve, qualDefinite, qualSettled, qualifies, settle, anyRead, RULES, ORD, CONS, REAL, HIGH, SEP, BEYOND };
