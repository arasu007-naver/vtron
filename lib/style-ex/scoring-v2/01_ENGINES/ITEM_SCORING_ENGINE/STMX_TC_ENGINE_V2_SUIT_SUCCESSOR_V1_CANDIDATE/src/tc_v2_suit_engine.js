'use strict';
/*
 * STMX TC ENGINE V2 — SUIT SUCCESSOR V1 · ENTRY · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … §0.1 TC · §4). Reason: "If either the Jacket or the
 * Trouser / Skirt contains at least one valid Product-Level Departure under the Frozen Item TC Constitution, the whole Suit is Transformative" — implemented
 * as the CEO Step 2 V2.2 §7 MATCHING_PAIR rule (any member Transformative → pair Transformative) over the FROZEN TC V2 predicates and resolver. Affected Scope:
 * this directory (new). Parent: ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28 (verified by tc_v2_suit_parent_pin.js before any frozen module loads; never written).
 *
 * evaluateSuit(packet) — packet = { scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids }, targets: [{ target_id, record }] }
 *   (the EI V2 ITEM_PRODUCT shape; one Jacket + one Trouser or Skirt; each record = that member's own Item Vision V1.3 record, unmodified)
 *   1. every member alone through the frozen V1.3 path (evaluateV13Record) — its own Direction, Reason and path
 *   2. the pair unit: frozen member predicates (adapter → unitFromTokens) → §7 unit state → frozen V2 resolver evaluateUnit (the governed pair path)
 *   3. CEO rule: Transformative ⇔ at least one member carries a valid Departure (its frozen result is Transformative on a Departure-grounded path); otherwise
 *      Classic (the frozen Classic paths, incl. the mandatory fallback — no fabricated Departure). (1) and (2) must agree, else fail closed.
 *   4. Korean Reason: the departing member is named and its own frozen-verified Reason is carried verbatim; Classic carries both members' own Reasons.
 * Valid → { ok:true, direction:'CLASSIC'|'TRANSFORMATIVE', customer:{ direction, reason }, suit_trace } · invalid packet → { ok:false, kind:'CONTRACT_ERROR', code }.
 * ⛔ No Departure from Suit status, matching colour / fabric, category, styling, GT, REF or score. ⛔ No change to ordinary-product TC semantics (not called for them).
 */
const path = require('path');
const { verifyParent, PARENT } = require('./tc_v2_suit_parent_pin');

const ENGINE_ID = 'STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1';
const ENGINE_STATUS = 'CANDIDATE — not production · not frozen (CEO order 2026-10-29: implementation + offline regression only)';
const SUIT_RULE_ANCHOR = 'CEO 2026-10-29 §0.1 / §4.1 — either member valid Product-Level Departure → whole Suit TRANSFORMATIVE (= CEO Step 2 V2.2 §7 MATCHING_PAIR rule)';
const SUIT_SETS = Object.freeze([['Jacket', 'Trouser'], ['Jacket', 'Skirt']]);
const MEMBER_KO = Object.freeze({ Jacket: '재킷', Trouser: '바지', Skirt: '스커트' });
const DEPARTURE_PATHS = Object.freeze(['FROZEN_V1', 'CATEGORY_INDEPENDENT_DEPARTURE', 'DOMAIN_INVARIANT']);

const parent = verifyParent();
const TC = require(path.join(parent.dir, 'src', 'tc_v2_engine.js'));
const AD = require(path.join(parent.dir, 'src', 'tc_v2_vision_adapter.js'));
if (TC.ENGINE_ID !== PARENT.engine_id) throw new Error('TC SUIT: frozen ENGINE_ID ' + TC.ENGINE_ID + ' ≠ ' + PARENT.engine_id);
for (const f of ['evaluateV13Record', 'evaluateUnit', 'unitFromTokens']) if (typeof TC[f] !== 'function') throw new Error('TC SUIT: frozen export ' + f + ' missing');

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const catOf = (rec) => (isPlain(rec) && isPlain(rec.category) && rec.category.state === 'OBSERVED' && typeof rec.category.value === 'string' ? rec.category.value : null);
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
const topic = (w) => w + josa(w, '은', '는');
const contractError = (code, detail) => ({ ok: false, kind: 'CONTRACT_ERROR', code, detail: detail || null, engine: ENGINE_ID });
const pair7 = (ds) => (ds.includes('TRANSFORMATIVE') ? 'TRANSFORMATIVE' : ds.every((d) => d === 'CLASSIC') ? 'CLASSIC' : 'DIRECTION_UNRESOLVED');   /* CEO Step 2 V2.2 §7 */

