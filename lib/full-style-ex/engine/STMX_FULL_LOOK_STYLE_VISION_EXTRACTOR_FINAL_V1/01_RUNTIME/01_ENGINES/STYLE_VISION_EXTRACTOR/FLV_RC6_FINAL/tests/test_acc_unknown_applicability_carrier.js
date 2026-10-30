'use strict';
/** V1.1 — UNKNOWN retention (order §60), garment-applicability negatives (§61), one-object-one-record (§62), carrier separation (§63), metallic separation (§29), Mode-B demand routing (§45), cross-regression (§70 C). */
const path = require('path');
const { X, run, fixture, providerB, assert, throws } = require('./helpers');
const C = X.contracts;
const reg = (r, ref) => r.packet.component_registry.find((e) => e.component_ref === ref);
const pool = (r, ref, fact) => r.packet.component_fact_pool.find((f) => f.component_ref === ref && f.fact === fact);
const points = (r, ref) => r.packet.colour_composition.points.filter((p) => p.carrier_ref.value === ref);
const GARMENT_ONLY = ['pocket', 'asymmetry', 'closure_type', 'collar', 'sleeve', 'shoulder_connection', 'fit', 'length', 'silhouette', 'waist_definition', 'slit', 'grammar', 'trouser_distinction', 'shoulder_structure', 'sleeve_volume', 'shoulder_span', 'front_opening_extent', 'pocket_construction', 'pocket_projection'];

const unknown = [
  { name: 'UN-1 identity UNKNOWN + colour OBSERVED + pattern OBSERVED coexist (F418 crochet garment: beige field, pink / blue / green pattern points, pattern Repeat, Textured Knit)', fn: () => {
    const r = run('F418'); const e = reg(r, 'c1'); assert(e.object_identity.state === 'UNKNOWN', 'UNKNOWN'); assert(r.packet.colour_composition.field.some((f) => f.carrier_refs.includes('c1')) && points(r, 'c1').length === 3, 'colour kept');
    assert(pool(r, 'c1', 'pattern').value === 'Repeat' && pool(r, 'c1', 'surface').value.includes('Textured Knit'), 'pattern + surface kept'); } },
  { name: 'UN-2 category-dependent facts are not produced for an UNKNOWN object: a direct request for every garment-only fact on F418 c1 / F109 c6 / F254 c2 stores nothing and answers unknown_identity', fn: () => {
    for (const [id, ref] of [['F418', 'c1'], ['F109', 'c6'], ['F254', 'c2']]) { const f = fixture(id); const registry = X.registry.buildRegistry(f.objects); const p = new X.k2.ComponentFactPool(new X.providers.FixtureProvider(f), registry);
      for (const fam of ['tc_archetype_key', 'tc_silhouette', 'tc_proportion', 'tc_construction', 'sr_own_waist']) { const res = p.request('T', ref, fam); assert(res.stored.every((x) => C.ACCESSORY_APPEARANCE_FACTS.includes(x)), id + ' ' + fam + ' stored only appearance'); assert(res.unknown_identity.every((x) => !C.ACCESSORY_APPEARANCE_FACTS.includes(x)), id + ' unknown_identity list'); }
      assert(p.entries().every((x) => C.ACCESSORY_APPEARANCE_FACTS.includes(x.fact)), id + ' pool holds appearance facts only'); } } },
  { name: 'UN-3 UNKNOWN never carries a value and is never force-fitted (F109 belt bag, F254 leggings / tights, F147 chain, F033 cape, F444 bra top, F563 tank); the fixture readings say UNKNOWN', fn: () => {
    for (const [id, ref] of [['F109', 'c6'], ['F254', 'c2'], ['F147', 'c4'], ['F033', 'c1'], ['F444', 'c3'], ['F563', 'c2']]) { const e = reg(run(id, { axes: ['EI'] }), ref); assert(e.object_identity.state === 'UNKNOWN' && e.object_identity.value === undefined, id); assert(fixture(id).objects.find((o) => o.ref === ref).identity.startsWith('UNKNOWN'), id + ' fixture'); }
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'UNKNOWN', participates: true, subtype: 'belt_bag' }]), /SUBTYPE_ON_UNIDENTIFIED/); throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'UNKNOWN', participates: true, product_family: 'shoe' }]), /FOOTWEAR_FIELD_ON_NON_FOOTWEAR/); } },
];

