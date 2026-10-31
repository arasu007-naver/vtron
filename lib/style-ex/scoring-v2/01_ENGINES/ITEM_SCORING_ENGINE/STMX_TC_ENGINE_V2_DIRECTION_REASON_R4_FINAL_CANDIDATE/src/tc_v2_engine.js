'use strict';
/**
 * STMX TC ENGINE V2 — DIRECTION + REASON CANDIDATE · entry.
 *   evaluateCorpusUnit(anchor) / evaluateCorpus()  — the 114 governed units through the frozen TC V1 chain + the V2 mandatory resolver
 *   evaluateV13Record(record)                       — one Item Vision Producer V1.3 target record → adapter → frozen predicates → V2 resolver
 *   evaluateUnit(unit)                              — a unit { v1_direction, members:[{record, input}], upstream, classic }
 * Valid input → { ok:true, direction:'CLASSIC'|'TRANSFORMATIVE', customer:{ direction, reason }, trace } — never UNRESOLVED / Neutral / null / a number.
 * Malformed input → { ok:false, kind:'CONTRACT_ERROR', code } — a contract defect, not a product result, never zero evidence.
 * The Reason never withdraws the Direction: a Reason that fails verification is replaced by the minimal grounded form; if that fails too it is withheld.
 * ⛔ No GT, REF list, rationale, score, Strength or ordinal is read or produced.
 */
const B = require('./tc_v2_binding'); const F = require('./tc_v2_frozen_chain'); const R = require('./tc_v2_resolver'); const C = require('./tc_v2_reason_composer'); const V = require('./tc_v2_reason_verifier'); const AD = require('./tc_v2_vision_adapter');
const contractError = (code) => ({ ok: false, kind: 'CONTRACT_ERROR', code, engine: B.ENGINE_ID });
function evaluateUnit(unit, opts) {
  if (!unit || !Array.isArray(unit.members) || !unit.members.length || !unit.members.every((m) => m && m.record && m.record.silhouette && m.record.proportion && m.record.construction && m.record.observed)) return contractError('UNIT_MALFORMED');
  if (!['CLASSIC', 'TRANSFORMATIVE', 'DIRECTION_UNRESOLVED'].includes(unit.v1_direction)) return contractError('FROZEN_DIRECTION_STATE_INVALID');
  const d = R.resolve(unit, opts); if (!['CLASSIC', 'TRANSFORMATIVE'].includes(d.direction)) throw new Error('TC V2 OUTPUT CONTRACT VIOLATION: a valid unit must resolve to CLASSIC or TRANSFORMATIVE');
  /* R4: reason_context = the R3-B2 facts the composer / verifier need (category-independent Departure · key-domain candidates); internal, never customer-facing */
  const rc = { category_independent: d.category_independent || null, ci_member: d.ci_member == null ? null : d.ci_member, key_domain_candidates: d.key_domain_candidates || [] };
  const x = Object.assign({ direction: d.direction, path: d.path, members: unit.members.map((m) => m.record), upstream: unit.upstream, classic: unit.classic || null, missing_fields: d.missing_fields || [], invariant_channel: d.invariant_channel || null, invariant_member: d.invariant_member }, rc);
  let reason = C.compose(x); let findings = V.verify(x, reason); let status = 'VERIFIED'; const attempts = [{ form: reason.form || reason.failure, findings }];
  if (findings.length) { reason = C.fallback(x); findings = V.verify(x, reason); attempts.push({ form: reason.form || reason.failure, findings }); status = findings.length ? 'WITHHELD' : 'FALLBACK_VERIFIED'; }
  return { ok: true, engine: B.ENGINE_ID, engine_status: B.ENGINE_STATUS, direction: d.direction,
    trace: { path: d.path, policy: d.policy, provisional: d.provisional, v1_direction: unit.v1_direction, grounded_channels: d.grounded_channels || null, missing_fields: d.missing_fields || [], opposing_evidence: d.opposing_evidence || [], fallback_basis: d.fallback_basis || null, domain_invariance: d.domain_invariance || null, physically_grounded: d.path !== 'ZERO_EVIDENCE',
      category_independence: d.category_independence || null, excluded_fields: unit.excluded_fields || [], reason_context: rc },
    reason_clauses: status === 'WITHHELD' ? [] : reason.clauses, reason_form: reason.form || null, reason_status: status, reason_validation: { status: findings.length ? 'FAIL' : 'PASS', findings, attempts },
    customer: { direction: d.direction, reason: status === 'WITHHELD' ? null : reason.text } };
}
function evaluateCorpusUnit(anchor, opts) { const u = F.corpusUnits().find((x) => x.anchor === anchor); if (!u) return contractError('UNKNOWN_GOVERNED_UNIT'); return Object.assign({ unit: anchor }, evaluateUnit(u, opts)); }
function evaluateCorpus(opts) { return F.corpusUnits().map((u) => Object.assign({ unit: u.anchor, scoring_unit_type: u.scoring_unit_type }, evaluateUnit(u, opts))); }
/** a single-garment unit from a frozen-projection token set: frozen predicates → frozen direction() (the unit's V1 state) — used by the V1.3 adapter path */
function unitFromTokens(tokens, key, category, observed, source) {
  const o = F.evaluateTokens(tokens, key);
  const rec = { category, archetype_key: key, key_resolved: !/[<]|UNMAPPED/.test(key), observed, silhouette: o.silhouette, proportion: o.proportion, construction: o.construction, asymmetry: { departure_exists: false } };
  const vds = []; for (const [ch, k] of [['SILHOUETTE', 'silhouette'], ['PROPORTION', 'proportion'], ['CONSTRUCTION', 'construction']]) if (o[k].v === 'TRUE') vds.push({ channel: ch, rule: o[k].rule, carrier: o[k].carrier == null ? null : o[k].carrier });
  return { v1_direction: o.direction, members: [{ record: rec, input: tokens, source: source || 'TOKENS' }], upstream: { valid_departure_set: vds, ownerless: false }, classic: null };
}
/** R2 (live-audit order §11.1 C) — transport / contract defects of a V1.3 record: a TC observation the adapter could not read (MALFORMED), or a V1.3 UNIVERSAL
 *  parameter key that is absent (universal = applicable to every garment; non-observation is a STATE, never a missing key). Either means the payload was not
 *  delivered intact — a CONTRACT_ERROR, never zero / partial evidence. Lawful conditional omissions (N/A keys) are not defects and stay gaps. */
