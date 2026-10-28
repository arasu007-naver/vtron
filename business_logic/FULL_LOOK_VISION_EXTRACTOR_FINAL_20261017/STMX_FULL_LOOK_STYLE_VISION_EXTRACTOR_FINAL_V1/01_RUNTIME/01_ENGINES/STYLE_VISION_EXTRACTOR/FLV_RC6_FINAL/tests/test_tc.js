'use strict';
const { X, run, fixture, providerA, assert, throws, ledger, storedFor } = require('./helpers');

module.exports = [
  { name: 'TC-1 Product-Departure evidence request: archetype key then silhouette batch on the first visible garment (M320)', fn: () => {
    const r = run('M320', { axes: ['TC'] }); const l = ledger(r, 'TC-1', 'c1').map((x) => x.family);
    assert(l.join(',') === 'tc_archetype_key,tc_silhouette', 'request order: ' + l.join(','));
    assert(r.packet.component_fact_pool.every((f) => ['grammar', 'fit', 'shoulder_structure', 'asymmetry'].includes(f.fact)), 'only departure-relevant facts'); } },
  { name: 'TC-2 stop after the product gate is resolved by the fixture authority: no proportion / construction batch, no second garment (M317, M320)', fn: () => {
    for (const id of ['M317', 'M320']) { const r = run(id, { axes: ['TC'] }); const t = r.packet.request_trace.axes.TC;
      assert(t.product_gate === 'STOPPED_AT_PRODUCT_GATE' && t.resolved_on.component_ref === 'c1' && t.resolved_on.after_batch === 'tc_silhouette', id + ' stop');
      assert(ledger(r, 'TC-1', 'c2').length === 0 && storedFor(r, 'TC-1') === 4, id + ' 4 facts, c2 untouched'); } } },
  { name: 'TC-3 zero styling request after product resolution (M317, M320)', fn: () => {
    for (const id of ['M317', 'M320']) { const t = run(id, { axes: ['TC'] }).packet.request_trace.axes.TC; assert(t.styling_requested === false, id); } } },
  { name: 'TC-4 styling only when the product gate is settled negatively with sufficient evidence and no participant is unresolvable: M303 proceeds; F109 (UNKNOWN belt bag), M323 (insufficient) and M178 do not', fn: () => {
    const a = run('M303', { axes: ['TC'] }).packet.request_trace.axes.TC; assert(a.product_gate === 'PROCEEDED_TO_STYLING' && a.styling_requested && a.garments_reached.length === 3 && a.unresolvable.length === 0, 'M303 proceeds');
    const f = run('F109', { axes: ['TC'] }).packet.request_trace.axes.TC; assert(f.product_gate === 'UNRESOLVED_EVIDENCE' && !f.styling_requested && f.unresolvable.includes('c6') && f.unknown_tc_facts.includes('c2.material'), 'F109 fails closed: the UNKNOWN-identity belt bag is unresolvable (Stage-A correction)');
    const b = run('M323', { axes: ['TC'] }).packet.request_trace.axes.TC; assert(b.product_gate === 'UNRESOLVED_EVIDENCE' && !b.styling_requested, 'M323');
    const c = run('M178', { axes: ['TC'] }).packet.request_trace.axes.TC; assert(c.product_gate === 'UNRESOLVED_EVIDENCE' && !c.styling_requested, 'M178');
    assert(run('F109', { axes: ['TC'] }).packet.relations.layer_relations.some((l) => l.over_ref === 'c2' && l.under_ref === 'c3' && l.revealed.includes('Leg')), 'skirt over trousers relation available (pass 1)'); } },
  { name: 'TC-5 unsupported identity → UNKNOWN / unresolved: F033 cape gets no archetype request, styling not requested, never force-classified', fn: () => {
    const r = run('F033', { axes: ['TC'] }); const t = r.packet.request_trace.axes.TC;
    assert(t.unresolvable.includes('c1') && t.product_gate === 'UNRESOLVED_EVIDENCE' && !t.styling_requested, 'unresolved although the fixture authority says settled: an UNKNOWN-identity participant blocks a negative conclusion');
    assert(ledger(r, 'TC-1', 'c1').every((l) => l.stored.length === 0), 'no stored TC fact for the cape');
    assert(r.packet.component_registry.find((e) => e.component_ref === 'c1').object_identity.state === 'UNKNOWN', 'identity UNKNOWN'); } },
  { name: 'TC-6 hidden fact ≠ no departure: NOT_VISIBLE facts keep their limitation; no NO_DEPARTURE token anywhere (M317 Mode A, M323)', fn: () => {
    const r = run('M317', { modeA: true, axes: ['TC', 'SR'], signals: { tc_product: null, tc_settled: false } });
    const p = r.packet.component_fact_pool.find((f) => f.component_ref === 'c2' && f.fact === 'pocket');
    assert(p && p.state === 'NOT_VISIBLE' && p.limitation.includes('OCCLUDED_BY_OTHER_GARMENT') && p.value === undefined && p.route === 'derived', 'pocket NOT_VISIBLE derived, no value');
    assert(!/NO_DEPARTURE|ABSENT_DEPARTURE/.test(JSON.stringify(r.packet)), 'no departure verdict');
    const m = run('M323', { axes: ['TC'] }); const len = m.packet.component_fact_pool.find((f) => f.component_ref === 'c3' && f.fact === 'length');
    assert(len.state === 'NOT_VISIBLE' && len.limitation.includes('TERMINAL_REGION_CROPPED'), 'cropped length'); } },
  { name: 'TC-7 no Item TC score read: a record carrying tc_score / direction is refused at ingestion', fn: () => {
    for (const bad of ['tc_score', 'tc_direction', 'ordinal', 'sr_strength']) { const rec = { c1: { item_record_ref: 'R', facts: { fit: 'Regular', [bad]: 'T' } } }; throws(() => providerA('M317', rec), /ITEM_ENGINE_OUTPUT_NOT_ADMITTED/); } } },
  { name: 'TC-8 non-garment components never receive product-departure requests (footwear / jewellery HOLD)', fn: () => {
    const r = run('M320', { axes: ['TC'], signals: { tc_product: null, tc_settled: true } });
    assert(ledger(r, 'TC-1').every((l) => ['c1', 'c2'].includes(l.component_ref)), 'only garments'); } },
  { name: 'TC-9 later-garment stop (M134, HYPOTHETICAL fixture authority): c1 fully requested, c2 stops after silhouette; pool facts reused from EI', fn: () => {
    const r = run('M134', { axes: ['EI', 'TC'] }); const t = r.packet.request_trace.axes.TC;
    assert(t.resolved_on.component_ref === 'c2' && t.resolved_on.after_batch === 'tc_silhouette', 'stop on c2');
    const cached = ledger(r, 'TC-1').reduce((a, l) => a + l.cached.length, 0); assert(cached >= 3, 'material / surface / attachment reused from the EI pool: ' + cached); } },
];
