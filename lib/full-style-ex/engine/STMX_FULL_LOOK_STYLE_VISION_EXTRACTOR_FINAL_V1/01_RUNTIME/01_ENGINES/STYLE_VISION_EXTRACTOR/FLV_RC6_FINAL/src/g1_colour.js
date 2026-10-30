'use strict';
/**
 * G-1 Full-Look colour composition (Style Vision-owned Global evidence; DE-2).
 * Input: raw colour AREAS from the provider. Output: field colours + separated point colours with carrier and contrast.
 *   · Colour V1 domains only; no extent / area / percentage; no judgement token (E / I / expressive / accent …).
 *   · IX-7 dedup: one designed colour phenomenon on one component = one event, however often it repeats.
 *   · Colour V1 suppression (thread / stitching, lighting, same-family tonal variation) is honoured: a suppressed area is
 *     listed under `suppressed` with its rule and never becomes a field or point.
 * V1.1 (decision B; order §5–§7, §25, §47):
 *   · ANY registered participant may be a carrier (garment or non-garment) — `carrier` is always the Style component_ref;
 *   · optional Style-local `carrier_part { carrier_kind, carrier_ref }` on a POINT when the colour sits on a visibly distinct
 *     sub-part (hardware, strap, panel …) and losing that would make the observation ambiguous. The two sub-fields reuse the
 *     Colour V1 `additional_colors` provenance tokens verbatim; they are NOT the G-1 component carrier and never alias it;
 *   · colour completeness: every visible participant has a colour opportunity — a field / point entry, or an `unreadable`
 *     entry (NOT_VISIBLE / UNKNOWN). A participant with no colour record at all fails closed.
 */
const C = require('./contracts');
const R = require('./registry');

const ROLES = ['field', 'point'];

function readPart(a, registry) {
  const p = a.part;
  if (p === undefined || p === null) return null;
  if (a.role !== 'point') throw new Error('G1_PART_ON_FIELD (a field colour has no part): ' + a.carrier);
  if (typeof p !== 'object' || Object.keys(p).some((k) => !['carrier_kind', 'carrier_ref'].includes(k))) throw new Error('G1_PART_SHAPE (carrier_kind + carrier_ref only)');
  if (!C.CARRIER_KINDS.includes(p.carrier_kind)) throw new Error('G1_PART_KIND_OUTSIDE_COLOUR_V1: ' + p.carrier_kind);
  if (typeof p.carrier_ref !== 'string' || !p.carrier_ref.length) throw new Error('G1_PART_REF_MISSING');
  if (R.has(registry, p.carrier_ref)) throw new Error('G1_PART_REF_IS_A_COMPONENT (Colour V1 carrier_ref ≠ Style component_ref): ' + p.carrier_ref);
  return { carrier_kind: p.carrier_kind, carrier_ref: p.carrier_ref };
}

/**
 * V1.3 partial colour (isolated candidate; contracts.CANDIDATE_CARRIERS.partial_colour): a colour area whose family is read but whose
 * lightness / effect (or, for a point, contrast) is missing or UNKNOWN is NOT completed with a guessed value and NOT discarded. It is
 * carried in `partial[]` with the resolved sub-fields and the list of unresolved ones. It counts as the carrier's colour opportunity.
 */
function partialOf(a) {
  const unresolved = [];
  const lightnessMissing = a.lightness === undefined || a.lightness === null || a.lightness === 'UNKNOWN';
  const effectMissing = a.effect === undefined || a.effect === null || a.effect === 'UNKNOWN';
  const contrastMissing = a.role === 'point' && (a.contrast === undefined || a.contrast === null || a.contrast === 'UNKNOWN');
  if (lightnessMissing) unresolved.push('color_lightness');
  if (effectMissing) unresolved.push('color_effect');
  if (contrastMissing) unresolved.push('contrast_with_field');
  return unresolved;
}

