'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — FROZEN COLOUR V1 PIN (non-scoring) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … §5). Reason: every target-aware observation must be validated by the ACTUAL locked Colour V1
 * validator and carry its exact field rules; the module may be loaded only while it equals its pinned identity (the same file the frozen EI V2 binds as
 * FROZEN_COLOUR_V1_CONTRACT). Affected Scope: this file (new).
 * ⛔ Read-only: never edits, patches or re-exports a modified copy of the frozen module. Any drift → ColourPinError (fail closed).
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const FROZEN_COLOUR_V1 = Object.freeze({
  relative_path: 'run/color_recovery/color_contract_v1.js',   /* relative to 01_ENGINES/ITEM_VISION_EXTRACTOR */
  sha256: 'ccda8495fcf202daa2e3673709d73f6cc71bdfc221b6f2a1f1ea460fbc60ab52',
  colour_prompt_sha256: 'f444d2611e9ae9e693c15ee4f405ce56d445cf430891f719a292340abd44a420',
  exports: Object.freeze(['FAMILIES', 'LIGHTNESS', 'USAGE', 'EFFECT', 'CARRIER_KINDS', 'CONTRAST_WITH_BODY', 'OBSOLETE_FIELDS', 'COLOR_PROMPT', 'parseJson', 'validateColorObservation']),
});
const EXTRACTOR_ROOT = path.resolve(__dirname, '..', '..');
class ColourPinError extends Error { constructor(code, message) { super(code + ': ' + message + ' ⛔ FAIL CLOSED.'); this.name = 'ColourPinError'; this.code = code; } }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** @param {{ extractorRoot? }} [o] (negative controls pass a copy) @returns the frozen Colour V1 module */
function loadFrozenColourV1(o) {
  const p = path.join((o && o.extractorRoot) || EXTRACTOR_ROOT, FROZEN_COLOUR_V1.relative_path);
  if (!fs.existsSync(p)) throw new ColourPinError('FROZEN_COLOUR_V1_MISSING', FROZEN_COLOUR_V1.relative_path + ' not found');
  if (sha(fs.readFileSync(p)) !== FROZEN_COLOUR_V1.sha256) throw new ColourPinError('FROZEN_COLOUR_V1_DRIFT', FROZEN_COLOUR_V1.relative_path + ' ≠ pinned sha256');
  const m = require(p);
  const missing = FROZEN_COLOUR_V1.exports.filter((k) => !(k in m)); if (missing.length) throw new ColourPinError('FROZEN_COLOUR_V1_EXPORT_MISSING', missing.join(', '));
  if (sha(m.COLOR_PROMPT) !== FROZEN_COLOUR_V1.colour_prompt_sha256) throw new ColourPinError('FROZEN_COLOUR_PROMPT_DRIFT', 'COLOR_PROMPT ≠ pinned sha256');
  return m;
}

module.exports = { FROZEN_COLOUR_V1, EXTRACTOR_ROOT, ColourPinError, loadFrozenColourV1 };
