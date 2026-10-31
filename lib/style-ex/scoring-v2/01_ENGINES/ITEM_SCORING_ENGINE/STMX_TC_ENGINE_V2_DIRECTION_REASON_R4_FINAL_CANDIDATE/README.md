# STMX TC ENGINE V2 — Direction + Reason (R4 FINAL CANDIDATE)

> Order: STMX ITEM TC V2 — R3-B1 / R3-B2 Final Correction, Best-Supported Direction Validation & Full Regression (CEO 2026-10-28).
> Lineage: `STMX_TC_ENGINE_V2_DIRECTION_REASON_CANDIDATE` → `…_R2_CANDIDATE` → `…_R3_FINAL_CANDIDATE` → this R4 (all predecessors protected, unchanged).
> Status: **IMPLEMENTATION CANDIDATE — NOT PRODUCTION · NOT FROZEN.** The TC production pointer (STMX_TC_ENGINE_V1) is unchanged. Frozen TC V1 is bound read-only by hash.

## Mandatory Direction contract (CEO 2026-10-28)

Every VALID product input returns `CLASSIC` or `TRANSFORMATIVE` — complete, partial (fields absent or UNKNOWN, product type unknown or absent) or with zero admissible TC evidence. Never UNKNOWN · UNRESOLVED · NOT_SCORABLE · Neutral · a limitation · null · a number · Strength · ordinal.

Only an input whose product ENVELOPE cannot be read is a `CONTRACT_ERROR` (not a product result): not an object / an array · observation container absent, null, not an object or an array. **Absence of a field is never evidence of corruption (R3); an individually invalid field is never promoted to a whole-record error (R4).**

## R4 change (vs R3)

- **R3-B1 · field-level salvage** — `src/tc_v2_vision_adapter.js`: every observation field (category · grammar · each parameter) is validated on its own against the V1.3 contract (state set · value domain · values / values_detail / coverage / locations / fit.byRegion shape and vocabulary). An invalid field is **excluded** — not projected, not displayed as observed, never repaired, never partly re-read — and recorded in `adapter.excluded` / `trace.excluded_fields`. Exclusion ≡ absence (sweep-tested). `src/tc_v2_engine.js`: the R3 rule "a MALFORMED value ⇒ whole-record CONTRACT_ERROR" is withdrawn.
- **R3-B2 · category-independent Departure routing** — new `src/tc_v2_category_independence.js` + resolver path `CATEGORY_INDEPENDENT_DEPARTURE` (before DOMAIN_INVARIANT): for a member whose archetype key is unresolved, the frozen Construction predicate and frozen relational resolvers (`evaluator_v2_3_2.js`, bound by hash through the successor's bound inputs) are run on the member's own tokens in every admissible key (14 = the closed V1.3 category domain, or the grammar keys of an observed Jacket / Coat). T only if Construction is TRUE in every key with the same audited category-independent rule (F2 openwork Body · F1 body-zone hybrid / layered body · F3 structural attachment — D5 audit). A Departure TRUE in some keys only is category-dependent → never a Direction, cited concessively (`KEY_DOMAIN_CANDIDATE`).
- **Reason** — CI Departure clause cites the observed carrier + its D-4 zone (`몸판을 이루는 레이스 구성…`); T on a successor path names unconfirmed inputs; zero-evidence text never denies an observed feature (`ZERO_EVIDENCE_OBSERVED_LIMITATION`); sleeve-volume concession only for a sleeve-caused SIL-MORPH; no product-type word when the type is unknown. Verifier checks for each.
- Tests: + `test_r4_corrections.js` (40; failed 16/39 on the unfixed copy). Updated to the CEO R3-B1 §4.2 contract (disclosed): `test_transport` TR-01 · TR-03 · TR-08, `test_live_controls` LC-19, `test_mandatory_boundary` MB-12 · MB-13.
- The 114 governed units and 15 stored live V1.3 records: Direction · path identical to R3; Reason identical except REF_000139 · REF_000469 (a category-dependent construction candidate now cited concessively).

## R3 change (vs R2)

- `src/tc_v2_vision_adapter.js` — `adapt()`: envelope check = plain-object record + plain-object observation container; a category that is not observed (or absent) gives the unresolved key `UNMAPPED:<CATEGORY_…>` (scored through the existing mandatory path) instead of `CATEGORY_NOT_OBSERVED`; an absent / null field is `NOT_EMITTED_BY_V1_3_RECORD`.
- `src/tc_v2_engine.js` — `transportDefects()`: the R2 rule "absent V1.3 UNIVERSAL key ⇒ CONTRACT_ERROR" is withdrawn; only MALFORMED values remain.
- Tests: + `test_mandatory_boundary.js` (CEO §11.3 · 26 controls; failed 19/26 on the unfixed copy). Updated to the CEO §5 contract (disclosed): `test_transport` TR-02 · TR-04 · TR-08, `test_adapter` AD-07, `test_live_controls` LC-19, `test_mutation` MU-20.
- The 114 governed units and the 15 stored live V1.3 records give byte-identical Direction · path · Reason to R2.

## Decision order (best-supported Direction)

| # | path | condition | Direction |
|---|---|---|---|
| 1 | FROZEN_V1 | frozen TC V1 unit Direction is C / T (pair / set rule included) — any sufficient Departure ⇒ T, all channels conventional ⇒ C | carried verbatim |
| 1b | CATEGORY_INDEPENDENT_DEPARTURE | (R4) key unresolved; frozen Construction TRUE with the same audited category-independent rule in every admissible key | TRANSFORMATIVE |
| 2 | DOMAIN_INVARIANT | every admissible completion of the missing inputs gives one Direction (T only on a channel independent of the completion; C grounded on an observed carrier) | that Direction |
| 3 | ZERO_EVIDENCE | no channel conventional on an OBSERVED carrier | CLASSIC — explicit deterministic policy (TC-ZE), Reason states the limitation |
| 4 | EVIDENCE_BOUNDED | key resolved, no open Departure candidate, Construction conventional on an observed carrier | CLASSIC |
| 5 | MANDATORY_FALLBACK | otherwise (unresolved key · open candidate · Construction not grounded) — no sufficient Departure is observed | CLASSIC, open candidates cited concessively |

An unobserved possibility never yields T; an unsettled candidate (unbound Lace, sleeve volume, sleeve + cuff pair) is not a sufficient Departure.

## Contract

- `evaluateCorpusUnit(anchor)` / `evaluateCorpus()` · `evaluateV13Record(record)` · `toCustomerOutput(result)` → exactly `{ direction, reason }`.

## Tests

`node tests/run_all.js` — prints only; writes nothing. Suites: regression · domain invariance · mutation · Reason · adapter · guards · transport · live controls · mandatory boundary.

## CEO decisions pending

See `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_TC_V2_MANDATORY_BEST_SUPPORTED_DIRECTION_R3_FINAL_CORRECTION_AND_FREEZE_READINESS_V1/` (D12).
