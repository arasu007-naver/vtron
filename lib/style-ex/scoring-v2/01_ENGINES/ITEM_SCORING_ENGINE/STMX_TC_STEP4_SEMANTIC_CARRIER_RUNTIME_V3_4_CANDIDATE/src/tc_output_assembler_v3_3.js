'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3.3 — PROVENANCE / STATUS OUTPUT. Successor of the sealed V3.2 assembler; V3.2 text carried verbatim except
 * the validation of P-3 composed units (order V2.3.61 §12): a positive reading whose provenance rule is the P-3 composition rule is validated MEMBER BY
 * MEMBER — every member carries provenance; a BASE member carries positive-retention evidence (never absent evidence); an S4 member reads NOT, an S5-CEO
 * member reads MOST_PROMINENT with referent BODY_FORM; an INTERVENTION member reads MOST_PROMINENT per Statement; a unit INTERVENTION needs ≥1
 * INTERVENTION member and no UNRESOLVED member; a unit BASE needs every member BASE. Single-member units are validated exactly as in V3.2.
 * No new vocabulary; consumed-evidence provenance (P-2) must be present per Statement for every positive reading.
 *
 * V3.2 header (carried):
 * STMX TC Step 4 semantic carrier runtime V3.2 — PROVENANCE / STATUS OUTPUT. Successor of the sealed V3.1 assembler; V3.1 text carried verbatim
 * except the L-2 output validation (order V2.3.59 §8): EVERY positive BASE_GRAMMAR_PRINCIPAL (S4 and S5-CEO) must carry positive-retention
 * evidence per constitutive system and never rest on absent evidence (KEY_OMITTED · NOT_VISIBLE · UNKNOWN · ABSENT).
 *
 * V3.1 header (carried):
 * STMX TC Step 4 semantic carrier runtime V3.1 — PROVENANCE / STATUS OUTPUT. Successor of the sealed V3 assembler (2fe6d71b…); V3 text carried
 * verbatim except: a positive BASE_GRAMMAR_PRINCIPAL under rule D-FWD-2-S5/CEO-2026-09-25 must carry MOST_PROMINENT organising reading with
 * referent BODY_FORM per Statement, every constitutive system RETAINED, and positive-retention evidence per system (never absent evidence).
 * Every other positive BASE still requires organising reading NOT (S4).
 * V1 / V2 validation carried; R1 checks replaced by prominence / organising-relation checks:
 *   process_trace — constitutive_system_status ∈ {RETAINED, SUBORDINATED, DISPLACED, UNRESOLVED} with per-system basis;
 *                   organising_reading ∈ {MOST_PROMINENT, NOT, UNDETERMINED}; every prominence predicate ∈ {PROMINENT, NOT_PROMINENT, UNKNOWN}
 *   positive identity_participation — rule + reference row + CHARACTERISTIC construction + organising_role MOST_PROMINENT (MATERIAL) /
 *                   ANOTHER_SYSTEM_MORE_PROMINENT (INCIDENTAL) + four evaluable predicates
 *   positive whole_garment_reading — rule + organising_reading per Statement (MOST_PROMINENT for S3 · NOT for S4)
 * The frozen Step 3 Grammar State fields are attached after both evaluators have returned (G60: downstream output only).
 * No ordinal tier, score, count or TC field exists in this output contract (G59).
 */
const V = require('./tc_semantic_vocabulary_v3');
const CEO_S5_RULE = 'D-FWD-2-S5/CEO-2026-09-25';

class UnclassifiedOutputError extends Error { constructor(m) { super(m); this.name = 'UnclassifiedOutputError'; } }

const FORBIDDEN_OUTPUT_KEY = /^(tc|tier|score|ordinal|magnitude_score|strength|count_displaced|n_displaced|classic_strength|intensity|prominence_score|dominance_score|organiser_score|weight|rank)$/i;

function fail(anchor, what) { throw new UnclassifiedOutputError(anchor + ': ' + what); }

