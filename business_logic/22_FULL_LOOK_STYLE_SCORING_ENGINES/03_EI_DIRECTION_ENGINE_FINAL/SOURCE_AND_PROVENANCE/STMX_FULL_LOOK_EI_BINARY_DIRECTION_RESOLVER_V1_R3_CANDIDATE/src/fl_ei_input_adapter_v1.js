'use strict';
/**
 * Input validation + read-only EI view of the packet. The contract checks are those of the frozen-release TC adapter (FLTC V3 fl_tc_input_adapter_v1.js)
 * with EI as the requested axis; lookFromPacket() reproduces the EI fields of the sealed k2 adapter (identity · subtype · SVP-101 grammar · SVP-102 trouser
 * distinction · SVP-124 material · colour composition · canonical exposure · SVP-121 / 122 cells). Values are copied, never rewritten; UNKNOWN stays UNKNOWN.
 * image_ref / run_id / file names are never read for a decision.
 */
const PACKET_CONTRACT = 'STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET', PACKET_VERSION = 'V1_RC4';
const SVP_OF = { pattern: 'SVP-121', graphic: 'SVP-122', surface: 'SVP-123', material: 'SVP-124', decorative_detail: 'SVP-125', attachment: 'SVP-126' };
class InputContractError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; } }
function validateInput(packet, runRecord) {
  if (!packet || typeof packet !== 'object') throw new InputContractError('PACKET_MISSING');
  if (packet.packet_contract !== PACKET_CONTRACT) throw new InputContractError('PACKET_CONTRACT_UNKNOWN', String(packet.packet_contract));
  if (packet.packet_version !== PACKET_VERSION) throw new InputContractError('PACKET_VERSION_UNKNOWN', String(packet.packet_version));
  if (!Array.isArray(packet.requested_axes) || !packet.requested_axes.includes('EI')) throw new InputContractError('EI_NOT_REQUESTED');
  for (const k of ['look_frame', 'component_registry', 'colour_composition', 'canonical_exposure']) if (!packet[k]) throw new InputContractError('PACKET_BLOCK_MISSING', k);
  if (!Array.isArray(packet.component_registry)) throw new InputContractError('REGISTRY_NOT_ARRAY');
  if (!runRecord || typeof runRecord.parameters !== 'object') throw new InputContractError('RUN_RECORD_MISSING');
  if (runRecord.packet_version && runRecord.packet_version !== PACKET_VERSION) throw new InputContractError('RUN_RECORD_VERSION_MISMATCH', String(runRecord.packet_version));
  const refs = new Set(packet.component_registry.map((e) => e.component_ref));
  for (const k of Object.keys(runRecord.parameters)) { const m = k.match(/@(c\d+)$/); if (m && !refs.has(m[1])) throw new InputContractError('RUN_RECORD_REF_NOT_IN_REGISTRY', k); }
  for (const f of packet.component_fact_pool || []) { const c = runRecord.parameters[SVP_OF[f.fact] + '@' + f.component_ref]; if (SVP_OF[f.fact] && c && c.observed_state !== f.state) throw new InputContractError('RUN_RECORD_PACKET_STATE_CONFLICT', f.component_ref + '.' + f.fact); }
  const cc = packet.colour_composition; for (const k of ['field', 'points']) if (!Array.isArray(cc[k])) throw new InputContractError('COLOUR_BLOCK_MALFORMED', k);
  return true;
}
function lookFromPacket(p, rec) {
  const cell = (k) => { const c = rec.parameters[k]; return c ? { state: c.observed_state, value: c.observed_value } : null; };
  const val = (k) => { const c = cell(k); return c && c.state === 'OBSERVED' ? c.value : null; };
  const comps = p.component_registry.map((e) => ({ ref: e.component_ref, identity: e.object_identity && e.object_identity.state === 'OBSERVED' ? e.object_identity.value : 'UNKNOWN', subtype: e.object_subtype && e.object_subtype.state === 'OBSERVED' ? e.object_subtype.value : null, grammar: val('SVP-101@' + e.component_ref), trouser_distinction: val('SVP-102@' + e.component_ref), material: val('SVP-124@' + e.component_ref) }));
  const cc = p.colour_composition;
  return { comps, cell, val, frame: p.look_frame, colour: { field: cc.field || [], points: cc.points || [], unreadable: cc.unreadable || [], partial: cc.partial || [], suppressed: cc.suppressed || [] }, exposure: p.canonical_exposure };
}
module.exports = { PACKET_CONTRACT, PACKET_VERSION, InputContractError, validateInput, lookFromPacket, SVP_OF };
