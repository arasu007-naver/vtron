#!/usr/bin/env node
'use strict';
/**
 * STMX FULL-LOOK STYLE VISION — INTEGRATED EXTRACTOR CANDIDATE V1 · OFFLINE EXECUTION ENTRY POINT (successor of the V1.3/V1.4 CLI) (G53: no model, no network, no credential).
 *
 *   node cli/run_offline.js --fixture <id> [--mode A|B] [--out <dir>] [--frozen-tc-diagnostic] [--identity <json-file>]
 *   node cli/run_offline.js --model-output <parsed.json> [--out <dir>] ...        (a parsed model JSON object, any Prompt V1.2 shape)
 *   node cli/run_offline.js --model-text <file.txt> [--out <dir>] ...              (the raw assistant text; fences allowed)
 *   node cli/run_offline.js --raw-response <messages.json> [--out <dir>] ...       (a stored Messages response; text blocks only are read)
 *
 * Output (all JSON, deterministic for identical inputs):
 *   packet.json · validation.json · provenance.json (transport log · unconvertible · not_emitted · K-2 ledger · excluded layer pairs ·
 *   candidate carriers used) · unresolved_fields.json · run_record.json · tc_product_evidence_view.json (diagnostic, non-canonical) ·
 *   summary.json (status + sha256 of every output). Exit 0 = packet valid · 2 = packet invalid (errors listed) · 3 = transport failure.
 * The packet is observational only: no Style ID, no direction, no score, no verdict (validated).
 */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const X = require('../src');
