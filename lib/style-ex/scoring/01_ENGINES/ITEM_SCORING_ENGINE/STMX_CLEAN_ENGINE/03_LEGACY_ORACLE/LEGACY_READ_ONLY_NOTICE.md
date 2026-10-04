# 03 · Legacy Oracle — READ ONLY

> **The Legacy engine is the behavioral ORACLE. It is READ-ONLY. Never modify, rename, or move it.**

## What lives here (by pointer — originals stay in place)
- Engine: `stmx_engine_latest.js` (root; mirrors in `_LATEST/`, `STMX_CANONICAL_MASTER_PACK/`).
- Vision Prompt: embedded in the engine (~L7400–8394). **DO NOT MODIFY.**
- Canonical Dictionary, Frozen Decisions, ADR, regression JSON, calibration reports.

## Rules
- Original untouched (no edit / rename / move).
- Not mixed with Clean code (`04_CLEAN_ENGINE_CODE/`).
- Clean engine never `require()`s Legacy in Sprint 1.
- Use pointer/manifest + checksum baseline (recommended) rather than duplicate copies.

## Role in Migration
Legacy = oracle for Shadow equivalence (Track C). Wired in only in a later Migration Track,
never modified. Clean must reproduce Legacy behavior (or CEO-approved improvement), proven by
Shadow + Golden Regression, before Production Cutover.
