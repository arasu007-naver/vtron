# STMX Clean Engine — Repository Manifest

> **System Scope:** STMX End-to-End Analysis System — `Vision → Observation → Canonical → Derived → Projection → Knowledge → Interaction → Governance → Decision → Output`.
> Pointer-centric — points to Source of Truth, does not duplicate documents.

| Field | Value |
|---|---|
| **Architecture Version** | `CLEAN_ARCHITECTURE_FREEZE_V1_0` (FROZEN) |
| **Migration Phase** | Sprint 1 — Skeleton |
| **Root** | `STMX_CLEAN_ENGINE/` (rename to STMX_ANALYSIS_SYSTEM deferred — Governance decision) |

## Package Map (Runtime, single direction)
`Image → ObservationPackage → CanonicalPackage → DerivedPackage → ProjectionContext → ApplicableKnowledgeSet → InteractionContext → DecisionPackage → OutputPackage`

## Layer Ownership
| Layer | Owns | Code |
|---|---|---|
| L1 | Observation | `04.../layers/l1_observation.js` |
| L2 | Canonical Identity | `l2_canonical.js` |
| L3 | Derivation Identity | `l3_derived.js` |
| L4 | Projection Profile | `l4_projection.js` |
| L5 | Knowledge Unit | `l5_knowledge.js` |
| L6 | Cross-axis Declaration | `l6_interaction.js` |
| L7 | Governance/Score/Decision | `l7_governance_scoring.js` |
| L8 | Output assembly | `l8_output.js` |

## Domain Pointers
- **Vision:** `11_VISION_EXTRACTION` · `12_VISION_RUNTIME` · `13_VISION_VALIDATION` · `14_VISION_REGRESSION` (pointer scaffold; assets in project root, unchanged).
- **Engine code:** `04_CLEAN_ENGINE_CODE/` (skeleton).
- **Shadow:** `06_SHADOW_VALIDATION/` · **Regression:** `07_REGRESSION/`.
- **Output boundary:** L8 (`08_OUTPUT_CONTRACT` — schema NOT authored).
- **Legacy oracle:** `03_LEGACY_ORACLE/` (READ ONLY).

## Frozen Documents (Architecture V1.0)
L1 Reference · L2 Constitution+Reference · L3 Constitution+Reference · L4 Constitution+Reference · L5 Constitution+Reference(Structure) · L6 Constitution+Reference · L7 Constitution · L8 Constitution · Runtime Execution Contract · Final Freeze Report V1.0. *(SoT in project root `STMX_CLEAN_*` files.)*

## Draft Documents
Language Architecture · Migration Constitution/Blueprint · Sprint 1 Spec/Completion · Vision→L1 Contract Draft · Repository Addendum.

## Missing Contracts
Vision→L1 (spec draft exists, not frozen) · Vision Runtime/Package/API · L8 Output Schema · L7 Governance Reference (values) · Vision Regression Guide.

## Implementation Status
**L1 Observation: FROZEN (real)** · **L2 Universal Canonical: real (Sprint 3)** · L3~L8: skeleton (NOT_IMPLEMENTED).
No scoring/governance. Legacy not wired (Shadow = field-level). Tests: Contract 10 + L1 17 + L2 22 (+ runtime).
CEO validates via `RUN_SKELETON_TEST.bat` (Node). Migration Phase: Vision→L1(frozen)→L2(real)→L3(skeleton).

## Prohibited Changes
Frozen Architecture · Vision Prompt · Production/Legacy engine · scoring rules · Canonical vocabulary · Root rename · large file move/rename.

> **Clarification (CEO 2026-09-23 · V2.3.46 · Blueprint Deliverable 3a / G42-A):** "Prohibited Changes: Frozen Architecture" — a CEO-approved controlled amendment (Blueprint Deliverable 3a) is the lawful change path. Approved additions: the L7-owned axis-runtime binding (`04_CLEAN_ENGINE_CODE/src/layers/l7_axis_runtime_binding.js`), the runtime contract registry (`04_CLEAN_ENGINE_CODE/src/runtime/axis_binding_contracts.js`) and the `axis_results` container in the L7 Decision Package.
