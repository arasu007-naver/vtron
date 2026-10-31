# STMX DM ENGINE V2 — Direction + Reason (IMPLEMENTATION CANDIDATE)

> Order: STMX ITEM DM V2 — Binary Direction Engine Implementation, Neutral Elimination & Full Regression (CEO 2026-10-28).
> Status: **IMPLEMENTATION CANDIDATE — NOT PRODUCTION · NOT FROZEN.** The DM production pointer (Item DM V1) is unchanged.

## Contract

`require('./src/dm_v2_engine').evaluate(dmBlock)` — `dmBlock` = the governed `dm_designed_detail_evidence` block of one product record (Vision Producer V1_3 shape `{ evidence, excluded }`).

- Valid block → `{ ok: true, direction: 'DETAIL' | 'MINIMAL', customer: { direction: 'D' | 'M', reason } , … internal trace }`.
- Absent or malformed block → `{ ok: false, kind: 'TRANSPORT_ERROR', code }`. This is a transport defect, not a product result.
- Customer output: `require('./src/dm_v2_serializer').toCustomerOutput(result)` → exactly `{ direction, reason }`.

Never produced: Neutral, UNKNOWN, UNRESOLVED, NOT_SCORABLE, null Direction, score, DM1–DM9, Strength, ordinal.

## Rules (in order)

| rule | condition | Direction |
|---|---|---|
| DM-V2-T0 | block absent / malformed | transport error |
| DM-V2-M0 | complete empty block | M |
| DM-V2-D1 | a system establishes size ∈ {medium, large} AND (contrast high OR (contrast ∈ {medium, high} AND placement beyond one place)) | D |
| DM-V2-D2 | a system qualifies after open-reading adjudication (range → conservative state if inside, else upper; unread size answered by deployment; unread contrast never assumed) | D |
| DM-V2-Z0 | no admitted system has any readable Primitive | M — provisional policy, limitation Reason |
| DM-V2-M2 | some reading open (range / unread) | M |
| DM-V2-M1 | otherwise | M |

The rules use set membership only. They involve no count, density, internal composition, family, category, weight or threshold.

## Frozen dependency

`dm_admission_v1.js` (frozen DM V1 Direction-First engine), bound by name and hash in `BOUND_INPUTS.json`.

## Tests

`node tests/run_all.js` — exit 0 means every test passed. It prints results only and writes nothing. The suites are regression (75 · 77 · 220 · live V1_3), lattice, mandatory resolution, Reason grounding and guards.

## CEO decisions pending

The following are candidate working policies:
- DM-Q1: centre retirement.
- DM-Q2: the D1 definition and the supersession of internal composition.
- DM-Q3: open-reading adjudication.
- ZE-1: the Z0 policy.

See the governance package `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_DM_V2_BINARY_DIRECTION_ENGINE_IMPLEMENTATION_AND_REGRESSION_V1/`.
