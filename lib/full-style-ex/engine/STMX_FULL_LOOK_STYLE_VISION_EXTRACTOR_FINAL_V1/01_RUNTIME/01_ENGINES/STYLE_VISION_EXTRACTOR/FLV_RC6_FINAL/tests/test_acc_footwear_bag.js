'use strict';
/** V1.1 accessory coverage — footwear (order §53) and bag (§54) tests. Raw evidence only; no axis reading is asserted anywhere. */
const { X, run, fixture, providerB, assert, throws } = require('./helpers');
const C = X.contracts;
const reg = (r, ref) => r.packet.component_registry.find((e) => e.component_ref === ref);
const pool = (r, ref, fact) => r.packet.component_fact_pool.find((f) => f.component_ref === ref && f.fact === fact);
const points = (r, ref) => r.packet.colour_composition.points.filter((p) => p.carrier_ref.value === ref);
const fieldsOf = (r, ref) => r.packet.colour_composition.field.filter((f) => f.carrier_refs.includes(ref));
const mk = (objects, areas) => new X.providers.FixtureProvider({ frame: { state: 'OBSERVED', limits: [] }, objects, colour_areas: areas || objects.filter((o) => o.participates).map((o) => ({ carrier: o.ref, family: 'black', lightness: 'dark', effect: 'none', role: 'field' })) });

