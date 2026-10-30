# STMX_FULL_LOOK_FOUR_AXIS_INTEGRATION_CONTRACT_V1

> Integration contract executed by `FL4AX_FINAL_V1` (release `STMX_FULL_LOOK_FOUR_AXIS_INTEGRATED_FINAL_V1`). CEO order 2026-10-29 (sha256 `7e45c6c4c06c12dd…`). Orchestration only — introduces no scoring rule.

## 1. Object

One worn look (the Frozen Full-Look Vision Extractor output: `packet.json` + `run_record.json`) → four binary Directions (EI · TC · SR · DM) from the four Final Frozen engines, a Style ID, Korean reasons, provenance and diagnostics. **Not a fifth scorer.**

## 2. Bound engines (read-only, pinned by sha256)

| axis | release | release id | seal id | seal sha256 | call |
|---|---|---|---|---|---|
| EI | FLEI_FINAL_V1 | STMX_FULL_LOOK_EI_DIRECTION_ENGINE_FINAL_V1 | FLEI-FINAL-FREEZE-V1-2026-10-26 | 56d6509a8be89eeb… | score(packet, run_record) |
| TC | FLTC_FINAL_V1 | STMX_FULL_LOOK_TC_DIRECTION_ENGINE_V1 | FLTC-FINAL-FREEZE-V1-2026-10-25 | abd275133a9cd989… | score(packet, run_record) |
| SR | FLSR_FINAL_V1 | STMX_FULL_LOOK_SR_DIRECTION_ENGINE_V1 | FLSR-FINAL-FREEZE-V1-2026-10-25 | 83c1e65a7cb4bc2f… | score(packet, run_record) |
| DM | FLDM_FINAL_V1 | STMX_FULL_LOOK_DM_DIRECTION_ENGINE_FINAL_V1 | FLDM-FINAL-FREEZE-V1-2026-10-29 | 2799b7a232c96a82… | score(packet) |

Binding verifies each release seal, manifest and runtime fingerprint before loading its entry; any mismatch / missing file → `RUNTIME_DEPENDENCY_MISSING` or `BINDING_VERIFICATION_FAILED` (fail-closed, no fallback engine, no partial binding). Each engine receives its own deep copy of the input.

## 3. Normalisation (per axis)

| axis | engine output | integrated |
|---|---|---|
| EI | RESOLVED · EXPRESSIVE / INTROVERT | E / I |
| TC | RESOLVED · TRANSFORMATIVE / CLASSIC | T / C |
| SR | RESOLVED · STRUCTURED / RELAXED | S / R |
| DM | SCORED · D / M | D / M |
| EI / TC / SR | TECHNICAL_EXCEPTION, direction null | INPUT_FAILURE (code · class kept) |
| DM | INPUT_FAILURE, direction null | INPUT_FAILURE |
| any | anything else (Neutral, unknown status, wrong axis, throw) | CONTRACT_VIOLATION |

## 4. Status and Style ID

- `COMPLETE` — all four axes returned a Direction → `style_id = EI + TC + SR + DM` letters, one of the 16 canonical IDs (order EI → TC → SR → DM, Direction-Code contract `direction_code_contract_v1.js`, CEO 2026-09-28).
- `INPUT_FAILURE` — at least one axis returned its governed input failure → `style_id = null`; the failing axes are named; no letter is ever filled.
- `CONTRACT_VIOLATION` — an engine output outside its frozen contract → `style_id = null`.
- Final Neutral / UNKNOWN / UNRESOLVED: impossible by construction (`resolveStyleId` refuses any other value with `INVALID_DIRECTION_ENUM`).

## 5. Korean reasons

DM: the frozen DM `direction_reason`, verbatim. EI / TC / SR: a fixed sentence naming the Direction and the frozen engine rule id (their English evidence basis stays verbatim in `engine_records`). Input failure: the axis and the governed code. No look id, GT, score or number is generated.

## 6. Diagnostics

`diagnostics` and `engine_records` are non-scoring. The runtime reads no GT and calls no network.
