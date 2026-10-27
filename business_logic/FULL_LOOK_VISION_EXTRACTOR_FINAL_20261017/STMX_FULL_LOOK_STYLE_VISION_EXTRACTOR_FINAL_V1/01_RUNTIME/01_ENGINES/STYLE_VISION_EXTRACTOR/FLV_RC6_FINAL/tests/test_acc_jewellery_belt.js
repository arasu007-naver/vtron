'use strict';
/** V1.1 accessory coverage — jewellery (order §55) and belt (§56) tests. Raw evidence only. */
const { X, run, fixture, assert, throws } = require('./helpers');
const C = X.contracts;
const reg = (r, ref) => r.packet.component_registry.find((e) => e.component_ref === ref);
const pool = (r, ref, fact) => r.packet.component_fact_pool.find((f) => f.component_ref === ref && f.fact === fact);
const points = (r, ref) => r.packet.colour_composition.points.filter((p) => p.carrier_ref.value === ref);
const sec = (r) => r.packet.relations.securing_relations;

const jewellery = [
  { name: 'JW-1 jewellery family registered (F054 earrings + brooch, F086-type necklace F134, F187 crystal earrings, F254 chains, M269 watch); subtype optional (F390 c5 cuff-or-watch has none)', fn: () => {
    for (const [id, ref] of [['F054', 'c3'], ['F054', 'c4'], ['F134', 'c3'], ['F187', 'c2'], ['F254', 'c3'], ['M269', 'c8'], ['F390', 'c5']]) assert(reg(run(id, { axes: ['EI'] }), ref).object_identity.value === 'jewellery', id + ' ' + ref);
    assert(reg(run('F390', { axes: ['EI'] }), 'c5').object_subtype === undefined, 'unsettled subtype omitted'); } },
  { name: 'JW-2 necklace / chain / watch / brooch subtypes are optional metadata, legal only inside the jewellery list; no top-level necklace / watch family exists', fn: () => {
    assert(reg(run('F134', { axes: ['EI'] }), 'c3').object_subtype.value === 'necklace' && reg(run('F254', { axes: ['EI'] }), 'c3').object_subtype.value === 'chain' && reg(run('M269', { axes: ['EI'] }), 'c8').object_subtype.value === 'watch' && reg(run('F054', { axes: ['EI'] }), 'c4').object_subtype.value === 'brooch', 'subtypes');
    for (const t of ['necklace', 'earrings', 'watch', 'sunglasses', 'sneaker', 'handbag']) { assert(!C.NON_GARMENT_KINDS.includes(t), t + ' is not a family'); throws(() => X.registry.resolveIdentity(t), /IDENTITY_OUTSIDE_CANDIDATE_VOCABULARY/); }
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'jewellery', participates: true, subtype: 'tiara' }]), /OBJECT_SUBTYPE_ILLEGAL/); } },
  { name: 'JW-3 gold / silver are colour families independent of the metallic effect: F054 gold + metallic; a gold family with effect none and a silver with metallic are both representable', fn: () => {
    const p = points(run('F054', { axes: ['EI'] }), 'c3')[0]; assert(p.color_family === 'gold' && p.color_effect === 'metallic', 'F054');
    assert(C.COLOUR_FAMILIES.includes('gold') && C.COLOUR_FAMILIES.includes('silver') && C.COLOUR_EFFECT.includes('metallic') && C.COLOUR_EFFECT.includes('none'), 'independent domains');
    const r = X.extract({ provider: new X.providers.FixtureProvider({ objects: [{ ref: 'c1', identity: 'jewellery', participates: true }], colour_areas: [{ carrier: 'c1', family: 'gold', lightness: 'normal', effect: 'none', role: 'point', contrast: 'Distinct' }] }), requestedAxes: ['EI'] });
    assert(r.validation.ok && points(r, 'c1')[0].color_effect === 'none', 'gold without metallic effect is a lawful observation'); } },
  { name: 'JW-4 metallic colour effect ≠ optical surface fact: F392 eyewear = gold metallic point AND surface Reflective (two facts); F054 jewellery = metallic point and surface ABSENT', fn: () => {
    const r = run('F392'); assert(points(r, 'c3').some((p) => p.color_effect === 'metallic') && pool(r, 'c3', 'surface').value.includes('Reflective'), 'two separate facts');
    const j = run('F054'); assert(points(j, 'c3').some((p) => p.color_effect === 'metallic') && pool(j, 'c3', 'surface').state === 'ABSENT', 'metallic without an optical surface fact'); } },
  { name: 'JW-5 hardware / form is a separate fact: F254 layered chains carry attachment Metal Hardware; F086-type plain necklace (F134) carries attachment ABSENT though its colour is gold metallic', fn: () => {
    assert(pool(run('F254'), 'c3', 'attachment').value === 'Metal Hardware', 'F254 hardware'); const f = run('F134'); assert(pool(f, 'c3', 'attachment').state === 'ABSENT' && points(f, 'c3')[0].color_effect === 'metallic', 'F134 no hardware fact, metallic colour'); } },
  { name: 'JW-6 decoration is a separate fact: F187 / F390 / F464 earrings → decorative_detail Sequin-Beading; F054 discs → ABSENT', fn: () => {
    for (const [id, ref] of [['F187', 'c2'], ['F390', 'c4'], ['F464', 'c2']]) assert(pool(run(id), ref, 'decorative_detail').value === 'Sequin-Beading', id); assert(pool(run('F054'), 'c3', 'decorative_detail').state === 'ABSENT', 'F054'); } },
  { name: 'JW-7 no E / D label: no jewellery rule maps gold / silver / metallic / chain to any token outside the raw facts (src scan + packet scan of every jewellery look)', fn: () => {
    const src = require('./helpers').srcText();                                                  // V1.3: src has sub-directories (transport / diagnostics) — recursive scan
    assert(!/(gold|silver|metallic|jewellery|chain)[^\n]{0,40}(→|->|=)\s*['"]?(E|D|Expressive|Detailed)\b/i.test(src), 'no shortcut in src');
    for (const id of ['F054', 'F134', 'F187', 'F254', 'M269', 'F464', 'M320', 'M308']) { const p = run(id).packet; const s = JSON.stringify({ ...p, dm_subsystem: null, dm_block_withheld: null, dm_evidence: null });   /* RC4 (Transport V2): DM record excluded like dm_subsystem */ assert(!/"(E|I|T|C|S|R|M|D)"/.test(s.replace(/"requested_axes":\[[^\]]*\]/, '')), id + ' no axis letter'); assert(!/expressive|detailed/i.test(s), id + ' no verdict word'); } } },
  { name: 'JW-8 unreadable jewellery → colour NOT_VISIBLE / UNKNOWN (unreadable list), never hallucinated; a participant with no colour record at all fails closed', fn: () => {
    const r = X.extract({ provider: new X.providers.FixtureProvider({ objects: [{ ref: 'c1', identity: 'Jacket', participates: true }, { ref: 'c2', identity: 'jewellery', participates: true }], colour_areas: [{ carrier: 'c1', family: 'black', lightness: 'dark', effect: 'none', role: 'field' }, { carrier: 'c2', state: 'UNKNOWN' }], facts: { c2: { surface: 'UNKNOWN' } } }), requestedAxes: ['EI'] });
    assert(r.validation.ok && r.packet.colour_composition.unreadable.some((u) => u.carrier_ref === 'c2' && u.state === 'UNKNOWN') && points(r, 'c2').length === 0, 'unreadable recorded');
    throws(() => X.extract({ provider: new X.providers.FixtureProvider({ objects: [{ ref: 'c1', identity: 'Jacket', participates: true }, { ref: 'c2', identity: 'jewellery', participates: true }], colour_areas: [{ carrier: 'c1', family: 'black', lightness: 'dark', effect: 'none', role: 'field' }] }), requestedAxes: ['EI'] }), /G1_COMPONENT_WITHOUT_COLOUR_OPPORTUNITY/); } },
];

