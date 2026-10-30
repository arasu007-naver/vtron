'use strict';
/**
 * ObservationProvider abstraction (order §7). V1.1: objects may carry the accessory fields (product_family · product_subtype ·
 * subtype · attached_to · integral_attachments); colour areas may carry `part` (Colour V1 provenance sub-fields) or an unreadable `state`.
 * Non-garment evidence comes from the Mode-B observation only: an Item record for a non-garment ref is refused (no fake Item lineage).
 *   A. FixtureProvider      — stored / fixture physical observations (required; the G53 path)
 *   B. ItemReuseProvider    — lossless raw-fact reuse from governed Item records, wrapped around a base provider (Mode A / mixed)
 *   C. LiveVisionProvider   — interface reserved; implementation ABSENT and disabled (G53). Every use throws.
 * Providers return governed envelopes (envelope.js) or raw observation records that the processors validate.
 */
const C = require('./contracts');
const E = require('./envelope');

class ObservationProvider {
  sourceMode() { throw notImpl('sourceMode'); }
  lookFrame() { throw notImpl('lookFrame'); }                 // { state, limits[] }
  objects() { throw notImpl('objects'); }                     // [{ ref, identity, participates }]
  frontStates() { throw notImpl('frontStates'); }             // { ref: { value, state } }
  layerRelations() { throw notImpl('layerRelations'); }       // [{ over, under, revealed[], state }]
  securingRelations() { throw notImpl('securingRelations'); } // [{ securing, affected, region, visible_constriction }]
  colourAreas() { throw notImpl('colourAreas'); }             // [{ carrier, family, lightness, effect, role, contrast?, suppressed_by? }]
  upperRealization() { throw notImpl('upperRealization'); }   // { governing_ref, relation, shoulder, shape }
  componentFact(/* ref, fact */) { throw notImpl('componentFact'); }   // envelope
  exposureSupplement() { throw notImpl('exposureSupplement'); }       // [{ region, carriers[], attribution, state }]
  exposureItemSources() { return []; }                        // Mode A only
  dmSubsystem() { throw notImpl('dmSubsystem'); }             // frozen DM output (verbatim)
  recordFor() { return null; }                                // Mode A only
}
function notImpl(m) { return new Error('OBSERVATION_PROVIDER_NOT_IMPLEMENTED: ' + m); }

/** A. Fixture / stored-evidence provider. The fixture is a stored physical reading (CEO_REVIEW_CANDIDATE_READING, never GT). */
class FixtureProvider extends ObservationProvider {
  /**
   * @param {object} fixture   stored physical reading (case shape)
   * @param {object} [pocketOverlay]  INTEGRATED V1: { ref: pockets[] } for readings that still carry the retired scalar pocket form
   *        (fixtures/pocket_instances_overlay_candidate.json). Applied ONLY when the fixture's pocket is the bare string 'Present' and the
   *        fixture has no instances of its own; the bridge is recorded in `this.notes` (provenance). A Present pocket that ends up without
   *        instances is NOT repaired — the validator fails it closed (CA#29).
   */
  constructor(fixture, pocketOverlay) { super(); if (!fixture || typeof fixture !== 'object') throw new Error('FIXTURE_MISSING'); this.f = fixture; this.overlay = pocketOverlay || null; this.notes = []; }
  sourceMode() { return 'B'; }
  lookFrame() { return this.f.frame || { state: 'OBSERVED', limits: [] }; }
  objects() { return this.f.objects || []; }
  frontStates() { return this.f.front_state || {}; }
  layerRelations() { return this.f.layer_relations || []; }
  securingRelations() { return this.f.securing_relations || []; }
  colourAreas() { return this.f.colour_areas || []; }
  upperRealization() { return this.f.upper || null; }
  exposureSupplement() { return this.f.exposure_supplement || []; }
  dmSubsystem() { return this.f.dm || null; }
  /** V1.3: why no frozen DM block exists in this stored evidence (a stored reading never has a DM block unless one was acquired). */
  dmAcquisitionReason() { const r = this.f.dm_acquisition_reason; return r && C.DM_NOT_ACQUIRED_REASONS.includes(r) ? r : 'FIXTURE_HAS_NO_DM_BLOCK'; }
  lookVisibility(ref, factName) { const lv = this.f.look_visibility || {}; return (lv[ref] || {})[factName] || null; }
  componentFact(ref, factName) {
    const r = ((this.f.facts || {})[ref] || {})[factName];
    const base = { route: 'observed', source: 'fixture', component_ref: ref };
    if (r === undefined || r === 'UNKNOWN') return E.fact({ ...base, state: 'UNKNOWN' });        // no stored reading → UNKNOWN, never guessed
    if (r === 'ABSENT') return E.fact({ ...base, state: 'ABSENT' });
    if (Array.isArray(r)) return E.fact({ ...base, state: 'OBSERVED', value: r.slice() });                 // Item MULTI fact (several co-occurring values)
    if (factName === 'pocket') {                                                                             // INTEGRATED V1 (CA#29): instances travel with the pocket observation
      if (typeof r === 'object') return E.fact({ ...base, state: r.state || 'OBSERVED', value: r.value, limitation: r.limitation, ...(r.pockets !== undefined ? { pockets: r.pockets } : {}) });
      if (r === 'Present' && this.overlay && this.overlay[ref]) { this.notes.push({ ref, note: 'POCKET_LEGACY_SCALAR_READING_BRIDGED_BY_OVERLAY', instance_locations: this.overlay[ref].map((p) => p.location) }); return E.fact({ ...base, state: 'OBSERVED', value: 'Present', pockets: this.overlay[ref].map((p) => ({ location: p.location, construction: p.construction, projection: p.projection })) }); }
      return E.fact({ ...base, state: 'OBSERVED', value: r });                                              // 'None' · or a Present without instances (validator fails it closed)
    }
    if (typeof r === 'object') return E.fact({ ...base, state: r.state, value: r.value, limitation: r.limitation });
    return E.fact({ ...base, state: 'OBSERVED', value: r });
  }
}

