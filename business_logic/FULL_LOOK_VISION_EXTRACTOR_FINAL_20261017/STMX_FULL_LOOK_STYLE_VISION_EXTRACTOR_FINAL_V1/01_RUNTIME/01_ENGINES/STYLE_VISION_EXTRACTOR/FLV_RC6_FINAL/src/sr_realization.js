'use strict';
/**
 * G-4 / G-5 / G-6 final upper realization (SR resolver inputs; three SEPARATE physical records, never collapsed).
 *   route = derived   lawful lossless reuse of the governing upper's Item raw facts (fit · shoulder_structure · fabric_behavior)
 *   route = observed  the final Full-Look realization is read directly (layering, draping, securing, displacement, Mode B)
 * G-6 uses the production observation domain directly (IX-3R): Structured · Semi-Structured · Semi-Fluid · Fluid.
 * No SR-consumer translation is stored. No fabric token implies S / R. The lower body (S-1) is Strength-only and is NOT here.
 * V1.2 (D-2): Item `shoulder_drop` is NEVER read here. It is an independent upstream raw fact served through K-2 (sr_upper_shoulder);
 * there is no shoulder_drop → final shoulder realization mapping, and shoulder_structure / shoulder_drop never correct one another.
 */
const C = require('./contracts');
const E = require('./envelope');
const R = require('./registry');

/** R-RT losslessness: one garment worn normally forms the whole visible upper and its record carries the three facts. */
function isLossless(ref, provider, registry, relations, raw) {
  const rec = provider.recordFor(ref);
  if (!rec) return false;
  for (const f of ['fit', 'shoulder_structure', 'fabric_behavior']) { const v = rec.facts[f]; if (v === undefined || v === 'ABSENT' || v === 'UNKNOWN' || v === 'NOT_VISIBLE') return false; }
  if (raw && raw.realization_departs === true) return false;                        // provider saw a departure (displaced, crushed, draped)
  if (relations.layer_relations.some((l) => l.under_ref === ref)) return false;     // something lies over it
  if (relations.securing_relations.some((s) => s.affected_ref === ref)) return false;   // a separate component acts on it
  const e = R.byRef(registry, ref);
  if (e && e.front_state && e.front_state.state === 'OBSERVED' && e.front_state.value !== 'fastened') return false;   // worn open / pin-closed ≠ normal worn state
  return true;
}

function buildUpperRealization({ provider, registry, relations }) {
  const raw = provider.upperRealization();
  if (!raw) return null;
  const ref = raw.governing_ref;
  if (ref && !R.has(registry, ref)) throw new Error('SR_GOVERNING_REF_NOT_IN_REGISTRY: ' + ref);
  const out = {};
  if (ref) out.source_refs = [ref];
  if (ref && isLossless(ref, provider, registry, relations, raw)) {
    const rec = provider.recordFor(ref); const lineage = { item_record_ref: rec.item_record_ref };
    out.relation = E.fact({ state: 'OBSERVED', value: rec.facts.fit, route: 'derived', source: 'item_record', lineage });
    out.shoulder = E.fact({ state: 'OBSERVED', value: rec.facts.shoulder_structure, route: 'derived', source: 'item_record', lineage });
    out.shape_behaviour = E.fact({ state: 'OBSERVED', value: rec.facts.fabric_behavior, route: 'derived', source: 'item_record', lineage });
  } else {
    out.relation = obs(raw.relation); out.shoulder = obs(raw.shoulder); out.shape_behaviour = obs(raw.shape);
    // G-6 ambiguity (order §26): Semi-Structured vs Semi-Fluid not distinguishable → UNKNOWN. Never Balanced, never a centre value.
    const alt = raw.shape && raw.shape.alternative;
    if (alt && raw.shape.state === 'OBSERVED') {
      const pair = [raw.shape.value, alt].sort();
      if (pair.join('|') === C.G6_AMBIGUOUS_PAIR.slice().sort().join('|')) out.shape_behaviour = { ...E.fact({ state: 'UNKNOWN', route: 'observed', source: 'fixture' }), ambiguity: pair };
      else out.shape_behaviour.ambiguity = pair;                                     // same-side boundary: value kept, boundary recorded
    }
  }
  E.check(out.relation, C.UPPER_FIT_DOMAIN, 'G-4 relation');
  E.check(out.shoulder, C.SHOULDER_DOMAIN, 'G-5 shoulder');
  E.check(out.shape_behaviour, C.G6_DOMAIN, 'G-6 shape_behaviour');
  for (const k of Object.keys(out)) if (!['source_refs', 'relation', 'shoulder', 'shape_behaviour'].includes(k)) throw new Error('SR_UPPER_REALIZATION_UNEXPECTED_KEY: ' + k);
  return out;
}
function obs(x) { if (!x) return E.fact({ state: 'UNKNOWN', route: 'observed', source: 'fixture' }); return E.fact({ state: x.state, value: x.state === 'OBSERVED' ? x.value : undefined, limitation: x.limitation, route: 'observed', source: 'fixture' }); }

module.exports = { buildUpperRealization, isLossless };
