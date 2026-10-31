'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 · CANDIDATE (not production · not frozen · live accuracy NOT_DEMONSTRATED).
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — TARGET-AWARE COLOUR EXTRACTION SUCCESSOR … COL-C). Affected Scope: this directory (new).
 *
 *   V1.3 envelope + resolved scoring unit → buildTargetManifest → planAcquisition / acquireTargetAwareColour (injected transport; default refuses — G53)
 *                                                               → associateStoredColour / attributeLegacyUnkeyed (existing colour, no call)
 *   → TARGET_AWARE_COLOUR_PACKET_V1 (verifyPacket) → consumed by the Integrated Runtime R4.
 * Frozen Colour V1 (run/color_recovery/color_contract_v1.js) is loaded hash-pinned and never modified.
 */
const C = require('./src/tac_contracts');
const { buildTargetManifest, manifestSha256 } = require('./src/tac_manifest');
const { buildRequests, frozenParts } = require('./src/tac_request');
const { governResponse } = require('./src/tac_governance');
const { assemblePacket, verifyPacket, successorIdentity } = require('./src/tac_packet');
const { planAcquisition, acquireTargetAwareColour } = require('./src/tac_acquisition');
const { associateStoredColour, attributeLegacyUnkeyed } = require('./src/tac_stored_association');
const { loadFrozenColourV1, FROZEN_COLOUR_V1, ColourPinError } = require('./src/tac_frozen_colour_pin');

module.exports = { C, buildTargetManifest, manifestSha256, buildRequests, frozenParts, governResponse, assemblePacket, verifyPacket, successorIdentity, planAcquisition, acquireTargetAwareColour,
  associateStoredColour, attributeLegacyUnkeyed, loadFrozenColourV1, FROZEN_COLOUR_V1, ColourPinError };
