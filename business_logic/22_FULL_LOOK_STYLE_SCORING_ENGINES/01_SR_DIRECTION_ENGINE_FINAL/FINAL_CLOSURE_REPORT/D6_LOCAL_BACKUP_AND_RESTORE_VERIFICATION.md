# D6 — Local Backup & Restore Verification

| item | value |
|---|---|
| capsule | C:\STMX_UPLOAD\FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025\ |
| convention | same as the Full-Look Vision final backup (C:\STMX_UPLOAD\FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017\); no Item Scoring Engine capsule reused |
| content | FLSR_FINAL_V1/ (frozen release incl. seal) · FINAL_FREEZE_AUTHORITY/ · QA_EVIDENCE/ · DEVELOPMENT_SOURCE/ (R4 candidate + 41 dev tests) · GOVERNANCE/ (order · design review · D2) · FINAL_CLOSURE_REPORT/ (CEO DOCX + D-docs, added by finalize) · 00_START_HERE.md · BACKUP_MANIFEST.json · BACKUP_SHA256SUMS.txt |
| excluded | credentials · secrets · caches · scratch · the CG-1 Vision candidate · research packages · CEO GT registers |
| build file count | 253 (before FINAL_CLOSURE_REPORT/ is added) |
| build manifest sha256 | ab9fe8a0ef4efd3f44443d76f3e8a10a0687ff0147a36fe9e589f86a18650b62 |

## Checks (build)

| check | what | result | evidence |
|---|---|---|---|
| B-1 | census | PASS | 253 files on disk · manifest file_count 253 · 7465198 bytes |
| B-2 | manifest hash verification | PASS | mismatched 0 · unlisted 0 |
| B-3 | production = backup identity | PASS | 219 release files identical to production (incl. seal) · differing 0 |
| B-4 | path length (Windows MAX_PATH 260) | PASS | longest absolute path 218 |
| B-5 | dependency completeness | PASS | 13 pinned dependencies present + hash-equal in the capsule |
| B-6 | clean-room restore | PASS | restored 219 files to C:/Users/lukek/AppData/Local/Temp/claude/C--work-STMX-STMX-project-master-files-STMX-EI-TC-SR-DM-master/d52cd3cb-be5a-44f7-aee2-f65ecae03cc9/scratchpad/restore_from_backup/ · byte-identical true |
| B-7 | release verification on the restored copy | PASS | V1 PASS · V2 PASS · V3 PASS · V4 PASS · V5 PASS · V6 PASS · V7 PASS · V8 PASS · V9 PASS · V10 PASS |
| B-8 | rollback rehearsal | PASS | pointer withdrawn on a scratch copy; restored release still RELEASE_VERIFIED; master pointer + release unchanged |
| B-9 | no credential / secret / key material | PASS | clean (253 files scanned) |

After the CEO report and D-documents are written, `z11_backup.js finalize` adds them to `FINAL_CLOSURE_REPORT/`. It then rebuilds the manifest and re-runs B-1 · B-2 · B-3 · B-4 · B-9. Final values: `_raw/manifests/z11_backup.json` (`final_file_count` · `final_manifest_sha256`), also stated in the CEO report and the closing message.

**SR_LOCAL_BACKUP = VERIFIED.**