const RR = require('../src/run_record');
const CASES = require('../fixtures/cases.json'); const RECORDS = require('../fixtures/item_records.json'); const POCKET_OVERLAY = require('../fixtures/pocket_instances_overlay_candidate.json');   // INTEGRATED V1: CA#29 bridge for legacy scalar fixture readings
const args = process.argv.slice(2); const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; }; const flag = (k) => args.includes(k);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex'); const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const outDir = opt('--out') || path.join(process.cwd(), 'out_' + Date.now()); fs.mkdirSync(outDir, { recursive: true });
const write = (name, obj) => { const s = JSON.stringify(obj, null, 1); fs.writeFileSync(path.join(outDir, name), s); return sha(s); };
const summary = { tool: 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC6/cli/run_offline.js', architecture: 'integrated observation (G1–G4 logical groups in one pass; A1 frozen-DM assembly)', live_inference: 'NONE (G53)', input: null, outputs: {}, status: null };
let caseObj = null; let transport = null; let records = null; let fixtureId = null; let nativeText = null;   // V1.4: the exact emitted text is also judged by the native checker (Gate A), separately from the safe parse
try {
  if (opt('--fixture')) { fixtureId = opt('--fixture'); if (!CASES[fixtureId]) throw new Error('UNKNOWN_FIXTURE ' + fixtureId); caseObj = JSON.parse(JSON.stringify(CASES[fixtureId])); summary.input = { kind: 'fixture', id: fixtureId, mode: opt('--mode') || 'B' }; if ((opt('--mode') || 'B') === 'A') records = JSON.parse(JSON.stringify(RECORDS[fixtureId] || {})); }
  else {
    let obj; let parsed = null;
    if (opt('--model-output')) { obj = J(opt('--model-output')); summary.input = { kind: 'model_output', file: opt('--model-output'), sha256: sha(fs.readFileSync(opt('--model-output'))) }; }
    else if (opt('--model-text')) { const t = fs.readFileSync(opt('--model-text'), 'utf8'); nativeText = t; parsed = X.transport.parseModelText(t); obj = parsed.obj; summary.input = { kind: 'model_text', file: opt('--model-text'), sha256: sha(t), fences_stripped: parsed.fences_stripped }; }
    else if (opt('--raw-response')) { const raw = J(opt('--raw-response')); const t = X.transport.textFromRawResponse(raw); nativeText = t.text; parsed = X.transport.parseModelText(t.text); obj = parsed.obj; summary.input = { kind: 'raw_response', file: opt('--raw-response'), sha256: sha(fs.readFileSync(opt('--raw-response'))), model: t.model, stop_reason: t.stop_reason, fences_stripped: parsed.fences_stripped }; }
    else { console.error('usage: --fixture <id> | --model-output <file> | --model-text <file> | --raw-response <file> [--mode A|B] [--out <dir>] [--frozen-tc-diagnostic] [--identity <file>]'); process.exit(1); }
    transport = X.transport.convertModelOutput(obj); caseObj = transport.case; summary.transport = { shape_variant: transport.shape_variant, counts: transport.counts, unconvertible: transport.unconvertible.length, not_emitted: transport.not_emitted.length };
  }
} catch (e) { summary.status = 'TRANSPORT_FAILURE'; summary.error = e.message; write('summary.json', summary); console.error('TRANSPORT_FAILURE ' + e.message); process.exit(3); }
delete caseObj.gate_signals; delete caseObj._reading;                                   // nothing reference-side rides along
let result;
try {
  const base = new X.providers.FixtureProvider(caseObj, fixtureId ? (POCKET_OVERLAY[fixtureId] || null) : null); const provider = records ? new X.providers.ItemReuseProvider(base, records) : base;
  if (transport && !records) {                                                            // RC5: a model output goes through local failure isolation (src/isolation.js); the normal path is unchanged (no error → no action)
    result = X.isolation.extractIsolated({ caseObj, makeProvider: (c) => new X.providers.FixtureProvider(c, null), requestedAxes: undefined, gateAuthority: new X.routers.GateAuthority() });
  } else result = X.extract({ provider, requestedAxes: undefined, gateAuthority: new X.routers.GateAuthority() });   // full-demand gate: every applicable fact is requested
} catch (e) { summary.status = 'EXTRACT_FAILURE'; summary.error = e.message; if (e.isolation) summary.local_isolation = e.isolation; write('summary.json', summary); console.error('EXTRACT_FAILURE ' + e.message); process.exit(2); }
if (result.isolation) summary.local_isolation = { actions: result.isolation.length, records: result.isolation };   // RC5: only on the isolation path (model-output inputs)
const { packet, validation } = result;
summary.outputs.packet = write('packet.json', packet); summary.outputs.validation = write('validation.json', { ok: validation.ok, errors: validation.errors, explanations: validation.errors.map(explain) });
const candidateUsed = [];
if (packet.relations.securing_relations.some((s) => s.device_is_own)) candidateUsed.push('own_device_securing');
if (packet.relations.securing_relations.some((s) => !X.contracts.SECURING_REGION_REFERENCE_DOMAIN.includes(s.affected_region))) candidateUsed.push('securing_region_raw');
if (packet.colour_composition && packet.colour_composition.partial) candidateUsed.push('partial_colour');
if (packet.dm_acquisition) candidateUsed.push('dm_acquisition');
if (packet.component_fact_pool.some((f) => f.pockets)) candidateUsed.push('pocket_instances');
if (packet.dm_evidence) candidateUsed.push('dm_evidence_transport_v2', 'dm_components_assembled');   // RC4: Transport V2 (no V1 dm_subsystem / withheld twin)
candidateUsed.push('observation_group_trace');
if (transport) candidateUsed.push('transport_conversion');
const prov = { ...(result.isolation ? { local_isolation: result.isolation } : {}), transport: transport ? { shape_variant: transport.shape_variant, log: transport.log, unconvertible: transport.unconvertible, not_emitted: transport.not_emitted } : null, k2_ledger: packet.request_trace.k2_ledger, exposure_requests: packet.request_trace.exposure_requests, layer_pairs_excluded: packet.request_trace.layer_pairs_excluded, ownership_resolution: packet.ownership_resolution || [], candidate_carriers_used: candidateUsed.map((k) => ({ carrier: k, ...(X.contracts.CANDIDATE_CARRIERS[k] || X.integrated.INTEGRATED_CANDIDATE_CARRIERS[k]) })), observation_groups: packet.request_trace.observation_groups, dm_diagnostics: packet.request_trace.dm_diagnostics, provider_notes: packet.request_trace.provider_notes, dm_adapter: packet.dm_adapter || null };
summary.outputs.provenance = write('provenance.json', prov);
if (nativeText !== null) { const nc = X.transport.checkNative(nativeText); summary.outputs.native_check = write('native_check.json', nc); summary.native = { strict_json_as_emitted: nc.strict_json_as_emitted, native_conformant: nc.native_conformant, shape_and_vocabulary_conformant: nc.shape_and_vocabulary_conformant, counts: nc.counts }; }   // V1.4: raw-native verdict reported separately from converted validity
const unresolved = { frame: packet.look_frame.state !== 'OBSERVED' ? packet.look_frame : null, identity_unknown: packet.component_registry.filter((e) => e.object_identity.state !== 'OBSERVED').map((e) => e.component_ref),
  pool_unknown: packet.component_fact_pool.filter((f) => f.state === 'UNKNOWN').map((f) => f.component_ref + '.' + f.fact), pool_not_visible: packet.component_fact_pool.filter((f) => f.state === 'NOT_VISIBLE').map((f) => ({ key: f.component_ref + '.' + f.fact, limitation: f.limitation || [] })),
  colour_unreadable: packet.colour_composition ? packet.colour_composition.unreadable : [], colour_partial: packet.colour_composition && packet.colour_composition.partial ? packet.colour_composition.partial : [],
  upper: packet.upper_realization ? Object.fromEntries(Object.entries(packet.upper_realization).filter(([k, v]) => k !== 'source_refs' && v.state !== 'OBSERVED').map(([k, v]) => [k, v.state])) : null,
  not_emitted_by_model: transport ? transport.not_emitted : [], unconvertible: transport ? transport.unconvertible : [], dm: packet.dm_acquisition || null, dm_visibility_not_established: packet.dm_evidence && packet.dm_evidence.dm_evidence_visibility.state === 'UNKNOWN' ? { diagnostics: (packet.request_trace.dm_diagnostics || []).filter((d) => d.where === 'dm_evidence_visibility') } : null, securing_region_outside_reference_domain: packet.relations.securing_relations.filter((s) => !X.contracts.SECURING_REGION_REFERENCE_DOMAIN.includes(s.affected_region)).map((s) => ({ securing_ref: s.securing_ref, affected_ref: s.affected_ref, affected_region: s.affected_region })) };
summary.outputs.unresolved_fields = write('unresolved_fields.json', unresolved);
if (validation.ok) {
  const ident = opt('--identity') ? J(opt('--identity')) : {}; const rec = RR.buildRunRecord({ packet, validation, image_ref: ident.image_ref || fixtureId || null, image_hash: ident.image_hash || null, candidate_code_hash: ident.candidate_code_hash || null, prompt_version: ident.prompt_version || null, prompt_hash: ident.prompt_hash || null, model_id: ident.model_id || null, model_version: ident.model_version || null, run_id: ident.run_id || null, timestamp: ident.timestamp || null, raw_output_sha256: ident.raw_output_sha256 || null });
  summary.outputs.run_record = write('run_record.json', rec);
  const view = X.diagnostics.buildTcProductEvidenceView(packet, { frozenPredicates: flag('--frozen-tc-diagnostic') }); summary.outputs.tc_product_evidence_view = write('tc_product_evidence_view.json', view);
}
summary.status = validation.ok ? 'PACKET_VALID' : 'PACKET_INVALID'; summary.validation_errors = validation.errors.length;
write('summary.json', summary); console.log(summary.status + ' · ' + outDir + (validation.ok ? '' : '\n' + validation.errors.join('\n')));
process.exitCode = validation.ok ? 0 : 2;
function explain(e) { const code = e.split(' ')[0]; const M = { PACKET_IDENTITY: 'packet contract / version mismatch', G1_NO_COLOUR_OPPORTUNITY: 'a participant has no colour entry (field / point / unreadable / partial) — the observation must say so explicitly', R2_SAME_CAUSE_TWICE: 'the same securing cause is counted as own device and as a separate component (CDM-03 S1)', R1_ACCESSORY_IN_GARMENT_PAIR: 'an accessory in a garment layer pair (CDM-05 B)', DM_ACQUISITION_MISSING: 'DM was requested but neither a frozen DM block nor an acquisition status is present', POOL_NON_REQUESTABLE_FACT: 'a fact outside the 26 requestable Item facts reached the pool', FORBIDDEN_KEY: 'a scoring / verdict key appeared in observational evidence' }; return { error: e, explanation: M[code] || 'see validator.js (' + code + ')' }; }
