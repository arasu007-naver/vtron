'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — TARGET-AWARE COLOUR PACKET (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … §4.3). Affected Scope: this file (new).
 *
 * The packet is the ONLY form in which this successor hands colour evidence downstream. Every observation carries (order §4.3): source image identity + sha256 ·
 * target_id · scoring-unit id · Suit member role · frozen Colour V1 identity (module + prompt sha256) · successor identity (+ seal aggregate when sealed) · the
 * observed evidence verbatim · the validator result · how it was obtained (provenance). Observations are listed in MANIFEST order, keyed by target_id —
 * never by array position. verifyPacket() re-derives every integrity fact a consumer must check before keying any colour.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const C = require('./tac_contracts');
const { manifestSha256 } = require('./tac_manifest');
const { FROZEN_COLOUR_V1 } = require('./tac_frozen_colour_pin');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function successorIdentity() {
  const p = path.join(__dirname, '..', C.SEAL_FILE); let seal = null; try { seal = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; } catch (e) { seal = null; }
  return { id: C.SUCCESSOR_ID, status: C.SUCCESSOR_STATUS, seal_directory_aggregate_sha256: seal ? seal.DIRECTORY_AGGREGATE_SHA256 : null };
}

/**
 * @param {object} manifest  @param {Array<{ target_id, status, color_observation, validation, reject_code, detail }>} results (one per manifest target, any order)
 * @param {{ source, mode?, requests?, model?, stored? }} provenance  @returns packet
 */
function assemblePacket(manifest, results, provenance) {
  const byId = new Map(results.map((r) => [r.target_id, r]));
  const observations = manifest.targets.map((t) => { const r = byId.get(t.target_id) || { status: C.OBS_STATUS.NOT_RETURNED, color_observation: null, validation: null, reject_code: null, detail: 'no result for this target' };
    return { target_id: t.target_id, category: t.category, member_role: t.member_role, scoring_unit_id: manifest.scoring_unit.unit_id, status: r.status, color_observation: r.status === C.OBS_STATUS.OBSERVED ? clone(r.color_observation) : null,
      validation: clone(r.validation) || null, reject_code: r.reject_code || null, detail: r.detail || null, provenance: Object.assign({ source: provenance.source }, r.provenance || {}) }; });
  const packet = { packet_version: C.PACKET_VERSION, successor: successorIdentity(), colour_v1: { module: FROZEN_COLOUR_V1.relative_path, module_sha256: FROZEN_COLOUR_V1.sha256, colour_prompt_sha256: FROZEN_COLOUR_V1.colour_prompt_sha256 },
    image: clone(manifest.image), manifest: clone(manifest), observations, acquisition: clone(provenance) };
  packet.packet_sha256 = sha(JSON.stringify(Object.assign({}, packet, { packet_sha256: undefined })));
  return packet;
}

/** integrity check a consumer runs before trusting a packet; @returns {{ ok, errors[] }} */
function verifyPacket(packet) {
  const errs = []; if (!isPlain(packet)) return { ok: false, errors: ['NOT_AN_OBJECT'] };
  if (packet.packet_version !== C.PACKET_VERSION) errs.push('PACKET_VERSION');
  if (!isPlain(packet.successor) || packet.successor.id !== C.SUCCESSOR_ID) errs.push('SUCCESSOR_ID');
  if (!isPlain(packet.colour_v1) || packet.colour_v1.module_sha256 !== FROZEN_COLOUR_V1.sha256) errs.push('COLOUR_V1_IDENTITY');
  const m = packet.manifest; if (!isPlain(m) || !Array.isArray(m.targets) || manifestSha256(m) !== m.manifest_sha256) errs.push('MANIFEST_SHA256');
  if (!isPlain(packet.image) || !isPlain(m) || JSON.stringify(packet.image) !== JSON.stringify(m.image)) errs.push('IMAGE_IDENTITY');
  if (!Array.isArray(packet.observations) || !isPlain(m) || !Array.isArray(m.targets) || packet.observations.length !== m.targets.length || packet.observations.some((o, i) => !isPlain(o) || o.target_id !== m.targets[i].target_id || o.category !== m.targets[i].category || o.scoring_unit_id !== m.scoring_unit.unit_id)) errs.push('OBSERVATION_SET');
  else if (packet.observations.some((o) => o.status === C.OBS_STATUS.OBSERVED && !isPlain(o.color_observation))) errs.push('OBSERVED_WITHOUT_EVIDENCE');
  if (sha(JSON.stringify(Object.assign({}, packet, { packet_sha256: undefined }))) !== packet.packet_sha256) errs.push('PACKET_SHA256');
  return { ok: !errs.length, errors: errs };
}

module.exports = { assemblePacket, verifyPacket, successorIdentity };
