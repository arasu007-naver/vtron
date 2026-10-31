'use strict';
/*
 * STMX SR ENGINE V2 — SUIT SUCCESSOR V1 · ENTRY · CANDIDATE (not production · not frozen).
 *
 * Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … §0.1 SR · §5). Reason: "For Item Suit SR, the actually
 * realized silhouette of the Jacket determines the Direction of the complete Suit; the lower body cannot overturn it" (Full-Look SR Upper Priority principle,
 * Direction governance only). Affected Scope: this directory (new). Parent: ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27 (verified by sr_v2_suit_parent_pin.js before
 * any frozen module loads; never written). This order is the CEO SR change authorisation for the Suit unit only (order §0 "do not reopen").
 *
 * evaluateSuit(packet) — packet = { scoring_unit_type: 'ITEM_PRODUCT', product_identity: { merchandise_type: 'SUIT', suit_component_target_ids }, targets: [{ target_id, record }] }
 *   1. the Jacket's own Item Vision V1.3 record → the FROZEN SR V2 evaluate() (unchanged semantics: its realized silhouette evidence — fit · shoulder · waist ·
 *      fabric — never a category, padding label, tailoring term, buttons or lapels) → the Jacket Direction S / R + its own frozen-verified Reason
 *   2. the bottom's own record → the same frozen evaluate() — retained as evidence only (it cannot change the Suit Direction; no average, vote or override)
 *   3. Suit Direction = Jacket Direction. Korean Reason = the Jacket's own Reason (named as the Jacket) + the Upper Priority statement (+ the lower-body contrast
 *      when the bottom's own Direction differs).
 * Missing optional Jacket fields: the frozen engine decides on what was observed (no fabricated value, no new extraction). A bottom that is incomplete or rejected
 * never changes the result (recorded as a limitation). A Jacket record the frozen engine rejects (SRV2TransportError) → { ok:false, kind:'TRANSPORT_ERROR' }.
 * ⛔ The Upper Priority rule never leaks to Dress / Jumpsuit / any ordinary product (they are never routed here).
 */
const path = require('path');
const { verifyParent, PARENT } = require('./sr_v2_suit_parent_pin');

const ENGINE_ID = 'STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1';
const ENGINE_STATUS = 'CANDIDATE — not production · not frozen (CEO order 2026-10-29: implementation + offline regression only)';
const SUIT_RULE_ANCHOR = 'CEO 2026-10-29 §0.1 / §5.1 — the realized Jacket silhouette (frozen SR V2 Direction of the Jacket) determines the whole-Suit Direction; the bottom cannot overturn it';
const SUIT_SETS = Object.freeze([['Jacket', 'Trouser'], ['Jacket', 'Skirt']]);
const MEMBER_KO = Object.freeze({ Jacket: '재킷', Trouser: '바지', Skirt: '스커트' });
const WORD = Object.freeze({ S: 'Structured', R: 'Relaxed' });

const parent = verifyParent();
const SR = require(path.join(parent.dir, 'src', 'sr_v2_engine.js'));
if (SR.ENGINE_ID !== PARENT.engine_id) throw new Error('SR SUIT: frozen ENGINE_ID ' + SR.ENGINE_ID + ' ≠ ' + PARENT.engine_id);
if (typeof SR.evaluate !== 'function') throw new Error('SR SUIT: frozen export evaluate missing');

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
  const jacket = ts.find((t) => catOf(t.record) === 'Jacket'); const bottom = ts.find((t) => t !== jacket);
  return { ok: true, jacket: { target_id: jacket.target_id, category: 'Jacket', record: jacket.record }, bottom: { target_id: bottom.target_id, category: catOf(bottom.record), record: bottom.record } };
}