const applicability = [
  { name: 'AP-1 accessory components reject every garment-only fact: pocket / asymmetry / closure / collar / sleeve / shoulder / fit / length / silhouette / waist / exposure on every non-garment participant of every fixture → NOT_APPLICABLE, nothing stored (machine-tested)', fn: () => {
    let checked = 0;
    for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const f = fixture(id); const registry = X.registry.buildRegistry(f.objects); const p = new X.k2.ComponentFactPool(new X.providers.FixtureProvider(f), registry);
      for (const e of registry.filter((x) => X.registry.isNonGarment(x))) { for (const fam of ['tc_archetype_key', 'tc_silhouette', 'tc_proportion', 'tc_construction', 'sr_own_waist']) { const res = p.request('T', e.component_ref, fam); for (const g of GARMENT_ONLY) if (C.FACT_FAMILIES[fam].includes(g)) { assert(res.not_applicable.includes(g) || res.cached.includes(g) === false && !res.stored.includes(g), id + ' ' + e.component_ref + ' ' + g); checked++; } }
        assert(p.entriesFor(e.component_ref).every((x) => C.ACCESSORY_APPEARANCE_FACTS.includes(x.fact)), id + ' ' + e.component_ref + ' appearance only'); } }
    assert(checked > 100, 'checked ' + checked); assert(!C.REQUESTABLE_FACTS.includes('exposure_opening') && !C.REQUESTABLE_FACTS.includes('neckline_shape') && !C.REQUESTABLE_FACTS.includes('cuff_type'), 'exposure / neckline / cuff are not even requestable'); } },
  { name: 'AP-2 the validator rejects a garment-only fact stored on an accessory and an exposure event carried by an accessory', fn: () => {
    const p = run('F298').packet; const errs = (mut) => { const q = JSON.parse(JSON.stringify(p)); mut(q); return X.validator.validatePacket(q).errors.join('|'); };
    assert(/POOL_GARMENT_FACT_ON_NON_GARMENT/.test(errs((q) => { q.component_fact_pool.push({ component_ref: 'c3', fact: 'pocket', state: 'ABSENT', route: 'observed', source: 'fixture' }); })), 'pocket on gloves');
    assert(/POOL_GARMENT_FACT_ON_NON_GARMENT/.test(errs((q) => { q.component_fact_pool.push({ component_ref: 'c5', fact: 'asymmetry', state: 'OBSERVED', value: 'None', route: 'observed', source: 'fixture' }); })), 'asymmetry on hosiery');
    assert(/EXPOSURE_CARRIER_NON_GARMENT/.test(errs((q) => { q.canonical_exposure = { events: [{ region: 'Upper Thigh', carrier_refs: ['c5'], attribution: { state: 'UNKNOWN' }, sources: [{ route: 'observed' }], state: 'OBSERVED' }], hidden: [] }; })), 'exposure on hosiery');
    assert(/POOL_FAKE_ITEM_LINEAGE/.test(errs((q) => { q.component_fact_pool.find((f) => f.component_ref === 'c3').lineage = { item_record_ref: 'FAKE' }; })), 'fake lineage on gloves'); } },
  { name: 'AP-3 visual value domains are reused, garment applicability is not: decorative_detail Sequin-Beading on earrings (F187) is lawful while exposure_opening / neckline on the same component are impossible (not requestable + not applicable); garment components keep their full applicability (F298 coat pocket stored)', fn: () => {
    const r = run('F298'); assert(pool(run('F187'), 'c2', 'decorative_detail').value === 'Sequin-Beading', 'reuse'); assert(pool(r, 'c1', 'pocket') !== undefined, 'garment keeps pocket'); assert(pool(r, 'c3', 'pocket') === undefined, 'gloves never get pocket'); } },
];