/** structure only: one Jacket + one Trouser / Skirt, ids consistent, records plain objects — never fills or renames a field */
function validatePacket(p) {
  if (!isPlain(p) || p.scoring_unit_type !== 'ITEM_PRODUCT' || !isPlain(p.product_identity) || p.product_identity.merchandise_type !== 'SUIT') return contractError('SUIT_PACKET_MALFORMED', 'expected ITEM_PRODUCT with product_identity.merchandise_type SUIT');
  const ids = p.product_identity.suit_component_target_ids; const ts = p.targets;
  if (!Array.isArray(ids) || ids.length !== 2 || !Array.isArray(ts) || ts.length !== 2) return contractError('SUIT_MEMBER_ASSOCIATION_INVALID', 'a Suit has exactly two members');
  if (new Set(ids).size !== 2 || JSON.stringify(ts.map((t) => t && t.target_id)) !== JSON.stringify(ids)) return contractError('SUIT_MEMBER_ASSOCIATION_INVALID', 'targets must be the declared members in declared order');
  if (!ts.every((t) => isPlain(t.record) && isPlain(t.record.observations) && catOf(t.record))) return contractError('SUIT_MEMBER_RECORD_INVALID', 'every member needs its own Vision record with an observed category');
  const cats = ts.map((t) => catOf(t.record)).slice().sort();
  if (!SUIT_SETS.some((s) => JSON.stringify(s) === JSON.stringify(cats))) return contractError('SUIT_MEMBER_ASSOCIATION_INVALID', 'members must be one Jacket + one Trouser or one Jacket + one Skirt (got ' + cats.join(' + ') + ')');
  const order = (t) => (catOf(t.record) === 'Jacket' ? 0 : 1);
  return { ok: true, members: ts.slice().sort((a, b) => order(a) - order(b)).map((t) => ({ target_id: t.target_id, category: catOf(t.record), record: t.record })) };
}

/** the Departure that makes a member Transformative, from its own frozen trace — empty = not Departure-grounded */
function departureOf(member, solo, unit) {
  if (!solo.ok || solo.direction !== 'TRANSFORMATIVE') return null;
  const tr = solo.trace; const prov = { target_id: member.target_id, category: member.category, path: tr.path };
  if (tr.path === 'FROZEN_V1') { prov.valid_departure_set = unit.upstream.valid_departure_set.map((v) => ({ channel: v.channel, rule: v.rule, carrier: v.carrier })); prov.asymmetry = !!(unit.members[0].record.asymmetry && unit.members[0].record.asymmetry.departure_exists); }
  if (tr.path === 'CATEGORY_INDEPENDENT_DEPARTURE') prov.category_independent = solo.trace.reason_context.category_independent;
  if (tr.path === 'DOMAIN_INVARIANT') prov.invariant = (tr.domain_invariance || []).filter((d) => d.verdict === 'INVARIANT_TRANSFORMATIVE').map((d) => d.invariant_channel);
  const grounded = DEPARTURE_PATHS.includes(tr.path) && ((prov.valid_departure_set && prov.valid_departure_set.length) || prov.asymmetry || prov.category_independent || (prov.invariant && prov.invariant.length));
  return grounded ? prov : Object.assign(prov, { not_grounded: true });
}

function composeReason(direction, ms) {
  const said = (m) => (m.solo.ok && m.solo.customer && typeof m.solo.customer.reason === 'string' ? m.solo.customer.reason : null);
  if (direction === 'TRANSFORMATIVE') {
    const dep = ms.filter((m) => m.departure && !m.departure.not_grounded); if (dep.some((m) => !said(m))) return { text: null, status: 'WITHHELD', why: 'a departing member Reason was withheld by the frozen engine' };
    const lead = dep.map((m) => topic(MEMBER_KO[m.category]) + ' ' + said(m)).join(' ');
    const tail = dep.length === 2 ? '재킷과 ' + MEMBER_KO[dep[1].category] + ' 모두의 이 변형이 수트 전체에 적용되어 수트를 Transformative 방향으로 판단합니다.' : MEMBER_KO[dep[0].category] + '의 이 변형이 수트 전체에 적용되어 수트를 Transformative 방향으로 판단합니다.';
    return { text: lead + ' ' + tail, status: 'COMPOSED', cited_members: dep.map((m) => m.target_id) };
  }
  if (ms.some((m) => !said(m))) return { text: null, status: 'WITHHELD', why: 'a member Reason was withheld by the frozen engine' };
  return { text: ms.map((m) => topic(MEMBER_KO[m.category]) + ' ' + said(m)).join(' ') + ' 두 구성품 모두에서 상품 수준의 변형이 확인되지 않아 수트 전체를 Classic 방향으로 판단합니다.', status: 'COMPOSED', cited_members: ms.map((m) => m.target_id) };
}

