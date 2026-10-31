/**
 * STMX — 36-Parameter Garment-Level Vision Producer V1  (35 → 36 · Sleeve Volume Final Silhouette Closure 2026-08-16;
 *   was 40 · Pre-Proportion Consolidation Sprint 2026-08-15)
 * ★ Sleeve Volume Final Closure (CEO Decision 2026-08-16 · D-SV-1 APPROVED · Producer-35 → Producer-36):
 *   +`sleeve_volume` = `Regular / Voluminous` (CA#30; was Regular/Full/Exaggerated) — ONE raw observation of sleeve BODY volume
 *   (magnitude only; NOT sleeve-style nomenclature). Conditional, parent `sleeve` (applicable when a sleeve body is
 *   present ∧ sleeve ≠ Sleeveless; Sleeveless / lower-only → N/A this instance). Region = upper. `sleeve` stays
 *   LENGTH-only (One Concept → One Field). Independent of fit / shoulder_structure / fabric_behavior / construction.
 *   Approval Anchor — CEO Decision 2026-08-16; Affected Scope: producer_rules/prompt/validator + tests;
 *   Reason: proven TC-material Silhouette evidence gap (sleeve body volume unrepresented by any existing field).
 * FROZEN RULE TABLES  (deterministic-controller authority)
 * ---------------------------------------------------------------------------
 * ★ CEO Pre-Proportion Garment Vision Consolidation (2026-08-15 · 40→35):
 *   - Closure 3→1: front_opening_type + closure_arrangement folded losslessly into `closure_type`
 *     (domain Button/Single Breasted Button/Double Breasted Button/Snap Button/Zipper/Hook Closure/Open).
 *     closure_type = Mandatory(Jacket/Coat) + Conditional(TOP/Dress/Jumpsuit, gate front_opening_extent≠None).
 *     front_opening_extent RETAINED.
 *   - front_overlap REMOVED (unconsumed morphology; CEO A2).
 *   - open_back + cutout → single MULTI `exposure_opening` (Open Back/Front Cutout/Side Cutout/Shoulder Cutout;
 *     no location sub-field, no magnitude). ~~Dress/Jumpsuit Mandatory.~~
 *     ★ SUPERSEDED 2026-09-03 (CEO Vision Exposure Category Applicability Correction V1): the
 *     Dress/Jumpsuit-only applicability is retired — `exposure_opening` is UNIVERSAL (every category).
 *     Rationale: the 2026-08-15 consolidation carried only Class B (designed openings), for which a
 *     Dress/Jumpsuit scope was defensible. The 2026-08-21 Two-Class carrier added CLASS A DIRECT BODY
 *     EXPOSURE REGIONS, and a body region is exposed by a garment's cut, not by its category — a
 *     cropped tee bares a midriff exactly as a cut-out dress does. Vocabulary, domain, class partition
 *     and EXPOSURE_EI_MAP are unchanged; only the applicability gate moved.
 *   - standalone `transparency` RETIRED → Surface values `Semi Transparent`/`Transparent`; +`Glossy`.
 *   Approval Anchor — CEO Decision 2026-08-15; Affected Scope: producer_rules/controller/validator/prompt
 *   + tests; Reason: STMX_VISION_GARMENT_APPROVED_CONSOLIDATION_IMPLEMENTATION_SPEC_V1 §11 (D-I1/D-I2/D-I3 CLOSED).
 * Source of truth (loaded, not invented):
 *   - Applicability (U/M/C/N per category): F4 `STMX_VISION_10X40_FINAL_APPLICABILITY_MATRIX_V1`
 *     (CEO-APPROVED FINAL, programmatically reconciled U+M+C+N=40 · post ADR-126 CA#2–CA#7).
 *   - Value domains / regions / states / MULTI-4 / Other: `STMX_VISION_EXTRACTION_SCHEMA_FROZEN_V1`
 *     (FROZEN V1 · inventory + field-defs + CA#4/CA#5/CA#6/CA#7 headers).
 *   - Operational classes: F2 `..._40_PARAMETER_FINAL_OPERATIONAL_CLASSIFICATION_V1`.
 * NOTE: F3 (10-Category Checklist) section headers carry a residual CA#4 shoulder sync-lag
 *   (TOP/Dress/Jumpsuit still list shoulder_connection/span as M); F4 is authoritative here.
 *   Reported to CEO as an OUT OF SCOPE FINDING — not corrected in this implementation sprint.
 *
 * This module contains NO model/vendor/prompt code and NO STMX scoring (Observation ≠ Consumption, G40).
 */
'use strict';

const CATEGORIES = ['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt', 'Jacket', 'Coat', 'Trouser', 'Skirt', 'Dress', 'Jumpsuit'];

// ── COMPONENT SCALE VOCABULARY — ONE registry, shared by every component scale carrier ──────────
//   Single source for `cuff_scale` (CEO 2026-08-21) and `collar_scale` (CEO 2026-08-23).
//   ⛔ Do NOT declare a second scale vocabulary. A new component scale reuses THIS array.
//   ⛔ Ordinal-looking, but never numeric: no ratios, no percentages, no pixel/cm thresholds.
const COMPONENT_SCALE_DOMAIN = ['Reduced', 'Regular', 'Enlarged'];

// Canonical parameter number (Schema inventory 1..35) — identity/ordering only.
const PN = {
  category:1, trouser_distinction:2, silhouette:3, fit:4, length:5, fabric_behavior:6, waist_definition:7,
  sleeve:8, shoulder_connection:9, shoulder_span:10, shoulder_drop:11, shoulder_structure:12,
  neckline_shape:13, neckline_position:14, collar:15, cuff_type:16, rib_hem:17, hood:18,
  front_opening_extent:19, closure_type:20,
  pocket:21, pocket_construction:22, pocket_projection:23, cuff_scale:24,
  material:25, surface:26, pattern:27, graphic:28, asymmetry:29,
  slit:30, ruffle:31, decorative_detail:32, attachment:33, exposure_opening:34, grammar:35,
  sleeve_volume:36, // D-SV-1 (CEO 2026-08-16) — appended; existing 1..35 identity unchanged
  collar_scale:37,  // Component Scale Production Finalization (CEO 2026-08-23 · Q1=YES) — appended; 1..36 identity unchanged
};
// ── COMPONENT SCALE PRODUCTION FINALIZATION (CEO Decision 2026-08-23 · Q1–Q4 APPROVED) ────────
//   ADDED: `collar_scale` (PN 37).  Producer 36 → 37.
//   ⚠ Unlike the CUFF MIGRATION below, there is NO field retired in exchange. This is a GOVERNED
//     PRODUCER EXPANSION under G46, which permits expansion only when ALL SIX hold:
//       (1) downstream material need     — B3-02 is a live HOLD that cannot close without this carrier
//       (2) existing evidence insufficient — no parameter carried collar SCALE; the observation leaked
//           into garment-level `fit` (B3-02 fit evidence literally reads "long exaggerated cuffs")
//       (3) reliable single-view observability — un-thresholded collar contract passed 8/8 criteria
//           (Regular 13/13 · Enlarged 3/3, CEO_VISUAL_ADJUDICATION)
//       (4) non-duplication              — the only pre-existing scale carrier was `cuff_scale`
//       (5) material information gain    — removes component-scale contamination of `fit`
//       (6) explicit CEO approval        — Q1 = YES
//     G46's "Producer remains 36; no 37th param" records the state at freeze time and is qualified by
//     that same guard's expansion clause. BE-G1/EO-G6 are scoped to exposure_opening and the quilting
//     firewall respectively — neither is a general prohibition.
//   ★ LAPEL ABSORPTION (CEO Q3 = YES): there is deliberately NO `lapel_scale`. A lapel is not a
//     separate component in Producer-36 — it is `collar ∈ {Notched, Peak, Shawl}`. A second scale
//     carrier for a subset of ONE parameter's values would violate One Concept → One Field Name
//     (the same class of error as `body_fitting`, ADR-034). Lapel scale is recorded in `collar_scale`.
//   ★ TYPE ≠ SCALE, exactly as for cuff: `collar` carries WHICH collar/lapel form; `collar_scale`
//     carries HOW LARGE. Neither is ever inferred from the other.
//   ⚠ ARCHITECTURE ADOPTION ≠ EMPIRICAL CERTIFICATION (CEO Q2). Adopting this carrier does NOT
//     certify lapel scale reading accuracy. Notched/Peak scale evidence remains the weakest in the
//     track (best one-call result 7/11); `Reduced` is EMPIRICALLY UNVALIDATED on BOTH scales (Q4).
//     These are calibration facts recorded in the evidence registry — NOT reasons to alter vocabulary.
// ── CUFF MIGRATION (CEO Decision 2026-08-21 · Cuff Production Implementation) ────────────────
//   RETIRED: `rib_cuff` (was PN 16) · `french_cuff` (was PN 24)
//   ADDED:   `cuff_type` (PN 16)   · `cuff_scale`  (PN 24)
//   Net parameter count UNCHANGED at 36 — two retired, two added, slots reused.
//   Authority: STMX_CUFF_ADOPTION_AND_COLLAR_ROUND2_VALIDATION_REPORT_V1.md (K1/K2/K3/K4).
//   TYPE ≠ SCALE: cuff_type carries WHICH construction; cuff_scale carries HOW LARGE. Neither is
//   ever inferred from the other, and scale is never encoded into a type token (no `Barrel`).
//   ⚠ The two fields sit on OPPOSITE sides of the CA#37/SV-5 semantic-None rule:
//       cuff_type  domain CONTAINS 'None'  -> visible absence MUST be OBSERVED/"None"; ABSENT illegal.
//       cuff_scale domain has NO 'None'    -> semantic "None" illegal; ABSENT is the empty state.
//   ⚠ MIGRATION PROVENANCE — the retired `french_cuff` carried a SELF-REFERENTIAL applicability gate in
//     producer_controller_v1.js (`case 'french_cuff': { const f = g('french_cuff'); ... }`), i.e. "applicable
//     if it was emitted". Per CEO K6 it was NOT separately repaired; this migration disposes of it. The new
//     cuff_type gate uses a REAL parent (`sleeve`), matching the proven sleeve_volume shape.
//   ⛔ NO historical back-fill: `french_cuff = None` + `rib_cuff = None` cannot distinguish
//     `cuff_type = Standard` from `cuff_type = None`. Pre-migration records stay a distinct generation.
const ALL_PARAMS = Object.keys(PN);

