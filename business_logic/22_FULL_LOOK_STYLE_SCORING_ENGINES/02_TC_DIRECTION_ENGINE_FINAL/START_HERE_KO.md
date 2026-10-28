# Full-Look TC Direction Engine — FINAL backup (FLTC-FINAL-FREEZE-V1-2026-10-25)

이 폴더 `02_TC_DIRECTION_ENGINE_FINAL` 하나가 최종 백업 단위입니다. **폴더째 Google Drive의 `22_FULL_LOOK_STYLE_SCORING_ENGINES` 안에 업로드**하세요(ZIP 아님). 업로드가 끝나기 전에는 이 폴더에 아무것도 쓰지 마세요.

| 폴더 / 파일 | 내용 |
|---|---|
| `FLTC_FINAL_V1/` | 동결 최종 릴리스 (실행 코드 `RT/` · 헌법 · 계약 · 골든 데이터 43개 · 테스트 · 검증기 · 봉인 `FINAL_FREEZE_SEAL.json`) |
| `FINAL_FREEZE_AUTHORITY/` | 동결 선언 · 선언 manifest · production authority 포인터 |
| `QA_EVIDENCE/` | 검증 보고서(현장 · 클린룸 · 봉인 후) · 회귀 · 43개 원장 · 개발 테스트 54개 · 정확도/표현 감사 · 수용 게이트 F-01…F-16 · Drive 접근 확인 |
| `SOURCE_AND_PROVENANCE/` | V3 최종 후보 원본 (복원에는 필요 없음) · V2 후보 manifest(정체 확인용) · V2→V3 코드 diff |
| `GOVERNANCE/` | CEO 오더 원문 · 설계 검토 · 최종 TC 헌법 (D2) |
| `FINAL_CLOSURE_REPORT/` | CEO 최종 보고서(DOCX) · D2–D9 |
| `BACKUP_MANIFEST.json` · `SHA256SUMS.txt` | 이 폴더 전체 파일 목록 · SHA-256 |

## 검증 (어느 PC에서나, Node.js 18 이상)
```
cd FLTC_FINAL_V1
node verify_release.js --out ../_verify_out
```
→ `RELEASE_VERIFIED` (V1–V10 PASS). Windows 탐색기 등 260자 경로 제한 도구를 쓸 때는 짧은 상위 경로(예: `C:\STMX_UPLOAD\`)에 두세요.

## Google Drive 수동 업로드 (이 환경에는 Drive 접근 수단이 없습니다)
1. Google Drive 웹에서 `22_FULL_LOOK_STYLE_SCORING_ENGINES` 폴더를 엽니다. (`01_SR_DIRECTION_ENGINE_FINAL`은 그대로 둡니다.)
2. **새로 만들기 → 폴더 업로드**로 이 폴더 `02_TC_DIRECTION_ENGINE_FINAL`을 통째로 선택합니다.
3. 업로드 후 확인: 폴더 이름 · 파일 수(`BACKUP_MANIFEST.json`의 `file_count`) · `FLTC_FINAL_V1/FINAL_FREEZE_SEAL.json`과 `FLTC_FINAL_V1/RELEASE_MANIFEST.json` 존재 · 대표 파일 1개 다운로드 후 SHA-256이 `SHA256SUMS.txt`와 같은지.
4. 확인 결과(Drive 경로 · 파일 수)를 알려 주시면 TC Google Drive 백업 게이트를 기록합니다. 그 전까지 상태는 `PENDING_ACTUAL_UPLOAD_VERIFICATION`입니다.
