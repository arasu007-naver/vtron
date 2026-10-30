'use strict';
/**
 * INTEGRATED V1 — pocket instance carrier (CA#29 reuse). Mirrors the frozen Item producer validator rules for `pocket.pockets[]`:
 *   · array, non-empty, only under pocket OBSERVED Present (parent gate);
 *   · each instance: location ∈ POCKET_INSTANCE_LOCATIONS (required; no alias / free text); construction / projection = { state, value }
 *     with the SINGLE domains and the CA#24 state / value invariant (OBSERVED → value in domain; other states → value null);
 *   · an instance carrying neither morphology child says nothing (rejected); an identical (location, construction, projection) triple is
 *     a redundant repetition (rejected) — left / right pockets are NOT split (one group = one instance, CA#29 D2 / D4).
 * Nothing is inferred: a missing child stays missing; unreadable morphology keeps its instance with NOT_VISIBLE / UNKNOWN + null (D3).
 */
const I = require('./integrated');
const C = require('./contracts');

function checkInstances(insts, where) {
  const w = where || 'pockets';
  if (!Array.isArray(insts)) throw new Error('POCKET_INSTANCE_SHAPE: ' + w + ' must be an array');
  if (!insts.length) throw new Error('POCKET_INSTANCE_EMPTY: ' + w + ' must not be empty (omit the key when pocket is not Present)');
  const seen = new Set(); const out = [];
  insts.forEach((inst, i) => {
    const at = w + '[' + i + ']';
    if (!inst || typeof inst !== 'object' || Array.isArray(inst)) throw new Error('POCKET_INSTANCE_SHAPE: ' + at);
    if (inst.location === undefined || inst.location === null || String(inst.location).trim() === '') throw new Error('POCKET_INSTANCE_NO_LOCATION: ' + at);
    if (!I.POCKET_INSTANCE_LOCATIONS.includes(inst.location)) throw new Error('POCKET_INSTANCE_BAD_LOCATION: ' + at + ' ' + inst.location + ' (Chest · Lower Front · Sleeve · Leg only)');
    if (inst.construction === undefined && inst.projection === undefined) throw new Error('POCKET_INSTANCE_EMPTY: ' + at + ' carries neither construction nor projection');
    const o = { location: inst.location };
    for (const child of ['construction', 'projection']) {
      const c = inst[child]; if (c === undefined) continue;
      if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('POCKET_INSTANCE_SHAPE: ' + at + '.' + child);
      if (!C.STATES.includes(c.state)) throw new Error('POCKET_INSTANCE_BAD_STATE: ' + at + '.' + child + ' ' + c.state);
      if (c.state === 'OBSERVED') { if (c.value === undefined || c.value === null) throw new Error('POCKET_INSTANCE_OBSERVED_NO_VALUE: ' + at + '.' + child); if (!I.POCKET_INSTANCE_CHILD_DOMAIN[child].includes(c.value)) throw new Error('POCKET_INSTANCE_VALUE_NOT_IN_DOMAIN: ' + at + '.' + child + ' ' + c.value); o[child] = { state: 'OBSERVED', value: c.value }; }
      else { if (c.value !== undefined && c.value !== null) throw new Error('POCKET_INSTANCE_NON_OBSERVED_VALUE: ' + at + '.' + child + ' state ' + c.state + ' requires value null'); o[child] = { state: c.state, value: null }; }
    }
    for (const k of Object.keys(inst)) if (!['location', 'construction', 'projection'].includes(k) && !k.startsWith('_')) throw new Error('POCKET_INSTANCE_UNEXPECTED_KEY: ' + at + '.' + k);
    const key = [o.location, o.construction && o.construction.state, o.construction && o.construction.value, o.projection && o.projection.state, o.projection && o.projection.value].join('|');
    if (seen.has(key)) throw new Error('POCKET_INSTANCE_DUPLICATE: ' + at + ' repeats an identical location + morphology instance');
    seen.add(key); out.push(o);
  });
  return out;
}

/** Project the instances onto the two historical scalar identities (SVP-117 / 118) for the run record — one instance → scalar, several → list. */
function projectScalars(pockets) {
  const pick = (child) => { const vals = pockets.map((p) => p[child]).filter(Boolean); if (!vals.length) return { observed_state: 'UNKNOWN' }; if (vals.length === 1) return vals[0].state === 'OBSERVED' ? { observed_state: 'OBSERVED', observed_value: vals[0].value } : { observed_state: vals[0].state }; return { observed_state: 'OBSERVED', observed_value: vals.map((v) => (v.state === 'OBSERVED' ? v.value : v.state)), nested_instances: vals.length }; };
  return { pocket_construction: pick('construction'), pocket_projection: pick('projection') };
}

module.exports = { checkInstances, projectScalars };
