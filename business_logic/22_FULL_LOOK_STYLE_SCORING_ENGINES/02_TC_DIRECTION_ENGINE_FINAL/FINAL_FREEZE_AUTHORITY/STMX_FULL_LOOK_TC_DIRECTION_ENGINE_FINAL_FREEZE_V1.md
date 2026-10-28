# STMX FULL-LOOK TC DIRECTION ENGINE — FINAL FREEZE V1

> **Approval Anchor** — CEO Decision 2026-10-25 (order "STMX FULL-LOOK TC — FINAL MANDATORY SCORING CORRECTION, PRODUCTION FREEZE & VERIFIED BACKUP V1" §10 conditional Final Freeze authorization · §4 binding architecture · §5 FCR-TC-1; verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_TC_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/AUTHORIZATION/TC_FINAL_FREEZE_CEO_ORDER_VERBATIM.md`, sha256 `64853f6d654c5e69840646f03ddadbc3d2817a6fa086189a3d34f0c7ef1ef2cb`). Reason: FCR-TC-1 corrected inside the approved authorities; every gate F-01 … F-16 passed; the release verified in place and in a clean room. Affected Scope: new release `01_ENGINES/STYLE_SCORING_ENGINE/FLTC_FINAL_V1/` · this declaration (+ manifest) · production pointer `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json`. No existing frozen authority changed (Item TC `STMX_TC_ENGINE_V1`, Frozen Vision, Full-Look SR untouched).

| item | value |
|---|---|
| release ID | STMX_FULL_LOOK_TC_DIRECTION_ENGINE_V1 |
| seal | FLTC-FINAL-FREEZE-V1-2026-10-25 (`FLTC_FINAL_V1/FINAL_FREEZE_SEAL.json`) |
| status | COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION (Full-Look TC Direction) |
| freeze date | 2026-10-25T03:08:13.912Z |
| release manifest sha256 | 8085f8bbf649fe4d6032b68790e084ad5c7c9f995b39a7989a930d81a6a888d0 |
| runtime fingerprint | bc05359ac959d21894f389a95cea5a0393b0a9ce6d3bdace8570f73c17744174 |
| constitution | STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1 · sha256 fc12625747a4ba46ef14739f4dad60ee9ca89a6c9ae7a3d4ca6c435c70023554 |
| source candidate | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE/ (code identity 269967994177db82b88177e59c0718a41025ac8277878946299e7e4f4517dd61; runtime src byte-identical true) |
| dependencies | 33 closure files bundled in RT/ (hash-recorded) · 5 authority pins (hash-checked at load, fail-closed) |
| Frozen Vision compatibility | FLV-FINAL-FREEZE-V1-2026-10-17 · packet V1_RC4 |
| tests | V3 development suite {"PASS":54} · release tests 16 / 16 · verify_release V1–V10 PASS (in place + clean room) |
| 43-packet result | scorable 42 → CLASSIC 21 / TRANSFORMATIVE 21 · input failure 1 (F033 NO_TC_PRODUCT_EVIDENCE) · final UNRESOLVED 0 |
| accuracy | NOT verified — no Full-Look TC CEO GT exists |
| rollback | `FLTC_FINAL_V1/ROLLBACK.md` (withdraw the pointer by a governed Full-Look TC reopen; no prior production engine) |

## Direction semantics

CLASSIC | TRANSFORMATIVE for every scorable look (STMX-2026-10-AEMS · Product-Only). T = a frozen-valid product departure on any participating garment; C = no valid departure + Classic support on OBSERVED facts; missing / unknown / gap facts contribute nothing. Input failures only: INPUT_CONTRACT · NO_OBSERVABLE_WORN_LOOK · NO_GARMENT_OBSERVED · NO_TC_PRODUCT_EVIDENCE. Full rule text: `FLTC_FINAL_V1/CONSTITUTION/STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1.md`.

## Acceptance gates

| gate | requirement | result | evidence |
|---|---|---|---|
| F-01 | Current CEO authority confirmed | PASS | STMX-2026-10-AEMS + Product-Only 2026-10-23 in force; V2 identity 796a9513c7b40a9df097e0f7be9c522bd93304aa3c33f2058108ecdd7df7a89e verified; order §10 conditional Final Freeze authorization |
| F-02 | Product-Only semantics preserved | PASS | valid departure ⇔ T; no cancellation; styling never decides; 34 V2 C / T unchanged |
| F-03 | Mandatory scoring on every normal input | PASS | 1169 single-fact omissions · bad  · scorable final UNRESOLVED 0 |
| F-04 | all 9 V2-unresolved causes resolved one by one | PASS | D4 (10 items × 9 looks) · changes F147, M269, F187, REF_000622, F033, F267, F418, F472, M214 |
| F-05 | scorable final UNRESOLVED = 0 | PASS | C 21 / T 21 of 42 scorable |
| F-06 | technical input failure proven by packet structure | PASS | F033 NO_TC_PRODUCT_EVIDENCE — no component identified as a garment; REF_000622 scorable (A10) |
| F-07 | 43-packet replay complete | PASS | 43 packets · seals ok · deterministic · ledger reproduced under the preload |
| F-08 | every direction change explained | PASS | {"INTENDED_CORRECTION":9,"UNCHANGED":34} |
| F-09 | Frozen Item TC protected | PASS | protected walk = PRE (17719 files); Item TC 26 / 26; Step 2 successor 15 / 15; pins hash-matched |
| F-10 | Frozen Vision protected | PASS | verify_release R1–R9 PASS; adapter / product stage byte-identical |
| F-11 | Frozen SR protected | PASS | FLSR_FINAL_V1 V1–V10 PASS; R4 41 / 41; TC loads no SR code |
| F-12 | no GT leakage / look-id exceptions | PASS | code scan · anonymised refs · look-id change · release isolation V4 |
| F-13 | determinism / missingness / mutation tests | PASS | order · repeat · omission · completion · read-set soundness · fresh-process replay |
| F-14 | final constitution + runtime dependency verified | PASS | D2 = release constitution; runtime src byte-identical; closure 33 files + 5 pins verified |
| F-15 | production clean-room replay | PASS | clean room outside the master tree, empty environment: RELEASE_VERIFIED |
| F-16 | no new CEO semantic decision needed; no blocking defect | PASS | design review item 15 = NO (disclosed operationalisations in D9); regression all as expected; known limitations non-blocking |

## Known limitations

D2 §14 KL-1 … KL-7 (frozen interpretive gaps · missing material facts · unknown identities · Vision fit boundary M178 · REF_000622 SR/TC difference · no Full-Look TC GT · pocket density not transported).

## Explicit exclusions

TC Strength · TC1–TC9 projection · Item TC (frozen, consumed read-only) · EI · SR · DM · four-axis integration. TC V1 / V2 candidates, research scripts, CEO GT / reference / registers are not part of the release.

## Reopen

⛔ Any change to Full-Look TC Direction semantics, the constitution, the runtime, its dependencies or this release requires an explicit governed **Full-Look TC reopen decision**. Item TC changes remain under the TC REOPEN rule. Successors are new directories with new seals; this release is never rebuilt in place.
