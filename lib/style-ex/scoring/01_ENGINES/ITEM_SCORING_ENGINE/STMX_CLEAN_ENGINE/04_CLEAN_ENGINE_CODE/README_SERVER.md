# STMX Clean Engine — Server Code (Sprint 1 Skeleton)

**Architecture:** `CLEAN_ARCHITECTURE_FREEZE_V1_0` (FROZEN) · **Migration:** `SPRINT_1_SKELETON`

> Skeleton only. NO scoring, governance, knowledge, or calibration logic. Every layer is a
> deterministic `NOT_IMPLEMENTED` stub. This is the **Migration Destination** for Legacy features.

## Structure
```
src/
├─ runtime/  packages.js · layer_interfaces.js · errors.js · runtime_skeleton.js
└─ layers/   l1_observation … l8_output   (8 stubs)
```

## Pipeline (Frozen, single direction)
`Image → L1 → L2 → L3 → L4 → L5 → L6 → L7 → L8 → Output`

Each layer: `(InputPackage) → OutputPackage` — read-only input (Immutable Upstream, `Object.freeze`),
returns its own empty package + `NOT_IMPLEMENTED`. Contracts validated at every hop
(`layer_interfaces.js`); a type mismatch is a **Hard Stop** (`CONTRACT_VALIDATION`).

## Run (Node, no dependencies)
```
node -e "console.log(require('./src/runtime/runtime_skeleton').run({}))"
```
Contract tests: `node ../07_REGRESSION/contract_tests.js`

## Guarantees
- No fabricated scores (L7 emits **no** default TC/SR/DM/EI=5).
- Empty knowledge → deterministic non-decision (L8 `decision_status = NOT_IMPLEMENTED`, empty payload).
- Same input → same output (deterministic; `run_id` is caller-supplied).
- No Production/Legacy import.

## Do NOT
Add scoring/threshold/floor/cap · new vocabulary/layer · mutate upstream packages ·
import Legacy or Production engine · fabricate decisions.
