'use strict';
const fs = require('fs'); const path = require('path');
const { X, run, fixture, providerA, providerB, assert, throws, ledger, storedFor, FixtureGate } = require('./helpers');
const C = X.contracts;

const modeA = [
  { name: 'A-1 Item raw fact reuse: M317 Mode A TC facts come from the record (route derived, lineage, source item_record)', fn: () => {
    const r = run('M317', { modeA: true, axes: ['TC'] }); const g = r.packet.component_fact_pool.find((f) => f.component_ref === 'c1' && f.fact === 'grammar');
    assert(g.route === 'derived' && g.source === 'item_record' && g.lineage.item_record_ref === 'REC-M317-C1' && g.value === 'Tailored', 'derived grammar'); assert(r.packet.source_mode === 'MIXED', 'c3 footwear has no record → MIXED'); } },
  { name: 'A-2 no Item score read (record guard) and no engine output key anywhere in a Mode A packet', fn: () => {
    throws(() => providerA('M308', { c1: { item_record_ref: 'R', facts: { fit: 'Regular', dm_score: 2 } } }), /ITEM_ENGINE_OUTPUT_NOT_ADMITTED/);
    throws(() => providerA('M308', { c1: { item_record_ref: 'R', facts: { fit: 'Regular' }, scores: {} } }), /ITEM_RECORD_UNEXPECTED_KEY/);
    const s = JSON.stringify(run('M308', { modeA: true }).packet); assert(!/score|ordinal|tier/i.test(s), 'no engine output words'); } },
  { name: 'A-3 Full-Look visibility check before consumption: M308 c3 pocket is in the record but hidden by the coat → NOT_VISIBLE, no value', fn: () => {
    const r = run('M308', { modeA: true, axes: ['TC'] }); const p = r.packet.component_fact_pool.find((f) => f.component_ref === 'c3' && f.fact === 'pocket');
    assert(p.state === 'NOT_VISIBLE' && p.limitation.includes('OCCLUDED_BY_OTHER_GARMENT') && p.value === undefined && p.lineage.item_record_ref === 'REC-M308-C3', 'hidden record fact'); } },
  { name: 'A-4 worn-state separation: F563 jacket worn open keeps closure_type from the record; front_state from the look (never from closure_type)', fn: () => {
    const r = run('F563', { modeA: true, axes: ['TC', 'SR'] }); const e = r.packet.component_registry.find((x) => x.component_ref === 'c1');
    assert(e.front_state.value === 'unfastened_worn_open', 'as-worn open'); const ct = r.packet.component_fact_pool.find((f) => f.component_ref === 'c1' && f.fact === 'closure_type');
    assert(ct.value === 'Single Breasted Button' && ct.route === 'derived', 'construction unchanged'); } },
  { name: 'A-5 final-realization re-observe where needed: F563 open jacket → upper observed; M308 fastened single coat → derived', fn: () => {
    assert(run('F563', { modeA: true, axes: ['SR'] }).packet.upper_realization.shape_behaviour.route === 'observed', 'F563 observed');
    assert(run('M308', { modeA: true, axes: ['SR'] }).packet.upper_realization.shape_behaviour.route === 'derived', 'M308 derived');
    const f = fixture('M308'); f.securing_relations = [{ securing: 'c5', affected: 'c1', region: 'Midriff / Waist', visible_constriction: 'OBSERVED' }];
    const r = X.extract({ provider: new X.providers.ItemReuseProvider(new X.providers.FixtureProvider(f), require('../fixtures/item_records.json').M308), requestedAxes: ['SR'] });
    assert(r.packet.upper_realization.relation.route === 'observed', 'securing on the upper forces observe'); } },
];

