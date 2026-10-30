# STMX FULL-LOOK DM VISION EXTRACTION — FINAL FREEZE V1

> **Status:** `FULL_LOOK_DM_VISION_EXTRACTION_COMPLETE_AND_CLOSED_AND_FROZEN` · CEO 2026-09-29 · installed by `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_DM_GOVERNANCE_REPIN_AND_FINAL_FREEZE_EXECUTION_V1/`. Manifest: `STMX_FULL_LOOK_DM_VISION_EXTRACTION_FINAL_FREEZE_V1_MANIFEST.json` (same folder).
>
> **The freeze applies ONLY to:** the Full-Look DM Vision Evidence + Extraction Parameter Architecture.
>
> **It does NOT apply to:** a Full-Look DM Scoring Engine, which is **not built** and therefore not frozen. There are no Minimal / Neutral / Detailed rules, no Direction or Strength rules, no thresholds, weights or formulas, no DM1–DM9 mapping, and no cross-axis merged Style Vision Extractor. Style Vision Extraction as a whole is **not** complete (EI and TC Full-Look work has not started).
>
> **Canonical vocabulary:** Canonical Dictionary **V1.11**, DM Layer, "Full-Look DM Vision Extraction — Canonical Vocabulary". **Reopen:** CEO `DM VISION REOPEN DECISION` only (§15).

## 1. Scope

This document is the canonical authority for **what visual information a Full-Look DM Vision extractor preserves from a completed look**, and how that information is represented.
- It is **Vision-level** only.
- It is the sole current authority for Full-Look DM Vision. The V1 / V2 / V3 / V4 study packages and the final closure package are **historical research and candidates** (§16).

## 2. Purpose and firewall

> **Full-Look DM Vision Extraction preserves visible Designed Detail information in the completed Full Look.** It does not infer Detail from object category, material name, manufacturing / process name, accessory presence, raw counts, or another STMX axis.
>
> **The extractor records evidence. It does not decide the final DM score.**

## 3. Approved parameter architecture (three parameters)

| ID | Parameter | Canonical meaning |
|---|---|---|
| **VP-DM4-00** | `look_components` | a lean **carrier registry**: only the components that carry one or more recorded Full-Look DM Detail Systems. **Not** an outfit inventory, garment count, accessory count, complexity count, or evidence by presence. |
| **VP-DM4-01** | `look_detail_systems` | the observable qualifying DM Detail Systems present in the completed Full Look, preserved **without scoring** |
| **VP-DM4-C1** | `dm_evidence_visibility` | a fail-closed control: whether the required DM visual evidence is sufficiently observable. **Not** a DM score or detail signal. |

### Schema

```
look_components: [ { component_ref, item_record_ref? } ]

look_detail_systems: [                                    // [] = positive "no designed detail"
  { carrier_refs: [component_ref, …],                     // 1..n
    look_detail_family: A | B | C | D | E | F | G | H | I | J,
    relational_form?: accent | composition,               // family H only
    size_in_look:     { state, value },                   // value ∈ Item DM Relative Size domain (small · medium · large)
    contrast_in_look: { state, value },                   // value ∈ Item DM Contrast domain (low · medium · high)
    position_in_look: { state, value },                   // THIS system only; value ∈ Item DM Spatial Position domain (localized · distributed) or whole_look
    repeated_units:   yes | no,
    item_evidence_refs?: [ … ] } ]

dm_evidence_visibility:
    adjudicable
  | partially_observable:{ feet_not_visible | lower_body_cropped | small_detail_unresolvable | occlusion }
  | not_adjudicable:{ crop | occlusion | image_failure | not_a_worn_look }

state ∈ OBSERVED | NOT_VISIBLE | UNKNOWN                   // frozen Item DM states (reused, not re-registered)
```

### CEO-approved normalizations and their semantic boundaries (CEO 2026-09-29)

| Canonical term | Former candidate | Meaning | It is NOT |
|---|---|---|---|
| `look_detail_family` | `family` (V3 / V4) | an organizational classification of **one** Full-Look DM Detail System | Item DM `evidence_family` (a different value set and role) · an independent score · an evidence count · a weighting bucket |
| `whole_look` (value of `position_in_look`) | "<whole-look value>" placeholder | used only when **one** Detail System itself operates across the whole completed look rather than a localized position. It describes **only** the Spatial Position / extent of that one qualifying Detail System. | multiple Detail Systems are distributed · detail is spread · occupied body-zone count · coverage score · concentration / distribution judgment · more Detailed |

