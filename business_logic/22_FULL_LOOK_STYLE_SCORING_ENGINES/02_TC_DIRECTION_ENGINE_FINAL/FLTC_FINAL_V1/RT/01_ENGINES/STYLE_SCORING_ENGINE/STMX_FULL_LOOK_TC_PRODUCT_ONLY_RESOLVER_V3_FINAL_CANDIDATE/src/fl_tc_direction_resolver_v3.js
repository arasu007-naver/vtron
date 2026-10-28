'use strict';
/**
 * STMX FULL-LOOK TC PRODUCT-ONLY RESOLVER V3 — FINAL CANDIDATE (offline; the runtime of STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1).
 * Successor of STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V2_CANDIDATE (preserved unchanged). Correction FCR-TC-1: STMX-2026-10-AEMS (2026-10-24).
 * Entry: resolveTC({ packet, run_record }) → TC Direction record. One look in, one record out. No score, no strength, no TC1–TC9, never TC5, never Neutral.
 *
 *   STEP 1 VALID INPUT   V1 adapter contract (byte-identical) · SVP-001 look frame · a participating garment exists
 *   STEP 2 EVIDENCE      lookFromPacket (V1 adapter): only observed facts; UNKNOWN is never turned into a property
 *   STEP 3 PRODUCT       V1 product stage (byte-identical): frozen Step 2 predicates per garment, IX-1 (b), irrelevance proof
 *   STEP 4 DIRECTION
 *     TC-P1  a valid frozen product departure on any participating garment            → TRANSFORMATIVE  (nothing cancels it)
 *     TC-C   no valid departure, and ≥ 1 garment whose frozen FALSE verdicts rest on
 *            OBSERVED facts (Classic support, fl_tc_available_evidence_v3.js)          → CLASSIC
 *     input failure (TECHNICAL_EXCEPTION · INPUT_FAILURE), separate from the direction:
 *            INPUT_CONTRACT · NO_OBSERVABLE_WORN_LOOK · NO_GARMENT_OBSERVED · NO_TC_PRODUCT_EVIDENCE (no departure and no Classic support at all)
 *   STEP 5 DIAGNOSTICS   basis: Classic support · missing observations · unknown identities · frozen interpretive gaps · frame limits ·
 *                        sensitivity NONE / POSSIBLE — reported beside the direction, never instead of it.
 * V2 → V3: TC-P2 and TC-PV no longer produce an outcome (they are diagnostics); TC-P0 is an input failure; the product stage is unchanged.
 */
const A = require('./fl_tc_authority_v3.js'); const IN = require('./fl_tc_input_adapter_v1.js');
const PR = require('./fl_tc_product_departure_v1.js'); const PV = require('./fl_tc_product_visibility_v2.js'); const AE = require('./fl_tc_available_evidence_v3.js');
const RESOLVER_ID = 'STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE';
const DIRECTIONS = Object.freeze(['CLASSIC', 'TRANSFORMATIVE']);
const EXCEPTIONS = Object.freeze({
  INPUT_CONTRACT: 'the packet / run_record does not satisfy the frozen Vision packet contract V1_RC4 — resend a valid packet',
  NO_OBSERVABLE_WORN_LOOK: 'SVP-001 says the image holds no evaluable worn look (frame not observed · image_failure · not_a_worn_look)',
  NO_GARMENT_OBSERVED: 'no garment component is registered (accessories and footwear are outside the product gate, TC-D-4b)',
  NO_TC_PRODUCT_EVIDENCE: 'no garment carries a product fact the frozen TC predicates can read (no departure and no observed conventional reading) — e.g. the only garment has an unknown identity, or every product fact is unobserved' });
