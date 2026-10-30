'use strict';
/**
 * STMX FULL-LOOK EI BINARY DIRECTION RESOLVER V1_R3 — CANDIDATE (offline; the runtime of STMX_FULL_LOOK_EI_BINARY_DIRECTION_CONSTITUTION_V1_R3).
 * Copy of the V1_R2 resolver; only RESOLVER_ID and this header differ. The R3 evidence corrections (PS-1 conventional completion from observed facts ·
 * ACC-1 / ACC-2 grounded in the Phase 2 D02 – D04 classes) and the kept R1 exposure corrections (EX-1 · EX-2) live in fl_ei_evidence_v1.js.
 * [V1_R2 header] Copy of the V1_R1 resolver; only RESOLVER_ID and this header differ. The R2 evidence corrections (ACC-1 / ACC-2 styling-role routes · PS-1) and the kept
 * R1 exposure corrections (EX-1 · EX-2) live in fl_ei_evidence_v1.js.
 * Entry: resolveEI({ packet, run_record }) → EI Direction record. One look in, one record out. Direction only: no score, no strength, no ladder, never Neutral.
 *
 *   STEP 1 VALID INPUT     frozen packet contract V1_RC4 (same checks as the frozen-release TC adapter) · look frame observed · ≥ 1 registered component
 *   STEP 2 OBSERVED VIEW   read-only EI view of the packet (identity · colour composition · exposure · SVP-121 / 122 / 123); UNKNOWN stays UNKNOWN
 *   STEP 3 COLOUR BASE     frozen Base Character + Registry V3 Contextual colours per garment (fl_ei_colour_base_v1.js)
 *   STEP 4 EVIDENCE        valid Expressive evidence F · AF · PT · PG · GR · EX (fl_ei_evidence_v1.js)
 *   STEP 5 DIRECTION
 *     EI-E   ≥ 1 valid Expressive basis                                   → EXPRESSIVE  (nothing cancels it; no count, no majority)
 *     EI-I   no valid Expressive basis in the available evidence          → INTROVERT   (the observed bases and the unobserved facts are reported as they are;
 *                                                                                         no missing fact is turned into a Non-Expressive observation)
 *   input failure (TECHNICAL_EXCEPTION · INPUT_FAILURE), separate from the direction: INPUT_CONTRACT · NO_OBSERVABLE_WORN_LOOK · NO_COMPONENT_OBSERVED
 */
const A = require('./fl_ei_authority_v1.js'); const IN = require('./fl_ei_input_adapter_v1.js'); const EV = require('./fl_ei_evidence_v1.js');
const RESOLVER_ID = 'STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_R3_CANDIDATE';
const DIRECTIONS = Object.freeze(['EXPRESSIVE', 'INTROVERT']);
const FRAME_INVALID = Object.freeze(['image_failure', 'not_a_worn_look']);
const EXCEPTIONS = Object.freeze({
  INPUT_CONTRACT: 'the packet / run_record does not satisfy the frozen Vision packet contract V1_RC4 (or EI was not requested) — resend a valid packet',
  NO_OBSERVABLE_WORN_LOOK: 'SVP-001 says the image holds no evaluable worn look (frame not observed · image_failure · not_a_worn_look)',
  NO_COMPONENT_OBSERVED: 'the component registry is empty — nothing participates in the look' });