const modeB = [
  { name: 'B-1 no full Item-record construction: category / exposure_opening / fabric_behavior / product_context are not requestable; shoulder_drop IS (V1.2 D-1: 26 requestable = the corrected inventory); pool never reaches 37', fn: () => {
    const pool = new X.k2.ComponentFactPool(providerB('M317'), X.registry.buildRegistry(fixture('M317').objects));
    for (const f of ['category', 'exposure_opening', 'fabric_behavior', 'product_context', 'neckline_shape', 'cuff_scale']) assert(!C.REQUESTABLE_FACTS.includes(f), f + ' not requestable');
    assert(C.REQUESTABLE_FACTS.length === 26 && C.REQUESTABLE_FACTS.includes('shoulder_drop'), '26 requestable (V1.2 D-1: shoulder_drop added as Item raw reuse #26; expectation deliberately changed from 25)'); throws(() => pool.request('X', 'c1', 'all_facts'), /K2_UNKNOWN_FACT_FAMILY/);
    for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const r = run(id); for (const e of r.packet.component_registry) assert(r.packet.component_fact_pool.filter((x) => x.component_ref === e.component_ref).length < 37, id + ' ' + e.component_ref); } } },
  { name: 'B-2 only requested facts returned: F109 EI-only run stores 0 facts; M317 full run stores 7 (4 TC + 1 SR waist + 1 SR shoulder_drop + the Two-Gate parent read of length — INTEGRATED V1; RC2 withdrew the 15 RC1 DM-A1 readability reads, so no appearance fact is stored on behalf of DM — expectation deliberately changed from 22 back to 7)', fn: () => {
    assert(run('F109', { axes: ['EI'] }).packet.component_fact_pool.length === 0, 'F109 EI 0');
    const p = run('M317').packet.component_fact_pool; assert(p.length === 7 && p.some((f) => f.fact === 'shoulder_drop' && f.component_ref === 'c1') && p.some((f) => f.fact === 'length' && f.component_ref === 'c1'), 'M317 7'); assert(!run('M317').packet.request_trace.k2_ledger.some((l) => /^DM/.test(l.requester)), 'RC2: DM requests no appearance fact'); } },
  { name: 'B-3 early exits reduce requests: M317 (6 facts) vs M134 full path (33 facts — INTEGRATED V1: closure_type on c1 is NOT_APPLICABLE by the frozen Item trigger front_opening_extent = None and is no longer stored; expectation deliberately changed from 34)', fn: () => { assert(run('M317').packet.component_fact_pool.length < run('M134').packet.component_fact_pool.length, 'fewer'); assert(run('M134').packet.component_fact_pool.length === 33, 'M134 33'); } },
  { name: 'B-4 unsupported identity stays UNKNOWN (cape, bra top, tank, belt bag); force-fitting to a category throws', fn: () => {
    for (const [id, ref] of [['F033', 'c1'], ['F444', 'c3'], ['F563', 'c2'], ['F109', 'c6']]) assert(run(id).packet.component_registry.find((e) => e.component_ref === ref).object_identity.state === 'UNKNOWN', id + ' ' + ref);
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'cape', participates: true }]), /IDENTITY_OUTSIDE_CANDIDATE_VOCABULARY/);
    assert(X.registry.resolveIdentity('other').value === 'other', 'other is a known kind ≠ UNKNOWN'); } },
  { name: 'B-7 Stage-A correction: governed bags stay `bag` (F391 tote, F260 clutch, F563 hip bag, F444 shoulder bag); F109 belt bag UNKNOWN keeps its colour point on the same carrier (no new carrier)', fn: () => {
    for (const [id, ref] of [['F391', 'c5'], ['F260', 'c4'], ['F563', 'c6'], ['F444', 'c6']]) { const e = run(id).packet.component_registry.find((x) => x.component_ref === ref); assert(e.object_identity.state === 'OBSERVED' && e.object_identity.value === 'bag', id + ' ' + ref + ' bag'); }
    const g = run('F109', { axes: ['EI'] }).packet.colour_composition; const carriers = [...g.points.map((p) => p.carrier_ref.value), ...g.field.flatMap((f) => f.carrier_refs)];
    assert(carriers.filter((c) => c === 'c6').length === 1 && g.points.length === 3 && new Set(carriers).size === 6, 'same points, same carriers');
    assert(!run('F109').packet.component_registry.some((e) => e.object_identity.value === 'bag'), 'F109 has no `bag` identity'); } },
  { name: 'B-5 duplicate cross-axis requests reuse the cache: EI then TC on M134 → material / surface / attachment cached, pool unique', fn: () => {
    const r = run('M134', { axes: ['EI', 'TC'] }); const keys = r.packet.component_fact_pool.map((f) => f.component_ref + '.' + f.fact); assert(new Set(keys).size === keys.length, 'unique');
    const tc = ledger(r, 'TC-1', 'c1').find((l) => l.family === 'tc_construction'); assert(tc.cached.includes('material') && tc.cached.includes('surface') && tc.cached.includes('attachment'), 'cached from EI'); } },
  { name: 'B-6 Mode B never requests fabric_behavior (folded into G-6); shoulder_drop is now a requestable raw fact (V1.2 D-1, expectation deliberately changed); G-4 / G-5 / G-6 observed (route observed, no lineage)', fn: () => {
    const u = run('F109', { axes: ['SR'] }).packet.upper_realization; assert(u.relation.route === 'observed' && !u.relation.lineage, 'observed');
    assert(!run('F109').packet.component_fact_pool.some((f) => f.fact === 'fabric_behavior'), 'fabric_behavior never requested'); } },
];

