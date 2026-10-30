'use strict';
/**
 * AVAILABLE-EVIDENCE stage (V3, FCR-TC-1) — STMX-2026-10-AEMS applied to Product-Only Full-Look TC.
 * Input: the look L (V1 adapter) and the garment rows of the unchanged V1 product stage. This module decides no departure and writes no value into
 * any fact; it only reads which frozen channel verdicts rest on OBSERVED facts.
 *
 *   Classic support ("positive conventional evidence") of a garment = a frozen silhouette / proportion / construction channel that returned FALSE
 *   AND whose carrier fact was OBSERVED in the packet:
 *     silhouette FALSE  → fit OBSERVED (the frozen ladder returns FALSE only on an observed Regular / Relaxed / Slim / Voluminous fit);
 *     proportion FALSE  → length OBSERVED (frozen envelopes Q2 / Q5 / Q6 / Q7);
 *     construction FALSE → at least one construction carrier that the frozen predicate READS FOR THIS KEY is OBSERVED. The frozen C-1 rule also
 *                          returns FALSE when no carrier was observed at all, so a construction FALSE without an observed carrier is not evidence.
 *   Missing facts, unknown identities, frame limits and frozen interpretive gaps contribute nothing (neither T nor C); they are reported as the
 *   sensitivity of the result (NONE / POSSIBLE), never used to withhold a direction.
 *
 * CONSTRUCTION_READ is the read-set of the frozen construction predicate (evaluator V2.2 base constr / representationGap + V2.3.2 relational):
 *   every key: material · surface · attachment · pocket (instances) ; TOPS + jumpsuit: + shoulder_connection ; tshirt: + collar · front_opening_extent ;
 *   JACKET:Tailored / COAT:Tailored: + sleeve · collar · closure_type · front_opening_extent ; jumpsuit: + waist_definition (bodice-suspension test).
 *   The read-set is checked against the frozen predicate by substitution in the tests (E05).
 */
