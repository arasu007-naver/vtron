'use strict';
/* [FE] PRE-REGISTERED E2E TEST PROTOCOL (test side · non-scoring · written BEFORE any live call; GT never sent to a model and never read by the runtime).
   (1) the seven images + their declared Product Scoring Unit, stated as V1.3 CATEGORIES (V1.3 target ids exist only after the live Vision call):
       the unit comes from governed product identity — EI V2 OVERLAY_V2 Suit members (841 · 840 · 810 · 816), the CEO-GT scoring units (520 · 849 SU1 / SU2),
       the record's merchandise category for REF_000010 (01_Jacket; its GT unit is the legacy default) — never from visual matching.
   (2) mapUnit — the run-time mapping of a declared unit to the live V1.3 target ids: exactly ONE eligible target with an OBSERVED category per declared category;
       otherwise UNIT_MAPPING_FAILED (reported as "Wrong Product Target / Vision observation" — never guessed).
   (3) colourScope — the targets whose colour is requested in the one colour call: the declared unit + (REQUESTED_TARGETS images) every other eligible target whose category
       is unique in the image.
   (4) expectations — CEO GT side mapping used by the frozen V2 harnesses (score < 5 low side · > 5 high side · 5 = EI NEUTRAL / TC · SR · DM not compared) + the CEO
       2026-10-29 Suit rules; REF_000841 SR: historical SR4 (R) vs the Suit rule (Jacket governs → S, overlay PROPOSED) — the order's label (Jacket S / Bottom R) is used.
   (5) evaluate — per axis MATCH / MISMATCH / NOT_COMPARED; the Reason recorded verbatim with its status (TEXT · WITHHELD). */
