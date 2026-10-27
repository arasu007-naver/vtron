# STMX FULL-LOOK TC PRODUCT-ONLY RESOLVER V3 — FINAL CANDIDATE

> 2026-10-25 · correction FCR-TC-1 (STMX-2026-10-AEMS, CEO 2026-10-24) on top of `CEO_APPROVED_FULL_LOOK_TC_PRODUCT_ONLY_2026_10_23` · runtime of `STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1` · OFFLINE · candidate source of the production release `FLTC_FINAL_V1` (promotion recorded in the governance package, not here).
> Governance package: `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_TC_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/`.
> Predecessors (preserved unchanged): `STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V2_CANDIDATE/` · `STMX_FULL_LOOK_TC_DIRECTION_RESOLVER_V1_CANDIDATE/`.

## Direction semantics

| step | condition | outcome |
|---|---|---|
| 1 | packet / run_record contract invalid | `TECHNICAL_EXCEPTION` · `INPUT_CONTRACT` |
| 1 | SVP-001 look frame not observed, or `image_failure` / `not_a_worn_look` | `TECHNICAL_EXCEPTION` · `NO_OBSERVABLE_WORN_LOOK` |
| 1 | no garment component | `TECHNICAL_EXCEPTION` · `NO_GARMENT_OBSERVED` |
| 4 · TC-P1 | a valid frozen product departure on any participating garment | `TRANSFORMATIVE` |
| 4 · TC-C | no valid departure; ≥ 1 garment whose frozen FALSE verdicts rest on OBSERVED facts (Classic support) | `CLASSIC` (`resolved_by` DIRECT or AVAILABLE_EVIDENCE) |
| 4 | no departure and no Classic support anywhere | `TECHNICAL_EXCEPTION` · `NO_TC_PRODUCT_EVIDENCE` |

Missing facts, unknown identities, frame limits (crop · occlusion · lower_body_cropped) and frozen interpretive gaps contribute nothing to the direction. They are reported in `basis` (`missing_observations`, `unknown_identity`, `interpretive_gaps`, `frame_limits`, `sensitivity` NONE / POSSIBLE, `sensitive_to`). Styling has no direction authority.

## Entry point

```js
const { resolveTC } = require('./src/fl_tc_direction_resolver_v3.js');
const record = resolveTC({ packet, run_record });   // frozen Vision packet V1_RC4 + its run_record
```

## Files

| file | status vs V2 |
|---|---|
| `src/fl_tc_input_adapter_v1.js` · `src/fl_tc_product_departure_v1.js` · `src/fl_tc_authority_v1.js` · `src/fl_tc_product_visibility_v2.js` | byte-identical copies of V2 (the first three also of V1) |
| `src/fl_tc_authority_v3.js` | NEW — V1 pins re-exported; applied authorities + AEMS; constitution id |
| `src/fl_tc_available_evidence_v3.js` | NEW — Classic support on observed facts, interpretive gaps, frame state, sensitivity sources |
| `src/fl_tc_direction_resolver_v3.js` | NEW — steps 1–5 above |
| `cli/run_offline_replay.js` | V3 replay of the 43 sealed packets with V1 / V2 / V3 comparison and change classes |
| `tests/run_tests.js` | 54 tests (A FCR-TC-1 · R order §7.2 · G order §7.3 · P inherited · E evidence rule · D determinism) |

## Run

```bash
node cli/run_offline_replay.js
```

```bash
node tests/run_tests.js validation/tc_tests.json
```

No network module is loaded; 0 API calls. The resolver never reads a look id, file name or GT.
