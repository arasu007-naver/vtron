# D3 — 43-Case Replay Comparison (V1 · V2 · V3)

> Generated from `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE/validation/tc_regression_ledger.json` (sha256 `3c0f1c90dba71a850f346e59222fe1a38ac9be3d70ff03b0af2fd204ee7d8d39`). V1 and V2 columns come from their sealed ledgers (hash-checked by the runner). 0 API calls. No GT is used.

## Totals

| measure | value |
|---|---|
| Total input | 43 |
| Valid scorable | 42 |
| Technical input failure | 1 (F033 NO_TC_PRODUCT_EVIDENCE) |
| Classic | 21 |
| Transformative | 21 |
| Final UNRESOLVED (scorable) | 0 |
| Missing-evidence cases (scorable looks with a missing fact, an unknown component or a frozen interpretive gap) | 40 |
| resolved_by | {"AVAILABLE_EVIDENCE":8,"DIRECT":34,"INPUT_FAILURE":1} |
| sensitivity | {"POSSIBLE":12,"NONE":31} |
| Deterministic replay match | YES (43 × 2 identical; release golden 43 / 43) |
| Dataset seals | all 43 packet + run_record sha256 match their sealed manifests |
| V1 → V2 → V3 distribution | V1 {"DIRECTION_UNRESOLVED":10,"TRANSFORMATIVE":21,"CLASSIC":12} · V2 {"DIRECTION_UNRESOLVED":9,"TRANSFORMATIVE":21,"CLASSIC":13} · V3 {"CLASSIC":21,"TRANSFORMATIVE":21,"INPUT_FAILURE":1} |
| V2 → V3 change classes | {"INTENDED_CORRECTION":9,"UNCHANGED":34} · unexplained 0 |
| Accuracy | NOT computed — not computable — no Full-Look TC CEO GT exists for these packets; coverage is not accuracy |

## Per look

| Look | V1 | V2 | V3 | Change Reason | Rule |
|---|---|---|---|---|---|
| F147 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 FROZEN_TOKEN_REPRESENTATION_GAP); no valid frozen departure exists and c1 Sweater, c2 T-Shirt, c3 Trouser carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| M269 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 PRODUCT_EVIDENCE_MISSING); no valid frozen departure exists and c4 Sweater, c5 Jacket, c8 Trouser carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| F298 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F390 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M323 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M178 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M270 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| F187 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 FROZEN_TOKEN_REPRESENTATION_GAP); no valid frozen departure exists and c1 Dress carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| F444 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M303 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| M320 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| REF_000622 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 PRODUCT_EVIDENCE_MISSING); no valid frozen departure exists and c1 Skirt carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| F012 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| F033 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | INPUT_FAILURE (NO_TC_PRODUCT_EVIDENCE) | INTENDED_CORRECTION — FCR-TC-1 input boundary: V2 TC-P2 COMPONENT_IDENTITY_UNKNOWN; the packet carries no product fact the frozen predicates can read (no component identified as a garment; unknown identity: c1) → technical input failure, not a style result | NO_TC_PRODUCT_EVIDENCE · sensitivity POSSIBLE |
| F054 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F065 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F074 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F109 | DIRECTION_UNRESOLVED TC-S3 | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| F134 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity POSSIBLE |
| F146 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F225 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| F228 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| F254 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F258 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| F260 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F267 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 COMPONENT_IDENTITY_UNKNOWN); no valid frozen departure exists and c1 Sweater, c3 Trouser carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| F288 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F293 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F372 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity POSSIBLE |
| F391 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F392 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| F418 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 COMPONENT_IDENTITY_UNKNOWN); no valid frozen departure exists and c4 Skirt carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| F472 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 FROZEN_TOKEN_REPRESENTATION_GAP); no valid frozen departure exists and c1 Jacket, c2 Trouser carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| F563 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| M011 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M120 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity POSSIBLE |
| M134 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M165 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M210 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| M214 | DIRECTION_UNRESOLVED TC-P2 | DIRECTION_UNRESOLVED TC-P2 | CLASSIC TC-C | INTENDED_CORRECTION — FCR-TC-1: V2 withheld a direction (TC-P2 PRODUCT_EVIDENCE_MISSING); no valid frozen departure exists and c1 Jacket, c3 Trouser carry observed conventional readings → CLASSIC on the available evidence (sensitivity POSSIBLE) | TC-C · AVAILABLE_EVIDENCE · sensitivity POSSIBLE |
| M308 | CLASSIC TC-C | CLASSIC TC-C | CLASSIC TC-C | unchanged | TC-C · DIRECT · sensitivity NONE |
| M309 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |
| M317 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | TRANSFORMATIVE TC-P1 | unchanged | TC-P1 · DIRECT · sensitivity NONE |

## Reading the table

- The 34 looks V2 already resolved are unchanged (direction and rule); their product stage is byte-equivalent (test P01 / P02).
- 8 looks move from V2 `DIRECTION_UNRESOLVED` to `CLASSIC` on observed Classic support (INTENDED_CORRECTION); 1 look (F033) moves to a technical input failure (INTENDED_CORRECTION, input boundary).
- No look moves to TRANSFORMATIVE without a frozen departure, and no V2 Classic / Transformative changes (no SEMANTIC_REGRESSION, no TECHNICAL_REGRESSION).
- "Coverage 100 % of scorable looks" is not obtained by defaulting to Classic: each corrected Classic lists the observed facts it rests on (D4), removing those facts never leaves Classic (test G05), and completing the reported sensitive fact toward its departure gives Transformative (test G06).
