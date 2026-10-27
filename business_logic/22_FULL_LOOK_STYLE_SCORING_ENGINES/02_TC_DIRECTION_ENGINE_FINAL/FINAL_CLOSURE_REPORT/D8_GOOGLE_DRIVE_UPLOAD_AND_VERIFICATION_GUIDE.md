# D8 — Google Drive Upload & Verification Guide

> Order §12. Drive access check (`_raw/manifests/w12_drive_detection.json`): drives C: · DriveFS "none" · Drive process false · CLI "none" → **NO_DIRECT_DRIVE_ACCESS**. No upload was attempted or claimed.

| item | value |
|---|---|
| local folder (upload this one folder) | C:\STMX_UPLOAD\02_TC_DIRECTION_ENGINE_FINAL\ |
| Drive destination | 22_FULL_LOOK_STYLE_SCORING_ENGINES/02_TC_DIRECTION_ENGINE_FINAL/ (the folder itself becomes 02_TC_DIRECTION_ENGINE_FINAL) |
| upload method | Drive web → 22_FULL_LOOK_STYLE_SCORING_ENGINES → New → Folder upload → select 02_TC_DIRECTION_ENGINE_FINAL (not a ZIP) |
| expected file count after upload | 236 (= BACKUP_MANIFEST.json file_count after finalize) |
| total size | see BACKUP_MANIFEST.json total_bytes (listed files) and the closing report |
| Final Freeze Seal | FLTC-FINAL-FREEZE-V1-2026-10-25 · file FLTC_FINAL_V1/FINAL_FREEZE_SEAL.json · sha256 abd275133a9cd98947611eef09e242d1386296ad691d90ddf96d5c287f7c7da4 |
| Release Manifest sha256 (full) | 8085f8bbf649fe4d6032b68790e084ad5c7c9f995b39a7989a930d81a6a888d0 |
| Backup Manifest sha256 | final value recorded in `_raw/manifests/w15_qa.json` and the closing report (read from the file; this guide is inside the folder, so it cannot contain its own manifest hash) |
| sibling folder | 01_SR_DIRECTION_ENGINE_FINAL — leave unchanged |

## CEO checklist after upload

- [ ] Drive shows `22_FULL_LOOK_STYLE_SCORING_ENGINES/02_TC_DIRECTION_ENGINE_FINAL/`;
- [ ] the Drive file count equals 236;
- [ ] `FLTC_FINAL_V1/FINAL_FREEZE_SEAL.json`, `FLTC_FINAL_V1/RELEASE_MANIFEST.json`, `BACKUP_MANIFEST.json`, `SHA256SUMS.txt` are present;
- [ ] optional: download `FLTC_FINAL_V1/RELEASE_MANIFEST.json` and check its SHA-256 = `8085f8bbf649fe4d6032b68790e084ad5c7c9f995b39a7989a930d81a6a888d0`;
- [ ] tell Claude the Drive path and file count → `TC_GOOGLE_DRIVE_BACKUP` is recorded from your confirmation (Claude cannot see Drive).

Until then: `TC_GOOGLE_DRIVE_BACKUP = PENDING_ACTUAL_UPLOAD_VERIFICATION` · `TC_WORKSTREAM = BACKUP_GATE_PENDING`. EI does not start.