function run(record) {
  try { const r = SR.evaluate(clone(record)); return { ok: true, r }; }
  catch (e) { if (e && e.name === 'SRV2TransportError') return { ok: false, code: e.code || e.name, message: String(e.message).slice(0, 200) }; throw e; }
}
const summary = (m, x) => (x.ok ? { target_id: m.target_id, category: m.category, direction: x.r.customer.direction, decisive_rule_id: x.r.decisive_rule_id, actual_observed_values: x.r.actual_observed_values, evidence_limitations: x.r.evidence_limitations, reason: x.r.customer.reason, reason_validation: x.r.reason_validation_result.status, provisional_policy: x.r.provisional_policy } : { target_id: m.target_id, category: m.category, direction: null, rejected: x.code });

/** independent check of the composed Suit Reason (the Jacket sentence is the frozen-verified Jacket Reason) */
function verifySuitReason(direction, text, bottomDir) {
  const f = []; const own = WORD[direction], other = WORD[direction === 'S' ? 'R' : 'S'];
  if (!text.startsWith('재킷은 ')) f.push('JACKET_NOT_LEAD');
  if (!new RegExp(own + ' 방향').test(text)) f.push('LABEL_MISMATCH');
  if (new RegExp(other + ' 방향').test(text)) f.push('OPPOSITE_LABEL_AS_DIRECTION');
  if (!/수트 전체의 방향은 재킷 실루엣이 결정합니다\./.test(text)) f.push('UPPER_PRIORITY_NOT_STATED');
  if (/수트(이므로|라서|이기 때문)/.test(text)) f.push('SUIT_STATUS_AS_EVIDENCE');
  if (/(바지|스커트)(가|이) (수트|전체)[^.]*결정/.test(text)) f.push('BOTTOM_DESCRIBED_AS_DECIDING');
  if (bottomDir && bottomDir !== direction && !text.includes(other + ' 쪽')) f.push('CONTRAST_NOT_DISCLOSED');
  if (/[0-9]/.test(text.replace(/[A-Za-z]+/g, ''))) f.push('NUMERIC_IN_REASON');
  return f;
}

function evaluateSuit(packet) {
  const v = validatePacket(packet); if (!v.ok) return v;
  const J = run(v.jacket.record); const Bm = run(v.bottom.record);
  if (!J.ok) return { ok: false, kind: 'TRANSPORT_ERROR', code: 'SUIT_JACKET_RECORD_REJECTED', detail: J.code, engine: ENGINE_ID };
  const direction = J.r.customer.direction; const bottomDir = Bm.ok ? Bm.r.customer.direction : null;
  const bottomKo = MEMBER_KO[v.bottom.category];
  const text = topic('재킷') + ' ' + J.r.customer.reason + ' 수트 전체의 방향은 재킷 실루엣이 결정합니다.' + (bottomDir && bottomDir !== direction ? ' ' + topic(bottomKo) + ' ' + WORD[bottomDir] + ' 쪽이지만 수트 방향을 바꾸지 않습니다.' : '');
  const findings = verifySuitReason(direction, text, bottomDir);
  return { ok: true, engine: ENGINE_ID, engine_status: ENGINE_STATUS, direction, customer: { direction, reason: findings.length ? null : text },
    suit_trace: { rule: SUIT_RULE_ANCHOR, parent: { freeze_id: parent.freeze_id, src_aggregate_sha256: parent.src_aggregate_sha256, frozen_files_verified: parent.frozen_files_verified, runtime_dependencies_verified: parent.runtime_dependencies_verified },
      governing_member: summary(v.jacket, J), retained_bottom_evidence: summary(v.bottom, Bm), bottom_differs: !!bottomDir && bottomDir !== direction,
      limitations: [].concat(Bm.ok ? [] : ['BOTTOM_RECORD_REJECTED_BY_FROZEN_SR (' + Bm.code + ') — no effect on the Suit Direction'], (J.r.evidence_limitations || []).length ? ['JACKET_PARTIAL_OBSERVATION — frozen SR V2 decided on the observed Jacket evidence'] : []),
      reason_status: findings.length ? 'WITHHELD' : 'COMPOSED', reason_findings: findings } };
}

module.exports = { evaluateSuit, validatePacket, ENGINE_ID, ENGINE_STATUS, SUIT_RULE_ANCHOR, MEMBER_KO, parentIdentity: () => parent };
