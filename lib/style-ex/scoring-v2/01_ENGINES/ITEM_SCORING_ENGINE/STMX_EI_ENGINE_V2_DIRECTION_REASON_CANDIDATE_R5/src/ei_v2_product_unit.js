'use strict';
/* STMX ITEM EI V2 — CANDIDATE R5. ITEM SCORING-UNIT SELECTION (CEO 2026-10-28 final constitution: a verified genuine Suit — Jacket + Trouser OR Jacket + Skirt — is ONE Suit
   Item; every other product → its Primary Merchandise Item only; styling excluded). Runs BEFORE the unchanged core. Generic on governed product identity — no REF, GT,
   folder, colour, material or visual-coordination input.
     ITEM_PRODUCT · product_identity.merchandise_type ITEM → ONE GARMENT request built from the primary target ONLY (every other target is excluded, never read)
     ITEM_PRODUCT · product_identity.merchandise_type SUIT → ONE set request of exactly two components: one Jacket + one Trouser, or one Jacket + one Skirt (other targets excluded)
     bare MATCHING_PAIR / members[] request              → refused (a historical set label or two visible garments is not set authority)
     any other request                                   → passed to the core unchanged (single GARMENT path)
   An unidentifiable product unit is a TECHNICAL_INVALID_REQUEST (outside the Direction contract) — never a guessed primary and never a final UNKNOWN. */
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const catOf = (b) => { const c = b && b.category; return typeof c === 'string' ? c : isPlain(c) && c.state === 'OBSERVED' ? c.value : null; };
const bodyOf = (t) => (isPlain(t.record) ? t.record : isPlain(t.input) ? t.input : null);
const SUIT_COMPONENT_SETS = [['Jacket', 'Trouser'], ['Jacket', 'Skirt']];   /* CEO 2026-10-28: Pantsuit · Skirt Suit (sorted category pairs) */
const bad = (detail) => ({ ok: false, error: 'TECHNICAL_INVALID_REQUEST', detail });
function selectScoringUnit(req) {
  if (!isPlain(req)) return { ok: true, request: req, selection: null };
  if (req.scoring_unit_type === 'ITEM_PRODUCT') {
    const pi = req.product_identity, ts = req.targets;
    if (!isPlain(pi)) return bad('ITEM_PRODUCT without product_identity');
    if (!Array.isArray(ts) || !ts.length || !ts.every(isPlain)) return bad('ITEM_PRODUCT without targets');
    const ids = ts.map((t) => t.target_id);
    if (ids.some((i) => typeof i !== 'string' || !i.trim()) || new Set(ids).size !== ids.length) return bad('target ids must be unique non-empty strings');
    if (pi.merchandise_type === 'ITEM') {
      const hit = ts.filter((t) => t.target_id === pi.primary_target_id);
      if (hit.length !== 1 || !bodyOf(hit[0])) return bad('primary_target_id does not identify exactly one target with a record');
      return { ok: true, request: { scoring_unit_type: 'GARMENT', record: bodyOf(hit[0]) }, selection: { unit: 'ITEM', primary_target: pi.primary_target_id, excluded_targets: ids.filter((i) => i !== pi.primary_target_id).sort() } };
    }
    if (pi.merchandise_type === 'SUIT') {
      const comp = pi.suit_component_target_ids;
      if (!Array.isArray(comp) || comp.length !== 2 || new Set(comp).size !== 2) return bad('a SUIT needs exactly two distinct suit_component_target_ids');
      const ms = comp.map((id) => ts.find((t) => t.target_id === id));
      if (ms.some((m) => !m || !bodyOf(m))) return bad('a suit component is not among the targets');
      const cats = ms.map((m) => catOf(bodyOf(m))).sort();
      if (!SUIT_COMPONENT_SETS.some((s) => JSON.stringify(cats) === JSON.stringify(s))) return bad('SUIT components must be one Jacket + one Trouser or one Jacket + one Skirt (got ' + cats.join(' + ') + ')');
      return { ok: true, request: { scoring_unit_type: 'MATCHING_PAIR', members: ms.map((m) => ({ member_id: m.target_id, record: bodyOf(m) })) }, selection: { unit: 'SUIT', suit_components: comp.slice().sort(), excluded_targets: ids.filter((i) => !comp.includes(i)).sort() } };
    }
    return bad('product_identity.merchandise_type must be ITEM or SUIT');
  }
  if (req.scoring_unit_type === 'MATCHING_PAIR' || Array.isArray(req.members)) return bad('a multi-garment set unit requires governed SUIT product identity (ITEM_PRODUCT · merchandise_type SUIT); a MATCHING_PAIR label or co-visible garments are not set authority');
  return { ok: true, request: req, selection: { unit: 'GARMENT' } };
}
module.exports = { selectScoringUnit, SUIT_COMPONENT_SETS };
