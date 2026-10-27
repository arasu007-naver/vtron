'use strict';
/**
 * STMX FULL-LOOK SR DIRECTION RESOLVER V3_R4 — FINAL CANDIDATE. Byte copy of the V3_R3 resolver except this header, the two module paths, the output authority field (A.CONSTITUTION_ID) and the lazy lane-A loader
 *   (authority / constitution _v3_r4): the only semantic change of R4 lives in the constitution (SRB-2g → SRB-2os / SRB-2or).
 * (R3 header follows) STMX FULL-LOOK SR DIRECTION RESOLVER V3_R3 — FINAL CANDIDATE (offline; not frozen; not production). Copy of V3_R2 with the changes marked [R3].
 * Entry: resolveSR({ packet, run_record, cg1_extension? }, { lane: 'A' | 'B', correction: <ECC row> | null }) → SR Direction record.
 *   MODE A = lane B on the frozen packet. MODE B = MODE A input + a versioned correction row (validation only). The modes are separate calls and are never merged.
 *   → GOVERNING UPPER = packet upper_realization.source_refs[0]
 *   → FACTS: SVP-007 relation · SVP-008 shoulder · SVP-009 shape · SVP-106 / SVP-119 @gov · SVP-011→gov · SVP-124 material / SVP-123 surface @gov
 *   → S/R: Lane A = V2 governed (unchanged, comparison only); Lane B = constitution V3_R3 — [R3] mandatory scoring (CEO 2026-10-24): every scorable input
 *     returns S or R; an unobserved fact contributes nothing (MS-1); missingness is reported as basis.missing_observations + sensitivity, never as a status.
 *   → [R3] a CG-1 sidecar (retired candidate) is IGNORED and logged; it is never read for a decision.
 *   → [R3] the only non-direction outcomes are INPUT FAILURES (TECHNICAL_EXCEPTION · INPUT_CONTRACT / UPPER_NOT_VISIBLE / NO_UPPER_SR_EVIDENCE).
 * Lower-body garments, length, garment type, closure method, colour, pattern, attachment, look ids, file names and GT are never read.
 */
