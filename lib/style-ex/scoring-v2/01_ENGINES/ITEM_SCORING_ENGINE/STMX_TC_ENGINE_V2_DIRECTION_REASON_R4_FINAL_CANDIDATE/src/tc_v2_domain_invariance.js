'use strict';
/**
 * STMX TC V2 — DOMAIN-INVARIANCE EVALUATOR (CEO TC-Q3 — candidate working policy).
 * For ONE member whose frozen channels are not all evaluable, the frozen predicates are re-run with EVERY admissible value of each missing input:
 *   fit (frozen observation domain by key) · length (Vision V1.3 length domain of the category) · archetype grammar (V1.3 grammar domain; Jacket / Coat keys only).
 * A completion is a HYPOTHETICAL computation, never an observation: its values are kept only in the internal trace (flag HYPOTHETICAL_COMPLETION) and are never
 *   written to evidence or to the customer Reason. A verdict holds only if EVERY completion gives the same Direction (INVARIANT_*); otherwise no conclusion.
 * Applicable only to a member whose input reproduces the frozen channel verdicts (guard) — otherwise NOT_APPLICABLE.
 * The verdict is valid only inside the frozen predicates' representation range: a Departure the predicates cannot represent (e.g. L-001) is not covered.
 */
const B = require('./tc_v2_binding'); const F = require('./tc_v2_frozen_chain');
const isObs = (t) => !!(t && t.state === 'OBSERVED' && t.value != null);
const hasRegional = (t) => !!(t && t.byRegion && typeof t.byRegion === 'object' && Object.values(t.byRegion).some((v) => v != null && (typeof v === 'string' || (v.state === 'OBSERVED' && v.value != null))));
const GRAMMAR_CATEGORIES = { Jacket: 'JACKET', Coat: 'COAT' };
function missingInputs(member) { const t = member.input || {}; const out = [];
  if (!isObs(t.fit) && !hasRegional(t.fit)) out.push('fit'); if (!isObs(t.length)) out.push('length'); if (!member.record.key_resolved && GRAMMAR_CATEGORIES[member.record.category]) out.push('key'); return out; }
function evaluate(member, opts) { const o = opts || {}; const r = member.record; const missing = missingInputs(member);
  if (!missing.length) return { applicable: false, why: 'NO_MISSING_INPUT', missing };
  if (!r.key_resolved && !GRAMMAR_CATEGORIES[r.category]) return { applicable: false, why: 'KEY_UNRESOLVED_WITHOUT_GRAMMAR_DOMAIN', missing };
  if (!(o.skipGuard || F.reproduces(member))) return { applicable: false, why: 'INPUT_DOES_NOT_REPRODUCE_FROZEN_VERDICTS', missing };
  const keys = missing.includes('key') ? B.R13.VALUE_DOMAINS.grammar.map((g) => GRAMMAR_CATEGORIES[r.category] + ':' + g) : [r.archetype_key];
  const completions = []; for (const key of keys) { const fits = missing.includes('fit') ? (B.FIT_DOMAIN.by_key[key] || B.FIT_DOMAIN.default).slice() : [null]; const lens = missing.includes('length') ? B.R13.lengthDomain(r.category).slice() : [null];
    for (const fit of fits) for (const len of lens) { const t = F.clone(member.input); if (fit) t.fit = { state: 'OBSERVED', value: fit, values: null }; if (len) t.length = { state: 'OBSERVED', value: len, values: null };
      const e = F.evaluateTokens(t, key); completions.push({ flag: 'HYPOTHETICAL_COMPLETION', key, fit, length: len, silhouette: e.silhouette.v + '/' + e.silhouette.rule, proportion: e.proportion.v + '/' + e.proportion.rule, construction: e.construction.v + '/' + e.construction.rule, direction: e.direction }); } }
  if (!completions.length) return { applicable: false, why: 'EMPTY_COMPLETION_DOMAIN', missing };
  const k = classify(completions, missing);
  return { applicable: true, missing, completions: completions.length, directions: k.directions, verdict: k.verdict, invariant_channel: k.channel, trace: completions }; }
/* pure classification of a completion set. A Transformative invariant is admitted only if, in EVERY completion, a channel that does NOT read a completed input is
   TRUE (fit → silhouette · length → proportion · key → every channel): a Departure produced by the hypothetical value itself is not Departure evidence
   (order §4: no T without a valid Departure) → INVARIANT_TRANSFORMATIVE_VIA_COMPLETION (not used for a Direction) */
function classify(completions, missing) { const dirs = [...new Set(completions.map((c) => c.direction))].sort();
  const dependent = new Set([].concat(missing.includes('fit') ? ['silhouette'] : [], missing.includes('length') ? ['proportion'] : [], missing.includes('key') ? ['silhouette', 'proportion', 'construction'] : []));
  const independentTrue = (c) => ['silhouette', 'proportion', 'construction'].filter((q) => !dependent.has(q) && String(c[q]).startsWith('TRUE/'));
  let verdict = dirs.length === 1 ? ({ CLASSIC: 'INVARIANT_CLASSIC', TRANSFORMATIVE: 'INVARIANT_TRANSFORMATIVE' }[dirs[0]] || 'INVARIANT_UNRESOLVED') : dirs.includes('DIRECTION_UNRESOLVED') ? 'MIXED_WITH_UNRESOLVED' : 'MIXED_C_T';
  let channel = null; if (verdict === 'INVARIANT_TRANSFORMATIVE') { const sets = completions.map(independentTrue); const common = ['construction', 'silhouette', 'proportion'].find((q) => sets.every((s) => s.includes(q))); if (common) channel = common; else verdict = 'INVARIANT_TRANSFORMATIVE_VIA_COMPLETION'; }
  return { directions: dirs, verdict, channel }; }
module.exports = { evaluate, classify, missingInputs, GRAMMAR_CATEGORIES };
