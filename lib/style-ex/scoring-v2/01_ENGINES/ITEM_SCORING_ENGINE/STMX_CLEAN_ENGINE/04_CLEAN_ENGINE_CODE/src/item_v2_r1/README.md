# STMX Integrated Item Scoring Runtime V2 — R1 (Primary Selector correction) — CANDIDATE

**Status:** CANDIDATE. Not production, not frozen, not backed up (CEO order 2026-10-29: Primary selector correction and regression only).

**Relationship:** this is a versioned successor of `src/item_v2/` (seal `519dacaa…`), which stays unchanged.
- R1 replaces **only the product-selection step**.
- It loads the predecessor's input validation, evidence adapter, four-axis binding and result composer **only after** `item_v2_r1_predecessor_pin.js` has verified the predecessor seal. If verification fails, R1 fails closed.

## Selection (order §2 Rules 1–4)

Selection follows this precedence: USER, then MERCHANDISE, then AUTOMATIC.

**USER and MERCHANDISE:** explicit target ids and Suit members behave as in the predecessor.

**Declared category:**
- A category that matches exactly one candidate selects that candidate.
- If several candidates match, the product title is tried first, then presentation within the category.
- If neither separates them, the result is `UNRESOLVED_WITHIN_DECLARED_CATEGORY`.

**`merchandise_metadata.product_title`** (new, CANDIDATE vocabulary):
1. If the title names the Vision category of exactly one candidate (whole word, optional plural, longest category name first), that candidate is selected.
2. Otherwise, the candidate whose own Vision `descriptor` shares strictly the most words with the title is selected.
3. Otherwise, the title does not discriminate, and selection passes to AUTOMATIC. This is noted in the trace.

**AUTOMATIC:**
- If there is exactly one candidate, it is selected.
- If every candidate reports a Vision `prominence` and exactly one holds the highest value, that candidate is selected.
- Otherwise the result is `PRODUCT_SELECTION_UNRESOLVED`. It is classified as one of:
  - `UNRESOLVED_EQUAL_PRESENTATION`
  - `UNRESOLVED_NO_PRESENTATION_EVIDENCE`
  - `UNRESOLVED_PARTIAL_PRESENTATION_EVIDENCE`
- An unresolved result executes no axis.

**Never used for selection:** target order, role, field completeness, REF, folder or file name, GT, category preference, synonym tables, or Suit inference.

## Trace (internal only, order §5.3)

`internal.selection_trace` carries:
- `selection_source`
- `candidate_garments`
- `selected_primary_target`
- `source_evidence_used`
- `excluded_styling_targets`
- `ambiguity_classification`
- `selection_decision_basis`
- `product_identity_validation`

None of these fields appear in `customer_output`.

## Unchanged

- The four frozen engines and Directions / Reasons.
- Colour ownership.
- Commercial Neutral.
- The output contract. The only addition is one result status, `PRODUCT_SELECTION_UNRESOLVED`.
- Suit: EI only. TC, SR and DM return `SUIT_NOT_SUPPORTED_BY_FROZEN_AXIS` until a separately authorized Suit implementation.

## Tests

Run `node tests/run_all.js [--json]`.
- Z-03 is the open Suit gate and is expected to fail.
- Labels in `tests/_labels.js` are used for evaluation only.
