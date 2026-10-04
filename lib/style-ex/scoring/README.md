# STMX ITEM SCORING ENGINE V1 — FINAL BACKUP (R1)

> R1 supersedes the earlier local upload candidate ITEM_SCORING_ENGINE_V1_FINAL_BACKUP_20260927 (2026-09-27 documentation housekeeping: the ITEM_SCORING_ENGINE README and the Drive 20_ITEM_SCORING_ENGINES README corrected; no production file changed).

```text
Date:                     2026-09-27
Scope:                    four-axis Item Scoring composition (EI · TC · SR · DM)
Status:                   COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION PROMOTED
Not a scorer:             composition / version authority of four frozen axis engines
V1 manifest:              01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_SCORING_ENGINE_V1_MANIFEST.json
Final Freeze:             04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_ITEM_SCORING_ENGINE_V1_FINAL_FREEZE.md
Limitations:              04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_ITEM_SCORING_ENGINE_V1_FINAL_LIMITATION_REGISTER.md
Registry:                 01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/runtime/axis_binding_contracts.js (AXIS_BINDING_CONTRACTS_V5_PRODUCTION)
Item Entry:               01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item/item_entry_v1.js
```

The four axis engines keep their own independent final backups (20_ITEM_SCORING_ENGINES/01_EI · 02_TC · 03_SR · 04_DM). This capsule restores the V1 composition and carries every file the V1 Final Freeze replay reads, so it verifies on its own.

## Production authority
- EI `01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_ENGINE_PRODUCTION_AUTHORITY_V1.json` · TC `STMX_TC_ENGINE_PRODUCTION_AUTHORITY_V1.json` · SR `STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json` · DM `STMX_DM_ENGINE_PRODUCTION_AUTHORITY_V1.json` (+ adapter `STMX_DM_ITEM_ENTRY_ADAPTER_V1_CANDIDATE`)
- `_CANDIDATE` directory names are historical physical names of production authorities — never rename them.

## Replay
```
node 04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SCORING_ENGINE_V1_FINAL_FREEZE_AND_PRODUCTION_PROMOTION/prototypes/replay_item_scoring_engine_v1_final_freeze.js <this-folder>
```
Exit 0 = FINAL_FREEZE_REPRODUCED (production path == standalone frozen axis on each governed population; V1 + freeze manifests; TC Final Freeze replay; GT deny-read 0).

## Restore
Copy the folders back to the STMX master root at the same relative paths (the layout is project-relative). Registry, Item Entry, Composer, contracts, pointers, seals and manifests are then in place; run the replay against the master root.

## Rollback
Final production → pre-promotion candidate: `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SCORING_ENGINE_V1_FINAL_FREEZE_AND_PRODUCTION_PROMOTION/prototypes/rollback_item_scoring_engine_v1_final_freeze.js <root> [--apply]` (bytes in prototypes/pre_promotion_bytes). Deeper (pre-integration): the candidate package rollback script.

## Limitations
L1 no real record with all four axes · L2 TC bounded / null · L3 no TC exact score · L4 no SR engine-level matched-pair result · L5 no arbitrary photo / new garment support · L6 legacy L1 / L2 off-path · L7 EI NO_FORCE invariant preserved (not new semantics).
