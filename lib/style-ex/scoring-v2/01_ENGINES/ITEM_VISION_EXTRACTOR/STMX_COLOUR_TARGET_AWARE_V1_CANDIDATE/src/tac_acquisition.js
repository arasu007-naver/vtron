'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — ACQUISITION (orchestration only) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … §6 · §13). Affected Scope: this file (new).
 *
 * planAcquisition(manifest, mode) — the exact external-call plan, with no call: ONE_CALL = 1 request for all requested targets of the image · PER_TARGET = 1 request
 *   per unique requested target. acquireTargetAwareColour({…, transport}) — executes the plan through an INJECTED transport function (prompt, image, { model }) → text.
 * ⛔ This module contains no network code and no credential access. The DEFAULT transport refuses (G53 ACTIVE): a live run needs a separately authorised runner
 *   that supplies the transport under a current CEO Approval Anchor. ⛔ Retry only on a THROWN transport error, never on content (no voting, no re-asking for a
 *   "better" colour); attempts are bounded by maxAttempts (default 1 = no retry). ⛔ The image sha256 in the manifest must equal the bytes sent when the image is a file.
 */
const fs = require('fs'), crypto = require('crypto');
const C = require('./tac_contracts');
const { loadFrozenColourV1 } = require('./tac_frozen_colour_pin');
const { buildRequests } = require('./tac_request');
const { governResponse } = require('./tac_governance');
const { assemblePacket } = require('./tac_packet');

const refusingTransport = async () => { const e = new Error(C.CODE.G53_ACTIVE_NO_TRANSPORT + ': no live transport is authorised (G53 ACTIVE) — inject one only under a current CEO G53 exception'); e.code = C.CODE.G53_ACTIVE_NO_TRANSPORT; throw e; };

/** @returns {{ mode, requests: [{ request_id, target_ids, prompt_sha256 }], external_calls, max_attempts_per_request, target_observations }} */
function planAcquisition(manifest, mode, o) {
  const COL = loadFrozenColourV1(o); const reqs = buildRequests(manifest, mode, COL); const maxAttempts = (o && o.maxAttempts) || 1;
  return { mode, requests: reqs.map((r) => ({ request_id: r.request_id, target_ids: r.target_ids, prompt_sha256: r.prompt_sha256, prompt_chars: r.prompt.length })), external_calls: reqs.length, max_attempts_per_request: maxAttempts, max_external_calls: reqs.length * maxAttempts, target_observations: manifest.targets.length };
}

/**
 * @param {{ manifest, image, mode, transport?, model?, maxAttempts?, extractorRoot? }} p
 * @returns {Promise<packet>}
 */
async function acquireTargetAwareColour(p) {
  const COL = loadFrozenColourV1(p); const transport = typeof p.transport === 'function' ? p.transport : refusingTransport; const maxAttempts = p.maxAttempts || 1;
  if (typeof p.image === 'string' && fs.existsSync(p.image)) { const h = crypto.createHash('sha256').update(fs.readFileSync(p.image)).digest('hex'); if (h !== p.manifest.image.image_sha256) { const e = new Error(C.CODE.IMAGE_SHA256_MISMATCH + ': image bytes ≠ manifest image_sha256'); e.code = C.CODE.IMAGE_SHA256_MISMATCH; throw e; } }
  const requests = buildRequests(p.manifest, p.mode, COL); const results = []; const log = [];
  for (const rq of requests) {
    let attempts = 0, raw = null, terr = null;
    while (attempts < maxAttempts) { attempts++; try { raw = await transport(rq.prompt, p.image, { model: p.model }); terr = null; break; } catch (e) { terr = (e && (e.code || e.message)) || String(e); if (e && e.code === C.CODE.G53_ACTIVE_NO_TRANSPORT) break; } }
    const g = governResponse(raw, rq, COL, terr ? { transportError: terr } : undefined);
    for (const r of g.results) results.push(Object.assign(r, { provenance: { request_id: rq.request_id, prompt_sha256: rq.prompt_sha256, mode: rq.mode, model: p.model || null } }));
    log.push({ request_id: rq.request_id, target_ids: rq.target_ids, prompt_sha256: rq.prompt_sha256, attempts, response_error: g.response_error, unrequested: g.unrequested });
  }
  return assemblePacket(p.manifest, results, { source: C.SOURCE.TARGET_AWARE_ACQUISITION, mode: p.mode, model: p.model || null, requests: log, transport_invocations: log.reduce((n, l) => n + l.attempts, 0) });   /* invocations of the injected transport (the refusing default makes no call) */
}

module.exports = { planAcquisition, acquireTargetAwareColour, refusingTransport };
