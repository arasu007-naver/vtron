'use strict';
/**
 * SET C — PHASE-1 12 · SEALED FINAL EVALUATION SET  (order V2 §7 / §25)
 *
 * ⛔ RULE DERIVATION ON THIS SET IS PROHIBITED. It was NOT consulted while the Direction or
 *    Strength rules were reconstructed, and the engine was FROZEN (CODE_FREEZE_SEAL_V2.json,
 *    aggregate 1a4c9ecd87acce87…) BEFORE this file was executed for the first time.
 * ⛔ V2 §8 / §26: after seeing this result no rule may be tuned. A needed engine change becomes a
 *    separate follow-up cycle.
 *
 * SOURCE — quoted verbatim, D1 (dataset) + D2 (observation pass) + D4 (CEO judgment):
 *   99_ARCHIVE/RETIRED_LEGACY_RUNTIME/DM/VALIDATION_POOL/STMX_DM_VALIDATION_PHASE1_REPORT.md
 *   Images: 99_ARCHIVE/RETIRED_LEGACY_RUNTIME/DM/VALIDATION_POOL/PHASE1_VALIDATION/
 *
 * ★ These 12 were built as a held-out validation set: "전부 calibration 미사용 · 신규", explicitly
 *   excluding the High-Tier 15, Round1 10, Continuous 5 and every GT image. They are therefore the
 *   only genuinely clean generalization estimate available in the project.
 *
 * ★ REALIZATION TRANSCRIPTION uses the SAME declared rule as every other set, and reads only the
 *   D1 "expected observation characteristics" and D2 observation columns — ⛔ never D3, which is
 *   physics REASONING rather than observation.
 */

const o = v => ({ state: 'OBSERVED', value: v });
const rng = (min, max) => ({ state: 'OBSERVED', min, max });
const UNK = () => ({ state: 'UNKNOWN', value: null });
const C = 'multi_colour_compound', LU = 'limited_or_uniform';
const DV = 'dense_varied', US = 'uniform_or_sparse';
const m1 = (c, f) => ({
  internal_chromatic_composition: c ? o(c) : UNK(),
  internal_fill_realization: f ? o(f) : UNK(),
});
function E(id, family, size, contrast, spatial, r) {
  const ev = { evidence_id: id, evidence_family: family, source_observation_refs: [],
    relative_size: size, contrast: contrast, spatial_position: spatial };
  if (r) ev.m1_supporting_realization = r;
  return ev;
}
const BLOCK = ev => ({ evidence: ev, excluded: [] });

