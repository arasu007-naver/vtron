# Full-Look SR Direction Engine — FINAL backup (FLSR-FINAL-FREEZE-V1-2026-10-25)

이 폴더 하나가 최종 백업 단위입니다. **폴더째 Google Drive에 업로드**하세요(ZIP 아님). 업로드가 끝나기 전에는 이 폴더에 아무것도 쓰지 마세요.

| 폴더 / 파일 | 내용 |
|---|---|
| `FLSR_FINAL_V1/` | 동결 최종 릴리스 (실행 코드 · 헌법 · 계약 · 골든 데이터 · 테스트 · 검증기 · 봉인 `FINAL_FREEZE_SEAL.json`) |
| `FINAL_FREEZE_AUTHORITY/` | 동결 선언 · manifest · production authority 포인터 |
| `QA_EVIDENCE/` | 검증 보고서(현장 · 클린룸 · 봉인 후) · 회귀 · 43개 원장 · 저장된 20개 응답 재생 · 대리 홀드아웃 · 수용 게이트 F-01…F-16 |
| `DEVELOPMENT_SOURCE/` | R4 후보 원본 (개발 테스트 41개 · 원장 · 코드 diff) — 복원에는 필요 없음 |
| `GOVERNANCE/` | CEO 오더 원문 · 설계 검토 · 최종 SR 헌법 (D2) |
| `FINAL_CLOSURE_REPORT/` | CEO 최종 보고서(DOCX) · D1–D8 |
| `BACKUP_MANIFEST.json` · `BACKUP_SHA256SUMS.txt` | 이 폴더 전체 파일 목록 · SHA-256 |

## 검증 (어느 PC에서나, Node.js 18 이상)
```
cd FLSR_FINAL_V1
node verify_release.js --out ../_verify_out
```
→ `RELEASE_VERIFIED` (V1–V10 PASS).

## Google Drive 수동 업로드 (이 환경에는 Drive 접근 수단이 없습니다)
1. Google Drive 웹에서 Full-Look 채점 엔진 최종본을 둘 폴더를 정합니다 (예: Full-Look Vision 최종 백업과 같은 상위 폴더). 다른 엔진 백업 폴더에 덮어쓰지 마세요.
2. **새로 만들기 → 폴더 업로드**에서 이 폴더 `FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_20261025`를 통째로 선택합니다.
3. 업로드 후 Drive에서 확인할 기대값: 폴더 이름 · 파일 수(`BACKUP_MANIFEST.json`의 `file_count`) · `FLSR_FINAL_V1/FINAL_FREEZE_SEAL.json` 존재 · 대표 파일 1개 다운로드 후 SHA-256이 `BACKUP_SHA256SUMS.txt`와 같은지.
4. 확인 결과(Drive 폴더 경로 또는 URL · 파일 수)를 Claude에게 알려 주시면 Google Drive 백업 게이트를 기록합니다. 그 전까지 상태는 `PENDING_ACTUAL_UPLOAD_VERIFICATION`입니다.
