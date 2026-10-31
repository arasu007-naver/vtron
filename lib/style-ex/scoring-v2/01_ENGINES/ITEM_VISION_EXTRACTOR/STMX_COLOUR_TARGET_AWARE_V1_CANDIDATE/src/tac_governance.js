'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — RESPONSE GOVERNANCE (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … §4.3 · §5 · §6.1). Affected Scope: this file (new).
 *
 * One response ↔ the ONE request it answers. Per requested target, independently (the historical one-call per-target failure isolation):
 *   OBSERVED     colour_visible true + a color_observation that passes the FROZEN Colour V1 validateColorObservation (contract_errors empty; inconsistencies /
 *                warnings kept verbatim as flags, exactly as the frozen validator reports them)
 *   NOT_VISIBLE  colour_visible false + color_observation null
 *   REJECTED     contract errors · malformed entry · the target returned twice (contradictory ownership → BOTH dropped)
 *   NOT_RETURNED absent from the response, or the whole response unusable (unparseable · wrong request_id · no targets[] · transport failure)
 * Unrequested target ids are ignored and recorded (never re-keyed). ⛔ No value is repaired, defaulted, copied between targets or inferred.
 */
const C = require('./tac_contracts');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/**
 * @param {string|object|null} raw the model text (or an already-parsed object) · null when the transport failed
 * @param {{ request_id, target_ids }} request  @param {object} COL the pinned frozen Colour V1 module  @param {{ transportError? }} [o]
 * @returns {{ response_error: string|null, unrequested: string[], results: Array<{ target_id, status, color_observation, validation, reject_code, detail }> }}
 */
function governResponse(raw, request, COL, o) {
  const all = (status, code, detail) => ({ response_error: code, unrequested: [], results: request.target_ids.map((id) => ({ target_id: id, status, color_observation: null, validation: null, reject_code: code, detail })) });
  if (o && o.transportError) return all(C.OBS_STATUS.NOT_RETURNED, C.CODE.TRANSPORT_FAILURE, String(o.transportError).slice(0, 200));
  let pkg = raw; if (!isPlain(pkg)) { try { pkg = COL.parseJson(raw); } catch (e) { pkg = null; } }
  if (!isPlain(pkg)) return all(C.OBS_STATUS.NOT_RETURNED, C.CODE.UNPARSEABLE_RESPONSE, 'response is not one JSON object');
  if (pkg.request_id !== request.request_id) return all(C.OBS_STATUS.NOT_RETURNED, C.CODE.REQUEST_ID_MISMATCH, 'response request_id ' + JSON.stringify(pkg.request_id) + ' ≠ ' + request.request_id);
  if (!Array.isArray(pkg.targets)) return all(C.OBS_STATUS.NOT_RETURNED, C.CODE.MISSING_TARGETS_ARRAY, 'response has no targets[]');
  const want = new Set(request.target_ids); const unrequested = []; const seen = new Map();
  for (const e of pkg.targets) { const id = isPlain(e) && typeof e.target_id === 'string' ? e.target_id : null; if (!id || !want.has(id)) { unrequested.push(id === null ? '<malformed entry>' : id); continue; } if (!seen.has(id)) seen.set(id, []); seen.get(id).push(e); }
  const results = request.target_ids.map((id) => {
    const es = seen.get(id) || []; const r = { target_id: id, status: null, color_observation: null, validation: null, reject_code: null, detail: null };
    if (!es.length) return Object.assign(r, { status: C.OBS_STATUS.NOT_RETURNED, reject_code: null, detail: 'requested target absent from the response' });
    if (es.length > 1) return Object.assign(r, { status: C.OBS_STATUS.REJECTED, reject_code: C.CODE.DUPLICATE_TARGET_ENTRY, detail: es.length + ' entries for one target — contradictory ownership, none kept' });
    const e = es[0];
    if (e.colour_visible === false && e.color_observation === null) return Object.assign(r, { status: C.OBS_STATUS.NOT_VISIBLE });
    if (e.colour_visible !== true || !isPlain(e.color_observation)) return Object.assign(r, { status: C.OBS_STATUS.REJECTED, reject_code: C.CODE.MALFORMED_ENTRY, detail: 'colour_visible / color_observation do not agree' });
    const v = COL.validateColorObservation(e.color_observation);
    if ((v.contract_errors || []).length) return Object.assign(r, { status: C.OBS_STATUS.REJECTED, validation: v, reject_code: C.CODE.COLOUR_V1_CONTRACT_ERRORS, detail: v.contract_errors.join(', ') });
    return Object.assign(r, { status: C.OBS_STATUS.OBSERVED, color_observation: clone(e.color_observation), validation: v });
  });
  return { response_error: null, unrequested, results };
}

module.exports = { governResponse };
