# Full-Look Style Scoring Engine — Vision handover (from FLV-FINAL-FREEZE-V1-2026-10-17)

> Observations only. This document produces no score, direction, strength or Style ID.

## A. Vision input interface

- **Consume:** `packet.json`, contract `STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET` · version `V1_RC4`. One packet per image; only when `validation.json.ok === true` / `summary.status === "PACKET_VALID"`.
- **Schema of record:** `03_SCHEMAS_AND_AUTHORITIES/EVIDENCE_PACKET_SCHEMA_V1_RC4.json` (sha `2f1ee1ef015c0344…`). Block guide: `EVIDENCE_PACKET_CONTRACT.md`.
- **Parameter-keyed projection of the same evidence:** `run_record.json` (cells `SVP-xxx@cN`, `observed_state` / `observed_value`).
- **Inputs for this handover:** the 12 sample packets under `04_SAMPLES/expected_outputs/` — 78 components, 46 DM systems.

## B. Axis evidence mapping (approved inventory `consumer_axes`; status CEO_APPROVED_CANDIDATE)

| axis | parameters | look-level blocks |
|---|---|---|
| EI | SVP-002 component_identity · SVP-005 component_colour · SVP-006 colour_composition_standing · SVP-012 canonical_physical_exposure · SVP-101 grammar · SVP-102 trouser_distinction · SVP-121 pattern · SVP-122 graphic · SVP-123 surface · SVP-124 material · SVP-125 decorative_detail · SVP-126 attachment | colour_composition (field · points · partial · suppressed · unreadable) · canonical_exposure |
| TC | SVP-002 component_identity · SVP-004 as_worn_front_state · SVP-010 layer_relation · SVP-101 grammar · SVP-102 trouser_distinction · SVP-103 silhouette · SVP-104 fit · SVP-105 shoulder_structure · SVP-107 asymmetry · SVP-108 length · SVP-109 sleeve_volume · SVP-110 shoulder_span · SVP-111 closure_type · SVP-112 front_opening_extent · SVP-113 collar · SVP-114 sleeve · SVP-115 shoulder_connection · SVP-116 pocket · SVP-117 pocket_construction · SVP-118 pocket_projection · SVP-119 waist_definition · SVP-120 slit · SVP-123 surface · SVP-124 material · SVP-126 attachment | component_registry (identity · front state · footwear family) · relations.layer_relations |
| SR | SVP-007 final_upper_relation · SVP-008 final_shoulder_realization · SVP-009 final_upper_shape_behaviour · SVP-011 securing_constriction · SVP-106 shoulder_drop · SVP-119 waist_definition · SVP-123 surface · SVP-124 material | upper_realization (governing refs · relation · shoulder · shape) · relations.securing_relations |
| DM | DMP-1 look_components · DMP-2 look_detail_systems | dm_evidence (look_components · look_detail_systems verbatim · dm_evidence_visibility) — DM Evidence Transport V2; project to the frozen DM adapter only via the runtime (dm_transport_v2.toFrozenV1Block) when DMP-3 is OBSERVED |

Control parameters without an axis consumer: SVP-001 look_observability · SVP-003 identity_refinement · DMP-3 dm_evidence_visibility. Worked example per look: `04_SAMPLES/stages/<image>/4_axis_evidence_views.json`.

## C. Data availability — the frozen state vocabulary

