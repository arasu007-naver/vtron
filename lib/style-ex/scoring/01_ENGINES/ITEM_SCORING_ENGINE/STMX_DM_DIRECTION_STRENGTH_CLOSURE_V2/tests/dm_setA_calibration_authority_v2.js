'use strict';
/**
 * SET A — DM CALIBRATION AUTHORITY  (order V2 §7)
 *
 * ★ These are the historically provenance-confirmed DM calibration cases: the High-Tier 16
 *   (15 calibration images + grp7, the frozen base anchor the Score Physics reasons against).
 *   ⛔ NONE of them is a member of the CEO GT 47, so rule derivation on SET A does not touch
 *      the development-diagnostic set.
 *
 * ★ RULE DERIVATION IS ALLOWED ON THIS SET, AND ONLY ON THIS SET (plus the CEO's own written
 *   constitution). SET B (GT47 + Live8) is diagnostic. SET C (Phase-1 12) is sealed.
 *
 * SOURCES — quoted, not summarised:
 *   99_ARCHIVE/.../HIGH_TIER_SET/STMX_DM_OBSERVATION_CORRECTION_REPREDICTION.md   (D2 corrected observations)
 *   99_ARCHIVE/.../HIGH_TIER_SET/STMX_DM_HIGH_TIER_RESULTS.csv                    (observations + CEO_Final)
 *   99_ARCHIVE/.../HIGH_TIER_SET/STMX_DM_SCORE_PHYSICS_COMPLETION_REPORT.md       (D5 mechanism column)
 *   99_ARCHIVE/.../CURRENT/STMX_DM_CURRENT_GT_CALIBRATION.md                      (grp7 row)
 *
 * ⛔ The CEO tier is carried for REPORTING. It is never an engine input, and no rule below was
 *    written by looking at a tier and working backwards (order §1).
 */

const o = v => ({ state: 'OBSERVED', value: v });
const rng = (min, max) => ({ state: 'OBSERVED', min, max });
const UNK = () => ({ state: 'UNKNOWN', value: null });
const C = 'multi_colour_compound', LU = 'limited_or_uniform';
const DV = 'dense_varied', US = 'uniform_or_sparse';
const m1 = (chromatic, fill) => ({
  internal_chromatic_composition: chromatic ? o(chromatic) : UNK(),
  internal_fill_realization: fill ? o(fill) : UNK(),
});
function E(id, family, size, contrast, spatial, realization) {
  const ev = { evidence_id: id, evidence_family: family, source_observation_refs: [],
    relative_size: size, contrast: contrast, spatial_position: spatial };
  if (realization) ev.m1_supporting_realization = realization;
  return ev;
}
const BLOCK = ev => ({ evidence: ev, excluded: [] });

