'use strict';
/**
 * STMX DM ENGINE V2 — DIRECTION + REASON CANDIDATE · entry.
 * evaluate(dmBlock) — dmBlock = the governed `dm_designed_detail_evidence` block of ONE product record (Vision Producer V1_3 shape { evidence, excluded }).
 *   valid product block  → { ok: true, direction: 'DETAIL' | 'MINIMAL', customer: { direction: 'D' | 'M', reason }, ... internal trace }
 *   absent / malformed   → { ok: false, kind: 'TRANSPORT_ERROR', code } — a transport defect, NOT a product result and NOT a Direction value (order §6.4).
 * ⛔ No GT, REF, image name, score, Strength or ordinal is read or produced. The Reason never withdraws the Direction: a Reason that fails verification is
 *   replaced by the grounded fallback form; if that fails too it is withheld (reason_status WITHHELD) and the Direction stands.
 */
const B = require('./dm_v2_binding');
const R = require('./dm_v2_direction_resolver');
const C = require('./dm_v2_reason_composer');
const V = require('./dm_v2_reason_verifier');
const SIDE = { D: 'DETAIL', M: 'MINIMAL' };
const readingOf = (r) => ({ resolved: !!(r && r.resolved), values: r && r.values ? r.values.slice() : [] });
function evaluate(dmBlock) {
  const adm = B.admission.admit(dmBlock); const d = R.resolve(adm);
  if (!d.ok) return { ok: false, kind: 'TRANSPORT_ERROR', code: d.transport_code, rule: 'DM-V2-T0', engine: B.ENGINE_ID, engine_directory: B.ENGINE_DIRECTORY_ID };
  if (!['D', 'M'].includes(d.direction)) throw new Error('DM V2 OUTPUT CONTRACT VIOLATION: a valid block must resolve to D or M');
  let reason = C.compose(adm, d); let findings = V.verify(dmBlock, d, reason); let status = 'VERIFIED'; const attempts = [{ form: reason.form, findings }];
  if (findings.length) { reason = C.fallback(adm, d); findings = V.verify(dmBlock, d, reason); attempts.push({ form: reason.form, findings }); status = findings.length ? 'WITHHELD' : 'FALLBACK_VERIFIED'; }
  const trace = adm.evidence.map((e, i) => { const q = R.qualSettled(e); return { index: i, evidence_id: e.evidence_id, evidence_family: e.evidence_family, size: readingOf(e.size), contrast: readingOf(e.contrast), spatial: readingOf(e.spatial), qualifies_definite: R.qualDefinite(e), qualifies_after_adjudication: q.q, adjudicated: { size: q.s.value, contrast: q.c.value, spatial: q.sp.value }, open_readings: [['size', q.s], ['contrast', q.c], ['spatial', q.sp]].filter(([, x]) => x.open).map(([k, x]) => k + ':' + x.open) }; });
  return { ok: true, engine: B.ENGINE_ID, engine_directory: B.ENGINE_DIRECTORY_ID, engine_status: B.ENGINE_STATUS,
    direction: SIDE[d.direction], decisive_rule_id: d.rule, decisive_evidence_ids: d.decisive.map((e) => e.evidence_id),
    ceo_decision_pending: d.ceo_decision || null, provisional_policy: !!d.provisional, physically_grounded: d.rule !== 'DM-V2-Z0',
    evidence_trace: trace, reason_clauses: status === 'WITHHELD' ? [] : reason.clauses, reason_form: reason.form, reason_status: status,
    reason_validation_result: { status: findings.length ? 'FAIL' : 'PASS', findings, attempts },
    customer: { direction: d.direction, reason: status === 'WITHHELD' ? null : reason.text } };
}
module.exports = { evaluate, ENGINE_ID: B.ENGINE_ID, selfIdentity: B.selfIdentity };
