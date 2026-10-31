'use strict';
/**
 * STMX TC V2 — Item Vision Producer V1.3 → frozen TC member input ADAPTER (candidate, read-only, lossless where lawful).
 * Rule = the frozen TC upstream projection allowlist (PROJECTION_ALLOWLIST_V1 + V5 amendment), applied to ONE V1.3 target record:
 *   parameters: the allowlist parameter_whitelist only · sub-fields: state · value · values · values_detail (value · coverage · locations[component · descriptor])
 *   · fit.byRegion { upper | lower: value } (V5) · every evidence / provenance string dropped · no field created, no value inferred, no GT read.
 * Archetype key: the category → key table carried by the 126 frozen member records (Jacket / Coat use the observed grammar; other categories a fixed key).
 *   Grammar not observed / out of domain → the frozen unresolved key form (`JACKET:<GRAMMAR_…>`); a category outside the table → `UNMAPPED:<category>` (key unresolved).
 * Not an interpreter and not a scorer: TC semantics stay in the frozen predicates. Gaps are returned, never filled.
 * Display observations (`observed`) = the same field list as a frozen member record, read from the V1.3 record for the Reason only.
 */
const B = require('./tc_v2_binding');
const KEY_TABLE = { Jacket: 'JACKET', Coat: 'COAT', Shirt: 'shirt', Trouser: 'trouser', 'T-Shirt': 'tshirt', Sweater: 'sweater', Sweatshirt: 'sweatshirt', Skirt: 'skirt', Dress: 'dress', Jumpsuit: 'jumpsuit' };
const GRAMMAR_KEYED = ['Jacket', 'Coat'];
const OBSERVED_FIELDS = ['fit', 'length', 'sleeve', 'collar', 'closure_type', 'front_opening_extent', 'shoulder_structure', 'shoulder_connection', 'sleeve_volume', 'material', 'surface', 'attachment', 'pocket_projection', 'asymmetry', 'slit'];
const WL = B.ALLOWLIST.parameter_whitelist; const VD_ITEM = B.ALLOWLIST.values_detail_item_allowlist; const LOC_ITEM = B.ALLOWLIST.location_item_allowlist; const REGIONS = B.ALLOWLIST_V5.change.observation_sub_field_allowlist_added.regions_allowed;
const strOf = (v) => (v && typeof v === 'object' ? v.value : v);
function projectObservation(o, field) {
  if (!o || typeof o !== 'object' || typeof o.state !== 'string') return null;
  const t = { state: o.state, value: o.value === undefined ? null : o.value, values: null };
  /* multi-valued: `values` as value strings; `values_detail` items through the allowlist (value · coverage · locations[component · descriptor]). Source detail =
     the record's own values_detail when present (canonical form) else the V1.3 values[] objects (live form) — evidence strings are dropped either way */
  const pickItem = (d) => { const it = {}; if (typeof d === 'string') { it.value = d; return it; } for (const k of VD_ITEM) if (d && typeof d === 'object' && d[k] !== undefined) it[k] = k === 'locations' && Array.isArray(d[k]) ? d[k].map((l) => { const q = {}; for (const lk of LOC_ITEM) if (l && l[lk] !== undefined) q[lk] = l[lk]; return q; }) : d[k]; return it; };
  if (Array.isArray(o.values)) { const vals = o.values.map(strOf).filter((v) => typeof v === 'string'); if (vals.length) { t.values = vals; t.values_detail = (Array.isArray(o.values_detail) ? o.values_detail : o.values).map(pickItem); } }
  if (field === 'fit' && o.byRegion && typeof o.byRegion === 'object') { const br = {}; for (const r of REGIONS) { const x = o.byRegion[r]; if (x != null) br[r] = typeof x === 'string' ? x : (x.state === 'OBSERVED' && x.value != null ? String(x.value) : null); } if (Object.keys(br).length) t.byRegion = br; }
  return t; }
