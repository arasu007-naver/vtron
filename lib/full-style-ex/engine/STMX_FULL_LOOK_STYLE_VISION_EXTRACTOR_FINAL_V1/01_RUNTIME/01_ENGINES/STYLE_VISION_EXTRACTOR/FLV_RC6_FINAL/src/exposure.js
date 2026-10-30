'use strict';
/**
 * Canonical physical exposure merger (CEO D-3; R-3 supplement).
 *   Item exposure (sources, Mode A) + Full-Look realized-state supplement → ONE event per physical realization.
 *   event key = region + carrier set. Several sources for one realization = metadata on one event, never a second event.
 *   No significance threshold; no axis copies; Mode B attribution may be UNKNOWN while the exposure itself is OBSERVED.
 */
const C = require('./contracts');
const R = require('./registry');

function key(region, carriers) { return region + '|' + carriers.slice().sort().join('+'); }

function mergeCanonicalExposure({ itemSources, supplements, registry }) {
  const events = new Map(); const hidden = [];
  for (const s of itemSources || []) {
    if (!C.EXPOSURE_REGIONS.includes(s.item_value)) throw new Error('EXPOSURE_ITEM_VALUE_OUTSIDE_DOMAIN: ' + s.item_value);
    if (!R.has(registry, s.carrier_ref)) throw new Error('EXPOSURE_CARRIER_NOT_PARTICIPANT: ' + s.carrier_ref);
    if (s.state && s.state !== 'OBSERVED') { hidden.push({ carrier_ref: s.carrier_ref, item_value: s.item_value, state: s.state, limitation: s.limitation || [] }); continue; }   // built-in exposure covered in the look (X-4)
    const k = key(s.item_value, [s.carrier_ref]);
    if (!events.has(k)) events.set(k, { region: s.item_value, carrier_refs: [s.carrier_ref], attribution: { value: 'item_intrinsic', state: 'OBSERVED' }, sources: [], state: 'OBSERVED' });
    events.get(k).sources.push({ route: 'derived', item_record_ref: s.item_record_ref, item_value: s.item_value });
  }
  for (const s of supplements || []) {
    for (const k of Object.keys(s)) if (/size|degree|significan|revealing|extent/i.test(k)) throw new Error('EXPOSURE_THRESHOLD_FIELD_PROHIBITED: ' + k);
    if (!C.EXPOSURE_REGIONS.includes(s.region)) throw new Error('EXPOSURE_REGION_OUTSIDE_DOMAIN: ' + s.region);
    const carriers = (s.carriers || []).slice();
    for (const c of carriers) if (!R.has(registry, c)) throw new Error('EXPOSURE_CARRIER_NOT_PARTICIPANT: ' + c);
    const k = key(s.region, carriers);
    if (events.has(k)) { events.get(k).sources.push({ route: 'observed' }); continue; }   // same physical realization already recorded → one event, extra source
    const attr = s.attribution === 'UNKNOWN' || s.attribution === undefined ? { state: 'UNKNOWN' } : { value: s.attribution, state: 'OBSERVED' };
    if (attr.value && !['item_intrinsic', 'realized_state'].includes(attr.value)) throw new Error('EXPOSURE_ATTRIBUTION_ILLEGAL: ' + attr.value);
    events.set(k, { region: s.region, carrier_refs: carriers, attribution: attr, sources: [{ route: 'observed' }], state: s.state || 'OBSERVED' });
  }
  return { events: [...events.values()], hidden };
}

module.exports = { mergeCanonicalExposure };