const oneObject = [
  { name: 'OO-1 brooch / garment: F054 c4 is a separately worn jewellery component attached_to the jacket; in Mode A with a jacket record holding `Jewelry Attachment` the host token is dropped (ownership_resolution component_owns) — the brooch exists once', fn: () => {
    const b = run('F054'); assert(reg(b, 'c4').attached_to === 'c1' && b.packet.ownership_resolution.length === 1 && b.packet.ownership_resolution[0].resolution === 'component_owns' && b.packet.ownership_resolution[0].host_item_token === 'Jewelry Attachment', 'Mode B resolution');
    const rec = { c1: { item_record_ref: 'HYPOTHETICAL-REC-F054-C1', facts: { attachment: ['Jewelry Attachment'], material: 'Wool' } } };                 // hypothetical routing input: a record that holds the pinned brooch as the jacket's attachment
    const a = X.extract({ provider: new X.providers.ItemReuseProvider(providerB('F054'), rec), requestedAxes: ['EI', 'TC'] });
    assert(a.validation.ok, a.validation.errors.join('; ')); const att = pool(a, 'c1', 'attachment'); assert(att.state === 'ABSENT' && att.route === 'derived' && att.lineage.item_record_ref === 'HYPOTHETICAL-REC-F054-C1', 'host token dropped → ABSENT, lineage kept');
    assert(a.packet.request_trace.k2_ledger.some((l) => l.component_ref === 'c1' && l.ownership_dedup && l.ownership_dedup.includes('Jewelry Attachment')), 'dedup traced'); assert(a.packet.component_registry.filter((e) => e.object_identity.value === 'jewellery' && e.attached_to === 'c1').length === 1, 'one brooch component'); } },
  { name: 'OO-2 genuinely distinct objects are not merged: with integral_attachments [Jewelry Attachment] on the jacket, the host keeps its own token and the brooch stays a component (distinct_physical_objects)', fn: () => {
    const f = fixture('F054'); f.objects.find((o) => o.ref === 'c1').integral_attachments = ['Jewelry Attachment'];
    const a = X.extract({ provider: new X.providers.ItemReuseProvider(new X.providers.FixtureProvider(f), { c1: { item_record_ref: 'HYPOTHETICAL-REC-F054-C1', facts: { attachment: ['Jewelry Attachment', 'Metal Hardware'] } } }), requestedAxes: ['EI', 'TC'] });
    assert(a.validation.ok, a.validation.errors.join('; ')); assert(a.packet.ownership_resolution[0].resolution === 'distinct_physical_objects' && pool(a, 'c1', 'attachment').value.includes('Jewelry Attachment') && reg(a, 'c4'), 'both kept'); throws(() => X.ownership.resolveOwnership([], [{ ref: 'c1', integral_attachments: ['Brooch'] }]), /OUTSIDE_ITEM_DOMAIN/); } },
  { name: 'OO-3 the validator rejects a duplicated physical object (component_owns while the host still carries the token) and an attached object without a resolution', fn: () => {
    const p = run('F054', { modeA: false }).packet; const errs = (mut) => { const q = JSON.parse(JSON.stringify(p)); mut(q); return X.validator.validatePacket(q).errors.join('|'); };
    assert(/PHYSICAL_OBJECT_DUPLICATED/.test(errs((q) => { q.component_fact_pool.find((f) => f.component_ref === 'c1' && f.fact === 'attachment').state = 'OBSERVED'; q.component_fact_pool.find((f) => f.component_ref === 'c1' && f.fact === 'attachment').value = 'Jewelry Attachment'; })), 'duplicate');
    assert(/ATTACHED_OBJECT_UNRESOLVED/.test(errs((q) => { delete q.ownership_resolution; })), 'unresolved'); } },
  { name: 'OO-4 bag charm / chain attached to a bag: part of the bag record (F267 attachment Metal Hardware + silver hardware colour part); declaring the charm as a component attached_to the bag is refused', fn: () => {
    const r = run('F267'); assert(pool(r, 'c3', 'attachment').value === 'Metal Hardware' && points(r, 'c3').some((p) => p.color_family === 'silver' && p.carrier_part && p.carrier_part.carrier_ref === 'Metal Hardware'), 'charm inside the bag record');
    throws(() => X.registry.buildRegistry([{ ref: 'c3', identity: 'bag', participates: true }, { ref: 'c9', identity: 'jewellery', participates: true, attached_to: 'c3' }]), /ATTACHED_TO_ACCESSORY_NOT_A_COMPONENT/); } },
  { name: 'OO-5 belt intrinsic to the garment (F134 trench, M309 wrap coat: garment attachment Belt + waist_definition; device_is_own → no R-2, no component) vs independent belt (M323 / F298: component + R-2); a belt declared attached_to a garment in Mode A with a record `Belt` token resolves to one record', fn: () => {
    for (const id of ['F134', 'M309']) { const r = run(id); const s = r.packet.relations.securing_relations; assert(pool(r, 'c1', 'attachment').value === 'Belt' && !r.packet.component_registry.some((e) => e.object_identity.value === 'belt') && s.length === 1 && s[0].device_is_own === true && s[0].securing_ref === 'c1', id + ' own belt (V1.3: own-device entry — expectation deliberately changed from "no R-2")'); }
    for (const id of ['M323', 'F298']) { const r = run(id); assert(r.packet.component_registry.some((e) => e.object_identity.value === 'belt') && r.packet.relations.securing_relations.length === 1, id + ' independent belt'); }
    const f = fixture('F298'); f.objects.find((o) => o.ref === 'c4').attached_to = 'c1';
    const a = X.extract({ provider: new X.providers.ItemReuseProvider(new X.providers.FixtureProvider(f), { c1: { item_record_ref: 'HYPOTHETICAL-REC-F298-C1', facts: { attachment: 'Belt', material: 'Leather' } } }), requestedAxes: ['EI', 'TC'] });
    assert(a.validation.ok, a.validation.errors.join('; ')); assert(pool(a, 'c1', 'attachment').state === 'ABSENT' && a.packet.ownership_resolution[0].host_item_token === 'Belt', 'one belt record'); } },
  { name: 'OO-6 UNKNOWN attached object (F147 chain on the trousers): one component, resolution with no host token (no Item token describes it), colour kept', fn: () => {
    const r = run('F147'); assert(reg(r, 'c4').attached_to === 'c2' && r.packet.ownership_resolution[0].host_item_token === null && points(r, 'c4')[0].color_family === 'gold', 'F147'); } },
];

