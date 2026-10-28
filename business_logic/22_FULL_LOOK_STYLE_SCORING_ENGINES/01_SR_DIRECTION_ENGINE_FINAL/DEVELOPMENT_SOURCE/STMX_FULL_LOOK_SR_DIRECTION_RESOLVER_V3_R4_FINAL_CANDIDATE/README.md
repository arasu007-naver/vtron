# STMX FULL-LOOK SR DIRECTION RESOLVER V3_R4 — FINAL CANDIDATE

**Status:** source of the Full-Look SR Direction Engine V1 production release (`STMX_FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_V1`). This directory is the development candidate; the release bundles it unchanged.

**Governance:** `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/`.

**Base:** V3_R3, unchanged and pinned by its manifest hash.

## What changed versus V3_R3

1. **The SRB-2g cell is split** (order 2026-10-25 §4). The cell is Oversized + Strong / Extreme shoulder + Structured shape.
   - **SRB-2os** → STRUCTURED. Condition: waist **Defined** (shaped by the garment itself) **and** shoulder not **Dropped** — the construction governs from the frame through the body.
   - **SRB-2or** → RELAXED. Condition: anything else (waist Undefined / Cinched / not observed, or shoulder Dropped) — the strong release governs.
   - Basis: FL-SR-C1 (CEO 2026-10-17: realized silhouette decides; strong release not cancelled by cinching; belt ≠ silhouette control) · Item CEO §3 (oversized + dropped shoulder → release dominates) · Frozen Item admission (a Defined waist preserves structure under release) · SR-06 (Full-Look does not copy Item R2).
   - All are read from pinned sources at load (fail-closed).
2. **Output authority field.** It carries the constitution identity `STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4`; release status lives in the production pointer and the freeze seal.
3. **Lane A loads lazily.** SR V2 is used for comparison only, and the lane-B production path loads no V2 code or research script (test T41).

Unchanged: MS-1 mandatory scoring · CG-1 retired · every other row · input adapter (byte copy) · ECC_V3 (validation only).

## Results (no API calls)

| dataset | coverage | CEO anchors |
|---|---|---|
| 43 sealed packets MODE A | 42 / 42 S/R (S16 / R26) | 3 / 4 (miss: M320) |
| 43 MODE B (ECC_V3, validation) | 42 / 42 (S16 / R26) | 3 / 4 |
| 20 stored live responses | 20 / 20 (S3 / R17) | 5 / 8 runs (misses: M320 ×3) |
| CEO Item GT proxy | 49 / 49 | 44 / 49 |

M317 and M320 have the same admissible inputs except Extreme vs Strong, a prohibited proxy. The M320 miss is an irreducible information collision, not a rule defect.

## Run

```
node cli/run_offline_replay.js
node tests/run_tests.js validation/sr_v3_r4_tests.json      → {"PASS":41}
```
