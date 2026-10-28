# Full-Look EI Direction Engine — FINAL backup (FLEI-FINAL-FREEZE-V1-2026-10-26)

이 폴더 `03_EI_DIRECTION_ENGINE_FINAL` 하나가 최종 백업 단위입니다. **폴더째 Google Drive의 `22_FULL_LOOK_STYLE_SCORING_ENGINES` 안에 업로드**하세요(ZIP 아님). 업로드가 끝나기 전에는 이 폴더에 아무것도 쓰지 마세요.

> ⚠ **알려진 정확도 한계(대표님 수용):** F228은 대표님 GT = EXPRESSIVE, 엔진 = INTROVERT 입니다(FL-EI-LIM-F228-001, GT 일치 3/4). 이 백업은 그 상태 그대로 동결된 V1입니다 — F228이 고쳐진 것이 아닙니다.

| 폴더 / 파일 | 내용 |
|---|---|
| `FLEI_FINAL_V1/` | 동결 최종 릴리스 (실행 코드 `RT/` · 헌법 · 계약 · 골든 데이터 43개 · 테스트 · 검증기 · `GOVERNANCE/`(수용 기록 · 한계 등록부 · GT 참조) · 봉인 `FINAL_FREEZE_SEAL.json`) |
| `FINAL_FREEZE_AUTHORITY/` | 동결 선언 · 선언 manifest · 한계 등록부 · production authority 포인터 |
| `QA_EVIDENCE/` | 후보 검증(개발 테스트 재실행 223개 · 43개 재생) · 의존성 추적 · 릴리스 빌드 · 현장/클린룸 검증(봉인 전·후) · 동결 게이트 A-1…C-4 · 다른 동결 엔진 검증(FLV · FLSR · FLTC) · Drive 접근 확인 · PRE 스냅샷 |
| `SOURCE_AND_PROVENANCE/` | V1_R3 후보 원본 (복원에는 필요 없음) · V1 / V1_R1 / V1_R2 후보 manifest(정체 확인용) |
| `GOVERNANCE/` | CEO 오더 원문 · 설계 검토 · 수용 기록(D4) · 한계 등록부(D5) · 통합 헌법 |
| `FINAL_CLOSURE_REPORT/` | CEO 최종 보고서(DOCX) · D-문서 |
| `BACKUP_MANIFEST.json` · `SHA256SUMS.txt` | 이 폴더 전체 파일 목록 · SHA-256 |

## 검증 (어느 PC에서나, Node.js 18 이상)
```
cd FLEI_FINAL_V1
node verify_release.js --out ../_verify_out
```
→ `RELEASE_VERIFIED` (V1–V10 PASS). Windows 탐색기 등 260자 경로 제한 도구를 쓸 때는 짧은 상위 경로(예: `C:\STMX_UPLOAD\`)에 두세요.

## Google Drive 수동 업로드 (이 환경에는 Drive 접근 수단이 없습니다)
1. Google Drive 웹에서 `22_FULL_LOOK_STYLE_SCORING_ENGINES` 폴더를 엽니다. (`01_SR_DIRECTION_ENGINE_FINAL` · `02_TC_DIRECTION_ENGINE_FINAL`은 그대로 둡니다.)
2. **새로 만들기 → 폴더 업로드**로 이 폴더 `03_EI_DIRECTION_ENGINE_FINAL`을 통째로 선택합니다.
3. 업로드 후 확인: 폴더 이름 · 파일 수(`BACKUP_MANIFEST.json`의 `file_count`) · `FLEI_FINAL_V1/FINAL_FREEZE_SEAL.json`과 `FLEI_FINAL_V1/RELEASE_MANIFEST.json` 존재 · 대표 파일 1개 다운로드 후 SHA-256이 `SHA256SUMS.txt`와 같은지.
4. 확인 결과(Drive 경로 · 파일 수)를 알려 주시면 EI Google Drive 백업 게이트를 기록합니다. 그 전까지 상태는 `PENDING`입니다.