const crypto = require('crypto');
const A = require('./fl_sr_authority_v3_r4.js'); const IN = require('./fl_sr_input_adapter_v1.js'); const C = require('./fl_sr_binary_constitution_v3_r4.js');
let V2m = null; const V2 = { resolveSR: (x) => { if (!V2m) { A.verifyLaneA(); V2m = require(A.V2DIR + 'src/fl_sr_direction_resolver_v2.js'); } return V2m.resolveSR(x); } };   /* [R4] lane A loaded lazily (comparison only; never on the production lane-B path) */
const WAIST_CARRIER = new Set(['Jacket', 'Coat', 'Dress', 'Jumpsuit']); const SIX = ['relation', 'shoulder', 'shape', 'drop', 'waist', 'constriction'];
const packetSha = (p) => crypto.createHash('sha256').update(JSON.stringify(p, null, 1)).digest('hex');   // the frozen release writes packet.json as JSON.stringify(packet, null, 1)
function assertBinary(o) { if (o.direction === 'NEUTRAL') throw new Error('NEUTRAL_EMISSION_PROHIBITED'); if (o.status === 'RESOLVED' && !A.REQUIREMENT.resolved_directions.includes(o.direction)) throw new Error('RESOLVED_DIRECTION_NOT_BINARY ' + o.direction); if (o.status !== 'RESOLVED' && o.direction !== null) throw new Error('NON_RESOLVED_WITH_DIRECTION'); return o; }
const poolFact = (packet, gov, k) => { const f = (packet.component_fact_pool || []).find((x) => x.component_ref === gov && x.fact === k); return !f ? 'NOT_IN_POOL' : f.state === 'OBSERVED' ? [].concat(f.value) : f.state; };
/** frozen governing-upper facts (raw states kept) */
function extract(packet, rec) {
  const L = IN.lookFromPacket(packet, rec); const gov = (packet.upper_realization.source_refs || [])[0] || null; const ent = L.comps.find((c) => c.ref === gov);
  const st = (x) => (x ? (x.state === 'OBSERVED' ? x.value : x.state) : 'ABSENT'); const cell = (k) => L.cell(k);
  const d = gov ? cell('SVP-106@' + gov) : null, w = gov ? cell('SVP-119@' + gov) : null; const sec = (packet.relations.securing_relations || []).filter((s) => s.affected_ref === gov);
  return { governing_upper: gov ? gov + ' ' + (ent ? ent.identity : '?') : null, gov, identity: ent ? ent.identity : null, frame: L.frame ? L.frame.state : null,
    relation: st(packet.upper_realization.relation), shoulder: st(packet.upper_realization.shoulder), shape: st(packet.upper_realization.shape_behaviour),
    drop: d ? (d.state === 'OBSERVED' ? d.value : d.state) : 'ABSENT', waist: w ? (w.state === 'OBSERVED' ? w.value : w.state) : 'ABSENT',
    constriction: sec.some((s) => s.visible_constriction && s.visible_constriction.state === 'OBSERVED') ? 'OBSERVED' : sec.length ? 'UNKNOWN' : 'NONE_LISTED',
    material: gov ? poolFact(packet, gov, 'material') : 'NOT_IN_POOL', surface: gov ? poolFact(packet, gov, 'surface') : 'NOT_IN_POOL' };
}
/** form-retention support (Item R3d classes): true = observed · false = both facts determinate and no class value · null = unreadable (missing) */
function formRetention(material, surface) {
  const arr = (v) => (Array.isArray(v) ? v : []); const support = arr(material).filter((v) => A.FORM_RETAINING_MATERIAL.includes(v)).map((v) => 'MATERIAL_' + v.toUpperCase()).concat(arr(surface).filter((v) => A.STRUCTURE_RELEVANT_SURFACE.includes(v)).map((v) => 'SURFACE_' + v.toUpperCase()));
  const det = (v) => Array.isArray(v) || v === 'ABSENT'; return { value: support.length ? true : det(material) && det(surface) ? false : null, support, reading: support.length ? 'SUPPORT_OBSERVED' : det(material) && det(surface) ? 'NO_SUPPORT_OBSERVED' : 'SUPPORT_NOT_READABLE' };
}
/** normalise raw facts to rule inputs (null = missing); explicit, field by field */
function toInputs(f) {   // [R3] no torso input
  const inDom = (k, v) => (A.DOMAINS[k].includes(v) ? v : null);
  const waist = A.DOMAINS.waist.includes(f.waist) ? f.waist : (f.waist === 'ABSENT' && !WAIST_CARRIER.has(f.identity) ? 'Undefined' : null);
  const constriction = f.constriction === 'OBSERVED' ? true : f.constriction === 'ABSENT' || f.constriction === 'NONE_LISTED' ? false : null;
  return { relation: inDom('relation', f.relation), shoulder: inDom('shoulder', f.shoulder), shape: inDom('shape', f.shape), drop: inDom('drop', f.drop), waist, constriction, form_retention: formRetention(f.material, f.surface).value };
}
function applyCorrection(f, row) { const g = Object.assign({}, f), src = {}; for (const k of Object.keys(f)) src[k] = 'FROZEN'; if (!row) return { facts: g, sources: src, diff: [] };
  for (const d of row.diff) { if (!SIX.concat(['material', 'surface']).includes(d.field)) throw new Error('CORRECTION_FIELD_NOT_ALLOWED ' + d.field); g[d.field] = d.corrected; src[d.field] = d.source + (d.ecc_class ? ' · ' + d.ecc_class : ''); } return { facts: g, sources: src, diff: row.diff }; }