- **Fact states (`contracts.js` STATES):** `OBSERVED` · `ABSENT` · `NOT_VISIBLE` · `UNKNOWN`.
- **OBSERVED** = a governed value was seen. A token `None` (e.g. asymmetry None) is OBSERVED.
- **ABSENT** = the carrier is visible and the phenomenon is not shown, for a fact without a None token. ABSENT is never fabricated (acceptance B-01).
- **NOT_VISIBLE** = the region is not in view (with a limitation such as OCCLUDED_BY_OTHER_GARMENT).
- **UNKNOWN** = in view but not settleable, or not emitted by the model. It is never ABSENT.
- **Conditionally inapplicable:** NOT_APPLICABLE is a request return of the frozen Item applicability and is never stored. A fact whose axis requester does not ask for it on a component (AXIS-DEMAND-CONDITIONAL) is not in the pool. Example: shoulder_drop is requested only for the SR governing upper component.
- **Colour:** `partial[]` keeps an unresolved lightness / effect / contrast explicitly (`unresolved`); `suppressed[]` lists Colour V1 suppressions; `unreadable[]` carries NOT_VISIBLE / UNKNOWN colour.
- **DM:** `dm_evidence_visibility` is OBSERVED (derived from the frame) or UNKNOWN; the system list is OBSERVED-ONLY, so `[]` ≠ "no designed detail".
- **Observed distribution over the 12 samples (run_record cells):** OBSERVED 745 · UNKNOWN 99 · NOT_VISIBLE 69 · ABSENT 315.

## D. Frozen dependencies to preserve during Scoring Engine development

| role | path | sha256 |
|---|---|---|
| Item Scoring Engine V1 manifest (four-axis production composition) | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_SCORING_ENGINE_V1_MANIFEST.json` | `f2ab2178eded07d3…` |
| Item Scoring Engine V1 Final Freeze | `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_ITEM_SCORING_ENGINE_V1_FINAL_FREEZE.md` | `6adf2a84e9e50c84…` |
| EI production authority | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_ENGINE_PRODUCTION_AUTHORITY_V1.json` | `0623735875f697e5…` |
| TC production authority | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_PRODUCTION_AUTHORITY_V1.json` | `5b237300e9fc5b99…` |
| TC Final Freeze | `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_TC_ENGINE_FINAL_FREEZE_V1.md` | `839d0a4faf70294e…` |
| SR production authority | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json` | `6a670aa417c96923…` |
| DM production authority | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_PRODUCTION_AUTHORITY_V1.json` | `32f7d256e86749c4…` |
| TC Step 2 frozen predicates (read by the TC product-departure witness) | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V4_CANDIDATE/src/step2_semantic_successor_v4.js` | `868850fdc40221c4…` |
| Colour V1 contract (bundled) | `01_ENGINES/ITEM_VISION_EXTRACTOR/run/color_recovery/color_contract_v1.js` | `ccda8495fcf202da…` |
| Item Vision V1_3 rules (bundled) | `01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/producer_rules_v1.js` | `c22e59140deecb7e…` |
| Full-Look DM Vision Final Freeze V1 (bundled) | `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EXTRACTION_FINAL_FREEZE_V1.md` | `49e513ea1c2ad036…` |
| DM Evidence Transport V2 (bundled) | `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md` | `2e6bd0c7391c4425…` |
| Canonical Dictionary | `02_DATABASE_AND_CORPUS/CANONICAL_CORPUS/STMX_CANONICAL_MASTER_PACK/00_MASTER/Canonical/STMX_CANONICAL_DICTIONARY.md` | `28fdebb1b8ac58a3…` |
| Approved Full-Look Direction rules + CEO decisions (Context 01) | `00_STMX_CHATGPT_PROJECT_CONTEXT/01_STMX_FROZEN_DECISIONS.md` | `63c01ec6b79c66fa…` |

## E. Scope of the next sprint

- The next sprint designs and implements Full-Look Style Scoring logic that consumes these frozen packets.
- Approved Full-Look Direction rules (CEO 2026-10-06; DE-1 … DE-5; FD-EI-1 / 2 / 3) are in Context 01.
- Still undecided, for the CEO, not for Vision: the SR Full-Look direction rule (CD-SR / FD-SR-1) · the EI look-base rule (CD-EI (d)) · exposure validity (FD-EI-4 (iii)) · TC RULED_OUT (FD-TC-P2).
- ⛔ The Vision Extractor must not be modified opportunistically during Scoring Engine work. A genuine Vision contract defect requires a separate governed reopening (CEO decision, Approval Anchor, new release identity).
- Known non-blocking observation limitations: `KNOWN_LIMITATIONS.md`.
