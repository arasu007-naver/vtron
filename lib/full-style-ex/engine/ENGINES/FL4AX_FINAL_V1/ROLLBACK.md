# Rollback / restore — FL4AX_FINAL_V1

**Rollback:** the release is additive. Stop referencing `FL4AX_FINAL_V1` / the pointer `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_FOUR_AXIS_INTEGRATED_RUNTIME_AUTHORITY_V1.json`. The four axis releases, the integration candidate and the Full-Look Vision Extractor stay unchanged and keep working on their own.

**Restore:** copy `FL4AX_FINAL_V1` and the four sibling releases (FLEI_FINAL_V1 · FLTC_FINAL_V1 · FLSR_FINAL_V1 · FLDM_FINAL_V1) into one directory; run `node FL4AX_FINAL_V1/verify_release.js --out <dir>` → RELEASE_VERIFIED.

A correction requires a governed reopen decision and a new versioned successor — never an in-place edit of this release.