const carrier = [
  { name: 'CR-1 three objects stay separate: Style component_ref (registry id) · Colour V1 carrier_kind / carrier_ref inside carrier_part (provenance tokens, never a registry id) · optional carrier_part itself; no alias key (carrier_part.component_ref) exists', fn: () => {
    const r = run('F464', { axes: ['EI'] }); const hw = points(r, 'c4').find((p) => p.carrier_part);
    assert(typeof hw.carrier_ref === 'object' && hw.carrier_ref.value === 'c4' && reg(r, 'c4'), 'G-1 carrier_ref is the component'); assert(typeof hw.carrier_part.carrier_ref === 'string' && !reg(r, hw.carrier_part.carrier_ref) && C.CARRIER_KINDS.includes(hw.carrier_part.carrier_kind), 'carrier_part holds Colour V1 tokens');
    assert(Object.keys(hw.carrier_part).sort().join(',') === 'carrier_kind,carrier_ref', 'exact sub-fields'); assert(!/"component_ref"/.test(JSON.stringify(hw.carrier_part)), 'no alias');
    throws(() => X.g1.buildColourComposition([{ carrier: 'c1', family: 'gold', lightness: 'normal', effect: 'metallic', role: 'point', contrast: 'Distinct', part: { carrier_kind: 'attachment', carrier_ref: 'c1' } }], X.registry.buildRegistry([{ ref: 'c1', identity: 'bag', participates: true }])), /G1_PART_REF_IS_A_COMPONENT/);
    throws(() => X.g1.buildColourComposition([{ carrier: 'c1', family: 'gold', lightness: 'normal', effect: 'metallic', role: 'point', contrast: 'Distinct', part: { carrier_kind: 'hardware', carrier_ref: 'chain' } }], X.registry.buildRegistry([{ ref: 'c1', identity: 'bag', participates: true }])), /G1_PART_KIND_OUTSIDE_COLOUR_V1/); } },
  { name: 'CR-2 Colour V1 carrier raw provenance unchanged: the candidate reads CARRIER_KINDS from the frozen contract, never writes it, never redefines carrier_ref; carrier_part is optional (most points have none) and a part on a field is refused', fn: () => {
    const src = require('./helpers').srcText();                                                  // V1.3: recursive src scan
    assert(/COLOUR\.CARRIER_KINDS\.slice\(\)/.test(src) && !/COLOUR\.CARRIER_KINDS\s*=|CARRIER_KINDS\.push/.test(src), 'read-only reuse');
    const all = Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_')).flatMap((id) => run(id, { axes: ['EI'] }).packet.colour_composition.points); assert(all.some((p) => p.carrier_part) && all.filter((p) => !p.carrier_part).length > all.filter((p) => p.carrier_part).length, 'optional');
    throws(() => X.g1.buildColourComposition([{ carrier: 'c1', family: 'black', lightness: 'dark', effect: 'none', role: 'field', part: { carrier_kind: 'attachment', carrier_ref: 'Belt' } }], X.registry.buildRegistry([{ ref: 'c1', identity: 'Coat', participates: true }])), /G1_PART_ON_FIELD/); } },
  { name: 'CR-3 metallic separation proven: on F464 the gold point (colour family gold + effect metallic) · the bag surface Quilted (optical / constructed) · attachment Metal Hardware (hardware) · attachment Other (decoration) are four fields that do not collapse; on F392 metallic colour ≠ Reflective surface', fn: () => {
    const one = (v) => [].concat(v).join();
    const r = run('F464'); const gold = points(r, 'c4').find((p) => p.color_family === 'gold'); assert(gold.color_effect === 'metallic' && one(pool(r, 'c4', 'surface').value) === 'Quilted' && pool(r, 'c4', 'attachment').value.includes('Metal Hardware') && pool(r, 'c4', 'attachment').value.includes('Other'), 'four separate facts');
    const q = run('F392'); assert(points(q, 'c3')[0].color_effect === 'metallic' && one(pool(q, 'c3', 'surface').value) === 'Reflective' && pool(q, 'c3', 'attachment').state === 'ABSENT', 'metallic ≠ reflective ≠ hardware'); } },
  { name: 'CR-4 any participating component may be a G-1 carrier (garment · footwear · bag · headwear · scarf · jewellery · belt · eyewear · hosiery · tie · gloves · other · UNKNOWN): every family appears as a carrier across the fixtures', fn: () => {
    const seen = new Set(); for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const r = run(id, { axes: ['EI'] }); const kinds = Object.fromEntries(r.packet.component_registry.map((e) => [e.component_ref, e.object_identity.state === 'OBSERVED' ? (C.GARMENT_CATEGORIES.includes(e.object_identity.value) ? 'GARMENT' : e.object_identity.value) : 'UNKNOWN'])); for (const p of r.packet.colour_composition.points) if (p.carrier_ref.value) seen.add(kinds[p.carrier_ref.value]); for (const f of r.packet.colour_composition.field) for (const c of f.carrier_refs) seen.add(kinds[c]); }
    const missing = ['GARMENT', 'UNKNOWN', ...C.NON_GARMENT_KINDS].filter((k) => !seen.has(k)); assert(missing.length === 0, 'carriers missing: ' + missing.join(',')); } },
];

