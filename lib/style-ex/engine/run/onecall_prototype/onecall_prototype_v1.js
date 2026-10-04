/**
 * STMX — GARMENT + COLOR ONE-CALL PROTOTYPE (non-production).
 * Combines the Frozen-40 Garment Producer prompt + LOCKED Color V1 into a single Vision call
 * producing one shared targets[] with a per-target sibling color_observation.
 *
 * REUSES unchanged: buildPrompt (garment), governTarget (garment governance+validator),
 *   validateColorObservation (locked Color V1). Adds only a minimal cross-reference validator.
 * Color stays a SIBLING of record — NEVER inside record.observations. Frozen-40 count unchanged.
 * Prototype only: the production Two-Call path is untouched.
 */
'use strict';
const { buildPrompt } = require('../../producer_prompt_v1');
// governEnvelope = THE single frozen Multi-Garment envelope authority (role/depth/relationships/
// image status). governTarget remains the per-record authority. Dependency direction is unchanged:
// prototype -> controller. ⛔ Never reimplement either here.
const { governTarget, governEnvelope } = require('../../producer_controller_v1');
const rules = require('../../producer_rules_v1');   // applicability 판독 전용 (operationalClass) — 재구현 0
const { COLOR_PROMPT, validateColorObservation, CARRIER_KINDS } = require('../color_recovery/color_contract_v1');

// Extract the LOCKED Color V1 field definitions (primary_color_family … color_notes) verbatim — single source.
const _cStart = COLOR_PROMPT.indexOf('- primary_color_family:');
const _cEnd = COLOR_PROMPT.indexOf('Return JSON ONLY');
const COLOR_FIELD_RULES = COLOR_PROMPT.slice(_cStart, _cEnd).trim();

// Garment carriers a color may reference (for the cross-reference validator; observation types owned by garment).
const CARRIER_TO_GARMENT_PARAMS = {
  closure: ['closure_type', 'french_cuff'], // front_opening_type folded into closure_type (Closure 3→1, 2026-08-15)
  attachment: ['attachment'],
  graphic: ['graphic'],
  pattern: ['pattern'],
  pocket: ['pocket'],
  material_component: ['material'],
};

function buildCombinedPrompt() {
  return buildPrompt() +
    '\n\n═══════════════════════════════════════════════════════════════\n' +
    'ADDITIONAL COLOR OBSERVATION — Color Extraction V1 (SEPARATE CONTRACT).\n' +
    'For EACH eligible target you output in targets[], ALSO add a field "color_observation" as a SIBLING of "record" ' +
    '(a peer key next to "record" — NEVER inside record or record.observations) describing THAT target garment\'s color. ' +
    'Use these EXACT Color V1 fields (the 6 core fields + additional_colors are required; evidence/color_notes optional):\n' +
    COLOR_FIELD_RULES +
    '\n\nSEPARATION FIREWALL: Garment observations (record.observations) and Color observations (color_observation) are SEPARATE contracts. ' +
    'A color_observation may REFERENCE a garment-owned carrier (closure/attachment/graphic/pattern/pocket/material) by value in additional_colors[].carrier_ref, ' +
    'but must NOT duplicate garment morphology, must NOT be nested inside record.observations, and must NOT emit secondary_color_family or secondary_color_present. ' +
    'The garment record must be produced EXACTLY as specified above — the color task must not change any garment observation.\n' +
    'Per eligible target output shape: { ...all garment target fields exactly as specified..., "color_observation": ' +
    '{ "primary_color_family":"...", "color_lightness":"...", "color_usage":"...", "multi_color":true|false, "color_effect":"...", ' +
    '"additional_colors":[{"color_family":"...","carrier_kind":"...","carrier_ref":"..."}] } }';
}

