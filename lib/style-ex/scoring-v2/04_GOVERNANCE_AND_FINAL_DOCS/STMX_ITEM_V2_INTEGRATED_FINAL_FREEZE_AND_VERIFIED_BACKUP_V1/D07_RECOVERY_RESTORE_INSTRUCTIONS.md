# D07 — Recovery / Restore Instructions

1. Backup: `C:/STMX_UPLOAD/05_INTEGRATED_ITEM_SCORING_RUNTIME_V2/` (master-relative layout; read `START_HERE_KO.md`).
2. Verify anywhere (Node.js 18+, no repository): `node RECOVERY/verify_backup.js` → last line `BACKUP_VERIFIED`.
3. Restore into the repository: copy each file back to the same master-relative path. If a file already exists, compare sha256 first — never overwrite a differing file.
4. Run the release (offline): `require("01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item_v2_r4/item_v2_r4_entry.js").createItemV2R4Runtime().scoreItemV2R4({ vision_envelope, image_sha256, user_selection, target_colour_packet })`.
5. Live Vision / colour acquisition (`fq_live_runner_GATED_V2.js`) needs a NEW CEO-approved G53 exception — none is authorised.
6. Rollback: do not call R4; the sealed R3 and earlier capsules keep working; production (Item Scoring Engine V1) is unchanged.
