# STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V4_CANDIDATE

**Status:** CANDIDATE · SHADOW · NOT FROZEN · NOT PRODUCTION (STMX TC MAINLINE V2.3.86 · 2026-09-27)

> Approval Anchor — CEO Decision 2026-09-27 (V2.3.86 §2: D-85-1 APPROVED · D-85-3 APPROVED). Reason: implement the frozen Strong-shoulder clarification and the scoring-object membership correction on the Direction path. Affected Scope: this directory (new). Successor V3, V2, the frozen Step 2 evaluator and every sealed runtime stay byte-identical.

## What it is

Successor V3 (GRC · WG · MC1, unchanged) plus two contract rules (`STEP2_SUCCESSOR_V4_CONTRACT.json`):

| rule | effect | authority |
|---|---|---|
| SHC | on JACKET:Tailored / COAT:Tailored an observed `shoulder_structure = Strong` is withheld from the frozen silhouette predicate's morphology eligibility; Extreme and every other key unchanged | D-85-1 · `CURRENT_CONSTITUTION/STMX_TC_STRONG_SHOULDER_CLARIFICATION_FREEZE_V1.md` |
| SOR | an anchor listed in the sealed scoring-object record forms its unit from the recorded member only; other garments stay as context | D-85-3 · `STMX_TC_SCORING_OBJECT_CORRECTION_V1_CANDIDATE` |

Not implemented: the REF_000430 relational sleeve realization (V2.3.86 §15 STOP — no governed representation or rule exists). No sleeve / cuff rule exists in this successor.

| file | role |
|---|---|
| `STEP2_SUCCESSOR_V4_CONTRACT.json` | contract (written before the source) |
| `BOUND_INPUTS_STEP2_SUCCESSOR_V4.json` | hash-pinned inputs (21) |
| `src/step2_semantic_successor_v4.js` | successor (derived verbatim from V3 + SHC + SOR) |
| `shadow/step2_successor_shadow_binding_v3.js` | shadow binding (derived from binding V2; the frozen-Step-3 proof uses the historical unit aggregation) |
| `tests/` | V4 fixtures · runner (V4 · V3 · 09A suites · SOR unit tests · equivalence with V3 · scans) |

Equivalence: with SHC and SOR inactive the chain output equals successor V3 (`41aed0d3…`).
