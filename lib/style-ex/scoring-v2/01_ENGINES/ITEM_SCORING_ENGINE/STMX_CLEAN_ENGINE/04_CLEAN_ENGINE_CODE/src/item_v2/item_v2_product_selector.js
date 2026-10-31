'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — PRODUCT / SCORING-UNIT SELECTOR (non-scoring) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (… INTEGRATED RUNTIME V2 IMPLEMENTATION §1 · §6). Reason: one product selection shared by all four axes.
 * Precedence (order §1.4): 1 explicit valid USER target → 2 valid upstream MERCHANDISE identity → 3 AUTOMATIC Primary merchandise selection.
 * Affected Scope: this file (new).
 *
 * Candidates = Vision V1.3 targets with eligible === true, a record and an OBSERVED category (Vision role "Primary" = every eligible candidate — not a selection).
 * AUTOMATIC rule (deterministic, evidence-only, explainable): one candidate → it · else the unique candidate with the highest Vision `prominence`
 *   (dominant > secondary > minor > not reported — scene presentation evidence, order §1.3) · else AMBIGUOUS: the first tied candidate in Vision target order,
 *   flagged and disclosed. ⛔ Never parameter completeness, GT, REF, scoring_units[], folder or file names. ⛔ Never a Suit (Suit only from explicit input).
 * SUIT (explicit input only): members = the given suit_component_target_ids, else the unique eligible Jacket + the unique eligible Trouser | Skirt;
 *   otherwise SUIT_MEMBER_ASSOCIATION_FAILED — no fabricated member, no Jacket-only conversion.
 * ⛔ An explicit target is never replaced: an invalid one is an input issue, not a fallback trigger.
 */
const C = require('./item_v2_contracts');
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const PROMINENCE_RANK = Object.freeze({ dominant: 3, secondary: 2, minor: 1 });
const SUIT_SETS = Object.freeze([['Jacket', 'Trouser'], ['Jacket', 'Skirt']]);   // CEO 2026-10-28 Suit constitution (Pantsuit · Skirt Suit)
const catOf = (t) => (t && isPlain(t.record) && isPlain(t.record.category) && t.record.category.state === 'OBSERVED' && typeof t.record.category.value === 'string' ? t.record.category.value : null);
const isCandidate = (t) => !!t && t.eligible === true && isPlain(t.record) && isPlain(t.record.observations) && !!catOf(t);
const rankOf = (t) => PROMINENCE_RANK[t.prominence] || 0;
const issue = (code, detail, trace) => ({ ok: false, issue: code, detail, trace });

function automatic(cands, scope) {
  if (cands.length === 1) return { target: cands[0], status: C.SELECTION_STATUS.AUTOMATIC_UNAMBIGUOUS, basis: scope + 'SINGLE_ELIGIBLE_GARMENT' };
  const top = Math.max(...cands.map(rankOf)); const tied = cands.filter((t) => rankOf(t) === top);
  if (tied.length === 1) return { target: tied[0], status: C.SELECTION_STATUS.AUTOMATIC_UNAMBIGUOUS, basis: scope + 'UNIQUE_HIGHEST_VISION_PROMINENCE (' + (tied[0].prominence || 'none') + ')' };
  return { target: tied[0], status: C.SELECTION_STATUS.AUTOMATIC_AMBIGUOUS, basis: scope + 'TIE (' + tied.length + ' candidates · prominence ' + (top ? tied[0].prominence : 'not reported') + ') → FIRST_IN_VISION_TARGET_ORDER', tied: tied.map((t) => t.target_id) };
}

