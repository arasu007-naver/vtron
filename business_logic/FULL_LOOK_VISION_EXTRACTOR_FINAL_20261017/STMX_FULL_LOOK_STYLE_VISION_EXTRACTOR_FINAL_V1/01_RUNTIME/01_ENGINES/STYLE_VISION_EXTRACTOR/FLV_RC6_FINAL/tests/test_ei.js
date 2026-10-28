'use strict';
const { X, run, fixture, providerB, assert, throws, storedFor } = require('./helpers');
const noVerdict = (packet) => { const s = JSON.stringify({ ...packet, dm_subsystem: undefined, dm_block_withheld: undefined, dm_evidence: undefined /* RC4 (Transport V2): dm_evidence is the DM record — excluded like dm_subsystem · INTEGRATED V1: the withheld DM twin is a DM block (G65) — excluded like dm_subsystem */ }); assert(!/"(E|I)"/.test(s.replace(/"requested_axes":\[[^\]]*\]/, '')), 'no E / I in packet'); assert(!/expressive|qualif|accent/i.test(s), 'no judgement word'); };

module.exports = [
  { name: 'EI-1 G-1 packet creation (F109): field + points + carriers, Colour V1 domains, validation ok', fn: () => {
    const r = run('F109'); assert(r.validation.ok, r.validation.errors.join('; '));
    const g = r.packet.colour_composition; assert(g.field.length === 3 && g.points.length === 3, 'field 3 / points 3');
    assert(g.field.every((f) => X.contracts.COLOUR_FAMILIES.includes(f.color_family)), 'families'); } },
  { name: 'EI-2 point carrier attribution: the red point is carried by worn footwear c4 (F109)', fn: () => {
    const g = run('F109').packet.colour_composition; const red = g.points.find((p) => p.color_family === 'red');
    assert(red && red.carrier_ref.value === 'c4' && red.contrast_with_field === 'Distinct', 'red @ c4 Distinct'); } },
  { name: 'EI-3 repeated pattern dedup (IX-7): 3 embroidered-motif areas on c1 → one pink point; 2 stripe areas → one field entry (F444 / M303)', fn: () => {
    const g = run('F444', { axes: ['EI'] }).packet.colour_composition;
    assert(g.points.filter((p) => p.color_family === 'pink').length === 1, 'one pink point');
    const m = run('M303').packet.colour_composition; const stripe = m.field.filter((f) => f.color_family === 'white_family');
    assert(stripe.length === 1 && stripe[0].carrier_refs.length === 2, 'one white_family field entry with 2 carriers'); } },
  { name: 'EI-4 carried non-worn garment excluded (M178 coat over the shoulder, F260 coat over the arm): not in registry, not a carrier', fn: () => {
    for (const id of ['M178', 'F260']) { const r = run(id); assert(!r.packet.component_registry.some((e) => e.component_ref === 'x1'), id + ' x1 excluded'); assert(JSON.stringify(r.packet.colour_composition).indexOf('"x1"') < 0, id + ' no carrier x1'); }
    const f = fixture('F260'); f.colour_areas.push({ carrier: 'x1', family: 'white_family', lightness: 'light', effect: 'none', role: 'point', contrast: 'Subtle' });
    throws(() => X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['EI'] }), /G1_CARRIER_NOT_PARTICIPANT/); } },
  { name: 'EI-5 participating footwear / accessory inclusion: gold sneakers (F472), tote colours (F391), shoulder bag (F444), hand-held clutch (F260)', fn: () => {
    assert(run('F472').packet.colour_composition.points.some((p) => p.carrier_ref.value === 'c3' && p.color_family === 'gold' && p.color_effect === 'metallic'), 'F472 gold @ c3');
    assert(run('F391').packet.colour_composition.points.filter((p) => p.carrier_ref.value === 'c5').length === 3, 'F391 three colours on the tote');
    assert(run('F444', { axes: ['EI'] }).packet.colour_composition.points.some((p) => p.carrier_ref.value === 'c6' && p.color_family === 'wine'), 'F444 wine bag');
    assert(run('F260').packet.colour_composition.points.some((p) => p.carrier_ref.value === 'c4'), 'F260 clutch'); } },
  { name: 'EI-6 colour early stop: EI_COLOUR_GATE_RESOLVED → no exposure request, no appearance request (F109, F444 with visible exposure)', fn: () => {
    for (const id of ['F109', 'F444']) { const r = run(id, { axes: ['EI'] }); const t = r.packet.request_trace.axes.EI;
      assert(t.exposure_requested === false && t.appearance_requested === false && storedFor(r, 'EI-2') === 0, id + ' nothing requested');
      assert(!r.packet.canonical_exposure, id + ' exposure block absent'); assert(r.gate.calls.join(',') === 'eiColour', id + ' only the colour gate consulted'); } } },
  { name: 'EI-7 secondary EI request only when colour unresolved: M317 stops at exposure; M134 walks the full appearance path', fn: () => {
    const a = run('M317', { axes: ['EI'] }); const ta = a.packet.request_trace.axes.EI;
    assert(ta.exposure_requested && !ta.appearance_requested && a.packet.canonical_exposure.events.length === 1 && storedFor(a, 'EI-2') === 0, 'M317 exposure stop');
    const b = run('M134', { axes: ['EI'] }); const tb = b.packet.request_trace.axes.EI;
    assert(tb.appearance_requested && storedFor(b, 'EI-2') === 18, 'M134 appearance 18 facts (6 × 3 components)');
    assert(b.packet.component_fact_pool.every((f) => X.contracts.FACT_FAMILIES.ei_appearance.includes(f.fact)), 'only appearance facts in the pool'); } },
  { name: 'EI-8 no E / I verdict and no judgement token in any packet (all fixtures)', fn: () => { for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const r = run(id); noVerdict(r.packet); assert(r.validation.ok, id + ': ' + r.validation.errors.join('; ')); } } },
  { name: 'EI-9 hidden colour fixture: a colour area is only recorded when visible; G-1 rejects extent / area fields', fn: () => {
    const f = fixture('M308'); f.colour_areas.push({ carrier: 'c2', family: 'red', lightness: 'normal', effect: 'none', role: 'point', contrast: 'Distinct', area_share: 0.2 });
    throws(() => X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['EI'] }), /G1_REJECTED_FIELD/); } },
  { name: 'EI-10 Colour V1 stitching suppression honoured (M178, M323): suppressed list, never a point', fn: () => {
    for (const id of ['M178', 'M323']) { const g = run(id).packet.colour_composition; assert(g.suppressed.length >= 1 && g.suppressed[0].rule.startsWith('COLOUR_V1_SUPPRESSION'), id + ' suppressed'); } } },
];