## 4. Detail System definition

A **Detail System** is **one observable designed visual phenomenon** in the completed Full Look that qualifies under §5–§8. It may be:
- **intrinsic** to a garment or component;
- **carried by an accessory**;
- **created relationally** by Full-Look styling;
- **carried by more than one component**, where it is genuinely one visual phenomenon.

It is **not** defined by raw object count, by a fashion-category label, or by any downstream DM score.

## 5. Canonical evidence taxonomy (`look_detail_family`)

The taxonomy is **organisational classification**, not a scoring bucket (§11).

| Code | Canonical name | Covers (visible realization only) | Not sufficient by itself |
|---|---|---|---|
| **A** | Applied Surface Detail | print, stripe, check, motif, graphic, lettering, a logo functioning visually as Detail, a garment-intrinsic colour patch / block, a **visible designed result** of washing / dyeing / fading / distressing / bleaching (pattern, marking, gradient), comparable applied surface treatment / marking | a process name |
| **B** | Material / Constructed Surface Detail | pronounced cable, visible jacquard / woven motif, lace, mesh / net structure, openwork, crochet, visible patterned embossing, pronounced rib / wale, other genuinely visible non-solid surface articulation | material identity; fine texture that reads solid |
| **C** | Hardware / Component Detail | visually significant button systems, zips, buckles, metal fittings, closures, comparable components | ordinary component presence |
| **D** | Trim / Finishing Detail | contrast stitching, piping, edge treatment, tipping, decorative finishing | ordinary seams |
| **E** | Embellishment Detail | sequins, crystals, embroidery, fringe, beads, comparable embellishment | — |
| **F** | 3D Decorative Construction | ruffle, jabot, tier, sash, bow, comparable **added** decorative construction | whole-form / silhouette departure |
| **G** | Accessory-Carried Detail | an accessory that carries valid A–F Detail evidence | accessory presence |
| **H** | Styling-Created Relational Detail | Point / Accent (chromatic), Tonal / Achromatic Accent, Colour Blocking, Styling Colour Composition — where the relation **actually functions visually** in the completed look | bright colour, colour difference, matching, coordination, repetition, absolute hue |
| **I** | Visually Articulated Functional Construction | functional construction (pockets, utility systems) that becomes a visible designed detail | ordinary pockets / functional construction |
| **J** | Visible Mixed-Surface / Mixed-Material Division | a visibly designed material division; surface contrast; a **matte / gloss** designed division; a **transparent / opaque** designed panel / division | gloss, sheen, transparency itself |

## 6. Relational evidence rules (family H)

- **Condition.** A component or component relationship qualifies only when it **functions as a visually distinct Point / Accent, or as a designed Colour Composition, within the completed Full Look.**
- **Achromatic accents count.** The concept is **not** defined by hue: black, white and grey can be accents.
- **Contextual.** The same item or colour may qualify in one look and not in another. A colour **absorbed** into the surrounding look is not recorded; absence is the record.
- **`relational_form`:** `accent` (Point / Tonal Accent) or `composition` (Colour Blocking / Styling Colour Composition).
- **Multi-carrier accents.** Pieces that together act as one accent form **one** system with several carriers. Their mutual matching is not a separate system.
- **Never standalone DM evidence:** bright colour · colour difference · matching · colour echo · tonal matching · coordination.

## 7. Surface evidence rules

**Principle:** material / process identity vs visible realization.

- Rib, corduroy, velvet, satin, gloss, transparency and "washed" are **not** Detail by name.
- Visible **articulation**, **motif**, **pattern**, **marking**, **designed division**, **surface contrast** or **designed treatment result** may qualify.

| Rule | Content |
|---|---|
| **Q1** | Articulation is judged visually. A surface that reads solid is not recorded. |
| **Q2** | Gloss / sheen is never Detail. A designed matte / gloss division is (J). |
| **Q4** | Transparency, translucency and sheer degree are never Detail. Structure within a transparent fabric (lace, mesh, openwork, crochet, motif) may be (B / A). |
| **B-1** | Where transparent / semi-transparent and opaque surfaces **intentionally** create a clearly visible designed surface contrast / panel / division, **the Detail is the designed division, not the transparency** (J). There is no transparency parameter. |
| **B-2** | Washing, dyeing, fading, distressing, bleaching and comparable process identities are **not** Detail by process name. When their **visible result** forms a designed pattern, marking, gradient or articulation, that result may be recorded as Applied Surface Detail (A). There is no separate family and no process parameter. |