function fromSpec(spec, source, targets, cands) {
  const pi = spec.product_identity;
  if (pi && pi.merchandise_type === 'SUIT') {
    let members;
    if (pi.suit_component_target_ids) {
      members = pi.suit_component_target_ids.map((id) => targets.find((t) => t.target_id === id));
      const missing = pi.suit_component_target_ids.filter((id, i) => !members[i]); if (missing.length) return issue(C.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit member target(s) not in the envelope: ' + missing.join(', '));
      const unscorable = members.filter((m) => !isCandidate(m)); if (unscorable.length) return issue(C.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit member target(s) not eligible garment records: ' + unscorable.map((m) => m.target_id).join(', '));
    } else {
      const jackets = cands.filter((t) => catOf(t) === 'Jacket'); const lowers = cands.filter((t) => ['Trouser', 'Skirt'].includes(catOf(t)));
      if (jackets.length !== 1 || lowers.length !== 1) return issue(C.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit declared without member ids and the members are not uniquely identifiable (eligible Jacket ' + jackets.length + ' · Trouser / Skirt ' + lowers.length + ')');
      members = [jackets[0], lowers[0]];
    }
    const cats = members.map(catOf).slice().sort();
    if (!SUIT_SETS.some((s) => JSON.stringify(s) === JSON.stringify(cats))) return issue(C.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit members must be one Jacket + one Trouser or one Jacket + one Skirt (got ' + cats.join(' + ') + ')');
    return { unit: 'SUIT', source, status: C.SELECTION_STATUS.VALID, members: members.map((m) => m.target_id), basis: pi.suit_component_target_ids ? 'EXPLICIT_SUIT_MEMBER_IDS' : 'SUIT_MEMBERS_BY_UNIQUE_CATEGORY (' + cats.join(' + ') + ')' };
  }
  if (pi && pi.primary_target_id) {
    const t = targets.find((x) => x.target_id === pi.primary_target_id);
    if (!t) return issue(C.INPUT_ISSUE.EXPLICIT_TARGET_NOT_FOUND, source + ' target ' + pi.primary_target_id + ' is not in the envelope');
    if (!isCandidate(t)) return issue(C.INPUT_ISSUE.EXPLICIT_TARGET_NOT_SCORABLE, source + ' target ' + pi.primary_target_id + ' has no eligible garment record (role ' + t.role + ')');
    const conflict = spec.category && spec.category !== catOf(t) ? [{ kind: 'CATEGORY_VS_TARGET', declared: spec.category, observed: catOf(t), resolution: 'explicit target kept' }] : [];
    return { unit: 'ITEM', source, status: C.SELECTION_STATUS.VALID, target: t.target_id, basis: 'EXPLICIT_PRIMARY_TARGET_ID', conflicts: conflict };
  }
  if (spec.category) {
    const inCat = cands.filter((t) => catOf(t) === spec.category);
    if (!inCat.length) return issue(C.INPUT_ISSUE.EXPLICIT_CATEGORY_NOT_FOUND, source + ' category ' + spec.category + ' has no eligible garment in the envelope (eligible: ' + cands.map((t) => t.target_id + ':' + catOf(t)).join(', ') + ')');
    const a = automatic(inCat, 'CATEGORY_MATCH · ');
    return { unit: 'ITEM', source, status: a.status === C.SELECTION_STATUS.AUTOMATIC_AMBIGUOUS ? a.status : C.SELECTION_STATUS.VALID, target: a.target.target_id, basis: 'EXPLICIT_CATEGORY ' + spec.category + ' → ' + a.basis, tied: a.tied };
  }
  return null;   // the spec names no product (e.g. merchandise_type ITEM only) → next precedence level
}

/** @returns {{ ok:true, unit, source, status, target?, members?, basis, excluded[], candidates[], conflicts[] } | { ok:false, issue, detail }} */
function selectProduct(input) {
  const targets = input.vision_envelope.targets; const cands = targets.filter(isCandidate);
  const user = input.user_selection || null, merch = input.merchandise_metadata || null; const conflicts = [];
  if (user && merch) {
    const u = JSON.stringify(user), m = JSON.stringify(merch);
    if (u !== m) conflicts.push({ kind: 'USER_VS_MERCHANDISE_METADATA', user, merchandise_metadata: merch, resolution: 'USER takes precedence (order §1.4)' });
  }
  let sel = null;
  for (const [spec, source] of [[user, C.SELECTION_SOURCE.USER], [merch, C.SELECTION_SOURCE.MERCHANDISE_METADATA]]) {
    if (!spec) continue; const r = fromSpec(spec, source, targets, cands);
    if (r && r.ok === false) return Object.assign(r, { trace: { source, candidates: cands.map((t) => t.target_id), conflicts } });
    if (r) { sel = r; break; }
  }
  if (!sel) {
    if (!cands.length) return issue(C.INPUT_ISSUE.NO_IDENTIFIABLE_MERCHANDISE_GARMENT, 'no eligible garment record with an observed category in the envelope', { source: C.SELECTION_SOURCE.AUTOMATIC_FALLBACK, candidates: [], conflicts });
    const a = automatic(cands, '');
    sel = { unit: 'ITEM', source: C.SELECTION_SOURCE.AUTOMATIC_FALLBACK, status: a.status, target: a.target.target_id, basis: a.basis, tied: a.tied };
  }
  const chosen = sel.unit === 'SUIT' ? sel.members : [sel.target];
  const excluded = targets.filter((t) => !chosen.includes(t.target_id)).map((t) => ({ target_id: t.target_id, role: t.role || null, eligible: t.eligible === true, category: catOf(t), prominence: t.prominence || null, why: isCandidate(t) ? 'NOT_THE_SELECTED_PRODUCT (styling / other garment)' : 'NOT_AN_ELIGIBLE_GARMENT_RECORD' }));
  return Object.assign({ ok: true, candidates: cands.map((t) => ({ target_id: t.target_id, category: catOf(t), prominence: t.prominence || null })), excluded, conflicts: conflicts.concat(sel.conflicts || []) }, sel, { conflicts: conflicts.concat(sel.conflicts || []) });
}

module.exports = { selectProduct, SUIT_SETS, PROMINENCE_RANK };