function assertNoTierField(obj, anchor) {
  const walk = (o) => {
    if (o === null || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (FORBIDDEN_OUTPUT_KEY.test(k)) fail(anchor, 'forbidden output field ' + k);
      if (typeof v === 'string' && /^TC\d$/.test(v)) fail(anchor, 'tier token in output at ' + k);
      if (typeof v === 'number' && k !== 'statement_set_size') fail(anchor, 'numeric value in semantic output at ' + k);
      walk(v);
    }
  };
  walk(obj);
}

function validatePredicates(a, prom) {
  for (const s of V.PROMINENCE_SYSTEMS) { if (!prom || !prom[s] || !V.PROMINENCE_VALUES.includes(prom[s].value)) fail(a, 'prominence predicate ' + s + ' missing / illegal'); }
}

function validateTrace(a, trace) {
  if (trace === null || trace === undefined) return;
  for (const t of trace) {
    if (t.statement === null) { // V3.3 P-3: member without a Statement — retention trace only (no organising reading exists for it)
      if (!V.WHOLE_GARMENT_READING.includes(t.member_reading)) fail(a, 'process_trace member reading illegal');
      for (const s of t.constitutive_system_status || []) if (!V.CONSTITUTIVE_SYSTEM_STATUS.includes(s.status) || !s.basis || !s.system) fail(a, 'constitutive_system_status without per-system provenance');
      continue;
    }
    if (!t.organising_reading || !V.TRANSFORMATIVE_RELATION.includes(t.organising_reading.value)) fail(a, 'process_trace organising_reading illegal');
    validatePredicates(a, t.prominence);
    for (const s of t.constitutive_system_status || []) {
      if (!V.CONSTITUTIVE_SYSTEM_STATUS.includes(s.status)) fail(a, 'constitutive_system_status ' + s.status);
      if (!s.basis || !s.system) fail(a, 'constitutive_system_status without per-system provenance');
    }
  }
}

const COMPOSITION_RULE = 'P-3/S-1 member composition (CEO D-60 APPROVED 2026-09-26)';
const ABSENT_EVIDENCE = /not positively evidenced|KEY_OMITTED|NOT_VISIBLE|UNKNOWN|ABSENT/;
function validateComposed(a, value, p) {
  const ms = p.member_readings; if (!Array.isArray(ms) || ms.length < 2) fail(a, 'P-3 composed reading without member provenance for every member');
  for (const m of ms) {
    if (!V.WHOLE_GARMENT_READING.includes(m.value) || m.value === 'UNRESOLVED') fail(a, 'P-3 member ' + m.garment_ref + ' not positively read');
    if (!m.constitutive_system_status || !m.constitutive_system_status.length) fail(a, 'P-3 member ' + m.garment_ref + ' without constitutive provenance');
    if (m.organising_reading.length !== m.statements.length) fail(a, 'P-3 member organising reading misaligned');
    if (m.value === 'BASE_GRAMMAR_PRINCIPAL') {
      if (!m.positive_retention || !m.positive_retention.length || m.positive_retention.some((b) => ABSENT_EVIDENCE.test(b))) fail(a, 'P-3 BASE member ' + m.garment_ref + ' on absent evidence');
      if (m.constitutive_system_status.some((s) => s.status !== 'RETAINED')) fail(a, 'P-3 BASE member with a non-RETAINED system');
      if (m.statements.length) { const need = m.rule === CEO_S5_RULE ? 'MOST_PROMINENT' : 'NOT'; if (m.organising_reading.some((r) => r.value !== need || (need === 'MOST_PROMINENT' && r.referent !== 'BODY_FORM'))) fail(a, 'P-3 BASE member organising reading ≠ ' + need); }
    } else {
      if (!m.statements.length || m.organising_reading.some((r) => r.value !== 'MOST_PROMINENT')) fail(a, 'P-3 INTERVENTION member without MOST_PROMINENT per Statement');
      if (!m.constitutive_system_status.some((s) => s.status === 'SUBORDINATED' || s.status === 'DISPLACED')) fail(a, 'P-3 INTERVENTION member without an intervened system');
    }
  }
  if (value === 'BASE_GRAMMAR_PRINCIPAL' && ms.some((m) => m.value !== 'BASE_GRAMMAR_PRINCIPAL')) fail(a, 'P-3 unit BASE with a non-BASE member');
  if (value === 'INTERVENTION_PRINCIPAL' && !ms.some((m) => m.value === 'INTERVENTION_PRINCIPAL')) fail(a, 'P-3 unit INTERVENTION without an INTERVENTION member');
  if (p.organising_reading.length !== p.statements.length) fail(a, 'P-3 unit organising reading misaligned');
  (p.prominence || []).forEach((pr) => validatePredicates(a, pr));
  if ((p.prominence || []).some((pr) => V.PROMINENCE_SYSTEMS.some((s) => pr[s].value === 'UNKNOWN'))) fail(a, 'P-3 positive reading with an UNKNOWN predicate');
}