## 8. Negative boundaries

**Rule.** None of the following is DM Detail by itself, and none creates a system or a field. A separate valid phenomenon on the same look is still recorded under its own family.

| Group | Excluded by itself |
|---|---|
| surface / material | gloss · sheen · material richness · velvet identity · satin identity · patent shine · ordinary leather grain · visually solid fine texture |
| transparency / exposure | transparency · translucency · sheer degree · skin visible through transparency · exposure · cut-out · slit |
| form | silhouette departure · asymmetry · unusual volume · high-low form |
| construction | ordinary construction · ordinary button / seam / zip / pocket |
| layering and counts | layering · layer count · raw counts (garment / accessory / material / colour / pattern) · accessory presence / count |
| colour relations | ordinary colour difference · matching / coordination · repetition by itself |
| arrangement | cross-system distribution / concentration / spread / coverage / occupied-zone count |
| process | manufacturing / process identity (washed, dyed, faded, distressed, bleached) |
| body | body, make-up, hair, skin |

The full register with coexistence conditions: closure package `03_FINAL_NEGATIVE_BOUNDARY_REGISTER.md`.

## 9. Item Vision reuse boundary

- **Frozen Item DM, Item Vision V1_3 and Item Scoring V1 are unchanged.**
- **Reused:**
  - Item DM admission and individuation rules;
  - primitive value domains and states;
  - intrinsic garment detail identity as lineage (`item_record_ref`, `item_evidence_refs`).
- **Full-Look-new:**
  - accessory-carried detail outside Item Vision scope;
  - relational Point / Tonal Accent;
  - styling-created Colour Blocking / Composition;
  - multi-carrier Detail Systems;
  - look-relative interpretation of primitives;
  - Full-Look DM evidence visibility.
- **Colour V1 remains EI-owned** (frozen decision P3-D-1). DM relational colour evidence does not migrate ownership.

## 10. Visibility / fail-closed

- Unresolvable values are `NOT_VISIBLE` / `UNKNOWN`. Unadjudicable looks are recorded in `dm_evidence_visibility`.
- **Missing detail is never inferred.**
- **Insufficient visibility never becomes Minimal.**

## 11. Duplication firewall (Q11)

- **Classification is not counting.** The evidence family is a classification, not an independent evidence count.
- **No duplication.** One visual phenomenon must not become several Detail Systems because several family labels could describe it. A decorative buckle is **one** system.
- **No erasure.** Genuinely distinct phenomena remain separately representable, e.g. a ruffle + contrast piping on it.

## 12. Repeated-unit firewall

`repeated_units` indicates **only** whether one Detail System is visibly instantiated as repeated identical units (one contrast button vs a row of contrast buttons). It is **not**:
- a unit count;
- a Detail System count;
- a DM score;
- an accumulation, coverage or distribution measure.

No numeric count exists.

## 13. No-scoring firewall

This authority defines **no** score, rule, threshold, weight, formula, Direction or Strength logic, DM1–DM9 mapping, or feature-count scoring.

- **Spatial position.** `position_in_look` describes **one** system's own deployment. It must never be aggregated across systems into a concentration / distribution / spread / coverage / zone-count signal (Q5). `whole_look` follows the CEO firewall in §3.
- **Weak points.** Weak but real designed points are preserved individually. How several of them combine is a **downstream scoring question**.

## 14. Cross-axis boundary notes (deferred to the SR → DM → EI → TC merge phase; not solved here)

- Relational colour vs Colour V1 (EI-owned).
- A shared component list with SR (VP-SR-01).
- Visibility controls shared with SR.
- Surface phenomena excluded from DM that EI may define for itself.

## 15. CEO Approval Anchor

```
Approval Anchor

CEO Decision: 2026-09-29
Reason:       CEO approves closure of the Full-Look DM Vision Extraction workstream (Full-Look DM Vision Evidence
              Architecture + Vision Extraction Parameter Architecture) after Q1–Q12, B-1, B-2, the final
              minimum-sufficient review, the targeted confirmation audit and final QA (closure package status
              FULL_LOOK_DM_VISION_EXTRACTION_READY_FOR_CEO_CLOSURE). Not approved: any Full-Look DM Scoring Engine,
              scoring rules, Direction / Strength rules, thresholds, weights, formulas, DM1–DM9 mapping, or a
              cross-axis merged Style Vision Extractor.
Affected Scope: this authority; Canonical Dictionary DM Layer (Full-Look DM Vision vocabulary); Project Context.
```