// Universal Scan (9) — every category · also GROUP A for Category=UNKNOWN (ADR-121/CA#2).
// (was 10 → 8: `transparency` retired into `surface` 2026-08-15 · surface is already Universal.
//  now 9: +`exposure_opening` 2026-09-03 — see the EXPOSURE UNIVERSAL block below.)
// ══ D3 · RUFFLE UNIVERSAL RETIREMENT (CEO Decision 2026-08-23) ═══════════════════════════════
// `ruffle` was UNIVERSAL: every category — including menswear Jacket — was forced to answer it.
// Batch 003 produced THREE different failure forms for it (KEY OMITTED · illegal ABSENT ·
// legal OBSERVED/"None"), and the Producer prompt never defined the parameter at all.
// CEO: ruffle is retired from UNIVERSAL and becomes CATEGORY-scoped. ⛔ Gender is NOT an axis.
// Mechanism: MANDATORY-per-category. ⛔ NOT CONDITIONAL: every existing CONDITIONAL parameter is
// gated by a real parent trigger in CONDITIONAL_TRIGGER, and ruffle has no natural parent
// observation; inventing one to avoid MANDATORY is forbidden.
//
// ★ FINAL MATRIX = { Dress }  (CEO Decision 2026-08-23 · backlog RUFFLE-M1)
//   Established by forensic study, not by fashion intuition:
//     · Dress — the ONLY category whose Frozen Master vocabulary names Ruffle as a parameter
//       ("Decoration: … Ruffle (Structural Detail {None·Present})"), and the only category with a
//       genuine garment-level `Present` observation in 524 recorded ruffle observations.
//     · Skirt — EXCLUDED. Frozen Master routes it to `surface = Gathered`; 0/21 `Present`.
//     · Shirt — EXCLUDED. Neck ruffles are governed as `collar = Ruffle`; the Shirt canonical
//       vocabulary has no `ruffle` parameter; 0/41 `Present`. (Blouse is not a canonical
//       category — it lives inside Shirt.)
//     · all others — EXCLUDED. No vocabulary entry, no `Present` observation.
//   Full derivation: STMX_RUFFLE_MATRIX_AND_SEALED_RECOVERY_V1/02_RUFFLE_CATEGORY_FORENSIC.md
//
// ══ EXPOSURE UNIVERSAL — CATEGORY APPLICABILITY CORRECTION (CEO Decision 2026-09-03) ═══════════
// `exposure_opening` was MANDATORY on Dress/Jumpsuit ONLY, so operationalClass() returned N for the
// other eight categories and the validator rejected any tops/outerwear/bottoms emission as
// NOT_APPLICABLE_EMITTED. That gate is INCORRECT for the CLASS A body-exposure regions the carrier
// gained on 2026-08-21.
//   ★ CEO CORRECTED PRINCIPLE: the question is "does this garment's intrinsic design cause a
//     canonical body region to be meaningfully visibly exposed?" — NOT "is this garment a Dress or
//     a Jumpsuit?". CATEGORY SHALL NEVER BE AN N/A GATE for body exposure.
//   Mechanism: UNIVERSAL — the contract's existing representation for "applies to every garment
//     category". ⛔ NOT ten per-category MANDATORY entries (that would simulate universality with
//     ten special cases and leave the same gate shape in place). Consequently `exposure_opening` is
//     REMOVED from MANDATORY['Dress'] and MANDATORY['Jumpsuit'] — U already covers them, and leaving
//     it in both lists would double-count it in completenessCounts().
//   Unchanged: ALL_PARAMS = 37 · the 9-value domain · the Class A / Class B partition ·
//     EXPOSURE_EI_MAP · MULTI membership · LOCATION_ELIGIBLE exclusion · the garment-intrinsic and
//     no-auto-inference firewalls (they live in the prompt and are strengthened, not relaxed).
//   ⚠ COUPLED CONSEQUENCE, recorded deliberately: UNIVERSAL is ALSO the GROUP A set permitted under
//     Category=UNKNOWN routing (ADR-121/CA#2). `exposure_opening` therefore becomes emittable (never
//     required — the D1 presence gate is skipped for catUnknown) on UNKNOWN-category records. This is
//     semantically consistent with the correction: a body region is exposed regardless of which
//     category the garment turns out to be. No other parameter's routing changes.
const UNIVERSAL = ['material', 'surface', 'pattern', 'graphic', 'pocket', 'decorative_detail', 'attachment', 'asymmetry', 'exposure_opening'];

// GROUP B — suppressed under Category=UNKNOWN (key omit).
const GROUP_B = ['silhouette', 'fit', 'length'];

// Category-Mandatory (M) per category — F4 authoritative (post CA#3/CA#4/CA#7).
const MANDATORY = {
  'T-Shirt':   ['category','fit','length','fabric_behavior','sleeve','shoulder_drop','neckline_shape','neckline_position','collar','rib_hem','front_opening_extent'],
  'Shirt':     ['category','fit','length','fabric_behavior','sleeve','shoulder_drop','neckline_shape','neckline_position','collar','rib_hem','front_opening_extent'],
  // ★ C-3 (CEO Decision 2026-08-27 · Batch 005 Phase 2B): Sweater gains `hood` as MANDATORY.
  //   A Sweater may visibly carry a hood, and a garment does NOT become a Sweatshirt merely because a
  //   hood is present. Guard UG-G17 ("Hoodie = Sweatshirt + Hood=Present, not a separate Product
  //   Category") is an ANTI-PHANTOM-CATEGORY rule — it was never a category-routing rule, and is now
  //   clarified as such at its single guard surface. ⛔ hood NEVER decides the category; Sweater vs
  //   Sweatshirt continues to follow the existing garment-category criteria.
  //   Convention: M, exactly as for Sweatshirt / Jacket / Coat — no new applicability class, no Sweater
  //   special case anywhere downstream. Absence is the ABSENT state (hood has no `None` in its domain).
  'Sweater':   ['category','fit','length','fabric_behavior','sleeve','shoulder_drop','neckline_shape','neckline_position','collar','rib_hem','hood','front_opening_extent'],
  'Sweatshirt':['category','fit','length','fabric_behavior','sleeve','shoulder_drop','neckline_shape','neckline_position','collar','rib_hem','hood','front_opening_extent'],
  // CA#15 (CEO 2026-08-18 · Batch 001 Stage 1 · D-1 + D-2): Jacket/Coat gain TWO Mandatory observations.
  //   +front_opening_extent (D-1) — outerwear closure EXTENT is visually observable and was being discarded
  //     (Guard G40: observation applicability ⊇ consumption scope). Works WITH closure_type so a consumer can
  //     distinguish `Zipper + Partial` from `Zipper + Full`. Domain unchanged: None | Partial | Full.
  //   +shoulder_drop (D-2) — seam POSITION, independent of shoulder_structure (visible shoulder contour). Dress/Jumpsuit
  //     already carry both, so a same-category precedent exists. Domain unchanged: None | Dropped.
  //   Neither is a new parameter and neither adds vocabulary; both move N → M. Count stays 36 (N derives).
  'Jacket':    ['category','fit','length','fabric_behavior','sleeve','shoulder_drop','shoulder_structure','collar','rib_hem','hood','front_opening_extent','closure_type','grammar'],
  'Coat':      ['category','fit','length','fabric_behavior','sleeve','shoulder_drop','shoulder_structure','collar','rib_hem','hood','front_opening_extent','closure_type','grammar'],
  'Trouser':   ['category','trouser_distinction','silhouette','fit','length','fabric_behavior'],
  // D3 FINAL MATRIX (CEO Decision 2026-08-23 · RUFFLE-M1): `ruffle` is MANDATORY on **Dress only**.
  // ⛔ Skirt is NOT ruffle-applicable. The Frozen Master's Skirt vocabulary routes a skirt ruffle to
  // the Surface value instead — "Surface(Ruffle=Gathered 표현)" — and Skirt has 0 of 21 `Present`
  // observations on record. An earlier implementation put ruffle on Skirt by analogy to `slit`;
  // that analogy was wrong and is reversed here.
  // ⛔ Shirt is NOT ruffle-applicable either: a blouse's neck ruffle is already governed as
  // `collar = Ruffle` (Frozen Master: "Ruffle Collar는 Collar"), the Shirt canonical vocabulary
  // carries no `ruffle` parameter, and Shirt has 0 of 41 `Present` observations.
  // ⛔ Not gender-derived — Blouse is not a canonical category; it lives inside Shirt.
  'Skirt':     ['category','silhouette','fit','length','fabric_behavior','slit'],
  // ★ 2026-09-03 EXPOSURE CATEGORY APPLICABILITY CORRECTION: `exposure_opening` removed from these two
  //   MANDATORY lists because it is now UNIVERSAL (applicable to all 10 categories). Dress/Jumpsuit lose
  //   nothing — U is required-presence exactly as M is (validator D1: UNIVERSAL ∪ MANDATORY[category]).
  //   ⛔ Keeping it here as well would double-count it in completenessCounts() and corrupt N.
  'Dress':     ['category','silhouette','fit','length','fabric_behavior','sleeve','shoulder_drop','shoulder_structure','neckline_shape','neckline_position','collar','rib_hem','front_opening_extent','slit','ruffle'],
  'Jumpsuit':  ['category','silhouette','fit','length','fabric_behavior','sleeve','shoulder_drop','shoulder_structure','neckline_shape','neckline_position','collar','rib_hem','front_opening_extent'],
};

