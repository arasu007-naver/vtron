# STMX_FULL_LOOK_DM_BINARY_DIRECTION_CONSTITUTION_V3_1

> Consolidated text of the rules executed by `FL_DM_DIRECTION_CANDIDATE_V3_1` (release `FLDM_FINAL_V1`). Approved for freeze by the CEO 2026-10-29 (FCR-DM-1 Final Closure §0: runtime retained unchanged; H-ORN-1 rejected; Neutral prohibited). No rule differs from the runtime.

## 1. Object

DM judges whether the worn look realises meaningful Designed Detail. Not a count of details, accessories or garments; not colour contrast by itself; not an average of Item DM directions; not material, price or brand.

## 2. Binary contract

Every valid look → **DETAIL (D) | MINIMAL (M)**. Neutral · UNKNOWN · UNRESOLVED · EVIDENCE_REPAIR_REQUIRED are forbidden as final results. Partial or UNKNOWN Vision fields never block scoring and are never invented (STMX-2026-10-AEMS). A technically invalid input returns `INPUT_FAILURE` with no Direction.

## 3. Inputs

One frozen Full-Look Vision Evidence Packet (DM Vision Evidence Transport V2): SVP-001 `look_frame` · SVP-002 component identity · DMP-1 `look_components` · DMP-2 `look_detail_systems` · DMP-3 `dm_evidence_visibility`. Nothing else is read.

## 4. Rules

| id | effect | rule | authority |
|---|---|---|---|
| DM3-S0 | INPUT_FAILURE (no Direction) | packet absent / unparseable / not a Full-Look packet / no DM evidence block / DMP-3 not_adjudicable:{image_failure / not_a_worn_look} | STMX-2026-10-AEMS (input failures stay separate from style results) · DM Vision Freeze §10 / Stage 0 |
| DM3-MS1 | reading convention | an unobserved primitive (size / contrast / position / carrier identity) contributes nothing: a predicate is established only by OBSERVED values; nothing is written into the evidence | STMX-2026-10-AEMS (no fabrication; missingness never blocks) · FL SR MS-1 precedent (FLSR_FINAL_V1) |
| DM3-D1 | D | a designed system (family ≠ H) observed at look scale: size large, or position whole_look, or position distributed with size not small | CEO 2026-10-20 D definition (valid detail with enough visual impact) · DMSC2 V2 / V2-C FIELD (unchanged) |
| DM3-D2 | D | a styling colour composition (family H, relational_form composition) with extent (size not small) and clear separation (contrast high) — carriers may be accessories only | CEO 2026-10-20 (an accessory colour composition alone can drive D) · FCR-DM-1 order §5.2 · DM Vision Freeze §6 |
| DM3-D3 | D | a designed detail built into a worn garment (a carrier identity in the SVP-002 garment categories) that clearly separates (contrast high), below look scale | FCR-DM-1 order §5.4 (garment-integrated detail is distinguished from separately worn accessories) · CEO GT anchor (package D03 §4) · V2-C STRONG_GARMENT_POINT (unchanged) |
| DM31-D4 | D | a constructed-surface articulation system (family B) on a worn garment with observed size medium or large, at any contrast and any position — a recorded B system is, by the Vision contract, a visibly articulated designed surface (Freeze §5 B · §7 Q1: a surface that reads solid is not recorded), so its realization does not depend on colour separation; size small does not qualify (no Cable Knit = always D) | CEO GT decision CDM-GT-01 (2026-10-20): a pronounced dimensional designed surface is Detail and low colour contrast does not cancel it; a minimal bottom does not neutralise strong upper detail · frozen Item DM §3 lock (Contrast low ≠ evidence absent) · FCR-DM-1 order §5.2 / correction order §3 (a valid designed detail does not require high colour contrast) |
| DM3-M1 | M | no observed system establishes a D route (D1 · D2 · D3 · D4): every observed system is relational accent, or localized with small size or without clear separation (other than a garment B surface of medium+ extent), or an accessory-carried point — the observed primitives themselves show limited Whole-Look impact (not a default from missing fields) | STMX-2026-10-AEMS (best-supported Direction from delivered evidence; UNRESOLVED not a routine final result) · CEO 2026-10-20 D requires established impact · order §5.7 prohibited shortcuts (accessory present / metal hardware / small detail ≠ D) · CEO GT M anchors (package D03 §4) |

Evaluation: DM3-S0 first (input failure ends the run). Each observed system is checked independently against D1 · D2 · D3 · D4; any established route → D (a positive fact, no visibility gate). Otherwise DM3-M1 → M. No count, weight, spread or coverage across systems. Relational accents never decide alone.

## 5. Reason contract

`direction_reason` = Korean, names only observed systems (carrier + frozen family phrase); no look id, GT, number or score; unobserved parts are stated as not used, never as evidence. `rule_trace` lists the applied rule ids; `diagnostics` are non-scoring.

## 6. Known limitations

`GOVERNANCE/FLDM_V1_KNOWN_LIMITATION_REGISTER.md` (FLDM-LIM-001 F012 · FLDM-LIM-002 F472 · FLDM-HIST-001 F267).
