'use strict';
/* STMX ITEM EI V2 — DIRECTION + KOREAN REASON ENGINE — CANDIDATE (isolated · not production · not frozen).
   Public:     evaluate(request, options?)            → { direction: 'E' | 'I' | 'NEUTRAL', reason }        (or { error } for a non-product technical request)
   Diagnostic: evaluateDiagnostic(request, options?)  → + state { underlying_direction, commercial_neutral_eligible, final_direction, resolution_basis, neutral_basis, … }
   options.commercialNeutral (default true) — false = Neutral-Off: final = underlying (the underlying is computed identically in both modes).
   CEO 2026-10-28: Neutral = Commercial recommendation eligibility only · binary underlying E / I · Crossover / midpoint / uncertainty Neutral have no path here.
   R2 (CEO final Meaningful correction): I_BASE + one qualified MEANINGFUL → E · Score Continuity scope preserved for Commercial Neutral. Predecessor: STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE (kept, superseded).
   R3 (CEO 2026-10-28, Reason determinism only): a Matching Pair's member-derived Reason view (categories · colour families · unknown fields) and the internal excluded-field
   trace are built from the WHOLE member records in the frozen runPair order (String(member_id).localeCompare), never from request order. Direction logic unchanged. Predecessor R2 kept immutable.
   R4 (CEO 2026-10-28, Primary Item / Suit-only scoring unit): every request first passes src/ei_v2_product_unit.js — a non-suit ITEM_PRODUCT is scored from its primary
   target only, a SUIT from its Jacket + Trouser components only, and a bare MATCHING_PAIR is refused. The R3 core below is unchanged. Predecessor R3 kept immutable.
   R5 (CEO 2026-10-28, final Suit / Primary Item constitution): the Suit exception is a verified Jacket + Trouser (Pantsuit) OR Jacket + Skirt (Skirt Suit) product — the
   R4 Jacket + Trouser-only restriction is superseded (src/ei_v2_product_unit.js). Selection call and the core below unchanged. Predecessor R4 kept immutable. */
const { adaptRequest } = require('./ei_v2_input_adapter');
const { garmentReadings, pairReadings } = require('./ei_v2_readings');
const { resolveUnderlying } = require('./ei_v2_underlying_resolver');
const { resolveCommercial, applyNeutralPolicy } = require('./ei_v2_commercial_neutral');
const { compose, verify } = require('./ei_v2_reason_ko');
const { selectScoringUnit } = require('./ei_v2_product_unit');   /* R4 */
const ENGINE_ID = 'STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5';
const UNKNOWN_STATES = ['UNKNOWN', 'NOT_VISIBLE'];
function evaluateDiagnostic(request, options) {
  const sel = selectScoringUnit(request); if (!sel.ok) return { error: { code: sel.error, detail: sel.detail, engine: ENGINE_ID } }; request = sel.request;   /* R4: product scoring unit first */
  const a = adaptRequest(request); if (!a.ok) return { error: { code: a.error, detail: a.detail, engine: ENGINE_ID } };
  const R = a.pair ? pairReadings(a.members, a.rest) : garmentReadings(a.input);
  let U; if (!R.readings.length) U = { direction: 'I', basis: 'ZERO_EVIDENCE_OPERATIONAL_DEFAULT (no admissible category reading)', rule: null, cond: null, readings: [] };
  else U = resolveUnderlying(R.readings);
  if (R.coordination) { const g = R.coordination.groups; if (g.length === 1) U = Object.assign({}, U, { basis: U.basis + ' · O1 (frozen outcome-equivalent coordination)' }); else U = Object.assign({}, U, g.every((x) => x === 'E') ? { direction: 'E', basis: 'PAIR_COORDINATION_ALL_READINGS_E' } : { direction: 'I', basis: 'PAIR_COORDINATION_NON_INVARIANT_OPERATIONAL_DEFAULT' }); }
  const colourEst = a.pair ? a.members.every((m) => m.provenance.colour_established) : a.provenance.colour_established;
  const C = R.eligibleAllowed === false ? { eligible: false, why: R.note } : R.coordination && R.coordination.groups.length > 1 ? { eligible: false, why: 'PAIR_COORDINATION_NON_INVARIANT' } : resolveCommercial(R.readings, { colour_established: colourEst });
  const final = applyNeutralPolicy(U, C, options);
  const members = a.pair ? a.members.slice().sort((x, y) => String(x.member_id).localeCompare(String(y.member_id))) : null;   /* R3: frozen runPair member order, whole member records */
  const inputs = a.pair ? members.map((m) => m.input) : [a.input]; const r0 = R.readings[0] || { pathways: [], evidence: [] };
  const view = { direction: final, underlying_basis: U.basis, eligible: C.eligible && final === 'NEUTRAL', neutral_basis: C.eligible ? C.basis : null, pair: a.pair, families: [...new Set(inputs.filter((i) => i.color_observation).map((i) => i.color_observation.primary_color_family))], intrinsic: [...new Set(R.readings.map((x) => x.intrinsic))],
    categories: inputs.every((i) => i.category) ? inputs.map((i) => i.category) : null, pathways: r0.pathways, evidence: r0.evidence, cond: U.cond,
    unknown_fields: [...new Set(inputs.flatMap((i) => ['pattern', 'graphic', 'surface', 'material', 'exposure_opening'].filter((f) => i.observations[f] && UNKNOWN_STATES.includes(i.observations[f].state))))] };
  if (inputs.some((i) => !i.color_observation)) view.families = [];
  const reason = compose(view);
  const state = { engine: ENGINE_ID, underlying_direction: U.direction, commercial_neutral_eligible: C.eligible, final_direction: final, commercial_neutral_mode: !(options && options.commercialNeutral === false), resolution_basis: U.basis, decision_rule: U.rule, neutral_basis: C.eligible ? C.basis : null, neutral_ineligible_reason: C.eligible ? null : C.why, readings: R.readings.length, frozen_v1_direction: R.frozen_v1 || (R.readings.find((x) => x.frozen_v1) || {}).frozen_v1 || null, forces_written: 0, scoring_unit: sel.selection, excluded_fields: a.pair ? members.map((m) => ({ member_id: m.member_id, excluded: m.excluded })) : a.excluded };
  return { direction: final, reason: reason.text, state, view, clauses: reason.clauses, verify: () => verify(view, reason) };
}
function evaluate(request, options) { const d = evaluateDiagnostic(request, options); return d.error ? { error: d.error } : { direction: d.direction, reason: d.reason }; }
module.exports = { evaluate, evaluateDiagnostic, ENGINE_ID };