const UNITS = [
  { case: 'mono3', ceo: 6, image: 'HIGH_TIER_SET/mono3.jpeg',
    frozen_observation: '~24 LV monogram grid + text chest print: medium/high/localized',
    frozen_mechanism: 'none (base)',
    evidence: [E('e1', 'graphic', o('medium'), o('high'), o('localized'), m1(LU, US))] },

  { case: 'grp1', ceo: 7, image: null,
    frozen_observation: 'Multi-color NIRVANA photo graphic: large/high/localized',
    frozen_mechanism: 'M1 (multi-colour compound → base DM6 +1)',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(C, US))] },

  { case: 'grp3', ceo: 6, image: null,
    frozen_observation: 'E1 graphic: large/high/localized · E2 wash: large/low/whole_garment (background)',
    frozen_mechanism: 'M2 (low-strength secondary adds nothing)',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US)),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US))] },

  { case: 'dmdfloral2', ceo: 8, image: null,
    frozen_observation: 'all-over dense multi-color print · large/high/whole_garment',
    frozen_mechanism: 'M1 (dense multi-colour richness → base DM7 +1)',
    '★_range_resolved_by_frozen_authority':
      '★ The HIGH_TIER_RESULTS.csv (an earlier development artifact) writes contrast as "med-high". ' +
      'The FROZEN CANONICAL Score Physics Architecture D1 records it without a range: ' +
      '"dmdfloral2 | all-over dense multi-color print · large/high/whole_garment". D2 then reasons ' +
      'that its tuple is IDENTICAL to the standard all-over anchors (shirtsprint1 · mono2 · dmdch = DM7), ' +
      'which is only true at contrast = high. The frozen canonical value is used and cited. ' +
      '⛔ Resolved by quotation, not by preference — the same discipline as shirtspk1 / ADR-086.',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(C, DV))] },

  { case: 'shirtsprint2', ceo: 7, image: 'HIGH_TIER_SET/shirtsprint2.jpeg',
    frozen_observation: 'All-over brown floral/branch print whole garment: large/high/whole_garment',
    frozen_mechanism: 'none (base) — 2-colour moderate all-over',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },

  { case: 'shirtsprint3', ceo: 7, image: 'HIGH_TIER_SET/shirtsprint3.jpeg',
    frozen_observation: 'All-over purple botanical print whole garment: large/high/whole_garment',
    frozen_mechanism: 'none (base) — 2-colour moderate all-over',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },

  { case: 'logobr3', ceo: 7, image: 'HIGH_TIER_SET/logobr3.jpeg',
    frozen_observation: 'Back arrows+text + sleeve stripes + front graphic: high/distributed',
    '★_size_not_recorded': '★ The frozen record states contrast and spatial position but NOT relative size for this case. The fixture records relative_size = UNKNOWN rather than inventing one, and the engine fails closed. ⛔ A missing frozen value is not filled in.',
    frozen_mechanism: 'M2 (substantial secondaries contribute)',
    evidence: [E('e1', 'graphic', UNK(), o('high'), o('distributed'), m1(LU, US))] },

  { case: 'logobr4', ceo: 6, image: 'HIGH_TIER_SET/logobr4.jpeg',
    frozen_observation: 'Single large white arrows back graphic: large/high/localized',
    frozen_mechanism: 'none (base) — single monochrome graphic',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US))] },

  { case: 'mash2', ceo: 5, image: 'HIGH_TIER_SET/mash2.jpeg',
    frozen_observation: 'E1 all-over openwork surface system: large / medium / whole_garment',
    frozen_mechanism: 'none (base · corrected)',
    ceo_rationale: 'CEO: sheer/mesh forms visual detail density (Decision 1 — openwork/mesh is a designed visual surface system)',
    evidence: [E('e1', 'surface_treatment', o('large'), o('medium'), o('whole_garment'), m1(LU, US))] },

  { case: 'mash3', ceo: 7, image: 'HIGH_TIER_SET/mash3.jpeg',
    frozen_observation: 'E1 logo: large/high/localized · E2 all-over openwork: large/medium/whole_garment',
    frozen_mechanism: 'M2 (substantial secondary contributes)',
    ceo_rationale: 'CEO Decision 2 — mesh contributes DM, graphic contributes DM; coexisting, their visual detail combines',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US)),
               E('e2', 'surface_treatment', o('large'), o('medium'), o('whole_garment'), m1(LU, US))] },

  { case: 'mtdr2', ceo: 6, image: 'HIGH_TIER_SET/mtdr2.jpeg',
    frozen_observation: 'E1 reflective surface relief (전면 gather + 반사 명암): large / high / whole_garment',
    frozen_mechanism: 'none (base · corrected)',
    ceo_rationale: 'CEO: metallic not simple material (Decision 4 — reflection contributes when it produces observable designed visual detail)',
    evidence: [E('e1', 'surface_treatment', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },

  { case: 'mtdr3', ceo: 8, image: 'HIGH_TIER_SET/mtdr3.jpeg',
    frozen_observation: 'All-over dense sequin geometric embellishment whole garment: large/high/whole_garment',
    frozen_mechanism: 'M1 (dense embellishment richness → base DM7 +1)',
    evidence: [E('e1', 'attached_detail', o('large'), o('high'), o('whole_garment'), m1(LU, DV))] },

  { case: 'mtdr4', ceo: 7, image: 'HIGH_TIER_SET/mtdr4.jpeg',
    frozen_observation: 'E1 pleat + reflective relief: large / high / whole_garment',
    frozen_mechanism: 'none (base · corrected)',
    evidence: [E('e1', 'surface_treatment', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },

  { case: 'lacedr2', ceo: 6, image: 'HIGH_TIER_SET/lacedr2.jpeg',
    frozen_observation: 'E1 lace openwork applique: medium / high / localized',
    frozen_mechanism: 'none (base · corrected)',
    evidence: [E('e1', 'attached_detail', o('medium'), o('high'), o('localized'), m1(LU, US))] },

  { case: 'lacedr3', ceo: 5, image: 'HIGH_TIER_SET/lacedr3.jpeg',
    frozen_observation: 'E1 designed sheer layering (전면 겹layer 구조): large / medium / whole_garment',
    frozen_mechanism: 'none (base · corrected)',
    ceo_rationale: 'CEO Decision 3 — designed sheer layering is a visual design structure',
    evidence: [E('e1', 'surface_treatment', o('large'), o('medium'), o('whole_garment'), m1(LU, US))] },

  /** grp7 — not one of the High-Tier 15, but named by the frozen Score Physics as a BASE ANCHOR
   *  for large/high/localized, and explicitly excluded from the CEO GT 47 count. */
  { case: 'grp7', ceo: 6, image: null,
    frozen_observation: 'E1 large neon typo block: large/high/localized',
    frozen_mechanism: 'none (base) — the frozen large/high/localized base anchor',
    ceo_rationale: 'frozen note: single evidence = DM6; evidence count is not a necessary condition for DM6',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US))] },
];

UNITS.forEach(u => { u.block = BLOCK(u.evidence); u.set = 'A'; u.gt_tier = 'DM' + u.ceo; });

module.exports = { UNITS, BLOCK, E, o, rng, UNK, m1, C, LU, DV, US };
