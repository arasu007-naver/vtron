'use strict';
/**
 * STMX Full-Look DM Direction Engine — Final V1 (FLDM_FINAL_V1) — release entry.
 * score(packet) → the governed Full-Look DM Direction result of the frozen runtime FL_DM_DIRECTION_CANDIDATE_V3_1 (byte-identical copy in RUNTIME/src).
 * Input: one frozen Full-Look Vision Evidence Packet (DM Vision Evidence Transport V2). Output: { status, direction (D | M), direction_reason, evidence_used,
 * evidence_not_deciding, rule_trace, candidate_version, diagnostics } — or { status: 'INPUT_FAILURE', direction: null } for a technically invalid input.
 */
const path = require('path');
const R = require(path.join(__dirname, '..', 'RUNTIME', 'src', 'fl_dm_direction_resolver_v3_1.js'));
const RELEASE_ID = 'STMX_FULL_LOOK_DM_DIRECTION_ENGINE_FINAL_V1';
function score(packet) { return R.scorePacket(packet); }
module.exports = { RELEASE_ID, RUNTIME_VERSION: R.VERSION, score };