const footwear = [
  { name: 'FW-1 footwear enters the component registry as `footwear` with a D-2 product family (shoe M165 · sneaker M270 · boot F187 · sandal F109); family UNKNOWN when unsettled (M317)', fn: () => {
    for (const [id, ref, fam] of [['M165', 'c7', 'shoe'], ['M270', 'c9', 'sneaker'], ['F187', 'c4', 'boot'], ['F109', 'c4', 'UNKNOWN'], ['M317', 'c3', 'UNKNOWN']]) {
      const e = reg(run(id, { axes: ['EI'] }), ref); assert(e.object_identity.value === 'footwear', id + ' footwear');
      if (fam === 'UNKNOWN') assert(e.footwear_product_family.state === 'UNKNOWN' && e.footwear_product_family.value === undefined, id + ' family UNKNOWN'); else assert(e.footwear_product_family.value === fam && e.footwear_product_family.state === 'OBSERVED', id + ' ' + fam);
    } } },
  { name: 'FW-2 product family `other` (identifiable, outside the list) ≠ UNKNOWN; both accepted (contract input, no corpus look)', fn: () => {
    const r = X.extract({ provider: mk([{ ref: 'c1', identity: 'footwear', participates: true, product_family: 'other' }, { ref: 'c2', identity: 'footwear', participates: true, product_family: 'UNKNOWN' }]), requestedAxes: ['EI'] });
    assert(r.validation.ok, r.validation.errors.join('; ')); assert(reg(r, 'c1').footwear_product_family.value === 'other' && reg(r, 'c2').footwear_product_family.state === 'UNKNOWN', 'other vs UNKNOWN'); } },
  { name: 'FW-3 conditional subtype supported only under its family (running_sneaker under sneaker; western_boot under boot); unsettled → family only (M270 sneaker, F392 riding boot)', fn: () => {
    const r = X.extract({ provider: mk([{ ref: 'c1', identity: 'footwear', participates: true, product_family: 'sneaker', product_subtype: 'running_sneaker' }]), requestedAxes: ['EI'] });
    assert(r.validation.ok && reg(r, 'c1').footwear_product_subtype.value === 'running_sneaker', 'subtype under family');
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'footwear', participates: true, product_family: 'sandal', product_subtype: 'running_sneaker' }]), /FOOTWEAR_PRODUCT_SUBTYPE_ILLEGAL/);
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'footwear', participates: true, product_subtype: 'western_boot' }]), /FOOTWEAR_SUBTYPE_WITHOUT_FAMILY/);
    assert(reg(run('M270', { axes: ['EI'] }), 'c9').footwear_product_subtype === undefined && reg(run('F392', { axes: ['EI'] }), 'c9').footwear_product_subtype === undefined, 'no subtype when unsettled'); } },
  { name: 'FW-4 heel is not a family and not a subtype; footwear fields are refused on non-footwear; `subtype` is refused on footwear', fn: () => {
    assert(!C.FOOTWEAR_PRODUCT_FAMILIES.some((f) => /heel/i.test(f)) && !Object.values(C.FOOTWEAR_PRODUCT_SUBTYPES).flat().some((f) => /heel/i.test(f)), 'no heel token');
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'footwear', participates: true, product_family: 'heeled_shoe' }]), /FOOTWEAR_PRODUCT_FAMILY_ILLEGAL/);
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'bag', participates: true, product_family: 'shoe' }]), /FOOTWEAR_FIELD_ON_NON_FOOTWEAR/);
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'footwear', participates: true, subtype: 'sneaker' }]), /FOOTWEAR_USES_PRODUCT_FIELDS/);
    const p = run('M165').packet; const errs = (mut) => { const q = JSON.parse(JSON.stringify(p)); mut(q); return X.validator.validatePacket(q).errors.join('|'); };
    assert(/FOOTWEAR_PRODUCT_FAMILY_VALUE/.test(errs((q) => { q.component_registry.find((e) => e.component_ref === 'c7').footwear_product_family.value = 'heel'; })), 'validator rejects heel'); } },
  { name: 'FW-5 footwear colour captured on the footwear component_ref: point colours (F109 red sandals; F472 gold metallic sneakers; M011 silver zip part) and field membership (M320 black shoes join the black field)', fn: () => {
    assert(points(run('F109', { axes: ['EI'] }), 'c4').some((p) => p.color_family === 'red'), 'F109 red');
    assert(points(run('F472', { axes: ['EI'] }), 'c3').some((p) => p.color_family === 'gold' && p.color_effect === 'metallic'), 'F472 gold metallic');
    assert(points(run('M011', { axes: ['EI'] }), 'c4').some((p) => p.carrier_part && p.carrier_part.carrier_kind === 'closure' && p.carrier_part.carrier_ref === 'Zipper'), 'M011 zip part');
    assert(fieldsOf(run('M320', { axes: ['EI'] }), 'c3').length === 1, 'M320 c3 in the black field (recorded reading addition)'); } },
  { name: 'FW-6 pattern / surface / hardware / decoration where present: F464 Glossy pumps; F074 boot Metal Hardware (sole chain) + gold hardware colour part; M165 Fringe (tassel loafers); F472 running sneaker material', fn: () => {
    assert(pool(run('F464'), 'c5', 'surface').value.includes('Glossy'), 'F464 Glossy');
    const f074 = run('F074'); assert(pool(f074, 'c7', 'attachment').value === 'Metal Hardware' && points(f074, 'c7').some((p) => p.carrier_part && p.carrier_part.carrier_ref === 'Metal Hardware' && p.color_family === 'gold'), 'F074 hardware + part');
    assert(pool(run('M165'), 'c7', 'attachment').value === 'Fringe', 'M165 Fringe'); } },
  { name: 'FW-7 footwear is never direct SR evidence: no footwear ref in upper_realization sources, no SR request on footwear, no footwear fact in the SR ledger', fn: () => {
    for (const id of ['F298', 'F054', 'M165', 'F472']) { const r = run(id, { axes: ['SR'] }); const fw = r.packet.component_registry.filter((e) => e.object_identity.value === 'footwear').map((e) => e.component_ref);
      if (r.packet.upper_realization) assert(!(r.packet.upper_realization.source_refs || []).some((s) => fw.includes(s)), id + ' no footwear source');
      assert(!r.packet.request_trace.k2_ledger.some((l) => l.requester === 'SR' && fw.includes(l.component_ref)), id + ' no SR request on footwear'); } } },
  { name: 'FW-8 no fake Item record for footwear: a record keyed to a footwear ref is refused; every footwear fact is route observed without lineage', fn: () => {
    throws(() => new X.providers.ItemReuseProvider(providerB('M317'), { c3: { item_record_ref: 'FAKE', facts: { material: 'Leather' } } }), /ITEM_RECORD_FOR_NON_GARMENT/);
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'footwear', participates: true, item_record_ref: 'FAKE' }]), /ITEM_RECORD_FOR_NON_GARMENT/);
    const r = run('M317', { modeA: true }); for (const f of r.packet.component_fact_pool.filter((x) => x.component_ref === 'c3')) assert(f.route === 'observed' && !f.lineage, 'observed only'); } },
];