/* R3 (CEO 2026-10-28 §5): the R2 rule "absent UNIVERSAL key ⇒ CONTRACT_ERROR" is withdrawn — field absence is never evidence of corruption; a valid product with
 *  absent fields is partial evidence (mandatory C / T). Only a field VALUE that is corrupted (MALFORMED) remains a transport / contract defect. */
/* R4 (CEO 2026-10-28 §4 · R3-B1): the R3 rule "a MALFORMED field value ⇒ CONTRACT_ERROR for the whole record" is withdrawn — an individually invalid field is
 *  excluded by the adapter (field-level salvage, traced) and the remaining evidence decides; only an unreadable product envelope stays a CONTRACT_ERROR. */
/** one V1.3 target record (single garment) → adapter → frozen predicates → frozen direction() → V2 resolver */
function evaluateV13Record(record) {
  const a = AD.adapt(record); if (!a.ok) return a;
  const unit = unitFromTokens(a.member.tokens, a.member.archetype_key, a.member.category, a.member.observed, 'V1_3_ADAPTER'); unit.excluded_fields = a.excluded.map((x) => x.field);
  const r = evaluateUnit(unit, { skipGuard: true }); return Object.assign(r, { adapter: { archetype_key: a.member.archetype_key, key_resolved: a.member.key_resolved, gaps: a.gaps, excluded: a.excluded, frozen_member_direction: unit.v1_direction } });
}
module.exports = { evaluateUnit, evaluateCorpusUnit, evaluateCorpus, evaluateV13Record, unitFromTokens, ENGINE_ID: B.ENGINE_ID, selfIdentity: B.selfIdentity };
