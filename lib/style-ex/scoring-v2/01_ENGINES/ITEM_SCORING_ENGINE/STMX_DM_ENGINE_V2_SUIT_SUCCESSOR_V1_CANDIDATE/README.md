# STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1 — DM V2 SUIT SUCCESSOR (CANDIDATE)

> **Status:** CANDIDATE — not production · not frozen · not promoted. Identity record: `CODE_IDENTITY_SEAL_STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE.json` (not a freeze).
> **Approval Anchor** — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_SUIT_CAPABLE_SUCCESSOR_IMPLEMENTATION_V1/AUTHORIZATION/CEO_ORDER_VERBATIM.md`). Reason: implement the CEO-approved DM Suit rule as an axis-owned, versioned successor of the frozen DM V2 engine. Affected Scope: this directory (new); the frozen parent is never written.

## 1. Frozen parent authority

| field | value |
|---|---|
| freeze id | `ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28` |
| freeze record | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_DM_V2_FINAL_FREEZE_AUTHORITY_V1.json` |
| freeze record sha256 | `308059d62e2b3bf8e460cef14bf275781a384fc92c589e2bf0d76ca005ecebab` |
| frozen directory | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_V2_DIRECTION_REASON_CANDIDATE/` |
| src aggregate | `89a90a0e66fb80a45c7909b11bca10757ec8389c9b9285f3709d1cfc2fcc130e` |

Relationship: **successor, not a replacement.** The frozen DM V2 engine keeps scoring every ordinary product exactly as frozen (it is untouched and still bound by the Integrated V2 runtimes). This successor is called **only** for a valid commercial Suit (Jacket + Trouser or Jacket + Skirt) declared by the user or authoritative merchandise input. `src/dm_v2_suit_parent_pin.js` verifies the freeze record, every frozen directory file and every pinned runtime dependency before any frozen module is loaded (fail closed: `PARENT_*`).

## 2. CEO Suit rule (binding, not reopened)

Any sufficient qualifying Designed Detail (Point / System) under the frozen Item DM rules in either Suit member makes the entire Suit Detail (CEO 2026-10-29 §0.1 · §6.1).

| Jacket | Bottom | Suit |
|---|---|---|
| D | D | D |
| D | M | D |
| M | D | D |
| M | M | M |

## 3. Implementation

- Each member's OWN governed `dm_designed_detail_evidence` block → the frozen DM V2 `evaluate()` (frozen admission + qualification; "one qualifying system suffices"; set membership only).
- Detail ⇔ some member is Detail on a qualifying system (DM-V2-D1 / D2); otherwise Minimal over the assessed members. Blocks are never merged, copied or re-read across members (no detail counted twice, none invented from the combination).
- Functional buttons · natural sheen (Guard 08 DA-14) · accessories are governed upstream (Vision V1.3 admission → `excluded`) and by the frozen qualification; this successor adds no element rule and never reads `excluded`. Styling garments are never members.

## 4. Input / output contract

- Input = the EI V2 ITEM_PRODUCT Suit packet: `{ scoring_unit_type: "ITEM_PRODUCT", product_identity: { merchandise_type: "SUIT", suit_component_target_ids: [a, b] }, targets: [{ target_id: a, record }, { target_id: b, record }] }` — each record the member's own Item Vision V1.3 record, unmodified. Exactly one Jacket + one Trouser or Skirt; anything else → `CONTRACT_ERROR`.
- Output (valid) = `{ ok: true, direction, customer: { direction, reason }, suit_trace }` — exact frozen tokens; `suit_trace` is internal (member results, provenance, limitations), never customer-facing.
- Output (invalid) = `{ ok: false, kind, code }` — never a Direction.
- ⛔ No Style ID, code, number, Strength, ordinal, cross-axis score or fifth scorer.

## 5. Korean Reason contract

- Detail: `<member>은/는 <that member's own frozen Reason>` for each qualifying member + `<member>의 이 디자인 디테일이 수트 전체에 적용되어 수트를 Detail 방향으로 판단합니다.`
- Minimal: the assessed members' own frozen Reasons + `… 충분한 디자인 디테일이 확인되지 않아 수트 전체를 Minimal 방향으로 판단합니다.`; an unassessed member is never named (never claimed assessed).
- Suit-level verifier: one label · cited members named · no "수트이므로" · no number.

## 6. Partial evidence

A member without a block (or with a block the frozen admission rejects) is unassessed: internal limitation. One assessed member decides (D if it qualifies, else M). No member with a block → `SUIT_DM_EVIDENCE_ABSENT_ON_ALL_MEMBERS` (TRANSPORT_ERROR — the frozen single-product behaviour).

## 7. Forbidden

Suit status is never a Detail Point. ⚠ No stored Suit record carries a DM block: real-image DM Suit validation = NOT_DEMONSTRATED until an authorised live E2E.

## 8. Verification commands

```bash
node verify_identity.js
```

```bash
node tests/run_tests.js
```

Tests use `tests/fixtures/suit_fixtures_v1.json` (real stored records + labelled synthetic blocks; no GT). Oracle = the frozen parent itself + the CEO rule written independently in the test.

## 9. Restore and rollback

- **Restore:** place this directory at `01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/` of a master tree that contains the frozen parent (freeze record + frozen directory + its pinned runtime dependencies at their recorded master-relative paths). Run the two commands above; both must pass (the seal check proves byte identity; the tests prove behaviour).
- **Rollback:** remove this directory (or stop routing Suits to it). Nothing else changes: the frozen DM V2 engine, its pointer and every ordinary-product result are untouched. The Integrated runtime then reports the axis as not supported for Suits (as `item_v2` / `item_v2_r1` do).
