'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R4 COLOUR BINDING (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… INTEGRATED RUNTIME R4 §9.1 · §9.2). Affected Scope: this file (new).
 *
 * checkPacket — a packet is usable only if (1) the successor's verifyPacket passes, (2) its image sha256 equals the request's image_sha256 and its image_id equals the
 *   envelope's, and (3) its manifest equals the manifest THIS envelope yields for the same targets and unit type (same ids · categories · descriptors · image) —
 *   proving the colour was acquired for these very V1.3 targets. Any failure rejects the WHOLE packet (no partial trust).
 * attachOwnColour — only the resolved scoring unit's targets may receive colour, and each only its OWN OBSERVED observation (by target_id). Every other state
 *   leaves that target without colour (frozen EI: colour NOT_ESTABLISHED) — never borrowed from another target, never copied between Suit members.
 */
const C = require('./item_v2_r4_contracts');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/** @returns {{ ok:true } | { ok:false, issue, detail }} */
function checkPacket(TAC, packet, imageSha256, envelope) {
  const v = TAC.verifyPacket(packet); if (!v.ok) return { ok: false, issue: C.INPUT_ISSUE.COLOUR_PACKET_INVALID, detail: 'target-aware colour packet failed verification: ' + v.errors.join(', ') };
  if (packet.image.image_sha256 !== imageSha256) return { ok: false, issue: C.INPUT_ISSUE.COLOUR_PACKET_IMAGE_MISMATCH, detail: 'packet image sha256 ≠ request image_sha256' };
  const envId = typeof envelope.image_id === 'string' ? envelope.image_id : null; if (packet.image.image_id !== envId) return { ok: false, issue: C.INPUT_ISSUE.COLOUR_PACKET_IMAGE_MISMATCH, detail: 'packet image_id ' + JSON.stringify(packet.image.image_id) + ' ≠ envelope image_id ' + JSON.stringify(envId) };
  const re = TAC.buildTargetManifest({ vision_envelope: envelope, image_sha256: imageSha256, scoring_unit: { type: packet.manifest.scoring_unit.type, target_ids: packet.manifest.targets.map((t) => t.target_id) } });
  if (!re.ok) return { ok: false, issue: C.INPUT_ISSUE.COLOUR_PACKET_ENVELOPE_MISMATCH, detail: 'the packet targets are not valid targets of this envelope (' + re.code + ': ' + re.detail + ')' };
  if (re.manifest.manifest_sha256 !== packet.manifest.manifest_sha256) return { ok: false, issue: C.INPUT_ISSUE.COLOUR_PACKET_ENVELOPE_MISMATCH, detail: 'packet manifest ≠ the manifest this envelope yields for the same targets (different categories / descriptors / identities)' };
  return { ok: true };
}

/** @returns {{ colour_observations: {}, per_target: [], unused: [] }} */
function attachOwnColour(packet, unitTargetIds) {
  const byId = new Map(); if (isPlain(packet)) for (const o of packet.observations) byId.set(o.target_id, o);
  const colour_observations = {}; const per_target = unitTargetIds.map((id) => {
    const o = byId.get(id); if (!o) return { target_id: id, state: C.COLOUR_STATE.NOT_ACQUIRED, reject_code: null, provenance: null };
    if (o.status === 'OBSERVED' && isPlain(o.color_observation)) { colour_observations[id] = clone(o.color_observation); return { target_id: id, state: C.COLOUR_STATE.OWN_COLOUR_ATTACHED, primary_color_family: o.color_observation.primary_color_family, member_role: o.member_role, provenance: clone(o.provenance) }; }
    return { target_id: id, state: C.COLOUR_STATE[o.status] || C.COLOUR_STATE.REJECTED, reject_code: o.reject_code || null, provenance: clone(o.provenance) }; });
  const unused = isPlain(packet) ? packet.observations.filter((o) => !unitTargetIds.includes(o.target_id)).map((o) => ({ target_id: o.target_id, status: o.status, use: C.UNUSED_OUTSIDE_UNIT })) : [];
  return { colour_observations, per_target, unused };
}

module.exports = { checkPacket, attachOwnColour };
