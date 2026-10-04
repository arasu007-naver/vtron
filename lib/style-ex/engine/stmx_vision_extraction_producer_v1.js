/**
 * STMX VISION EXTRACTION PRODUCER — V1 (PRODUCTION)
 * =============================================================================
 * The general STMX component used whenever STMX extracts visual observations
 * from a garment image. NOT corpus-specific; the Reference Corpus is one consumer.
 *
 * ARCHITECTURE (Sequential One-Call V2 — previously validated, reused unchanged):
 *   Target Selection
 *     → for each eligible garment target:
 *          Garment Observation  = Frozen Producer-36 sub-contract (36 params)
 *          Color Observation    = Locked Color Extraction V1 (sibling of record)
 *     → one governed Vision Extraction output
 *
 * CONTRACT FIREWALL
 *  - Producer-36 remains the FROZEN GARMENT OBSERVATION SUB-CONTRACT. This module
 *    adds NO 37th garment parameter, changes no vocabulary, applicability, region
 *    rule or validator semantics. Garment governance is `governTarget` unchanged.
 *  - Color V1 remains LOCKED. Fields: primary_color_family, color_lightness,
 *    color_usage, multi_color, color_effect, additional_colors[]. `secondary_*`
 *    is obsolete and rejected by the Color validator (unchanged).
 *  - Color is a SIBLING of `record` — never inside record/record.observations.
 *    Color did NOT become one of the 36 parameters.
 *  - Garment and Color are INDEPENDENTLY validated. A Color failure never mutates
 *    or invalidates a valid Garment Observation, and vice-versa. No validator repairs
 *    Vision output; diagnostics are returned explicitly.
 *  - Color is PER TARGET. No image-global color payload is copied across targets.
 *
 * REUSE (no re-derivation): buildCombinedPromptV2 / governCombinedPackage /
 * crossRefValidate come from the validated Sequential One-Call V2 implementation;
 * the Color validator and tolerant JSON parser come from Color V1.
 *
 * Observation ≠ Consumption (G40): this module observes only. It performs no
 * TC/SR/DM/EI scoring and produces no Ground Truth.
 */
'use strict';

const rules = require('./producer_rules_v1');
const { buildCombinedPromptV2, governCombinedPackage, crossRefValidate } =
  require('./run/onecall_prototype/onecall_prototype_v1');
const { parseJson, validateColorObservation, OBSOLETE_FIELDS } =
  require('./run/color_recovery/color_contract_v1');

const PRODUCER_NAME = 'STMX Vision Extraction Producer';
const PRODUCER_VERSION = 'v1';
const ARCHITECTURE = 'SEQUENTIAL_ONE_CALL_V2';
// DERIVED from the registry (was the literal 'Producer-36 (frozen)'). The sub-contract NAME tracks
// the parameter count, so hard-coding it guarantees the label drifts at every governed expansion.
// 35 → 36 (sleeve_volume, 2026-08-16) → 37 (collar_scale, CEO Q1 2026-08-23).
const GARMENT_SUBCONTRACT = 'Producer-' + rules.ALL_PARAMS.length + ' (frozen)';
const COLOR_SUBCONTRACT = 'Color Extraction V1 (locked)';

const TECH = {
  NO_VISION_FN: 'NO_VISION_FN',
  TIMEOUT: 'VISION_TIMEOUT',
  CALL_FAILED: 'VISION_CALL_FAILED',
  UNPARSEABLE: 'UNPARSEABLE_RESPONSE',
  MISSING_ENVELOPE: 'MISSING_TARGETS_ENVELOPE',
};

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { const e = new Error('vision timeout'); e.__timeout = true; reject(e); }, ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

/** The exact prompt this producer issues (garment prompt + V2 staging + Color V1 rules). */
function buildVisionExtractionPrompt() { return buildCombinedPromptV2(); }

/**
 * runVisionExtraction — ONE semantic Vision call per image (technical-only retry).
 * Retry is permitted ONLY for technical failure (network/timeout/malformed/missing
 * envelope) — never for UNKNOWN, visual ambiguity, or a suspect value. No voting.
 *
 * @param {*} image                  opaque image ref passed to visionFn (path or {data,media_type})
 * @param {object} opts { visionFn, imageId?, model?, timeoutMs?=120000, maxTechnicalRetries?=1 }
 * @returns {Promise<{ok:boolean, envelope?, garment_contract_valid?, color_contract_valid?, error?, raw?}>}
 */
async function runVisionExtraction(image, opts) {
  const o = opts || {};
  const visionFn = o.visionFn;
  const timeoutMs = o.timeoutMs || 120000;
  const maxRetries = (o.maxTechnicalRetries == null) ? 1 : o.maxTechnicalRetries;
  if (typeof visionFn !== 'function') {
    return { ok: false, error: { stage: 'model_call', code: TECH.NO_VISION_FN, detail: 'opts.visionFn is required (caller-side model injection)' } };
  }
  const prompt = buildVisionExtractionPrompt();

  let attempts = 0, lastRaw = null, lastErr = null;
  while (attempts <= maxRetries) {
    attempts++;
    try {
      const raw = await withTimeout(visionFn(prompt, image, { model: o.model }), timeoutMs);
      lastRaw = raw;
      const pkg = (raw && typeof raw === 'object') ? raw : parseJson(raw);
      if (!pkg || typeof pkg !== 'object') { lastErr = { code: TECH.UNPARSEABLE }; continue; }
      if (!Array.isArray(pkg.targets)) { lastErr = { code: TECH.MISSING_ENVELOPE }; continue; }

      // Governance: garment (Producer-36) + color (Color V1), independently validated, per target.
      const gov = governCombinedPackage(pkg, { imageId: o.imageId, model: o.model });
      if (!gov.ok) { lastErr = { code: (gov.error && gov.error.code) || TECH.MISSING_ENVELOPE }; continue; }

      const env = gov.envelope;
      // Production identity (presentation only — governance semantics untouched).
      env.producer = {
        name: PRODUCER_NAME,
        version: PRODUCER_VERSION,
        architecture: ARCHITECTURE,
        garment_subcontract: GARMENT_SUBCONTRACT,
        garment_parameter_count: rules.ALL_PARAMS.length,
        color_subcontract: COLOR_SUBCONTRACT,
        vision_calls: attempts,
        one_call_default: true,
        model: o.model || 'configurable',
      };
      const elig = (env.targets || []).filter(t => t.eligible);
      const colorValid = elig.every(t => t.color_validation && (t.color_validation.contract_errors || []).length === 0);
      return {
        ok: true,
        envelope: env,
        garment_contract_valid: gov.garment_contract_valid,   // independent
        color_contract_valid: colorValid,                     // independent
        raw: lastRaw,
      };
    } catch (e) {
      lastErr = { code: e && e.__timeout ? TECH.TIMEOUT : TECH.CALL_FAILED, detail: String((e && e.message) || e) };
    }
  }
  return { ok: false, error: { stage: 'model_call', code: (lastErr && lastErr.code) || TECH.CALL_FAILED, detail: lastErr && lastErr.detail, attempts }, raw: lastRaw };
}

module.exports = {
  runVisionExtraction,
  buildVisionExtractionPrompt,
  // re-exported for consumers/tests — all unchanged upstream contracts
  governCombinedPackage,
  crossRefValidate,
  validateColorObservation,
  OBSOLETE_FIELDS,
  rules,
  META: {
    name: PRODUCER_NAME,
    version: PRODUCER_VERSION,
    architecture: ARCHITECTURE,
    garment_subcontract: GARMENT_SUBCONTRACT,
    color_subcontract: COLOR_SUBCONTRACT,
  },
};
