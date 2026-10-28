# D4 — Consolidated Regression Ledger

## 1. Original 43 looks (MODE A frozen packets; MODE B = ECC_V3 validation overlay, never merged)

|  | source looks | scorable | input failures | S | R | UNKNOWN / UNRESOLVED | NEUTRAL | with missing observations | sensitivity POSSIBLE |
|---|---|---|---|---|---|---|---|---|---|
| R4 MODE A | 43 | 42 | 1 (REF_000622 · NO_UPPER_SR_EVIDENCE — re-verified: no upper SR fact) | 16 | 26 | 0 | 0 | 27 | 5 |
| R4 MODE B | 43 | 42 | 1 | 16 | 26 | 0 | 0 | 8 | 0 |

CEO anchors (joined after prediction): MODE A {"cases":4,"resolved":4,"correct":3,"incorrect":1,"not_resolved":0} · MODE B {"cases":4,"resolved":4,"correct":3,"incorrect":1,"not_resolved":0}. R3 → R4 changed exactly the former SRB-2g looks: F298 · M317 · M320 (S → R). Every other look is identical (test T33).

| look | V2 lane A | V3 | R1 | R2 | R3 | R4 | R4 rule | missing | sensitivity | R4 MODE B | CEO | GT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F147 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | — | NONE | RELAXED | — | — |
| M269 | RELAXED | RELAXED | RELAXED | EXC:EVIDENCE_REPAIR_REQUIRED | RELAXED | **RELAXED** | SRB-2r | form_retention | POSSIBLE | RELAXED | — | — |
| F298 | UNRESOLVED:EVIDENCE_COLLISION | EXC:CONTRACT_GAP_CG1 | EXC:CONTRACT_GAP_CG1 | EXC:CONTRACT_GAP_CG1 | STRUCTURED | **RELAXED** | SRB-2or | — | NONE | RELAXED | RELAXED | MATCH |
| F390 | UNRESOLVED:MISSING_EVIDENCE | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | shape | NONE | RELAXED | — | — |
| M323 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-2m | waist | NONE | STRUCTURED | — | — |
| M178 | RELAXED | RELAXED | RELAXED | EXC:EVIDENCE_REPAIR_REQUIRED | RELAXED | **RELAXED** | SRB-2r | drop, waist, form_retention | POSSIBLE | RELAXED | — | — |
| M270 | RELAXED | RELAXED | RELAXED | EXC:EVIDENCE_REPAIR_REQUIRED | RELAXED | **RELAXED** | SRB-2r | form_retention | POSSIBLE | RELAXED | — | — |
| F187 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | — | NONE | STRUCTURED | — | — |
| F444 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | — | NONE | RELAXED | — | — |
| M303 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | form_retention | NONE | STRUCTURED | — | — |
| M320 | UNRESOLVED:EVIDENCE_COLLISION | EXC:CONTRACT_GAP_CG1 | EXC:CONTRACT_GAP_CG1 | EXC:CONTRACT_GAP_CG1 | STRUCTURED | **RELAXED** | SRB-2or | form_retention | NONE | RELAXED | STRUCTURED | CONFLICT |
| REF_000622 | UNRESOLVED:MISSING_EVIDENCE | EXC:UPPER_NOT_VISIBLE | EXC:UPPER_NOT_VISIBLE | EXC:UPPER_NOT_VISIBLE | EXC:NO_UPPER_SR_EVIDENCE | **EXC:NO_UPPER_SR_EVIDENCE** | NO_UPPER_SR_EVIDENCE | — | — | EXC:NO_UPPER_SR_EVIDENCE | — | — |
| F012 | UNRESOLVED:MISSING_EVIDENCE | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3g | shape, form_retention | NONE | STRUCTURED | — | — |
| F033 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | drop | NONE | RELAXED | — | — |
| F054 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | — | NONE | STRUCTURED | — | — |
| F065 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | — | NONE | RELAXED | — | — |
| F074 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | — | NONE | STRUCTURED | — | — |
| F109 | RELAXED | RELAXED | RELAXED | EXC:EVIDENCE_REPAIR_REQUIRED | RELAXED | **RELAXED** | SRB-2r | form_retention | POSSIBLE | RELAXED | — | — |
| F134 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3s | — | NONE | STRUCTURED | — | — |
| F146 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | — | NONE | RELAXED | — | — |
| F225 | UNRESOLVED:MISSING_EVIDENCE | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | shape | NONE | RELAXED | — | — |
| F228 | UNRESOLVED:MISSING_EVIDENCE | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | shape | NONE | RELAXED | — | — |
| F254 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-1 | form_retention | NONE | STRUCTURED | — | — |
| F258 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | — | NONE | STRUCTURED | — | — |
| F260 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | form_retention | NONE | RELAXED | — | — |
| F267 | UNRESOLVED:MISSING_EVIDENCE | EXC:EVIDENCE_REPAIR_REQUIRED | EXC:EVIDENCE_REPAIR_REQUIRED | EXC:EVIDENCE_REPAIR_REQUIRED | RELAXED | **RELAXED** | SRB-3r | shape, drop | POSSIBLE | RELAXED | — | — |
| F288 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-1 | — | NONE | STRUCTURED | — | — |
| F293 | UNRESOLVED:MISSING_EVIDENCE | EXC:EVIDENCE_REPAIR_REQUIRED | EXC:EVIDENCE_REPAIR_REQUIRED | EXC:EVIDENCE_REPAIR_REQUIRED | RELAXED | **RELAXED** | SRB-2r | shoulder, drop | NONE | RELAXED | — | — |
| F372 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-1 | — | NONE | STRUCTURED | — | — |
| F391 | UNRESOLVED:MISSING_EVIDENCE | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | shape | NONE | RELAXED | — | — |
| F392 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | — | NONE | RELAXED | — | — |
| F418 | UNRESOLVED:MISSING_EVIDENCE | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | shape, drop, constriction | NONE | RELAXED | — | — |
| F472 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | drop, waist | NONE | RELAXED | — | — |
| F563 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | — | NONE | RELAXED | — | — |
| M011 | UNRESOLVED:MISSING_EVIDENCE | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | shape | NONE | RELAXED | — | — |
| M120 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | waist | NONE | STRUCTURED | — | — |
| M134 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-1 | shape | NONE | STRUCTURED | — | — |
| M165 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | form_retention | NONE | RELAXED | — | — |
| M210 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | form_retention | NONE | STRUCTURED | — | — |
| M214 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-1 | waist | NONE | STRUCTURED | — | — |
| M308 | UNRESOLVED:APPROVAL_DEPENDENCY | STRUCTURED | STRUCTURED | STRUCTURED | STRUCTURED | **STRUCTURED** | SRB-3h | — | NONE | STRUCTURED | — | — |
| M309 | RELAXED | RELAXED | RELAXED | RELAXED | RELAXED | **RELAXED** | SRB-2r | form_retention | NONE | RELAXED | RELAXED | MATCH |
| M317 | UNRESOLVED:EVIDENCE_COLLISION | EXC:CONTRACT_GAP_CG1 | EXC:CONTRACT_GAP_CG1 | EXC:CONTRACT_GAP_CG1 | STRUCTURED | **RELAXED** | SRB-2or | form_retention | NONE | RELAXED | RELAXED | MATCH |