const provenance = () => ({ resolver: RESOLVER_ID, constitution: A.CONSTITUTION_ID, decision_anchors: [A.AEMS_ANCHOR, A.PRODUCT_ONLY_ANCHOR], vision_freeze: A.VISION_FREEZE_ID, bound: A.bound, authorities: A.AUTHORITIES });
const garmentTrace = (product) => (product ? product.garments.map((g) => ({ ref: g.ref, identity: g.identity, archetype_key: g.archetype_key, status: g.status, frozen_rules: g.rules, channels: g.channels, evidence_read: g.evidence_read, pocket_instances: g.pocket_instances || null, not_delivered: g.not_delivered || [], lawfully_absent: g.lawfully_absent || [], excluded_hidden_by_other_garment: g.excluded_occluded || g.occluded || [], irrelevant_unknown: g.irrelevant_open || [], irrelevance_proof: g.irrelevance_proof || null, missing_material: g.material || null, untestable: g.untestable || null })) : []);
function record(o, product, vis, trace) {
  return Object.assign({ axis: 'TC', resolver: RESOLVER_ID, authority: A.CONSTITUTION_ID }, o, {
    product_departure: product ? { status: product.status, departures: product.departures, blocked: product.blocked, unknown_identity: product.unknown_identity } : null,
    product_visibility: vis ? { status: vis.status, findings: vis.findings } : null,
    evidence_trace: { garments: garmentTrace(product), visibility: vis ? vis.evidence_read : [], wearing_context: vis ? vis.wearing_context : null },
    rule_trace: trace, authority_provenance: provenance() });
}
function fail(code, detail, product, vis, trace, basis) {
  trace.push('INPUT FAILURE: ' + code + (detail ? ' — ' + detail : ''));
  return record({ status: 'TECHNICAL_EXCEPTION', direction: null, rule: null, resolved_by: null, basis: basis || null, exception: { code, class: 'INPUT_FAILURE', detail: detail || null, remediation: EXCEPTIONS[code] } }, product, vis, trace);
}
function resolved(direction, rule, resolvedBy, basis, product, vis, trace) {
  if (!DIRECTIONS.includes(direction)) throw new Error('DIRECTION_OUTSIDE_FROZEN_VOCABULARY ' + direction);
  return record({ status: 'RESOLVED', direction, rule, resolved_by: resolvedBy, basis, exception: null }, product, vis, trace);
}
/** resolveTC({ packet, run_record }) — the only runtime entry point. */
function resolveTC(input) {
  const packet = input && input.packet, rec = input && input.run_record; const trace = [];
  /* STEP 1 — valid input */
  try { IN.validateInput(packet, rec); } catch (e) { if (e instanceof IN.InputContractError) return fail('INPUT_CONTRACT', e.code + (e.message ? ' — ' + e.message : ''), null, null, trace); throw e; }
  const L = IN.lookFromPacket(packet, rec); trace.push('INPUT: packet V1_RC4 accepted · ' + L.comps.length + ' components');
  const frame = AE.frameState(L);
  if (!frame.observed || frame.invalid.length) return fail('NO_OBSERVABLE_WORN_LOOK', 'look_frame_state ' + frame.state + (frame.invalid.length ? ' · limits ' + frame.invalid.join(' + ') : ''), null, null, trace);
  /* STEP 2 + 3 — observed evidence through the unchanged product stage */
  const product = PR.evaluateProduct(L); trace.push('PRODUCT: ' + product.status + (product.departures.length ? ' · ' + product.departures.join(' · ') : '') + (product.blocked.length ? ' · not fully proven ' + product.blocked.join(' · ') : ''));
  const vis = PV.evaluateVisibility(L); trace.push('VISIBILITY (diagnostic): ' + vis.status + (vis.findings.length ? ' · ' + vis.findings.map((f) => f.reason).join(' · ') : ''));
  if (!product.garments.length && !product.unknown_identity.length) return fail('NO_GARMENT_OBSERVED', 'no garment component in the registry', product, vis, trace);
  const ev = AE.assess(L, product);
  const basis = (sensitivity, possible) => ({ classic_support: ev.garments.filter((g) => g.classic_support.length).map((g) => ({ ref: g.ref, identity: g.identity, support: g.classic_support })),
    departures: product.departures, missing_observations: ev.missing_observations, excluded_hidden_by_other_garment: ev.excluded_hidden_by_other_garment, unknown_identity: ev.unknown_identity,
    interpretive_gaps: ev.interpretive_gaps, frame_limits: ev.frame.limits, sensitivity, sensitive_to: sensitivity === 'POSSIBLE' ? ev.sensitivity_sources : [], possible_outcomes_if_observed: possible });
  /* STEP 4 — direction */
  if (product.status === 'DEPARTURE_CONFIRMED') { trace.push('TC-P1: a valid frozen product departure → TRANSFORMATIVE (Classic or not-fully-proven garments, unknown components and frame limits do not cancel it)');
    return resolved('TRANSFORMATIVE', 'TC-P1', 'DIRECT', basis('NONE', ['TRANSFORMATIVE']), product, vis, trace); }
  if (ev.supported.length) {
    const direct = product.status === 'NO_DEPARTURE_SUFFICIENT' && vis.status === 'SUFFICIENT';
    const sens = ev.sensitivity_sources.length ? 'POSSIBLE' : 'NONE';
    trace.push('TC-C: no valid frozen product departure; observed conventional product evidence on ' + ev.supported.join(', ') + (direct ? ' (every garment proven, frame observed)' : ' (available evidence, AEMS: ' + ev.sensitivity_sources.map((s) => s.source + (s.ref ? '@' + s.ref : '')).join(' · ') + ' — reported, not withheld)') + ' → CLASSIC');
    return resolved('CLASSIC', 'TC-C', direct ? 'DIRECT' : 'AVAILABLE_EVIDENCE', basis(sens, sens === 'POSSIBLE' ? ['CLASSIC', 'TRANSFORMATIVE'] : ['CLASSIC']), product, vis, trace); }
  return fail('NO_TC_PRODUCT_EVIDENCE', (product.garments.length ? 'garments ' + product.garments.map((g) => g.ref + ' ' + g.identity).join(', ') + ' carry no observed product fact the frozen predicates read' : 'no component identified as a garment') + (ev.unknown_identity.length ? '; unknown identity: ' + ev.unknown_identity.join(', ') : ''), product, vis, trace, basis('POSSIBLE', ['CLASSIC', 'TRANSFORMATIVE']));
}
module.exports = { RESOLVER_ID, DIRECTIONS, EXCEPTIONS, resolveTC };
