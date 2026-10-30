'use strict';
/**
 * STMX Full-Look DM Direction — V3.1 CANDIDATE — resolver (FCR-DM-1 V3 correction). [V3.1] = V3 + DM31-D4 SURFACE_ARTICULATION_FIELD (only change; V3 stays unchanged). CANDIDATE — not approved, not frozen, not bound to any engine or pointer.
 * Successor of the research candidates V2 (DMSC2) and V2-C (CDI); both stay unchanged. Deterministic, GT-blind, no look-id branch, no Item DM fallback, no Vision repair.
 *
 * Changes against V2-C (rule ids in fl_dm_authority_v3_1.js):
 *   [MS] STMX-2026-10-AEMS — UNRESOLVED is no longer a final result: a look with no established D route is M (DM3-M1); visibility and impact limits become
 *        non-scoring diagnostics. The "open primitive" enumeration is replaced by MS-1 (an unobserved primitive contributes nothing).
 *   [S0] technical input failures are returned as INPUT_FAILURE (no Direction), separate from scoring.
 *   [R]  Korean Reason + evidence_used + rule_trace.
 * Unchanged from V2-C: the three D routes (FIELD · STYLING_COMPOSITION · STRONG_GARMENT_POINT = GARMENT_INTEGRATED_CLEAR_POINT), one system = one role check
 * (no cross-system count, spread or coverage), relational accents never decide alone, Neutral never emitted (CEO gate DM-Q1).
 */
const AUTH = require('./fl_dm_authority_v3_1.js'); const KO = require('./fl_dm_reason_ko_v3_1.js'); const AD = require('./fl_dm_input_adapter_v3_1.js');
const ob = (p) => (p && p.state === 'OBSERVED' ? p.value : null);   // DM3-MS1: only an OBSERVED value can establish a predicate
const origin = (L, x) => { if (x.look_detail_family === 'H') return 'RELATIONAL'; const ids = (x.carrier_refs || []).map((r) => L.component_identity[r] || 'UNKNOWN'); return ids.some((i) => AUTH.GARMENT.includes(i)) ? 'GARMENT' : ids.length && ids.every((i) => i !== 'UNKNOWN') ? 'ACCESSORY' : 'UNESTABLISHED'; };
const lookScale = (x) => { const s = ob(x.size_in_look), p = ob(x.position_in_look); return s === 'large' || p === 'whole_look' || (p === 'distributed' && s !== null && s !== 'small'); };
const ROLE = {
  FIELD: (L, x) => x.look_detail_family !== 'H' && lookScale(x),
  STYLING_COMPOSITION: (L, x) => x.look_detail_family === 'H' && x.relational_form === 'composition' && ob(x.size_in_look) !== null && ob(x.size_in_look) !== 'small' && ob(x.contrast_in_look) === 'high',
  GARMENT_INTEGRATED_CLEAR_POINT: (L, x) => x.look_detail_family !== 'H' && origin(L, x) === 'GARMENT' && !lookScale(x) && ob(x.contrast_in_look) === 'high',
  SURFACE_ARTICULATION_FIELD: (L, x) => x.look_detail_family === 'B' && origin(L, x) === 'GARMENT' && ['medium', 'large'].includes(ob(x.size_in_look)),   // [V3.1] DM31-D4 — contrast and position not required
};
const RULE_OF = { FIELD: 'DM3-D1', STYLING_COMPOSITION: 'DM3-D2', GARMENT_INTEGRATED_CLEAR_POINT: 'DM3-D3', SURFACE_ARTICULATION_FIELD: 'DM31-D4' };
const why = (L, x) => (x.look_detail_family === 'H' ? (x.relational_form === 'composition' ? 'composition without observed extent and clear separation' : 'relational accent — never decides alone') : origin(L, x) === 'GARMENT' ? 'garment detail below look scale without clear separation' : origin(L, x) === 'ACCESSORY' ? 'accessory-carried point below look scale' : 'carrier identity not established; below look scale');
const lab = (L, x) => { const g = (p) => (p && p.state === 'OBSERVED' ? p.value : (p && p.state) || '?'); return x.look_detail_family + (x.relational_form ? '(' + x.relational_form + ')' : '') + ':' + (x.carrier_refs || []).map((r) => r + '=' + (L.component_identity[r] || 'UNKNOWN')).join('+') + ':' + g(x.size_in_look) + '/' + g(x.contrast_in_look) + '/' + g(x.position_in_look); };
const unobs = (x) => ['size_in_look', 'contrast_in_look', 'position_in_look'].filter((k) => ob(x[k]) === null);
/** decide(L): L = the DM-lawful projection (fl_dm_input_adapter_v3.fromPacket(pk).L). */
function decide(L) {
  const v = L.dm_evidence_visibility || { state: 'UNKNOWN' };
  if (v.state === 'OBSERVED' && /not_adjudicable:\{(image_failure|not_a_worn_look)/.test(v.value)) return { status: 'INPUT_FAILURE', direction: null, input_failure: 'DMP3_' + v.value, candidate_version: AUTH.VERSION, rule_trace: ['DM3-S0'] };
  const S = L.look_detail_systems || []; const contributing = [], limited = [];
  for (const x of S) { const roles = Object.keys(ROLE).filter((k) => ROLE[k](L, x)); const e = { system: lab(L, x), family: x.look_detail_family, relational_form: x.relational_form || null, carriers: (x.carrier_refs || []).map((r) => L.component_identity[r] || 'UNKNOWN'), size: ob(x.size_in_look), contrast: ob(x.contrast_in_look), position: ob(x.position_in_look), unobserved_primitives: unobs(x) };
    if (roles.length) contributing.push(Object.assign(e, { roles, rules: roles.map((r) => RULE_OF[r]) })); else limited.push(Object.assign(e, { why: why(L, x) })); }
  const f = L.look_frame || {}; const visibility = v.state === 'OBSERVED' ? v.value : 'UNKNOWN · frame limits ' + JSON.stringify(f.limits || []);
  const diagnostics = { visibility, visibility_limited: !(v.state === 'OBSERVED' && v.value === 'adjudicable') && !(v.state === 'UNKNOWN' && f.state === 'OBSERVED' && !(f.limits || []).length), impact_not_establishable: limited.filter((e) => e.family !== 'H').map((e) => e.system), unobserved_primitives: S.filter((x) => unobs(x).length).map((x) => lab(L, x) + ' → ' + unobs(x).join('+')), neutral_policy: AUTH.NEUTRAL_POLICY, non_scoring: true };
  if (contributing.length) { const rules = [...new Set(contributing.flatMap((c) => c.rules))];
    return { status: 'SCORED', direction: 'D', direction_reason: KO.reasonD(contributing), evidence_used: contributing, evidence_not_deciding: limited, rule_trace: ['DM3-MS1'].concat(rules), candidate_version: AUTH.VERSION, diagnostics }; }
  return { status: 'SCORED', direction: 'M', direction_reason: KO.reasonM(limited, diagnostics.visibility_limited), evidence_used: limited, evidence_not_deciding: [], rule_trace: ['DM3-MS1', 'DM3-M1'], candidate_version: AUTH.VERSION, diagnostics };
}
/** scorePacket(pk): the runtime entry — frozen packet in, governed result out. */
function scorePacket(pk) { const a = AD.fromPacket(pk); if (!a.ok) return { status: 'INPUT_FAILURE', direction: null, input_failure: a.input_failure, candidate_version: AUTH.VERSION, rule_trace: ['DM3-S0'] }; return decide(a.L); }
module.exports = { VERSION: AUTH.VERSION, decide, scorePacket, ROLE, origin };
