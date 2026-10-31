'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — STORED / LEGACY COLOUR ASSOCIATION (non-scoring · no inference call) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … §3.2 · §7 · §11). Affected Scope: this file (new).
 *
 * Brings colour that ALREADY EXISTS into the same governed packet (no new AI):
 *   associateStoredColour — stored per-target Colour V1 (e.g. the historical one-call producer's sibling color_observation, CEO-corpus raw_colour.colour_v1):
 *     SAME_RECORD    the stored colour was produced for THIS envelope's own targets (same record) → by target id, and the stored category (when given) must equal
 *                    the envelope category
 *     CROSS_PRODUCER another producer's ids (order §7: a matching "target_1" string is NOT identity) → only SAME image sha256 + the requested target's category
 *                    occurring exactly once among the stored targets AND exactly once among this image's categorised V1.3 targets; otherwise unresolved
 *   attributeLegacyUnkeyed — the locked standalone runner's single unkeyed object ("most prominent garment"): attributable ONLY when the image has exactly one
 *     eligible V1.3 target and that is the one requested; otherwise rejected for every requested target (never given to a Suit member or a non-dominant pick).
 * Every associated observation is re-validated by the frozen Colour V1 validator. ⛔ No positional matching · no GT · no REF · no colour copied between targets.
 */
const C = require('./tac_contracts');
const { loadFrozenColourV1 } = require('./tac_frozen_colour_pin');
const { assemblePacket } = require('./tac_packet');
const { catOf } = require('./tac_manifest');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function judge(COL, target_id, obs, extraProv) {
  const r = { target_id, status: null, color_observation: null, validation: null, reject_code: null, detail: null, provenance: extraProv };
  if (obs === null || obs === undefined) return Object.assign(r, { status: C.OBS_STATUS.NOT_RETURNED, detail: 'stored entry carries no color_observation' });
  if (!isPlain(obs)) return Object.assign(r, { status: C.OBS_STATUS.REJECTED, reject_code: C.CODE.MALFORMED_ENTRY, detail: 'stored color_observation is not an object' });
  const v = COL.validateColorObservation(obs);
  if ((v.contract_errors || []).length) return Object.assign(r, { status: C.OBS_STATUS.REJECTED, validation: v, reject_code: C.CODE.COLOUR_V1_CONTRACT_ERRORS, detail: v.contract_errors.join(', ') });
  return Object.assign(r, { status: C.OBS_STATUS.OBSERVED, color_observation: clone(obs), validation: v });
}

/**
 * @param {{ manifest, vision_envelope, stored: { image_sha256, basis: 'SAME_RECORD'|'CROSS_PRODUCER', producer_label, targets: [{ target_id, category?, color_observation }] }, extractorRoot? }} p
 * @returns packet
 */
function associateStoredColour(p) {
  const COL = loadFrozenColourV1(p); const m = p.manifest, s = p.stored || {}; const st = Array.isArray(s.targets) ? s.targets.filter(isPlain) : [];
  const prov = { basis: s.basis, producer_label: s.producer_label || null };
  const results = m.targets.map((t) => {
    const base = { target_id: t.target_id, status: C.OBS_STATUS.REJECTED, color_observation: null, validation: null, provenance: Object.assign({}, prov) };
    if (s.image_sha256 !== m.image.image_sha256) return Object.assign(base, { reject_code: C.CODE.IMAGE_SHA256_MISMATCH, detail: 'stored colour image sha256 ≠ manifest image sha256' });
    if (s.basis === C.STORED_BASIS.SAME_RECORD) {
      const hit = st.filter((x) => x.target_id === t.target_id);
      if (!hit.length) return Object.assign(base, { status: C.OBS_STATUS.NOT_RETURNED, reject_code: null, detail: 'no stored colour for this target' });
      if (hit.length > 1) return Object.assign(base, { reject_code: C.CODE.DUPLICATE_TARGET_ENTRY, detail: 'two stored entries for one target' });
      if (hit[0].category !== undefined && hit[0].category !== t.category) return Object.assign(base, { reject_code: C.CODE.STORED_CATEGORY_MISMATCH, detail: 'stored category ' + hit[0].category + ' ≠ envelope category ' + t.category });
      return judge(COL, t.target_id, hit[0].color_observation, Object.assign({}, prov, { stored_target_id: hit[0].target_id }));
    }
    if (s.basis === C.STORED_BASIS.CROSS_PRODUCER) {
      const same = st.filter((x) => x.category === t.category); const imgSame = p.vision_envelope.targets.map(catOf).filter((c) => c === t.category).length;
      if (!same.length) return Object.assign(base, { status: C.OBS_STATUS.NOT_RETURNED, reject_code: C.CODE.NO_CATEGORY_MATCH, detail: 'no stored target of category ' + t.category });
      if (same.length > 1 || imgSame !== 1) return Object.assign(base, { status: C.OBS_STATUS.NOT_RETURNED, reject_code: C.CODE.CATEGORY_NOT_UNIQUE, detail: 'category ' + t.category + ' occurs ' + same.length + '× in the stored colour and ' + imgSame + '× in the V1.3 envelope — no unique identity' });
      return judge(COL, t.target_id, same[0].color_observation, Object.assign({}, prov, { stored_target_id: same[0].target_id, association: 'SAME_IMAGE_SHA256 + UNIQUE_CATEGORY' }));
    }
    return Object.assign(base, { reject_code: C.CODE.UNIT_SHAPE_INVALID, detail: 'stored.basis must be SAME_RECORD or CROSS_PRODUCER' });
  });
  return assemblePacket(m, results, { source: C.SOURCE.HISTORICAL_STORED_ASSOCIATED, basis: s.basis, producer_label: s.producer_label || null });
}

/** @param {{ manifest, vision_envelope, image_sha256, colour, extractorRoot? }} p  @returns packet */
function attributeLegacyUnkeyed(p) {
  const COL = loadFrozenColourV1(p); const m = p.manifest; const eligible = p.vision_envelope.targets.filter((t) => t && t.eligible === true && catOf(t));
  const ok = p.image_sha256 === m.image.image_sha256 && eligible.length === 1 && m.targets.length === 1 && m.targets[0].target_id === eligible[0].target_id;
  const results = m.targets.map((t) => (ok ? judge(COL, t.target_id, p.colour, { basis: 'UNIQUE_ELIGIBLE_TARGET' })
    : { target_id: t.target_id, status: C.OBS_STATUS.REJECTED, color_observation: null, validation: null, reject_code: p.image_sha256 !== m.image.image_sha256 ? C.CODE.IMAGE_SHA256_MISMATCH : C.CODE.LEGACY_UNKEYED_COLOUR_NOT_ATTRIBUTABLE,
      detail: 'a single "most prominent garment" colour cannot be owned by ' + t.target_id + ' (' + eligible.length + ' eligible target(s) in the image; ' + m.targets.length + ' requested)', provenance: { basis: 'NOT_ATTRIBUTABLE' } }));
  return assemblePacket(m, results, { source: C.SOURCE.LEGACY_SINGLE_UNKEYED });
}

module.exports = { associateStoredColour, attributeLegacyUnkeyed };
