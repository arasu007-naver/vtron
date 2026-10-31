# src/item_v2_r2 — STMX INTEGRATED ITEM SCORING RUNTIME V2 · R2 (Suit-capable) · CANDIDATE

> **Status:** CANDIDATE — not production · not frozen · not promoted. Identity record: `CODE_IDENTITY_SEAL_ITEM_V2_INTEGRATED_RUNTIME_V2_R2_CANDIDATE.json` (not a freeze).
> **Approval Anchor** — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION, TC/SR/DM VERSIONED SUCCESSORS, FOUR-AXIS INTEGRATION … verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_SUIT_CAPABLE_SUCCESSOR_IMPLEMENTATION_V1/AUTHORIZATION/CEO_ORDER_VERBATIM.md`). Reason: score a user- / merchandise-designated commercial Suit as ONE product with the CEO-approved TC / SR / DM Suit rules while every ordinary product keeps the frozen V2 path, and ask the user to pick the product when a multi-garment image is ambiguous. Affected Scope: this directory (new). `src/item_v2_r1/` and `src/item_v2/` are unchanged and pin-verified before reuse (G42 / G42-A Clean Engine forward path; no legacy runtime).

## Versioning

| layer | identity | relation |
|---|---|---|
| `src/item_v2/` | `STMX_INTEGRATED_ITEM_SCORING_RUNTIME_V2_CANDIDATE` · seal `519dacaa…` | frozen-V2 binding · evidence adapter · result composer — reused unchanged |
| `src/item_v2_r1/` | `…_V2_R1_CANDIDATE` · seal `6020ab57…` | input validation (+ product_title) · product selector — reused unchanged |
| `src/item_v2_r2/` (this) | `…_V2_R2_CANDIDATE` | Suit routing · Suit successor binding · selection request / resumption |

Named R2 (a revision of the Integrated V2 candidate line), not V3: it adds the CEO Suit route and changes no ordinary-product semantics.

## Routing

```text
input → R1 validate → R1 select (USER → MERCHANDISE → AUTOMATIC; Suit only from explicit input)
  UNRESOLVED → result PRODUCT_SELECTION_UNRESOLVED + selection_request (no axis executed)
  ITEM       → item_v2 adapter → item_v2 frozen-V2 binding: EI · TC · SR · DM            route ORDINARY_PRODUCT_FROZEN_V2
  SUIT       → EI: item_v2 binding (frozen EI V2 ITEM_PRODUCT Suit path, members' own Vision + own Colour V1)
               TC · SR · DM: item_v2_r2_suit_binding → sealed axis-owned Suit successors     route USER_DESIGNATED_SUIT
  → item_v2 result composer → four Directions + four Korean Reasons (an axis without a Direction is null and named in incomplete_axes)
```

Suit successors (registry `item_v2_r2_suit_registry.js`, each pinned by its seal aggregate; each verifies its own frozen parent):

| axis | successor | frozen parent | CEO rule |
|---|---|---|---|
| TC | `STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE` | ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28 | either member valid Departure → Transformative |
| SR | `STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE` | ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27 | Jacket realized silhouette governs |
| DM | `STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE` | ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28 | either member qualifying Detail → Detail |

## Selection request (ambiguous multi-garment image, no target)

`result_status: PRODUCT_SELECTION_UNRESOLVED` + `selection_request: { status: "TARGET_SELECTION_REQUIRED", image_id, ambiguity_classification, candidates: [{ target_id, category, descriptor, prominence }], resume }`. Resume by resubmitting the same input with `user_selection.product_identity` = `{ merchandise_type: "ITEM", primary_target_id }` or `{ merchandise_type: "SUIT", suit_component_target_ids: [jacket, bottom] }` (`resumeWithSelection(input, productIdentity)`). The request is an input-resolution step, never a Direction. Incomplete Vision evidence for an already selected product never triggers it.

## Commands

```bash
node tests/run_all.js
```

```bash
node item_v2_r2_cli.js input.json
```

```bash
node item_v2_r2_cli.js input.json --item target_2
```

```bash
node item_v2_r2_cli.js input.json --suit target_1,target_3
```

## Restore and rollback

- **Restore:** place this directory at `01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item_v2_r2/` beside the sealed `item_v2_r1/` and `item_v2/`, with the four frozen V2 authorities and the three Suit successors at their master-relative paths. `tests/run_all.js` must pass.
- **Rollback:** stop calling R2 (or remove this directory). `item_v2_r1` / `item_v2` keep working exactly as sealed (Suit TC / SR / DM then stay not supported); no frozen engine, pointer or production authority changes.

⚠ CANDIDATE integration vocabulary (Canonical Dictionary registration required before any freeze): `scoring_route` values, `selection_request` and its fields, `TARGET_SELECTION_REQUIRED`, plus the R1 names already flagged.