// SEQUENTIAL ONE-CALL V2 — same single call, same schema, same contracts; only EXECUTION ORDER differs
// (Garment-first → dedicated Color second sweep → omission audit). No new fields; garment attention firewall.
function buildCombinedPromptV2() {
  return buildPrompt() +
    '\n\n═══════════════════════════════════════════════════════════════\n' +
    'WORK IN EXPLICIT STAGES. This is ONE Vision call (no second invocation, no hidden retries), but you MUST reason in this order:\n' +
    'STAGE 1 — Identify the garment target(s) (identity + readability).\n' +
    'STAGE 2 — Complete the GARMENT extraction for EVERY eligible target EXACTLY as specified above (all applicable Frozen-40 observations, states, values, regions, evidence). Finish the garment pass FULLY before producing any color output.\n' +
    'STAGE 3 — DEDICATED COLOR SECOND SWEEP. Now RE-INSPECT the same image and EACH eligible target specifically for color. Deliberately look, one carrier type at a time, at: the primary/base color; every additional DESIGNED color; low-contrast buttons/closures (even close in tone to the body); zipper / zipper tape; metal/belt hardware; logo/graphic/text; pattern colors; pocket colors; distinct material/component region colors; and piping/collar/cuff/waistband/panel/strap where present. Emit a sibling color_observation per eligible target using these EXACT Color V1 fields:\n' +
    COLOR_FIELD_RULES +
    '\nSTAGE 4 — COLOR OMISSION AUDIT (perform silently BEFORE emitting): (a) Did I miss any intentional designed color? (b) Did I mistake a surface finish / reflection / shadow / fold / photographic / washed-faded / same-family-tonal variation for a color? — if so, SUPPRESS it (do not emit). (c) Did I miss a small BUT intentional component color (button/zipper/hardware/piping)? (d) On a visually complex garment, did I inspect closures, attachments, graphics, patterns, and material components SEPARATELY rather than at a glance? Correct omissions and false detections now. Stay MINIMUM-SUFFICIENT — do NOT add percentages, coordinates, extent, verbose prose, or enumerate every tiny internal logo color.\n' +
    'STAGE 5 — Emit the final combined payload.\n' +
    'GARMENT ATTENTION FIREWALL: the Color second sweep must NOT revise or reinterpret any garment observation completed in STAGE 2 unless there is an outright structural contradiction. Garment observations (record.observations) and Color observations (color_observation) are SEPARATE sibling contracts. color_observation is a sibling of record — NEVER inside record or record.observations. Do NOT emit secondary_color_family or secondary_color_present. Do NOT duplicate garment morphology inside color.\n' +
    'Per eligible target output shape: { ...all garment target fields exactly as specified..., "color_observation": ' +
    '{ "primary_color_family":"...", "color_lightness":"...", "color_usage":"...", "multi_color":true|false, "color_effect":"...", ' +
    '"additional_colors":[{"color_family":"...","carrier_kind":"...","carrier_ref":"..."}] } }';
}

// Minimal cross-reference validator (warn/diagnostic only — never repairs).
function crossRefValidate(governedRecord, colorObs, rawTargetObservations) {
  const warnings = [], errors = [];
  // (4) color must NOT be embedded inside record.observations
  if (governedRecord && governedRecord.observations && 'color_observation' in governedRecord.observations) {
    errors.push('color_observation nested inside record.observations (must be a sibling of record)');
  }
  if (colorObs == null) { warnings.push('no color_observation attached to eligible target'); return { warnings, errors }; }
  // (3) obsolete color fields → handled by validateColorObservation; here just note if present
  ['secondary_color_family', 'secondary_color_present'].forEach(k => { if (k in colorObs) errors.push('obsolete color field emitted: ' + k); });
  // (2) carrier references plausible against the garment record (warn only)
  const ac = Array.isArray(colorObs.additional_colors) ? colorObs.additional_colors : [];
  const obs = rawTargetObservations || (governedRecord && governedRecord.observations) || {};
  const govCat = governedRecord && governedRecord.category && governedRecord.category.value;
  ac.forEach((a, i) => {
    if (!a || a.carrier_kind === 'generic_descriptor') return; // generic descriptor has no garment owner (by design)
    if (!CARRIER_KINDS.includes(a.carrier_kind)) return; // structural error already caught by Color validator
    const params = CARRIER_TO_GARMENT_PARAMS[a.carrier_kind] || [];
    // ★ APPLICABILITY-AWARE CORROBORATION (CEO review correction 2026-08-30): a carrier whose owner
    //   observation(s) are ALL category-inapplicable (operational class N) cannot, by design, be
    //   corroborated by the garment record — e.g. a visible waist button on a bottom garment, whose
    //   closure_type is canonically never observed there. That is NOT an inconsistency: skip the warning
    //   exactly as for generic_descriptor. The warning remains for categories where an owner observation
    //   IS applicable and simply was not reported.
    const anyApplicable = !govCat || params.some(p => {
      try { return rules.operationalClass(p, govCat) !== 'N'; } catch (e) { return true; }
    });
    if (!anyApplicable) return;
    const present = params.some(p => obs[p] != null || (governedRecord && governedRecord.observations && governedRecord.observations[p] != null));
    if (!present) warnings.push('additional_colors[' + i + '] carrier ' + a.carrier_kind + '/' + a.carrier_ref + ' not corroborated by garment record (' + params.join('|') + ')');
  });
  return { warnings, errors };
}

