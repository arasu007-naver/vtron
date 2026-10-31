# D01 — Final Release Manifest

> **Freeze ID:** `ITEM-V2-INTEGRATED-FINAL-FREEZE-V1-2026-10-29` · **Record:** `01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_V2_INTEGRATED_FINAL_FREEZE_AUTHORITY_V1.json` (sha256 `21750eb471d55dc1263f1338bbef43372e7d882ed56c0388313cfcbca66d3066`) · CEO order 2026-10-29 (sha256 `45d0d8e964b29db2…`)

```text
ITEM_V2_INTEGRATED_FINAL_FROZEN (ITEM-V2-INTEGRATED-FINAL-FREEZE-V1-2026-10-29)
FINAL_FROZEN_WITH_DOCUMENTED_KNOWN_LIMITATIONS
NOT_PROMOTED — STMX ITEM SCORING ENGINE V1 remains the production composition (no pointer change)
VISION_INVOCATION_CONFIG = OFFLINE_VERIFIED · NOT_LIVE_VERIFIED
G53 = FULLY ACTIVE · paid calls in this order 0
```

## Release composition (immutable bindings by path + hash)

| component | location | identity | treatment |
|---|---|---|---|
| Item Vision V1.3 | 01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/ | dir agg `10e31d399cb18728…` · prompt `aa6119bb338000cf…` | existing, unchanged |
| Vision invocation configuration | 04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_FINAL_CLOSURE_V1/_raw/live_q/STMX_ITEM_VISION_V1_3_INVOCATION_CONFIG_FQ_V2.json | `1e5f01c377af9bdc…` (Vision 16384 · colour 8192) | Order Q successor · OFFLINE_VERIFIED · NOT_LIVE_VERIFIED |
| Target-Aware Colour | 01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_COLOUR_TARGET_AWARE_V1_CANDIDATE/ | `8040f1bc277c1b16…` | sealed successor |
| Product Selection | src/item_v2 → item_v2_r1 → item_v2_r2 → item_v2_r3 | `519dacaa99ec…` · `6020ab57f324…` · `6d3d77722e25…` · `368ba72d67b0…` | sealed chain |
| Suit TC / SR / DM | STMX_{TC,SR,DM}_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE | `7bea12b478e3…` · `09807059fcf7…` · `65cd173afb34…` | sealed successors |
| Item EI V2 | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5/ | ITEM-EI-V2-FINAL-FREEZE-V1-2026-10-29 | frozen engine |
| Item TC V2 | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE/ | ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28 | frozen engine |
| Item SR V2 | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE/ | ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27 | frozen engine |
| Item DM V2 | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_V2_DIRECTION_REASON_CANDIDATE/ | ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28 | frozen engine |
| Integrated R4 | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item_v2_r4/ | `be96c77d987815f1…` | sealed runtime (entry) |

Dependency manifest: 259 files · aggregate `f2fdc4b1130e951c5677d2eca0b39d11ceb34a81ada1f417ed15b77da4d9ff51` (in the record).

## Evidence classes (kept separate)

- **OFFLINE REGRESSION PASS** — frozen V2 EI 81/81 · TC 163/163 · SR 86/86 · DM 67/67 · R4 26/26 · colour 17/17 · R3 31/31 · Suit 19/18/15 · capsules 7/7 · deterministic replay 5 / 5.
- **LIVE E2E COVERAGE** — Order P only: 7 images · 4 scored · 5 units · 13 / 18 comparable axes (72.2%) · no live run of the 16384 configuration.

## Rules

- The four axis engines stay independently frozen; R4 orchestrates — no fifth scorer, no cross-axis scoring.
- A Suit is scored only when each member holds its own contract-valid V1.3 record (IV2-LIM-02).
- ⛔ No rename / move / edit / delete of any bound component; reopen only by explicit CEO decision.
- Known limitations: `STMX_ITEM_V2_INTEGRATED_KNOWN_LIMITATION_REGISTER_V1.md`.
