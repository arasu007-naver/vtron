'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — INPUT VALIDATION (structure only, non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… INTEGRATED RUNTIME V2 IMPLEMENTATION §5). Affected Scope: this file (new).
 *
 * Distinguishes: target not provided · target explicitly provided · Suit explicitly provided · non-suit explicitly provided · product type unspecified ·
 * structurally invalid input. Missing Vision OBSERVATIONS are never an input error here (the frozen axes own their missing-evidence contracts).
 * ⛔ Absence of product selection is NOT an error: it routes to the automatic Primary fallback. ⛔ Absence of Suit metadata never creates a Suit.
 */
const C = require('./item_v2_contracts');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const MERCH_TYPES = ['ITEM', 'SUIT'];

function checkSpec(spec, who) {
  if (spec === undefined || spec === null) return null;
  if (!isPlain(spec)) return who + ' must be an object';
  const allowed = ['product_identity', 'category']; const extra = Object.keys(spec).filter((k) => !allowed.includes(k)); if (extra.length) return who + ' carries unknown field(s): ' + extra.join(', ');
  if (spec.category !== undefined && (typeof spec.category !== 'string' || !spec.category.trim())) return who + '.category must be a non-empty string';
  const pi = spec.product_identity; if (pi === undefined) return null;
  if (!isPlain(pi)) return who + '.product_identity must be an object';
  if (!MERCH_TYPES.includes(pi.merchandise_type)) return who + '.product_identity.merchandise_type must be ITEM or SUIT';
  if (pi.primary_target_id !== undefined && (typeof pi.primary_target_id !== 'string' || !pi.primary_target_id.trim())) return who + '.product_identity.primary_target_id must be a non-empty string';
  if (pi.merchandise_type === 'SUIT' && pi.primary_target_id !== undefined) return who + ': a SUIT names suit_component_target_ids, not a primary_target_id';
  if (pi.suit_component_target_ids !== undefined) {
    if (pi.merchandise_type !== 'SUIT') return who + ': suit_component_target_ids only with merchandise_type SUIT';
    const ids = pi.suit_component_target_ids; if (!Array.isArray(ids) || ids.length !== 2 || !ids.every((i) => typeof i === 'string' && i.trim()) || ids[0] === ids[1]) return who + '.product_identity.suit_component_target_ids must be two distinct target ids';
  }
  return null;
}

/** @returns {{ ok:true, input } | { ok:false, issue, detail }} */
function validateInput(input) {
  if (!isPlain(input)) return { ok: false, issue: C.INPUT_ISSUE.MALFORMED_REQUEST, detail: 'input must be an object' };
  const known = Object.keys(C.INPUT_FIELDS); const extra = Object.keys(input).filter((k) => !known.includes(k));
  if (extra.length) return { ok: false, issue: C.INPUT_ISSUE.MALFORMED_REQUEST, detail: 'unknown input field(s): ' + extra.join(', ') };
  if (input.image_reference !== undefined && typeof input.image_reference !== 'string') return { ok: false, issue: C.INPUT_ISSUE.MALFORMED_REQUEST, detail: 'image_reference must be a string' };
  for (const [k, who] of [['user_selection', 'user_selection'], ['merchandise_metadata', 'merchandise_metadata']]) { const e = checkSpec(input[k], who); if (e) return { ok: false, issue: C.INPUT_ISSUE.MALFORMED_REQUEST, detail: e }; }
  const env = input.vision_envelope;
  if (!isPlain(env) || !Array.isArray(env.targets)) return { ok: false, issue: C.INPUT_ISSUE.NO_VISION_ENVELOPE, detail: 'vision_envelope with targets[] is required' };
  const ids = env.targets.map((t) => (isPlain(t) ? t.target_id : undefined));
  if (ids.some((i) => typeof i !== 'string' || !i.trim()) || new Set(ids).size !== ids.length) return { ok: false, issue: C.INPUT_ISSUE.MALFORMED_REQUEST, detail: 'vision_envelope.targets[] need unique non-empty target_id' };
  const col = input.colour_observations;
  if (col !== undefined) {
    if (!isPlain(col)) return { ok: false, issue: C.INPUT_ISSUE.MALFORMED_REQUEST, detail: 'colour_observations must be an object keyed by target_id' };
    const stray = Object.keys(col).filter((k) => !ids.includes(k)); if (stray.length) return { ok: false, issue: C.INPUT_ISSUE.COLOUR_TARGET_NOT_IN_ENVELOPE, detail: 'colour for target(s) not in this envelope: ' + stray.join(', ') };
    const bad = Object.keys(col).filter((k) => !isPlain(col[k])); if (bad.length) return { ok: false, issue: C.INPUT_ISSUE.MALFORMED_REQUEST, detail: 'colour_observations[' + bad.join(', ') + '] must be objects' };
  }
  return { ok: true, input };
}

module.exports = { validateInput };