function validateTransformative(t) {
  const a = t.anchor_id;
  const w = t.whole_garment_reading;
  if (!V.WHOLE_GARMENT_READING.includes(w.value)) fail(a, 'whole_garment_reading ' + w.value);
  if (w.value === 'UNRESOLVED') {
    if (!V.UNRESOLVED_CAUSE.includes(w.primary_cause)) fail(a, 'unresolved whole_garment_reading without governed cause');
    if (w.provenance !== null) fail(a, 'unresolved whole_garment_reading carries provenance');
  } else {
    if (w.primary_cause !== null) fail(a, 'positive whole_garment_reading carries a cause');
    const p = w.provenance;
    if (!p || !p.criteria || !p.criteria.length || !p.statements || !p.statements.length || !p.rule) fail(a, 'positive whole_garment_reading without rule + criterion + item provenance');
    if (!Array.isArray(p.consumed_by_constitutive_relation) || p.consumed_by_constitutive_relation.length !== p.statements.length) fail(a, 'positive whole_garment_reading without per-Statement evidence-ownership provenance (P-2)');
    if (p.rule === COMPOSITION_RULE || p.composition === COMPOSITION_RULE) { validateComposed(a, w.value, p); validateTrace(a, w.process_trace); const r0 = t.statement_relation; if (!V.STATEMENT_RELATION.includes(r0.value)) fail(a, 'statement_relation ' + r0.value); return; }
    const ceo = w.value === 'BASE_GRAMMAR_PRINCIPAL' && p.rule === CEO_S5_RULE;
    const need = w.value === 'INTERVENTION_PRINCIPAL' || ceo ? 'MOST_PROMINENT' : 'NOT';
    if (!p.organising_reading || p.organising_reading.length !== p.statements.length || p.organising_reading.some((r) => r.value !== need)) fail(a, 'positive whole_garment_reading without ' + need + ' organising_reading per Statement');
    if (ceo) {
      if (p.organising_reading.some((r) => r.referent !== 'BODY_FORM')) fail(a, 'S5-CEO BASE without BODY_FORM as the sole prominent system');
      if (!p.retained_systems || p.retained_systems.length !== p.statements.length || p.retained_systems.some((rs) => !rs.length || rs.some((x) => x.status !== 'RETAINED'))) fail(a, 'S5-CEO BASE with a constitutive system not RETAINED');
      if (!p.positive_retention || p.positive_retention.length !== p.statements.length || p.positive_retention.some((rs, i) => rs.length !== p.retained_systems[i].length)) fail(a, 'S5-CEO BASE without positive-retention evidence per system');
      if (p.positive_retention.flat().some((b) => /not positively evidenced|KEY_OMITTED|NOT_VISIBLE|UNKNOWN|ABSENT/.test(b))) fail(a, 'S5-CEO BASE on absent evidence');
    }
    if (w.value === 'BASE_GRAMMAR_PRINCIPAL') { // L-2 (V3.2): positive retention for every BASE (S4 included)
      if (!p.retained_systems || !p.positive_retention || p.positive_retention.length !== p.statements.length || p.positive_retention.some((rs, i) => rs.length !== p.retained_systems[i].length)) fail(a, 'BASE without positive-retention evidence per system');
      if (p.positive_retention.flat().some((b) => /not positively evidenced|KEY_OMITTED|NOT_VISIBLE|UNKNOWN|ABSENT/.test(b))) fail(a, 'BASE on absent evidence');
    }
    (p.prominence || []).forEach((pr) => validatePredicates(a, pr));
    if ((p.prominence || []).some((pr) => V.PROMINENCE_SYSTEMS.some((s) => pr[s].value === 'UNKNOWN'))) fail(a, 'positive whole_garment_reading with an UNKNOWN predicate');
  }
  validateTrace(a, w.process_trace);
  const r = t.statement_relation;
  if (!V.STATEMENT_RELATION.includes(r.value)) fail(a, 'statement_relation ' + r.value);
  if (r.value === 'UNRESOLVED' && !V.UNRESOLVED_CAUSE.includes(r.cause)) fail(a, 'unresolved statement_relation without governed cause');
  if ((r.value === 'COORDINATED' || r.value === 'UNRELATED') && !r.provenance) fail(a, 'positive statement_relation without provenance');
}

