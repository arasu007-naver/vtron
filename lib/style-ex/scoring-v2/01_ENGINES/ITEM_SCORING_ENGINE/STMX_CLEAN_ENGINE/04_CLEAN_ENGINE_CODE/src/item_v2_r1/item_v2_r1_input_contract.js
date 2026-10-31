'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R1 INPUT VALIDATION (structure only, non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… PRIMARY ITEM AUTO-SELECTION CORRECTION … §5.1 "available product title and category metadata"). Affected Scope: this file (new).
 *
 * = the predecessor validateInput (unchanged, called on a copy without product_title) + validation of merchandise_metadata.product_title.
 * ⛔ product_title is accepted on merchandise_metadata only (upstream merchandise record); user_selection keeps the predecessor contract.
 */
const { validateInput: validatePredecessor } = require('../item_v2/item_v2_input_contract');
const P = require('../item_v2/item_v2_contracts');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const TITLE_MAX = 500;

/** @returns {{ ok:true, input, productTitle: string|null } | { ok:false, issue, detail }} */
function validateInputR1(input) {
  let productTitle = null; let base = input;
  if (isPlain(input) && isPlain(input.merchandise_metadata) && Object.prototype.hasOwnProperty.call(input.merchandise_metadata, 'product_title')) {
    const t = input.merchandise_metadata.product_title;
    if (typeof t !== 'string' || !t.trim() || t.length > TITLE_MAX) return { ok: false, issue: P.INPUT_ISSUE.MALFORMED_REQUEST, detail: 'merchandise_metadata.product_title must be a non-empty string of at most ' + TITLE_MAX + ' characters' };
    productTitle = t;
    const mm = Object.assign({}, input.merchandise_metadata); delete mm.product_title;
    base = Object.assign({}, input, { merchandise_metadata: mm });
    if (!Object.keys(mm).length) delete base.merchandise_metadata;   // a title-only merchandise record is valid
  }
  const v = validatePredecessor(base);
  return v.ok ? { ok: true, input: base, productTitle } : v;
}

module.exports = { validateInputR1, TITLE_MAX };