function displayOf(o) { if (!o || typeof o !== 'object') return 'n/a'; if (o.state === 'OBSERVED') { if (o.value != null) return String(o.value); if (Array.isArray(o.values) && o.values.length) return o.values.map(strOf).join('+'); return '<OBSERVED_NO_VALUE>'; } return '<' + o.state + '>'; }
/** @param record a V1.3 target record { category, observations, ... } @returns { ok, member, gaps } | { ok:false, kind:'CONTRACT_ERROR', code } */
/* R3 (CEO 2026-10-28 §5 · §10): only a record that cannot be read as a product is a CONTRACT_ERROR — not an object / array, observation container absent or not a
   plain object, or a category value that is present but not a state object. Missingness is never corruption: an absent or null field is NOT_EMITTED, and a product
   type that is not observed (UNKNOWN / NOT_VISIBLE / absent) gives the unresolved key form `UNMAPPED:<CATEGORY_…>` and is still scored (mandatory C / T). */
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
/* R4 (CEO 2026-10-28 §4 · R3-B1): FIELD-LEVEL validation. The product envelope (a plain-object record carrying a plain-object observation container) is the only
   thing whose corruption makes the input a technical CONTRACT_ERROR. Every observation field — category, grammar and each parameter — is validated on its own
   against the V1.3 contract (state set · value domain of the category, or of any V1.3 category when the type is not known · values / values_detail / coverage /
   locations / fit.byRegion shape and vocabulary). An invalid field is EXCLUDED: it is not projected, not displayed as observed, never repaired, never re-read in
   part, and is recorded (field · defect) in `excluded` and in the gaps. Exclusion is therefore equivalent to the field being absent; the remaining fields stay
   evidence. No value is created and none is inferred. */
const STATES = B.R13.STATES; const CAT_DOMAIN = B.R13.VALUE_DOMAINS.category; const COVERAGE = B.R13.COVERAGE; const LOC_C = B.R13.LOCATION_COMPONENTS, LOC_D = B.R13.LOCATION_DESCRIPTORS;
const anyDomain = (p) => { const u = new Set(); for (const c of CAT_DOMAIN) (B.R13.domainFor(p, c) || []).forEach((v) => u.add(v)); return u.size ? [...u] : null; };
const domainOf = (p, cat) => (p === 'grammar' ? B.R13.VALUE_DOMAINS.grammar : (cat && B.R13.domainFor(p, cat)) || anyDomain(p));
function itemDefect(it, dom) { const v = typeof it === 'string' ? it : isPlain(it) ? it.value : undefined; if (typeof v !== 'string') return 'VALUES_ITEM_MALFORMED'; if (dom && !dom.includes(v)) return 'VALUES_ITEM_OUTSIDE_V1_3_DOMAIN';
  if (isPlain(it)) { if (it.coverage != null && !COVERAGE.includes(it.coverage)) return 'COVERAGE_OUTSIDE_V1_3';
    if (it.locations != null) { if (!Array.isArray(it.locations)) return 'LOCATIONS_NOT_AN_ARRAY'; for (const l of it.locations) { if (!isPlain(l)) return 'LOCATION_MALFORMED'; if (l.component != null && !LOC_C.includes(l.component)) return 'LOCATION_COMPONENT_OUTSIDE_V1_3'; if (l.descriptor != null && !LOC_D.includes(l.descriptor)) return 'LOCATION_DESCRIPTOR_OUTSIDE_V1_3'; } } }
  return null; }
/** @returns null when the observation is a valid V1.3 observation of `field`, else the defect code */
function observationDefect(o, field, cat) {
  if (!isPlain(o)) return 'NOT_A_STATE_OBJECT'; if (typeof o.state !== 'string' || !STATES.includes(o.state)) return 'STATE_OUTSIDE_V1_3';
  if (o.state !== 'OBSERVED') return null; const dom = domainOf(field, cat);
  if (o.value != null) { if (typeof o.value !== 'string') return 'VALUE_NOT_A_STRING'; if (dom && !dom.includes(o.value)) return 'VALUE_OUTSIDE_V1_3_DOMAIN'; }
  for (const k of ['values', 'values_detail']) if (o[k] != null) { if (!Array.isArray(o[k])) return k.toUpperCase() + '_NOT_AN_ARRAY'; for (const it of o[k]) { const d = itemDefect(it, dom); if (d) return d; } }
  if (field === 'fit' && o.byRegion != null) { if (!isPlain(o.byRegion)) return 'BYREGION_MALFORMED'; for (const x of Object.values(o.byRegion)) { if (x == null) continue; const v = typeof x === 'string' ? x : isPlain(x) && typeof x.state === 'string' && STATES.includes(x.state) ? (x.state === 'OBSERVED' ? x.value : null) : undefined;
    if (v === undefined || (v !== null && (typeof v !== 'string' || (dom && !dom.includes(v))))) return 'BYREGION_ENTRY_INVALID'; } }
  return null; }
