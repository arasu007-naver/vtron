'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R1 PRODUCT / SCORING-UNIT SELECTOR (non-scoring) · CANDIDATE.
 *
 * Approval Anchor — CEO Decision 2026-10-29 (… PRIMARY ITEM AUTO-SELECTION CORRECTION … §2 Rules 1–4 · §5 · §5.3 · §5.4). Reason: successor of
 * src/item_v2/item_v2_product_selector.js, whose tie rule "FIRST_IN_VISION_TARGET_ORDER" chose a garment without merchandise evidence (0/5 on the governed
 * ITEM identities; 7 of 14 labelled ties wrong). Affected Scope: this file (new); the predecessor file is unchanged.
 *
 * Precedence (Rules 1–3): USER → MERCHANDISE (product_identity · category · product_title) → AUTOMATIC.
 *   USER / MERCHANDISE: explicit ids and Suit members exactly as the predecessor (copied, unchanged semantics). Declared category → its unique candidate;
 *     several in the category → title, then presentation within the category, else UNRESOLVED_WITHIN_DECLARED_CATEGORY.
 *   product_title: (1) the title names exactly one candidate's own Vision category word (whole word, optional plural "s"; longer category names are matched
 *     first, so "T-Shirt" is never read as "Shirt") → that candidate; (2) otherwise the title shares strictly more words (≥ 2 letters) with one candidate's own
 *     Vision descriptor than with any other → that candidate; otherwise the title does not discriminate and the next precedence level runs (disclosed).
 *   AUTOMATIC: one candidate → it · every candidate reports Vision prominence and exactly one holds the highest value → it (presentation evidence, order §5.1)
 *     · otherwise UNRESOLVED with its classification (Rule 4: no target-order, completeness, REF, folder, file-name or GT tie-break).
 * ⛔ No category preference (no "lower garment wins"), no synonym table, no scoring evidence, no Suit inference (Suit only from explicit input).
 * ⛔ An explicit target is never replaced; an invalid one is an input issue, never a fallback trigger.
 */
