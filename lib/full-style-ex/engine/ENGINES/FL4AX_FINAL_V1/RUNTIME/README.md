# STMX Full-Look Four-Axis Integrated Scoring Runtime V1 — CANDIDATE

> CANDIDATE — becomes the frozen release `FL4AX_FINAL_V1` only after validation. Order: FULL_LOOK_FOUR_AXIS_INTEGRATION (CEO 2026-10-29).
> Governance package: `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_FOUR_AXIS_INTEGRATION_FINAL_FREEZE_AND_FOLDER_BACKUP_V1/`.

This is an **orchestrator, not a fifth scorer.** It binds the four Final Frozen Full-Look Direction releases read-only and never changes their scoring:

- `FLEI_FINAL_V1` (EI: E / I)
- `FLTC_FINAL_V1` (TC: T / C)
- `FLSR_FINAL_V1` (SR: S / R)
- `FLDM_FINAL_V1` (DM: D / M)

It binds each release by seal, manifest and runtime-fingerprint SHA-256 (`src/fl4ax_pins_v1.json`), verified at load and fail-closed.

## Entry points

```javascript
const R = require('./src/fl4ax_integrated_runtime_v1.js');
R.scoreFullLook({ packet, run_record })        // the Frozen Vision Extractor output for one look
R.fromExtractorOutputDir(dir)                  // dir holding packet.json + run_record.json
R.resolveStyleId(ei, tc, sr, dm)               // 'ETSD' … 'ICRM' (16); labels or letters
```

```
node cli/score_full_look.js <packet.json> <run_record.json>   (or --dir <dir>)
node cli/replay_corpus.js <dir of look folders> [--json]
node cli/resolve_style_id.js E C S M      |   --all
node tests/run_tests.js
```

## Result

`STMX_FULL_LOOK_FOUR_AXIS_RESULT_V1` contains:

- `status` — COMPLETE | INPUT_FAILURE | CONTRACT_VIOLATION
- `style_id` — null unless COMPLETE
- `directions` (EI / TC / SR / DM letters)
- `axes` — per axis: status, direction, label, rule, input_failure, reason_ko, engine
- `reason_ko`
- `provenance`
- `diagnostics` (non-scoring)
- `engine_records` (verbatim)

Rules:

- **COMPLETE** means all four engines returned a binary Direction.
- **INPUT_FAILURE** means at least one engine returned its governed input failure. That is not a style result, so no Style ID is produced and no Direction is ever filled.
- **CONTRACT_VIOLATION** means an engine output fell outside its frozen contract.

Korean Reasons:

- The DM reason is passed through verbatim from the frozen DM engine.
- The EI, TC and SR Korean lines name the Direction and the frozen rule id. Their English evidence basis stays verbatim in `engine_records`.

## Locating the engines

`src/fl4ax_bindings_v1.js` uses the nearest ancestor directory that contains `FLEI_FINAL_V1`, or the environment variable `FL4AX_ENGINES_ROOT`. Deterministic · GT-blind · no network.
