# STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5

Item EI V2 Direction + Korean Reason — **CANDIDATE R5** (isolated · not production · not frozen). R5 = R4 + the CEO 2026-10-28 FINAL Item scoring-unit constitution: a verified genuine **Suit — Jacket + Trouser (Pantsuit) or Jacket + Skirt (Skirt Suit)** is ONE Suit unit; every other product is scored from its **primary merchandise item only**; a bare MATCHING_PAIR request is refused. The core (decision table, Commercial Neutral, Score Continuity, Reason vocabulary, frozen bindings, input adapter) is byte-identical to R4. Predecessor R4 kept immutable.

| file | role |
|---|---|
| src/ei_v2_product_unit.js | scoring-unit selection (ITEM_PRODUCT: ITEM → primary target only · SUIT → Jacket + Trouser or Jacket + Skirt components) |
| src/ei_v2_engine.js | `evaluate(request, {commercialNeutral})` → `{direction, reason}`; selection first, then the unchanged core |
| src/ei_v2_historical_overlay.js + contracts/EI_V2_HISTORICAL_PRODUCT_IDENTITY_OVERLAY_V2.json | versioned historical product / evidence-association mapping (hash-verified; pair + garment records; superseded styling units) — regression data adapter, not scoring physics |
| other src / contracts | = R4 |
| tests/run_all.js | suite on the corrected product population + NS-00 … NS-21 · SS-01 … SS-07 · PI-01 … PI-03 · T-07 (`node tests/run_all.js`) |

Request: `{ scoring_unit_type: "ITEM_PRODUCT", product_identity: { merchandise_type: "ITEM", primary_target_id } | { merchandise_type: "SUIT", suit_component_target_ids: [jacket, trouser | skirt] }, targets: [{ target_id, record | input }] }` — or a single `GARMENT` request (unchanged).

⛔ Not a production engine. Frozen EI V1 stays the production authority. Final Freeze needs a separate CEO approval.
