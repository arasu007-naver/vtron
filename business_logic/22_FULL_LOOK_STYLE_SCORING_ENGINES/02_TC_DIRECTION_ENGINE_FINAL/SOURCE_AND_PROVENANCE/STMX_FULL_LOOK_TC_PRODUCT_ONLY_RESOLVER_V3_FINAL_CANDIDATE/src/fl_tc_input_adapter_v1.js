'use strict';
/**
 * Input validation + existing adapter. lookFromPacket() is the Full-Look adapter of the diagnostic replay k2_corrected_replay.js
 * (04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_DIRECTION_ARCHITECTURE_SEMANTIC_GENERALIZATION_CORRECTION_V1/_raw/, sha256 edaff1c4…), reproduced
 * line-for-line for the fields TC reads (identity · subtype · SVP-101 grammar · SVP-102 trouser distinction · SVP-124 material · run_record cells ·
 * exposure · relations · common visibility · facts hidden by another garment). EI / DM fields of that adapter are not carried (TC scope only).
 * Input = the frozen release outputs of one image: packet.json (contract STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET · V1_RC4) + run_record.json
 * (the parameter-keyed projection of the same evidence, SVP-xxx@cN). image_ref / run_id / file names are never read for a decision.
 */
const PACKET_CONTRACT = 'STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET', PACKET_VERSION = 'V1_RC4';
class InputContractError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; } }
function validateInput(packet, runRecord) {
  if (!packet || typeof packet !== 'object') throw new InputContractError('PACKET_MISSING');
  if (packet.packet_contract !== PACKET_CONTRACT) throw new InputContractError('PACKET_CONTRACT_UNKNOWN', String(packet.packet_contract));
  if (packet.packet_version !== PACKET_VERSION) throw new InputContractError('PACKET_VERSION_UNKNOWN', String(packet.packet_version));
  if (!Array.isArray(packet.requested_axes) || !packet.requested_axes.includes('TC')) throw new InputContractError('TC_NOT_REQUESTED');
  for (const k of ['look_frame', 'component_registry', 'relations', 'canonical_exposure', 'common_visibility']) if (!packet[k]) throw new InputContractError('PACKET_BLOCK_MISSING', k);
  if (!runRecord || typeof runRecord.parameters !== 'object') throw new InputContractError('RUN_RECORD_MISSING');
  if (runRecord.packet_version && runRecord.packet_version !== PACKET_VERSION) throw new InputContractError('RUN_RECORD_VERSION_MISMATCH', String(runRecord.packet_version));
  const refs = new Set(packet.component_registry.map((e) => e.component_ref));
  for (const k of Object.keys(runRecord.parameters)) { const m = k.match(/@(c\d+)$/); if (m && !refs.has(m[1])) throw new InputContractError('RUN_RECORD_REF_NOT_IN_REGISTRY', k); }
  for (const f of packet.component_fact_pool || []) { const c = runRecord.parameters[SVP_OF[f.fact] + '@' + f.component_ref]; if (SVP_OF[f.fact] && c && c.observed_state !== f.state) throw new InputContractError('RUN_RECORD_PACKET_STATE_CONFLICT', f.component_ref + '.' + f.fact); }
  return true;
}
const SVP_OF = { silhouette: 'SVP-103', fit: 'SVP-104', shoulder_structure: 'SVP-105', asymmetry: 'SVP-107', length: 'SVP-108', sleeve_volume: 'SVP-109', shoulder_span: 'SVP-110', closure_type: 'SVP-111', front_opening_extent: 'SVP-112', collar: 'SVP-113', sleeve: 'SVP-114', shoulder_connection: 'SVP-115', pocket: 'SVP-116', pocket_construction: 'SVP-117', pocket_projection: 'SVP-118', waist_definition: 'SVP-119', slit: 'SVP-120', surface: 'SVP-123', material: 'SVP-124', attachment: 'SVP-126' };
// ── k2 lookFromPacket (TC fields), verbatim logic ──
function lookFromPacket(p, rec) {
  // [IMPL-3] the pocket cell keeps its pocket.pockets[] instances (k2 dropped them, so the frozen pocket-system predicates never saw them)
  const cell = (k) => { const c = rec.parameters[k]; return c ? (Array.isArray(c.pockets) ? { state: c.observed_state, value: c.observed_value, pockets: c.pockets } : { state: c.observed_state, value: c.observed_value }) : null; }; const val = (k) => { const c = cell(k); return c && c.state === 'OBSERVED' ? c.value : null; };
  const comps = p.component_registry.map((e) => ({ ref: e.component_ref, identity: e.object_identity.state === 'OBSERVED' ? e.object_identity.value : 'UNKNOWN', subtype: e.object_subtype && e.object_subtype.state === 'OBSERVED' ? e.object_subtype.value : null, grammar: val('SVP-101@' + e.component_ref), trouser_distinction: val('SVP-102@' + e.component_ref), material: val('SVP-124@' + e.component_ref) }));
  const notVisible = Object.fromEntries((p.common_visibility.facts_not_visible || []).map((f) => [f.key, f.limitation || []]));
  return { comps, cell, val, exposure: p.canonical_exposure, relations: p.relations, cv: p.common_visibility, notVisible };
}
module.exports = { PACKET_CONTRACT, PACKET_VERSION, InputContractError, validateInput, lookFromPacket, SVP_OF };
