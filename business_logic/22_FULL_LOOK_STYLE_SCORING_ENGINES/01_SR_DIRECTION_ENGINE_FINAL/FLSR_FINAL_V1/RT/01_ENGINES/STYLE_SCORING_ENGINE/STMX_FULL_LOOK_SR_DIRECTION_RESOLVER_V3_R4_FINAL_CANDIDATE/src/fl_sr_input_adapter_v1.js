'use strict';
/**
 * Input validation + existing adapter. lookFromPacket() is the Full-Look adapter of the diagnostic replay k2_corrected_replay.js (pinned in
 * fl_sr_authority_v1.js), reproduced for the fields SR reads: upper_realization (SVP-007 relation · SVP-008 shoulder · SVP-009 shape behaviour ·
 * source_refs = governing upper), run_record cells (SVP-119 waist definition · SVP-106 shoulder drop · SVP-108 length), relations (securing),
 * look frame. EI / TC / DM fields of that adapter are not carried (SR scope only).
 * Input = the frozen release outputs of one image: packet.json (STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET · V1_RC4) + run_record.json.
 * image_ref / run_id / file names are never read for a decision.
 */
const PACKET_CONTRACT = 'STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET', PACKET_VERSION = 'V1_RC4';
class InputContractError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; } }
const UPPER = { relation: 'SVP-007', shoulder: 'SVP-008', shape_behaviour: 'SVP-009' };
function validateInput(packet, runRecord) {
  if (!packet || typeof packet !== 'object') throw new InputContractError('PACKET_MISSING');
  if (packet.packet_contract !== PACKET_CONTRACT) throw new InputContractError('PACKET_CONTRACT_UNKNOWN', String(packet.packet_contract));
  if (packet.packet_version !== PACKET_VERSION) throw new InputContractError('PACKET_VERSION_UNKNOWN', String(packet.packet_version));
  if (!Array.isArray(packet.requested_axes) || !packet.requested_axes.includes('SR')) throw new InputContractError('SR_NOT_REQUESTED');
  for (const k of ['look_frame', 'component_registry', 'relations', 'upper_realization', 'common_visibility']) if (!packet[k]) throw new InputContractError('PACKET_BLOCK_MISSING', k);
  if (!runRecord || typeof runRecord.parameters !== 'object') throw new InputContractError('RUN_RECORD_MISSING');
  if (runRecord.packet_version && runRecord.packet_version !== PACKET_VERSION) throw new InputContractError('RUN_RECORD_VERSION_MISMATCH', String(runRecord.packet_version));
  const refs = new Set(packet.component_registry.map((e) => e.component_ref));
  for (const k of Object.keys(runRecord.parameters)) { const m = k.match(/@(c\d+)$/); if (m && !refs.has(m[1])) throw new InputContractError('RUN_RECORD_REF_NOT_IN_REGISTRY', k); }
  for (const r of packet.upper_realization.source_refs || []) if (!refs.has(r)) throw new InputContractError('UPPER_SOURCE_NOT_IN_REGISTRY', r);
  // the look-level upper facts exist twice (packet block and run_record cell): they must agree
  for (const [f, svp] of Object.entries(UPPER)) { const a = packet.upper_realization[f], b = runRecord.parameters[svp]; if (!a || !b) continue; const av = a.state === 'OBSERVED' ? a.value : a.state, bv = b.observed_state === 'OBSERVED' ? b.observed_value : b.observed_state; if (av !== bv) throw new InputContractError('RUN_RECORD_PACKET_STATE_CONFLICT', svp + ' ' + av + ' vs ' + bv); }
  return true;
}
// ── k2 lookFromPacket (SR fields), verbatim logic ──
function lookFromPacket(p, rec) {
  const cell = (k) => { const c = rec.parameters[k]; return c ? { state: c.observed_state, value: c.observed_value } : null; }; const val = (k) => { const c = cell(k); return c && c.state === 'OBSERVED' ? c.value : null; };
  const comps = p.component_registry.map((e) => ({ ref: e.component_ref, identity: e.object_identity.state === 'OBSERVED' ? e.object_identity.value : 'UNKNOWN' }));
  return { comps, cell, val, upper: p.upper_realization, relations: p.relations, cv: p.common_visibility, frame: p.look_frame };
}
module.exports = { PACKET_CONTRACT, PACKET_VERSION, InputContractError, validateInput, lookFromPacket, UPPER };