// Conditional (C) per category — F4 authoritative (shoulder_connection/span Conditional CA#4; pocket_* +Skirt/Jacket/Coat CA#4/CA#7).
// CA#12 (CEO 2026-08-14 · D2/AR-2): pocket_construction/pocket_projection are Universal-Conditional across all 10 categories
//   (gate = pocket === Present && morphology visually readable). Previously whitelisted to Jacket/Coat/Trouser/Skirt only.
// Closure 3→1 (CEO 2026-08-15): `closure_type` absorbs the former `front_opening_type` role on
//   TOP/Dress/Jumpsuit as a Conditional (gate front_opening_extent≠None); it stays Mandatory on Jacket/Coat.
// sleeve_volume (D-SV-1 · CEO 2026-08-16): Conditional in every sleeve-bearing category (parent `sleeve`; gate sleeve ≠ Sleeveless).
//   Trouser/Skirt have no sleeve → sleeve_volume is N (not applicable). Sleeveless instance → N/A this instance (controller key-omit).
const CONDITIONAL = {
  'T-Shirt':   ['closure_type','shoulder_connection','shoulder_span','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
  'Shirt':     ['closure_type','shoulder_connection','shoulder_span','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
  'Sweater':   ['closure_type','shoulder_connection','shoulder_span','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
  'Sweatshirt':['closure_type','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
  'Jacket':    ['waist_definition','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
  'Coat':      ['waist_definition','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
  'Trouser':   ['pocket_construction','pocket_projection'],
  'Skirt':     ['pocket_construction','pocket_projection'],
  'Dress':     ['waist_definition','closure_type','shoulder_connection','shoulder_span','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
  'Jumpsuit':  ['waist_definition','closure_type','shoulder_connection','shoulder_span','pocket_construction','pocket_projection','sleeve_volume','cuff_type','cuff_scale','collar_scale'],
};

// Conditional trigger (parent condition) — governs when the controller expects the branch (else key-omit / N/A this instance).
const CONDITIONAL_TRIGGER = {
  // closure_type is Conditional ONLY on TOP/Dress/Jumpsuit (gate below); on Jacket/Coat it is Mandatory (trigger not evaluated).
  closure_type:        { parent:'front_opening_extent', rule:'front_opening_extent !== None' },
  sleeve_volume:       { parent:'sleeve',               rule:'sleeve body present (sleeve observable ∧ sleeve ≠ Sleeveless); Sleeveless → N/A this instance' },
  // CUFF MIGRATION (CEO 2026-08-21). Both gates use a REAL parent — never the self-referential form
  // that the retired `french_cuff` gate used ("applicable if it was emitted").
  cuff_type:           { parent:'sleeve',               rule:'sleeve end present (sleeve OBSERVED ∧ sleeve ≠ Sleeveless); Sleeveless → N/A this instance' },
  cuff_scale:          { parent:'cuff_type',            rule:"cuff_type OBSERVED ∧ cuff_type ≠ 'None' (readability is a Vision STATE, not an applicability condition — mirrors pocket_construction)" },
  // Component Scale Production Finalization (CEO 2026-08-23 · Q1/Q3). Same shape as cuff_scale, one
  // level up: the parent is the component TYPE parameter, and carrier absence key-omits the scale.
  // ★ This single gate covers shirt collars AND lapels — `collar ∈ {Notched, Peak, Shawl}` are collar
  //   values, so no `lapel_scale` exists or is needed.
  collar_scale:        { parent:'collar',               rule:"collar OBSERVED ∧ collar ≠ 'None' (readability is a Vision STATE, not an applicability condition — mirrors cuff_scale)" },
  pocket_construction: { parent:'pocket',               rule:'pocket === Present (CA#28: readability is a Vision STATE, not an applicability condition)' },
  pocket_projection:   { parent:'pocket',               rule:'pocket === Present (CA#28: readability is a Vision STATE, not an applicability condition)' },
  shoulder_connection: { parent:null,                   rule:'non-standard connection visible (Strap/Strapless/Halter/One Shoulder); ordinary sleeved → N/A this instance' },
  shoulder_span:       { parent:null,                   rule:'span is a meaningful design variable (Narrow/Extended); ordinary sleeved → N/A this instance' },
  waist_definition:    { parent:null,                   rule:'CA#27 + SR-CLOSEOUT (CEO 2026-08-21) · TWO GATES — (1) CATEGORY gate: Jacket/Coat/Dress/Jumpsuit. (2) LENGTH gate: Hip Length or longer MAY be applicable; Waist Length or shorter (Cropped / Waist Length) = N/A, because insufficient garment extends below the waist to evaluate shaping. Hip Length is an applicability THRESHOLD, not evidence that waist definition exists. Readability still via NOT_VISIBLE/UNKNOWN; no parent parameter exists and no waist value is ever inferred' },
};

// Construction-triggered applicability suppression (CA#11 · CEO 2026-08-14 · D1/AR-1).
// When a runtime construction condition holds, an otherwise-Mandatory parameter becomes N/A for THIS
// instance only (redundant observation). This is construction-triggered, NOT a category-wide M→N change —
// the static F4 cell stays M; only this specific construction suppresses it (controller key-omits, like an
// untriggered Conditional). `categories` = the family where the construction can occur; the trigger itself
// is evaluated in the controller against the raw observations (constructionTriggered).
//   polo_neckline: a Polo-type neck (Shirt collar + partial button placket) makes neckline_shape/position
//     redundant → N/A. Trigger = collar OBSERVED 'Shirt' ∧ front_opening_extent OBSERVED 'Partial'
//     ∧ closure_type OBSERVED Button/Snap Button (post Closure 3→1). Ordinary crew/V/Stand/Mock/Turtleneck tops
//     and full-placket shirts (extent=Full) do NOT satisfy it → neckline preserved.
const CONSTRUCTION_SUPPRESSION = {
  polo_neckline: {
    categories: ['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt'],
    suppresses: ['neckline_shape', 'neckline_position'],
  },
};

// MULTI (multiple simultaneous canonical values with per-value evidence).
const MULTI = ['material', 'surface', 'decorative_detail', 'attachment', 'exposure_opening'];

// Generic `Other` escape-hatch enabled (CA#5) — requires evidence.descriptor.
const OTHER_ENABLED = ['material', 'attachment'];

// ---------------------------------------------------------------------------
// D-4 LOCATION CONTRACT (ADR-126 CA#16 · CEO 2026-08-18)
// ---------------------------------------------------------------------------
// Optional per-value garment-component binding: WHICH COMPONENT carries a localized
// MULTI value. `locations[]` is METADATA INSIDE an existing MULTI `values[]` item —
// it is NOT a parameter (count stays 36), NOT another observation family, NOT part of
// `region`, and NOT a scoring field.
//
//   region     = observation SCOPE  (whole_garment | upper | lower)   — untouched by D-4
//   component  = which structural PART carries the value
//   descriptor = a controlled subordinate location refinement (Panel | Edge)
//   evidence[] = human-readable proof — never a substitute for the above
//
// ⛔ Vision reports only what it SEES. No archetype inference, no salience/size/contrast
//    (those remain DM's frozen primitives), no coordinate qualifiers, no free-text tokens.

// Eligible MULTI families (D-4A). `exposure_opening` is EXCLUDED — its values are
// already self-locating (Open Back / Front Cutout / Side Cutout / Shoulder Cutout).
const LOCATION_ELIGIBLE = ['material', 'surface', 'decorative_detail', 'attachment'];

// Canonical component vocabulary — exactly 14. No aliases, no additions.
const LOCATION_COMPONENTS = [
  'Body', 'Bodice', 'Skirt Body', 'Leg',                       // category-semantic (see below)
  'Shoulder', 'Sleeve', 'Collar', 'Lapel', 'Hood',             // universal-conditional
  'Cuff', 'Hem', 'Waistband', 'Pocket', 'Strap',
];

// Controlled subordinate descriptors — exactly 2.
//   Panel = an assembly piece; NEVER standalone, always needs a parent component.
//   Edge  = a boundary/perimeter; MAY stand alone when the feature follows the garment perimeter.
const LOCATION_DESCRIPTORS = ['Panel', 'Edge'];

// ── EI P3 COVERAGE (D6) · CANONICAL→PRODUCTION RESTORATION (CEO 2026-09-03) ────────────────
// Authority: STMX_EI_SURFACE_MATERIAL_DECORATIVE_OBSERVATION_CANONICAL_V1.md §6 (D6 · CEO Approved
// 2026-08-01). This vocabulary is NOT new — it was approved with the Phase 2 Surface/Material
// (S01–S10) and Decorative (D01–D04) evidence sets and simply never reached the producer contract.
//   Localized = evidence appears on a limited part of the garment.
//   Partial   = appears over a substantial part, but is not the garment's dominant character.
//   Dominant  = the dominant surface/decorative character over most/all of the garment.
// ⛔ EXACTLY THREE VALUES. No Small/Medium/Large, Minor/Major, Full, Global or Whole Garment.
// ⛔ COVERAGE IS AN OBSERVATION, NOT A FORCE. Vision never emits Weak/Meaningful/Strong or I/N/E —
//    canonical §6: "Localized/Partial/Dominant에 numeric score/weight/EI increment/formula/threshold
//    부여 0. Coverage의 EI 영향 = 후속 Score Physics/Synthesis."
// ⛔ COVERAGE ≠ LOCATION. `locations[]` answers WHICH COMPONENT carries the value; coverage answers
//    HOW MUCH OF THE GARMENT the value covers. Neither is derivable from the other, and a value may
//    legitimately carry both (Glossy @Lapel + Localized).
// ⛔ COVERAGE ≠ A PARAMETER. Like `locations[]` it is metadata INSIDE an existing MULTI `values[]`
//    item: the semantic parameter count stays 37 and no value domain changes.
const COVERAGE = ['Localized', 'Partial', 'Dominant'];

// ★ V1.1 SCOPE CORRECTION (CEO 2026-09-04) — ChatGPT Independent Review BLOCKER A.
// V1 gated coverage at FAMILY level, which let `material=Wool + coverage=Dominant` validate. That is
// WIDER than the canonical: §6 binds coverage to Surface/Material (S01–S10) and Decorative (D01–D04)
// EVIDENCE, not to every value a carrier family can hold. Plain No-Effect values take no coverage.
//
//   production source value → EI canonical evidence candidate → S01–S10 / D01–D04 → coverage
//
// The families below remain the CARRIERS (a coverage may only ever appear inside one of them), but
// carrier membership alone NO LONGER grants eligibility — the VALUE must map to a canonical class.
// ⛔ `exposure_opening` — excluded by Exposure Canonical §9 (D8): "Phase 2 Coverage
//    vocabulary(Localized/Partial/Dominant)를 Exposure에 자동 적용/확장 안 함."
// ⛔ `graphic` — its own domain (Localized | Dominant) already carries the split (P3_GRAPHIC, not S/D).
// ⛔ `pattern` — all-over by admission (P3_PATTERN, not S/D); a localized motif is a graphic.
const COVERAGE_CARRIER_FAMILIES = ['material', 'surface', 'decorative_detail', 'attachment'];

// Per-value canonical evidence mapping. Each entry is the S/D class the value is admitted under.
// SOURCE OF TRUTH (not invented here): the `dedup_key` / `authority` columns of
//   01_ENGINES/ITEM_SCORING_ENGINE/PRE_IMPLEMENTATION_EI_SCORE_PHYSICS_SINGLE_AXIS_V1_2_1_REVIEW_READINESS_CORRECTION/
//   STMX_EI_P3_SEMANTIC_STATUS_V1_2_1.json
// read against STMX_EI_SURFACE_MATERIAL_DECORATIVE_OBSERVATION_CANONICAL_V1.md §3 (S01–S10) / §4 (D01–D04).
// ⛔ THIS TABLE CARRIES NO FORCE. It says only "this value is admitted as canonical P3 evidence", never
//    Weak/Meaningful/Strong and never I/Neutral/E. Expressive strength stays an EI Engine judgement.
// ✔ Reconciles with all four canonical §6 worked examples:
//    Fur+Localized (S04) · Quilted+Dominant (S05) · Metal Hardware+Partial (D01) · Lace/Openwork+Dominant (S10).
const COVERAGE_EVIDENCE_MAP = {
  surface: {
    'Transparent': 'S08', 'Semi Transparent': 'S08', 'Mesh': 'S08',   // Pronounced Sheer / Transparent
    'Reflective': 'S03', 'Glossy': 'S03',                             // Pronounced Reflective / Light-Reactive
    'Textured Knit': 'S01',                                           // Pronounced Textured Surface
    'Exotic-Skin': 'S02',                                             // Pronounced Exotic-Skin Surface
    'Quilted': 'S05',                                                 // Pronounced Quilted Surface
    'Treated Surface': 'S06/S07',                                     // Distressed / Treated-Washed
    'Pleated': 'S09',                                                 // Pronounced Pleated Surface
    'Lace': 'S10',                                                    // Pronounced Lace / Openwork
    // ⛔ 'Gathered' — DEFERRED_OPEN_NOT_USED; no S01–S10 class covers gathering/shirring.
  },
  material: {
    'Fur': 'S04',                                                     // Pronounced Fur / Hairy Surface
    // ⛔ Cotton · Wool · Leather · Suede · Denim · Knit · Synthetic · Silk · Velvet · Padding · Other
    //    are Phase 2 §5 No-Effect / §10 REJECTED — ordinary material identity is not P3 evidence.
  },
  decorative_detail: {
    'Sequin-Beading': 'S03/D02',                                      // Reflective + Applied Embellishment
    'Appliqué': 'D02/D03',                                            // Applied Embellishment / 3D Attached Objects
    // ⛔ 'Embroidery' — Phase 2 D5: "Standalone Embroidery Evidence = REJECTED".
    // ⛔ 'Piping' — DEFERRED_OPEN_NOT_USED; post-dates the Phase 2 evidence list, no S/D class covers it.
  },
  attachment: {
    'Metal Hardware': 'D01',                                          // Pronounced Metal Hardware
    'Jewelry Attachment': 'D02',                                      // Applied Embellishment
    'Feather': 'D03', 'Ribbon': 'D03',                                // 3D Attached Objects
    'Fringe': 'D04',                                                  // Pronounced Fringe / Tassel
    'Fur Trim': 'S04',                                                // fur surface carried as a trim
    // ⛔ Belt · Epaulette · Storm Flap — functional construction (D01 exclusion). 'Other' — free-text carrier.
  },
};
const isCoverageCarrierFamily = p => COVERAGE_CARRIER_FAMILIES.includes(p);
const coverageEvidenceClass = (p, v) => (COVERAGE_EVIDENCE_MAP[p] || {})[v] || null;
// TWO-ARGUMENT GATE. A coverage is admissible only on a value that maps to a canonical S/D class.
const isCoverageEligible = (p, v) => coverageEvidenceClass(p, v) != null;
// Back-compat alias for the family list (V1 name). ⛔ Family membership is NOT eligibility.
const COVERAGE_ELIGIBLE = COVERAGE_CARRIER_FAMILIES;

// ── EI P3 SCALAR REALIZATION EXTENT · CARRIER EXTENSION ────────────────────────────────────
// Approval Anchor
//   CEO Decision:   2026-09-05
//   Order:          STMX — EI DIRECTION PHYSICS FINAL CONSOLIDATED IMPLEMENTATION + 114 REGRESSION V1
//   Reason:         §7 (Pocket Morphology) · §10 (Graphic prominence) · §11.1 (Pattern realization)
//                   each finalize an EI force architecture that MUST separate realizations of the SAME
//                   token, and each explicitly instructs: audit the existing representation first, and
//                   "if insufficient, add only the minimum typed governed prominence / scale / coverage
//                   representation ... do NOT create a new top-level parameter".
//                   The audit result is that the existing representation IS insufficient:
//                     • pattern — carries no extent at all. The runtime's only dominance signal was a
//                       token gate (`pattern=Repeat → DOMINANT`), which §11 now prohibits
//                       ("Repeat = Strong" is a prohibited universal rule).
//                     • graphic — its domain is only Localized | Dominant, which cannot express the
//                       three realizations §10 requires (tiny incidental · clearly visible non-dominant
//                       · visually dominant).
//                     • pocket — carries location / construction / projection but no prominence, and
//                       §7 forbids inferring prominence from `Volumetric` alone.
//   Affected Scope: producer_rules_v1.js (this block) · producer_validator_v1.js (checkCoverage /
//                   observation-level coverage gate)
//
// WHAT THIS IS:  the ALREADY CEO-APPROVED `COVERAGE` vocabulary (D6 · CEO 2026-08-01 · exactly
//                Localized / Partial / Dominant) admitted on three further carriers.
// WHAT THIS IS NOT:
//   ⛔ no new vocabulary — COVERAGE is unchanged, still exactly three values
//   ⛔ no new parameter — the semantic parameter count stays 37
//   ⛔ no value-domain change — pattern / graphic / pocket domains are untouched
//   ⛔ no force — coverage remains an OBSERVATION; Weak/Meaningful/Strong is an EI Engine judgement
//
// PLACEMENT. These three are SCALAR parameters (not in MULTI), so their observation holds exactly one
// evidence and the coverage sits ON THE OBSERVATION. That is still PER-EVIDENCE — the canonical §6
// binding ("coverage travels with each evidence") is preserved, and the forbidden garment-global
// observation-level coverage on a MULTI carrier stays forbidden.
// ★ 2026-09-05 §6 — `pattern` is REMOVED from the coverage carriers. Pattern dominance is now carried by
//   PATTERN_VISUAL_DOMINANCE, which cannot express "Localized". graphic and pocket are unaffected:
//   a graphic genuinely IS localized or dominant, and a pocket genuinely has an extent.
const SCALAR_REALIZATION_COVERAGE_CARRIERS = ['graphic', 'pocket'];

// ── PATTERN MOTIF COMPLEXITY (CEO 2026-09-05 · §5) ───────────────────────────────────────────
// Approval Anchor
//   CEO Decision:   2026-09-05
//   Order:          STMX — EI DIRECTION V1.2 INDEPENDENT REVIEW DEFECT CORRECTION + PROVISIONAL 114 RERUN V1
//   Reason:         §4/§5 — the final CEO Pattern architecture names FOUR realization factors, and
//                   motif complexity is one of them. No existing typed field carries it, so the
//                   minimum governed substructure is added INSIDE the existing pattern architecture.
//   Affected Scope: this block · producer_prompt_v1.js · producer_validator_v1.js ·
//                   producer_controller_v1.js · the EI force resolver
//
//   Simple   = one repeating motif element / one geometric system (a plain stripe, a plain dot, a plain check)
//   Compound = two or more DISTINCT motif elements, or one motif superimposed on another system
//
// ⛔ Exactly two values. ⛔ Not a magnitude and not a score. ⛔ Never inferred from the pattern token.
// Vocabulary provenance: "Compound" is the CEO's own term for REF_000185 ("Compound Linear");
//   "Simple" is its complement. Neither is coined here.
// ⛔ NOT a parameter — like coverage and density it is metadata ON the existing scalar `pattern`
//   observation, so the semantic parameter count stays 37 and no value domain changes.
const MOTIF_COMPLEXITY = ['Simple', 'Compound'];

// ── SURFACE FINISH REALIZATION (CEO 2026-09-05 · §9 / §10) ───────────────────────────────────
// Approval Anchor
//   CEO Decision:   2026-09-05 · Order: STMX — EI DIRECTION V1.2.1 POST-INDEPENDENT-REVIEW CONSOLIDATED ARCHITECTURE CORRECTION V1
//   Reason:         The five finalized Glossy adjudications cannot be separated by coverage. What
//                   separates them is whether the gloss is the BASELINE sheen of the material and
//                   category, or an intentionally enhanced finish:
//                     REF_000020 padded/technical shell sheen  → NO EFFECT
//                     REF_000021 ordinary puffer-shell sheen   → NO EFFECT
//                     REF_000007 satin lapel, conventional     → WEAK
//                     REF_000141 treated medium-gloss leather  → MEANINGFUL
//                     REF_000145 treated glossy quilted body   → MEANINGFUL
//   Affected Scope: this block · prompt · validator · controller · EI force resolver
//
//   Baseline   = the ordinary sheen this material and category normally have; nothing was added
//   Enhanced   = a deliberately treated / aesthetically pronounced finish beyond that baseline
//   Pronounced = an extreme, dominant high-gloss realization
//
// ⛔ Exactly three values. ⛔ Not a magnitude. ⛔ Never inferred from the surface token, the material
//    or the category — it is an observation about THIS garment's finish.
// ⛔ NOT a parameter: metadata on the existing `surface` values[] items, so the count stays 37.
const FINISH_REALIZATION = ['Baseline', 'Enhanced', 'Pronounced'];
const FINISH_REALIZATION_CARRIERS = ['surface'];
const isFinishRealizationCarrier = p => FINISH_REALIZATION_CARRIERS.includes(p);

// ── TREATED SURFACE REALIZATION (CEO 2026-09-06 · RESUME-1B/1C) ──────────────────────────────
// Approval Anchor
//   CEO Decision:   2026-09-06 · Order: STMX ITEM SCORING ENGINE — RESUME-1C TREATED SURFACE
//                   REALIZATION CONTRACT IMPLEMENTATION V1
//   Reason:         `surface = Treated Surface` alone cannot separate an ordinary wash from a
//                   deliberately distressed realization, so the EI force of that treatment was an
//                   INPUT_REPRESENTATION_GAP (GAP-08). This is the governed observation that closes
//                   the REPRESENTATION half of it. ⛔ It assigns no force.
//   Affected Scope: this block · prompt · validator · controller · EI resolver projection
//
//   Baseline   = the ordinary treated-surface realization — wash, fade, whiskering, ordinary
//                abrasion, worn finishing — with no visibly deliberate distress. The fabric plane
//                is continuous and undamaged.
//   Distressed = a visibly deliberate distressed realization of the garment surface ITSELF —
//                intentional fraying, distress patches / damaged treatment zones, shredding,
//                tearing, deliberate surface disruption.
//
// ⛔ Exactly two values. ⛔ `Structural` is NOT approved for V1 and has no placeholder here.
// ⛔ NOT a parameter: metadata on the existing `surface` values[] items, so the count stays 37.
// ⛔ SIBLING of finish_realization, NEVER a synonym: finish_realization is about SHEEN on Glossy;
//    this is about DELIBERATE DISTRESS on Treated Surface. They never share force semantics.
// ⛔ Never inferred from the surface token, the material, the category, the product name, the
//    Descriptor, an existing score, GT, the REF identity, extent alone, Fringe or attachment state.
// ⛔ `surface = Treated Surface` does NOT imply Baseline — the value must be OBSERVED.
// ⛔ Fringe is attachment = Fringe (D04). ⛔ Appliqué / Embroidery are decorative_detail.
const TREATED_SURFACE_REALIZATION = ['Baseline', 'Distressed'];
// TWO-ARGUMENT GATE, mirroring isCoverageEligible(p, v). ⛔ Deliberately STRICTER than
// finish_realization's parameter-level carrier check: this metadata is admissible ONLY on the
// `surface` value 'Treated Surface', never on Glossy, Reflective or any other surface value.
const TREATED_SURFACE_REALIZATION_CARRIER_VALUES = { surface: ['Treated Surface'] };
const isTreatedSurfaceRealizationEligible = (p, v) =>
  (TREATED_SURFACE_REALIZATION_CARRIER_VALUES[p] || []).includes(v);

// ── PATTERN VISUAL DOMINANCE (CEO 2026-09-05 · §6) ───────────────────────────────────────────
// Approval Anchor
//   CEO Decision:   2026-09-05 · Order: STMX — EI DIRECTION V1.2.1 POST-INDEPENDENT-REVIEW CONSOLIDATED ARCHITECTURE CORRECTION V1
//   Reason:         Pattern force factor 4 is OVERALL VISUAL DOMINANCE. V1.2/V1.2.1 expressed it with
//                   the generic spatial COVERAGE vocabulary, which permits "pattern.coverage =
//                   Localized". That directly contradicts the final Pattern architecture — Pattern is
//                   garment-exterior ALL-OVER by admission and a localized motif is a GRAPHIC.
//                   This carrier expresses dominance WITHOUT re-opening spatial location.
//   Affected Scope: this block · prompt · validator · controller · EI force resolver ·
//                   `pattern` is REMOVED from SCALAR_REALIZATION_COVERAGE_CARRIERS below.
//
//   Subordinate = the all-over pattern is present but does not carry the garment's visual impression
//   Dominant    = the all-over pattern dominates the garment's visual impression
//
// ⛔ Exactly two values. ⛔ NOT a location and NOT an extent — "where" and "how much of the garment"
//    are both meaningless for something that is all-over by admission. ⛔ Pattern location/role is NOT revived.
const PATTERN_VISUAL_DOMINANCE = ['Subordinate', 'Dominant'];
const PATTERN_VISUAL_DOMINANCE_CARRIERS = ['pattern'];
const isPatternDominanceCarrier = p => PATTERN_VISUAL_DOMINANCE_CARRIERS.includes(p);

// ── PRODUCT CONTEXT (CEO 2026-09-05 · §11 / §12 / §16) ───────────────────────────────────────
// Approval Anchor
//   CEO Decision:   2026-09-05 · Order: STMX — EI DIRECTION V1.2.1 POST-INDEPENDENT-REVIEW CONSOLIDATED ARCHITECTURE CORRECTION V1
//   Reason:         §11 — an activewear top must NOT become a new garment Category. The correction
//                   belongs in Product Context. A Trouser already carries its product context through
//                   `trouser_distinction` (which already includes Leggings); an UPPER garment has no
//                   equivalent carrier at all, so a black performance top collapses to the generic
//                   T-Shirt Registry row and misses Neutral.
//   Affected Scope: this block · prompt · validator · controller · context resolver · Neutral Registry
//
//   General               = an ordinary garment of its structural category
//   Activewear-Performance = an athletic / performance product, read from its construction and presentation
//
// ⛔ NOT a Category — the structural Categories are unchanged at 10 and no "Leggings Top" exists.
// ⛔ NOT EI evidence — its only job is accurate product identification and Registry context resolution.
// ⛔ Metadata on the existing `category` observation, so the parameter count stays 37.
const PRODUCT_CONTEXT = ['General', 'Activewear-Performance'];
const PRODUCT_CONTEXT_CARRIERS = ['category'];
const isProductContextCarrier = p => PRODUCT_CONTEXT_CARRIERS.includes(p);
const MOTIF_COMPLEXITY_CARRIERS = ['pattern'];
const isMotifComplexityCarrier = p => MOTIF_COMPLEXITY_CARRIERS.includes(p);

// ── ADDITIONAL-COLOUR RELATIONAL CONTRAST (CEO 2026-09-05 · §6 · §7) ─────────────────────────
// Approval Anchor
//   CEO Decision:   2026-09-05
//   Order:          STMX — EI DIRECTION V1.2 INDEPENDENT REVIEW DEFECT CORRECTION + PROVISIONAL 114 RERUN V1
//   Reason:         §6 — a pattern-bound additional colour merely EXISTING is not proof of genuine
//                   Base↔Pattern relative contrast, and §7 — an additional-colour pathway requires
//                   contrast as well as prominence. Same-family suppression already guarantees the
//                   families DIFFER, so family difference carries no discriminating information:
//                   camel-on-brown and white-on-black were indistinguishable. This field records the
//                   RELATION itself.
//   Affected Scope: this block · color_contract_v1.js · producer_validator_v1.js ·
//                   producer_controller_v1.js · the EI force resolver
//
//   Tonal    = reads as the same tonal family as the body; separates only on close inspection
//   Subtle   = visibly different but low separation against the body
//   Distinct = clearly and immediately separated from the body colour
//
// ONE CONCEPT RULE — the Base↔Pattern relative contrast of §6 is READ FROM the entries whose
//   carrier_kind is "pattern". There is no second contrast field anywhere.
// ⛔ Not numeric. ⛔ Not a pixel measurement. ⛔ Never derived from carrier_kind or from presence.
// Vocabulary provenance: Tonal / Subtle / Distinct are the established EI contrast terms already
//   used by the frozen force-resolution contract. Not coined here.
const ADDITIONAL_COLOUR_CONTRAST = ['Tonal', 'Subtle', 'Distinct'];
const isScalarRealizationCoverageCarrier = p => SCALAR_REALIZATION_COVERAGE_CARRIERS.includes(p);

// ── P-2 · POCKET INSTANCE LOCATIONS (CA#26 · CEO Option C 2026-08-19) ───────────────────────
// Canonical location vocabulary for `pocket.pockets[]` instances — exactly 4, corpus-derived.
// DELIBERATELY SEPARATE from LOCATION_COMPONENTS (D-4): D-4 answers "which component carries
// this VALUE", whereas this answers "where on the garment is this POCKET". Reusing D-4 here
// would be a semantic mismatch and would be circular (`Pocket` is itself a D-4 component).
// This lives OUTSIDE VALUE_DOMAINS on purpose — `pockets[]` is child metadata, not a parameter,
// so the canonical parameter count (36) and the vocabulary fingerprint are both unchanged.
//   Chest       = upper front, chest-level pocket group
//   Lower Front = lower-front pocket group; includes a trouser's FRONT-HIP pockets
//   Sleeve      = pocket on the sleeve / arm
//   Leg         = pocket on a trouser / jumpsuit leg
// ⛔ No Side / Back / Left / Right / Hip / Thigh / free text / coordinates (CA#26).
const POCKET_INSTANCE_LOCATIONS = ['Chest', 'Lower Front', 'Sleeve', 'Leg'];

// The two scalar morphology parameters that `pockets[]` supersedes when it is emitted (Option C).
const POCKET_SCALAR_MORPHOLOGY = ['pocket_construction', 'pocket_projection'];

// Category-semantic components (4). A component listed here is legal ONLY in those categories,
// because the token itself asserts a garment structure that only those categories have.
// Every OTHER component is Universal-Conditional: legal wherever it is actually visible
// (an unusual but visibly real design must not be discarded — G40 observation ⊇ consumption).
const LOCATION_COMPONENT_CATEGORIES = {
  'Body':       ['T-Shirt', 'Shirt', 'Sweater', 'Sweatshirt', 'Jacket', 'Coat'],
  'Bodice':     ['Dress', 'Jumpsuit'],
  'Skirt Body': ['Skirt', 'Dress'],
  'Leg':        ['Trouser', 'Jumpsuit'],
};

function isLocationEligible(param) { return LOCATION_ELIGIBLE.includes(param); }

// Category-semantic gate. Universal-Conditional components return true for every category.
function locationComponentAllowed(component, category) {
  if (!LOCATION_COMPONENTS.includes(component)) return false;
  const cats = LOCATION_COMPONENT_CATEGORIES[component];
  if (!cats) return true;                 // Universal-Conditional
  if (!category) return true;             // Category UNKNOWN → do not category-gate
  return cats.includes(category);
}

// Canonical value domains (Schema FROZEN V1). null = domain not locally encoded (structural validation only + WARN).
// Category-dependent domains (silhouette/length) resolved via functions below.
const VALUE_DOMAINS = {
  category: [...CATEGORIES],
  trouser_distinction: ['Tailored', 'Casual', 'Sport', 'Jeans', 'Leggings'], // Trouser only (Schema #2 · O3, FROZEN) · Jeans≠Denim(material) · Leggings≠Category — CEO authority: Schema line 41/280, V10-consistent

  fabric_behavior: ['Structured', 'Semi-Structured', 'Semi-Fluid', 'Fluid'],
  waist_definition: ['Undefined', 'Defined', 'Cinched'],
  sleeve: ['Sleeveless', 'Short', 'Mid', 'Long'], // LENGTH ONLY (unchanged) — volume lives in sleeve_volume (One Concept → One Field)
  // sleeve_volume (D-SV-1 · CEO 2026-08-16): sleeve BODY volume magnitude relative to an ordinary sleeve for the garment.
  //   Regular = ordinary/non-expanded envelope · Full = clearly enlarged, meaningful but not dominant (ordinary puff/bishop/balloon)
  //   · Exaggerated = dominant silhouette feature / materially expands the upper-garment envelope (extreme balloon/leg-of-mutton).
  //   Magnitude only — NEVER output a sleeve-style name (Puff/Balloon/Bishop/Leg-of-mutton). Independent of sleeve length, fit,
  //   shoulder_structure, fabric_behavior, construction.
    // CA#30 (CEO 2026-08-19): Full/Exaggerated RETIRED — intensity grading removed; binary morphology only.
  sleeve_volume: ['Regular', 'Voluminous'],
  shoulder_connection: ['Standard', 'Strap', 'Strapless', 'Halter', 'One Shoulder'],
  shoulder_span: ['Narrow', 'Regular', 'Extended'],
  shoulder_drop: ['None', 'Dropped'],
  // CA#32 (CEO 2026-08-20): values UNCHANGED — visual boundary recalibration only.
  //   Visible outer shoulder contour ONLY; hidden construction (pads/padding/interfacing/
  //   internal build) is NEVER evidence. Hierarchy: round+continuous -> None · visible break
  //   -> Mild · sustained straight line OR substantial outward extension -> Strong ·
  //   elevated/upturned tip -> Extreme. Angle alone never decides Mild vs Strong;
  //   width/oversized/extension alone never makes Extreme.
  shoulder_structure: ['None', 'Mild', 'Strong', 'Extreme'],
  neckline_shape: ['Round', 'V', 'Square', 'Straight', 'Scoop', 'Mock', 'Turtleneck', 'Funnel'], // CA#14 (CEO 2026-08-14 · TG-2): +`Scoop` = deeper/broader rounded-U opening descending onto upper chest (distinct from shallow neck-hugging Round). Shape only; depth stays neckline_position.
  neckline_position: ['High', 'Regular', 'Low'],
  collar: ['None', 'Shirt', 'Stand', 'Sailor', 'Peter Pan', 'Tie', 'Ruffle', 'Shawl', 'Notched', 'Peak'], // Library 8 + Outerwear Lapel Type (Notched/Peak/Shawl)
  // CUFF MIGRATION (CEO 2026-08-21). TYPE ≠ SCALE — orthogonal, never inferred from each other.
  //   ⚠ cuff_type CONTAINS 'None' → CA#37/SV-5: visible absence MUST be OBSERVED/"None"; ABSENT is illegal.
  //   `Standard` deliberately covers every ordinary cuff band; no tailoring nomenclature (no `Barrel`).
  //   `French` is architecturally retained but EMPIRICALLY UNVALIDATED — the controlled validation found
  //   no French-cuff example in the accessible pool, so the token carries zero test evidence.
  cuff_type: ['None', 'Standard', 'French', 'Ribbed'],
  rib_hem: ['None', 'Present'],
  hood: ['Present'], // presence-observation; absence → ABSENT state (Frozen None 미존재)
  front_opening_extent: ['None', 'Partial', 'Full'],
  // Closure 3→1 (CEO 2026-08-15): unified domain — plain mechanisms + the two Outerwear breasted arrangements
  //   (former closure_arrangement folded in as compound values) + `Open` (former front_opening_type Open).
  closure_type: ['Button', 'Single Breasted Button', 'Double Breasted Button', 'Snap Button', 'Zipper', 'Hook Closure', 'Open'],
  pocket: ['None', 'Present'],
  pocket_construction: ['Inset', 'Applied'],
  pocket_projection: ['Flat', 'Projected', 'Volumetric'], // CA#6
  //   ⚠ cuff_scale contains NO 'None' → CA#37/SV-5: semantic "None" is ILLEGAL here; ABSENT is the
  //   empty state. This is the OPPOSITE side of the rule from cuff_type — the single most error-prone
  //   detail in this migration. `Reduced` is retained for domain symmetry (CEO K4) and is likewise
  //   EMPIRICALLY UNVALIDATED — no clean Reduced example existed and none was manufactured.
  cuff_scale: COMPONENT_SCALE_DOMAIN,
  //   `collar_scale` (CEO 2026-08-23) REUSES the identical component-scale vocabulary above — the same
  //   frozen array, not a second scale registry. Same CA#37/SV-5 side as cuff_scale: NO 'None' in the
  //   domain, so semantic "None" is ILLEGAL and ABSENT is the empty state; `collar = None` key-omits.
  //   ★ Covers shirt collars AND lapels (collar = Notched/Peak/Shawl). There is no `lapel_scale`.
  //   ⚠ `Reduced` is EMPIRICALLY UNVALIDATED here exactly as on cuff_scale (CEO Q4) — retained as legal
  //     vocabulary, never deleted, never folded into `Regular`, and never given a numeric threshold.
  collar_scale: COMPONENT_SCALE_DOMAIN,
  material: ['Cotton', 'Wool', 'Leather', 'Suede', 'Knit', 'Denim', 'Synthetic', 'Silk', 'Velvet', 'Fur', 'Padding', 'Other'], // 11 + Other (CA#5)
  // Surface final 11 (CEO 2026-08-15): +`Glossy` (distinct from Reflective) · +`Semi Transparent`/`Transparent`
  //   (retired standalone `transparency`; optical property, material-independent — observe, never infer from material).
  // Surface 12 (CEO 2026-09-04 · EI P3 FINAL CLOSURE V1.1 §17): +`Exotic-Skin`.
  //   CANONICAL→PRODUCTION RESTORATION, not new architecture. S02 "Pronounced Exotic-Skin Surface" has been
  //   CEO-approved canonical evidence since 2026-08-01 but had no production carrier, so it could never be
  //   observed. The value is the canonical short form used verbatim in the canonical alias table
  //   ("Embossed exotic → S02 Exotic-Skin"), the Architecture Map and Decision History — normalized by
  //   dropping the "Pronounced … Surface" wrapper exactly as S01→`Textured Knit`, S05→`Quilted`,
  //   S09→`Pleated` already were. ⛔ ONE value only; no synonym (Exotic · Animal Skin · Reptile · Croc · Python).
  surface: ['Pleated', 'Gathered', 'Quilted', 'Textured Knit', 'Lace', 'Mesh', 'Treated Surface', 'Reflective', 'Glossy', 'Semi Transparent', 'Transparent', 'Exotic-Skin'],
  pattern: ['Linear', 'Grid', 'Repeat'],
  graphic: ['Localized', 'Dominant'],
  asymmetry: ['None', 'Present'],
  // exposure_opening — TWO-CLASS MULTI CARRIER (CEO Decision 2026-08-21 · Option A-Modified).
  //   ONE parameter, MULTI, whole_garment. Producer count stays 36 — no #37, no cutout_location param.
  //
  //   CLASS A · BODY EXPOSURE REGION  — "what body region is meaningfully EXPOSED?"
  //   CLASS B · DESIGNED OPENING      — "what designed opening/cutout construction exists?" (pre-existing values, PRESERVED)
  //
  //   ⛔ The two classes share one carrier for contract preservation. They are NOT semantically
  //      equivalent and must never be treated as interchangeable. Region ≠ Mechanism.
  //      `Back` (region) ≠ `Open Back` (construction). Both may legitimately co-occur — that is
  //      two different observations, NOT duplication.
  //   ⛔ Class B is NOT decomposed into Cutout + Location (prior decomposition requirement WITHDRAWN
  //      2026-08-21): the fused names already carry the location without needing new vocabulary.
  //   ⛔ EI consumes the REGION class ONLY (see EXPOSURE_EI_MAP). Class B must never create a second
  //      EI Exposure contribution alongside its region.
  exposure_opening: ['Shoulder', 'Chest / Décolletage', 'Midriff / Waist', 'Back', 'Upper Thigh',
                     'Open Back', 'Front Cutout', 'Side Cutout', 'Shoulder Cutout'],
  slit: ['None', 'Present'],
  ruffle: ['None', 'Present'],
  // CA#17 (CEO 2026-08-18 · D-8): +`Piping` — a narrow applied cord/strip trim run along a seam or edge.
  //   Value-domain expansion ONLY: no new parameter, no new family, applicability unchanged, count stays 36.
  //   Piping is the DECORATIVE FEATURE; where it sits is D-4 `locations[]` (e.g. {descriptor:'Edge'} or
  //   {component:'Collar', descriptor:'Edge'}); what COLOUR it is stays in Colour V1
  //   (`additional_colors[] → carrier_kind 'generic_descriptor', carrier_ref 'Piping'`). The three facts are
  //   separate contracts and must never be collapsed into one another.
  decorative_detail: ['Embroidery', 'Sequin-Beading', 'Appliqué', 'Piping'],
  attachment: ['Metal Hardware', 'Jewelry Attachment', 'Ribbon', 'Belt', 'Epaulette', 'Storm Flap', 'Fur Trim', 'Fringe', 'Feather', 'Other'], // 9 + Other (CA#5)
  grammar: ['Tailored', 'Casual', 'Utility'],
};

// Category-dependent domains (Schema field-def #3 silhouette · #5 length).
function silhouetteDomain(category) {
  // Silhouette Final Migration (CEO 2026-08-16): `silhouette` is the common LOWER GEOMETRY carrier (category-scoped).
  //   D-OP-2/D-SK/D-TJ/D-LG. Directional geometry only — ease/width/volume live in `fit`/`fabric_behavior`.
  switch (category) {
    case 'Trouser':  return ['Straight', 'Flared', 'Tapered'];              // D-TJ-1 (was Skinny/Slim/Straight/Wide/Oversized)
    case 'Skirt':    return ['Straight', 'Widening', 'Narrowing'];          // D-SK-1 (Widening absorbs all outward; NO Flared)
    case 'Dress':    return ['Straight', 'Widening', 'Flared', 'Narrowing'];// D-OP-2 (was null/structural-only)
    case 'Jumpsuit': return ['Straight', 'Flared', 'Tapered'];              // D-LG-3 shares Trouser lower-leg vocab
    default:         return null;   // N/A for TOP/Outerwear (handled by applicability)
  }
}
function lengthDomain(category) {
  switch (category) {
    case 'T-Shirt': case 'Shirt': case 'Sweater': case 'Sweatshirt':
      return ['Cropped', 'Regular', 'Long']; // TOP Upper set (Frozen Vocab Master §7)
    case 'Jacket':
      return ['Cropped', 'Waist Length', 'Hip Length']; // CA#9 (CEO 2026-08-13): Jacket domain wired · Waist → Waist Length · Vocab Master §7
    case 'Coat':
      // CA#9 (CEO 2026-08-13): Coat domain wired · Vocab Master §7.
      // CA#13 (CEO 2026-08-14 · AR-3): +`Thigh Length` between Hip Length and Knee Length (Coat-only intermediate
      //   hem zone — clearly below hip, clearly above knee; a zone, NOT a mid-thigh midpoint). value-domain expansion only.
      return ['Hip Length', 'Thigh Length', 'Knee Length', 'Maxi Length'];
    case 'Trouser': case 'Jumpsuit':
      // Canonical = Frozen Vocab Master §7. CA#8 Full→Full Length · CA#9 Knee→Knee Length, Extended→Extended Length ·
      // CA#10 (CEO 2026-08-13): Calf→Calf Length, Ankle→Ankle Length (reconciled to Frozen Master; conflict CLOSED).
      return ['Short', 'Knee Length', 'Calf Length', 'Ankle Length', 'Full Length', 'Extended Length'];
    case 'Skirt': case 'Dress':
      return ['Mini', 'Midi', 'Maxi Length']; // CA#8: Maxi → Maxi Length
    default: return null;
  }
}
function fitDomain(category) {
  // Skirt / Dress-Lower may add Voluminous (Fit Observability V1)
  if (category === 'Skirt' || category === 'Dress') return ['Slim', 'Regular', 'Relaxed', 'Oversized', 'Voluminous'];
  return ['Slim', 'Regular', 'Relaxed', 'Oversized'];
}
function domainFor(param, category) {
  if (param === 'silhouette') return silhouetteDomain(category);
  if (param === 'length') return lengthDomain(category);
  if (param === 'fit') return fitDomain(category);
  return Object.prototype.hasOwnProperty.call(VALUE_DOMAINS, param) ? VALUE_DOMAINS[param] : null;
}

// Region placement (Schema §B4). fabric_behavior + fit are regional for Dress/Jumpsuit; length category-dependent.
const REGION = { WHOLE: 'whole_garment', UPPER: 'upper', LOWER: 'lower' };
function regionFor(param, category) {
  const UPPER_ONLY = ['sleeve','sleeve_volume','shoulder_connection','shoulder_span','shoulder_drop','shoulder_structure','neckline_shape','neckline_position','collar','collar_scale','cuff_type','cuff_scale','rib_hem','hood','front_opening_extent','closure_type'];
  if (UPPER_ONLY.includes(param)) return [REGION.UPPER];
  if (param === 'slit') return [REGION.LOWER];
  if (param === 'fit') {
    if (['Dress','Jumpsuit'].includes(category)) return [REGION.UPPER, REGION.LOWER];
    if (['Trouser','Skirt'].includes(category)) return [REGION.LOWER];
    return [REGION.UPPER]; // TOP / Outerwear
  }
  if (param === 'length') {
    if (['T-Shirt','Shirt','Sweater','Sweatshirt','Jacket','Coat'].includes(category)) return [REGION.UPPER];
    if (['Trouser','Skirt','Jumpsuit'].includes(category)) return [REGION.LOWER];
    return [REGION.WHOLE]; // Dress
  }
  if (param === 'fabric_behavior') {
    if (['Dress','Jumpsuit'].includes(category)) return [REGION.UPPER, REGION.LOWER]; // CA#5 regional (both emitted)
    return [REGION.WHOLE];
  }
  return [REGION.WHOLE];
}

// 4-state model. semantic None is an OBSERVED value on a None-domain parameter (≠ ABSENT).
const STATES = ['OBSERVED', 'ABSENT', 'NOT_VISIBLE', 'UNKNOWN'];

// Forbidden legacy / downstream fields (contamination guard). Substrings scanned in output keys.
const FORBIDDEN_LEGACY_SUBSTRINGS = [
  'sr_score','tc_score','dm_score','ei_score','_score','tier','governance','sr_runtime',
  'hip_thigh_control','release_behavior','silhouette_expansion','body_fitting','_owgrammar','_owregistry',
  'archetype','119','consumer_identity','recommendation','styling_orchestration','af=','resolvecategory',
];

// Applicable parameter set for a resolved category (U ∪ M ∪ C). N = ALL_PARAMS \ applicable.
function applicableSet(category) {
  const m = MANDATORY[category] || [];
  const c = CONDITIONAL[category] || [];
  const set = new Set([...UNIVERSAL, ...m, ...c]);
  return set; // note: silhouette/fit/length not universal — appear only where in M
}
function operationalClass(param, category) {
  if (UNIVERSAL.includes(param)) return 'U';
  if ((MANDATORY[category] || []).includes(param)) return 'M';
  if ((CONDITIONAL[category] || []).includes(param)) return 'C';
  return 'N';
}
// Completeness reconciliation counts (U+M+C+N = 40).
function completenessCounts(category) {
  const U = UNIVERSAL.length;
  const M = (MANDATORY[category] || []).length;
  const C = (CONDITIONAL[category] || []).length;
  const N = ALL_PARAMS.length - U - M - C;
  return { U, M, C, N, total: U + M + C + N };
}

// ---- exposure_opening TWO-CLASS partition (CEO 2026-08-21 · Option A-Modified) ----
// The two classes partition VALUE_DOMAINS.exposure_opening exactly: disjoint, and their union is
// the whole domain. Kept machine-readable so downstream consumers never have to string-guess.
const EXPOSURE_REGION = ['Shoulder', 'Chest / Décolletage', 'Midriff / Waist', 'Back', 'Upper Thigh'];
const EXPOSURE_DESIGNED_OPENING = ['Open Back', 'Front Cutout', 'Side Cutout', 'Shoulder Cutout'];

// EI Exposure sourcing (ADR-097 E01–E05). ⛔ REGION CLASS ONLY.
// Class-B designed openings are construction/location provenance and must NOT create a second
// EI Exposure contribution alongside their region. Region count does NOT stack EI magnitude.
const EXPOSURE_EI_MAP = {
  'Chest / Décolletage': 'E01',
  'Midriff / Waist':     'E02',
  'Back':                'E03',
  'Upper Thigh':         'E04',
  'Shoulder':            'E05',
};

const exposureClassOf = (v) =>
  EXPOSURE_REGION.includes(v) ? 'REGION'
  : EXPOSURE_DESIGNED_OPENING.includes(v) ? 'DESIGNED_OPENING'
  : null;


// ══ DM DESIGNED DETAIL OBSERVATION LAYER ═══════════════════════════════════════════════════
// Approval Anchor
//   CEO Decision:   2026-09-09
//   Order:          STMX DM OBSERVATION LAYER + M1 PRODUCTION IMPLEMENTATION V1
//   Reason:         CEO-DM-OBS-01..04 + CEO-DM-M1-01. The DM axis is CLOSED & FROZEN
//                   (DM_FREEZE_V1) but its Vision-facing observation had no carrier: the prior
//                   reconciliation proved 20 of 21 family x primitive combinations
//                   unrepresentable by the 37. This block adds the SUBORDINATE governed
//                   observation layer the frozen contract requires.
//   Affected Scope: STMX_VISION_PRODUCER_V1_2 only. The sealed Producer V1 and V1_1 are untouched.
//
// ⛔ NOT PARAMETERS. Nothing here is a top-level Item Vision Parameter. ALL_PARAMS stays 37,
//    PN is not extended, and completenessCounts() is not touched. The DM block lives on the
//    TARGET RECORD as a sibling of `observations`, never inside it.
// ⛔ NOT SCORING. No DM tier, no M1/M2 verdict, no magnitude scale, no weight, no threshold.
// ⛔ VOCABULARY IS TRANSCRIBED, NOT INVENTED. The 7 descriptors and the 3x3 primitive domains
//    are copied verbatim from STMX_DM_CURRENT_OBSERVATION_CONTRACT.md sections 2 and 10.

const DM_DESCRIPTORS = ["graphic","surface_pattern","surface_treatment","decorative_construction","attached_hardware","attached_detail","designed_color_contrast"];
const DM_RELATIVE_SIZE = ["small","medium","large"];
const DM_CONTRAST = ["low","medium","high"];
const DM_SPATIAL_POSITION = ["localized","distributed","whole_garment"];
const DM_PRIMITIVES = {
  relative_size: DM_RELATIVE_SIZE, contrast: DM_CONTRAST, spatial_position: DM_SPATIAL_POSITION,
};
const DM_PRIMITIVE_NAMES = Object.keys(DM_PRIMITIVES);

// ⛔ ABSENT is ILLEGAL on a DM primitive. An evidence that reached evidence[] is a designed system
//    that EXISTS, so it necessarily has a size, a contrast and a deployment — there is no state in
//    which the primitive does not apply. Absence of EVIDENCE is evidence[] = [] (Contract 3:
//    "NO EVIDENCE != low != small != localized"). Unreadability is NOT_VISIBLE / UNKNOWN, which
//    also keeps image observability out of the VALUE (Architecture Guard DA-24).
const DM_PRIMITIVE_STATES = ["OBSERVED","NOT_VISIBLE","UNKNOWN"];

// ── M1-supporting realization (CEO-DM-M1-01) ────────────────────────────────────────────────
// ⛔ NOT a 4th Primitive. ⛔ NOT a score. ⛔ NOT a magnitude scale — exactly two values each, so
//    no "medium" can ever be read as a half-step. Architecture Guard DA-2 permits this only under
//    CEO approval plus four conditions; all four are recorded in the successor contract.
const DM_M1_ELIGIBLE_FAMILIES = ["graphic","surface_pattern","surface_treatment","attached_detail"];
const DM_M1_GRAPHIC_FAMILY = "graphic";
const DM_M1_REALIZATION = {"internal_chromatic_composition":["multi_colour_compound","limited_or_uniform"],"internal_fill_realization":["dense_varied","uniform_or_sparse"]};
const DM_M1_REALIZATION_FIELDS = Object.keys(DM_M1_REALIZATION);
const DM_M1_REALIZATION_STATES = ["OBSERVED","NOT_VISIBLE","UNKNOWN"];

// ── REALIZATION COVERAGE — WHICH FAMILIES MAY CARRY THE CONTAINER (STMX_VISION_PRODUCER_V1_3) ──
// Approval Anchor
//   CEO Decision:   2026-09-13
//   Order:          STMX DM DIRECTION-BSC-1 OBSERVATION CONTRACT COVERAGE CORRECTION + FULL ENGINE
//                   FINAL FREEZE V1 §3 / §13 / §14 / §17 (OPTION A — observation / subordinate-contract
//                   correction)
//   Reason:         DIRECTION-BSC-1. The frozen Direction resolver may legitimately consult the two
//                   internal-composition observations (internal_chromatic_composition ·
//                   internal_fill_realization) as BOUNDED support at the moderate-separation boundary
//                   (CEO scope amendment 2026-09-10). Under V1_2 the container that carries them was
//                   gated on M1 ELIGIBILITY, so a valid decorative_construction / attached_hardware /
//                   designed_color_contrast system could never supply the observation and Direction
//                   resolved UNKNOWN by contract construction. The two fields are raw observations of
//                   what is INSIDE the admitted system; they are not an M1 verdict. The family gate on
//                   the CONTAINER is therefore lifted to every controlled family. ⛔ The M1 predicate's
//                   own eligibility list (DM_M1_ELIGIBLE_FAMILIES, engine side) is NOT changed: a
//                   non-M1 family that now carries the observation remains M1_NOT_ELIGIBLE_FAMILY.
//   Affected Scope: STMX_VISION_PRODUCER_V1_3 only (this constant + producer_validator_v1.js gate +
//                   producer_prompt_v1.js guide). V1_2 is untouched and remains the rollback target.
// ⛔ NOT a new field, NOT a new value, NOT a new family, NOT a 4th Primitive, NOT Parameter 38.
//    Vocabulary delta = 0; only WHICH families may carry the existing subordinate container changes.
// ⛔ The container stays OPTIONAL on every family. Absent / UNKNOWN / NOT_VISIBLE remain legal and the
//    engine keeps failing closed on them (order §19 / §27). It is never made mandatory here.
const DM_REALIZATION_ELIGIBLE_FAMILIES = DM_DESCRIPTORS.slice();
// ★ DM_M1_ELIGIBLE_FAMILIES above is retained as the FROZEN M1 CALIBRATION FACT (CEO-DM-M1-01) for
//   provenance and for the engine-side predicate. As of V1_3 it no longer gates the container.

// ── excluded[] reason classes — the frozen exclusion list of Contract 1 / 7, encoded ─────────
// ⛔ "functional" / "decorative" is NOT a legal exclusion reason: DM does not judge construction
//    purpose (Contract 6 / DA-26a).
const DM_EXCLUSION_REASONS = ["natural_material","single_base_colour","image_capture_condition"];
const DM_LINEAGE_SPECIFIC = "DM_SPECIFIC_OBSERVATION";

// ── DM OBSERVATION REQUIREDNESS (CEO 2026-09-09 · Requiredness Gate Correction) ─────────────
// ★ THE VERSION-SCOPED GOVERNED MECHANISM. This flag declares that THIS Producer line is
//   DM-enabled, so every governed target must carry a dm_designed_detail_evidence block.
// ★ Scoping is by CONSTRUCTION, not by inspection: the flag lives in the rules module that the
//   validator is bound to. The sealed Producer V1 and V1_1 do not define it, so `R.DM_OBSERVATION
//   _REQUIRED` is undefined there and their behaviour is untouched.
// ⛔ NOT a directory-name test, NOT a glob, NOT a "latest" lookup, NOT environment-dependent.
// ⛔ NOT a 38th parameter and NOT part of completeness: the 37-parameter completeness gate and the
//    DM observation requiredness gate are SEPARATE gates and are never summed.
const DM_OBSERVATION_REQUIRED = true;

const isDmDescriptor = d => DM_DESCRIPTORS.includes(d);
const isDmM1EligibleFamily = f => DM_M1_ELIGIBLE_FAMILIES.includes(f);
const isDmRealizationEligibleFamily = f => DM_REALIZATION_ELIGIBLE_FAMILIES.includes(f);
const dmPrimitiveDomain = p => DM_PRIMITIVES[p] || null;

module.exports = {
  CATEGORIES, PN, ALL_PARAMS, UNIVERSAL, GROUP_B, MANDATORY, CONDITIONAL, CONDITIONAL_TRIGGER,
  CONSTRUCTION_SUPPRESSION,
  EXPOSURE_REGION, EXPOSURE_DESIGNED_OPENING, EXPOSURE_EI_MAP, exposureClassOf,
  MULTI, OTHER_ENABLED, VALUE_DOMAINS, STATES, REGION, FORBIDDEN_LEGACY_SUBSTRINGS,
  LOCATION_ELIGIBLE, LOCATION_COMPONENTS, LOCATION_DESCRIPTORS, LOCATION_COMPONENT_CATEGORIES,
  COVERAGE, COVERAGE_ELIGIBLE, COVERAGE_CARRIER_FAMILIES, COVERAGE_EVIDENCE_MAP,
  POCKET_INSTANCE_LOCATIONS, POCKET_SCALAR_MORPHOLOGY,
  SCALAR_REALIZATION_COVERAGE_CARRIERS, isScalarRealizationCoverageCarrier,
  MOTIF_COMPLEXITY, MOTIF_COMPLEXITY_CARRIERS, isMotifComplexityCarrier, ADDITIONAL_COLOUR_CONTRAST,
  FINISH_REALIZATION, FINISH_REALIZATION_CARRIERS, isFinishRealizationCarrier,
  TREATED_SURFACE_REALIZATION, TREATED_SURFACE_REALIZATION_CARRIER_VALUES, isTreatedSurfaceRealizationEligible,
  PATTERN_VISUAL_DOMINANCE, PATTERN_VISUAL_DOMINANCE_CARRIERS, isPatternDominanceCarrier,
  PRODUCT_CONTEXT, PRODUCT_CONTEXT_CARRIERS, isProductContextCarrier,
  isLocationEligible, locationComponentAllowed, isCoverageEligible, isCoverageCarrierFamily, coverageEvidenceClass,
  domainFor, silhouetteDomain, lengthDomain, fitDomain, regionFor,
  applicableSet, operationalClass, completenessCounts,
  // ── DM designed detail observation layer (successor STMX_VISION_PRODUCER_V1_2) ──
  DM_DESCRIPTORS, DM_RELATIVE_SIZE, DM_CONTRAST, DM_SPATIAL_POSITION, DM_PRIMITIVES,
  DM_PRIMITIVE_NAMES, DM_PRIMITIVE_STATES, DM_M1_ELIGIBLE_FAMILIES, DM_M1_GRAPHIC_FAMILY,
  DM_M1_REALIZATION, DM_M1_REALIZATION_FIELDS, DM_M1_REALIZATION_STATES,
  DM_EXCLUSION_REASONS, DM_LINEAGE_SPECIFIC, DM_OBSERVATION_REQUIRED,
  isDmDescriptor, isDmM1EligibleFamily, dmPrimitiveDomain,
  // ── realization coverage correction (successor STMX_VISION_PRODUCER_V1_3 · DIRECTION-BSC-1) ──
  DM_REALIZATION_ELIGIBLE_FAMILIES, isDmRealizationEligibleFamily,
};
