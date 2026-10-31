# STMX Integrated Item Scoring Runtime V2 — CANDIDATE

**Status:** CANDIDATE — not production · not frozen · not backed up (CEO order 2026-10-29: implementation + regression only).
**Location:** a versioned successor inside the Clean Engine (G42 / G42-A). The V1 files in `src/item/`, `src/runtime/` and `src/layers/` are unchanged.
**Future backup folder name:** `05_INTEGRATED_ITEM_SCORING_RUNTIME_V2`. This is a name only, not an execution authority.

## What it does

The runtime takes one product input and returns, through `scoreItemV2(input)`, one Direction and one Korean Reason for each of EI, TC, SR and DM. It runs these steps in order:

1. **Product selection** (`item_v2_product_selector.js`), in this precedence: USER target, then MERCHANDISE metadata, then AUTOMATIC Primary fallback.
   - Suit status comes only from explicit input.
   - When the automatic fallback cannot decide, the result is flagged `AUTOMATIC_AMBIGUOUS` and the tie is broken by target order.
2. **Evidence routing** (`item_v2_evidence_adapter.js`):
   - The selected Vision V1.3 record goes to every axis unchanged.
   - EI also receives that target's own Colour V1 observation.
   - TC, SR and DM receive no colour.
3. **Four frozen engines** (`item_v2_axis_binding.js` + `item_v2_axis_registry.js`):
   - Each engine is pinned by its FINAL FREEZE record, and every frozen file and runtime dependency is checked.
   - There is no fallback to V1.
4. **Result** (`item_v2_result_composer.js`): `customer_output` holds `{ EI, TC, SR, DM }`, each with its exact frozen `direction` token and its own `reason`.
   - Selection trace, evidence coverage and diagnostics are kept separately in `internal`.

## What it does not do

- Style ID, Direction Code, numeric score, Strength, ordinal or a fifth scorer.
- Cross-axis use.
- Reading GT or the corpus.
- Live Vision or Colour calls.

## Known gap: Suits on TC, SR and DM

The frozen TC, SR and DM V2 engines each evaluate a single product record and have no whole-Suit entry. A user-designated Suit therefore returns EI only. TC, SR and DM come back as `SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS`, and the result status is `INCOMPLETE`. Closing this gap needs a separate CEO decision.

## Tests

Run `node tests/run_all.js [--json]`. The suite covers test families A–J; test F-03 is the open Suit gate. The suite writes nothing into the repository.
