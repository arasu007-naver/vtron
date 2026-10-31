'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — CONTRACTS (data only, no logic) · CANDIDATE (not production · not frozen · not live-verified).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — TARGET-AWARE COLOUR EXTRACTION SUCCESSOR … COL-C · §4 · §5 · §6 · §7). Reason: the locked
 * standalone Colour V1 call reads "the single most prominent garment" and returns no target identity, so a user-selected non-prominent garment and the two members
 * of a commercial Suit cannot receive their OWN Colour V1 evidence. Affected Scope: STMX_COLOUR_TARGET_AWARE_V1_CANDIDATE/ (new). Colour V1
 * (run/color_recovery/color_contract_v1.js), Item Vision V1.3 and every scoring engine are unchanged.
 *
 * ⛔ No Colour V1 field, family, enum, lightness / usage / effect / carrier / contrast meaning is defined or changed here — they are read from the frozen module.
 * ⚠ CANDIDATE successor-internal vocabulary (Canonical Dictionary review required before any freeze — order §13): the identifiers below.
 */
const SUCCESSOR_ID = 'STMX_COLOUR_TARGET_AWARE_ACQUISITION_V1_CANDIDATE';
const SUCCESSOR_STATUS = 'CANDIDATE — offline-verified only · not production · not frozen · live extraction accuracy NOT_DEMONSTRATED (CEO order 2026-10-29, G53 ACTIVE)';
const PACKET_VERSION = 'TARGET_AWARE_COLOUR_PACKET_V1';
const SEAL_FILE = 'CODE_IDENTITY_SEAL_COLOUR_TARGET_AWARE_V1_CANDIDATE.json';

/* acquisition modes (order §6): ONE_CALL = one request carrying every requested target of one image · PER_TARGET = one request per unique requested target */
const MODE = Object.freeze({ ONE_CALL: 'ONE_CALL', PER_TARGET: 'PER_TARGET' });
/* what is requested (order §6.1): ITEM = one selected garment · SUIT = the two members of a user- / merchandise-designated Suit · REQUESTED_TARGETS = several individually requested garments */
const UNIT = Object.freeze({ ITEM: 'ITEM', SUIT: 'SUIT', REQUESTED_TARGETS: 'REQUESTED_TARGETS' });
const SUIT_COMPONENT_SETS = Object.freeze([['Jacket', 'Trouser'], ['Jacket', 'Skirt']]);   /* the frozen EI V2 Suit component sets (ei_v2_product_unit.js), restated for the manifest check */

/* per-target observation status in a packet */
const OBS_STATUS = Object.freeze({ OBSERVED: 'OBSERVED', NOT_VISIBLE: 'NOT_VISIBLE', NOT_RETURNED: 'NOT_RETURNED', REJECTED: 'REJECTED' });
/* how a target is named to the model (the manifest identification basis) */
const IDENTIFICATION = Object.freeze({ CATEGORY_UNIQUE: 'CATEGORY_UNIQUE', DESCRIPTOR: 'DESCRIPTOR', AMBIGUOUS: 'AMBIGUOUS' });
/* provenance of an observation */
const SOURCE = Object.freeze({ TARGET_AWARE_ACQUISITION: 'TARGET_AWARE_ACQUISITION', HISTORICAL_STORED_ASSOCIATED: 'HISTORICAL_STORED_ASSOCIATED', LEGACY_SINGLE_UNKEYED: 'LEGACY_SINGLE_UNKEYED' });
const STORED_BASIS = Object.freeze({ SAME_RECORD: 'SAME_RECORD', CROSS_PRODUCER: 'CROSS_PRODUCER' });

const CODE = Object.freeze({
  /* manifest */
  IMAGE_SHA256_REQUIRED: 'IMAGE_SHA256_REQUIRED', NO_VISION_ENVELOPE: 'NO_VISION_ENVELOPE', TARGET_NOT_IN_ENVELOPE: 'TARGET_NOT_IN_ENVELOPE', TARGET_NOT_ELIGIBLE: 'TARGET_NOT_ELIGIBLE',
  CATEGORY_NOT_OBSERVED: 'CATEGORY_NOT_OBSERVED', DUPLICATE_REQUESTED_TARGET: 'DUPLICATE_REQUESTED_TARGET', UNIT_SHAPE_INVALID: 'UNIT_SHAPE_INVALID', SUIT_COMPONENTS_INVALID: 'SUIT_COMPONENTS_INVALID',
  TARGET_IDENTIFICATION_AMBIGUOUS: 'TARGET_IDENTIFICATION_AMBIGUOUS',
  /* response governance */
  UNPARSEABLE_RESPONSE: 'UNPARSEABLE_RESPONSE', REQUEST_ID_MISMATCH: 'REQUEST_ID_MISMATCH', MISSING_TARGETS_ARRAY: 'MISSING_TARGETS_ARRAY', TRANSPORT_FAILURE: 'TRANSPORT_FAILURE',
  UNREQUESTED_TARGET: 'UNREQUESTED_TARGET', DUPLICATE_TARGET_ENTRY: 'DUPLICATE_TARGET_ENTRY', MALFORMED_ENTRY: 'MALFORMED_ENTRY', COLOUR_V1_CONTRACT_ERRORS: 'COLOUR_V1_CONTRACT_ERRORS',
  /* association of stored / legacy colour */
  IMAGE_SHA256_MISMATCH: 'IMAGE_SHA256_MISMATCH', STORED_CATEGORY_MISMATCH: 'STORED_CATEGORY_MISMATCH', CATEGORY_NOT_UNIQUE: 'CATEGORY_NOT_UNIQUE', NO_CATEGORY_MATCH: 'NO_CATEGORY_MATCH',
  LEGACY_UNKEYED_COLOUR_NOT_ATTRIBUTABLE: 'LEGACY_UNKEYED_COLOUR_NOT_ATTRIBUTABLE',
  /* transport */
  G53_ACTIVE_NO_TRANSPORT: 'G53_ACTIVE_NO_TRANSPORT',
});

module.exports = { SUCCESSOR_ID, SUCCESSOR_STATUS, PACKET_VERSION, SEAL_FILE, MODE, UNIT, SUIT_COMPONENT_SETS, OBS_STATUS, IDENTIFICATION, SOURCE, STORED_BASIS, CODE };
