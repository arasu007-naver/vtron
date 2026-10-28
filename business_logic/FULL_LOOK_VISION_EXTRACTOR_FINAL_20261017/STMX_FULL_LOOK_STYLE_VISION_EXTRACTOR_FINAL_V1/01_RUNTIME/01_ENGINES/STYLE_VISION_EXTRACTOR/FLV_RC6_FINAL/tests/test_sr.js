'use strict';
const { X, run, fixture, providerA, assert, throws } = require('./helpers');
const C = X.contracts;

module.exports = [
  { name: 'SR-1 G-4 / G-5 / G-6 remain three separate records (M320 opposing forces: Oversized · Strong · Structured)', fn: () => {
    const u = run('M320', { axes: ['SR'] }).packet.upper_realization;
    assert(u.relation.value === 'Oversized' && u.shoulder.value === 'Strong' && u.shape_behaviour.value === 'Structured', 'separate values');
    assert(Object.keys(u).sort().join(',') === 'relation,shape_behaviour,shoulder,source_refs', 'no combined field'); } },
  { name: 'SR-2 G-6 all four production values are valid (Structured M323 · Semi-Structured F563 · Semi-Fluid F109 · Fluid F260)', fn: () => {
    const got = { M323: 'Structured', F563: 'Semi-Structured', F109: 'Semi-Fluid', F260: 'Fluid' };
    for (const [id, v] of Object.entries(got)) { const u = run(id, { axes: ['SR'] }).packet.upper_realization; assert(u.shape_behaviour.value === v, id + ' ' + v); }
    assert(C.G6_DOMAIN.join('|') === 'Structured|Semi-Structured|Semi-Fluid|Fluid', 'domain read from Item V1_3'); } },
  { name: 'SR-3 no Balanced: G-6 rejects it, no mapping exists in the code, no SR-consumer translation is stored', fn: () => {
    const f = fixture('M323'); f.upper.shape = { value: 'Balanced', state: 'OBSERVED' };
    throws(() => X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['SR'] }), /G-6 shape_behaviour: value outside domain/);
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'sr_realization.js'), 'utf8');
    assert(!/Balanced|STRUCTURE_SIDE|FLUID_SIDE|consumer/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no consumer mapping in sr_realization.js');
    assert(!('consumer' in run('M323', { axes: ['SR'] }).packet.upper_realization.shape_behaviour), 'no consumer field'); } },
  { name: 'SR-4 ambiguous middle boundary → UNKNOWN (M134 Semi-Structured | Semi-Fluid); same-side boundary keeps its value (F033, M303)', fn: () => {
    const u = run('M134', { axes: ['SR'] }).packet.upper_realization.shape_behaviour; assert(u.state === 'UNKNOWN' && u.value === undefined && u.ambiguity.length === 2, 'UNKNOWN with ambiguity recorded');
    assert(run('F033', { axes: ['SR'] }).packet.upper_realization.shape_behaviour.value === 'Semi-Fluid', 'F033 keeps Semi-Fluid');
    assert(run('M303', { axes: ['SR'] }).packet.upper_realization.shape_behaviour.value === 'Semi-Structured', 'M303 keeps Semi-Structured'); } },
  { name: 'SR-5 R-2 belt-presence negative control: separate belt at the trousers\' waistband → visible_constriction ABSENT (F391, F563); own belt → own-device entry, never a cross-component relation (V1.3 CDM-03 S1: expectation deliberately changed from "dropped")', fn: () => {
    for (const id of ['F391', 'F563']) { const s = run(id, { axes: ['SR'] }).packet.relations.securing_relations; assert(s.length === 1 && s[0].visible_constriction.state === 'ABSENT', id + ' ABSENT'); }
    const f = fixture('F563'); f.securing_relations = [{ securing: 'c4', affected: 'c3', region: 'Midriff / Waist', visible_constriction: 'OBSERVED', device_is_own: true }];
    throws(() => X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['SR'] }), /R2_OWN_DEVICE_WITH_SEPARATE_SECURING_REF/);   // an own device cannot name a separate securing component
    const g = fixture('F563'); g.securing_relations = [{ affected: 'c3', region: 'Midriff / Waist', visible_constriction: 'OBSERVED', device_is_own: true }];
    const s = X.extract({ provider: new X.providers.FixtureProvider(g), requestedAxes: ['SR'] }).packet.relations.securing_relations; assert(s.length === 1 && s[0].device_is_own === true && s[0].securing_ref === 'c3' && s[0].affected_ref === 'c3', 'own device carried on its own garment'); } },
  { name: 'SR-6 actual cinching positive: belt draws the cape / jacket in → OBSERVED (F033, M323); no magnitude field accepted', fn: () => {
    for (const id of ['F033', 'M323']) { const s = run(id, { axes: ['SR'] }).packet.relations.securing_relations; assert(s.length === 1 && s[0].visible_constriction.state === 'OBSERVED' && s[0].affected_ref === 'c1', id); }
    const f = fixture('F033'); f.securing_relations[0].magnitude = 'strong';
    throws(() => X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['SR'] }), /R2_MAGNITUDE_FIELD_PROHIBITED/); } },
  { name: 'SR-7 lower evidence cannot enter the Direction packet: an injected lower key is rejected; no strength_register exists', fn: () => {
    const f = fixture('M317'); f.upper.lower_relation = { value: 'Oversized', state: 'OBSERVED' };
    const r = X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['SR'] });
    assert(!('lower_relation' in r.packet.upper_realization) && r.validation.ok, 'builder ignores unknown upper keys');
    const p = run('M317', { axes: ['SR'] }).packet; p.upper_realization.lower = { value: 'Oversized', state: 'OBSERVED' };
    const v = X.validator.validatePacket(p); assert(!v.ok && v.errors.some((e) => /SR_UPPER_KEY lower/.test(e)), 'validator rejects a lower key');
    assert(!('strength_register' in run('M134').packet), 'no strength register'); } },
  { name: 'SR-8 no Item SR score read: record keys sr_direction / sr_score refused; derive uses raw fit / shoulder / fabric only (M308 Mode A)', fn: () => {
    throws(() => providerA('M308', { c1: { item_record_ref: 'R', facts: { fit: 'Regular', sr_direction: 'S' } } }), /ITEM_ENGINE_OUTPUT_NOT_ADMITTED/);
    const u = run('M308', { modeA: true, axes: ['SR'] }).packet.upper_realization;
    assert(u.relation.route === 'derived' && u.shoulder.route === 'derived' && u.shape_behaviour.route === 'derived' && u.shape_behaviour.value === 'Structured' && u.relation.lineage.item_record_ref === 'REC-M308-C1', 'derived from raw record facts'); } },
  { name: 'SR-9 own-waist request: Coat / Jacket → waist_definition stored; T-Shirt / Sweater → NOT_APPLICABLE, nothing stored; cape (UNKNOWN identity) → category-dependent fact NOT produced (V1.1 deliberate change: answered `unknown_identity`, nothing stored)', fn: () => {
    assert(run('M317', { axes: ['SR'] }).packet.component_fact_pool.some((f) => f.fact === 'waist_definition' && f.value === 'Undefined'), 'M317 stored');
    const t = run('M134', { axes: ['SR'] }); assert(!t.packet.component_fact_pool.some((f) => f.fact === 'waist_definition') && t.packet.request_trace.k2_ledger[0].not_applicable.includes('waist_definition'), 'M134 waist NOT_APPLICABLE not stored (V1.2: the sweater shoulder_drop IS stored by the D-2 request — expectation deliberately extended)');
    const cr = run('F033', { axes: ['SR'] }); assert(!cr.packet.component_fact_pool.some((f) => f.fact === 'waist_definition'), 'cape: nothing stored');
    assert(cr.packet.request_trace.k2_ledger.some((l) => l.requester === 'SR' && l.component_ref === 'c1' && l.unknown_identity.includes('waist_definition')), 'cape: waist_definition answered unknown_identity'); } },
];
