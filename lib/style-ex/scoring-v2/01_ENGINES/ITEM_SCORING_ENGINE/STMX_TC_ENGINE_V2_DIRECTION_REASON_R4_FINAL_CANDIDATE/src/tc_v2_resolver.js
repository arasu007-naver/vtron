'use strict';
/**
 * STMX TC V2 — MANDATORY DIRECTION RESOLVER (Transformative / Classic). ⛔ No Neutral, no UNRESOLVED output, no Strength, no ordinal, no number.
 *
 * Paths, evaluated in order (CEO order 2026-10-28 §3 – §8 · Option C):
 *   FROZEN_V1           the frozen TC V1 unit Direction is CLASSIC or TRANSFORMATIVE → carried VERBATIM (incl. the frozen pair / set rule; never re-derived)
 *   (successor — only for a frozen DIRECTION_UNRESOLVED unit; UNRESOLVED is an internal intermediate state)
 *   DOMAIN_INVARIANT    every member's frozen predicates give the same Direction for EVERY admissible value of its missing inputs (TC-Q3), and a Classic
 *                       invariant is grounded on an observed carrier                                                              → that Direction
 *   ZERO_EVIDENCE       no member has a GROUNDED conventional channel (no observed carrier on any channel evaluated conventional) (TC-ZE) → CLASSIC
 *   EVIDENCE_BOUNDED    no observed Departure; every member: archetype key resolved, no open Departure candidate, Construction conventional on an
 *                       OBSERVED construction carrier (TC-Q1′)                                                                     → CLASSIC
 *   MANDATORY_FALLBACK  otherwise (key unresolved — TC-Q2 · open Departure candidate · Construction not grounded): best-supported Direction under the
 *                       candidate policy, recorded as a policy choice (TC-Q1′ / TC-Q2)                                             → CLASSIC
 * GROUNDED channel: evaluated FALSE (conventional) AND at least one of its own carriers is OBSERVED (fit · length · a construction carrier). A frozen
 *   Construction FALSE alone is not a basis: the frozen C-1 predicate returns FALSE even for an empty token set.
 * Set membership on frozen verdicts only — no count, weight, threshold, category default, GT, REF or score.
 */
/* R4 (CEO 2026-10-28 · R3-B2) — one successor path added BEFORE DOMAIN_INVARIANT, for a member whose archetype key is unresolved (type / subtype not observed):
 *   CATEGORY_INDEPENDENT_DEPARTURE  the frozen Construction predicate gives the same audited category-independent Departure in EVERY admissible archetype key
 *                                   (tc_v2_category_independence) → TRANSFORMATIVE. A Departure that holds only in some keys is category-dependent: never a
 *                                   Direction, recorded as opposing evidence (key_domain_candidates) and cited concessively in a Classic Reason. */
const DI = require('./tc_v2_domain_invariance'); const CI = require('./tc_v2_category_independence');
const PATHS = ['FROZEN_V1', 'CATEGORY_INDEPENDENT_DEPARTURE', 'DOMAIN_INVARIANT', 'ZERO_EVIDENCE', 'EVIDENCE_BOUNDED', 'MANDATORY_FALLBACK'];
const CON_FIELDS = ['sleeve', 'collar', 'closure_type', 'front_opening_extent', 'pocket_projection', 'material', 'surface', 'attachment', 'slit'];
const seen = (v) => typeof v === 'string' && v !== '' && v !== 'n/a' && !/^</.test(v);
const fitSeen = (m) => seen(m.record.observed && m.record.observed.fit) || !!(m.input && m.input.fit && m.input.fit.byRegion && Object.values(m.input.fit.byRegion).some((v) => v != null && (typeof v === 'string' || v.value != null)));
function groundedChannels(m) { const r = m.record, o = r.observed || {};
  return [].concat(r.silhouette.v === 'FALSE' && fitSeen(m) ? ['silhouette'] : [], r.proportion.v === 'FALSE' && seen(o.length) ? ['proportion'] : [], r.construction.v === 'FALSE' && CON_FIELDS.some((f) => seen(o[f])) ? ['construction'] : []); }
const openCandidate = (m) => m.record.silhouette.v === 'UNRESOLVED' && /SIL-MORPH/.test(m.record.silhouette.rule);
/* an observed Construction Departure candidate whose role / location the frozen predicate could not settle (e.g. CON-UNRES-OPENWORK-ROLE-NOT-OBSERVED) —
   opposing evidence: recorded in the trace and cited concessively in the Reason; it never decides the Direction by itself */