const PR = require('./fl_tc_product_departure_v1.js');
const SVP = Object.freeze(Object.fromEntries(Object.entries(PR.FIELD).map(([s, f]) => [f, s])));
const TOPS = Object.freeze(['tshirt', 'shirt', 'sweater', 'sweatshirt']);
const TAILORED = /^(JACKET|COAT):Tailored$/;
function constructionRead(key) {
  const f = ['material', 'surface', 'attachment', 'pocket'];
  if (TOPS.includes(key) || key === 'jumpsuit') f.push('shoulder_connection');
  if (key === 'tshirt') f.push('collar', 'front_opening_extent');
  if (TAILORED.test(key)) f.push('sleeve', 'collar', 'closure_type', 'front_opening_extent');
  if (key === 'jumpsuit') f.push('waist_definition');
  return f;
}
const STATE_RULE = /^(SIL-STATE|SIL-NA|PRO-STATE)$/;   /* frozen "fact not observed" verdicts — a missing fact, not an interpretive gap */
const FRAME_REDUCES = Object.freeze(['crop', 'lower_body_cropped', 'occlusion']);   /* SVP-001 frame tokens that can hide product facts (feet_not_visible: footwear is outside the product gate) */
const FRAME_INVALID = Object.freeze(['image_failure', 'not_a_worn_look']);           /* SVP-001 frame tokens that mean no evaluable worn look */
const observedValue = (L, ref, field) => { const c = L.cell(SVP[field] + '@' + ref); return c && c.state === 'OBSERVED' ? c.value : undefined; };
const shown = (v) => (Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? x.value || JSON.stringify(x) : x)).join('+') : String(v));
/** classicSupport(L, g) → [{ channel, rule, facts }] — frozen FALSE channels of garment row g that rest on OBSERVED facts */
function classicSupport(L, g) {
  const out = []; const ruleOf = (prefix) => (g.rules || []).find((r) => r.startsWith(prefix)) || null;
  if (g.channels.silhouette === 'FALSE') { const v = observedValue(L, g.ref, 'fit'); if (v !== undefined) out.push({ channel: 'silhouette', rule: ruleOf('SIL-'), facts: ['fit=' + shown(v)] }); }
  if (g.channels.proportion === 'FALSE') { const v = observedValue(L, g.ref, 'length'); if (v !== undefined) out.push({ channel: 'proportion', rule: ruleOf('PRO-'), facts: ['length=' + shown(v)] }); }
  if (g.channels.construction === 'FALSE') { const facts = constructionRead(g.archetype_key).filter((f) => observedValue(L, g.ref, f) !== undefined).map((f) => f + '=' + shown(observedValue(L, g.ref, f))); if (facts.length) out.push({ channel: 'construction', rule: ruleOf('CON-'), facts }); }
  return out;
}
/** interpretiveGaps(g) → frozen rules that are UNRESOLVED on observed evidence (not a missing-fact state) */
function interpretiveGaps(g) {
  const rules = g.rules || []; const gaps = [];
  for (const ch of ['silhouette', 'proportion', 'construction']) if (g.channels[ch] === 'UNRESOLVED') { const r = rules.find((x) => x.startsWith({ silhouette: 'SIL-', proportion: 'PRO-', construction: 'CON-' }[ch]) || x === 'U-KEY'); if (r && !STATE_RULE.test(r)) gaps.push(ch + ':' + r); }
  if (rules.includes('ASYM-SOURCE-UNRESOLVED')) gaps.push('asymmetry:ASYM-SOURCE-UNRESOLVED');
  return gaps;
}
/** frameState(L) → { invalid: [...], reduces: [...] } from the frozen SVP-001 look frame */
function frameState(L) { const limits = L.cv.look_frame_limits || []; return { observed: L.cv.look_frame_state === 'OBSERVED', state: L.cv.look_frame_state, invalid: limits.filter((x) => FRAME_INVALID.includes(x)), reduces: limits.filter((x) => FRAME_REDUCES.includes(x)), limits: limits.slice() }; }
/** assess(L, product) → available-evidence basis of the look (diagnostics + Classic support); no direction is chosen here */
function assess(L, product) {
  const garments = product.garments.map((g) => {
    const support = classicSupport(L, g); const gaps = interpretiveGaps(g);
    const missing = (g.open || g.irrelevant_open || []).map((f) => g.ref + '.' + f);
    const sens = [];
    if (g.status === 'UNRESOLVED_MATERIAL_MISSING') sens.push({ source: 'PRODUCT_EVIDENCE_MISSING', ref: g.ref, could_depart_if: g.material });
    if (g.status === 'UNRESOLVED_UNTESTABLE') sens.push({ source: 'PRODUCT_EVIDENCE_MISSING', ref: g.ref, untestable: g.untestable });
    if (g.status === 'UNRESOLVED_PROOF_LIMIT') sens.push({ source: 'PRODUCT_EVIDENCE_MISSING', ref: g.ref, proof_limit: g.combinations });
    if (gaps.length) sens.push({ source: 'FROZEN_TOKEN_REPRESENTATION_GAP', ref: g.ref, rules: gaps });
    return { ref: g.ref, identity: g.identity, archetype_key: g.archetype_key, product_status: g.status, classic_support: support, interpretive_gaps: gaps, missing_observations: missing, excluded_hidden_by_other_garment: g.excluded_occluded || g.occluded || [], sensitivity_sources: sens };
  });
  const frame = frameState(L);
  const unknown = product.unknown_identity.slice();
  const sources = garments.flatMap((g) => g.sensitivity_sources).concat(unknown.map((r) => ({ source: 'COMPONENT_IDENTITY_UNKNOWN', ref: r })), frame.reduces.length ? [{ source: 'FRAME_LIMIT', limits: frame.reduces }] : []);
  return { garments, frame, unknown_identity: unknown, supported: garments.filter((g) => g.classic_support.length).map((g) => g.ref), sensitivity_sources: sources,
    missing_observations: garments.flatMap((g) => g.missing_observations), interpretive_gaps: garments.flatMap((g) => g.interpretive_gaps.map((x) => g.ref + ' ' + x)),
    excluded_hidden_by_other_garment: garments.flatMap((g) => g.excluded_hidden_by_other_garment.map((f) => g.ref + '.' + f)) };
}
module.exports = { assess, classicSupport, interpretiveGaps, frameState, constructionRead, FRAME_REDUCES, FRAME_INVALID, STATE_RULE, TOPS };
