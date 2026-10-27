'use strict';
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { X, run, fixture, providerA, providerB, assert, throws } = require('./helpers');
const C = X.contracts; const { ev, v1 } = require('./rc4_helpers');   // RC4 (Transport V2) version-scoped views

const dmTests = [
  { name: 'DM-1 frozen DM adapter loads the frozen authority (hash pinned) without modification; output carried verbatim', fn: () => {
    const a = X.dm.verifyAuthority(); assert(a.sha256 === X.dm.AUTHORITY.sha256, 'authority hash');
    const r = run('M323', { axes: ['DM'] }); const f = fixture('M323').dm; const B = v1(r.packet);   /* RC4 (Transport V2): the V1 record is checked through the unchanged frozen adapter (M323 DMP-3 OBSERVED) */   /* RC2 (look-level DMP-3): M323 (lower_body_cropped + feet_not_visible) delivers again — RC1 had withheld it because accessory values without a fixture reading made the reason set "incomplete"; the visibility token equals the independent DM reading as a set (frozen reason order) — expectation deliberately changed */
    assert(JSON.stringify(B.look_detail_systems) === JSON.stringify(f.look_detail_systems) && JSON.stringify(B.look_components) === JSON.stringify(f.look_components) && ((a, b) => a.replace(/[{}]/g, '').split(/[:|]/).sort().join() === b.replace(/[{}]/g, '').split(/[:|]/).sort().join())(B.dm_evidence_visibility, f.dm_evidence_visibility), 'systems verbatim · components assembled = fixture · visibility mapped = fixture (as a set)'); assert(Object.isFrozen(B) && Object.isFrozen(B.look_detail_systems[0]) && Object.isFrozen(ev(r.packet)) && Object.isFrozen(ev(r.packet).look_detail_systems[0]), 'deep frozen (V1 record + V2 record)');
    assert(r.packet.dm_transport.output_fingerprint === X.dm.fingerprint(r.packet.dm_evidence), 'fingerprint');   /* RC4 (Transport V2): dm_transport carries the fingerprint (was dm_adapter) */ } },
  { name: 'DM-2 shared component refs valid: DM carriers ⊆ registry; an unknown carrier is rejected', fn: () => {
    const f = fixture('M320'); f.dm.look_detail_systems[0].carrier_refs.push('zz');   // INTEGRATED V1: look_components is assembled (never read) — the carrier reference lives in the system
    { const rr = X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['DM'] }); assert(rr.validation.ok && !rr.packet.dm_subsystem && !rr.packet.dm_block_withheld && !rr.packet.dm_evidence /* RC4 */ && rr.packet.dm_acquisition.status === 'NOT_ACQUIRED' && rr.packet.dm_acquisition.reason === 'DM_BLOCK_REJECTED_BY_FROZEN_ADAPTER' && rr.packet.request_trace.dm_diagnostics.some((d) => d.code === 'DM_BLOCK_REJECTED' && /DM_SYSTEM_CARRIER_NOT_IN_REGISTRY/.test(d.detail)), 'unknown carrier → block rejected'); }   /* RC2: an inadmissible DM block is rejected as a block (never repaired) and no longer throws away the whole look — expectation deliberately changed from a thrown extraction */ } },
  { name: 'DM-3 no duplicate DM semantic structure outside the DM block; extra DM keys rejected', fn: () => {
    const p = run('M303').packet; const style = { ...p }; delete style.dm_subsystem; delete style.dm_block_withheld; delete style.dm_evidence;   /* RC4 (Transport V2): dm_evidence is the DM record */   /* INTEGRATED V1: both DM blocks are DM */ assert(!/look_detail_family|look_detail_systems|relational_form/.test(JSON.stringify(style)), 'no DM fields outside');
    const f = fixture('M303'); f.dm.dm_detail_score = 3; { const rr = X.extract({ provider: new X.providers.FixtureProvider(f), requestedAxes: ['DM'] }); assert(rr.validation.ok && !rr.packet.dm_subsystem && !rr.packet.dm_block_withheld && !rr.packet.dm_evidence /* RC4 */ && rr.packet.dm_acquisition.status === 'NOT_ACQUIRED' && rr.packet.dm_acquisition.reason === 'DM_BLOCK_REJECTED_BY_FROZEN_ADAPTER' && rr.packet.request_trace.dm_diagnostics.some((d) => d.code === 'DM_BLOCK_REJECTED' && /DM_OUTPUT_UNEXPECTED_KEY/.test(d.detail)), 'extra DM key → block rejected'); }   /* RC2: an inadmissible DM block is rejected as a block (never repaired) and no longer throws away the whole look — expectation deliberately changed from a thrown extraction */ } },
  { name: 'DM-4 EI never reads the DM semantic H verdict: EI routing completes with dm_subsystem access trapped (M303 has relational_form accent)', fn: () => {
    const base = providerB('M303'); let dmTouched = 0;
    const p = new Proxy(base, { get(t, k) { if (k === 'dmSubsystem') return () => { dmTouched++; return t.dmSubsystem(); }; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
    const r = X.extract({ provider: p, requestedAxes: ['EI'], gateAuthority: new (require('./helpers').FixtureGate)({ ei_colour: false, ei_exposure: false }) });
    assert(dmTouched === 0 && !('dm_subsystem' in r.packet) && !('dm_evidence' in r.packet) /* RC4 */, 'EI-only run never asks for DM output');
    const full = run('M303'); assert(JSON.stringify(full.packet.colour_composition).indexOf('accent') < 0 && JSON.stringify(full.packet.dm_evidence) /* RC4 (Transport V2): the one DM record */.indexOf('accent') >= 0, 'accent lives only in the DM block'); } },
  { name: 'DM-5 no count / distribution proxy: registry length and DM component count are not emitted; look_components is carriers-only', fn: () => {
    const p = run('F444').packet; const style = { ...p }; delete style.dm_subsystem; delete style.dm_block_withheld; delete style.dm_evidence;   /* RC4 (Transport V2) */
    assert(!/\bcount\b|n_components|component_count|spread|concentration/i.test(JSON.stringify(style)) && !/[0-9]/.test(JSON.stringify(style).replace(/"[^"]*"/g, '')), 'no count key and no numeric value outside the frozen DM block');
    assert(ev(p).look_components.length /* RC4 (Transport V2) */ < p.component_registry.length, 'DM lists carriers only (assembled from the systems — INTEGRATED V1)'); } },
];

const exposureTests = [
  { name: 'EX-1 Item exposure only (FX dress record, Mode A, no supplement): two events from two Item values', fn: () => {
    const f = fixture('M308'); f.objects = [{ ref: 'c1', identity: 'Dress', participates: true }]; f.layer_relations = []; f.front_state = {}; f.colour_areas = [{ carrier: 'c1', family: 'black', lightness: 'dark', effect: 'none', role: 'field' }]; f.upper = { governing_ref: 'c1', relation: { value: 'Slim', state: 'OBSERVED' }, shoulder: { value: 'None', state: 'OBSERVED' }, shape: { value: 'Fluid', state: 'OBSERVED' } }; f.exposure_supplement = []; f.facts = {}; f.look_visibility = {}; f.dm = { look_components: [], look_detail_systems: [], dm_evidence_visibility: 'adjudicable' };
    const prov = new X.providers.ItemReuseProvider(new X.providers.FixtureProvider(f), require('../fixtures/item_records.json').FX_EXPOSURE);
    const r = X.extract({ provider: prov, requestedAxes: ['EI'], gateAuthority: new (require('./helpers').FixtureGate)({ ei_colour: false, ei_exposure: true }) });
    const ev = r.packet.canonical_exposure.events; assert(ev.length === 2 && ev.every((e) => e.attribution.value === 'item_intrinsic' && e.sources[0].route === 'derived'), '2 intrinsic events'); } },
  { name: 'EX-2 Full-Look supplement only (M317 Mode B): one realized-state event, source observed', fn: () => {
    const ev = run('M317', { axes: ['EI'] }).packet.canonical_exposure.events; assert(ev.length === 1 && ev[0].attribution.value === 'realized_state' && ev[0].sources.length === 1 && ev[0].sources[0].route === 'observed', 'supplement only'); } },
  { name: 'EX-3 Item + supplement, distinct physical exposures → distinct events (FX dress Chest+Back intrinsic + Shoulder realized)', fn: () => {
    const reg = [{ component_ref: 'c1', object_identity: { value: 'Dress', state: 'OBSERVED' } }];
    const m = X.exposure.mergeCanonicalExposure({ itemSources: [{ carrier_ref: 'c1', item_record_ref: 'R', item_value: 'Chest / Décolletage', state: 'OBSERVED' }, { carrier_ref: 'c1', item_record_ref: 'R', item_value: 'Back', state: 'OBSERVED' }], supplements: [{ region: 'Shoulder', carriers: ['c1'], attribution: 'realized_state', state: 'OBSERVED' }], registry: reg });
    assert(m.events.length === 3, '3 events'); } },
  { name: 'EX-4 duplicate source for the same exposure dedups: Item Chest + supplement Chest on the same carrier → one event, two sources', fn: () => {
    const reg = [{ component_ref: 'c1', object_identity: { value: 'Dress', state: 'OBSERVED' } }];
    const m = X.exposure.mergeCanonicalExposure({ itemSources: [{ carrier_ref: 'c1', item_record_ref: 'R', item_value: 'Chest / Décolletage', state: 'OBSERVED' }], supplements: [{ region: 'Chest / Décolletage', carriers: ['c1'], attribution: 'realized_state', state: 'OBSERVED' }], registry: reg });
    assert(m.events.length === 1 && m.events[0].sources.length === 2 && m.events[0].attribution.value === 'item_intrinsic', 'one event two sources'); } },
  { name: 'EX-5 Mode B uncertain provenance preserved: F444 midriff attribution UNKNOWN while the exposure is OBSERVED', fn: () => {
    const ev = run('F444', { axes: ['EI'], signals: { ei_colour: false, ei_exposure: true } }).packet.canonical_exposure.events;
    const mid = ev.find((e) => e.region === 'Midriff / Waist'); assert(mid && mid.state === 'OBSERVED' && mid.attribution.state === 'UNKNOWN' && !('value' in mid.attribution), 'UNKNOWN attribution'); } },
  { name: 'EX-6 no axis-specific duplicate exposure: one canonical block; validator rejects a duplicate event; threshold fields refused', fn: () => {
    const p = run('M317', { axes: ['EI', 'TC', 'SR'] }).packet; assert((JSON.stringify(p).match(/"canonical_exposure":/g) || []).length === 1, 'one block');
    const q = JSON.parse(JSON.stringify(p)); q.canonical_exposure.events.push(q.canonical_exposure.events[0]); assert(X.validator.validatePacket(q).errors.some((e) => /DUPLICATE_EXPOSURE_EVENT/.test(e)), 'duplicate rejected');
    throws(() => X.exposure.mergeCanonicalExposure({ itemSources: [], supplements: [{ region: 'Back', carriers: ['c1'], attribution: 'realized_state', state: 'OBSERVED', degree: 'high' }], registry: [{ component_ref: 'c1', object_identity: { state: 'UNKNOWN' } }] }), /EXPOSURE_THRESHOLD_FIELD_PROHIBITED/); } },
  { name: 'EX-7 built-in exposure covered in the look is not an event (Item value with look visibility NOT_VISIBLE)', fn: () => {
    const reg = [{ component_ref: 'c1', object_identity: { value: 'Dress', state: 'OBSERVED' } }];
    const m = X.exposure.mergeCanonicalExposure({ itemSources: [{ carrier_ref: 'c1', item_record_ref: 'R', item_value: 'Back', state: 'NOT_VISIBLE', limitation: ['OCCLUDED_BY_OTHER_GARMENT'] }], supplements: [], registry: reg });
    assert(m.events.length === 0 && m.hidden.length === 1, 'hidden, not an event'); } },
];

module.exports = [...dmTests, ...exposureTests];
