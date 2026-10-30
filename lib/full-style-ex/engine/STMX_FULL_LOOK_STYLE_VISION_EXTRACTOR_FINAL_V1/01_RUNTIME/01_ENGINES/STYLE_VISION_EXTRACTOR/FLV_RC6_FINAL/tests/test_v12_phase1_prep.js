'use strict';
/** V1.2 Phase-1 preparation — D-1 shoulder_drop · D-2 independence · D-3 product_context metadata · D-4 participation routing · D-5 run record · G53 live guard. */
const path = require('path');
const { X, run, fixture, providerB, assert, throws } = require('./helpers');
const C = X.contracts;
const reg = (r, ref) => r.packet.component_registry.find((e) => e.component_ref === ref);
const pool = (r, ref, fact) => r.packet.component_fact_pool.find((f) => f.component_ref === ref && f.fact === fact);

const d1 = [
  { name: 'D1-1 shoulder_drop is the 26th requestable Item raw fact; requestable set == the corrected inventory SVP-101…126 order', fn: () => {
    const ORDER = ['grammar', 'trouser_distinction', 'silhouette', 'fit', 'shoulder_structure', 'shoulder_drop', 'asymmetry', 'length', 'sleeve_volume', 'shoulder_span', 'closure_type', 'front_opening_extent', 'collar', 'sleeve', 'shoulder_connection', 'pocket', 'pocket_construction', 'pocket_projection', 'waist_definition', 'slit', 'pattern', 'graphic', 'surface', 'material', 'decorative_detail', 'attachment'];
    assert(C.REQUESTABLE_FACTS.length === 26 && ORDER.every((f) => C.REQUESTABLE_FACTS.includes(f)), '26'); assert(X.run_record.ITEM_ORDER.join() === ORDER.join(), 'run-record id order'); } },
  { name: 'D1-2 SR requests shoulder_structure + shoulder_drop on the governing upper (sr_upper_shoulder); NOT_APPLICABLE outside the Item categories (Trouser / Skirt / accessories)', fn: () => {
    const r = run('F298', { axes: ['SR'] }); assert(r.packet.request_trace.axes.SR.upper_shoulder_requested === true, 'requested'); assert(pool(r, 'c1', 'shoulder_drop') && pool(r, 'c1', 'shoulder_structure'), 'stored for the coat');
    const f = fixture('F298'); const registry = X.registry.buildRegistry(f.objects); const p = new X.k2.ComponentFactPool(new X.providers.FixtureProvider(f), registry);
    assert(p.request('T', 'c3', 'sr_upper_shoulder').not_applicable.includes('shoulder_drop'), 'gloves NOT_APPLICABLE'); const q = new X.k2.ComponentFactPool(providerB('F109'), X.registry.buildRegistry(fixture('F109').objects)); assert(q.request('T', 'c3', 'sr_upper_shoulder').not_applicable.includes('shoulder_drop'), 'Trouser NOT_APPLICABLE'); } },
  { name: 'D1-3 Mode A: shoulder_drop from the Item record is reused as a raw fact (route derived, lineage) — e.g. M317 coat', fn: () => {
    const rec = JSON.parse(JSON.stringify(require('../fixtures/item_records.json').M317)); rec.c1.facts.shoulder_drop = 'None';
    const r = run('M317', { modeA: true, records: rec, axes: ['SR'] }); const sd = pool(r, 'c1', 'shoulder_drop'); assert(sd.route === 'derived' && sd.value === 'None' && sd.lineage.item_record_ref === 'REC-M317-C1', 'derived'); } },
];
const d2 = [
  { name: 'D2-1 independence: changing shoulder_drop in the record never changes upper_realization.shoulder, and vice versa (no mapping, no coherence rule)', fn: () => {
    const base = JSON.parse(JSON.stringify(require('../fixtures/item_records.json').M308));
    const a = JSON.parse(JSON.stringify(base)); a.c1.facts.shoulder_drop = 'Dropped'; const b = JSON.parse(JSON.stringify(base)); b.c1.facts.shoulder_drop = 'None';
    const ra = run('M308', { modeA: true, records: a, axes: ['SR'] }), rb = run('M308', { modeA: true, records: b, axes: ['SR'] });
    assert(JSON.stringify(ra.packet.upper_realization) === JSON.stringify(rb.packet.upper_realization), 'final shoulder unchanged by shoulder_drop'); assert(pool(ra, 'c1', 'shoulder_drop').value === 'Dropped' && pool(rb, 'c1', 'shoulder_drop').value === 'None', 'raw fact carried as given');
    const c = JSON.parse(JSON.stringify(base)); c.c1.facts.shoulder_structure = 'Extreme'; c.c1.facts.shoulder_drop = 'Dropped'; const rc = run('M308', { modeA: true, records: c, axes: ['SR'] }); assert(pool(rc, 'c1', 'shoulder_structure').value === 'Extreme' && pool(rc, 'c1', 'shoulder_drop').value === 'Dropped', 'Extreme + Dropped carried without reconciliation (CA#15 D-2)'); } },
  { name: 'D2-2 sr_realization never reads shoulder_drop (source scan) and the fact is never stored on a non-garment', fn: () => {
    const src = require('fs').readFileSync(path.join(__dirname, '..', 'src', 'sr_realization.js'), 'utf8'); assert(!/facts\.shoulder_drop|\.shoulder_drop\b(?!.*NEVER)/.test(src.replace(/\/\*[\s\S]*?\*\//, '')), 'no shoulder_drop read in sr_realization');
    for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const r = run(id); for (const f of r.packet.component_fact_pool.filter((x) => x.fact === 'shoulder_drop')) assert(X.registry.isGarment(reg(r, f.component_ref)), id + ' garment only'); } } },
];
const d3 = [
  { name: 'D3-1 product_context is context metadata on a garment registry entry (Item domain), never a fact, never on a non-garment, never inferred when absent', fn: () => {
    const f = fixture('F109'); f.objects.find((o) => o.ref === 'c1').product_context = 'General'; const r = X.extract({ provider: new X.providers.FixtureProvider(f, require('./helpers').POCKET_OVERLAY.F109) });   // INTEGRATED V1: CA#29 overlay for the legacy c3 pocket reading
    assert(r.validation.ok && reg(r, 'c1').product_context.value === 'General', 'metadata on the tee'); assert(!r.packet.component_fact_pool.some((x) => x.fact === 'product_context'), 'not a fact'); assert(reg(r, 'c2').product_context === undefined, 'absent → no field (not inferred)');
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'footwear', participates: true, product_context: 'General' }]), /PRODUCT_CONTEXT_ON_NON_GARMENT/); throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'T-Shirt', participates: true, product_context: 'Sportswear' }]), /OUTSIDE_ITEM_DOMAIN/); } },
  { name: 'D3-2 Mode A: a governed record product_context reaches the registry as metadata; a look-level reading takes precedence; the validator rejects it stored as a fact', fn: () => {
    const rec = { c1: { item_record_ref: 'REC-M317-C1', facts: { grammar: 'Tailored' }, product_context: 'General' } }; const r = X.extract({ provider: new X.providers.ItemReuseProvider(providerB('M317'), rec), requestedAxes: ['TC'] });
    assert(r.validation.ok && reg(r, 'c1').product_context.value === 'General', 'from record'); const p = JSON.parse(JSON.stringify(r.packet)); p.component_fact_pool.push({ component_ref: 'c1', fact: 'product_context', state: 'OBSERVED', value: 'General', route: 'observed', source: 'fixture' }); assert(/PRODUCT_CONTEXT_STORED_AS_FACT|POOL_NON_REQUESTABLE_FACT/.test(X.validator.validatePacket(p).errors.join('|')), 'rejected as a fact'); } },
];
const d4 = [
  { name: 'D4-1 participation is routing only: no participation / admission / eligibility field in any packet; excluded objects leave no trace; the run record lists admission separately from parameters', fn: () => {
    for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const r = run(id); assert(!/participat|admitted|eligib/i.test(JSON.stringify(r.packet)), id + ' no participation key'); }
    const r = run('F225'); const p = JSON.parse(JSON.stringify(r.packet)); p.component_registry[0].participates = true; assert(/PARTICIPATION_FIELD_IN_PACKET|REGISTRY_KEY/.test(X.validator.validatePacket(p).errors.join('|')), 'validator rejects a participation field');
    const rec = X.run_record.buildRunRecord({ packet: r.packet, validation: r.validation, image_ref: 'F225' }); assert(Array.isArray(rec.admission) && !Object.keys(rec.parameters).some((k) => /SVP-0(13|14)/.test(k)), 'admission separate; no 13th Style parameter'); } },
];
const d5 = [
  { name: 'D5-1 run record binds image / code / inventory / prompt / model / run identity; offline placeholders allowed; missing identity → formal_comparison_valid = false', fn: () => {
    const r = run('F464'); const rec = X.run_record.buildRunRecord({ packet: r.packet, validation: r.validation, image_ref: 'F464', image_hash: 'a'.repeat(64) });
    assert(rec.formal_comparison_valid === false && rec.missing_identity.includes('model_id') && rec.missing_identity.includes('prompt_hash'), 'placeholders flagged'); assert(rec.inventory_version === C.INVENTORY_VERSION && rec.packet_version === C.PACKET_VERSION, 'versions');
    const full = X.run_record.buildRunRecord({ packet: r.packet, validation: r.validation, image_ref: 'F464', image_hash: 'a'.repeat(64), candidate_code_hash: 'b'.repeat(64), prompt_version: 'V1', prompt_hash: 'c'.repeat(64), model_id: 'NOT_YET_AUTHORIZED', model_version: 'NOT_YET_AUTHORIZED', run_id: 'OFFLINE-TEST', timestamp: '2026-10-07T00:00:00Z' }); assert(full.formal_comparison_valid === true, 'complete identity'); } },
  { name: 'D5-2 run record projects the 38-parameter surface with corrected ids (SVP-001…012, SVP-101…126), per-component suffixes, and no score / direction key; deterministic', fn: () => {
    const r = run('F054'); const rec = X.run_record.buildRunRecord({ packet: r.packet, validation: r.validation, image_ref: 'F054' }); const keys = Object.keys(rec.parameters);
    assert(keys.includes('SVP-001') && keys.includes('SVP-002@c4') && keys.includes('SVP-005@c4') && keys.includes('SVP-011@c4') === false && keys.some((k) => /^SVP-1\d\d@c1$/.test(k)), 'ids'); assert(keys.every((k) => /^SVP-(0(0[1-9]|1[0-2])|1(0[1-9]|1\d|2[0-6]))(@c\d+)?$/.test(k)), 'only 38 ids');
    assert(!/score|direction|verdict|style_id/i.test(JSON.stringify(rec).replace(/"requested_axes":\[[^\]]*\]/, '')), 'no forbidden key'); const rec2 = X.run_record.buildRunRecord({ packet: run('F054').packet, validation: r.validation, image_ref: 'F054' }); assert(JSON.stringify(rec) === JSON.stringify(rec2), 'deterministic'); } },
];
const g53 = [
  { name: 'G53-V12 live provider still disabled; no module in src / validation opens a network path; run records never carry an endpoint', fn: () => {
    throws(() => new X.providers.LiveVisionProvider(), /G53_BLOCKED_LIVE_INFERENCE/); const fs = require('fs'); const dirs = ['src', 'validation'].map((d) => path.join(__dirname, '..', d)).filter((d) => fs.existsSync(d));
    const files = []; (function walk(x) { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) walk(p); else files.push(p); } })(dirs[0]); if (dirs[1]) files.push(...fs.readdirSync(dirs[1]).map((f) => path.join(dirs[1], f)));   // V1.3: recursive
    for (const p of files) { const t = fs.readFileSync(p, 'utf8'); assert(!/require\(['"](ht|net|tls|dgram|child_)/.test(t) && !/https?:\/\//.test(t), path.basename(p) + ' no network'); } } },
];
module.exports = [...d1, ...d2, ...d3, ...d4, ...d5, ...g53];
