# STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1 — SR V2 SUIT SUCCESSOR (CANDIDATE)

> **Status:** CANDIDATE — not production · not frozen · not promoted. Identity record: `CODE_IDENTITY_SEAL_STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE.json` (not a freeze).
> **Approval Anchor** — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — CEO-APPROVED SUIT RULE IMPLEMENTATION … verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_SUIT_CAPABLE_SUCCESSOR_IMPLEMENTATION_V1/AUTHORIZATION/CEO_ORDER_VERBATIM.md`). Reason: implement the CEO-approved SR Suit rule as an axis-owned, versioned successor of the frozen SR V2 engine. Affected Scope: this directory (new); the frozen parent is never written.

## 1. Frozen parent authority

| field | value |
|---|---|
| freeze id | `ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27` |
| freeze record | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_SR_V2_FINAL_FREEZE_AUTHORITY_V1.json` |
| freeze record sha256 | `71006214ffaab09a3693d5857df2bcea08dab6d5e91c662d5c7b370a583c6b2b` |
| frozen directory | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE/` |
| src aggregate | `3bcc45bc4170e11b87c9da0d059f92c9311f2ede3ea925ed52b056da9239c466` |

Relationship: **successor, not a replacement.** The frozen SR V2 engine keeps scoring every ordinary product exactly as frozen (it is untouched and still bound by the Integrated V2 runtimes). This successor is called **only** for a valid commercial Suit (Jacket + Trouser or Jacket + Skirt) declared by the user or authoritative merchandise input. `src/sr_v2_suit_parent_pin.js` verifies the freeze record, every frozen directory file and every pinned runtime dependency before any frozen module is loaded (fail closed: `PARENT_*`).

## 2. CEO Suit rule (binding, not reopened)

The Jacket's actually realized silhouette determines the Direction of the complete Suit; the lower body cannot overturn it (CEO 2026-10-29 §0.1 · §5.1 — Full-Look SR Upper Priority principle, Direction governance only).

| Jacket | Bottom | Suit |
|---|---|---|
| S | S | S |
| S | R | S |
| R | S | R |
| R | R | R |

## 3. Implementation

- The Jacket's own Item Vision V1.3 record → the frozen SR V2 `evaluate()` (unchanged semantics: realized fit · shoulder · waist · fabric evidence; never a category, padding label, tailoring term, buttons or lapels) → Jacket Direction = Suit Direction.
- The bottom's own record → the same frozen `evaluate()`: retained as evidence (`retained_bottom_evidence`) only — no average, vote or override.
- No Full-Look scoring factor, styling effect, Strength, Neutral mechanic or Vision field requirement is imported.

## 4. Input / output contract

- Input = the EI V2 ITEM_PRODUCT Suit packet: `{ scoring_unit_type: "ITEM_PRODUCT", product_identity: { merchandise_type: "SUIT", suit_component_target_ids: [a, b] }, targets: [{ target_id: a, record }, { target_id: b, record }] }` — each record the member's own Item Vision V1.3 record, unmodified. Exactly one Jacket + one Trouser or Skirt; anything else → `CONTRACT_ERROR`.
- Output (valid) = `{ ok: true, direction, customer: { direction, reason }, suit_trace }` — exact frozen tokens; `suit_trace` is internal (member results, provenance, limitations), never customer-facing.
- Output (invalid) = `{ ok: false, kind, code }` — never a Direction.
- ⛔ No Style ID, code, number, Strength, ordinal, cross-axis score or fifth scorer.

## 5. Korean Reason contract

- `재킷은 <the Jacket's own frozen Reason> 수트 전체의 방향은 재킷 실루엣이 결정합니다.` + when the bottom's own Direction differs: `<바지/스커트>는 <Relaxed|Structured> 쪽이지만 수트 방향을 바꾸지 않습니다.`
- Suit-level verifier: Jacket leads · own label only · Upper Priority stated · contrast disclosed exactly when the bottom differs · the bottom never "decides" · no "수트이므로" · no number.

## 6. Partial evidence

Partial Jacket observations: the frozen engine decides on what was observed (mandatory S / R; nothing fabricated; no new extraction). A bottom that is incomplete or rejected never changes the result (limitation recorded). A Jacket record the frozen engine rejects → `SUIT_JACKET_RECORD_REJECTED` (TRANSPORT_ERROR) — never the bottom Direction.

## 7. Forbidden

The Upper Priority rule never applies to Dress, Jumpsuit or any ordinary product (they are never routed here). Historical CEO GT is never read or rewritten.

## 8. Verification commands

```bash
node verify_identity.js
```

```bash
node tests/run_tests.js
```

Tests use `tests/fixtures/suit_fixtures_v1.json` (real stored records + labelled synthetic blocks; no GT). Oracle = the frozen parent itself + the CEO rule written independently in the test.

## 9. Restore and rollback

- **Restore:** place this directory at `01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/` of a master tree that contains the frozen parent (freeze record + frozen directory + its pinned runtime dependencies at their recorded master-relative paths). Run the two commands above; both must pass (the seal check proves byte identity; the tests prove behaviour).
- **Rollback:** remove this directory (or stop routing Suits to it). Nothing else changes: the frozen SR V2 engine, its pointer and every ordinary-product result are untouched. The Integrated runtime then reports the axis as not supported for Suits (as `item_v2` / `item_v2_r1` do).
