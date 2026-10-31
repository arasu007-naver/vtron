# STMX Item Scoring V2 — Integrated Release V1 — 최종 백업 (ITEM-V2-INTEGRATED-FINAL-FREEZE-V1-2026-10-29)

이 폴더 `05_INTEGRATED_ITEM_SCORING_RUNTIME_V2` 하나가 백업 단위입니다. 폴더째 Google Drive의 `20_ITEM_SCORING_ENGINES/` 아래에 올리세요 → `20_ITEM_SCORING_ENGINES/05_INTEGRATED_ITEM_SCORING_RUNTIME_V2/` (`01_EI_V2_DIRECTION_REASON` … `04_DM_V2_DIRECTION_REASON`의 **옆**). 업로드가 끝나기 전에는 이 폴더에 아무것도 쓰지 마세요.

> 상태: ITEM_V2_INTEGRATED_FINAL_FROZEN (ITEM-V2-INTEGRATED-FINAL-FREEZE-V1-2026-10-29) · FINAL_FROZEN_WITH_DOCUMENTED_KNOWN_LIMITATIONS · NOT_PROMOTED — STMX ITEM SCORING ENGINE V1 remains the production composition (no pointer change) · VISION_INVOCATION_CONFIG = OFFLINE_VERIFIED · NOT_LIVE_VERIFIED · G53 = FULLY ACTIVE · paid calls in this order 0

| 구성 요소 | 위치 (이 폴더 안, 저장소와 같은 상대 경로) |
|---|---|
| Integrated R4 (진입점) | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item_v2_r4/item_v2_r4_entry.js` |
| 상품 선택 체인 | `src/item_v2` · `item_v2_r1` · `item_v2_r2` · `item_v2_r3` |
| Suit TC / SR / DM | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/` · `01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/` · `01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_V2_SUIT_SUCCESSOR_V1_CANDIDATE/` |
| 동결 Item EI / TC / SR / DM V2 | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_EI_ENGINE_V2_DIRECTION_REASON_CANDIDATE_R5/` (ITEM-EI-V2-FINAL-FREEZE-V1-2026-10-29) · `01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_ENGINE_V2_DIRECTION_REASON_R4_FINAL_CANDIDATE/` (ITEM-TC-V2-FINAL-FREEZE-V1-2026-10-28) · `01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE/` (ITEM-SR-V2-FINAL-FREEZE-V1-2026-10-27) · `01_ENGINES/ITEM_SCORING_ENGINE/STMX_DM_ENGINE_V2_DIRECTION_REASON_CANDIDATE/` (ITEM-DM-V2-FINAL-FREEZE-V1-2026-10-28) |
| 대상 지정 색상 | `01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_COLOUR_TARGET_AWARE_V1_CANDIDATE/` |
| Item Vision V1.3 + 전송 | `01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/` · `01_ENGINES/ITEM_VISION_EXTRACTOR/run/anthropic_vision_fn.js` |
| Vision 호출 설정 (Order Q) | `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_FINAL_CLOSURE_V1/_raw/live_q/STMX_ITEM_VISION_V1_3_INVOCATION_CONFIG_FQ_V2.json` — Vision 16,384 · 색상 8,192 · 오프라인 검증만, 실사진 미검증 |
| 동결 기록 | `01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_V2_INTEGRATED_FINAL_FREEZE_AUTHORITY_V1.json` + `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_ITEM_V2_INTEGRATED_*` (알려진 한계 IV2-LIM-01 … 06) |
| 증거 | Order P 실사진 원본 응답 · 처리 결과 · 원장, Order Q 수정 · 검토 기록, 동결 게이트 결과, D01 … D07 |
| `RECOVERY/` | `verify_backup.js` + 재생 입력 (실사진 5개 상품 + 841 · 810 수트 거부 사례) |

## 검증 (어느 PC에서나, Node.js 18 이상, 저장소 없이)
```
node RECOVERY/verify_backup.js
```
→ 마지막 줄 `BACKUP_VERIFIED`. 해시 · 파일 수 · 동결 의존 파일 · 봉인 · V1.3 프롬프트 · 호출 설정 · R4 재생(두 번, 실사진 결과와 동일) · 수트 거부 재현 · Suit 19 / 18 / 15 · 색상 17 · R4 봉인 확인을 이 폴더 안에서 실행합니다. 네트워크 호출 없음, 백업 폴더에 쓰지 않음.

## 복원
파일을 저장소의 같은 상대 경로로 되돌립니다. 이미 있는 파일은 sha256이 같은지 먼저 확인하세요(다르면 덮어쓰지 않음). 실사진 Vision 호출에는 새 CEO G53 승인이 필요합니다(현재 없음).

## Google Drive 수동 업로드 (이 환경에는 Drive 접근 수단이 없습니다)
1. Google Drive 웹에서 `20_ITEM_SCORING_ENGINES/`를 엽니다.
2. **새로 만들기 → 폴더 업로드**로 이 폴더 `05_INTEGRATED_ITEM_SCORING_RUNTIME_V2`를 통째로 선택합니다.
3. 확인: 폴더 이름 · 파일 수(`BACKUP_MANIFEST.json`의 `file_count`) · 파일 1개 이상을 내려받아 SHA-256이 `SHA256SUMS.txt`와 같은지(권장: `BACKUP_MANIFEST.json`, `RECOVERY/verify_backup.js`, 동결 기록 JSON).
4. 결과(Drive 경로 · 파일 수 · 확인한 해시)를 알려 주시면 별도 검증 기록으로 남깁니다. 그 전까지 상태는 `GOOGLE_DRIVE_BACKUP_PENDING_CONFIRMATION`입니다.

CEO 보고서와 거버넌스 문서: `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_INTEGRATED_FINAL_FREEZE_AND_VERIFIED_BACKUP_V1/`.