const belt = [
  { name: 'BT-1 belt component identity (F225 · F012 chain_belt · F392 two belts = two components · M214 · F065 · M323); no belt count anywhere', fn: () => {
    for (const [id, ref] of [['F225', 'c2'], ['F012', 'c4'], ['F392', 'c5'], ['F392', 'c6'], ['M214', 'c6'], ['F065', 'c3'], ['M323', 'c2']]) assert(reg(run(id, { axes: ['EI'] }), ref).object_identity.value === 'belt', id + ' ' + ref);
    assert(reg(run('F012', { axes: ['EI'] }), 'c4').object_subtype.value === 'chain_belt', 'chain_belt subtype'); assert(!/belt_count|n_belts/.test(JSON.stringify(run('F392').packet)), 'no count'); } },
  { name: 'BT-2 belt colour on the belt component_ref (F225 camel; M323 black field — recorded reading addition; F065 black Tonal)', fn: () => {
    assert(points(run('F225', { axes: ['EI'] }), 'c2').some((p) => p.color_family === 'camel'), 'F225'); assert(run('M323', { axes: ['EI'] }).packet.colour_composition.field.some((f) => f.carrier_refs.includes('c2')), 'M323 field'); assert(points(run('F065', { axes: ['EI'] }), 'c3').some((p) => p.contrast_with_field === 'Tonal'), 'F065 Tonal'); } },
  { name: 'BT-3 belt hardware: attachment Metal Hardware (F225 / F065 / M214) + buckle colour as a point with carrier_part {attachment, Metal Hardware} (M323 silver, F392 gold)', fn: () => {
    for (const [id, ref] of [['F225', 'c2'], ['F065', 'c3'], ['M214', 'c6']]) assert(pool(run(id), ref, 'attachment').value === 'Metal Hardware', id);
    assert(points(run('M323', { axes: ['EI'] }), 'c2').some((p) => p.color_family === 'silver' && p.carrier_part && p.carrier_part.carrier_ref === 'Metal Hardware'), 'M323 buckle part'); assert(points(run('F392', { axes: ['EI'] }), 'c5').some((p) => p.carrier_part), 'F392 part'); } },
  { name: 'BT-4 belt decoration: F012 chain belt → attachment [Metal Hardware, Fringe] + decorative_detail Sequin-Beading (set stones) + red stone colour part {attachment, Other}', fn: () => {
    const r = run('F012'); const a = pool(r, 'c4', 'attachment').value; assert(a.includes('Metal Hardware') && a.includes('Fringe') && pool(r, 'c4', 'decorative_detail').value === 'Sequin-Beading', 'facts');
    assert(points(r, 'c4').some((p) => p.color_family === 'red' && p.carrier_part && p.carrier_part.carrier_kind === 'attachment' && p.carrier_part.carrier_ref === 'Other'), 'stone colour part'); } },
  { name: 'BT-5 belt present but no cinching: F065 / F391 / M165 / F012 / M270 / F392 → R-2 visible_constriction ABSENT; the belt identity alone never creates a securing relation (M214-type belt without a relation entry → none)', fn: () => {
    for (const id of ['F065', 'F391', 'M165', 'F012', 'M270', 'F392']) for (const s of sec(run(id))) assert(s.visible_constriction.state === 'ABSENT', id + ' ABSENT');
    const f = fixture('F065'); f.securing_relations = []; const r = X.extract({ provider: new X.providers.FixtureProvider(f) }); assert(reg(r, 'c3').object_identity.value === 'belt' && sec(r).length === 0, 'identity without relation = no R-2'); } },
  { name: 'BT-6 belt with actual cinching: F225 / F298 / M323 → R-2 visible_constriction OBSERVED on the affected garment; F418 cord belt → UNKNOWN (not settled)', fn: () => {
    for (const [id, affected] of [['F225', 'c1'], ['F298', 'c1'], ['M323', 'c1']]) { const s = sec(run(id)); assert(s.length === 1 && s[0].affected_ref === affected && s[0].visible_constriction.state === 'OBSERVED', id); }
    assert(sec(run('F418'))[0].visible_constriction.state === 'UNKNOWN', 'F418 UNKNOWN'); } },
  { name: 'BT-7 no SR verdict: R-2 carries only the physical state (no magnitude, no S / R / Structured token); an own belt (F134 / M309 device_is_own) produces an own-device entry (securing_ref = affected_ref, device_is_own true — V1.3 CDM-03 S1, expectation deliberately changed from "no R-2") and no belt component', fn: () => {
    const r = run('F225'); for (const s of sec(r)) { for (const k of Object.keys(s)) assert(!/magnitude|degree|strength|verdict/i.test(k), 'no magnitude'); } assert(!/structured|relaxed/i.test(JSON.stringify(r.packet.relations)), 'no SR word');
    for (const id of ['F134', 'M309']) { const q = run(id); const s = sec(q); assert(s.length === 1 && s[0].device_is_own === true && s[0].securing_ref === 'c1' && s[0].affected_ref === 'c1' && !q.packet.component_registry.some((e) => e.object_identity.value === 'belt'), id + ' own belt: own-device entry, no component'); assert(pool(q, 'c1', 'attachment').value === 'Belt', id + ' garment record holds its own belt'); } } },
];

module.exports = [...jewellery, ...belt];