const EXCLUDED_DISPLAY = '<EXCLUDED_INVALID_OBSERVATION>';
function adapt(record) {
  if (!isPlain(record) || !isPlain(record.observations)) return { ok: false, kind: 'CONTRACT_ERROR', code: 'V1_3_RECORD_MALFORMED' };
  const obs = record.observations; const gaps = []; const tokens = {}; const excluded = [];
  const exclude = (field, defect) => { excluded.push({ field, defect }); gaps.push({ field, gap: 'INVALID_OBSERVATION_EXCLUDED', defect }); };
  let c = record.category; if (c != null) { const d = isPlain(c) && typeof c.state === 'string' && STATES.includes(c.state) ? (c.state === 'OBSERVED' && !(typeof c.value === 'string' && CAT_DOMAIN.includes(c.value)) ? 'VALUE_OUTSIDE_V1_3_DOMAIN' : null) : isPlain(c) ? 'STATE_OUTSIDE_V1_3' : 'NOT_A_STATE_OBJECT'; if (d) { exclude('category', d); c = { invalid: true }; } }
  const cat = c && !c.invalid && c.state === 'OBSERVED' ? c.value : null;
  const bad = new Set(); for (const p of new Set(WL.concat(OBSERVED_FIELDS, ['grammar']))) if (obs[p] != null) { const d = observationDefect(obs[p], p, cat); if (d) { bad.add(p); exclude(p, d); } }
  for (const p of WL) { if (bad.has(p)) continue; const t = projectObservation(obs[p], p); if (t) tokens[p] = t; else gaps.push({ field: p, gap: 'NOT_EMITTED_BY_V1_3_RECORD' }); }
  let key; const g = bad.has('grammar') ? null : obs.grammar; const domain = B.R13.VALUE_DOMAINS.grammar;
  if (!cat) { const st = c ? (c.invalid ? 'EXCLUDED_INVALID' : c.state) : 'NOT_EMITTED'; key = 'UNMAPPED:<CATEGORY_' + st + '>'; if (!(c && c.invalid)) gaps.push({ field: 'category', gap: c ? c.state : 'NOT_EMITTED_BY_V1_3_RECORD' }); }
  else if (!KEY_TABLE[cat]) { key = 'UNMAPPED:' + cat; gaps.push({ field: 'category', gap: 'CATEGORY_OUTSIDE_FROZEN_TC_KEY_TABLE', value: cat }); }
  else if (GRAMMAR_KEYED.includes(cat)) { if (g && g.state === 'OBSERVED' && domain.includes(g.value)) key = KEY_TABLE[cat] + ':' + g.value; else { key = KEY_TABLE[cat] + ':<GRAMMAR_' + (bad.has('grammar') ? 'EXCLUDED_INVALID' : g ? (g.state === 'OBSERVED' ? 'OUT_OF_DOMAIN' : g.state) : 'n/a') + '>'; if (!bad.has('grammar')) gaps.push({ field: 'grammar', gap: g ? (g.state === 'OBSERVED' ? 'OUT_OF_DOMAIN ' + g.value : g.state) : 'NOT_EMITTED' }); } }
  else key = KEY_TABLE[cat];
  const observed = {}; for (const f of OBSERVED_FIELDS) observed[f] = bad.has(f) ? EXCLUDED_DISPLAY : displayOf(obs[f]);
  gaps.push({ field: 'asymmetry', gap: 'ASYMMETRY_EVIDENCE_NOT_PROJECTED (the frozen asymmetry departure source is not part of the projection allowlist; a live asymmetry Departure is not consumed)' });
  return { ok: true, member: { category: cat, archetype_key: key, key_resolved: !/[<]|UNMAPPED/.test(key), tokens, observed }, gaps, excluded };
}
module.exports = { adapt, projectObservation, observationDefect, KEY_TABLE, GRAMMAR_KEYED, OBSERVED_FIELDS, EXCLUDED_DISPLAY };
