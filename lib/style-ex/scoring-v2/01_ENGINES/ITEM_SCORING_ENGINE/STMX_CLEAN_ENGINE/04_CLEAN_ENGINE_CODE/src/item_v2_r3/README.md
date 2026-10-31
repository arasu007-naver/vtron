# src/item_v2_r3 — STMX INTEGRATED ITEM SCORING RUNTIME V2 · R3 (input-contract + selection-policy correction) · CANDIDATE

> **Status:** CANDIDATE — not production · not frozen · not promoted. Identity record: `CODE_IDENTITY_SEAL_ITEM_V2_INTEGRATED_RUNTIME_V2_R3_CANDIDATE.json` (not a freeze).
> **Approval Anchor** — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — SUIT DM INCOMPLETE ROOT-CAUSE RESOLUTION, INTEGRATED RUNTIME CONTRACT CORRECTION … verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_SUIT_DM_ROOT_CAUSE_AND_FINAL_VALIDATION_V1/AUTHORIZATION/CEO_ORDER_VERBATIM.md`). Reason: correct two proven defects of the sealed `src/item_v2_r2/` without re-implementing scoring. Affected Scope: this directory (new); `item_v2_r2` · `item_v2_r1` · `item_v2` · the four frozen V2 engines · the three Suit successors · Vision V1.3 are unchanged and pin-verified before use (G42 / G42-A).

## The two corrections

| # | R2 behaviour (defect) | R3 behaviour | authority |
|---|---|---|---|
| 1 | a selected target whose record fails the Item Vision V1.3 DM observation gate (e.g. a pre-DM-layer Producer V1 record: `DM_OBSERVATION_BLOCK_REQUIRED`) is scored and reported as result `INCOMPLETE` with three customer Directions | classified at the input boundary: `INPUT_CONTRACT_NONCONFORMING` (input issue `VISION_INPUT_NOT_V1_3_CONFORMING`, per-target gate codes), no axis executed, no Direction | order §4 CLASS D · §5; V1.3 `producer_rules_v1.js` `DM_OBSERVATION_REQUIRED = true` + validator `validateDmObservation` |
| 2 | among several eligible garments with no authoritative identity, R1 auto-selects the one with the unique highest Vision prominence (also inside a declared category) | always a target-selection request (`PRODUCT_SELECTION_UNRESOLVED` + `selection_request`, ambiguity `UNRESOLVED_MULTIPLE_PRODUCT_CANDIDATES`) — the user selects; resume with `resumeWithSelection` | order §8 |

Everything else is R2, byte-for-byte: for a conforming selected product R3 calls the sealed R2 runtime on the identical input (R3 only ever narrows R2's choices) and returns its result verbatim, adding `internal.input_contract` and its runtime stamp.

## The V1.3 gate (what it is and is not)

- Applied only to the SELECTED target record(s) (styling targets are never scored, never gated).
- = the frozen V1.3 `validateDmObservation` (block present · evidence array · legal families / primitives / exclusion reasons · completeness count not drifted). Pinned: `producer_validator_v1.js` `26ad25a8…` + `producer_rules_v1.js` `c22e5914…` (the only two V1.3 modules loaded).
- NOT the full 37-parameter record validator: field-level findings stay partial evidence decided by the frozen V2 engines (field-level salvage), as before. A partially populated DM block (NOT_VISIBLE / UNKNOWN primitives) is valid partial evidence → the frozen DM decides D / M.
- ⛔ Never edits, fills or repairs a record. A missing block is never read as "no designed detail" (V1.3 contract ★_semantics).

## Commands

```bash
node tests/run_all.js
```

```bash
node item_v2_r3_cli.js input.json
```

```bash
node item_v2_r3_cli.js input.json --item target_2
```

```bash
node item_v2_r3_cli.js input.json --suit target_1,target_3
```

## Restore and rollback

- **Restore:** place this directory at `01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item_v2_r3/` beside the sealed `item_v2_r2/`, `item_v2_r1/`, `item_v2/`, with the frozen V2 authorities, the three Suit successors and the two V1.3 validator files at their master-relative paths.
- **Rollback:** stop calling R3 — R2 keeps working exactly as sealed. No frozen engine, pointer or production authority changes.

⚠ CANDIDATE vocabulary (Canonical Dictionary registration required before any freeze): `INPUT_CONTRACT_NONCONFORMING` · `VISION_INPUT_NOT_V1_3_CONFORMING` · `UNRESOLVED_MULTIPLE_PRODUCT_CANDIDATES` · `input_contract` · `selection_policy` (+ the R2 / R1 names already flagged).
