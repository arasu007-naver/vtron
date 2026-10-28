'use strict';
/**
 * V1.3 — TC PRODUCT-DEPARTURE EVIDENCE VIEW (Stage D of the CEO order 2026-10-11). DERIVED · DIAGNOSTIC · NON-CANONICAL.
 *   It answers one Vision-side question per participating garment: does the packet carry the observable product facts that the
 *   FROZEN Item TC Step 2 predicates read, and in which state (OBSERVED / ABSENT / NOT_VISIBLE + limitation / UNKNOWN / NOT_EMITTED /
 *   NOT_APPLICABLE)? It is built from the validated packet only (K-2 pool + registry) and keeps provenance per fact.
 *   ⛔ It is NOT a Vision parameter, NOT a Full-Look TC Direction, NOT a styling evaluation and NOT a score. It never says T or C for the
 *      look. Styling departure, product-vs-styling arbitration, Classic safety, Strength and ordinals are OUT OF SCOPE (later Scoring).
 *   Optional frozen-predicate diagnostic (opts.frozenPredicates = true): the frozen Step 2 successor V4 module is loaded READ-ONLY
 *   (it hash-verifies its 15 bound inputs) and `evaluateMember(tokens, key)` is called on the garment's own tokens. Its member-level
 *   result (TRANSFORMATIVE / CLASSIC / DIRECTION_UNRESOLVED and the fired rules) is reported as `frozen_member_diagnostic` — a
 *   garment-level, read-only consistency check that the extracted evidence can feed the frozen predicate, nothing more.
 * Key mapping = the frozen clean-run mapping (run_clean_v2_3_2.js L31 / L35) transcribed verbatim.
 */
const path = require('path');
const C = require('../contracts');
const R = require('../registry');
const ARCH = { 'Shirt': 'shirt', 'T-Shirt': 'tshirt', 'Sweater': 'sweater', 'Sweatshirt': 'sweatshirt', 'Trouser': 'trouser', 'Skirt': 'skirt', 'Dress': 'dress', 'Jumpsuit': 'jumpsuit' }; const OW = { 'Jacket': 'JACKET', 'Coat': 'COAT' };
// facts the frozen Step 2 predicates read (silh · prop · constr · asymmetry) — from the frozen evaluator source (evaluator_v2_2_base.js · evaluator_v2_3_2.js)
const PREDICATE_FACTS = Object.freeze(['fit', 'sleeve_volume', 'shoulder_structure', 'shoulder_span', 'silhouette', 'length', 'sleeve', 'collar', 'closure_type', 'front_opening_extent', 'material', 'surface', 'attachment', 'pocket', 'pocket_construction', 'pocket_projection', 'shoulder_connection', 'waist_definition', 'asymmetry', 'slit']);
const S2V4 = path.join(C.ROOT, '01_ENGINES', 'ITEM_SCORING_ENGINE', 'STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V4_CANDIDATE', 'src', 'step2_semantic_successor_v4.js');

function tokenOf(entry) {
  if (!entry) return { state: 'NOT_EMITTED' };
  if (entry.state === 'OBSERVED') {
    const t = Array.isArray(entry.value) ? { state: 'OBSERVED', value: null, values: entry.value.slice() } : { state: 'OBSERVED', value: entry.value, values: null };
    // INTEGRATED V1 (CA#29): the pocket token carries its instances in the flattened form the frozen evaluator_v2_3_2 pocketInstances() reads
    // (location · construction · projection as plain values; non-OBSERVED children → null). Format projection only — no value is changed.
    if (entry.fact === 'pocket' && entry.pockets) t.pockets = entry.pockets.map((p) => ({ location: p.location, construction: p.construction && p.construction.state === 'OBSERVED' ? p.construction.value : null, projection: p.projection && p.projection.state === 'OBSERVED' ? p.projection.value : null }));
    return t;
  }
  return { state: entry.state, value: null, values: null };
}

