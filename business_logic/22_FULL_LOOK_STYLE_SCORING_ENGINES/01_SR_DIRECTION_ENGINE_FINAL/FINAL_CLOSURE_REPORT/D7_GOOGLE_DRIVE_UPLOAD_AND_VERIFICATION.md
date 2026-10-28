# D7 — Google Drive Upload & Verification

**Status: `SR_GOOGLE_DRIVE_BACKUP = PENDING_ACTUAL_UPLOAD_VERIFICATION`.** Nothing has been uploaded. No Drive upload is claimed.

## Access detection (2026-10-25T00:48:36.104Z)

| probe | result |
|---|---|
| filesystem drives | C: only |
| DriveFS / Google Drive folders | none |
| GoogleDriveFS process | false |
| rclone / gdrive / gcloud / gsutil | none |
| Google Drive connector in this session | false |
| result | NO_DIRECT_DRIVE_ACCESS |

## Upload-ready capsule

| item | value |
|---|---|
| exact local path | C:\STMX_UPLOAD\FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025\ |
| intended Drive destination | the CEO's Full-Look scoring backup location — proposed: the same Drive parent as `FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017`, as a new sibling folder `FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025`. No existing Drive folder is assumed or claimed; do not overwrite other engine backups. |
| expected file count after upload | 262 (= BACKUP_MANIFEST.json `file_count` after finalize) |
| seal | FLSR-FINAL-FREEZE-V1-2026-10-25 · `FLSR_FINAL_V1/FINAL_FREEZE_SEAL.json` sha256 83c1e65a7cb4bc2f564bc3d437371d9bc17f51cc05a3674768530e61b879d452 |
| release manifest sha256 | f6b480d8233664b01988c31bc058f947c8f796635575549fd7c208b7bda8f431 |
| per-file hashes | `BACKUP_SHA256SUMS.txt` in the capsule |
| longest path | 218 characters (< 260; web folder upload safe) |

## Upload instructions (CEO, manual)

1. Google Drive web → choose the Full-Look scoring backup parent folder.
2. **New → Folder upload** → select `C:\STMX_UPLOAD\FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025\` as a whole. Upload the folder, not a ZIP.
3. Do not modify the local capsule during the upload.

## Remote verification checklist

- [ ] the folder `FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025` exists at the chosen Drive path;
- [ ] the Drive file count equals the manifest `file_count` (262);
- [ ] `FLSR_FINAL_V1/FINAL_FREEZE_SEAL.json` and `BACKUP_MANIFEST.json` are present;
- [ ] download `FLSR_FINAL_V1/RELEASE_MANIFEST.json` and confirm its SHA-256 equals `f6b480d8233664b01988c31bc058f947c8f796635575549fd7c208b7bda8f431`;
- [ ] optional: download the `FLSR_FINAL_V1/` folder, run `node verify_release.js --out <dir>`, and expect `RELEASE_VERIFIED`.

## CEO confirmation required

Tell Claude the Drive folder path or URL and the file count you saw. Claude then records the confirmation append-only, and the gate becomes `SR_GOOGLE_DRIVE_BACKUP = VERIFIED`. Until then the status stays PENDING, and TC does not start.
