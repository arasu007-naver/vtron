# STMX_TC_STEP3_ARCHITECTURE_SUCCESSOR_V2_CANDIDATE

**Status:** CANDIDATE · SHADOW · NOT FROZEN · NOT PRODUCTION.
**Order:** STMX TC MAINLINE V2.3.66 (CEO D-65 APPROVED — Option C). **Predecessor:** `STMX_TC_STEP3_ARCHITECTURE_FROZEN_BASELINE_V1` (FINAL FROZEN 2026-09-21, aggregate `2d7ec641…`) — byte-identical, never edited.

## What it is
A versioned successor of the Step 3 information contract (`STEP3_SUCCESSOR_V2_CONTRACT.json`) and its **category-general** Grammar State successor resolver (`src/step3_grammar_state_successor_v2.js`).
- R-GS-1 … R-GS-9 are carried verbatim (text and frozen per-unit evaluation).
- ONE candidate rule, **R-GS-OP**, is evaluated on the COMPLETED Grammar Transformation process record immediately before R-GS-6 / R-GS-5; R-GS-5 text is unchanged (residual).
- The resolver never inspects a garment key, category, grammar, organizing-relation identity, channel literal or scoring-unit identity; category-specific Reference reasoning is resolved upstream in the process.

## Consumer
`STMX_TC_STEP4_SEMANTIC_CARRIER_RUNTIME_V3_4_CANDIDATE` (hash-bound). Output is SHADOW only.