/** B. Item-linked reuse provider (Mode A). Records carry RAW Item facts only; any engine output key is refused. */
class ItemReuseProvider extends ObservationProvider {
  /** @param {FixtureProvider} base  @param {object} records  { ref: { item_record_ref, facts: { <Item fact>: value | 'ABSENT' | 'NOT_VISIBLE' | 'UNKNOWN' } } } */
  constructor(base, records) {
    super(); this.base = base; this.records = {};
    const baseObjects = base.objects();
    for (const [ref, rec] of Object.entries(records || {})) {
      if (!rec || !rec.item_record_ref || typeof rec.facts !== 'object') throw new Error('ITEM_RECORD_MALFORMED: ' + ref);
      const obj = baseObjects.find((o) => o.ref === ref);                            // V1.1: no fake Item lineage — a record may exist only for a garment-category object
      if (obj && !(typeof obj.identity === 'string' && C.GARMENT_CATEGORIES.includes(obj.identity))) throw new Error('ITEM_RECORD_FOR_NON_GARMENT (Item Vision has no record for footwear / bags / jewellery / accessories / unidentified objects): ' + ref);
      for (const k of Object.keys(rec)) if (k !== 'item_record_ref' && k !== 'facts' && k !== 'product_context') throw new Error('ITEM_RECORD_UNEXPECTED_KEY (only raw facts + governed product_context admitted): ' + k);
      for (const k of Object.keys(rec.facts)) if (C.ITEM_OUTPUT_KEY_RE.test(k) || !isItemFact(k)) throw new Error('ITEM_ENGINE_OUTPUT_NOT_ADMITTED: ' + k);
      if (rec.product_context !== undefined && !C.PRODUCT_CONTEXT_DOMAIN.includes(rec.product_context)) throw new Error('PRODUCT_CONTEXT_OUTSIDE_ITEM_DOMAIN: ' + rec.product_context);
      this.records[ref] = { item_record_ref: rec.item_record_ref, facts: { ...rec.facts }, ...(rec.product_context !== undefined ? { product_context: rec.product_context } : {}) };   // V1.2 D-3
    }
  }
  sourceMode() { const refs = this.base.objects().filter((o) => o.participates).map((o) => o.ref); return refs.every((r) => this.records[r]) ? 'A' : 'MIXED'; }
  lookFrame() { return this.base.lookFrame(); }
  objects() { return this.base.objects().map((o) => (this.records[o.ref] ? { ...o, item_record_ref: this.records[o.ref].item_record_ref, ...(this.records[o.ref].product_context !== undefined && o.product_context === undefined ? { product_context: this.records[o.ref].product_context } : {}) } : o)); }   // record context metadata reaches the registry; a look-level reading takes precedence
  frontStates() { return this.base.frontStates(); }           // K-3 is read from the look, never from Item closure_type
  layerRelations() { return this.base.layerRelations(); }
  securingRelations() { return this.base.securingRelations(); }
  colourAreas() { return this.base.colourAreas(); }           // G-1 is always a look observation
  upperRealization() { return this.base.upperRealization(); }
  exposureSupplement() { return this.base.exposureSupplement(); }
  dmSubsystem() { return this.base.dmSubsystem(); }
  dmAcquisitionReason() { return this.base.dmAcquisitionReason(); }
  recordFor(ref) { return this.records[ref] || null; }
  /** Two-question rule (spec 06): is the value known from the record? is the fact's realization visible in this look? */
  componentFact(ref, factName) {
    const rec = this.records[ref];
    if (!rec || rec.facts[factName] === undefined) return this.base.componentFact(ref, factName);    // no record / no fact → observe
    const v = rec.facts[factName];
    const lineage = { item_record_ref: rec.item_record_ref };
    if (v === 'UNKNOWN' || v === 'NOT_VISIBLE') return this.base.componentFact(ref, factName);      // record cannot supply it → observe
    const vis = this.base.lookVisibility(ref, factName);
    if (vis && vis.state && vis.state !== 'OBSERVED') return E.fact({ state: vis.state, limitation: vis.limitation, route: 'derived', source: 'item_record', component_ref: ref, lineage });   // product fact present, not visible in the look: no value
    if (factName === 'pocket' && v === 'Present') return this.base.componentFact(ref, factName);     // INTEGRATED V1 (CA#29): a pre-CA#29 record carries no pockets[] → the record cannot supply the carrier → observe the visible pocket (after the Full-Look visibility check: a hidden record pocket stays NOT_VISIBLE / derived) (nothing invented; a CA#29 record would be an object with pockets[] and is not a legacy fixture record)
    if (v === 'ABSENT') return E.fact({ state: 'ABSENT', route: 'derived', source: 'item_record', component_ref: ref, lineage });
    return E.fact({ state: 'OBSERVED', value: v, route: 'derived', source: 'item_record', component_ref: ref, lineage });
  }
  /** Item intrinsic exposure as canonical-exposure SOURCES (D-3). */
  exposureItemSources() {
    const out = [];
    for (const [ref, rec] of Object.entries(this.records)) {
      const v = rec.facts.exposure_opening;
      if (v === undefined || v === 'ABSENT' || v === 'UNKNOWN' || v === 'NOT_VISIBLE') continue;
      for (const val of Array.isArray(v) ? v : [v]) {
        const vis = this.base.lookVisibility(ref, 'exposure_opening');
        out.push({ carrier_ref: ref, item_record_ref: rec.item_record_ref, item_value: val, state: vis && vis.state ? vis.state : 'OBSERVED', limitation: vis && vis.limitation });
      }
    }
    return out;
  }
}
const ITEM_FACTS = new Set(['category', 'trouser_distinction', 'silhouette', 'fit', 'length', 'fabric_behavior', 'waist_definition', 'sleeve', 'shoulder_connection', 'shoulder_span', 'shoulder_drop', 'shoulder_structure', 'neckline_shape', 'neckline_position', 'collar', 'cuff_type', 'rib_hem', 'hood', 'front_opening_extent', 'closure_type', 'pocket', 'pocket_construction', 'pocket_projection', 'cuff_scale', 'material', 'surface', 'pattern', 'graphic', 'asymmetry', 'slit', 'ruffle', 'decorative_detail', 'attachment', 'exposure_opening', 'grammar', 'sleeve_volume', 'collar_scale']);
function isItemFact(k) { return ITEM_FACTS.has(k); }

/** C. Live Vision provider — RESERVED INTERFACE, IMPLEMENTATION ABSENT (G53). There is no endpoint behind it. */
class LiveVisionProvider extends ObservationProvider {
  constructor() { super(); throw new Error('G53_BLOCKED_LIVE_INFERENCE: live Vision inference is not implemented and not permitted in this candidate'); }
}

module.exports = { ObservationProvider, FixtureProvider, ItemReuseProvider, LiveVisionProvider };
