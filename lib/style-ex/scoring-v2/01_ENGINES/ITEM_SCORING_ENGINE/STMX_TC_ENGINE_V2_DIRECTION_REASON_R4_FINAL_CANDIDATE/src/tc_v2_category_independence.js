'use strict';
/**
 * STMX TC V2 R4 — CATEGORY-INDEPENDENT DEPARTURE ROUTING (CEO order 2026-10-28 · R3-B2). Read-only use of the frozen TC predicates; no new Departure rule.
 *
 * Problem: when the product type (or a Jacket / Coat subtype) is not observed, the frozen successor returns U-KEY for Proportion and Construction, so a frozen
 *   Construction Departure that does not depend on the type is never evaluated.
 * Rule (control flow only): for ONE member whose archetype key is unresolved, the frozen Construction predicate and the frozen relational resolvers are run on the
 *   member's OWN observed tokens in EVERY archetype key the product can lawfully have — the 14 keys of the closed V1.3 category domain (== the frozen TC key table),
 *   or the grammar keys of an observed Jacket / Coat. A Departure is consumed only if
 *     (1) Construction is TRUE in every key, AND
 *     (2) one and the same frozen rule is among the relational Departures in every key, AND
 *     (3) that rule belongs to a frozen family the D5 audit found NOT to read the key on its emitting path (static source check + this execution).
 *   The key values are never observations: they are not written to evidence, trace evidence or the Reason; only the observed carrier (value + D-4 zone) is cited.
 *   A rule TRUE in some keys only is CATEGORY-DEPENDENT: it is never turned into a Departure — it is recorded and cited concessively as opposing evidence.
 * ⛔ No GT, REF, score, count, threshold or category default. ⛔ No Lace / material proxy: the frozen F2 rule itself requires the D-4 Body-zone binding.
 */
const B = require('./tc_v2_binding'); const F = require('./tc_v2_frozen_chain'); const AD = require('./tc_v2_vision_adapter');
const FZ = B.FZ;
/* D5 audit (package D5_R3_B2_PREDICATE_DEPENDENCY_AUDIT): the frozen construction Departures whose emitting path does not read the archetype key */
const CATEGORY_INDEPENDENT_RULES = Object.freeze(['CON-TRUE-R1-OPENWORK-BODY-CONSTRUCTION', 'CON-TRUE-C3-BODY-ZONE-HYBRID', 'CON-TRUE-R1-LAYERED-STRUCTURAL-BODY', 'CON-TRUE-R1-STRUCTURAL-ATTACHMENT-BODY-SYSTEM']);
const CAT_DOMAIN = B.R13.VALUE_DOMAINS.category; const GRAMMAR = B.R13.VALUE_DOMAINS.grammar;
if (JSON.stringify(CAT_DOMAIN.slice().sort()) !== JSON.stringify(Object.keys(AD.KEY_TABLE).sort())) throw new B.TCV2BindingError('KEY_DOMAIN_MISMATCH', 'V1.3 category domain ≠ the frozen TC key table categories');
const keysOf = (cat) => (AD.GRAMMAR_KEYED.includes(cat) ? GRAMMAR.map((g) => AD.KEY_TABLE[cat] + ':' + g) : [AD.KEY_TABLE[cat]]);
const ALL_KEYS = Object.freeze([].concat(...CAT_DOMAIN.map(keysOf)));
/** exported for the dependency-drift test: the frozen evaluator must match its bound hash */
function verifyEvaluator(sha256) { return B.verifyInput(Object.assign({}, B.EVALUATOR_INPUT, sha256 ? { sha256 } : {})); }
/** the admissible archetype keys of a member whose key is unresolved (null when the key is resolved) */
function keyDomain(record) { if (record.key_resolved) return null; return record.category && AD.KEY_TABLE[record.category] ? keysOf(record.category) : ALL_KEYS.slice(); }
/* the observed carrier of an independent rule: the value(s) and the D-4 zone(s) the frozen bind() classified as substantial BODY — read from the member tokens */
function carrierEvidence(tokens, rule) {
  const field = /OPENWORK/.test(rule) ? 'surface' : /ATTACHMENT/.test(rule) ? 'attachment' : 'material';
  const items = FZ.multi(tokens, field).map((d) => ({ d, b: FZ.bind(d, false) })).filter(({ d, b }) => b.cls === 'BODY' && b.substantial.length && (field !== 'surface' || FZ.CLASSES.OPENWORK_CONSTRUCTION.includes(d.value)) && (field !== 'attachment' || (FZ.CLASSES.ATT_DECORATIVE.includes(d.value) && d.coverage === 'Dominant')));
  return { field, values: [...new Set(items.map(({ d }) => d.value))], zone: [...new Set([].concat(...items.map(({ b }) => b.substantial)))] }; }
/** @param member { record, input } @returns { applicable, verdict, … } — verdict: CATEGORY_INDEPENDENT_DEPARTURE · CATEGORY_DEPENDENT_ONLY · ROLE_NOT_OBSERVED · NO_CONSTRUCTION_DEPARTURE */
function evaluate(member) {
  const r = member.record; const keys = keyDomain(r); if (!keys) return { applicable: false, why: 'KEY_RESOLVED' };
  const per = keys.map((k) => { const e = F.evaluateTokens(member.input, k); const rel = FZ.relational(F.clone(member.input), k);
    return { flag: 'HYPOTHETICAL_KEY', key: k, construction: e.construction.v, construction_rule: e.construction.rule, construction_carrier: e.construction.carrier == null ? null : e.construction.carrier, departures: rel.departures.map((d) => d.rule), residual: rel.residual.map((d) => ({ rule: d.rule, carrier: d.carrier })) }; });
  const common = CATEGORY_INDEPENDENT_RULES.find((rule) => per.every((p) => p.construction === 'TRUE' && p.departures.includes(rule)));
  if (common) { const ev = carrierEvidence(member.input, common); if (ev.values.length && ev.zone.length) return { applicable: true, verdict: 'CATEGORY_INDEPENDENT_DEPARTURE', rule: common, evidence: ev, keys: keys.length, per_key: per }; }
  const trueKeys = per.filter((p) => p.construction === 'TRUE');
  const dependent = trueKeys.length ? { keys: trueKeys.map((p) => p.key), rules: [...new Set(trueKeys.map((p) => p.construction_rule))], carrier: trueKeys[0].construction_carrier } : null;
  const residualCommon = (per[0].residual || []).find((x) => per.every((p) => p.residual.some((y) => y.rule === x.rule))) || null;
  return { applicable: true, verdict: dependent ? 'CATEGORY_DEPENDENT_ONLY' : residualCommon ? 'ROLE_NOT_OBSERVED' : 'NO_CONSTRUCTION_DEPARTURE', category_dependent: dependent, residual_common: residualCommon, keys: keys.length, per_key: per };
}
module.exports = { evaluate, keyDomain, carrierEvidence, verifyEvaluator, CATEGORY_INDEPENDENT_RULES, ALL_KEYS };