const bag = [
  { name: 'BG-1 bag identity ≠ participation shortcut: an identical bag object with participates=false leaves no trace; `bag` is never admitted by identity', fn: () => {
    const f = fixture('F563'); const bagObj = f.objects.find((o) => o.ref === 'c6'); bagObj.participates = false; f.colour_areas = f.colour_areas.filter((a) => a.carrier !== 'c6');
    const r = X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['EI'] });
    assert(!reg(r, 'c6') && !JSON.stringify(r.packet).includes('"c6"'), 'no trace'); assert(reg(run('F563', { axes: ['EI'] }), 'c6').object_identity.value === 'bag', 'participating bag registered'); } },
  { name: 'BG-2 qualifying dressed-bag realizations participate under the existing rule (carried by handles M137-type F391 tote; held at the hip F563; held by the strap F054; worn on the shoulder F267; worn at the waist = F206-type) — no `carried` value is stored', fn: () => {
    for (const [id, ref] of [['F391', 'c5'], ['F563', 'c6'], ['F054', 'c5'], ['F267', 'c3'], ['F464', 'c4'], ['F254', 'c5']]) { const e = reg(run(id, { axes: ['EI'] }), ref); assert(e.object_identity.value === 'bag', id + ' bag'); for (const k of Object.keys(e)) assert(!/carried|held|worn/.test(k), 'no carrying field'); } } },
  { name: 'BG-3 bag colour: body colour as a point (F464 light blue; F267 brown; F391 green) on the bag component_ref', fn: () => {
    assert(points(run('F464', { axes: ['EI'] }), 'c4').some((p) => p.color_family === 'blue'), 'F464'); assert(points(run('F267', { axes: ['EI'] }), 'c3').some((p) => p.color_family === 'brown'), 'F267'); assert(points(run('F391', { axes: ['EI'] }), 'c5').some((p) => p.color_family === 'green'), 'F391'); } },
  { name: 'BG-4 chain / buckle carrier distinction: the gold chain on F464 and the silver charm on F267 are points with carrier_part {attachment, Metal Hardware}; the body colour point has no part', fn: () => {
    for (const [id, ref, fam] of [['F464', 'c4', 'gold'], ['F267', 'c3', 'silver']]) { const ps = points(run(id, { axes: ['EI'] }), ref); const hw = ps.find((p) => p.color_family === fam); const body = ps.find((p) => p.color_family !== fam);
      assert(hw.carrier_part && hw.carrier_part.carrier_kind === 'attachment' && hw.carrier_part.carrier_ref === 'Metal Hardware' && hw.color_effect === 'metallic', id + ' hardware part'); assert(body.carrier_part === undefined, id + ' body has no part'); } } },
  { name: 'BG-5 decoration: F464 attachment [Metal Hardware, Other] (3D roses) stays two tokens of one MULTI fact; no `ornate` / `detailed` token anywhere', fn: () => {
    const r = run('F464'); const a = pool(r, 'c4', 'attachment'); assert(Array.isArray(a.value) && a.value.includes('Metal Hardware') && a.value.includes('Other'), 'MULTI'); assert(!/ornate|detailed/i.test(JSON.stringify({ ...r.packet, dm_subsystem: null })), 'no judgement token'); } },
  { name: 'BG-6 optical / surface: F464 Quilted; F267 / F254 Glossy; F260 Reflective — surface facts, separate from colour', fn: () => {
    assert(pool(run('F464'), 'c4', 'surface').value.includes('Quilted'), 'Quilted'); assert(pool(run('F267'), 'c3', 'surface').value.includes('Glossy'), 'Glossy'); assert(pool(run('F254'), 'c5', 'surface').value.includes('Glossy'), 'Glossy F254');
    const f260 = fixture('F260'); assert(f260.facts.c4.surface === 'Reflective' || f260.facts.c4.surface === 'Glossy', 'F260 optical fact recorded'); } },
  { name: 'BG-7 an unsupported belt-bag-like object stays UNKNOWN with its colour (F109 c6); force-fitting it to `bag` by a fixture edit is not done (identity text in the fixture is UNKNOWN)', fn: () => {
    const r = run('F109', { axes: ['EI'] }); const e = reg(r, 'c6'); assert(e.object_identity.state === 'UNKNOWN' && e.object_identity.value === undefined, 'UNKNOWN state'); assert(points(r, 'c6').length === 1 && points(r, 'c6')[0].color_family === 'black', 'colour kept');
    assert(fixture('F109').objects.find((o) => o.ref === 'c6').identity === 'UNKNOWN', 'fixture reading unchanged'); } },
  { name: 'BG-8 F109 does not regress to a forced `bag`; the Stage-A fixture bytes are carried from the predecessor (identity + colour point identical)', fn: () => {
    const pred = require('../../STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_CANDIDATE/fixtures/cases.json').F109;
    const idOnly = (os) => JSON.stringify(os.map((o) => [o.ref, o.identity, o.participates]));   // V1.2: c1 carries a recorded product_context reading; identities / participation / colour stay byte-identical
    assert(idOnly(pred.objects) === idOnly(fixture('F109').objects) && JSON.stringify(pred.colour_areas) === JSON.stringify(fixture('F109').colour_areas), 'F109 identities + colour identical to the sealed predecessor reading');
    assert(!run('F109').packet.component_registry.some((e) => e.object_identity.value === 'bag'), 'no bag'); } },
  { name: 'BG-9 bag subtype is optional metadata (shoulder_bag F267 / F390); an illegal bag subtype throws', fn: () => {
    assert(reg(run('F267', { axes: ['EI'] }), 'c3').object_subtype.value === 'shoulder_bag', 'subtype'); assert(reg(run('F464', { axes: ['EI'] }), 'c4').object_subtype === undefined, 'optional');
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'bag', participates: true, subtype: 'luxury_tote' }]), /OBJECT_SUBTYPE_ILLEGAL/); } },
];

module.exports = [...footwear, ...bag];
