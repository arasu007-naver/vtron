'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — FOUR-AXIS RESULT COMPOSER (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… INTEGRATED RUNTIME V2 IMPLEMENTATION §9). Affected Scope: this file (new).
 *
 * May: collect · validate shape · preserve each axis's exact Direction token and its own Korean Reason (null = withheld by that axis) · keep internal provenance.
 * ⛔ Never re-scores, invents a Direction, rewrites / replaces a Reason, combines axes, computes a code / Style ID / number / Strength, or hides a failed axis:
 *    an axis without a Direction is null in customer_output AND named in incomplete_axes, and the result is INCOMPLETE.
 */
const C = require('./item_v2_contracts');

function composeResult(p) {
  const base = { contract: C.RESULT_CONTRACT_ID, runtime: { id: C.RUNTIME_ID, status: C.RUNTIME_STATUS } };
  if (p.inputIssue) {
    return Object.assign(base, { result_status: C.RESULT_STATUS.INVALID_PRODUCT_INPUT, input_issue: { code: p.inputIssue.issue, detail: p.inputIssue.detail }, customer_output: null, incomplete_axes: C.AXES.map((a) => ({ axis: a, outcome: C.AXIS_OUTCOME.NOT_EXECUTED, code: p.inputIssue.issue })),
      internal: { selection_trace: p.inputIssue.trace || null, evidence_coverage: null, axis_diagnostics: null, provenance: { image_reference: p.imageReference || null } } });
  }
  const customer = {}; const incomplete = []; const diag = {}; const prov = {};
  for (const axis of C.AXES) {
    const r = p.axisResults[axis];
    prov[axis] = r.provenance || null; diag[axis] = { outcome: r.outcome, code: r.code || null, diagnostics: r.diagnostics || null };
    if (r.outcome === C.AXIS_OUTCOME.DIRECTION) {
      const c = r.customer || {};
      if (!C.CUSTOMER_TOKENS[axis].includes(c.direction)) { incomplete.push({ axis, outcome: C.AXIS_OUTCOME.EXECUTION_FAILURE, code: 'AXIS_OUTPUT_TOKEN_OUT_OF_CONTRACT' }); customer[axis] = { direction: null, reason: null }; continue; }
      if (c.reason !== null && typeof c.reason !== 'string') { incomplete.push({ axis, outcome: C.AXIS_OUTCOME.EXECUTION_FAILURE, code: 'AXIS_REASON_SHAPE_OUT_OF_CONTRACT' }); customer[axis] = { direction: null, reason: null }; continue; }
      customer[axis] = { direction: c.direction, reason: c.reason };
    } else { customer[axis] = { direction: null, reason: null }; incomplete.push({ axis, outcome: r.outcome, code: r.code || null }); }
  }
  return Object.assign(base, { result_status: incomplete.length ? C.RESULT_STATUS.INCOMPLETE : C.RESULT_STATUS.COMPLETE, customer_output: customer, incomplete_axes: incomplete,
    internal: { selection_trace: p.selectionTrace, evidence_coverage: p.coverage, axis_diagnostics: diag, provenance: { image_reference: p.imageReference || null, image_id: p.imageId || null, axes: prov } } });
}

module.exports = { composeResult };
