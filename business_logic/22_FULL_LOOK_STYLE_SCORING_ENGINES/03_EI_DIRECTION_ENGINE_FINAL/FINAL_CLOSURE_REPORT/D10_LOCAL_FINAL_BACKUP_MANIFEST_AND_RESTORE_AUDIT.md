# D10 — Local Final Backup Manifest and Restore Audit

> STMX FULL-LOOK EI V1 — CONTROLLED FINAL FREEZE, KNOWN LIMITATION ACCEPTANCE & VERIFIED LOCAL / GOOGLE DRIVE BACKUP · 2026-10-26 · order `AUTHORIZATION/CEO_ORDER_VERBATIM.md` §10 · §14 Gate D · release `FLEI_FINAL_V1` · seal FLEI-FINAL-FREEZE-V1-2026-10-26 · 0 API calls (G53 active).

```text
LOCAL_BACKUP = VERIFIED
```

| item | value |
|---|---|
| folder | C:/STMX_UPLOAD/03_EI_DIRECTION_ENGINE_FINAL/ (FLTC convention: one folder = local final backup = Drive upload unit) |
| files at build | 201 (the finalize step adds FINAL_CLOSURE_REPORT/; final count in `_raw/manifests/q11_backup.json` after finalize) |
| BACKUP_MANIFEST.json sha256 at build | 5ba8a611b1e62a4ebf830e2ac8fe3fb2fe78c3038d0e6a12e966e1b6bb90743c |
| content | FLEI_FINAL_V1/ (exact frozen release incl. seal) · FINAL_FREEZE_AUTHORITY/ (declaration · manifest · limitation register · pointer) · QA_EVIDENCE/ · SOURCE_AND_PROVENANCE/ (V1_R3 candidate + V1 / R1 / R2 manifests) · GOVERNANCE/ (order · D2 · D4 · D5 · constitution) · FINAL_CLOSURE_REPORT/ · START_HERE_KO.md · BACKUP_MANIFEST.json · SHA256SUMS.txt |
| F228 discrepancy record | FLEI_FINAL_V1/GOVERNANCE/D4 + D5 · FINAL_FREEZE_AUTHORITY/…KNOWN_LIMITATION_REGISTER.md · START_HERE_KO.md warning |

## Checks at build

| check | requirement | result | evidence |
|---|---|---|---|
| B-1 | inventory · file count · directory count · size | PASS | 201 files on disk · manifest file_count 201 · 84 directories · 8542992 bytes (listed files) |
| B-2 | SHA-256 of every file vs BACKUP_MANIFEST + SHA256SUMS | PASS | mismatched 0 · unlisted 0 |
| B-3 | production = backup identity · freeze seal · release manifest (source-to-backup consistency) | PASS | 159 release files identical to production (incl. seal) · differing 0 · seal binds the backup RELEASE_MANIFEST true |
| B-4 | Windows path length (MAX_PATH 260) · no broken references | PASS | longest absolute path 232 (C:/STMX_UPLOAD/03_EI_DIRECTION_ENGINE_FINAL/…) |
| B-5 | production runtime dependency completeness | PASS | 5 runtime src + 9 closure files present + hash-equal in the backup · missing / differing 0 |
| B-6 | independent clean-room restore outside the master repository | PASS | restored 159 files to the session scratchpad · byte-identical true |
| B-7 | release verification + golden replay + isolation on the restored copy; restored 43 outputs = master-tree candidate outputs | PASS | V1 PASS · V2 PASS · V3 PASS · V4 PASS · V5 PASS · V6 PASS · V7 PASS · V8 PASS · V9 PASS · V10 PASS · exit 0 · restored = candidate 43 / 43 |
| B-8 | rollback rehearsal | PASS | pointer withdrawn on a scratch copy; restored release still RELEASE_VERIFIED; master pointer + release unchanged; ROLLBACK.md present |
| B-9 | sensitive data / credential scan | PASS | clean (201 files scanned) |
| B-10 | repeat run identical and non-destructive; earlier backup folders preserved | PASS | second build refused (exit 2) · folder byte-identical after the attempt (201 files) · other folders 01_SR_DIRECTION_ENGINE_FINAL 262, FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025 262, 02_TC_DIRECTION_ENGINE_FINAL 236, 01_EI 353 |

A ZIP alone was not the evidence. Verification is based on an independent restore (B-6), verify_release plus 43-case output identity on the restored copy (B-7), and a rollback rehearsal (B-8). The earlier SR / TC / Item EI upload folders were untouched (B-10).