/**
 * Govern a combined one-call package into an envelope with per-target garment record + sibling color_observation.
 * Mirrors runProducer's target loop but on a PROVIDED pkg (no fresh vision call), reusing governTarget unchanged.
 */
/**
 * ★★ MULTI-GARMENT PRODUCTION ROUTING CONFORMANCE REPAIR (2026-08-23).
 *
 * BEFORE: this function built the envelope ITSELF and derived
 *     role = (cand.prominence === 'dominant') ? 'Primary' : 'Secondary-Eligible'
 * emitting no extraction_depth, no relationships and no image_validation_status. Because the
 * authoritative entrypoint (runFinalExtraction -> runVisionExtraction) routes through here, that
 * PARALLEL rule — not the frozen controller authority — became the final governed role in
 * production. MG-G3 states role is MORPHOLOGY ACCESSIBILITY and prominence is scene metadata only,
 * so the legacy derivation was superseded and could not be correct.
 *
 * AFTER: envelope governance is DELEGATED to the single frozen authority
 * `producer_controller_v1.governEnvelope`, and this function only DECORATES each governed target
 * with the Colour V1 sibling payload + cross-reference. Colour behaviour is unchanged.
 *
 * ⛔ Do NOT re-derive role / extraction_depth / relationships / image_validation_status here.
 * ⛔ `Secondary-Eligible` must never be produced as a governed final role again.
 * ⛔ Prominence is NOT consulted; the frozen authority preserves it as scene metadata only.
 */
function governCombinedPackage(pkg, opts) {
  const options = opts || {};
  const candidates = Array.isArray(pkg && pkg.targets) ? pkg.targets : null;
  if (!candidates) return { ok: false, error: { code: 'MISSING_TARGETS_ENVELOPE' }, envelope: null };

  // ── SINGLE AUTHORITY: role · extraction_depth · relationships · image_validation_status ──
  const gov = governEnvelope(pkg, { imageId: options.imageId, model: options.model, visionCalls: options.visionCalls });
  if (!gov || !gov.ok || !gov.envelope) return { ok: false, error: { code: 'MISSING_TARGETS_ENVELOPE' }, envelope: null };
  const envelope = gov.envelope;
  // presentation-only marker; governance semantics come entirely from the frozen authority above
  envelope.producer.mode = 'ONE_CALL_PRODUCTION';

  // ── DECORATE ONLY: Colour V1 sibling payload per eligible governed target ──
  envelope.targets.forEach((t, i) => {
    if (!t.eligible) return;
    const cand = candidates[i] || {};
    const colorObs = cand.color_observation != null ? cand.color_observation : null;
    t.color_observation = colorObs;              // SIBLING payload — never inside record.observations
    t.color_validation = colorObs != null ? validateColorObservation(colorObs)
      : { contract_errors: ['COLOR_MISSING'], inconsistencies: [], warnings: [] };
    t.cross_reference = crossRefValidate(t.record, colorObs, cand.observations); // warn/diagnostic only
  });

  // Failure isolation: garment envelope validity governs the whole call; colour fails PER TARGET.
  const garmentValid = envelope.targets.every(t => !t.eligible || (t.validation && t.validation.ok !== false));
  return { ok: true, envelope, garment_contract_valid: garmentValid };
}

module.exports = { buildCombinedPrompt, buildCombinedPromptV2, governCombinedPackage, crossRefValidate, COLOR_FIELD_RULES };