const UNITS = [
  { case: 'V-01 basicbk1', ceo: 2, image: 'PHASE1_VALIDATION/basicbk1.jpeg',
    frozen_observation: 'evidence[]=[] (plain black tee)', evidence: [] },

  { case: 'V-02 sweatsh1', ceo: 3, image: 'PHASE1_VALIDATION/sweatsh1.jpeg',
    frozen_observation: 'E1 소형 tonal On 로고(양 leg): small/low/localized',
    '★_why_this_case_matters': '★ The ONLY DM3 anchor anywhere in the project, and the direct test of V2 §10: designed detail IS present, yet the CEO placed the garment deep on the Minimal side. The V1 rule ("anything present → M WEAK") would have failed it.',
    evidence: [E('e1', 'graphic', o('small'), o('low'), o('localized'), m1(LU, US))] },

  { case: 'V-03 denimsh1', ceo: 4, image: 'PHASE1_VALIDATION/denimsh1.jpeg',
    frozen_observation: 'E1 contrast topstitch: small/medium/distributed · E2 경미 wash: large/low/whole_garment',
    evidence: [E('e1', 'surface_treatment', o('small'), o('medium'), o('distributed'), m1(LU, US)),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US))] },

  { case: 'V-04 oxshirtpk1', ceo: 5, image: 'PHASE1_VALIDATION/oxshirtpk1.jpg',
    frozen_observation: 'E1 fine 핀스트라이프: large/low/whole_garment · E2 소형 폴로 로고: small/high/localized',
    '★_why_this_case_matters': '★ THE SINGLE FAILURE of the frozen Phase-1 validation: the frozen Score Physics predicted DM4 and the CEO said DM5. It is the documented DM4↔DM5 boundary.',
    evidence: [E('e1', 'surface_pattern', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e2', 'graphic', o('small'), o('high'), o('localized'), m1(LU, US))] },

  { case: 'V-05 dressslit1', ceo: 4, ceo_note: 'CEO recorded DM4~DM5 (boundary) · counted PASS(boundary) in the frozen report',
    image: 'PHASE1_VALIDATION/dressslit1.jpeg',
    frozen_observation: 'E1 corset panel seaming/boning(bodice): medium/medium/localized · E2 ruched 허리: medium/low/localized',
    evidence: [E('e1', 'decorative_construction', o('medium'), o('medium'), o('localized'), null),
               E('e2', 'decorative_construction', o('medium'), o('low'), o('localized'), null)] },

  { case: 'V-06 metaskt1', ceo: 7, image: 'PHASE1_VALIDATION/metaskt1.jpeg',
    frozen_observation: 'E1 전면 pleat + 반사 relief: large/high/whole_garment',
    evidence: [E('e1', 'surface_treatment', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },

  { case: 'V-07 logoteeback1', ceo: 5, image: 'PHASE1_VALIDATION/logoteeback1.jpeg',
    frozen_observation: 'E1 텍스트+wave 그래픽(후면): medium/high/localized · D1: 국소·2색',
    evidence: [E('e1', 'graphic', o('medium'), o('high'), o('localized'), m1(LU, US))] },

  { case: 'V-08 logohoddiebr1', ceo: 7, image: 'PHASE1_VALIDATION/logohoddiebr1.jpeg',
    frozen_observation: 'E1 all-over 카모(멀티톤): large/high/whole_garment · E2 대형 텍스트 로고: large/high/localized',
    '★_realization_note': '★ D1 records "boundary=multi-tone", not multi-colour. Under the declared transcription rule multi-tone is NOT multi_colour_compound, and no density/variety is recorded → limited_or_uniform / uniform_or_sparse.',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(LU, US)),
               E('e2', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US))] },

  { case: 'V-09 shirtsprint5', ceo: 7, ceo_note: 'CEO recorded DM7~DM8 (boundary) · counted PASS(boundary)',
    image: 'PHASE1_VALIDATION/shirtsprint5.jpeg',
    frozen_observation: 'E1 all-over 멀티컬러 플로럴(sparse): large/medium-high/whole_garment',
    evidence: [E('e1', 'surface_pattern', o('large'), rng('medium', 'high'), o('whole_garment'), m1(C, US))] },

  { case: 'V-10 shirtsprint6', ceo: 8, image: 'PHASE1_VALIDATION/shirtsprint6.jpeg',
    frozen_observation: 'E1 all-over 멀티컬러 기하-플로럴(dense): large/high/whole_garment · E2 hem contrast trim: small/high/localized',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(C, DV)),
               E('e2', 'designed_color_contrast', o('small'), o('high'), o('localized'), null)] },

  { case: 'V-11 mtdr5', ceo: 6, image: 'PHASE1_VALIDATION/mtdr5.jpeg',
    frozen_observation: 'E1 전면 반사 + ruched relief: large/high/whole_garment',
    '★_note': '★ Same recorded profile as mtdr2 (SET A, DM6) — the reflective-ruched family.',
    evidence: [E('e1', 'surface_treatment', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },

  { case: 'V-12 mash4', ceo: 6, image: 'PHASE1_VALIDATION/mash4.jpeg',
    frozen_observation: 'E1 고대비 all-over openwork(net): large/high/whole_garment · E2 layering(over base): large/medium/whole_garment',
    evidence: [E('e1', 'surface_treatment', o('large'), o('high'), o('whole_garment'), m1(LU, US)),
               E('e2', 'surface_treatment', o('large'), o('medium'), o('whole_garment'), m1(LU, US))] },
];

UNITS.forEach(u => { u.block = BLOCK(u.evidence); u.set = 'C'; u.gt_tier = 'DM' + u.ceo; });

module.exports = { UNITS, BLOCK, E, o, rng, UNK, m1, C, LU, DV, US };
