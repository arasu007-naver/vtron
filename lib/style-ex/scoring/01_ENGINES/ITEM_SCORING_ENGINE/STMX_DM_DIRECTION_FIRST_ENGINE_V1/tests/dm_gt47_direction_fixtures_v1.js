'use strict';
/**
 * STMX DM — 47 CEO GT DIRECTION FIXTURES V1
 *
 * ★ HONEST SCOPE NOTE — read before trusting any row.
 *   These are a TRANSCRIPTION of the frozen GT table
 *     99_ARCHIVE/RETIRED_LEGACY_RUNTIME/DM/CURRENT/STMX_DM_CURRENT_GT_CALIBRATION.md
 *   into the governed observation vocabulary. They are NOT Vision observations, and no image was
 *   opened to produce them (order §36 — new API calls = 0). `frozen_wording` quotes the frozen
 *   row; the primitives are the frozen row's own recorded values.
 *
 * ★ RANGES ARE CARRIED, NOT COLLAPSED.
 *   Where the frozen row writes "medium~large" or "low~medium", the fixture carries {min,max}.
 *   ⛔ No endpoint is silently chosen. The engine then either establishes a side or fails closed,
 *      and a fixture-level uncertainty surfaces as UNKNOWN rather than as a lucky answer.
 *      Deliverable 09 additionally reports the two endpoint SENSITIVITY variants so the reader
 *      can see exactly what the range costs, in both directions.
 *
 * ★ ONE RANGE IS RESOLVED, BY FROZEN AUTHORITY, NOT BY ME.
 *   shirtspk1's contrast is written "low~medium" in the profile column, but the same document's
 *   §2 Calibration Note (ADR-086) states the CEO adjudication verbatim:
 *     "shirtspk1 (★ ADR-086): CEO Batch 01 판정 = DM4 확정 … whole-tonal-low 단일(fine pinstripe) = DM4."
 *   The fixture therefore records contrast = low and cites that line. ⛔ This is the only range
 *   resolved anywhere in this file, and it is resolved by a quotation, not by a preference.
 *
 * ═══ M1-SUPPORTING REALIZATION — TRANSCRIPTION RULE, DECLARED BEFORE APPLICATION ══════════════
 *   internal_chromatic_composition
 *     · multi_colour_compound  ⟸ the frozen wording explicitly says multi-color / multi-colour.
 *     · limited_or_uniform     ⟸ otherwise (nothing chromatically rich is recorded).
 *   internal_fill_realization
 *     · dense_varied           ⟸ the wording states BOTH density AND variety/multi-element.
 *     · UNKNOWN                ⟸ the wording states density but NOT uniformity or variety.
 *                                 ★ This is the mash1 precedent set by the preceding order and it
 *                                   is applied here identically (mash1 · mono1).
 *     · uniform_or_sparse      ⟸ otherwise (nothing dense-and-varied is recorded).
 *   ⛔ No CEO tier is ever read backwards into a realization (order §12 · §21).
 *   ⛔ Every unit that also appears in the preceding order's frozen M1 fixture set keeps that
 *      order's reading VERBATIM, so this engine cannot drift from the predicate the CEO closed:
 *      grp2 · logobr2 · mono2 · mono4 · dmdch1 · dmdch2 · dmdanimal1 · lacedr1 · shirtsprint1 ·
 *      mtdr1 · mash1.
 *
 * ═══ EVIDENCE FAMILY ═════════════════════════════════════════════════════════════════════════
 *   The frozen GT table records descriptors in prose, not as the 7 broad-controlled families.
 *   Where the prose names a family unambiguously it is transcribed; where it does not, the field
 *   is null and `family_source: 'NOT_RECORDED'` says so. ⛔ No family is invented.
 *   ★ Test GT-FAM proves mechanically that NO unit's engine outcome depends on a NOT_RECORDED
 *     family, so the gap cannot be silently carrying a result.
 *
 * ═══ DIRECTION / STRENGTH GROUND TRUTH ═══════════════════════════════════════════════════════
 *   Projected from the CEO tier by the order §7 evaluation band — an evaluation band, ⛔ not a
 *   primitive recipe and ⛔ not a new scoring formula:
 *     DM1–DM3 → M/STRONG · DM4 → M/WEAK · DM5 → NEUTRAL/N-A · DM6 → D/WEAK · DM7–DM9 → D/STRONG
 */