const constructionCandidate = (m) => m.record.construction.v === 'UNRESOLVED' && /^CON-UNRES-/.test(m.record.construction.rule) && seen(m.record.observed && m.record.observed[m.record.construction.carrier]);
const anyDeparture = (m) => ['silhouette', 'proportion', 'construction'].some((c) => m.record[c].v === 'TRUE') || !!(m.record.asymmetry && m.record.asymmetry.departure_exists);
const missingFields = (m) => { const r = m.record, out = []; if (r.silhouette.v === 'UNRESOLVED' && r.silhouette.rule === 'SIL-STATE') out.push('fit'); if (r.proportion.v === 'UNRESOLVED' && r.proportion.rule === 'PRO-STATE') out.push('length'); if (!r.key_resolved) out.push('subtype'); return out; };
/** @param unit { v1_direction, members:[{record, input}], upstream } @returns { direction, path, ... } — never UNRESOLVED */
function resolve(unit, opts) {
  const v1 = unit.v1_direction; const ms = unit.members || [];
  if (v1 === 'CLASSIC' || v1 === 'TRANSFORMATIVE') return { direction: v1, path: 'FROZEN_V1', policy: null, provisional: false };
  if (v1 !== 'DIRECTION_UNRESOLVED') throw new Error('TC V2 RESOLVER CONTRACT: frozen unit Direction must be CLASSIC · TRANSFORMATIVE · DIRECTION_UNRESOLVED, got ' + v1);
  if (!ms.length) throw new Error('TC V2 RESOLVER CONTRACT: a valid unit has at least one member');
  const grounded = ms.map(groundedChannels); const missing = [...new Set([].concat(...ms.map(missingFields)))]; const opposing = ms.filter(openCandidate).map((m) => m.record.silhouette.why).concat(ms.filter(constructionCandidate).map((m) => m.record.construction.rule + ' (' + m.record.construction.carrier + ' = ' + m.record.observed[m.record.construction.carrier] + ')'));
  const base = { grounded_channels: grounded, missing_fields: missing, opposing_evidence: opposing };
  /* defensive: a frozen UNRESOLVED unit never carries a TRUE channel; if one appears, the frozen departure-first rule decides */
  if (ms.some(anyDeparture)) return Object.assign({ direction: 'TRANSFORMATIVE', path: 'FROZEN_V1', policy: null, provisional: false, note: 'member-level Departure present' }, base);
  /* R4 · R3-B2 — category-independent frozen Construction Departure of a member whose archetype key is unresolved */
  const ci = ms.map((m) => CI.evaluate(m)); const ciInfo = ci.map((c) => (c.applicable ? { verdict: c.verdict, rule: c.rule || null, evidence: c.evidence || null, keys: c.keys, category_dependent: c.category_dependent || null, residual_common: c.residual_common || null } : { verdict: null, why: c.why }));
  base.category_independence = ciInfo;
  const ciHit = ci.findIndex((c) => c.applicable && c.verdict === 'CATEGORY_INDEPENDENT_DEPARTURE');
  if (ciHit >= 0) return Object.assign({ direction: 'TRANSFORMATIVE', path: 'CATEGORY_INDEPENDENT_DEPARTURE', policy: 'TC-Q3', provisional: true, ci_member: ciHit, category_independent: { rule: ci[ciHit].rule, evidence: ci[ciHit].evidence, keys: ci[ciHit].keys } }, base);
  /* category-dependent Departures / role-not-observed residuals of an unresolved-key member: opposing evidence (never a Direction) */
  base.key_domain_candidates = []; ci.forEach((c, i) => { if (!c.applicable) return; if (c.category_dependent) base.key_domain_candidates.push({ member: i, kind: 'CATEGORY_DEPENDENT', rules: c.category_dependent.rules, carrier: c.category_dependent.carrier, keys: c.category_dependent.keys.length + '/' + c.keys }); if (c.residual_common) base.key_domain_candidates.push({ member: i, kind: 'ROLE_NOT_OBSERVED', rules: [c.residual_common.rule], carrier: c.residual_common.carrier, keys: c.keys + '/' + c.keys }); });
  for (const k of base.key_domain_candidates) opposing.push(k.rules.join('+') + ' (' + k.kind + ' · ' + k.carrier + ' · ' + k.keys + ' keys)');
  const di = ms.map((m) => DI.evaluate(m, opts));
  const diAll = di.every((d) => d.applicable) ? [...new Set(di.map((d) => d.verdict))] : null;
  const diInfo = di.map((d) => ({ applicable: d.applicable, why: d.why || null, missing: d.missing, completions: d.completions || 0, verdict: d.verdict || null, invariant_channel: d.invariant_channel || null }));
  /* INVARIANT_TRANSFORMATIVE requires one member with an invariant Departure on a channel independent of the completed inputs (no T from a hypothetical value) */
  if (di.some((d) => d.applicable && d.verdict === 'INVARIANT_TRANSFORMATIVE')) return Object.assign({ direction: 'TRANSFORMATIVE', path: 'DOMAIN_INVARIANT', policy: 'TC-Q3', provisional: true, domain_invariance: diInfo, invariant_channel: di.find((d) => d.verdict === 'INVARIANT_TRANSFORMATIVE').invariant_channel, invariant_member: di.findIndex((d) => d.verdict === 'INVARIANT_TRANSFORMATIVE') }, base);
  if (diAll && diAll.length === 1 && diAll[0] === 'INVARIANT_CLASSIC' && grounded.every((g) => g.length)) return Object.assign({ direction: 'CLASSIC', path: 'DOMAIN_INVARIANT', policy: 'TC-Q3', provisional: true, domain_invariance: diInfo }, base);
  if (grounded.every((g) => !g.length)) return Object.assign({ direction: 'CLASSIC', path: 'ZERO_EVIDENCE', policy: 'TC-ZE', provisional: true, domain_invariance: diInfo, physically_grounded: false }, base);
  const bounded = ms.every((m, i) => m.record.key_resolved && !openCandidate(m) && grounded[i].includes('construction'));
  if (bounded) return Object.assign({ direction: 'CLASSIC', path: 'EVIDENCE_BOUNDED', policy: "TC-Q1'", provisional: true, domain_invariance: diInfo }, base);
  return Object.assign({ direction: 'CLASSIC', path: 'MANDATORY_FALLBACK', policy: ms.some((m) => !m.record.key_resolved) ? 'TC-Q2' : "TC-Q1'", provisional: true, domain_invariance: diInfo, fallback_basis: ms.some((m) => !m.record.key_resolved) ? 'ARCHETYPE_SUBTYPE_UNRESOLVED' : opposing.length ? 'OPEN_DEPARTURE_CANDIDATE_OBSERVED' : 'CONSTRUCTION_NOT_GROUNDED' }, base);
}
module.exports = { resolve, groundedChannels, openCandidate, constructionCandidate, missingFields, PATHS, CON_FIELDS, seen, CI };
