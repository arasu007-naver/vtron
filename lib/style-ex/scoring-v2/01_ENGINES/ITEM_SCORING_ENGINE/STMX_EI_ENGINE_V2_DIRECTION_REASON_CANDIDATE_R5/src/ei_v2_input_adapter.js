'use strict';
/* STMX ITEM EI V2 — CANDIDATE. Governed input adapter (Vision V1.3 record / governed packet → EI V2 input).
   · category: canonical string, or V1.3 {state:'OBSERVED', value} — anything else = NOT ESTABLISHED (never guessed)
   · observations: FIELD-LEVEL validity with the frozen Stage 1 validator, one field at a time (a malformed field is excluded, the product stays scoreable)
   · colour: Colour V1 payload validated by the frozen Colour V1 contract; absent / invalid / `uncertain` = NOT ESTABLISHED (never read as a family)
   · a request that does not describe a product at all → TECHNICAL_INVALID_REQUEST (outside the Direction contract) */
const { RT, COLOUR, RULES } = require('./ei_v2_frozen_bindings');
const CATS = RULES.CATEGORIES;
const VALID_CO = { primary_color_family: 'black', color_lightness: null, color_usage: null, multi_color: false, color_effect: null, additional_colors: [] };
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
function adaptRecord(record) {
  if (!isPlain(record) || !isPlain(record.observations)) return { ok: false, error: 'TECHNICAL_INVALID_REQUEST', detail: 'record.observations is not an object' };
  const c = record.category; const excluded = [];
  const category = typeof c === 'string' ? (CATS.includes(c) ? c : null) : isPlain(c) && c.state === 'OBSERVED' && CATS.includes(c.value) ? c.value : null;
  if (!category) excluded.push({ field: 'category', why: c == null ? 'NOT_SUPPLIED' : 'NOT_ESTABLISHED' });
  const observations = {};
  for (const [p, ov] of Object.entries(record.observations)) {
    if (!RULES.ALL_PARAMS.includes(p)) { excluded.push({ field: p, why: 'UNKNOWN_PARAMETER' }); continue; }
    const ok = (category ? [category] : CATS).some((cc) => !RT.validateInput({ category: cc, observations: { [p]: ov }, color_observation: VALID_CO }).errors.some((e) => e.parameter === p));
    if (ok) observations[p] = ov; else excluded.push({ field: p, why: 'INVALID_FIELD' });
  }
  let color = record.color_observation == null ? null : record.color_observation;
  if (color) { const v = COLOUR.validateColorObservation(color); if ((v.contract_errors || []).length || !COLOUR.FAMILIES.includes(color.primary_color_family)) { excluded.push({ field: 'color_observation', why: 'COLOUR_V1_CONTRACT' }); color = null; } }
  else excluded.push({ field: 'color_observation', why: 'NOT_SUPPLIED' });
  const colourKnown = !!color && color.primary_color_family !== 'uncertain';
  return { ok: true, input: { category, observations, color_observation: colourKnown ? color : null }, excluded, provenance: { category_established: !!category, colour_established: colourKnown, fields_used: Object.keys(observations).length } };
}
/* request: { scoring_unit_type: 'GARMENT', record } · { scoring_unit_type: 'GARMENT', input } (governed packet) · { scoring_unit_type: 'MATCHING_PAIR', members: [...] } */
function adaptRequest(req) {
  if (!isPlain(req)) return { ok: false, error: 'TECHNICAL_INVALID_REQUEST', detail: 'request is not an object' };
  if (req.scoring_unit_type === 'MATCHING_PAIR' || Array.isArray(req.members)) {
    if (!Array.isArray(req.members) || req.members.length < 2) return { ok: false, error: 'TECHNICAL_INVALID_REQUEST', detail: 'a MATCHING_PAIR needs at least two members' };
    const members = req.members.map((m) => Object.assign({ member_id: m.member_id }, adaptRecord(m.record || m)));
    const bad = members.find((m) => !m.ok); if (bad) return { ok: false, error: 'TECHNICAL_INVALID_REQUEST', detail: 'member ' + bad.member_id + ': ' + bad.detail };
    const rest = Object.assign({}, req); delete rest.members; delete rest.scoring_unit_type;
    return { ok: true, pair: true, members, rest };
  }
  const a = adaptRecord(req.record || req.input || req); return a.ok ? Object.assign(a, { pair: false }) : a;
}
module.exports = { adaptRecord, adaptRequest, CATS };
