'use strict';
/**
 * STMX Full-Look Four-Axis Integrated Scoring Runtime V1 — CANDIDATE (orchestrator, not a fifth scorer).
 * Input: the Frozen Full-Look Vision Extractor output for one look = { packet, run_record } (packet_contract STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET V1_RC4).
 * Each Final Frozen engine receives its own deep copy of the same evidence (EI / TC / SR: packet + run_record · DM: packet) and scores it under its own
 * constitution; this layer only validates each output contract, normalizes the binary Direction to its letter, resolves the Style ID, and aggregates
 * Korean Reasons and provenance. It never fills, flips or defaults a Direction: an axis that returns a governed input failure leaves the Style ID null
 * (status INPUT_FAILURE); an output outside the frozen contract gives status CONTRACT_VIOLATION; a binding failure throws (RUNTIME_DEPENDENCY_*).
 * Deterministic · GT-blind · no network · no look-id branch.
 */
const fs = require('fs'), path = require('path');
const B = require('./fl4ax_bindings_v1.js'), S = require('./fl4ax_style_id_v1.js'), C = require('./fl4ax_contract_v1.js'), K = require('./fl4ax_reason_ko_v1.js');
const RUNTIME_ID = 'STMX_FULL_LOOK_FOUR_AXIS_INTEGRATED_SCORING_RUNTIME_V1'; const RESULT_CONTRACT = 'STMX_FULL_LOOK_FOUR_AXIS_RESULT_V1';
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
/** scoreFullLook(input) — input = { packet, run_record } (or scoreFullLook(packet, run_record)). */
function scoreFullLook(a, b) {
  const input = a && typeof a === 'object' && !Array.isArray(a) && ('packet' in a || 'run_record' in a) && b === undefined ? a : { packet: a, run_record: b };
  const { engines } = B.bind(); const records = {}, norm = {}, axes = {};
  for (const axis of S.AXIS_ORDER) { const e = engines[axis]; let rec;
    try { rec = e.call === 'PACKET_ONLY' ? e.score(clone(input.packet)) : e.score(clone(input.packet), clone(input.run_record)); } catch (err) { rec = { __engine_threw: String(err && err.message).slice(0, 300) }; }
    records[axis] = rec; norm[axis] = rec && rec.__engine_threw ? { kind: 'CONTRACT_VIOLATION', detail: axis + ' engine threw: ' + rec.__engine_threw } : C.normalize(axis, rec); }
  const complete = S.AXIS_ORDER.every((x) => norm[x].kind === 'DIRECTION'); const violation = S.AXIS_ORDER.some((x) => norm[x].kind === 'CONTRACT_VIOLATION');
  const styleId = complete ? S.resolveStyleId(norm.EI.letter, norm.TC.letter, norm.SR.letter, norm.DM.letter) : null;
  for (const axis of S.AXIS_ORDER) { const n = norm[axis]; axes[axis] = { status: n.kind, direction: n.kind === 'DIRECTION' ? n.letter : null, direction_label: n.kind === 'DIRECTION' ? n.label : null, rule: n.rule || null, input_failure: n.kind === 'INPUT_FAILURE' ? { code: n.code, class: n.class } : null, contract_violation: n.kind === 'CONTRACT_VIOLATION' ? n.detail : null, reason_ko: K.axisReason(axis, n, records[axis] || {}), engine: { release_id: engines[axis].release_id, seal_id: engines[axis].seal_id } }; }
  const pk = input.packet && typeof input.packet === 'object' ? input.packet : {};
  return { contract: RESULT_CONTRACT, runtime: RUNTIME_ID, status: complete ? 'COMPLETE' : violation ? 'CONTRACT_VIOLATION' : 'INPUT_FAILURE', style_id: styleId,
    directions: Object.fromEntries(S.AXIS_ORDER.map((x) => [x, axes[x].direction])), axes, reason_ko: K.combined(styleId, norm),
    provenance: { axis_order: S.AXIS_ORDER, packet_contract: pk.packet_contract || null, packet_version: pk.packet_version || null, engines: Object.fromEntries(S.AXIS_ORDER.map((x) => [x, { release_id: engines[x].release_id, seal_id: engines[x].seal_id, release_dir: engines[x].release_dir }])) },
    diagnostics: { non_scoring: true, input_failure_axes: S.AXIS_ORDER.filter((x) => norm[x].kind === 'INPUT_FAILURE'), contract_violation_axes: S.AXIS_ORDER.filter((x) => norm[x].kind === 'CONTRACT_VIOLATION') },
    engine_records: records };
}
/** fromExtractorOutputDir(dir) — the Frozen Vision Extractor writes packet.json + run_record.json for one look; read both and score (no extraction here). */
function fromExtractorOutputDir(dir) { const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return null; } }; return scoreFullLook({ packet: rd('packet.json'), run_record: rd('run_record.json') }); }
module.exports = { RUNTIME_ID, RESULT_CONTRACT, scoreFullLook, resolveStyleId: S.resolveStyleId, fromExtractorOutputDir, STYLE_IDS: S.STYLE_IDS };
