# D7 — Semantic Regression and Determinism Results

> STMX FULL-LOOK EI V1 — CONTROLLED FINAL FREEZE, KNOWN LIMITATION ACCEPTANCE & VERIFIED LOCAL / GOOGLE DRIVE BACKUP · 2026-10-26 · order `AUTHORIZATION/CEO_ORDER_VERBATIM.md` §6 items 1 – 13 · release `FLEI_FINAL_V1` · seal FLEI-FINAL-FREEZE-V1-2026-10-26 · 0 API calls (G53 active).

## 1. Historical vs re-run (order §6: do not copy historical counts without verification)

| suite | historical (sealed) | actually re-run here | per-test identical | untested historical coverage |
|---|---|---|---|---|
| V1_R3 development suite (`tests/run_tests.js`, 223 tests incl. inherited V1 … V1_R2 tests) | {"PASS":216,"FAIL":0,"SEMANTIC_CONFLICT":0,"NOT_REPLAYABLE":2,"NOT_APPLICABLE":5} | {"PASS":216,"FAIL":0,"SEMANTIC_CONFLICT":0,"NOT_REPLAYABLE":2,"NOT_APPLICABLE":5} | true | NOT_REPLAYABLE 2 (R2-P09-REAL · R3-P09-REAL: original 10-17 blazer image not on disk, L-1) — unchanged |
| V1_R3 four-version replay (`cli/run_offline_replay.js`) | 43 rows (sealed ledger) | 43 rows | true | none |
| release tests (new) | — | {"PASS":14} | — | — |
| verify_release V1–V10 (new) | — | in place pre-seal / post-seal · clean room pre-seal / post-seal · backup restore: all PASS | — | — |

The five NOT_APPLICABLE tests are superseded expectations disclosed by V1_R2 / V1_R3 (R1-J02 · R2-P08 · SYN-R2-A02 · SYN-R2-A04 · SYN-R2-A05), each with a governed replacement test that passes. NOT_APPLICABLE is not counted as PASS.

## 2. Runner executions (write-redirect preload; network blocked)

| run | area | exit | expectation | repository writes |
|---|---|---|---|---|
| EI_V1_R3_TESTS | EI V1_R3 candidate (development suite, inherited V1 … V1_R2 tests included) | 0 | met | 0 |
| EI_V1_R3_REPLAY_43 | EI V1_R3 candidate (four-version replay; V1 / V1_R1 / V1_R2 checked against their sealed ledgers) | 0 | met | 0 |
| FLV_RELEASE_VERIFY_R1_R9 | Frozen Full-Look Vision | 0 | met | 0 |
| FLSR_RELEASE_VERIFY_V1_V10 | Frozen Full-Look SR | 0 | met | 0 |
| FLTC_RELEASE_VERIFY_V1_V10 | Frozen Full-Look TC | 0 | met | 0 |

## 3. Order §6 checklist

| # | verification | result |
|---|---|---|
| 1 | all 43 packets valid and scorable | 43 / 43 = seals · 43 RESOLVED |
| 2 | every valid packet → E or I | 43 / 43 |
| 3 | no NEUTRAL / UNKNOWN / UNRESOLVED / EVIDENCE_REPAIR_REQUIRED | forbidden states 0 |
| 4 | no additional Vision extraction required | none requested (offline, 0 API calls) |
| 5 | no fabricated observations | packets read as sealed; runtime copies values (input adapter) |
| 6 | no CEO GT consumed at runtime | source scan clean (true) · RT11 |
| 7 | no case-specific branching | source scan clean (true) |
| 8 | no TC / SR / DM final result consumed | true · RT09 (dm blocks removed / DM score injected → identical) |
| 9 | original 36 E / 7 I reproduced | {"EXPRESSIVE":36,"INTROVERT":7} |
| 10 | complete 43-case ledger matches the verified V1_R3 ledger | true |
| 11 | deterministic replay | in memory true · release V7 |
| 12 | semantic anchors valid | {"M210_path":true,"F065_path":true,"F258_path":true,"M320_chain":true,"F012_chain_belt":true,"F390_beaded":true,"M178_exclusions":true} |
| 13 | previous regression tests re-run where executable | {"PASS":216,"FAIL":0,"SEMANTIC_CONFLICT":0,"NOT_REPLAYABLE":2,"NOT_APPLICABLE":5} = historical |

## 4. Other frozen engines (non-impact)

FLV R1–R9: R1 PASS · R2 PASS · R3 PASS · R4 PASS · R5 PASS · R6 PASS · R7 PASS · R8 PASS · R9 PASS

FLSR V1–V10: V1 PASS · V2 PASS · V3 PASS · V4 PASS · V5 PASS · V6 PASS · V7 PASS · V8 PASS · V9 PASS · V10 PASS

FLTC V1–V10: V1 PASS · V2 PASS · V3 PASS · V4 PASS · V5 PASS · V6 PASS · V7 PASS · V8 PASS · V9 PASS · V10 PASS

**Runtime reliability (all PASS) is reported separately from GT accuracy (3 / 4).**
