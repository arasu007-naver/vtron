# D6 — Final Freeze Seal / Production Manifest Report

> Order §10. Gates evaluated by `_raw/w9_freeze.js` from the recorded evidence plus an interim protected-file walk (= PRE). All values below are read from the files.

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

Protected interim walk = PRE: true.

## Identity

| item | value |
|---|---|
| seal | FLTC-FINAL-FREEZE-V1-2026-10-25 |
| seal file sha256 | abd275133a9cd98947611eef09e242d1386296ad691d90ddf96d5c287f7c7da4 |
| release | 01_ENGINES/STYLE_SCORING_ENGINE/FLTC_FINAL_V1/ · STMX_FULL_LOOK_TC_DIRECTION_ENGINE_V1 |
| RELEASE_MANIFEST.json sha256 | 8085f8bbf649fe4d6032b68790e084ad5c7c9f995b39a7989a930d81a6a888d0 (= seal) |
| runtime fingerprint | bc05359ac959d21894f389a95cea5a0393b0a9ce6d3bdace8570f73c17744174 |
| constitution | STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1 · sha256 fc12625747a4ba46ef14739f4dad60ee9ca89a6c9ae7a3d4ca6c435c70023554 |
| source candidate | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE/ · code identity 269967994177db82b88177e59c0718a41025ac8277878946299e7e4f4517dd61 · manifest 1e6fd40d8d0854d63f4ffa3d66ca2ac949f11dad9a55e8da848aeddceb1af55f |
| dependencies | 33 closure files · 5 pins |
| release files | 181 (incl. RELEASE_MANIFEST + SHA256SUMS; + seal) |
| freeze declaration | 04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_TC_DIRECTION_ENGINE_FINAL_FREEZE_V1.md · sha256 01d6a4e7d2bfa6e86ac62e816c8f5eaa9e34c7bc5f0730752b0576a77bb6cef2 |
| production pointer | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json · sha256 5d4678c377c38570675c75c2a315d99d13f5c0fe924ee2964e1deaf5edac6fbe · status PRODUCTION |
| pointer ↔ seal | consistent |
| Item TC pointer | separate and unchanged: 01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_PRODUCTION_AUTHORITY_V1.json |

## Verification

| run | result | checks |
|---|---|---|
| in place, pre-seal | RELEASE_VERIFIED | V1 PASS V2 PASS V3 PASS V4 PASS V5 PASS V6 PASS V7 PASS V8 PASS V9 PASS V10 PASS |
| clean room, pre-seal | VERIFIED | V1 PASS V2 PASS V3 PASS V4 PASS V5 PASS V6 PASS V7 PASS V8 PASS V9 PASS V10 PASS |
| in place, post-seal | RELEASE_VERIFIED | V1 PASS V2 PASS V3 PASS V4 PASS V5 PASS V6 PASS V7 PASS V8 PASS V9 PASS V10 PASS |
| clean room, post-seal (run 2) | VERIFIED | V1 PASS V2 PASS V3 PASS V4 PASS V5 PASS V6 PASS V7 PASS V8 PASS V9 PASS V10 PASS |

Disclosed: post-seal clean-room run 1 ended without a verify report (stdout / exit not captured; cause undetermined) — `_raw/manifests/w8_cleanroom_post_seal_run1_NO_REPORT_DEFECT.json`; run 2 with the same procedure VERIFIED. No frozen file changed.

## Path length

Inside the master tree the deepest release file is 283 characters absolute (master-relative 220): the frozen dependencies keep their master-relative paths in `RT/` (LongPathsEnabled = 0 on this machine; Node.js reads such paths). The backup folder is below 260 (D7 B-4).