/* ── shorthands ─────────────────────────────────────────────────────────────────────────────── */
const o = v => ({ state: 'OBSERVED', value: v });
const rng = (min, max) => ({ state: 'OBSERVED', min, max });
const UNK = () => ({ state: 'UNKNOWN', value: null });
const C = 'multi_colour_compound', LU = 'limited_or_uniform';
const DV = 'dense_varied', US = 'uniform_or_sparse';
/** m1 realization envelope; pass null for a field the frozen wording does not decide */
const m1 = (chromatic, fill) => ({
  internal_chromatic_composition: chromatic ? o(chromatic) : UNK(),
  internal_fill_realization: fill ? o(fill) : UNK(),
});
/** one admitted evidence */
function E(id, family, size, contrast, spatial, realization, familySource) {
  const ev = {
    evidence_id: id,
    evidence_family: family,
    source_observation_refs: [],
    relative_size: size, contrast: contrast, spatial_position: spatial,
  };
  if (realization) ev.m1_supporting_realization = realization;
  ev.__family_source = familySource || (family ? 'FROZEN_WORDING' : 'NOT_RECORDED');
  return ev;
}
/** ★ THE PRODUCTION BLOCK SHAPE, verified against real Producer output.
 *  A governed record.dm_designed_detail_evidence emitted by STMX_VISION_PRODUCER_V1_2 is
 *  { evidence, excluded } — it does NOT carry axis_target / evaluation_unit, which belong to the
 *  frozen PAPER schema (Observation Contract §11). These fixtures use the shape the engine will
 *  actually receive in production. ⛔ Fixtures are shaped to the Producer, never to the engine. */
const BLOCK = evList => ({ evidence: evList, excluded: [] });

/** §7 evaluation band — CEO tier → (direction, strength) */
function gtBand(tier) {
  if (tier <= 3) return { direction: 'M', strength: 'STRONG' };
  if (tier === 4) return { direction: 'M', strength: 'WEAK' };
  if (tier === 5) return { direction: 'NEUTRAL', strength: 'N/A' };
  if (tier === 6) return { direction: 'D', strength: 'WEAK' };
  return { direction: 'D', strength: 'STRONG' };
}

/** ★ PROVENANCE SPLIT (order §34).
 *  CALIBRATION = the units the frozen Score Physics / Observation Contract / GT calibration notes
 *  explicitly reason about (D5b cross-check anchors + the §2 Calibration Notes). Everything else
 *  is HELD_OUT. ⛔ The split is by frozen provenance, not by result. Deliverable 09 §leakage
 *  states plainly which rules could NOT be derived from the calibration side alone. */
const CALIBRATION = new Set([
  'shirtsprint1', 'mono2', 'mono4', 'dmdch1', 'dmdch2', 'dmdanimal1', 'lacedr1', 'grp2', 'logobr2',
  'techybrid4', 'shirtspk1', 'logovint3', 'techybrid10', 'logovint2',
]);

/** identity risk — units with NO record in the ACTIVE canonical corpus (binding audit 06 · GAP-H).
 *  ⛔ Order §30: an uncertain identity is NEVER force-bound to a current REF. These are evaluated
 *     as SEMANTIC fixtures only, exactly like every other row, and flagged. */
