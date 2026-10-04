# Garment Vision Extraction Engine — CURRENT DEVELOPER SNAPSHOT

**Status:** `CURRENT DEVELOPER SNAPSHOT`   ·   **Snapshot date:** 2026-09-07

**Current Producer:** `STMX_VISION_PRODUCER_V1_1`

> The authoritative engineering Source of Truth remains the governed STMX repository and project context. This Google Drive export is a **developer share and safety snapshot** — a copy, not a new mutable authority root.

> This folder is a **Developer Share / Safety Snapshot**. It is **NOT** a new authority replacing the repository Source of Truth.

## Entry point

```text
CURRENT/ITEM_VISION_EXTRACTOR/index.js    the public entry of the Producer line
                                  runProducer · governTarget · validateRecord · buildPrompt · runOneCall
CURRENT/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_1/producer_controller_v1.js
                                  runProducer for the CURRENT V1.1 line
```

★ `CURRENT/ITEM_VISION_EXTRACTOR/` mirrors the repository directory verbatim, so every relative require resolves exactly as it does in the repository. ⛔ `index.js` resolves the **Producer V1 line** modules that sit beside it. The **current** line for EI Direction V1.2.7 is `STMX_VISION_PRODUCER_V1_1`, whose controller is the entry for that line. Both are exported, because current version routing resolves both — see *Two Producer lines* below.

## Current Producer version

```text
STMX_VISION_PRODUCER_V1_1
```

Declared module closure (5 modules, self-contained):

- `producer_rules_v1.js`
- `producer_prompt_v1.js`
- `producer_validator_v1.js`
- `producer_controller_v1.js`
- `producer_model_adapter_v1.js`

## Dependency closure

Followed from the actual `require` graph, not from filenames:

```text
V1.1 controller closure : 5 local modules · no external dependency · missing 0
root index.js closure   : 6 local modules · no external dependency
colour authority        : 1 module
model invocation        : 1 module · external: fs, path (Node built-ins)
```

Declared closure vs actual requires: **declared-but-unreached 0 · reached-but-undeclared 0**.

**External standard dependencies:** Node built-ins only (`fs`, `path`). ⛔ No npm package is required to run the Producer closure.

## Two Producer lines — deliberate, not duplication

```text
producer_*_v1.js (siblings of index.js)  → bound by the SEALED EI Direction runtime V1.2.6
STMX_VISION_PRODUCER_V1_1/               → bound by the FROZEN EI Direction runtime V1.2.7
```

The V1.1 contract states explicitly that it **does not supersede** the sealed Producer V1. Version routing is deterministic and fail-closed, and resolves each runtime line to its own Producer. Both are exported so a developer can see the whole routing picture.

## Governed observation added in V1.1

```text
treated_surface_realization = Baseline | Distressed
```

Per-value metadata on the `surface` value `Treated Surface` — **not** a new parameter (the count stays 37). Value-level eligibility, and a missing value is `NOT_GOVERNED`, never silently `Baseline`.

## Output contract overview

The Producer emits observations only — **Observation ≠ Consumption**. Model invocation is injected via `opts.visionFn`, so the Producer is model-agnostic. The validator enforces the governed domains, including the Treated Surface realization gate.

## Run instructions

```bash
# from the repository (authoritative location):
cd 01_ENGINES/ITEM_VISION_EXTRACTOR
node -e "const p=require('./STMX_VISION_PRODUCER_V1_1/producer_controller_v1.js'); console.log(Object.keys(p))"
```

⛔ A live extraction needs a model function (`CURRENT/run/anthropic_vision_fn.js`) and a credential supplied **through the environment**. No credential is stored in this export.

## Test instructions

```bash
cd 01_ENGINES/ITEM_VISION_EXTRACTOR
node tests/<suite>.js        # exported under CURRENT/ITEM_VISION_EXTRACTOR/tests/
```

## Original authoritative repository paths

```text
01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_1/     current Producer closure + contract
01_ENGINES/ITEM_VISION_EXTRACTOR/index.js                       entry point
01_ENGINES/ITEM_VISION_EXTRACTOR/producer_*_v1.js               sealed Producer V1 line
01_ENGINES/ITEM_VISION_EXTRACTOR/run/anthropic_vision_fn.js     model invocation
01_ENGINES/ITEM_VISION_EXTRACTOR/run/color_recovery/color_contract_v1.js   Colour V1 authority
01_ENGINES/ITEM_VISION_EXTRACTOR/tests/                         test suites
```

⛔ These are documentation of the original location only — they are not paths this export resolves at runtime.

## Manifest and hashes

`PACKAGE_MANIFEST.json` / `PACKAGE_MANIFEST.md` in this folder, and the export-wide
`STMX_GOOGLE_DRIVE_EXPORT_MANIFEST.json` at the export root. Every authoritative copy records both its source and its exported SHA-256, and they are equal.
