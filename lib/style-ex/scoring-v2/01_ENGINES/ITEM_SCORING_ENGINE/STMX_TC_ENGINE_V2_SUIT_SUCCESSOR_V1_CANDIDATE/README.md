# STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1 — TC V2 SUIT SUCCESSOR (CANDIDATE)

> **Status:** CANDIDATE — not production · not frozen · not promoted. Identity record: `CODE_IDENTITY_SEAL_STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE.json` (not a freeze).
> **Approval Anchor** — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_SUIT_CAPABLE_SUCCESSOR_IMPLEMENTATION_V1/AUTHORIZATION/CEO_ORDER_VERBATIM.md`). Reason: implement the CEO-approved TC Suit rule as an axis-owned, versioned successor of the frozen TC V2 engine. Affected Scope: this directory (new); the frozen parent is never written.

## 1. Frozen parent authority

| field | value |
|---|---|
| freeze id | `ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28` |
| freeze record | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_TC_V2_FINAL_FREEZE_AUTHORITY_V1.json` |
| freeze record sha256 | `d6560c01d0fcbe15cbcd61a632466cccd784e6e0c13af0706069cde885c6c087` |
| frozen directory | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE/` |
| src aggregate | `c340e66f165d908949a167e59801f41928ba8f05f15975bac604807a1c2c8c4f` |

Relationship: **successor, not a replacement.** The frozen TC V2 engine keeps scoring every ordinary product exactly as frozen (it is untouched and still bound by the Integrated V2 runtimes). This successor is called **only** for a valid commercial Suit (Jacket + Trouser or Jacket + Skirt) declared by the user or authoritative merchandise input. `src/tc_v2_suit_parent_pin.js` verifies the freeze record, every frozen directory file and every pinned runtime dependency before any frozen module is loaded (fail closed: `PARENT_*`).

## 2. CEO Suit rule (binding, not reopened)

Any valid Product-Level Departure in either Suit member makes the entire Suit Transformative (CEO 2026-10-29 §0.1 · §4.1 — the CEO Step 2 V2.2 §7 MATCHING_PAIR rule).

| Jacket | Bottom | Suit |
|---|---|---|
| T | T | T |
| T | C | T |
| C | T | T |
| C | C | C |

## 3. Implementation

- Each member's own Item Vision V1.3 record → the frozen `evaluateV13Record` (adapter → frozen predicates → frozen V2 resolver): the member Direction, path and its own verified Reason.
- Departure provenance per Transformative member: frozen path FROZEN_V1 (valid Departure set) · CATEGORY_INDEPENDENT_DEPARTURE · DOMAIN_INVARIANT. A Transformative member without a Departure-grounded path is refused (`SUIT_DEPARTURE_NOT_GROUNDED`).
- The governed pair path: frozen member predicates (`unitFromTokens`) → §7 unit state → frozen `evaluateUnit`; it must agree with the member rule, else `SUIT_RULE_RECONCILIATION_FAILURE` (fail closed).
- Classic = no member carries a valid Departure — the frozen Classic paths incl. the mandatory fallback decide each member; no Departure is fabricated.

## 4. Input / output contract

- Input = the EI V2 ITEM_PRODUCT Suit packet: `{ scoring_unit_type: "ITEM_PRODUCT", product_identity: { merchandise_type: "SUIT", suit_component_target_ids: [a, b] }, targets: [{ target_id: a, record }, { target_id: b, record }] }` — each record the member's own Item Vision V1.3 record, unmodified. Exactly one Jacket + one Trouser or Skirt; anything else → `CONTRACT_ERROR`.
- Output (valid) = `{ ok: true, direction, customer: { direction, reason }, suit_trace }` — exact frozen tokens; `suit_trace` is internal (member results, provenance, limitations), never customer-facing.
- Output (invalid) = `{ ok: false, kind, code }` — never a Direction.
- ⛔ No Style ID, code, number, Strength, ordinal, cross-axis score or fifth scorer.

## 5. Korean Reason contract

- Transformative: `<member>은/는 <that member's own frozen Reason>` for each departing member + `<member>의 이 변형이 수트 전체에 적용되어 수트를 Transformative 방향으로 판단합니다.`
- Classic: both members' own frozen Reasons + `두 구성품 모두에서 상품 수준의 변형이 확인되지 않아 수트 전체를 Classic 방향으로 판단합니다.` ("확인되지 않아" — never "absent").
- Suit-level verifier: one label · departing member named · no "수트이므로" · no number; a finding or a withheld member Reason → Reason withheld, Direction kept.

## 6. Partial evidence

A member record the frozen adapter cannot read: if the other member carries a valid Departure → Transformative (limitation recorded); otherwise `SUIT_MEMBER_RECORD_UNREADABLE`. Missing optional observations never block (the frozen mandatory paths decide).

## 7. Forbidden

No Departure from Suit status, matching colour / fabric / pattern, category words, styling, GT, REF or score. Ordinary products never reach this successor.

## 8. Verification commands

```bash
node verify_identity.js
```

```bash
node tests/run_tests.js
```

Tests use `tests/fixtures/suit_fixtures_v1.json` (real stored records + labelled synthetic blocks; no GT). Oracle = the frozen parent itself + the CEO rule written independently in the test.

## 9. Restore and rollback

- **Restore:** place this directory at `01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/` of a master tree that contains the frozen parent (freeze record + frozen directory + its pinned runtime dependencies at their recorded master-relative paths). Run the two commands above; both must pass (the seal check proves byte identity; the tests prove behaviour).
- **Rollback:** remove this directory (or stop routing Suits to it). Nothing else changes: the frozen TC V2 engine, its pointer and every ordinary-product result are untouched. The Integrated runtime then reports the axis as not supported for Suits (as `item_v2` / `item_v2_r1` do).