function validateClassic(c) {
  const a = c.anchor_id;
  for (const m of c.members) {
    for (const ch of V.CHANNELS) {
      const x = m.realization_relation[ch];
      if (!V.REALIZATION_RELATION.includes(x.value)) fail(a, 'realization_relation ' + x.value);
      if (x.value === 'UNRESOLVED' && !V.UNRESOLVED_CAUSE.includes(x.cause)) fail(a, 'unresolved realization_relation without governed cause');
      if (x.value !== 'UNRESOLVED' && !(x.provenance && x.provenance.reference_row)) fail(a, 'positive realization_relation without provenance');
    }
    const ip = m.identity_participation;
    if (!V.IDENTITY_PARTICIPATION.includes(ip.value)) fail(a, 'identity_participation ' + ip.value);
    if (ip.value === 'UNRESOLVED' && !V.UNRESOLVED_CAUSE.includes(ip.cause)) fail(a, 'unresolved identity_participation without governed cause');
    if (ip.value !== 'UNRESOLVED') {
      const p = ip.provenance;
      if (!p || !p.rule || !p.reference_row || !p.construction_realization || p.construction_realization.value !== 'CHARACTERISTIC' || !p.organising_role) fail(a, 'positive identity_participation without D-7 successor provenance');
      validatePredicates(a, p.prominence);
      if (V.PROMINENCE_SYSTEMS.some((s) => p.prominence[s].value === 'UNKNOWN')) fail(a, 'positive identity_participation with an UNKNOWN predicate');
      if ((ip.value === 'MATERIAL') !== (p.organising_role.value === 'MOST_PROMINENT')) fail(a, 'identity_participation inconsistent with organising_role');
      if (ip.value === 'INCIDENTAL' && p.organising_role.value !== 'ANOTHER_SYSTEM_MORE_PROMINENT') fail(a, 'INCIDENTAL without ANOTHER_SYSTEM_MORE_PROMINENT');
    }
  }
}

function assemble(unit, salience, transformative, classic) {
  const out = {
    anchor_id: unit.upstream.anchor_id,
    direction: unit.upstream.direction === undefined ? null : unit.upstream.direction,
    statement_set: unit.upstream.statement_set || [],
    salience: {
      admitted: salience.admitted,
      rejected: salience.rejected,
      not_evaluable: salience.not_evaluable,
      ownerless_departures: salience.ownerless_departures,
      ownerless: !!unit.upstream.ownerless,
      materialization_verified: true,
    },
    transformative,
    classic,
    grammar_state_output: { grammar_state: unit.downstream.grammar_state, resolution_status: unit.downstream.resolution_status, unresolved_category: unit.downstream.unresolved_category },
  };
  if (transformative) validateTransformative(transformative);
  if (classic) validateClassic(classic);
  assertNoTierField({ transformative, classic }, out.anchor_id);
  return out;
}

module.exports = { assemble, validateTransformative, validateComposed, validateClassic, validateTrace, validatePredicates, assertNoTierField, UnclassifiedOutputError, CEO_S5_RULE, COMPOSITION_RULE };
