# 12 · Vision Runtime (Pointer Scaffold)

> Position only. No Vision runtime implementation in Sprint 1.

**Responsibility:** Executes the Vision prompt against an image, returns raw Vision JSON.

## Existing asset pointers
- Vision Prompt builder: `stmx_engine_latest.js` ~L7400–8394. **DO NOT MODIFY.**
- Vision raw JSON sample: `STMX_VISION_STABILITY_REGRESSION_v1_8_5.json`.
- Enum validation (Vision output): `stmx_engine_latest.js` L8397+ (`VALID_*`).

## Migration status
Not started. **Do NOT implement Vision runtime, do NOT connect production Vision.**

## Missing specification
- Vision Runtime Contract — NOT FOUND (logic currently embedded in engine, no standalone spec).
