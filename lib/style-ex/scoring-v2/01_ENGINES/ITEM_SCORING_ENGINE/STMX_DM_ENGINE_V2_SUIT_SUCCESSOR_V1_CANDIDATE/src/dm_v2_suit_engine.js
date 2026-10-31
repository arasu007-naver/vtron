'use strict';
/*
 * STMX DM ENGINE V2 — SUIT SUCCESSOR V1 · ENTRY · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … §0.1 DM · §6). Reason: "If either the Jacket or the
 * Trouser / Skirt has at least one sufficient qualifying Designed Detail Point / System under Frozen Item DM rules, the entire Suit is Detail." Affected Scope:
 * this directory (new). Parent: ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28 (verified by dm_v2_suit_parent_pin.js before any frozen module loads; never written).
 *
 * evaluateSuit(packet) — packet = { scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids }, targets: [{ target_id, record }] }
 *   1. each member's OWN governed dm_designed_detail_evidence block → the FROZEN DM V2 evaluate() (frozen admission + qualification: size / contrast / spatial,
 *      "one qualifying system suffices"; set membership only — no count, density or weight). Member ownership is kept; blocks are never merged, copied or
 *      re-read across members, so no physical detail is counted twice and no detail is invented from the combination.
 *   2. CEO rule: Detail ⇔ at least one member's frozen result is Detail on a qualifying system (DM-V2-D1 / D2); otherwise Minimal — on the members that carry
 *      a governed block. A member without a block (or with a block the frozen admission rejects) is NOT assessed: recorded as an internal limitation; the
 *      Suit is never claimed fully assessed. No member carries a block → { ok:false, kind:'TRANSPORT_ERROR' } (the frozen single-product behaviour).
 *   3. Korean Reason: Detail names the member(s) that carry the qualifying detail with that member's own frozen-verified Reason; Minimal carries the assessed
 *      members' own Reasons only.
 * ⛔ Suit status is never a Detail Point. ⛔ Functional buttons / natural sheen / accessories are governed upstream (Vision V1.3 admission → `excluded`,
 *    Guard 08 DA-14) and by the frozen qualification; this successor adds no element rule and never reads `excluded`. Styling garments are never members.
 */
const path = require('path');
const { verifyParent, PARENT } = require('./dm_v2_suit_parent_pin');

const ENGINE_ID = 'STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1';
const ENGINE_STATUS = 'CANDIDATE — not production · not frozen (CEO order 2026-10-29: implementation + offline regression only)';
const SUIT_RULE_ANCHOR = 'CEO 2026-10-29 §0.1 / §6.1 — either member sufficient qualifying Designed Detail (frozen DM V2) → whole Suit DETAIL';
const SUIT_SETS = Object.freeze([['Jacket', 'Trouser'], ['Jacket', 'Skirt']]);
const MEMBER_KO = Object.freeze({ Jacket: '재킷', Trouser: '바지', Skirt: '스커트' });
const QUALIFYING_RULES = Object.freeze(['DM-V2-D1', 'DM-V2-D2']);

const parent = verifyParent();
const DM = require(path.join(parent.dir, 'src', 'dm_v2_engine.js'));
if (DM.ENGINE_ID !== PARENT.engine_id) throw new Error('DM SUIT: frozen ENGINE_ID ' + DM.ENGINE_ID + ' ≠ ' + PARENT.engine_id);
if (typeof DM.evaluate !== 'function') throw new Error('DM SUIT: frozen export evaluate missing');

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const catOf = (rec) => (isPlain(rec) && isPlain(rec.category) && rec.category.state === 'OBSERVED' && typeof rec.category.value === 'string' ? rec.category.value : null);
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
const topic = (w) => w + josa(w, '은', '는');
const contractError = (code, detail) => ({ ok: false, kind: 'CONTRACT_ERROR', code, detail: detail || null, engine: ENGINE_ID });

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

/** independent check of the composed Suit Reason (member sentences are the frozen-verified member Reasons) */
function verifySuitReason(direction, text, cited) {
  const f = [];
  if (direction === 'D' && (!/Detail 방향/.test(text) || /Minimal 방향/.test(text))) f.push('LABEL_MISMATCH');
  if (direction === 'M' && (!/Minimal 방향/.test(text) || /Detail 방향/.test(text))) f.push('LABEL_MISMATCH');
  if (/수트(이므로|라서|이기 때문)/.test(text)) f.push('SUIT_STATUS_AS_EVIDENCE');
  for (const m of cited) if (!text.includes(MEMBER_KO[m.category])) f.push('MEMBER_NOT_NAMED');
  if (/[0-9]/.test(text.replace(/[A-Za-z]+/g, ''))) f.push('NUMERIC_IN_REASON');
  return f;
}

