# D7 — Backup Integrity & Restore Report

> Order §11. Folder `C:\STMX_UPLOAD\02_TC_DIRECTION_ENGINE_FINAL\` (= the Google Drive upload folder). Built by `_raw/w11_backup.js build` only after the seal; source `_raw/manifests/w11_backup.json`.

| check | what | result | evidence |
|---|---|---|---|
| B-1 | inventory · file count · relative paths | PASS | 225 files on disk · manifest file_count 225 · 8000032 bytes (listed files) |
| B-2 | SHA-256 of every file vs BACKUP_MANIFEST + SHA256SUMS | PASS | mismatched 0 · unlisted 0 |
| B-3 | production = backup identity · freeze seal · release manifest | PASS | 182 release files identical to production (incl. seal) · differing 0 · seal binds the backup RELEASE_MANIFEST true |
| B-4 | Windows path length (MAX_PATH 260) | PASS | longest absolute path 232 (C:/STMX_UPLOAD/02_TC_DIRECTION_ENGINE_FINAL/…) |
| B-5 | production runtime dependency completeness | PASS | 7 runtime src + 33 closure files present + hash-equal in the backup · missing / differing 0 |
| B-6 | clean-room restore outside the master repository | PASS | restored 182 files to the session scratchpad · byte-identical true |
| B-7 | release verification + golden replay + isolation on the restored copy | PASS | V1 PASS · V2 PASS · V3 PASS · V4 PASS · V5 PASS · V6 PASS · V7 PASS · V8 PASS · V9 PASS · V10 PASS · exit 0 · V4 87 file accesses · outside 0 |
| B-8 | rollback rehearsal | PASS | pointer withdrawn on a scratch copy; restored release still RELEASE_VERIFIED; master pointer + release unchanged; ROLLBACK.md present |
| B-9 | sensitive data / credential scan | PASS | clean (225 files scanned) |
| B-10 | repeat run identical and non-destructive | PASS | second build refused (exit 2) · folder byte-identical after the attempt (225 files) · SR folders 01_SR_DIRECTION_ENGINE_FINAL 262, FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025 262 |

Build-phase file count 225 (BACKUP_MANIFEST sha256 at build 918e8b78069858805ad2af5c7cedddd54ccec0f21a3f996f640f9b7ea859dfa9). `finalize` then adds 11 closure documents (FINAL_CLOSURE_REPORT/) and rebuilds the manifest → expected final count **236**; the final manifest hash is recorded by QA (`_raw/manifests/w15_qa.json`) and in the closing report, read from the file.

## Layout

| folder | content |
|---|---|
| FLTC_FINAL_V1/ | frozen release (byte-identical to production, seal included) |
| FINAL_FREEZE_AUTHORITY/ | freeze declaration + manifest + production pointer |
| QA_EVIDENCE/ | snapshots · authority audit · regression · accuracy audit · dependency closure · release build · clean rooms (+ disclosed run-1 defect) · gates · Drive detection · verify reports · V3 ledger + tests |
| SOURCE_AND_PROVENANCE/ | V3 final candidate source (not needed to restore) · V2 candidate manifest · V2 → V3 diff |
| GOVERNANCE/ | CEO order verbatim · design review · D2 |
| FINAL_CLOSURE_REPORT/ | D1 DOCX · README · D2 … D9 (added by finalize) |
| START_HERE_KO.md · BACKUP_MANIFEST.json · SHA256SUMS.txt | guide · file list · sha256 |

Not included by design: research images, temporary data, build caches, redirect copies, the V1 / V2 candidate directories (V2 identity carried by its manifest).

## Restore and rollback

- Restore: the backup's `FLTC_FINAL_V1/` copied to the session scratchpad (outside the master repository) and verified there with an empty environment (B-6 · B-7).
- Rollback rehearsal: a copy of the production pointer was set to WITHDRAWN in the scratchpad; the restored release still verified; the master pointer and release were unchanged (B-8). Procedure: `FLTC_FINAL_V1/ROLLBACK.md`.
- Repeat run: a second `build` is refused and leaves the folder byte-identical; `verify` is read-only (B-10).

```text
TC_LOCAL_FINAL_BACKUP = VERIFIED
```