function buildTcProductEvidenceView(packet, opts) {
  const o = opts || {}; const pool = packet.component_fact_pool; const garments = [];
  let succ = null; if (o.frozenPredicates) { const M = require(S2V4); succ = M.createSuccessor(); }
  for (const e of packet.component_registry) {
    if (!R.isGarment(e) && !R.isUnknownIdentity(e)) continue;                        // accessories: no product-departure predicate exists (TC-D-4b HELD) → not in this view
    const ref = e.component_ref; const cat = R.category(e); const byFact = Object.fromEntries(pool.filter((f) => f.component_ref === ref).map((f) => [f.fact, f]));
    const applicable = cat ? new Set([...C.ITEM.applicableSet(cat)].filter((f) => C.REQUESTABLE_FACTS.includes(f))) : new Set();
    const facts = {}; const tokens = {};
    for (const f of PREDICATE_FACTS) {
      if (!cat) { facts[f] = { state: 'IDENTITY_UNKNOWN' }; continue; }
      if (!applicable.has(f)) { facts[f] = { state: 'NOT_APPLICABLE' }; continue; }
      const p = byFact[f];
      if (!p) { if (f === 'pocket_construction' || f === 'pocket_projection') { const pk = byFact.pocket; facts[f] = pk && pk.state === 'OBSERVED' && pk.value === 'Present' ? { state: 'NESTED_IN_POCKETS', why: 'CA#29: carried inside pocket.pockets[] (passed to the predicate with the pocket token)' } : { state: 'NOT_APPLICABLE', why: 'pocket not Present' }; continue; } const trig = ((packet.request_trace || {}).k2_ledger || []).find((l) => l.component_ref === ref && l.not_applicable_by_trigger && l.not_applicable_by_trigger[f]);   // INTEGRATED V1: a frozen Item conditional trigger (e.g. closure_type when front_opening_extent = None) is NOT_APPLICABLE, not an omission
        facts[f] = trig ? { state: 'NOT_APPLICABLE', why: 'frozen Item conditional trigger: ' + trig.not_applicable_by_trigger[f] } : { state: 'NOT_EMITTED', why: 'applicable fact not in the pool (not requested or not emitted)' }; continue; }
      facts[f] = { state: p.state, ...(p.value !== undefined ? { value: p.value } : {}), ...(p.limitation ? { limitation: p.limitation } : {}), route: p.route, source: p.source, ...(p.lineage ? { lineage: p.lineage } : {}) };
      if (p.state === 'OBSERVED' || p.state === 'ABSENT' || p.state === 'NOT_VISIBLE' || p.state === 'UNKNOWN') tokens[f] = tokenOf(p);
    }
    const gram = byFact.grammar; const td = byFact.trouser_distinction;
    let key = null, keyNote = null;
    if (!cat) { key = null; keyNote = 'identity UNKNOWN → no archetype key (predicates cannot run)'; }
    else if (ARCH[cat]) key = ARCH[cat];
    else if (OW[cat]) { if (gram && gram.state === 'OBSERVED') key = OW[cat] + ':' + gram.value; else { key = OW[cat] + ':<GRAMMAR_' + (gram ? gram.state : 'NOT_EMITTED') + '>'; keyNote = 'grammar not observed → key unresolved (U-KEY in the frozen predicates)'; } }
    const states = Object.values(facts).map((x) => x.state);
    const completeness = { observed: states.filter((s) => s === 'OBSERVED').length, absent: states.filter((s) => s === 'ABSENT').length, not_visible: states.filter((s) => s === 'NOT_VISIBLE').length, unknown: states.filter((s) => s === 'UNKNOWN').length, not_emitted: states.filter((s) => s === 'NOT_EMITTED').length, not_applicable: states.filter((s) => s === 'NOT_APPLICABLE').length };
    const g = { component_ref: ref, category: cat || null, identity_state: e.object_identity.state, archetype_key: key, key_note: keyNote, item_record_ref: e.item_record_ref || null, predicate_read_facts: facts, completeness, evidence_classes: { hidden_by_participant: Object.entries(facts).filter(([, x]) => x.state === 'NOT_VISIBLE' && (x.limitation || []).includes('OCCLUDED_BY_OTHER_GARMENT')).map(([f]) => f), cropped_or_fragmentary: Object.entries(facts).filter(([, x]) => x.state === 'NOT_VISIBLE' && (x.limitation || []).some((l) => l !== 'OCCLUDED_BY_OTHER_GARMENT')).map(([f]) => f), unknown: Object.entries(facts).filter(([, x]) => x.state === 'UNKNOWN').map(([f]) => f), not_emitted: Object.entries(facts).filter(([, x]) => x.state === 'NOT_EMITTED').map(([f]) => f) } };
    if (td && cat === 'Trouser') g.trouser_distinction = td.state === 'OBSERVED' ? td.value : td.state;
    if (succ && key && !/[<]/.test(key)) {
      const r = succ.evaluateMember(tokens, key, []);
      g.frozen_member_diagnostic = { scope: 'GARMENT-LEVEL READ-ONLY DIAGNOSTIC (frozen Step 2 successor V4 evaluateMember); NOT a Full-Look TC Direction', member_direction: r.direction, silhouette: { v: r.silhouette.v, rule: r.silhouette.rule }, proportion: { v: r.proportion.v, rule: r.proportion.rule }, construction: { v: r.construction.v, rule: r.construction.rule }, asymmetry: { departure_exists: r.asymmetry.departure_exists, rule: r.asymmetry.rule }, input_contract_rules: r.provenance.input_contract_rules, diagnostics: r.provenance.diagnostics };
    } else if (succ) g.frozen_member_diagnostic = { scope: 'not run', why: keyNote || 'no key' };
    garments.push(g);
  }
  return { view: 'STMX_FULL_LOOK_TC_PRODUCT_EVIDENCE_VIEW', status: 'DERIVED_DIAGNOSTIC_NON_CANONICAL', packet_version: packet.packet_version, scope_note: 'Vision-side evidence completeness per participating garment for the frozen Item TC Step 2 predicates. No look-level TC, no styling, no score, no Strength.', excluded: 'accessories (TC-D-4b HELD: no product-departure predicate exists)', garments };
}

module.exports = { buildTcProductEvidenceView, PREDICATE_FACTS, ARCH, OW };