const routing = [
  { name: 'RT-1 Mode-B demand routing: an EI-only run with the colour gate resolved stores 0 accessory facts (F464 colour stop); the full path requests exactly the 6 appearance facts per accessory (never every field); cache hit on a second request', fn: () => {
    const stop = run('F464', { axes: ['EI'], signals: { ei_colour: true } }); assert(stop.packet.component_fact_pool.length === 0, 'colour stop → nothing requested');
    const full = run('F464', { axes: ['EI'] }); for (const e of full.packet.component_registry.filter((x) => X.registry.isNonGarment(x))) assert(full.packet.component_fact_pool.filter((f) => f.component_ref === e.component_ref).length === C.ACCESSORY_APPEARANCE_FACTS.length, e.component_ref + ' 6 facts');
    const f = fixture('F464'); const registry = X.registry.buildRegistry(f.objects); const p = new X.k2.ComponentFactPool(new X.providers.FixtureProvider(f), registry); p.request('A', 'c4', 'ei_appearance'); const second = p.request('B', 'c4', 'ei_appearance'); assert(second.cached.length === 6 && second.stored.length === 0, 'cache'); } },
  { name: 'RT-2 TC never requests accessories (product departure HOLD, TC-D-4b): no TC-1 ledger entry on a non-garment ref in any fixture; accessory evidence is still kept in the packet', fn: () => {
    for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const r = run(id); const ng = r.packet.component_registry.filter((e) => X.registry.isNonGarment(e)).map((e) => e.component_ref); assert(!r.packet.request_trace.k2_ledger.some((l) => l.requester === 'TC-1' && ng.includes(l.component_ref)), id + ' no TC request on accessories'); } } },
  { name: 'RT-3 cross-regression: on the 14 predecessor fixtures the garment-side evidence (garment registry entries, relations, upper realization, canonical exposure, garment fact-pool entries, garment colour carriers, frozen DM block) is byte-identical between the sealed V1 candidate (read-only) and V1.1', fn: () => {
    const V1 = require('../../STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_CANDIDATE/src'); const PRED = require('../../STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_CANDIDATE/fixtures/cases.json');
    const { FixtureGate } = require('./helpers'); let compared = 0;
    const { explainPoolDiff } = require('./rc_explained_diff');   // RC1: strict, ledger-proven explanations replace the INTEGRATED V1 blanket exclusion (every garment fact compared)
    const poolDiff = (a, b, garments) => { const d = explainPoolDiff(a, b, { refs: garments, allowNew: ['shoulder_drop'] /* V1.2 D-2 */ }); assert(d.unexplained.length === 0, 'unexplained pool difference ' + JSON.stringify(d.unexplained)); return d.explained; };
    for (const id of Object.keys(PRED).filter((k) => !k.startsWith('_'))) {
      const gate = new FixtureGate(PRED[id].gate_signals); const a = V1.extract({ provider: new V1.providers.FixtureProvider(JSON.parse(JSON.stringify(PRED[id]))), gateAuthority: gate }).packet; const b = run(id).packet;
      const garments = a.component_registry.filter((e) => e.object_identity.state === 'OBSERVED' && C.GARMENT_CATEGORIES.includes(e.object_identity.value)).map((e) => e.component_ref);
      // V1.2: the D-2 shoulder_drop entries (new raw fact) and the D-3 product_context metadata are deliberate extensions and are excluded from the byte comparison
      // V1.3 (CDM-05 B): a layer pair naming an accessory is no longer a garment layer relation (F033 cape-over-footwear) — such pairs are excluded from the byte comparison (deliberate); own-device securing entries did not exist in V1 (none in the 14 predecessor fixtures)
      const acc = (p) => new Set(p.component_registry.filter((e) => e.object_identity.state === 'OBSERVED' && !C.GARMENT_CATEGORIES.includes(e.object_identity.value)).map((e) => e.component_ref));
      const relOf = (p) => { const a = acc(p); return { layer_relations: p.relations.layer_relations.filter((l) => !a.has(l.over_ref) && !a.has(l.under_ref)), securing_relations: p.relations.securing_relations }; };
      const side = (p) => JSON.stringify({ reg: p.component_registry.filter((e) => garments.includes(e.component_ref)).map(({ product_context, ...e }) => e), rel: relOf(p), up: p.upper_realization ? { ...p.upper_realization, shoulder: (({ observation_group, ...s }) => s)(p.upper_realization.shoulder) } : null, ex: p.canonical_exposure || null, fieldG: (p.colour_composition ? p.colour_composition.field : []).map((f) => ({ ...f, carrier_refs: f.carrier_refs.filter((c) => garments.includes(c)) })), ptsG: (p.colour_composition ? p.colour_composition.points : []).filter((x) => garments.includes(x.carrier_ref.value)), dm: p.dm_subsystem ? p.dm_subsystem.look_detail_systems : p.dm_block_withheld ? p.dm_block_withheld.look_detail_systems : p.dm_evidence ? p.dm_evidence.look_detail_systems : null });   // INTEGRATED V1: systems compared (components assembled · visibility mapped — INT-02) · RC4 (Transport V2): the systems of the V2 record are compared the same way
      poolDiff(a, b, garments); assert(side(a) === side(b), id + ' garment side changed'); compared++;
    } assert(compared === 14, 'compared 14'); } },
];

module.exports = [...unknown, ...applicability, ...oneObject, ...carrier, ...routing];
