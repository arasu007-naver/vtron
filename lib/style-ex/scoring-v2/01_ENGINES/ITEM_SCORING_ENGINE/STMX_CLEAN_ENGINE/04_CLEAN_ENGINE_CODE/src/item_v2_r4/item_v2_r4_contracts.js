'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R4 CONTRACTS (data only, no logic) · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — TARGET-AWARE COLOUR EXTRACTION SUCCESSOR, SUIT MEMBER COLOUR ASSOCIATION, INTEGRATED RUNTIME R4 … §9).
 * Reason: the sealed R3 accepts colour_observations keyed only by the caller (no provenance), so a wrong-product colour could reach EI. R4 binds colour to the
 * scoring unit AFTER the unit is resolved, accepts colour only as a verified TARGET_AWARE_COLOUR_PACKET_V1 bound to this envelope + image, and hands the sealed R3
 * only the unit's OWN observations. Affected Scope: src/item_v2_r4/ (new). src/item_v2_r3/ (and through it R2 · R1 · item_v2) unchanged and pin-verified.
 *
 * ⚠ CANDIDATE integration vocabulary (Canonical Dictionary review before any freeze — order §13): the identifiers below. Result statuses are R3's, reused unchanged.
 */
const R3C = require('../item_v2_r3/item_v2_r3_contracts');

const RUNTIME_ID = 'STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_R4_CANDIDATE';
const RUNTIME_STATUS = 'CANDIDATE — not production · not frozen · offline-verified only (CEO order 2026-10-29: COL-C target-aware colour association)';

/* R4-owned request fields (removed before the sealed R3 is called) */
const R4_FIELDS = Object.freeze({ image_sha256: 'sha256 of the image bytes (required whenever a colour packet is supplied)', target_colour_packet: 'TARGET_AWARE_COLOUR_PACKET_V1 from the target-aware colour successor' });

const INPUT_ISSUE = Object.freeze({
  COLOUR_PROVENANCE_REQUIRED: 'COLOUR_PROVENANCE_REQUIRED',         /* raw colour_observations (caller-keyed, no provenance) are not accepted by R4 */
  IMAGE_IDENTITY_REQUIRED: 'IMAGE_IDENTITY_REQUIRED',               /* a packet without the request's image_sha256 */
  COLOUR_PACKET_INVALID: 'COLOUR_PACKET_INVALID',                   /* the successor's verifyPacket failed */
  COLOUR_PACKET_IMAGE_MISMATCH: 'COLOUR_PACKET_IMAGE_MISMATCH',     /* packet image sha256 / image_id ≠ this request */
  COLOUR_PACKET_ENVELOPE_MISMATCH: 'COLOUR_PACKET_ENVELOPE_MISMATCH', /* the packet manifest is not the manifest THIS envelope yields for the same targets */
});
/* per scoring-unit target, what happened to its colour */
const COLOUR_STATE = Object.freeze({
  OWN_COLOUR_ATTACHED: 'OWN_COLOUR_ATTACHED',   /* an OBSERVED, frozen-validator-valid observation owned by this target_id */
  NOT_ACQUIRED: 'NOT_ACQUIRED',                 /* no packet, or the packet does not cover this target — colour absent (EI colour NOT_ESTABLISHED) */
  NOT_VISIBLE: 'NOT_VISIBLE', NOT_RETURNED: 'NOT_RETURNED', REJECTED: 'REJECTED',   /* the packet's own per-target status — colour absent, never borrowed */
});
const UNUSED_OUTSIDE_UNIT = 'NOT_IN_SCORING_UNIT';   /* packet observations of targets outside the resolved unit: never attached */

module.exports = { RUNTIME_ID, RUNTIME_STATUS, R4_FIELDS, INPUT_ISSUE, COLOUR_STATE, UNUSED_OUTSIDE_UNIT, R3C };
