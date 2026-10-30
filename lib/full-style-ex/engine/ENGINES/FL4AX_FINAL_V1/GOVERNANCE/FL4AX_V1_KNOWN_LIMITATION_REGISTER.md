# STMX FULL-LOOK FOUR-AXIS INTEGRATED RUNTIME V1 — KNOWN LIMITATION REGISTER

> Release `STMX_FULL_LOOK_FOUR_AXIS_INTEGRATED_FINAL_V1` (`FL4AX_FINAL_V1`) · freeze `FL4AX-FINAL-FREEZE-V1-2026-10-29` · CEO order 2026-10-29 (sha256 `7e45c6c4c06c12dd…`).

## A. New integration errors

**None.** Direct vs integrated engine records are identical on 43 / 43 looks for each axis (172 / 172); contract violations 0; non-binary letters 0.

## B. Inherited from the frozen axis engines (accepted there, carried unchanged — not re-adjudicated here)

| id | source | look | axis | CEO / reference | integrated result | note |
|---|---|---|---|---|---|---|
| FL4AX-INH-EI-001 | FL-EI-LIM-F228-001 (FLEI_FINAL_V1) | F228 | EI | Expressive | Introvert | Accepted EI limitation of the frozen EI engine; F228 integrates as I (Style ID I…). |
| FL4AX-INH-SR-001 | FLSR_FINAL_V1 constitution V3_R4 (M317 / M320 irreducible error) | M320 | SR | Structured | Relaxed | Same admissible SR inputs as CEO-Relaxed M317; the only difference is a prohibited proxy. Integrates as …R…. |
| FL4AX-INH-DM-001 | FLDM-LIM-001 (FLDM_FINAL_V1) | F012 | DM | Detail | Minimal | Accepted DM limitation; integrates as …M. |
| FL4AX-INH-DM-002 | FLDM-LIM-002 (FLDM_FINAL_V1) | F472 | DM | Detail | Minimal | Accepted DM limitation; integrates as …M. |
| FL4AX-INH-DM-003 | FLDM-HIST-001 (FLDM_FINAL_V1) | F267 | DM | Neutral (historical) | Minimal | Historical record, not an error (binary scoring mandatory). |
| FL4AX-INH-TC-001 | FLTC_FINAL_V1 governed TECHNICAL_EXCEPTION NO_TC_PRODUCT_EVIDENCE | F033 | TC | — (not carried by the TC release) | INPUT_FAILURE (no TC Direction) | Governed engine input failure, not a style result: the look has no Style ID (status INPUT_FAILURE). The integration never fills a fallback letter. |
| FL4AX-INH-SR-002 | FLSR_FINAL_V1 governed TECHNICAL_EXCEPTION NO_UPPER_SR_EVIDENCE | REF_000622 | SR | — (not carried by the SR release) | INPUT_FAILURE (no SR Direction) | Governed engine input failure, not a style result: no Style ID (status INPUT_FAILURE). |

## C. Scope limitations

- Validation = the 43 stored development looks of the four releases (not an independent holdout). TC carries no CEO GT in its release; SR carries only the M320 anchor; EI carries a 4-look register (3 / 4); DM effective GT 40 / 42 binary.
- No live image → Style ID run was executed in this order (paid Vision API not authorized). The runtime consumes stored Frozen Vision outputs (packet + run_record).
- No consumer Style ID name / description registry exists; the release maps codes only.
- Consumer production deployment: NOT AUTHORIZED.

Reopen: a governed reopen decision of the affected axis (its own rule) or of the integration (new versioned successor) — never an in-place change of this release.