/** [R3] the CG-1 sidecar is retired (live validation NOT_VALIDATED): it is never read for a decision; its presence is only logged */
const sidecarNote = (ext) => (ext === undefined || ext === null ? 'none supplied' : 'supplied — IGNORED (CG-1 retired; R3 reads no sidecar)');
/** [R3] observed evidence used for the decision, per field (raw facts; nothing completed) */
const usedOf = (x) => C.FIELDS.filter((f) => x[f] !== null && x[f] !== undefined).map((f) => f + '=' + JSON.stringify(x[f]));
function resolveSR(input, opts) {
  const o = Object.assign({ lane: 'B', correction: null }, opts || {}); const packet = input && input.packet, rec = input && input.run_record; const trace = [];
  const base = { axis: 'SR', resolver: A.RESOLVER_ID, lane: o.lane, evidence_mode: o.lane === 'A' ? 'FROZEN' : o.correction ? 'MODE_B_CORRECTED_CANDIDATE (' + (o.correction.ecc_version || 'ECC') + ')' : 'MODE_A_FROZEN' };   // [R3] a supplied CG-1 sidecar does not change the evidence mode (it is ignored)
  if (o.lane === 'A') { if (o.correction || (input && input.cg1_extension)) throw new Error('LANE_A_TAKES_FROZEN_EVIDENCE_ONLY'); const v = V2.resolveSR(input);
    return assertBinary(Object.assign(base, { authority: 'GOVERNED (SR V2, CEO-approved semantics only)', direction: v.status === 'RESOLVED' ? v.direction : null, status: v.status, rule: v.rule, lane_a_category: v.unresolved_reason ? v.unresolved_reason.category : null, pending_candidate: v.pending_candidate, trace: v.rule_trace })); }
  const fail = (code, detail) => assertBinary(Object.assign(base, { authority: A.CONSTITUTION_ID, direction: null, status: 'TECHNICAL_EXCEPTION', exception: { code, class: 'INPUT_FAILURE', detail, remediation: A.EXCEPTIONS[code] || A.EXCEPTIONS.INPUT_CONTRACT }, trace: [code + ': ' + detail] }));
  try { IN.validateInput(packet, rec); } catch (e) { if (e instanceof IN.InputContractError) return fail('INPUT_CONTRACT', e.message); throw e; }
  const frozen = extract(packet, rec);
  const { facts, sources, diff } = applyCorrection(frozen, o.correction); const fr = formRetention(facts.material, facts.surface);
  trace.push('GOVERNING UPPER: ' + frozen.governing_upper + ' · frame ' + frozen.frame);
  trace.push('FACTS: ' + SIX.map((k) => k + ' ' + facts[k] + (sources[k] !== 'FROZEN' ? ' [' + sources[k] + ']' : '')).join(' · '));
  trace.push('FORM RETENTION (SVP-124 / SVP-123): material ' + JSON.stringify(facts.material) + (sources.material !== 'FROZEN' ? ' [' + sources.material + ']' : '') + ' · surface ' + JSON.stringify(facts.surface) + (sources.surface !== 'FROZEN' ? ' [' + sources.surface + ']' : '') + ' → ' + fr.reading + (fr.support.length ? ' ' + fr.support.join('+') : ''));
  trace.push('CG-1 sidecar: ' + sidecarNote(input.cg1_extension));
  const ev = { governing_upper: frozen.governing_upper, frozen, used: facts, sources, correction_diff: diff, form_retention: fr, cg1_sidecar: sidecarNote(input.cg1_extension), not_used: 'lower-body garments · length · garment type · closure method · colour · pattern · attachment · belts as objects · accessories · CG-1 sidecar' };
  // [R3] input failure = no observable look frame or no governing upper (a relation NOT_VISIBLE alone is a missing fact, not a failure — DR-07)
  if ((frozen.frame && frozen.frame !== 'OBSERVED') || !frozen.governing_upper) { trace.push('INPUT FAILURE: UPPER_NOT_VISIBLE'); return assertBinary(Object.assign(base, { authority: A.CONSTITUTION_ID, direction: null, status: 'TECHNICAL_EXCEPTION', exception: { code: 'UPPER_NOT_VISIBLE', class: 'INPUT_FAILURE', remediation: A.EXCEPTIONS.UPPER_NOT_VISIBLE }, evidence: ev, trace })); }
  const x = toInputs(facts); trace.push('INPUTS (observed; null = not observed): ' + JSON.stringify(x));
  if (['relation', 'shoulder', 'shape', 'drop'].every((f) => x[f] === null)) { trace.push('INPUT FAILURE: NO_UPPER_SR_EVIDENCE'); return assertBinary(Object.assign(base, { authority: A.CONSTITUTION_ID, direction: null, status: 'TECHNICAL_EXCEPTION', exception: { code: 'NO_UPPER_SR_EVIDENCE', class: 'INPUT_FAILURE', remediation: A.EXCEPTIONS.NO_UPPER_SR_EVIDENCE }, evidence: ev, trace })); }
  const r = C.resolveInputs(x);
  if (r.status !== 'RESOLVED') { trace.push('INPUT FAILURE: ' + r.code + ' ' + r.detail); return assertBinary(Object.assign(base, { authority: A.CONSTITUTION_ID, direction: null, status: 'TECHNICAL_EXCEPTION', exception: { code: r.code, class: 'INPUT_FAILURE', detail: r.detail, remediation: A.EXCEPTIONS[r.code] }, evidence: ev, trace })); }
  if (r.missing_observations.length) trace.push('MS-1 (not observed → no contribution): ' + r.missing_observations.map((f) => f + ' — ' + r.ms1_readings[f]).join(' · '));
  trace.push('RESOLVED ' + r.direction + ' via ' + r.rule + ' · sensitivity ' + r.sensitivity + (r.sensitivity === 'POSSIBLE' ? ' (could be ' + r.possible_outcomes_if_observed.join(' / ') + ' if ' + r.sensitive_to.join(', ') + ' were observed)' : ''));
  const basis = { governing_region: 'UPPER', governing_upper: frozen.governing_upper, rule: r.rule, rule_meaning: A.RULES_B[r.rule].meaning, evidence_used: usedOf(x), missing_observations: r.missing_observations, sensitivity: r.sensitivity, sensitive_to: r.sensitive_to, possible_outcomes_if_observed: r.possible_outcomes_if_observed };
  return assertBinary(Object.assign(base, { authority: A.CONSTITUTION_ID, direction: r.direction, status: 'RESOLVED', rule: r.rule, rules: [r.rule], resolved_by: r.resolved_by, basis, evidence: ev, trace }));
}
module.exports = { RESOLVER_ID: A.RESOLVER_ID, resolveSR, extract, toInputs, applyCorrection, assertBinary, formRetention, packetSha };