## 2. Stored 20 live responses (offline; R2 → R3 → R4)

| # | look | live Fit / shoulder / shape · drop · waist | R2 | R3 | R4 | missing | CEO |
|---|---|---|---|---|---|---|---|
| 1 | M317 | Oversized / Extreme / Structured · None · Undefined | RELAXED (SRB-2xr) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | — | RELAXED · MATCH |
| 2 | M317 | Oversized / Extreme / Structured · None · Undefined | RELAXED (SRB-2xr) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | form_retention | RELAXED · MATCH |
| 3 | M317 | Oversized / Extreme / Structured · None · Undefined | RELAXED (SRB-2xr) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | form_retention | RELAXED · MATCH |
| 4 | M320 | Oversized / Strong / Semi-Structured · UNKNOWN · Undefined | RELAXED (SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | drop | STRUCTURED · CONFLICT |
| 5 | M320 | Oversized / Strong / Structured · None · Undefined | RELAXED (SRB-2xr) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | form_retention | STRUCTURED · CONFLICT |
| 6 | M320 | Oversized / Strong / Semi-Structured · Dropped · Undefined | RELAXED (SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | form_retention | STRUCTURED · CONFLICT |
| 7 | F298 | Oversized / Extreme / Structured · None · Cinched | RELAXED (SRB-2xr) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | — | RELAXED · MATCH |
| 8 | F293 | Oversized / Mild / Structured · UNKNOWN · Undefined | RELAXED (SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | drop | — |
| 9 | F267 | Regular / None / Semi-Fluid · UNKNOWN · ABSENT | RELAXED (SRB-3r) | RELAXED (SRB-3r) | **RELAXED** (SRB-3r) | drop | — |
| 10 | M134 | Slim / None / UNKNOWN · None · ABSENT | STRUCTURED (SRB-1) | STRUCTURED (SRB-1) | **STRUCTURED** (SRB-1) | shape | — |
| 11 | M269 | Relaxed / Mild / Semi-Structured · None · Undefined | EXC:EVIDENCE_REPAIR_REQUIRED (SRB-2f/SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | form_retention | — |
| 12 | M270 | Relaxed / Mild / Structured · None · Undefined | EXC:EVIDENCE_REPAIR_REQUIRED (SRB-2f/SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | form_retention | — |
| 13 | M178 | Relaxed / None / Semi-Fluid · UNKNOWN · ABSENT | EXC:EVIDENCE_REPAIR_REQUIRED (SRB-2f/SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | drop, waist, form_retention | — |
| 14 | F109 | Relaxed / None / Semi-Fluid · Dropped · ABSENT | RELAXED (SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | — | — |
| 15 | M309 | Oversized / Strong / Structured · Dropped · Cinched | STRUCTURED (SRB-2xs) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | form_retention | RELAXED · MATCH |
| 16 | M323 | Oversized / Strong / Structured · None · Defined | STRUCTURED (SRB-2xs) | STRUCTURED (SRB-2g) | **STRUCTURED** (SRB-2os) | — | — |
| 17 | srcoat3 | Oversized / Strong / Structured · Dropped · Undefined | RELAXED (SRB-2xr) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | form_retention | — |
| 18 | srsuit2 | Oversized / Strong / Structured · None · Undefined | RELAXED (SRB-2xr) | STRUCTURED (SRB-2g) | **RELAXED** (SRB-2or) | — | — |
| 19 | srsuit1 | Oversized / Strong / Structured · None · Defined | STRUCTURED (SRB-2xs) | STRUCTURED (SRB-2g) | **STRUCTURED** (SRB-2os) | — | — |
| 20 | tcbalen1 | Oversized / None / Semi-Structured · Dropped · Undefined | RELAXED (SRB-2r) | RELAXED (SRB-2r) | **RELAXED** (SRB-2r) | — | — |

Anchor runs: R2 {"MATCH":4,"CONFLICT":4} · R3 {"CONFLICT":7,"MATCH":1} · **R4 {"MATCH":5,"CONFLICT":3}**.

- Every R4 miss is M320 (#4 · #5 · #6).
- Unrelated rules changed: 0.
- Sidecar ignored everywhere: true.
- Deterministic: true.
- Material-UNKNOWN runs (M269 · M270 · M178 and others) all return S/R.

## 3. Item-GT proxy holdout (CEO ITEM GT on the Item scoring object — diagnostic, NOT Full-Look GT)

| column | units | resolved | match | conflict | not resolved |
|---|---|---|---|---|---|
| R1 base | 49 | 42 | 38 | 4 | 7 |
| R3 | 49 | 49 | 44 | 5 | 0 |
| R4 | 49 | 49 | 44 | 5 | 0 |

R3 → R4 changes among binary units: none. Cell unit: STMX_B005_B5_03#SU1 Jacket waist Cinched drop None → R3 STRUCTURED · R4 RELAXED (SRB-2or) · CEO SR5 (NEUTRAL). R4 conflicts: B1-11::REF_000011#SU1 Jacket {"relation":"Oversized","shoulder":"None","shape":"Semi-Structured","drop":"Dropped","waist":null,"constriction":null} FR=true → RELAXED (SRB-2r) missing waist,constriction · CEO SR6 · STMX_B004_B4_06#SU1 Shirt {"relation":"Slim","shoulder":null,"shape":"Semi-Fluid","drop":"None","waist":null,"constriction":null} FR=false → STRUCTURED (SRB-1) missing shoulder,waist,constriction · CEO SR4 · B3-02::REF_000221#SU1 Shirt {"relation":"Oversized","shoulder":null,"shape":"Semi-Structured","drop":"Dropped","waist":null,"constriction":null} FR=false → RELAXED (SRB-2r) missing shoulder,waist,constriction · CEO SR6 · STMX_B005_B5_13#SU1 Shirt {"relation":"Regular","shoulder":null,"shape":"Semi-Structured","drop":"None","waist":null,"constriction":null} FR=false → STRUCTURED (SRB-3s) missing shoulder,waist,constriction · CEO SR4 · STMX_B007_B7_15#SU1 T-Shirt {"relation":"Regular","shoulder":null,"shape":"Semi-Fluid","drop":"None","waist":null,"constriction":null} FR=false → RELAXED (SRB-3r) missing shoulder,waist,constriction · CEO SR6.

## 4. Missingness and semantic guards

- R4 development tests: {"PASS":41}.
- 13,500 partial inputs → S/R.
- 378 omission variants on real packets:
  - 377 → S/R;
  - 1 is the "no upper SR fact" input failure;
  - the direction changed in 50 variants, reported as sensitivity.
- §6.5 guards: T08 · T09 · T10 · T11 · T12 · T13 · T37 · T39 · T40.

## 5. Protected regression (network-blocking preload)

| run | exit | expectation | reproduces sealed |
|---|---|---|---|
| FLV_RELEASE_VERIFY | 0 | true | — |
| ITEM_SR_FINAL_RUN_ALL | 1 | true | — |
| FL_SR_DIAGNOSTIC_K2 | 0 | true | true |
| FL_SR_DIAGNOSTIC_43_PACKETS | 0 | true | true |
| SR_V1_REPLAY_UNCHANGED | 0 | true | true |
| SR_V1_TESTS_UNCHANGED | 0 | true | — |
| SR_V2_REPLAY_UNCHANGED | 0 | true | true |
| SR_V2_TESTS_UNCHANGED | 0 | true | — |
| SR_V3_REPLAY_UNCHANGED | 0 | true | true |
| SR_V3_TESTS_UNCHANGED | 0 | true | — |
| SR_V3_R1_REPLAY_UNCHANGED | 0 | true | true |
| SR_V3_R1_TESTS_UNCHANGED | 0 | true | — |
| SR_V3_R2_REPLAY_43 | 0 | true | true |
| SR_V3_R2_TESTS | 0 | true | — |
| SR_V3_R3_REPLAY_UNCHANGED | 0 | true | true |
| SR_V3_R3_TESTS_UNCHANGED | 0 | true | — |
| SR_V3_R4_REPLAY_43 | 0 | true | true |
| SR_V3_R4_TESTS | 0 | true | — |
| VISION_CG1_CANDIDATE_TESTS | 0 | true | — |
| LIVE_RUNNER_REFUSAL_NO_ANCHOR | 3 | true | — |
| LIVE_EXEC_COPY_REFUSAL_AFTER_EXPIRY | 3 | true | — |
| TC_V2_TESTS_UNCHANGED | 0 | true | — |
| PROXY_HOLDOUT_R1_R2_R3_R4 | 0 | true | — |

Item SR 45 / 46 — F31 is a repository-state assertion from the SR freeze, not a scoring regression; Item SR was not patched. Frozen Vision verify_release: R1 PASS · R2 PASS · R3 PASS · R4 PASS · R5 PASS · R6 PASS · R7 PASS · R8 PASS · R9 PASS.
