# D5 — Regression & Architecture Guard Report

> Order §7.4. Every runner executed unchanged under `_raw/redirect_preload.js` (repository writes redirected into this package; network modules blocked). Source: `_raw/manifests/w4_regression.json`; logs `_raw/exec/logs/`.

| run | area | expectation met | sealed output reproduced | classification | tail |
|---|---|---|---|---|---|
| FLV_RELEASE_VERIFY_R1_R9 | Frozen Vision | true | n/a | PASS | R8 PASS G53: LiveProvider refuses · no network module, fetch call, credential variable or API endpoint in runtime src /  |
| FLSR_RELEASE_VERIFY_V1_V10 | Frozen Full-Look SR | true | n/a | PASS | V9   PASS — clean / V10  PASS — seal FLSR-FINAL-FREEZE-V1-2026-10-25 / RELEASE_VERIFIED |
| SR_V3_R4_TESTS | Frozen Full-Look SR (source candidate) | true | n/a | PASS | {"PASS":41} |
| ITEM_TC_INTEGRATED_RUNTIME_TESTS | Frozen Item TC | true | n/a | PASS | {"pass":26,"total":26} |
| ITEM_TC_STEP2_SUCCESSOR_V4_TESTS | Frozen Step 2 successor | true | n/a | PASS |  }, /  "ok": true / } |
| ITEM_SR_FINAL_RUN_ALL | Frozen Item SR (environment-known F31) | true | n/a | PASS | SR FINAL BINDING  10 / 10 / TOTAL             45 / 46  ·  fail 1 / replay units 114 · admitted 101 · unique 101 · Σ101 · |
| TC_V1_REPLAY_UNCHANGED | TC V1 candidate | true | true | PASS |  }, /  "deterministic": true / } |
| TC_V1_TESTS_UNCHANGED | TC V1 candidate | true | n/a | PASS | {"PASS":32} |
| TC_V2_REPLAY_UNCHANGED | TC V2 candidate | true | true | PASS |  }, /  "deterministic": true / } |
| TC_V2_TESTS_45 | TC V2 candidate | true | n/a | PASS | {"PASS":45} |
| TC_V3_REPLAY_43 | TC V3 final candidate | true | true | PASS |   "deterministic": true /  } / } |
| TC_V3_TESTS_54 | TC V3 final candidate | true | n/a | PASS | {"PASS":54} |
| G53_LIVE_RUNNER_REFUSAL_NO_ANCHOR | No paid API / G53 | true | n/a | PASS | LIVE_NOT_EXECUTED_G53_ACTIVE · NO_APPROVAL_ANCHOR · AUTHORIZATION/CG1_APPROVAL_ANCHOR.json absent — no CEO approval for  |
| G53_EXEC_COPY_REFUSAL_AFTER_EXPIRY | No paid API / G53 | true | n/a | PASS | LIVE_NOT_EXECUTED_G53_ACTIVE · ANCHOR_NOT_ACTIVE · EXPIRED |

- Frozen Vision verify_release: R1 PASS · R2 PASS · R3 PASS · R4 PASS · R5 PASS · R6 PASS · R7 PASS · R8 PASS · R9 PASS.
- Full-Look SR release FLSR_FINAL_V1 verify_release: V1 PASS · V2 PASS · V3 PASS · V4 PASS · V5 PASS · V6 PASS · V7 PASS · V8 PASS · V9 PASS · V10 PASS.
- **Environment-known (not a scoring regression):** Item SR 45 / 46 (F31 environment assertion — pre-existing, recorded in the SR freeze packages) — failing line:   FAIL  F31  TC remains not started (no STMX_TC_* engine workspace in ITEM_SCORING_ENGINE; Style engine tree ≡ pre-order aggregate).

## V2 → V3 difference classification

| class | looks |
|---|---|
| INTENDED_CORRECTION | 9 |
| UNCHANGED | 34 |

SEMANTIC_REGRESSION 0 · TECHNICAL_REGRESSION 0 · KNOWN_LIMITATION (no direction change; limitations are documented in D2 §14). Detail: D3 / D4.

## V3 development tests

| group | tests | PASS |
|---|---|---|
| A | 10 | 10 |
| R | 15 | 15 |
| G | 12 | 12 |
| P | 8 | 8 |
| E | 7 | 7 |
| D | 2 | 2 |

Total {"PASS":54} (order §7.2: A01 … A10 = the 9 V2-unresolved looks + REF_000622 packet-structure test; R01 … R15 = the 15 required tests; §7.3 guards = G01 … G12).

## Production dependency isolation

- Traced closure (`_raw/manifests/w6_dependency_closure.json`): every file the runtime loads or hashes; 33 dependency files + 7 runtime src in `RT/`; 0 reads after load.
- Release V4 isolation (fresh process): 87 file accesses · outside 0.
- The production path reads no V1 / V2 candidate, research script, GT, reference master, register, look id or network module (tests G09 · RT13 · V9).

## No paid API / G53

- G53_LIVE_RUNNER_REFUSAL_NO_ANCHOR: exit 3 · LIVE_NOT_EXECUTED_G53_ACTIVE · NO_APPROVAL_ANCHOR · AUTHORIZATION/CG1_APPROVAL_ANCHOR.json
- G53_EXEC_COPY_REFUSAL_AFTER_EXPIRY: exit 3 · LIVE_NOT_EXECUTED_G53_ACTIVE · ANCHOR_NOT_ACTIVE · EXPIRED
- 0 API calls in this order; no credential read or printed.

## Architecture Guard audit (order §13)

Existing guards cover the invariants: cross-axis AEMS note (2026-10-24: no routine UNKNOWN / UNRESOLVED; missing facts never filled; input failures separate), Full-Look TC Product-Only note (2026-10-23: no styling path), TC REOPEN rule for Item TC, G42 · G53. **One new invariant** is added (append-only): the Full-Look TC Direction release `FLTC_FINAL_V1` is FROZEN — never rebuilt in place; Classic only on observed Classic support; any change needs a governed Full-Look TC reopen.
