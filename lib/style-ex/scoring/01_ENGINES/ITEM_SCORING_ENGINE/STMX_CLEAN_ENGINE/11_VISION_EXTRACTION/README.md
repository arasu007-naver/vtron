# 11 · Vision Extraction (Pointer Scaffold)

> **Position only — no migration in Sprint 1.** Vision assets are NOT moved, copied, or modified.

**Responsibility:** Image → structured Vision observation JSON (`STMX Vision Observer v2.0`).

## Existing asset pointers (Source of Truth remains in place)
- Vision Prompt: `stmx_engine_latest.js` ~L7400–8394 (embedded). **DO NOT MODIFY.**
- Schema objects: body_visibility L7446 · garment_structure L7509 · category_observation L7691 · surface · tc_departure_evidence L8361.
- Prompt version marker: `[VISION_PROMPT_EVAL_ORDER — CEO 2026-07-03]` L7873.
- Category System: `STMX_CATEGORY_LAYER_CONSTITUTION_V1.md`.
- Canonical Dictionary: `STMX_CANONICAL_MASTER_PACK/00_MASTER/Canonical/STMX_CANONICAL_DICTIONARY.md`.

## Input/Output boundary
- Output → **L1 Observation** via `Vision → L1 Contract Draft` (see below).
- **Vision → L1 Contract Draft pointer:** `STMX_CLEAN_MIGRATION_SPRINT1_SPECIFICATION_COMPLETION_VISION_L1_V1_DRAFT.md`.

## Migration status
Not started. Boundary specified (crosswalk). Vision Prompt unchanged.

## Missing specification
- Vision Runtime Contract (spec) — NOT FOUND.
- Vision Package Contract — NOT FOUND.
- Vision API Contract — NOT FOUND.