const SUPERSEDED_CORPUS_ONLY = new Set([
  'basicwt1', 'logotee1', 'grp5', 'logohoodie1', 'grp4', 'grp6', 'logohoodie2', 'grp2', 'dmdch1',
]);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
 * THE 47
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
const UNITS = [

  /* ── DM2 · 1 ──────────────────────────────────────────────────────────────────────────────── */
  { case: 'basicwt1', tier: 2, frozen_wording: 'evidence[] = [] (designed detail 없음 · plain white tee · 재봉선/base 소재만)',
    evidence: [] },

  /* ── DM4 · 10 ─────────────────────────────────────────────────────────────────────────────── */
  { case: 'logovint2', tier: 4, frozen_wording: 'E1 designed acid-wash/distress: large/low/whole_garment · E2 small text logo: small/low/localized',
    evidence: [E('e1', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e2', 'graphic', o('small'), o('low'), o('localized'), m1(LU, US))] },
  { case: 'shirtspk1', tier: 4, frozen_wording: 'E1 fine pink pinstripe: large/(low~medium)/whole_garment (+tiny polo logo)',
    range_resolved_by_frozen_authority: '§2 Calibration Note (ADR-086): "whole-tonal-low 단일(fine pinstripe) = DM4" — contrast recorded as low on that quotation.',
    evidence: [E('e1', 'surface_pattern', o('large'), o('low'), o('whole_garment'), m1(LU, US))] },
  { case: 'logotee2', tier: 4, frozen_wording: 'E1 small chest text logo: small/medium/localized',
    evidence: [E('e1', 'graphic', o('small'), o('medium'), o('localized'), m1(LU, US))] },
  { case: 'logotee1', tier: 4, frozen_wording: 'E1 small chest boxed logo: small/medium/localized',
    evidence: [E('e1', 'graphic', o('small'), o('medium'), o('localized'), m1(LU, US))] },
  { case: 'bomberlong1', tier: 4, frozen_wording: 'E1 zip + sleeve zip pocket + snaps (leather=natural material excluded): small/medium~high/localized~distributed',
    evidence: [E('e1', 'attached_hardware', o('small'), rng('medium', 'high'), rng('localized', 'distributed'), null)] },
  { case: 'logotee4', tier: 4, frozen_wording: 'E1 small chest text logo(BALENCIAGA): small/high/localized',
    evidence: [E('e1', 'graphic', o('small'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'bombercrop4', tier: 4, frozen_wording: 'E1 center zip hardware(elastic hem/cuff = 기능적): small/medium/localized',
    evidence: [E('e1', 'attached_hardware', o('small'), o('medium'), o('localized'), null)] },
  { case: 'logovint4', tier: 4, frozen_wording: 'E1 designed acid-wash: large/low/whole_garment · E2 small text logo(SAINT LAURENT): small/medium/localized · E3 distressed raw neckline: small/low/localized',
    evidence: [E('e1', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e2', 'graphic', o('small'), o('medium'), o('localized'), m1(LU, US)),
               E('e3', 'surface_treatment', o('small'), o('low'), o('localized'), m1(LU, US))] },
  { case: 'techybrid7', tier: 4, frozen_wording: 'E1 knit-rib↔nylon puffer material division: large/low/whole_garment · E2 quilting channels: large/low/distributed · E3 pockets/zip/hood drawcord: small/low/localized',
    evidence: [E('e1', null, o('large'), o('low'), o('whole_garment'), null, 'NOT_RECORDED'),
               E('e2', 'surface_treatment', o('large'), o('low'), o('distributed'), m1(LU, US)),
               E('e3', 'attached_hardware', o('small'), o('low'), o('localized'), null)] },
  { case: 'henley3', tier: 4, frozen_wording: 'E1 henley placket + 소형 버튼(rib=natural material excluded): small/medium/localized',
    evidence: [E('e1', 'decorative_construction', o('small'), o('medium'), o('localized'), null)] },

  /* ── DM5 · 13 ─────────────────────────────────────────────────────────────────────────────── */
  { case: 'techybrid4', tier: 5, frozen_wording: 'E1 tonal quilting: large/low/whole_garment · E2 beige contrasting trim(collar/hem): small/high/distributed',
    evidence: [E('e1', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e2', 'designed_color_contrast', o('small'), o('high'), o('distributed'), null)] },
  { case: 'logosw1', tier: 5, frozen_wording: 'E1 "SAINT" chenille typo: medium/medium/localized (+tiny sleeve patch)',
    evidence: [E('e1', 'graphic', o('medium'), o('medium'), o('localized'), m1(LU, US))] },
  { case: 'logotee6', tier: 5, frozen_wording: 'E1 balenciaga center text logo: small~medium/high/localized',
    evidence: [E('e1', 'graphic', rng('small', 'medium'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'pintuck1 / pleats1', tier: 5, frozen_wording: 'fine pintuck bib: small~medium/low/localized',
    evidence: [E('e1', 'surface_treatment', rng('small', 'medium'), o('low'), o('localized'), m1(LU, US))] },
  { case: 'logohoodie3', tier: 5, frozen_wording: 'E1 adidas 3-bar graphic: large/high/localized',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'techybrid10', tier: 5, frozen_wording: 'E1 tonal quilting: large/low/whole_garment · E2 knit material division: large/low/distributed · E3 welt pockets: small/low/localized',
    evidence: [E('e1', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e2', null, o('large'), o('low'), o('distributed'), null, 'NOT_RECORDED'),
               E('e3', 'decorative_construction', o('small'), o('low'), o('localized'), null)] },
  { case: 'hybridlong1', tier: 5, frozen_wording: 'E1 knit↔quilted material division: large/low/whole_garment · E2 quilting channels(lower): large/low/whole_garment',
    evidence: [E('e1', null, o('large'), o('low'), o('whole_garment'), null, 'NOT_RECORDED'),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US))] },
  { case: 'pintuck2', tier: 5, frozen_wording: 'E1 fine pintuck bib: medium/low/localized',
    evidence: [E('e1', 'surface_treatment', o('medium'), o('low'), o('localized'), m1(LU, US))] },
  { case: 'techybrid3', tier: 5, frozen_wording: 'E1 tonal quilted front panel: large/low/whole_garment · E2 black zip/pocket/trim accents: small/high/distributed',
    evidence: [E('e1', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e2', 'designed_color_contrast', o('small'), o('high'), o('distributed'), null)] },
  { case: 'techybrid5', tier: 5, frozen_wording: 'E1 knit↔quilted material division: large/low/whole_garment · E2 quilting channels: large/low/whole_garment · E3 patch pockets: small/low/localized · E4 sleeve logo patch: small/low~medium/localized',
    evidence: [E('e1', null, o('large'), o('low'), o('whole_garment'), null, 'NOT_RECORDED'),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e3', 'decorative_construction', o('small'), o('low'), o('localized'), null),
               E('e4', 'attached_detail', o('small'), rng('low', 'medium'), o('localized'), m1(LU, US))] },
  { case: 'techybrid6', tier: 5, frozen_wording: 'E1 knit↔quilted material division: large/low/whole_garment · E2 quilting: large/low/whole_garment · E3 orange zip contrast accent: small/high/localized · E4 zip pockets + sleeve logo: small/low~medium/localized',
    evidence: [E('e1', null, o('large'), o('low'), o('whole_garment'), null, 'NOT_RECORDED'),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e3', 'designed_color_contrast', o('small'), o('high'), o('localized'), null),
               E('e4', 'attached_hardware', o('small'), rng('low', 'medium'), o('localized'), null)] },
  { case: 'grp5', tier: 5, frozen_wording: 'E1 single "FASHION" typographic graphic: medium~large/high/localized',
    evidence: [E('e1', 'graphic', rng('medium', 'large'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'hybridred1', tier: 5, frozen_wording: 'E1 quilted↔softshell material division(동색 red): large/low/whole_garment · E2 quilting channels: large/low/whole_garment · E3 black contrast zip/trim: small/high/distributed · E4 small chest/sleeve logo(VOLARE): small/medium/localized',
    evidence: [E('e1', null, o('large'), o('low'), o('whole_garment'), null, 'NOT_RECORDED'),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US)),
               E('e3', 'designed_color_contrast', o('small'), o('high'), o('distributed'), null),
               E('e4', 'graphic', o('small'), o('medium'), o('localized'), m1(LU, US))] },

  /* ── DM6 · 10 ─────────────────────────────────────────────────────────────────────────────── */
  { case: 'logovint3', tier: 6, frozen_wording: 'E1 small logo: small/low/localized · E2 all-over washed/paint-like treatment: large/medium/whole_garment',
    evidence: [E('e1', 'graphic', o('small'), o('low'), o('localized'), m1(LU, US)),
               E('e2', 'surface_treatment', o('large'), o('medium'), o('whole_garment'), m1(LU, US))] },
  { case: 'logotee5', tier: 6, frozen_wording: 'E1 large GUCCI text + GG graphic: large/high/localized',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'logotee3', tier: 6, frozen_wording: 'E1 GUCCI logo graphic(text+stripe+G): medium~large/medium~high/localized',
    evidence: [E('e1', 'graphic', rng('medium', 'large'), rng('medium', 'high'), o('localized'), m1(LU, US))] },
  { case: 'logohoodie1', tier: 6, frozen_wording: 'E1 "VISION STREET WEAR" boxed graphic: medium~large/high/localized',
    evidence: [E('e1', 'graphic', rng('medium', 'large'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'logovint1', tier: 6, frozen_wording: 'E1 "BALENCIAGA/crest/PARIS" college lockup: large/high/localized · E2 vintage 전면 wash: large/low/whole_garment',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US)),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US))] },
  { case: 'shirtpt1', tier: 6, frozen_wording: 'E1 전면 woven vertical stripe + geometric-motif 반복 pattern: large/medium/whole_garment',
    evidence: [E('e1', 'surface_pattern', o('large'), o('medium'), o('whole_garment'), m1(LU, US))] },
  { case: 'grp4', tier: 6, frozen_wording: 'E1 large rich multi-element graphic(flowers+butterflies+checkerboard+다중 텍스트, multi-color): large/medium~high/localized',
    evidence: [E('e1', 'graphic', o('large'), rng('medium', 'high'), o('localized'), m1(C, US))] },
  { case: 'grp6', tier: 6, frozen_wording: 'E1 large bold 다단어 text graphic("BE HONEST DO U HATE ME?"): large/high/localized',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'mono1', tier: 6, frozen_wording: 'E1 LV monogram graded print(상단 dense → 하단 fade-out): large/high/distributed',
    realization_note: '★ mash1 precedent: density IS stated ("dense"), uniformity/variety is NOT → internal_fill_realization = UNKNOWN, and M1 fails closed.',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('distributed'), m1(LU, null))] },
  { case: 'cargo1', tier: 6, frozen_wording: 'E1 다중 cargo pocket + flap/zip/드로우코드 등 다수 기능적 hardware가 designed detail로 반복(전면·측면): large/medium/distributed',
    evidence: [E('e1', 'attached_hardware', o('large'), o('medium'), o('distributed'), null)] },

  /* ── DM7 · 11 ─────────────────────────────────────────────────────────────────────────────── */
  { case: 'mono2', tier: 7, frozen_wording: 'E1 all-over FF monogram print: large/medium~high/whole_garment',
    evidence: [E('e1', 'surface_pattern', o('large'), rng('medium', 'high'), o('whole_garment'), m1(LU, US))] },
  { case: 'mono4', tier: 7, frozen_wording: 'E1 all-over KL monogram print: large/high/whole_garment · E2 small chest patch: small/medium/localized',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(LU, US)),
               E('e2', 'attached_detail', o('small'), o('medium'), o('localized'), m1(LU, US))] },
  { case: 'dmdch2', tier: 7, frozen_wording: 'E1 all-over checkerboard knit: large/high/whole_garment',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },
  { case: 'logohoodie2', tier: 7, frozen_wording: 'E1 "BE UNIQUE" multi-element multi-color graphic(text+드립 smiley+다중 텍스트): large/medium~high/localized',
    evidence: [E('e1', 'graphic', o('large'), rng('medium', 'high'), o('localized'), m1(C, US))] },
  { case: 'grp2', tier: 7, frozen_wording: 'E1 large rich multi-element graphic(WORLDWIDE text+eagle+car+lightning, multi-color): large/high/localized · E2 acid-wash 전면 treatment: large/low/whole_garment',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(C, US)),
               E('e2', 'surface_treatment', o('large'), o('low'), o('whole_garment'), m1(LU, US))] },
  { case: 'logobr2', tier: 7, frozen_wording: 'E1 multi-color cross cluster(center back): large/high/localized · E2 sleeve text runs(양 소매): medium/high/distributed · E3 CHROME HEARTS banner: medium/high/localized',
    realization_note: '★ The preceding order\'s frozen M1 fixture reads logobr2 as limited_or_uniform / uniform_or_sparse (mechanism M2, not M1). That reading is kept VERBATIM.',
    evidence: [E('e1', 'graphic', o('large'), o('high'), o('localized'), m1(LU, US)),
               E('e2', 'graphic', o('medium'), o('high'), o('distributed'), m1(LU, US)),
               E('e3', 'graphic', o('medium'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'dmdch1', tier: 7, frozen_wording: 'E1 all-over checkerboard knit(대형 격자): large/high/whole_garment · E2 small chest logo(Fallett): small/high/localized',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(LU, US)),
               E('e2', 'graphic', o('small'), o('high'), o('localized'), m1(LU, US))] },
  { case: 'shirtsprint1', tier: 7, frozen_wording: 'E1 all-over floral/collage multi-color print(전면): large/high/whole_garment',
    realization_note: '★ Kept VERBATIM from the preceding order: multi_colour_compound / uniform_or_sparse. A non-graphic family requires dense_varied, so M1 correctly does not fire and DM7 is retained.',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(C, US))] },
  { case: 'mash1', tier: 7, frozen_wording: 'E1 전면 dense rhinestone/crystal decoration(판단 중심=crystal · mesh=carrier): large/high/whole_garment',
    realization_note: '★ Kept VERBATIM: density stated, uniformity NOT → fill UNKNOWN → M1 fails closed.',
    evidence: [E('e1', 'attached_detail', o('large'), o('high'), o('whole_garment'), m1(LU, null))] },
  { case: 'mtdr1', tier: 7, frozen_wording: 'E1 전면 dense uniform sequin decoration(판단 중심=dense sequin · color/silhouette 부차): large/high/whole_garment',
    realization_note: '★ Kept VERBATIM: dense but UNIFORM → uniform_or_sparse → M1 does not fire. ⛔ The LIVE observation disagrees (LF-4); that disagreement is reported in deliverable 10, never edited into this frozen transcription.',
    evidence: [E('e1', 'attached_detail', o('large'), o('high'), o('whole_garment'), m1(LU, US))] },
  { case: 'dmdbuk1', tier: 7, frozen_wording: 'E1 다중 buckle-strap + silver hardware(5단): medium/high/distributed',
    evidence: [E('e1', 'attached_hardware', o('medium'), o('high'), o('distributed'), null)] },

  /* ── DM8 · 2 ──────────────────────────────────────────────────────────────────────────────── */
  { case: 'dmdanimal1', tier: 8, frozen_wording: 'E1 all-over leopard animal print(전면 · blazer construction=기능적): large/high/whole_garment',
    realization_note: '★ Kept VERBATIM: frozen D5b reads it as "M1: dense high-contrast richness → DM8".',
    evidence: [E('e1', 'surface_pattern', o('large'), o('high'), o('whole_garment'), m1(C, DV))] },
  { case: 'lacedr1', tier: 8, frozen_wording: 'E1 all-over lace 조직(전면 dress · 구조적 openwork 패턴 반복): large/high/whole_garment',
    realization_note: '★ Kept VERBATIM: frozen D5b reads it as "M1: dense openwork density → DM8".',
    evidence: [E('e1', 'surface_treatment', o('large'), o('high'), o('whole_garment'), m1(LU, DV))] },
];

/* ═══ decoration ══════════════════════════════════════════════════════════════════════════════ */
UNITS.forEach(u => {
  const b = gtBand(u.tier);
  u.gt_tier = 'DM' + u.tier;
  u.gt_direction = b.direction;
  u.gt_strength = b.strength;
  u.block = BLOCK(u.evidence);
  u.provenance = CALIBRATION.has(u.case) ? 'CALIBRATION' : 'HELD_OUT';
  u.identity_confidence = SUPERSEDED_CORPUS_ONLY.has(u.case)
    ? 'SUPERSEDED_CORPUS_ONLY — no ACTIVE corpus record; evaluated as a SEMANTIC fixture only (order §30)'
    : 'ACTIVE_CORPUS_RECORD_EXISTS — still evaluated as a semantic fixture; no image was opened';
  u.has_recorded_range = u.evidence.some(e =>
    [e.relative_size, e.contrast, e.spatial_position].some(p => p && p.min !== undefined));
  u.has_not_recorded_family = u.evidence.some(e => e.__family_source === 'NOT_RECORDED');
});

/** ★ The 47th unit. The frozen table declares DM5 × 13 and the 13th DM5 row is techybrid4, whose
 *  status column reads WORKING rather than CEO-CONFIRMED (the preceding reconciliation order
 *  reported this: 46 of 47 rows carry an explicit CEO-CONFIRMED marker). It is INCLUDED here so
 *  that all 47 are accounted for, and flagged so the reader is not misled about its marking. */
UNITS.find(u => u.case === 'techybrid4').gt_marking =
  '★ WORKING in the frozen table — the one unit of the declared 47 without an explicit CEO-CONFIRMED marker (reconciliation deliverable 06). Included so 47/47 are accounted for; the marking gap is reported, not resolved.';

/* ── endpoint SENSITIVITY variants (order §31 · reported, never the primary metric) ──────────── */
function collapse(block, end) {
  const pick = p => (p && p.min !== undefined)
    ? { state: 'OBSERVED', value: end === 'weaker' ? p.min : p.max } : p;
  return {
    axis_target: block.axis_target, evaluation_unit: block.evaluation_unit, excluded: [],
    evidence: block.evidence.map(e => Object.assign({}, e, {
      relative_size: pick(e.relative_size), contrast: pick(e.contrast), spatial_position: pick(e.spatial_position),
    })),
  };
}

module.exports = { UNITS, gtBand, collapse, CALIBRATION, SUPERSEDED_CORPUS_ONLY, BLOCK, E, o, rng, m1, C, LU, DV, US };