const validatorTests = [
  { name: 'V-1 validator rejects: unknown ref, duplicate ref, illegal enum, score field, Style ID, Direction verdict, Item score ingestion, DM mutation', fn: () => {
    const base = run('M320').packet; const errs = (mut) => { const p = JSON.parse(JSON.stringify(base)); mut(p); return X.validator.validatePacket(p).errors.join(' | '); };
    assert(/POOL_UNKNOWN_REF/.test(errs((p) => { p.component_fact_pool[0].component_ref = 'zz'; })), 'unknown ref');
    assert(/DUPLICATE_COMPONENT_REF/.test(errs((p) => { p.component_registry.push(p.component_registry[0]); })), 'duplicate ref');
    assert(/G-5|outside domain/.test(errs((p) => { p.upper_realization.shoulder.value = 'Huge'; })), 'illegal enum');
    assert(/FORBIDDEN_KEY/.test(errs((p) => { p.ei_score = 7; })), 'score field');
    assert(/FORBIDDEN_KEY/.test(errs((p) => { p.style_id = 'ETSD'; })), 'style id');
    assert(/FORBIDDEN_KEY|AXIS_LETTER/.test(errs((p) => { p.request_trace.tc_direction = 'T'; })), 'direction verdict');
    assert(/POOL_ENVELOPE|LINEAGE/.test(errs((p) => { p.component_fact_pool[0].lineage = { item_record_ref: 'R', tc_score: 5 }; })), 'item score via lineage');
    { const q = JSON.parse(JSON.stringify(run('M323').packet)); /* RC4 (Transport V2): the delivered V2 record is mutated (RC2: M323 dm_subsystem) */ q.dm_evidence.look_detail_systems.pop(); assert(/DM_OUTPUT_MUTATED/.test(X.validator.validatePacket(q).errors.join(' | ')), 'DM mutation'); }   // INTEGRATED V1 (INT-02): M320 withholds its block — the delivered M323 block is mutated instead
    assert(/DM_OUTPUT_MUTATED/.test(errs((p) => { p.dm_evidence.look_detail_systems.pop(); })), 'V2 record mutation (DMP-3 UNKNOWN look)');   /* RC4 (Transport V2): M320 now delivers its systems with DMP-3 UNKNOWN (RC1–RC3: withheld twin) */ assert(/DM_ADJUDICABLE_FROM_ABSENCE/.test(errs((p) => { p.dm_evidence.dm_evidence_visibility = { state: 'OBSERVED', value: 'adjudicable' }; })), 'invented adjudicable rejected');
    assert(/DM_SEMANTIC_DUPLICATED/.test(errs((p) => { p.relations.look_detail_systems = []; })), 'DM duplication'); } },
  { name: 'V-2 every fixture packet validates; packets are deterministic across two runs', fn: () => {
    for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) { const a = run(id), b = run(id); assert(a.validation.ok, id + ': ' + a.validation.errors.join('; ')); assert(JSON.stringify(a.packet) === JSON.stringify(b.packet), id + ' deterministic'); } } },
  { name: 'V-3 NOT_APPLICABLE is never stored; ABSENT ≠ NOT_VISIBLE; UNKNOWN never carries a value', fn: () => {
    for (const id of ['F109', 'M134', 'M323']) { const pool = run(id).packet.component_fact_pool; assert(!pool.some((f) => f.state === 'NOT_APPLICABLE'), id); assert(pool.filter((f) => f.state !== 'OBSERVED').every((f) => f.value === undefined), id + ' no value on non-observed'); }
    throws(() => X.envelope.fact({ state: 'NOT_APPLICABLE' }), /ENVELOPE_STATE_ILLEGAL/); throws(() => X.envelope.fact({ state: 'UNKNOWN', value: 'x' }), /VALUE_ON_NON_OBSERVED/); } },
  { name: 'V-4 13 Evidence Groups representable: every group maps to a packet location (M323 / F033 / M317 together cover all; RC2: G-3 from M323)', fn: () => {
    const a = run('M323').packet, b = run('F033').packet, c = run('M317').packet;
    const present = { 'G-1': !!a.colour_composition, 'G-2': !!a.look_frame && a.look_frame.limits.length === 2, 'G-3': !!a.dm_evidence /* RC4 (Transport V2): the one DM record (RC2: dm_subsystem) */, 'G-4': !!a.upper_realization.relation, 'G-5': !!a.upper_realization.shoulder, 'G-6': !!a.upper_realization.shape_behaviour,
      'K-1': a.component_registry.length === 3, 'K-2': a.component_fact_pool.length > 0, 'K-3': !!a.component_registry[0].front_state, 'K-4': a.component_fact_pool.some((f) => f.limitation), 'R-1': a.relations.layer_relations.length === 1, 'R-2': b.relations.securing_relations.length === 1, 'R-3': c.canonical_exposure.events.length === 1 };
    const missing = Object.entries(present).filter(([, v]) => !v).map(([k]) => k); assert(missing.length === 0, 'missing ' + missing.join(',')); } },
];