/** independent check of the composed Suit Reason (the member sentences are frozen-verified already) */
function verifySuitReason(direction, reason, ms) {
  const f = []; const t = reason.text; if (t === null) return f;
  if (direction === 'TRANSFORMATIVE' && (!/Transformative 방향/.test(t) || /Classic 방향으로 판단합니다/.test(t))) f.push('LABEL_MISMATCH');
  if (direction === 'CLASSIC' && (!/Classic 방향/.test(t) || /Transformative/.test(t))) f.push('LABEL_MISMATCH');
  if (/수트(이므로|라서|이기 때문)/.test(t)) f.push('SUIT_STATUS_AS_EVIDENCE');
  if (/[0-9]/.test(t.replace(/[A-Za-z]+/g, ''))) f.push('NUMERIC_IN_REASON');
  for (const m of ms) if ((reason.cited_members || []).includes(m.target_id) && !t.includes(MEMBER_KO[m.category])) f.push('MEMBER_NOT_NAMED');
  if (direction === 'TRANSFORMATIVE' && !ms.some((m) => m.departure && !m.departure.not_grounded && t.includes(MEMBER_KO[m.category]))) f.push('DEPARTING_MEMBER_NOT_NAMED');
  return f;
}

function evaluateSuit(packet) {
  const v = validatePacket(packet); if (!v.ok) return v;
  const ms = v.members.map((m) => {
    const solo = TC.evaluateV13Record(clone(m.record));
    const a = AD.adapt(clone(m.record)); const unit = a.ok ? TC.unitFromTokens(a.member.tokens, a.member.archetype_key, a.member.category, a.member.observed, 'V1_3_ADAPTER') : null;
    if (unit) unit.excluded_fields = a.excluded.map((x) => x.field);
    return Object.assign({}, m, { solo, unit, departure: unit ? departureOf(m, solo, unit) : null });
  });
  const unreadable = ms.filter((m) => !m.solo.ok || !m.unit);
  const departing = ms.filter((m) => m.departure && !m.departure.not_grounded);
  if (ms.some((m) => m.departure && m.departure.not_grounded)) return contractError('SUIT_DEPARTURE_NOT_GROUNDED', 'a member is Transformative without a Departure-grounded frozen path');
  if (unreadable.length && !departing.length) return contractError('SUIT_MEMBER_RECORD_UNREADABLE', unreadable.map((m) => m.target_id + ':' + (m.solo.code || 'ADAPTER')).join(', '));
  /* pair path over the readable members (frozen predicates + §7 + frozen resolver) */
  const readable = ms.filter((m) => m.solo.ok && m.unit);
  const pairUnit = { v1_direction: pair7(readable.map((m) => m.unit.v1_direction)), members: [].concat(...readable.map((m) => m.unit.members)), upstream: { valid_departure_set: [].concat(...readable.map((m, i) => m.unit.upstream.valid_departure_set.map((x) => Object.assign({ member: i }, x)))), ownerless: false }, classic: null, excluded_fields: [].concat(...readable.map((m) => m.unit.excluded_fields || [])) };
  const pr = TC.evaluateUnit(pairUnit, { skipGuard: true });
  const ruleDirection = departing.length ? 'TRANSFORMATIVE' : 'CLASSIC';
  if (!pr.ok || pr.direction !== ruleDirection) return { ok: false, kind: 'SUIT_RULE_RECONCILIATION_FAILURE', code: 'PAIR_PATH_DISAGREES_WITH_MEMBER_RULE', detail: { pair: pr.ok ? pr.direction : pr.code, member_rule: ruleDirection }, engine: ENGINE_ID };
  const reason = composeReason(ruleDirection, ms); const findings = verifySuitReason(ruleDirection, reason, ms);
  const text = findings.length ? null : reason.text;
  return { ok: true, engine: ENGINE_ID, engine_status: ENGINE_STATUS, direction: ruleDirection, customer: { direction: ruleDirection, reason: text },
    suit_trace: { rule: SUIT_RULE_ANCHOR, parent: { freeze_id: parent.freeze_id, src_aggregate_sha256: parent.src_aggregate_sha256, frozen_files_verified: parent.frozen_files_verified, runtime_dependencies_verified: parent.runtime_dependencies_verified },
      members: ms.map((m) => ({ target_id: m.target_id, category: m.category, member_direction: m.solo.ok ? m.solo.direction : null, member_path: m.solo.ok ? m.solo.trace.path : null, member_code: m.solo.ok ? null : m.solo.code, member_reason_status: m.solo.ok ? m.solo.reason_status : null, frozen_v1_member_state: m.unit ? m.unit.v1_direction : null, departure: m.departure })),
      departing_members: departing.map((m) => m.target_id), unassessed_members: unreadable.map((m) => m.target_id),
      pair_path: { v1_state_by_rule7: pairUnit.v1_direction, resolver_path: pr.trace.path, direction: pr.direction, pair_reason_frozen: pr.customer.reason },
      reason_status: findings.length ? 'WITHHELD' : reason.status, reason_findings: findings, reason_withheld_why: reason.why || null } };
}

module.exports = { evaluateSuit, validatePacket, ENGINE_ID, ENGINE_STATUS, SUIT_RULE_ANCHOR, MEMBER_KO, parentIdentity: () => parent };
