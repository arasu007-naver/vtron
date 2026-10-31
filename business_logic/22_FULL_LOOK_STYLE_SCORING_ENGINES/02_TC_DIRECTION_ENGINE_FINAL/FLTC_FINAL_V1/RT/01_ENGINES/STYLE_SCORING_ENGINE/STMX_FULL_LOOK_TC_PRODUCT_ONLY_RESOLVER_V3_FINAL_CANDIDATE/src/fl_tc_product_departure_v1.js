'use strict';
/**
 * Garment-level PRODUCT departure. Reuses the frozen Item TC Step 2 predicates (bound in fl_tc_authority_v1.js) — the resolver never re-implements them.
 * Logic = k2_corrected_replay.js garmentTC() (FIELD map · archetype keys · interpretive-UNRESOLVED test · IX-1 (b) exclusion · irrelevance by
 * frozen-domain substitution), with four implementation corrections (input representation only — no TC rule is added, removed or changed):
 *   [IMPL-1] irrelevance proof: single + pairwise substitution first (k2), then EXHAUSTIVE over every combination of the open testable facts
 *            (k2 stopped at pairs). Joint space above MAX_COMBINATIONS → UNRESOLVED_PROOF_LIMIT (fail-closed), never Classic.
 *   [IMPL-2] substitution domains = the frozen Item V1_3 category domains (domainFor(field, category)): length and silhouette become testable,
 *            fit uses the category's own domain (k2: one hard-coded fit domain; length / silhouette untestable).
 *   [IMPL-3] pocket morphology is passed to the frozen evaluator as pocket.pockets[] instances { location, construction, projection } (plain
 *            values, null when not OBSERVED) — the representation the frozen pocket-system predicate reads. Unobserved instance construction /
 *            projection are open facts of the irrelevance proof. Multiplicity density / count is not carried by Vision V1 (residual).
 *   [IMPL-4] an applicable fact (frozen Item V1_3 applicability) whose cell was not delivered, and that no frozen conditional gate makes N/A,
 *            is an open fact (missing ≠ absent) — k2 silently evaluated without it.
 * Garment status vocabulary (k2): DEPARTURE · NO_VISIBLE_DEPARTURE · UNRESOLVED_FROZEN_INTERPRETIVE · UNRESOLVED_MATERIAL_MISSING ·
 *   UNRESOLVED_UNTESTABLE (+ UNRESOLVED_PROOF_LIMIT). Accessories are outside the product gate (TC-D-4b HELD). No score / strength / tier.
 */