const IMAGE_ROOT = '02_DATABASE_AND_CORPUS/REFERENCE_IMAGES/STMX_ACTIVE_REFERENCE_CORPUS_POST_CEO_V1/';
const TESTS = [
  { test: '01', ref: 'REF_000520', file: '08_Trouser/REF_000520__denimlowrise1.jpeg', sha256: 'cb0aa109390f14e5f8d8353564d7318e81b80a1cc615591cc3b1de6d0602a445', validation: 'Ordinary single Item', colour_scope: 'UNIT', units: [{ id: 'U1', type: 'ITEM', categories: ['Trouser'], basis: 'CEO GT SU1 (target_1 Trouser)', gt: { EI: 'EI5', TC: 'TC6', SR: 'SR6', DM: 'DM6' } }] },
  { test: '02', ref: 'REF_000010', file: '01_Jacket/REF_000010__스크린샷 2026-04-27 141834.png', sha256: 'b5a89565efbdfb6682fd124b2ef634d4f4f52b239f19fb0e52369b1dbf998c95', validation: 'Multiple garments, explicit selected target', colour_scope: 'REQUESTED_TARGETS', units: [{ id: 'U1', type: 'ITEM', categories: ['Jacket'], basis: 'record merchandise category 01_Jacket · CEO GT SU1 (legacy default unit)', gt: { EI: 'EI6', TC: 'TC4', SR: 'SR6', DM: 'DM7' } }], extra_items: ['Shirt', 'Trouser'] },
  { test: '03', ref: 'REF_000841', file: '14_Suit/REF_000841__suitov2.jpeg', sha256: '7b367a674fba8a111c1e460a0c8d48907f997681a0a08ff8a450899c98ae8333', validation: 'Suit — Jacket Structured / Bottom Relaxed', colour_scope: 'UNIT', units: [{ id: 'U1', type: 'SUIT', categories: ['Jacket', 'Trouser'], basis: 'EI V2 OVERLAY_V2 SUIT (target_1 + target_2)', gt: { EI: 'EI4', TC: 'TC7', SR: 'SR4', DM: 'DM4' }, override: { SR: { expected: 'S', why: 'CEO 2026-10-29 Suit rule: the Jacket realized silhouette governs (order test label Jacket S / Bottom R); historical SR4 = R kept verbatim (overlay PROPOSED, D-GT-1)' } } }] },
  { test: '04', ref: 'REF_000840', file: '14_Suit/REF_000840__suitov1.jpeg', sha256: 'd8870354beeb4a12270317ab1f7c32ab8b0500352c3f4b8e76fde39f1f9e7a45', validation: 'Suit — TC Product Departure', colour_scope: 'UNIT', units: [{ id: 'U1', type: 'SUIT', categories: ['Jacket', 'Trouser'], basis: 'EI V2 OVERLAY_V2 SUIT (target_1 + target_3)', gt: { EI: 'EI5', TC: 'TC7', SR: 'SR6', DM: 'DM3' } }] },
  { test: '05', ref: 'REF_000810', file: '14_Suit/REF_000810__embrojk1.jpeg', sha256: '5fbc157593a724f6ad3a6be2d37043084fefdf5a51e2fcdc8017c9d32e07d767', validation: 'Suit — DM Detail (Jacket + Skirt)', colour_scope: 'UNIT', units: [{ id: 'U1', type: 'SUIT', categories: ['Jacket', 'Skirt'], basis: 'EI V2 OVERLAY_V2 SUIT (target_1 + target_2)', gt: { EI: 'EI7', TC: 'TC7', SR: 'SR6', DM: 'DM7' } }] },
  { test: '06', ref: 'REF_000816', file: '14_Suit/REF_000816__tomford1.jpeg', sha256: '1f2d237f69fd042f818f721595556375e5052c812c62e39d96a0b05cc8fecfce', validation: 'Suit — DM Minimal (white shirt inside)', colour_scope: 'UNIT', units: [{ id: 'U1', type: 'SUIT', categories: ['Jacket', 'Trouser'], basis: 'EI V2 OVERLAY_V2 SUIT (target_1 + target_3)', gt: { EI: 'EI5', TC: 'TC4', SR: 'SR6', DM: 'DM3' } }] },
  { test: '07', ref: 'REF_000849', file: '15_STYLE_FULL_LOOK/REF_000849__WEB_B02_0100__primary.jpg', sha256: '09e3f9dbe8842fd206f067b98fea72241b3232e76adab7119aa7a4a137466b1e', validation: 'Multi-target Colour separation (not a Suit)', colour_scope: 'REQUESTED_TARGETS', units: [{ id: 'U1', type: 'ITEM', categories: ['Jacket'], basis: 'CEO GT SU1 (target_1 Jacket)', gt: { EI: 'EI5', TC: 'TC6', SR: 'SR5', DM: 'DM3' } }, { id: 'U2', type: 'ITEM', categories: ['Trouser'], basis: 'CEO GT SU2 (target_3 Trouser)', gt: { EI: 'EI5', TC: 'TC6', SR: 'SR4', DM: 'DM5' } }], extra_items: ['T-Shirt'] },
];
const COVERAGE_LIMITATIONS = ['Jacket Relaxed / Bottom Structured commercial Suit — no sample (E2E-04 of the LER set)', 'two-tone commercial Suit (clearly different member colours) — no sample'];
const LOW = { EI: 'I', TC: 'CLASSIC', SR: 'R', DM: 'M' }, HIGH = { EI: 'E', TC: 'TRANSFORMATIVE', SR: 'S', DM: 'D' };
function expectedOf(unit, axis) {
  if (unit.override && unit.override[axis]) return { expected: unit.override[axis].expected, basis: unit.override[axis].why, gt: unit.gt[axis] };
  const g = unit.gt[axis]; const n = Number(String(g).replace(/\D/g, ''));
  if (n === 5) return axis === 'EI' ? { expected: 'NEUTRAL', basis: 'CEO GT ' + g + ' (EI5 = NEUTRAL)', gt: g } : { expected: null, basis: 'CEO GT ' + g + ' — 5 is not compared on ' + axis, gt: g };
  return { expected: n < 5 ? LOW[axis] : HIGH[axis], basis: 'CEO GT ' + g, gt: g };
}
const catOf = (t) => { const c = t && t.record && t.record.category; return c && c.state === 'OBSERVED' && typeof c.value === 'string' ? c.value : null; };
const eligible = (env) => (env && Array.isArray(env.targets) ? env.targets.filter((t) => t && t.eligible === true && catOf(t)) : []);
/** @returns {{ ok:true, target_ids } | { ok:false, code, detail }} */
function mapUnit(env, unit) {
  const el = eligible(env); const ids = [];
  for (const c of unit.categories) { const hit = el.filter((t) => catOf(t) === c); if (hit.length !== 1) return { ok: false, code: 'UNIT_MAPPING_FAILED', detail: c + ': ' + hit.length + ' eligible V1.3 target(s) (need exactly 1) · eligible = ' + el.map((t) => t.target_id + ' ' + catOf(t)).join(', ') }; ids.push(hit[0].target_id); }
  return { ok: true, target_ids: ids };
}
function colourScope(env, test, unitIds) {
  if (test.colour_scope !== 'REQUESTED_TARGETS') return unitIds.slice();
  const el = eligible(env); const cats = el.map(catOf); const extra = el.filter((t) => cats.filter((c) => c === catOf(t)).length === 1).map((t) => t.target_id);
  return [...new Set(unitIds.concat(extra))];
}
/** the manifest unit type of the one colour call: a SUIT when the scope is exactly the declared Suit members · ITEM for a single target · otherwise REQUESTED_TARGETS */
function scopeUnitType(maps, scope) { const first = maps.find((x) => x.m.ok); return first && first.u.type === 'SUIT' && scope.length === 2 && scope.every((id) => first.m.target_ids.includes(id)) ? 'SUIT' : scope.length === 1 ? 'ITEM' : 'REQUESTED_TARGETS'; }
function selectionOf(unit, ids) { return unit.type === 'SUIT' ? { product_identity: { merchandise_type: 'SUIT', suit_component_target_ids: ids } } : { product_identity: { merchandise_type: 'ITEM', primary_target_id: ids[0] } }; }
function evaluate(unit, result) {
  const axes = ['EI', 'TC', 'SR', 'DM'].map((a) => { const e = expectedOf(unit, a); const c = result && result.customer_output ? result.customer_output[a] : null; const got = c ? c.direction : null;
    return { axis: a, actual: got, expected: e.expected, gt: e.gt, basis: e.basis, verdict: e.expected === null ? 'NOT_COMPARED' : got === null ? 'NO_DIRECTION' : got === e.expected ? 'MATCH' : 'MISMATCH', reason: c ? c.reason : null, reason_status: !c ? 'NONE' : c.reason === null ? 'WITHHELD' : 'TEXT' }; });
  return { unit: unit.id, type: unit.type, result_status: result ? result.result_status : null, axes, matches: axes.filter((x) => x.verdict === 'MATCH').length, compared: axes.filter((x) => x.verdict !== 'NOT_COMPARED').length };
}
module.exports = { IMAGE_ROOT, TESTS, COVERAGE_LIMITATIONS, expectedOf, mapUnit, colourScope, scopeUnitType, selectionOf, evaluate, catOf, eligible };