const provenance = () => ({ resolver: RESOLVER_ID, constitution: A.CONSTITUTION_ID, decision_anchors: [A.ANCHORS.DEC_4, A.ANCHORS.DEC_1_3, A.ANCHORS.COLOUR, A.ANCHORS.AEMS], vision_freeze: A.VISION_FREEZE_ID, bound: A.bound, authorities: A.AUTHORITIES });
function record(o, ev, L, trace) {
  return Object.assign({ axis: 'EI', resolver: RESOLVER_ID, authority: A.CONSTITUTION_ID }, o, {
    evidence_trace: ev ? { expressive_bases: ev.bases, not_qualifying: ev.not_qualifying, absorbed_into_pattern_graphic: ev.absorbed, colour_grounds: ev.grounds, diagnostics: ev.diagnostics } : null,
    components: L ? L.comps.map((c) => ({ ref: c.ref, identity: c.identity, subtype: c.subtype })) : null, rule_trace: trace, authority_provenance: provenance() });
}
function fail(code, detail, trace) { trace.push('INPUT FAILURE: ' + code + (detail ? ' — ' + detail : '')); return record({ status: 'TECHNICAL_EXCEPTION', direction: null, rule: null, resolved_by: null, basis: null, exception: { code, class: 'INPUT_FAILURE', detail: detail || null, remediation: EXCEPTIONS[code] } }, null, null, trace); }
function resolved(direction, rule, resolvedBy, basis, ev, L, trace) {
  if (!DIRECTIONS.includes(direction)) throw new Error('DIRECTION_OUTSIDE_BINARY_CONTRACT ' + direction);
  return record({ status: 'RESOLVED', direction, rule, resolved_by: resolvedBy, basis, exception: null }, ev, L, trace);
}
/** resolveEI({ packet, run_record }) — the only runtime entry point. Pure: no I/O after the authority load, no clock, no randomness. */
function resolveEI(input) {
  const packet = input && input.packet, rec = input && input.run_record; const trace = [];
  try { IN.validateInput(packet, rec); } catch (e) { if (e instanceof IN.InputContractError) return fail('INPUT_CONTRACT', e.message, trace); throw e; }
  const L = IN.lookFromPacket(packet, rec); trace.push('INPUT: packet V1_RC4 accepted · ' + L.comps.length + ' components');
  const limits = (L.frame && L.frame.limits) || []; const invalid = limits.filter((x) => FRAME_INVALID.includes(x));
  if (!L.frame || L.frame.state !== 'OBSERVED' || invalid.length) return fail('NO_OBSERVABLE_WORN_LOOK', 'look_frame ' + (L.frame ? L.frame.state : 'missing') + (invalid.length ? ' · ' + invalid.join(' + ') : ''), trace);
  if (!L.comps.length) return fail('NO_COMPONENT_OBSERVED', null, trace);
  const ev = EV.collect(L);
  trace.push('COLOUR BASE: ' + (ev.grounds.map((g) => g.ref + ' ' + g.component + ' ' + g.token + '=' + g.base + (g.contextual ? '(Contextual)' : '')).join(' · ') || 'no garment colour field observed'));
  trace.push('EVIDENCE: ' + ev.bases.length + ' valid Expressive bases · ' + ev.not_qualifying.length + ' observed elements not qualifying · ' + ev.absorbed.length + ' colours absorbed into pattern / graphic');
  const unobserved = ev.diagnostics.filter((d) => /UNREADABLE|PARTIAL|NOT_OBSERVED|IDENTITY_UNKNOWN|HIDDEN/.test(d.kind));
  const basis = { expressive_bases: ev.bases.map((b) => b.pathway + ' ' + b.ref + ' ' + b.evidence), introvert_ground: null, unobserved: unobserved.map((d) => d.kind + (d.ref ? '@' + d.ref : '') + ': ' + d.detail), frame_limits: limits.slice() };
  if (ev.bases.length) { trace.push('EI-E: ' + ev.bases.map((b) => b.pathway + '@' + b.ref + ' ' + b.evidence).join(' · ') + ' → EXPRESSIVE (one valid basis suffices; Non-Expressive or Contextual components do not cancel it)');
    return resolved('EXPRESSIVE', 'EI-E', 'DIRECT', basis, ev, L, trace); }
  const nonE = ev.grounds.filter((g) => g.base === 'NON_EXPRESSIVE' || g.contextual === true);
  basis.introvert_ground = { observed_bases: nonE.map((g) => g.ref + ' ' + g.component + ' ' + g.token + (g.contextual ? ' (Contextual)' : ' (Non-Expressive)')), checked_not_qualifying: ev.not_qualifying.map((n) => n.pathway + ' ' + n.item + ' — ' + n.why), statement: nonE.length ? 'observed colour bases are Non-Expressive or Contextual and no observed element qualifies as valid expression' : 'no garment colour base was observed; no observed element qualifies as valid expression (nothing unobserved is assumed)' };
  const resolvedBy = unobserved.length || limits.length || !nonE.length ? 'AVAILABLE_EVIDENCE' : 'DIRECT';
  trace.push('EI-I: no valid Expressive basis in the available evidence → INTROVERT (' + basis.introvert_ground.statement + (unobserved.length ? '; unobserved: ' + basis.unobserved.join(' · ') : '') + ')');
  return resolved('INTROVERT', 'EI-I', resolvedBy, basis, ev, L, trace);
}
module.exports = { RESOLVER_ID, DIRECTIONS, EXCEPTIONS, resolveEI };