const C = require('./item_v2_r1_contracts'); const P = C.P;
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const PROMINENCE_RANK = Object.freeze({ dominant: 3, secondary: 2, minor: 1 });
const SUIT_SETS = Object.freeze([['Jacket', 'Trouser'], ['Jacket', 'Skirt']]);   // CEO 2026-10-28 Suit constitution (Pantsuit · Skirt Suit) — as the predecessor
const B = C.SELECTION_DECISION_BASIS, A = C.AMBIGUITY_CLASSIFICATION, S = C.SELECTION_STATUS;
const catOf = (t) => (t && isPlain(t.record) && isPlain(t.record.category) && t.record.category.state === 'OBSERVED' && typeof t.record.category.value === 'string' ? t.record.category.value : null);
const isCandidate = (t) => !!t && t.eligible === true && isPlain(t.record) && isPlain(t.record.observations) && !!catOf(t);
const issue = (code, detail) => ({ ok: false, issue: code, detail });
const words = (s) => new Set((String(s || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length >= 2));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** title → { target, basis, evidence } | { unresolved:true, tied[] , evidence } */
function resolveByTitle(title, set) {
  let rest = ' ' + title.toLowerCase() + ' '; const named = [];
  for (const cat of [...new Set(set.map(catOf))].sort((a, b) => b.length - a.length || (a < b ? -1 : 1))) {
    const re = new RegExp('(^|[^a-z0-9])' + esc(cat.toLowerCase()) + 's?(?=[^a-z0-9]|$)', 'g');
    if (re.test(rest)) { named.push(cat); rest = rest.replace(re, '$1 '); }
  }
  let pool = set;
  if (named.length === 1) { const m = set.filter((t) => catOf(t) === named[0]); if (m.length === 1) return { target: m[0], basis: B.TITLE_CATEGORY_TERM, evidence: 'title names the category "' + named[0] + '" of exactly one candidate' }; pool = m; }
  else if (named.length > 1) pool = set.filter((t) => named.includes(catOf(t)));
  const tw = words(title); const scored = pool.map((t) => ({ t, shared: [...words(t.descriptor)].filter((w) => tw.has(w)).sort() }));
  const top = Math.max(...scored.map((x) => x.shared.length)); const best = scored.filter((x) => x.shared.length === top);
  if (top > 0 && best.length === 1) return { target: best[0].t, basis: B.TITLE_DESCRIPTOR_OVERLAP, evidence: 'title shares ' + top + ' word(s) [' + best[0].shared.join(', ') + '] with the Vision descriptor of ' + best[0].t.target_id + '; next best ' + Math.max(0, ...scored.filter((x) => x !== best[0]).map((x) => x.shared.length)) + (named.length ? ' (category term(s) named: ' + named.join(', ') + ')' : '') };
  return { unresolved: true, tied: (top > 0 ? best.map((x) => x.t) : pool), evidence: 'title does not discriminate (category terms named: ' + (named.join(', ') || 'none') + ' · highest descriptor overlap ' + top + ' shared by ' + best.length + ')' };
}

/** presentation evidence among `set` → { target, basis, evidence } | { unresolved:true, ambiguity, tied[], evidence } */
function byPresentation(set) {
  if (set.length === 1) return { target: set[0], basis: B.SINGLE_ELIGIBLE_GARMENT, evidence: 'one eligible garment' };
  const reported = set.filter((t) => PROMINENCE_RANK[t.prominence]);
  if (!reported.length) return { unresolved: true, ambiguity: A.UNRESOLVED_NO_PRESENTATION_EVIDENCE, tied: set, evidence: 'no Vision prominence reported for ' + set.length + ' candidates' };
  if (reported.length < set.length) return { unresolved: true, ambiguity: A.UNRESOLVED_PARTIAL_PRESENTATION_EVIDENCE, tied: set, evidence: 'prominence reported for ' + reported.length + ' of ' + set.length + ' candidates (absence is not lower presentation)' };
  const top = Math.max(...set.map((t) => PROMINENCE_RANK[t.prominence])); const tied = set.filter((t) => PROMINENCE_RANK[t.prominence] === top);
  if (tied.length === 1) return { target: tied[0], basis: B.UNIQUE_HIGHEST_PRESENTATION, evidence: tied[0].target_id + ' prominence "' + tied[0].prominence + '"; others ' + set.filter((t) => t !== tied[0]).map((t) => t.target_id + ' "' + t.prominence + '"').join(', ') };
  return { unresolved: true, ambiguity: A.UNRESOLVED_EQUAL_PRESENTATION, tied, evidence: tied.length + ' candidates share prominence "' + tied[0].prominence + '"' };
}

function fromSpec(spec, source, targets, cands, title) {
  const pi = spec && spec.product_identity;
  if (pi && pi.merchandise_type === 'SUIT') {   /* unchanged predecessor semantics */
    let members;
    if (pi.suit_component_target_ids) {
      members = pi.suit_component_target_ids.map((id) => targets.find((t) => t.target_id === id));
      const missing = pi.suit_component_target_ids.filter((id, i) => !members[i]); if (missing.length) return issue(P.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit member target(s) not in the envelope: ' + missing.join(', '));
      const unscorable = members.filter((m) => !isCandidate(m)); if (unscorable.length) return issue(P.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit member target(s) not eligible garment records: ' + unscorable.map((m) => m.target_id).join(', '));
    } else {
      const jackets = cands.filter((t) => catOf(t) === 'Jacket'); const lowers = cands.filter((t) => ['Trouser', 'Skirt'].includes(catOf(t)));
      if (jackets.length !== 1 || lowers.length !== 1) return issue(P.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit declared without member ids and the members are not uniquely identifiable (eligible Jacket ' + jackets.length + ' · Trouser / Skirt ' + lowers.length + ')');
      members = [jackets[0], lowers[0]];
    }
    const cats = members.map(catOf).slice().sort();
    if (!SUIT_SETS.some((s) => JSON.stringify(s) === JSON.stringify(cats))) return issue(P.INPUT_ISSUE.SUIT_MEMBER_ASSOCIATION_FAILED, 'Suit members must be one Jacket + one Trouser or one Jacket + one Skirt (got ' + cats.join(' + ') + ')');
    return { unit: 'SUIT', source, status: S.VALID, members: members.map((m) => m.target_id), basis: pi.suit_component_target_ids ? B.EXPLICIT_SUIT_MEMBER_IDS : B.SUIT_MEMBERS_BY_UNIQUE_CATEGORY, evidence: [source + ' product_identity SUIT · members ' + members.map((m) => m.target_id + ':' + catOf(m)).join(' + ')], validation: 'SUIT_MEMBERS_ASSOCIATED' };
  }
  if (pi && pi.primary_target_id) {
    const t = targets.find((x) => x.target_id === pi.primary_target_id);
    if (!t) return issue(P.INPUT_ISSUE.EXPLICIT_TARGET_NOT_FOUND, source + ' target ' + pi.primary_target_id + ' is not in the envelope');
    if (!isCandidate(t)) return issue(P.INPUT_ISSUE.EXPLICIT_TARGET_NOT_SCORABLE, source + ' target ' + pi.primary_target_id + ' has no eligible garment record (role ' + t.role + ')');
    const conflicts = spec.category && spec.category !== catOf(t) ? [{ kind: 'CATEGORY_VS_TARGET', declared: spec.category, observed: catOf(t), resolution: 'explicit target kept' }] : [];
    return { unit: 'ITEM', source, status: S.VALID, target: t.target_id, basis: B.EXPLICIT_PRIMARY_TARGET_ID, evidence: [source + ' primary_target_id ' + t.target_id], validation: 'EXPLICIT_TARGET_IN_ENVELOPE_AND_ELIGIBLE', conflicts };
  }
  if (spec && spec.category) {
    const inCat = cands.filter((t) => catOf(t) === spec.category);
    if (!inCat.length) return issue(P.INPUT_ISSUE.EXPLICIT_CATEGORY_NOT_FOUND, source + ' category ' + spec.category + ' has no eligible garment in the envelope (eligible: ' + cands.map((t) => t.target_id + ':' + catOf(t)).join(', ') + ')');
    const ev = [source + ' category ' + spec.category + ' → ' + inCat.length + ' candidate(s)'];
    if (inCat.length === 1) return { unit: 'ITEM', source, status: S.VALID, target: inCat[0].target_id, basis: B.DECLARED_CATEGORY_UNIQUE_CANDIDATE, evidence: ev, validation: 'DECLARED_CATEGORY_MATCHES_ONE_CANDIDATE' };
    if (title) { const r = resolveByTitle(title, inCat); ev.push(r.evidence); if (!r.unresolved) return { unit: 'ITEM', source, status: S.VALID, target: r.target.target_id, basis: r.basis, evidence: ev, validation: 'DECLARED_CATEGORY + TITLE' }; }
    const p = byPresentation(inCat); ev.push(p.evidence);
    if (!p.unresolved) return { unit: 'ITEM', source, status: S.VALID, target: p.target.target_id, basis: p.basis, evidence: ev, validation: 'DECLARED_CATEGORY + PRESENTATION' };
    return { unit: null, source, status: S.UNRESOLVED, ambiguity: A.UNRESOLVED_WITHIN_DECLARED_CATEGORY, tied: p.tied.map((t) => t.target_id), evidence: ev, validation: 'DECLARED_CATEGORY_MATCHES_SEVERAL_CANDIDATES' };
  }
  if (title) {
    const r = resolveByTitle(title, cands);
    if (!r.unresolved) return { unit: 'ITEM', source, status: S.VALID, target: r.target.target_id, basis: r.basis, evidence: [r.evidence], validation: 'TITLE_MATCHES_ONE_CANDIDATE' };
    return { passThrough: true, note: source + ' product_title present but not discriminating — ' + r.evidence };
  }
  return null;   // the spec names no product → next precedence level
}

/** @returns {{ ok:true, unit:'ITEM'|'SUIT'|null, source, status, target?, members?, basis, evidence[], ambiguity, tied?, candidates[], excluded[], conflicts[], validation, notes[] } | { ok:false, issue, detail, trace }} */
function selectProductR1(input, productTitle) {
  const targets = input.vision_envelope.targets; const cands = targets.filter(isCandidate);
  const user = input.user_selection || null, merch = input.merchandise_metadata || null; const conflicts = []; const notes = [];
  if (user && (merch || productTitle) && JSON.stringify(user) !== JSON.stringify(merch)) conflicts.push({ kind: 'USER_VS_MERCHANDISE_METADATA', user, merchandise_metadata: Object.assign({}, merch, productTitle ? { product_title: productTitle } : {}), resolution: 'USER takes precedence (order §2 Rule 1)' });
  const candList = cands.map((t) => ({ target_id: t.target_id, category: catOf(t), prominence: t.prominence || null, descriptor: t.descriptor || null }));
  let sel = null;
  for (const [spec, source, title] of [[user, P.SELECTION_SOURCE.USER, null], [merch, P.SELECTION_SOURCE.MERCHANDISE_METADATA, productTitle]]) {
    if (!spec && !title) continue; const r = fromSpec(spec, source, targets, cands, title);
    if (r && r.ok === false) return Object.assign(r, { trace: { selection_source: source, candidate_garments: candList, conflicts } });
    if (r && r.passThrough) { notes.push(r.note); continue; }
    if (r) { sel = r; break; }
  }
  if (!sel) {
    if (!cands.length) return Object.assign(issue(P.INPUT_ISSUE.NO_IDENTIFIABLE_MERCHANDISE_GARMENT, 'no eligible garment record with an observed category in the envelope'), { trace: { selection_source: P.SELECTION_SOURCE.AUTOMATIC_FALLBACK, candidate_garments: [], conflicts } });
    const p = byPresentation(cands);
    sel = p.unresolved ? { unit: null, source: P.SELECTION_SOURCE.AUTOMATIC_FALLBACK, status: S.UNRESOLVED, ambiguity: p.ambiguity, tied: p.tied.map((t) => t.target_id), basis: B.NONE, evidence: [p.evidence], validation: 'NOT_APPLICABLE (no product identity supplied)' }
      : { unit: 'ITEM', source: P.SELECTION_SOURCE.AUTOMATIC_FALLBACK, status: S.AUTOMATIC_SELECTED, target: p.target.target_id, basis: p.basis, evidence: [p.evidence], validation: 'NOT_APPLICABLE (no product identity supplied)' };
  }
  const chosen = sel.unit === 'SUIT' ? sel.members : sel.unit === 'ITEM' ? [sel.target] : [];
  const excluded = sel.unit ? targets.filter((t) => !chosen.includes(t.target_id)).map((t) => ({ target_id: t.target_id, category: catOf(t), prominence: t.prominence || null, why: isCandidate(t) ? 'NOT_THE_SELECTED_PRODUCT (styling / other garment)' : 'NOT_AN_ELIGIBLE_GARMENT_RECORD' })) : [];
  return Object.assign({ ok: true, ambiguity: A.NONE, basis: B.NONE, tied: null }, sel, { candidates: candList, excluded, conflicts: conflicts.concat(sel.conflicts || []), notes });
}

module.exports = { selectProductR1, resolveByTitle, byPresentation, PROMINENCE_RANK, SUIT_SETS };
