'use strict';
/*
 * STMX COLOUR V1 — TARGET-AWARE ACQUISITION SUCCESSOR V1 — TARGET-AWARE REQUEST BUILDER (non-scoring · builds text only, calls nothing) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… TARGET-AWARE COLOUR … §5 · §6). Affected Scope: this file (new).
 *
 * The request = [successor SCOPE block naming the requested targets] + [the frozen Colour V1 COLOR_PROMPT body, byte-for-byte] + [successor output wrapper that
 * repeats the frozen per-object Colour V1 JSON template once per requested target_id].
 * Only two pieces of the frozen prompt are NOT carried: its first sentence (the "single most prominent garment" scope — the limitation being replaced) and its
 * single-object return line (replaced by one object per target). Every field rule, enum, suppression / carrier / contrast rule is the frozen text, unchanged —
 * the same technique as the historical one-call prototype (COLOR_FIELD_RULES = verbatim slice of COLOR_PROMPT), without importing that producer.
 * ⛔ No colour meaning is restated or altered. ⛔ The V1.3 descriptor is given as IDENTIFICATION text only — colour must be read from the pixels.
 */
const crypto = require('crypto');
const C = require('./tac_contracts');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const FROZEN_SCOPE_SENTENCE = 'You are extracting ONLY the COLOR observations of the single most prominent garment in this image.';
const FROZEN_RETURN_MARK = 'Return JSON ONLY, exactly:\n';

/** split the frozen COLOR_PROMPT into the carried body and the per-object template; throws if the frozen text is not shaped as pinned */
function frozenParts(COL) {
  const P = COL.COLOR_PROMPT; const nl = P.indexOf('\n'); const r = P.indexOf(FROZEN_RETURN_MARK);
  if (P.slice(0, nl) !== FROZEN_SCOPE_SENTENCE || r < 0 || P.indexOf(FROZEN_RETURN_MARK, r + 1) >= 0) throw new Error('TAC: frozen COLOR_PROMPT is not shaped as pinned (scope sentence / single return mark)');
  const body = P.slice(nl + 1, r), template = P.slice(r + FROZEN_RETURN_MARK.length);
  if (!/^\{"primary_color_family"/.test(template) || (FROZEN_SCOPE_SENTENCE + '\n' + body + FROZEN_RETURN_MARK + template) !== P) throw new Error('TAC: frozen COLOR_PROMPT split is not lossless');
  return { body, template };
}

function scopeBlock(targets, unitType) {
  /* the V1.3 descriptor is sent ONLY when the category alone cannot name the garment (identification DESCRIPTOR) — it may contain colour words (manifest
     descriptor_colour_terms), so it is never sent when the category already identifies the target */
  const lines = targets.map((t) => '- target_id "' + t.target_id + '" · garment category: ' + t.category + (t.identification === C.IDENTIFICATION.DESCRIPTOR ? ' · identification: ' + JSON.stringify(t.descriptor) : ''));
  return 'You are extracting ONLY the COLOR observations of the specific garment target' + (targets.length > 1 ? 's' : '') + ' listed below in this image — NOT simply the most prominent garment.\n' +
    'Each listed target is a garment already identified in this same image by the garment observation step; it is named by its target_id, its garment category and, where needed, a short identification text. ' +
    'The identification text only tells you WHICH garment is meant — it is not colour evidence: read every colour from the visible garment itself.\n' +
    lines.join('\n') + '\n' +
    'Observe each listed target INDEPENDENTLY. Its colour facts come only from that garment\'s own visible cloth and its own designed components. Never transfer a colour from any other garment ' +
    '(an outer layer worn over it, an inner layer such as a shirt or T-shirt worn under it, an adjacent garment, accessories, skin or background) to a listed target. Do not report garments that are not listed.' +
    (unitType === C.UNIT.SUIT ? '\nThe two listed targets are the two members of one product. Do NOT assume they share a colour: report what each member visibly shows, even if they look alike or differ.' : '') +
    '\nIf a listed target is not visible enough to read its colour, report it as not visible instead of guessing.\n' +
    'For EACH listed target apply the colour rules below exactly as written (they describe ONE garment — apply them to each listed target separately):\n';
}

function wrapper(requestId, ids, template) {
  return 'Return JSON ONLY, exactly one object:\n{"request_id":"' + requestId + '","targets":[{"target_id":"<a listed target_id>","colour_visible":true,"color_observation":' + template + '}]}\n' +
    'The "targets" array holds exactly one entry for EACH listed target_id (' + ids.map((i) => '"' + i + '"').join(', ') + '), each target_id once, no other target. ' +
    'Each color_observation has exactly the single-garment shape shown, for that target only. For a listed target whose colour cannot be read, emit {"target_id":"<id>","colour_visible":false,"color_observation":null}. ' +
    'Echo request_id unchanged.';
}

/**
 * @param {object} manifest a tac_manifest manifest  @param {'ONE_CALL'|'PER_TARGET'} mode  @param {object} COL the pinned frozen Colour V1 module
 * @returns {Array<{ request_id, mode, target_ids, prompt, prompt_sha256 }>}
 */
function buildRequests(manifest, mode, COL) {
  if (!Object.values(C.MODE).includes(mode)) throw new Error('TAC: mode must be ONE_CALL or PER_TARGET');
  const { body, template } = frozenParts(COL);
  const groups = mode === C.MODE.ONE_CALL ? [manifest.targets] : manifest.targets.map((t) => [t]);   /* manifest target ids are unique → PER_TARGET is already de-duplicated */
  return groups.map((g) => { const ids = g.map((t) => t.target_id); const request_id = 'tac-' + sha(manifest.manifest_sha256 + '|' + mode + '|' + ids.join(',')).slice(0, 20);
    const prompt = scopeBlock(g, manifest.scoring_unit.type) + body + wrapper(request_id, ids, template);
    return { request_id, mode, target_ids: ids, prompt, prompt_sha256: sha(prompt) }; });
}

module.exports = { buildRequests, frozenParts, FROZEN_SCOPE_SENTENCE };
