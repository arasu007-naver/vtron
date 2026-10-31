'use strict';
/**
 * STMX SR DIRECTION-FIRST ENGINE V1.2 — INPUT ADAPTER
 *
 * Reads ONE Producer V1_3 target record ({ category, observations }) and returns the SR-owned governed
 * evidence tuple. It knows nothing about tiers, GT or REF identity.
 *
 * Frozen rules honoured here (unchanged by the Direction-First amendment):
 *   · carrier absence ≠ value None — an omitted key stays KEY_OMITTED and is never defaulted     (SCORE_PHYSICS_FROZEN §4 · Guard SR-G5)
 *   · non-applicability is silence, never Release evidence                                          (Guard SR-G6)
 *   · Waist Two-Gate: category ∈ {Jacket, Coat, Dress, Jumpsuit} AND length ≥ Hip Length             (SCORE_PHYSICS_FROZEN §5)
 *     — if length is not OBSERVED, Gate 2 cannot fire and Gate 1 alone decides                        (Guard SR-G4)
 *   · waist_definition → SR waist state: Undefined → None · Defined → Mild · Cinched → Strong          (ADR-123)
 *   · the 4-value fabric_behavior observation is passed through UNCHANGED; nothing collapses it here   (order §7)
 *
 * V1.2 addition (CEO 2026-09-14 · bounded support): the two MULTI support carriers `material` · `surface` are read
 * as governed VALUE SETS (`values[].value`) into `support.<name> = { state, values }`. ⛔ Their free-text
 * `evidence[]` is never read. ⛔ They are not part of `carriers` and never enter the SR signature.
 */
const B = require('./sr_producer_binding_v1');

const STATES = ['OBSERVED', 'ABSENT', 'NOT_VISIBLE', 'UNKNOWN'];
const TOP = ['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt'];
const OUTERWEAR = ['Jacket', 'Coat'];
const BOTTOM = ['Trouser', 'Skirt'];
const ONE_PIECE = ['Dress', 'Jumpsuit'];
const WAIST_GATE1 = ['Jacket', 'Coat', 'Dress', 'Jumpsuit'];
const WAIST_SHORT_LENGTHS = ['Cropped', 'Waist Length'];          // frozen §5.5 — drawn from the Jacket length domain, no new vocabulary
const WAIST_SR = { Undefined: 'None', Defined: 'Mild', Cinched: 'Strong' };

function categoryOf(record) {
  const c = record && record.category;
  return c && typeof c === 'object' ? (c.value || null) : (c || null);
}
/**
 * Read one carrier. One-piece records emit some carriers per REGION (CA#5): `{ state, value: null, byRegion: { upper, lower } }`.
 * When a half is requested and the region entry exists, the region entry is the governed value for that half;
 * a scalar `value: null` with byRegion present is NOT an absence — it is the regional form of the observation.
 */
function read(obs, key, half) {
  if (!obs || !(key in obs)) return { state: 'KEY_OMITTED', value: null };
  const v = obs[key];
  if (v && typeof v === 'object') {
    if (half && v.byRegion && v.byRegion[half] && typeof v.byRegion[half] === 'object') {
      const r = v.byRegion[half];
      return { state: STATES.includes(r.state) ? r.state : 'UNKNOWN', value: r.state === 'OBSERVED' ? (r.value !== undefined ? r.value : null) : null, region: half };
    }
    if (v.state === 'OBSERVED' && (v.value === null || v.value === undefined) && v.byRegion) return { state: 'UNKNOWN', value: null, note: 'regional observation with no scalar — half not requested or not emitted' };
    return { state: STATES.includes(v.state) ? v.state : 'UNKNOWN', value: v.state === 'OBSERVED' ? (v.value !== undefined ? v.value : null) : null };
  }
  return { state: 'OBSERVED', value: v };
}
/**
 * Read one MULTI support carrier as a governed value set. Accepted shapes: `{ state, values: [{ value }] }` (the
 * Producer's MULTI form), `{ state, values: ['X'] }`, `{ state, value: 'X' }` (single), or a bare string.
 * Only `value` fields are read — never `evidence`, `locations`, `coverage` or any prose.
 */
function readMulti(obs, key) {
  if (!obs || !(key in obs)) return { state: 'KEY_OMITTED', values: [] };
  const v = obs[key];
  if (v === null || v === undefined) return { state: 'UNKNOWN', values: [] };
  if (typeof v !== 'object') return { state: 'OBSERVED', values: [String(v)] };
  const state = STATES.includes(v.state) ? v.state : 'UNKNOWN';
  if (state !== 'OBSERVED') return { state, values: [] };
  const vals = [];
  if (Array.isArray(v.values)) v.values.forEach(x => { const val = x && typeof x === 'object' ? x.value : x; if (val !== null && val !== undefined) vals.push(String(val)); });
  else if (v.value !== null && v.value !== undefined) vals.push(String(v.value));
  if (!vals.length) return { state: 'UNKNOWN', values: [], note: 'OBSERVED with no governed value' };
  return { state, values: vals };
}
function region(category) {
  if (TOP.includes(category)) return 'TOP';
  if (OUTERWEAR.includes(category)) return 'OUTERWEAR';
  if (BOTTOM.includes(category)) return 'BOTTOM';
  if (ONE_PIECE.includes(category)) return 'ONE_PIECE';
  return null;
}