const A = require('./fl_tc_authority_v1.js');
const VG = require(A.ROOT + A.PINS.flv_integrated_gates.path);   // frozen Full-Look Vision conditional gates (read-only, hash-pinned)
const GARMENT = Object.freeze(['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt', 'Jacket', 'Coat', 'Trouser', 'Skirt', 'Dress', 'Jumpsuit']);   // SVP-002 garment categories (frozen Item category set)
const FIELD = Object.freeze({ 'SVP-103': 'silhouette', 'SVP-104': 'fit', 'SVP-105': 'shoulder_structure', 'SVP-107': 'asymmetry', 'SVP-108': 'length', 'SVP-109': 'sleeve_volume', 'SVP-110': 'shoulder_span', 'SVP-111': 'closure_type', 'SVP-112': 'front_opening_extent', 'SVP-113': 'collar', 'SVP-114': 'sleeve', 'SVP-115': 'shoulder_connection', 'SVP-116': 'pocket', 'SVP-117': 'pocket_construction', 'SVP-118': 'pocket_projection', 'SVP-119': 'waist_definition', 'SVP-120': 'slit', 'SVP-123': 'surface', 'SVP-124': 'material', 'SVP-126': 'attachment' });
const SVP_OF = Object.fromEntries(Object.entries(FIELD).map(([s, f]) => [f, s]));
const ARCH = Object.freeze({ 'Shirt': 'shirt', 'T-Shirt': 'tshirt', 'Sweater': 'sweater', 'Sweatshirt': 'sweatshirt', 'Trouser': 'trouser', 'Skirt': 'skirt', 'Dress': 'dress', 'Jumpsuit': 'jumpsuit' }); const OW = Object.freeze({ 'Jacket': 'JACKET', 'Coat': 'COAT' });
const keyOf = (c) => ARCH[c.identity] || (OW[c.identity] ? OW[c.identity] + ':' + (c.grammar || '<GRAMMAR_UNKNOWN>') : 'UNMAPPED:' + c.identity);
const INTERPRETIVE = /MORPH|ASYM-SOURCE|TOKEN-UNKNOWN|U-KEY|UNMAPPED/;   // frozen predicate unresolved on OBSERVED evidence (not a missing state)
const POCKET_INST = /^pocket\[(\d+)\]\.(construction|projection)$/;
/** [IMPL-2] frozen Item V1_3 domain for a fact of a garment category (pocket instance facts use the pocket_* domains) */
const domainOf = (f, category) => { const m = f.match(POCKET_INST); if (m) return A.IV.VALUE_DOMAINS['pocket_' + m[2]] || null; const d = A.IV.domainFor(f, category); return Array.isArray(d) && d.length ? d : null; };
const MAX_COMBINATIONS = 50000;
const OCCLUDER = 'OCCLUDED_BY_OTHER_GARMENT';
const plain = (x) => (x && typeof x === 'object' ? (x.state === 'OBSERVED' ? x.value : null) : x == null ? null : x);
function evalTokens(tokens, c) { const r = A.S2.evaluateMember(tokens, keyOf(c), []); return { dir: r.direction.replace('DIRECTION_', ''), rules: [r.silhouette.rule, r.proportion.rule, r.construction.rule, r.asymmetry && r.asymmetry.rule].filter(Boolean), channels: { silhouette: r.silhouette.v, proportion: r.proportion.v, construction: r.construction.v, asymmetry: r.asymmetry ? (r.asymmetry.departure_exists ? 'TRUE' : r.asymmetry.v || 'FALSE') : null } }; }
function sub(t, f, v) { const m = f.match(POCKET_INST); if (m) { const p = { ...t.pocket, pockets: t.pocket.pockets.map((i) => ({ ...i })) }; p.pockets[+m[1]][m[2]] = v; return { ...t, pocket: p }; } return { ...t, [f]: A.IV.MULTI.includes(f) ? { state: 'OBSERVED', value: null, values: [v] } : { state: 'OBSERVED', value: v, values: null } }; }
/** [IMPL-4] is an undelivered fact lawfully absent? (not applicable to the category, retired scalar pocket morphology, or N/A by a frozen conditional gate) */
function lawfullyAbsent(L, c, f) {
  if (!A.IV.applicableSet(c.identity).has(f)) return 'NOT_APPLICABLE (Item V1_3 applicability)';
  if (A.IV.POCKET_SCALAR_MORPHOLOGY.includes(f)) return 'NESTED (pocket.pockets[] is the carrier, CA#29)';
  const g = VG.CONDITIONAL_GATES[f]; if (g) { if (g.categories && !g.categories.includes(c.identity)) return 'NOT_APPLICABLE (gate category)'; const parent = L.cell(SVP_OF[g.parent] + '@' + c.ref); if (g.na_when(parent)) return 'N/A by frozen conditional gate (' + g.parent + ' = ' + plain(parent) + ')'; }
  return null;
}
/** evaluateGarment(L, c) → garment row with status, frozen rules, the evidence it read and what it excluded. */
function evaluateGarment(L, c) {
  const tokens = {}; const occluded = [], open = [], used = [], absentLawful = [], notDelivered = [];
  for (const [svp, f] of Object.entries(FIELD)) { const x = L.cell(svp + '@' + c.ref);
    if (!x) { const why = lawfullyAbsent(L, c, f); if (why) absentLawful.push(f + ': ' + why); else { notDelivered.push(f); open.push(f); used.push(svp + '@' + c.ref + '=NOT_DELIVERED'); } continue; }
    used.push(svp + '@' + c.ref + '=' + (x.state === 'OBSERVED' ? JSON.stringify(x.value) : x.state));
    if (x.state === 'OBSERVED') { tokens[f] = Array.isArray(x.value) ? { state: 'OBSERVED', value: null, values: x.value.map((v) => (typeof v === 'object' ? v.value || v : v)) } : { state: 'OBSERVED', value: x.value, values: null };
      if (f === 'pocket' && Array.isArray(x.pockets)) { tokens.pocket.pockets = x.pockets.map((i) => ({ location: i.location || null, construction: plain(i.construction), projection: plain(i.projection) }));   // [IMPL-3]
        x.pockets.forEach((i, n) => { for (const k of ['construction', 'projection']) if (!(i[k] && i[k].state === 'OBSERVED')) open.push('pocket[' + n + '].' + k); }); } }
    else { tokens[f] = { state: x.state, value: null, values: null }; if (x.state !== 'ABSENT') ((L.notVisible[c.ref + '.' + f] || []).includes(OCCLUDER) && x.state === 'NOT_VISIBLE' ? occluded : open).push(f); } }
  const head = { ref: c.ref, identity: c.identity, archetype_key: keyOf(c), evidence_read: used, lawfully_absent: absentLawful, not_delivered: notDelivered, pocket_instances: tokens.pocket && tokens.pocket.pockets ? tokens.pocket.pockets : null };
  const base = evalTokens(tokens, c);
  if (base.dir === 'TRANSFORMATIVE') return { ...head, status: 'DEPARTURE', rules: base.rules, channels: base.channels, open, occluded };
  if (base.rules.some((r) => INTERPRETIVE.test(r))) return { ...head, status: 'UNRESOLVED_FROZEN_INTERPRETIVE', rules: base.rules, channels: base.channels, open, occluded };
  const dom = (f) => domainOf(f, c.identity);
  const testable = open.filter((f) => dom(f)), untestable = open.filter((f) => !dom(f));
  const space = testable.reduce((n, f) => n * dom(f).length, 1);
  let material = null, tried = 0;
  // (a) k2 single + pairwise substitution first — names the concrete missing fact(s) whenever one or two suffice
  for (const f of testable) { for (const v of dom(f)) { tried++; if (evalTokens(sub(tokens, f, v), c).dir === 'TRANSFORMATIVE') { material = f + '=' + v; break; } } if (material) break; }
  for (let i = 0; i < testable.length && !material; i++) for (let j = i + 1; j < testable.length && !material; j++) { const a = testable[i], b = testable[j]; outer: for (const va of dom(a)) for (const vb of dom(b)) { tried++; if (evalTokens(sub(sub(tokens, a, va), b, vb), c).dir === 'TRANSFORMATIVE') { material = a + '=' + va + ' & ' + b + '=' + vb; break outer; } } }
  if (material) return { ...head, status: 'UNRESOLVED_MATERIAL_MISSING', material, rules: base.rules, channels: base.channels, open, occluded, combinations_tried: tried };
  if (testable.length > 2 && space > MAX_COMBINATIONS) return { ...head, status: 'UNRESOLVED_PROOF_LIMIT', rules: base.rules, channels: base.channels, open, occluded, combinations: space, note: 'single + pairwise substitution found no departure; the full joint space exceeds the proof limit, so irrelevance is not proven' };
  // (b) [IMPL-1] exhaustive irrelevance proof: every combination of values of the open testable facts through the frozen predicates
  if (testable.length > 2) { const idx = testable.map(() => 0);
    for (;;) { let t = tokens; testable.forEach((f, i) => { t = sub(t, f, dom(f)[idx[i]]); }); tried++;
      if (evalTokens(t, c).dir === 'TRANSFORMATIVE') { material = testable.map((f, i) => f + '=' + dom(f)[idx[i]]).join(' & '); break; }
      let k = 0; while (k < idx.length && ++idx[k] === dom(testable[k]).length) { idx[k] = 0; k++; } if (k === idx.length) break; } }
  if (material) return { ...head, status: 'UNRESOLVED_MATERIAL_MISSING', material, rules: base.rules, channels: base.channels, open, occluded, combinations_tried: tried };
  if (untestable.length) return { ...head, status: 'UNRESOLVED_UNTESTABLE', untestable, rules: base.rules, channels: base.channels, open, occluded };
  return { ...head, status: 'NO_VISIBLE_DEPARTURE', rules: base.rules, channels: base.channels, irrelevant_open: open, irrelevance_proof: testable.length ? (testable.length > 2 ? 'exhaustive' : 'complete (≤ 2 facts: single + pairwise = every combination)') + ' over ' + tried + ' substitutions: none creates a frozen departure' : null, excluded_occluded: occluded };
}
/** evaluateProduct(L) → { status, garments, unknown_identity } — product-departure stage of the look (garments only). */
function evaluateProduct(L) {
  const garments = L.comps.filter((c) => GARMENT.includes(c.identity)).map((c) => evaluateGarment(L, c));
  const unknownIdentity = L.comps.filter((c) => c.identity === 'UNKNOWN').map((c) => c.ref);
  const dep = garments.filter((g) => g.status === 'DEPARTURE');
  const blocked = garments.filter((g) => !['DEPARTURE', 'NO_VISIBLE_DEPARTURE'].includes(g.status));
  let status; if (dep.length) status = 'DEPARTURE_CONFIRMED'; else if (blocked.length || unknownIdentity.length) status = 'UNRESOLVED'; else if (!garments.length) status = 'UNRESOLVED_NO_GARMENT'; else status = 'NO_DEPARTURE_SUFFICIENT';
  return { status, garments, departures: dep.map((g) => g.ref + ' ' + g.identity + ' [' + g.rules.filter((r) => /TRUE|DEPARTURE/.test(r)).join(',') + ']'), blocked: blocked.map((g) => g.ref + ' ' + g.identity + ' ' + g.status), unknown_identity: unknownIdentity };
}
module.exports = { GARMENT, FIELD, keyOf, INTERPRETIVE, domainOf, MAX_COMBINATIONS, evaluateGarment, evaluateProduct, lawfullyAbsent };