function buildColourComposition(areas, registry, frame) {
  const out = { state: 'OBSERVED', field: [], points: [], suppressed: [], unreadable: [], partial: [] };
  if (frame && frame.state && frame.state !== 'OBSERVED') { out.state = frame.state; if (frame.limits && frame.limits.length) out.limitation_frame = frame.limits.slice(); }
  const fieldKey = new Map(); const pointKey = new Set(); const covered = new Set();
  for (const a of areas || []) {
    for (const k of Object.keys(a)) if (/extent|percent|area|size|ratio|coverage/i.test(k)) throw new Error('G1_REJECTED_FIELD (Colour V1 rejects extent / placement / percentage): ' + k);
    const carrierKnown = a.carrier !== 'UNKNOWN';
    if (carrierKnown && !R.has(registry, a.carrier)) throw new Error('G1_CARRIER_NOT_PARTICIPANT: ' + a.carrier);   // participation boundary
    if (a.state !== undefined && a.state !== 'OBSERVED') {                             // colour opportunity taken, colour not readable
      if (!['NOT_VISIBLE', 'UNKNOWN'].includes(a.state)) throw new Error('G1_UNREADABLE_STATE_ILLEGAL: ' + a.state);
      if (!carrierKnown) throw new Error('G1_UNREADABLE_CARRIER_UNKNOWN');
      const u = { carrier_ref: a.carrier, state: a.state }; if (a.limitation && a.limitation.length) { for (const l of a.limitation) if (!C.LIMITATIONS.includes(l)) throw new Error('G1_LIMITATION_ILLEGAL: ' + l); u.limitation = a.limitation.slice(); }
      out.unreadable.push(u); covered.add(a.carrier); continue;
    }
    if (!ROLES.includes(a.role)) throw new Error('G1_ROLE_ILLEGAL: ' + a.role);
    if (a.suppressed_by) { out.suppressed.push({ carrier_ref: a.carrier, rule: 'COLOUR_V1_SUPPRESSION:' + a.suppressed_by }); continue; }
    if (!C.COLOUR_FAMILIES.includes(a.family)) throw new Error('G1_FAMILY_ILLEGAL: ' + a.family);
    const unresolved = partialOf(a);
    if (unresolved.length) {                                                           // V1.3: partial knowledge stays partial (no invented lightness / effect / contrast)
      if (!carrierKnown) throw new Error('G1_PARTIAL_CARRIER_UNKNOWN');
      const p = { carrier_ref: a.carrier, color_family: a.family, role: a.role, unresolved };
      if (!unresolved.includes('color_lightness')) { if (!C.COLOUR_LIGHTNESS.includes(a.lightness)) throw new Error('G1_LIGHTNESS_ILLEGAL: ' + a.lightness); p.color_lightness = a.lightness; }
      if (!unresolved.includes('color_effect')) { if (!C.COLOUR_EFFECT.includes(a.effect)) throw new Error('G1_EFFECT_ILLEGAL: ' + a.effect); p.color_effect = a.effect; }
      if (a.role === 'point' && !unresolved.includes('contrast_with_field')) { if (!C.CONTRAST.includes(a.contrast)) throw new Error('G1_CONTRAST_ILLEGAL (Tonal · Subtle · Distinct): ' + a.contrast); p.contrast_with_field = a.contrast; }
      const part = readPart(a, registry); if (part) p.carrier_part = part;
      out.partial.push(p); covered.add(a.carrier); continue;
    }
    if (!C.COLOUR_LIGHTNESS.includes(a.lightness)) throw new Error('G1_LIGHTNESS_ILLEGAL: ' + a.lightness);
    if (!C.COLOUR_EFFECT.includes(a.effect)) throw new Error('G1_EFFECT_ILLEGAL: ' + a.effect);
    const part = readPart(a, registry);
    if (carrierKnown) covered.add(a.carrier);
    if (a.role === 'field') {
      if (!carrierKnown) throw new Error('G1_FIELD_CARRIER_UNKNOWN');
      const key = [a.family, a.lightness, a.effect].join('|');
      if (!fieldKey.has(key)) { fieldKey.set(key, { color_family: a.family, color_lightness: a.lightness, color_effect: a.effect, carrier_refs: [] }); out.field.push(fieldKey.get(key)); }
      const f = fieldKey.get(key); if (!f.carrier_refs.includes(a.carrier)) f.carrier_refs.push(a.carrier);
    } else {
      if (!C.CONTRAST.includes(a.contrast)) throw new Error('G1_CONTRAST_ILLEGAL (Tonal · Subtle · Distinct): ' + a.contrast);
      const key = [a.carrier, a.family, a.effect].join('|');                        // IX-7: same phenomenon on the same carrier = one event (first observation kept)
      if (pointKey.has(key)) continue;
      pointKey.add(key);
      const pt = { color_family: a.family, color_lightness: a.lightness, color_effect: a.effect,
        carrier_ref: carrierKnown ? { value: a.carrier, state: 'OBSERVED' } : { state: 'UNKNOWN' }, contrast_with_field: a.contrast };
      if (part) pt.carrier_part = part;
      out.points.push(pt);
    }
  }
  if (out.state === 'OBSERVED') {                                                   // completeness (order §25): no visible participant without a colour opportunity
    const missing = registry.map((e) => e.component_ref).filter((r) => !covered.has(r));
    if (missing.length) throw new Error('G1_COMPONENT_WITHOUT_COLOUR_OPPORTUNITY (field / point / unreadable required): ' + missing.join(','));
  }
  if (!out.partial.length) delete out.partial;                                          // the candidate carrier appears only when used
  if (C.JUDGMENT_VALUE_RE.test(JSON.stringify(out))) throw new Error('G1_JUDGMENT_TOKEN_EMITTED');
  return out;
}

module.exports = { buildColourComposition, partialOf };
