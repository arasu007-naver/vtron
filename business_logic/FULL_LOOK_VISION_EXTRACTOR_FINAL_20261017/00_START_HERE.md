# Full-Look Style Vision Extractor — FINAL backup (FLV-FINAL-FREEZE-V1-2026-10-17)

이 폴더 하나가 최종 백업 단위입니다. **폴더째 Google Drive에 업로드**하세요(ZIP 아님).

| 폴더 / 파일 | 내용 |
|---|---|
| `STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/` | 동결 최종 릴리스(실행 코드 · 프롬프트 V2 · 스키마 · 샘플 · 문서 · 검증기). 봉인 aggregate `de1e46ce046c960226f9d5258dbe6e5f13731271ed537a17331cd28527c7e5bd` · 303개 파일 |
| `FINAL_FREEZE_AUTHORITY/` | 동결 선언 · manifest · production authority 포인터 |
| `QA_EVIDENCE/` | 최종 수용 감사 · 클린룸 QA · 검증 보고서 · 시험 결과 |
| `FINAL_CLOSURE_REPORT/` | CEO 종결 보고서(DOCX) |
| `BACKUP_MANIFEST.json` · `BACKUP_SHA256SUMS.txt` | 이 폴더 전체 파일 목록 · SHA-256 |

## 검증 (어느 PC에서나, Node.js 18 이상)
```
cd STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1
node 06_RELEASE_VERIFICATION/verify_release.js --out ../_verify_out
```
→ `RELEASE_VERIFIED` (R1–R9 PASS).

## Google Drive 수동 업로드 (자동 업로드 수단 없음)
1. Google Drive 웹에서 Full-Look Vision 최종본을 둘 폴더를 정합니다. 기존 Item Vision 등 다른 엔진 백업 폴더에 덮어쓰지 마세요.
2. **새로 만들기 → 폴더 업로드**에서 이 폴더 `FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017`를 통째로 선택합니다.
3. 업로드가 끝나면 Drive에서 폴더 이름과 파일 수를 확인합니다. 기준값은 `BACKUP_MANIFEST.json`의 `file_count`입니다.
4. `BACKUP_MANIFEST.json`과 `STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/FINAL_FREEZE_SEAL.json`을 다시 내려받아 SHA-256을 비교합니다. 기준값은 이 폴더의 `BACKUP_SHA256SUMS.txt`입니다.
5. 확인이 끝나면 폴더 URL을 Claude에 알려 주세요. 그때 `GOOGLE_DRIVE_BACKUP = COMPLETE_AND_VERIFIED`로 기록할 수 있습니다.

⚠ 업로드가 끝날 때까지 이 폴더 안의 파일을 고치거나 추가하지 마세요.
