'use strict';
/**
 * STMX Full-Look DM Direction — V3.1 CANDIDATE — input adapter (byte-for-byte the V3 logic). Reads ONE frozen Full-Look Vision Evidence Packet (DM Vision Evidence Transport V2) and returns the
 * DM-lawful projection: SVP-001 look_frame · SVP-002 component identity · DMP-1 look_components · DMP-2 look_detail_systems · DMP-3 dm_evidence_visibility.
 * Identical to the DMSC2 dm_lawful projection used by V2 / V2-C (proven on the 43 sealed packets by the validation harness). No other packet field is read
 * (no relations, ownership, material, closure, Colour V1, Item facts, look id or request trace). Technical input failures are returned separately (rule DM3-S0).
 */
const val = (o) => (o == null ? null : o.state === 'OBSERVED' ? o.value : o.state);
function fromPacket(pk) {
  if (!pk || typeof pk !== 'object' || Array.isArray(pk)) return { ok: false, input_failure: 'PACKET_ABSENT_OR_NOT_AN_OBJECT' };
  if (!pk.look_frame || !Array.isArray(pk.component_registry)) return { ok: false, input_failure: 'NOT_A_FULL_LOOK_PACKET' };
  const dm = pk.dm_evidence; if (!dm || typeof dm !== 'object') return { ok: false, input_failure: 'DM_EVIDENCE_BLOCK_ABSENT' };
  if (dm.transport_contract !== undefined && dm.transport_contract !== 'STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2') return { ok: false, input_failure: 'DM_TRANSPORT_CONTRACT_NOT_V2' };
  if (!Array.isArray(dm.look_detail_systems)) return { ok: false, input_failure: 'DM_DETAIL_SYSTEMS_NOT_AN_ARRAY' };
  const component_identity = Object.fromEntries(pk.component_registry.map((c) => [c.component_ref, val(c.object_identity)]));
  return { ok: true, L: { look_frame: pk.look_frame, dm_evidence_visibility: dm.dm_evidence_visibility || { state: 'UNKNOWN' }, component_identity, look_components: dm.look_components || [], look_detail_systems: dm.look_detail_systems } };
}
module.exports = { fromPacket };