// ---- G53 static + runtime guard. Patterns are assembled from parts so this file does not itself contain the literal strings.
const FORBIDDEN = [['anthro', 'pic'], ['api', '.anthro'], ['x-api', '-key'], ['ANTHROPIC_', 'API_KEY'], ['open', 'ai'], ['fetch', '('], ['XMLHttp', 'Request'], ["require('ht", "tp')"], ["require('ht", "tps')"], ["require('n", "et')"], ["require('t", "ls')"], ["require('dg", "ram')"], ["require('child_", "process')"], ['process.env.', 'API'], ['https:', '//']].map((p) => p.join(''));
const g53 = [
  { name: 'G53-1 static guard: no Anthropic client, inference URL, API-key access, network module or live model execution in src / tests / fixtures', fn: () => {
    const root = path.join(__dirname, '..'); const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|json)$/.test(e.name)) files.push(p); } })(root);
    const hits = []; for (const f of files) { if (path.basename(f) === path.basename(__filename)) continue; const t = fs.readFileSync(f, 'utf8'); for (const pat of FORBIDDEN) if (t.includes(pat)) hits.push(path.relative(root, f) + ' :: ' + pat); }
    assert(hits.length === 0, 'forbidden pattern(s): ' + hits.join('; ')); assert(files.length >= 20, 'scanned ' + files.length + ' files'); } },
  { name: 'G53-2 runtime guard: LiveVisionProvider cannot be instantiated; the base provider has no live path', fn: () => {
    throws(() => new X.providers.LiveVisionProvider(), /G53_BLOCKED_LIVE_INFERENCE/);
    throws(() => new X.providers.ObservationProvider().componentFact('c1', 'fit'), /OBSERVATION_PROVIDER_NOT_IMPLEMENTED/);
    assert(!C.SOURCES.includes('live'), 'no live source'); } },
  { name: 'G53-3 frozen surfaces are only required read-only: Item rules / Colour V1 / SR engine modules are not written by the candidate', fn: () => {
    const src = require('./helpers').srcText();                                                  // V1.3: recursive src scan (cli/ is the only writer, and only into its own --out directory)
    assert(!/writeFileSync|appendFileSync|unlinkSync|renameSync|mkdirSync/.test(src), 'src never writes to disk'); } },
];

module.exports = [...modeA, ...modeB, ...validatorTests, ...g53];