function evaluateSuit(packet) {
  const v = validatePacket(packet); if (!v.ok) return v;
  const ms = v.members.map((m) => {
    const block = m.record.dm_designed_detail_evidence;
    if (block === undefined) return Object.assign({}, m, { assessed: false, status: 'DM_BLOCK_ABSENT', r: null });
    const r = DM.evaluate(clone(block));
    return Object.assign({}, m, { assessed: r.ok, status: r.ok ? 'ASSESSED' : 'DM_BLOCK_REJECTED:' + r.code, r });
  });
  const assessed = ms.filter((m) => m.assessed);
  if (!assessed.length) return { ok: false, kind: 'TRANSPORT_ERROR', code: 'SUIT_DM_EVIDENCE_ABSENT_ON_ALL_MEMBERS', detail: ms.map((m) => m.target_id + ':' + m.status).join(', '), engine: ENGINE_ID };
  const qualifying = assessed.filter((m) => m.r.direction === 'DETAIL' && QUALIFYING_RULES.includes(m.r.decisive_rule_id) && m.r.decisive_evidence_ids.length);
  if (assessed.some((m) => m.r.direction === 'DETAIL' && !qualifying.includes(m))) return contractError('SUIT_DETAIL_NOT_QUALIFYING', 'a member is Detail without a qualifying system');
  const direction = qualifying.length ? 'D' : 'M';
  const said = (m) => (typeof m.r.customer.reason === 'string' ? m.r.customer.reason : null);
  const cited = direction === 'D' ? qualifying : assessed;
  let text = null; let status = 'COMPOSED'; let findings = [];
  if (cited.some((m) => !said(m))) status = 'WITHHELD';
  else {
    const lead = cited.map((m) => topic(MEMBER_KO[m.category]) + ' ' + said(m)).join(' ');
    const tail = direction === 'D' ? (cited.length === 2 ? '두 구성품 모두의 디자인 디테일이 수트 전체에 적용되어 수트를 Detail 방향으로 판단합니다.' : MEMBER_KO[cited[0].category] + '의 이 디자인 디테일이 수트 전체에 적용되어 수트를 Detail 방향으로 판단합니다.')
      : (cited.length === 2 ? '두 구성품 모두에서 충분한 디자인 디테일이 확인되지 않아 수트 전체를 Minimal 방향으로 판단합니다.' : MEMBER_KO[cited[0].category] + '에서 충분한 디자인 디테일이 확인되지 않아 수트 전체를 Minimal 방향으로 판단합니다.');
    text = lead + ' ' + tail; findings = verifySuitReason(direction, text, cited); if (findings.length) { text = null; status = 'WITHHELD'; }
  }
  return { ok: true, engine: ENGINE_ID, engine_status: ENGINE_STATUS, direction: direction === 'D' ? 'DETAIL' : 'MINIMAL', customer: { direction, reason: text },
    suit_trace: { rule: SUIT_RULE_ANCHOR, parent: { freeze_id: parent.freeze_id, src_aggregate_sha256: parent.src_aggregate_sha256, frozen_files_verified: parent.frozen_files_verified, runtime_dependencies_verified: parent.runtime_dependencies_verified },
      members: ms.map((m) => ({ target_id: m.target_id, category: m.category, status: m.status, member_direction: m.assessed ? m.r.customer.direction : null, decisive_rule_id: m.assessed ? m.r.decisive_rule_id : null, qualifying_evidence_ids: m.assessed && m.r.direction === 'DETAIL' ? m.r.decisive_evidence_ids : [], member_reason_status: m.assessed ? m.r.reason_status : null, provisional_policy: m.assessed ? m.r.provisional_policy : null })),
      qualifying_members: qualifying.map((m) => m.target_id), assessed_members: assessed.map((m) => m.target_id), unassessed_members: ms.filter((m) => !m.assessed).map((m) => m.target_id),
      limitations: ms.filter((m) => !m.assessed).map((m) => m.target_id + ' (' + m.category + ') ' + m.status + ' — not assessed; the Suit is not claimed fully assessed'),
      reason_status: status, reason_findings: findings } };
}

module.exports = { evaluateSuit, validatePacket, ENGINE_ID, ENGINE_STATUS, SUIT_RULE_ANCHOR, MEMBER_KO, parentIdentity: () => parent };