```
Approval Anchor

CEO Decision: 2026-09-29
Reason:       STMX FULL-LOOK DM — GOVERNANCE DEPENDENCY RE-PIN, VOCABULARY REGISTRATION & FINAL FREEZE
              EXECUTION V1: Option 1 (governance-only dependency re-pin of the frozen Item Scoring Engine V1);
              normalizations family → look_detail_family and whole-look value → whole_look (with the §3 firewall);
              installation of this authority; Architecture Guard G65; status COMPLETE_AND_CLOSED_AND_FROZEN.
Affected Scope: this authority + its manifest; Canonical Dictionary V1.11; Item Scoring Engine V1 governance
              dependency pins (record: STMX_ITEM_SCORING_ENGINE_V1_GOVERNANCE_DEPENDENCY_REPIN_RECORD_V1.json);
              08_STMX_ARCHITECTURE_GUARD.md (G65); Project Context.
```

### CEO decision index (all in force; carried by this authority)

| Decision | Content | Where |
|---|---|---|
| Q1 | visible articulation, not rib / corduroy identity | §7 |
| Q2 | gloss is not Detail; a designed surface contrast / division may be (extended by B-1) | §7 · J |
| Q3 | added 3D decoration may be DM; form departure is not | §5 F · §8 form |
| Q4 | transparency is never Detail; structured surface may be; no transparency parameter | §7 |
| Q5 | cross-system distribution: `NOT_REQUIRED` | §13 · §8 arrangement |
| Q6 | achromatic Point / Tonal Accent | §6 |
| Q7 | ordinary different colours ≠ composition | §6 · §8 colour relations |
| Q8 | ordinary construction is not Detail | §5 I · §8 construction |
| Q9 | repetition / matching: `REJECTED_AS_SEPARATE_DM_PHENOMENON` | §6 · §12 |
| Q10 | vocabulary deferred until closure approval → now registered (Dictionary V1.11) | header · §3 |
| Q11 | families are not counting buckets; no duplication, no erasure | §11 |
| Q12 | an accent only when it actually functions; absorbed ≠ accent | §6 |
| B-1 | transparent / opaque designed division = J; the Detail is the division, not the transparency | §7 · §5 J |
| B-2 | process identity is not Detail; its visible designed result may be A | §7 · §5 A |

**Reopen rule.** Any future semantic modification to the frozen Full-Look DM Vision architecture requires an explicit CEO **DM VISION REOPEN DECISION** (reason · affected authority · migration plan · regression plan). Normal implementation may not silently change:
- parameters;
- field semantics;
- evidence taxonomy;
- positive / negative boundaries;
- relational colour rules;
- surface rules;
- the Item / Style boundary;
- visibility / fail-closed rules.

## 16. Provenance

| Stage | Package (`04_GOVERNANCE_AND_FINAL_DOCS/…`) | Status |
|---|---|---|
| V1 study | `STMX_FULL_LOOK_DM_ARCHITECTURE_STUDY_V1` | historical research |
| V2 (CEO definition) | `STMX_FULL_LOOK_DM_ARCHITECTURE_V2_CEO_DEFINITION_INTEGRATION` | historical candidate (superseded) |
| V3 (CEO decisions) | `STMX_FULL_LOOK_DM_VISION_EXTRACTION_V3_CEO_DECISIONS` | historical candidate (superseded) |
| V4 (Q1–Q12) | `STMX_FULL_LOOK_DM_VISION_EXTRACTION_V4_CLOSURE_CANDIDATE` | historical candidate (superseded) |
| Final (B-1 / B-2) | `STMX_FULL_LOOK_DM_VISION_EXTRACTION_FINAL_CLOSURE` | closure package approved by the CEO; its content is carried by this authority |
| Execution (blocked) | `STMX_FULL_LOOK_DM_VISION_CLOSURE_EXECUTION_V1` | closure recorded; freeze blocked on the Item Scoring Engine V1 Dictionary pin; staged artefacts |
| Execution (final) | `STMX_FULL_LOOK_DM_GOVERNANCE_REPIN_AND_FINAL_FREEZE_EXECUTION_V1` | Dictionary V1.11 applied · governance-only dependency re-pin · this authority installed · G65 · frozen |