/**
 * @returns {{ category, region, carriers, support, waist_sr, notes: string[], contract_warnings: string[] }}
 *   carriers.<name> = { state, value } for every SR carrier, with non-applicable carriers forced to KEY_OMITTED.
 *   support.<name>  = { state, values[] } for every bounded-support carrier (V1.2), same applicability / domain discipline.
 */
function adapt(record, half) {
  const category = categoryOf(record);
  const reg = region(category);
  const notes = [], warnings = [];
  if (!reg) return { category, region: null, carriers: {}, support: {}, waist_sr: null, notes: ['SR_CATEGORY_UNRESOLVED: ' + category], contract_warnings: [] };
  const obs = (record && record.observations) || {};
  const applicable = B.applicableCarriers(category);
  const regionKey = half === 'LOWER' ? 'lower' : 'upper';
  const carriers = {};
  B.SR_CARRIERS.forEach(k => {
    const r = read(obs, k, regionKey);
    if (!applicable.includes(k)) {
      if (r.state !== 'KEY_OMITTED') warnings.push('SR_INPUT_CONTRACT_WARNING: ' + k + ' is not applicable to ' + category + ' under ' + B.OBSERVATION_CONTRACT_ID + ' — value ignored, not defaulted');
      carriers[k] = { state: 'KEY_OMITTED', value: null };
      return;
    }
    /* a value outside the bound contract's domain is an input error, never coerced */
    if (r.state === 'OBSERVED') {
      const dom = B.domainFor(k, category);
      if (Array.isArray(dom) && dom.length && !dom.includes(r.value)) { warnings.push('SR_INPUT_VALUE_OUT_OF_DOMAIN: ' + k + ' = ' + JSON.stringify(r.value) + ' for ' + category); carriers[k] = { state: 'UNKNOWN', value: null, raw: r.value }; return; }
    }
    carriers[k] = r;
  });

  /* V1.2 — bounded-support carriers: same applicability and domain discipline; out-of-domain values are dropped
   * with a warning, never coerced; an empty or non-OBSERVED carrier yields NO support (it never fabricates it). */
  const support = {};
  const applicableSupport = B.applicableSupportCarriers(category);
  B.SR_SUPPORT_CARRIERS.forEach(k => {
    const r = readMulti(obs, k);
    if (!applicableSupport.includes(k)) {
      if (r.state !== 'KEY_OMITTED') warnings.push('SR_INPUT_CONTRACT_WARNING: ' + k + ' is not applicable to ' + category + ' under ' + B.OBSERVATION_CONTRACT_ID + ' — value ignored, not defaulted');
      support[k] = { state: 'KEY_OMITTED', values: [] };
      return;
    }
    if (r.state === 'OBSERVED') {
      const dom = B.domainFor(k, category);
      const kept = Array.isArray(dom) && dom.length ? r.values.filter(v => dom.includes(v)) : r.values;
      r.values.filter(v => !kept.includes(v)).forEach(v => warnings.push('SR_INPUT_VALUE_OUT_OF_DOMAIN: ' + k + ' = ' + JSON.stringify(v) + ' for ' + category));
      support[k] = kept.length ? { state: 'OBSERVED', values: kept } : { state: 'UNKNOWN', values: [], raw: r.values };
      return;
    }
    support[k] = r;
  });

  /* Waist Two-Gate (frozen §5) — applied to the CONSUMPTION side; the Producer already applies it on emission */
  if (WAIST_GATE1.includes(category)) {
    const len = carriers.length;
    if (len.state === 'OBSERVED' && WAIST_SHORT_LENGTHS.includes(len.value)) {
      if (carriers.waist_definition.state !== 'KEY_OMITTED') notes.push('WAIST_GATE2_NA: length = ' + len.value + ' → waist_definition treated as N/A (pre-Two-Gate record)');
      carriers.waist_definition = { state: 'KEY_OMITTED', value: null };
    } else if (len.state !== 'OBSERVED') {
      notes.push('WAIST_GATE2_NOT_FIRED: length ' + len.state + ' — Gate 1 alone decides (Guard SR-G4)');
    }
  }
  const w = carriers.waist_definition;
  const waist_sr = w.state === 'OBSERVED' ? (WAIST_SR[w.value] || null) : null;
  return { category, region: reg, carriers, support, waist_sr, notes, contract_warnings: warnings };
}

module.exports = { adapt, region, categoryOf, readMulti, TOP, OUTERWEAR, BOTTOM, ONE_PIECE, WAIST_GATE1, WAIST_SHORT_LENGTHS, WAIST_SR };
