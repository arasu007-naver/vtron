# CLAUDE ORDER
## STMX FULL-LOOK TC — FINAL MANDATORY SCORING CORRECTION, PRODUCTION FREEZE & VERIFIED BACKUP V1

**Execution Model:** Opus 5.5  
Implementation / Regression Support: Fable 5.1  
Date: 2026-10-25  
Priority: FINAL TC DIRECTION ENGINE CLOSURE  
Authorization: CEO Instruction — Complete Full-Look TC and prepare its Final Backup.

---

# 0. MISSION

이번 작업의 목적은 Full-Look TC Direction Engine을 최종 마무리하는 것이다.

이미 개발 완료된 Full-Look TC Product-Only V2를 기준으로 남아 있는 필수 Scoring 위반을 수정하고, 전체 회귀 검증 후 Final Freeze와 Production Release를 완성한다.

이후 SR과 동일한 방식으로 독립적으로 복원·실행할 수 있는 로컬 최종 백업 패키지를 만들고, Google Drive 업로드 폴더까지 준비한다.

이번 작업을 단순한 연구 또는 후보 엔진 개발로 종료해서는 안 된다.

최종 목표:

`FULL_LOOK_TC_DIRECTION_FINAL_FROZEN_LOCAL_BACKUP_VERIFIED`

단, 의미론 결함이나 필수 검증 실패가 존재하면 이를 숨기고 Freeze해서는 안 된다.

**CEO가 이미 승인한 범위에서 완결 가능한 사항은 한 번에 수행하고, 새로운 CEO 의미론 결정이 실제로 필요한 경우에만 해당 사안을 명확히 분리하여 보고한다.**

---

# 1. SOURCE OF TRUTH & ENTRY VERIFICATION

## 1.1 Project Context

작업 전 다음 파일을 순서대로 확인한다.

1. `00_STMX_MASTER_INDEX.md`
2. `01_STMX_FROZEN_DECISIONS.md`
3. `02_STMX_CURRENT_SPRINT.md`
4. `05_STMX_BACKLOG.md`
5. `03_STMX_ARCHITECTURE_MAP.md`
6. `04_STMX_MIGRATION_LOG.md`
7. `07_STMX_DECISION_HISTORY.md`
8. `08_STMX_ARCHITECTURE_GUARD.md`
9. `09_STMX_VERSION.md`
10. `10_STMX_CHANGELOG.md`

필요시 다음 원본을 확인한다.

- `06_STMX_CLAUDE_REPORTS_INDEX.md`
- Full-Look TC Product-Only V2 원본 코드 및 테스트
- Full-Look TC 관련 CEO Decision Records
- Full-Look Vision Final Freeze
- Item TC Frozen Constitution
- 최신 SR Final Freeze 및 백업 기록

기존 Item Engine의 오래된 CURRENT STATE와 현재 Full-Look Engine 상태를 혼동하지 않는다.

## 1.2 SR 완료 상태

CEO는 2026-10-25 SR Google Drive 백업 업로드가 완료됐음을 확인했다.

SR Freeze:

`FLSR-FINAL-FREEZE-V1-2026-10-25`

SR 로컬 백업:

`C:\STMX_UPLOAD\01_SR_DIRECTION_ENGINE_FINAL\`

Google Drive:

`22_FULL_LOOK_STYLE_SCORING_ENGINES/01_SR_DIRECTION_ENGINE_FINAL/`

SR 업로드 완료는 CEO 확인 사실로 기록한다. 직접 검증하지 못한 Drive 측 파일 수나 해시까지 독립 검증했다고 주장하지 않는다.

SR Production Source와 Frozen Authority를 수정하지 않는다.

TC 작업을 시작하기 전에 최신 SR 상태와 CEO 업로드 확인 기록을 확인하고 필요한 Project Context 상태를 정확하게 정리한다.

---

# 2. CURRENT TC BASELINE

## 2.1 기존 후보 엔진

현재 Full-Look TC Direction Engine의 개발 기준:

`01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V2_CANDIDATE/`

기존 Production 후보를 수정하지 말고 successor version을 만든다.

V2 code identity:

`796a9513c7b40a9df097e0f7be9c522bd93304aa3c33f2058108ecdd7df7a89e`

기존 패키지:

`04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_TC_PRODUCT_ONLY_FINAL_CORRECTION_V1/`

## 2.2 기존 테스트 결과

43개 Full-Look Vision Evidence Packet 기준:

| Result | Count |
|---|---:|
| Transformative | 21 |
| Classic | 13 |
| UNRESOLVED | 9 |
| Total | 43 |

기존 V2 테스트:

`45/45 PASS`

Full-Look TC 개발 Milestone 4:

`CLOSED — DEVELOPMENT COMPLETE`

하지만 다음은 미완료 상태다.

- Mandatory Scoring Correction
- Final Production Constitution
- Final Freeze
- Final Local Backup
- Google Drive Backup

기존 V2의 테스트 통과를 Final Freeze의 근거로 단독 사용해서는 안 된다.

---

# 3. DESIGN REVIEW CHECKLIST — MANDATORY PRE-COMMIT

코드 수정 전에 Design Review를 완료하고 별도 기록을 남긴다.

다음 항목을 반드시 검토한다.

1. Current Authority와 Historical Authority 구분
2. Product-Only V2의 승인 상태 및 supersession 관계
3. CEO Mandatory Scoring 원칙의 적용 범위
4. TC-P2 UNRESOLVED의 정확한 원인
5. 9개 UNRESOLVED와 8개 정상 평가 대상의 차이
6. Product Evidence와 Styling Evidence의 경계
7. Frozen Step 2 / Item TC 의존성 및 보호 범위
8. Missing Evidence에 대한 합법적 Direction 결정 방법
9. GT leakage 및 Look-ID 예외 위험
10. Score Coverage와 Accuracy 측정의 분리
11. Output Contract 및 Production Dependency 구조
12. Final Freeze, Backup, Restore Gate
13. 기존 SR, Vision 및 Item Engine 회귀 영향
14. Project Context 및 Frozen Decision 업데이트 범위
15. 새로운 CEO 의미론 승인이 필요한지 여부

Design Review에서 기존 승인 체계만으로 해결할 수 있는 보정과 새로운 CEO 결정이 필요한 문제를 구분한다.

승인되지 않은 새로운 의미론을 조용히 도입해서는 안 된다.

---

# 4. BINDING CEO ARCHITECTURE

## 4.1 AVAILABLE_EVIDENCE_MANDATORY_SCORING

2026-10-24 CEO 승인.

적용 축:

`EI / TC / SR / DM`

이번 TC 수정의 최상위 Scoring 원칙이다.

유효하고 Scorable한 Full-Look Vision Evidence Packet이 전달되면 TC는 현재 확보된 증거만으로 반드시 최종 Direction을 산출한다.

합법적인 최종 Direction:

`CLASSIC | TRANSFORMATIVE`

정보 부족 때문에 정상 입력을 UNRESOLVED로 반환하는 것은 금지한다.

예시:

- 소재가 UNKNOWN이어도 Scoring한다.
- 일부 Fit이 UNKNOWN이어도 Scoring한다.
- 의복의 정확한 유형이 부족하더라도 나머지 관찰 증거로 판단한다.
- Construction 정보가 부분적으로만 존재해도 사용 가능한 증거로 판단한다.
- 특정 Product Departure가 완전히 기술되지 않았더라도 관측 가능한 다른 근거를 종합한다.

중요한 구분:

**Missing Evidence는 최종 Direction을 막을 수 없지만, Missing Evidence 자체가 Classic의 긍정적 근거가 되는 것은 아니다.**

`UNKNOWN → CLASSIC`이라는 기계적인 기본값을 만드는 것은 금지한다.

기존 관측 증거로 Product Grammar의 실제 변형 여부를 최대한 판단하고, 가장 타당한 C 또는 T를 반환한다.

관측되지 않은 값은 관측되지 않은 상태로 유지한다.

추론의 근거와 한계를 진단 정보로 보존하되, 그 진단 정보를 최종 Direction을 반환하지 않는 구실로 사용하지 않는다.

## 4.2 Product-Only Authority

CEO Decision:

`CEO_APPROVED_FULL_LOOK_TC_PRODUCT_ONLY_2026_10_23`

Full-Look TC의 최종 방향 모델은 PRODUCT_ONLY다.

적용 원칙:

- 실제 착장에 참여하는 제품 중 유효한 Transformative Product Departure가 하나라도 있으면 T다.
- 다른 의복이 Classic이어도 유효한 T를 상쇄하지 않는다.
- 유효한 Product Departure 없이 제품들이 기존 Grammar를 유지하는 경우 C다.
- Styling만으로 만들어진 Departure는 T Direction을 생성하지 않는다.
- Styling Evidence의 부재는 C 판정을 막지 않는다.
- Layering, Exposure 및 Wearing Context는 필요한 경우 제품 식별·가시성·해석 근거로만 사용한다.
- Product Departure의 의미와 유효성은 기존 Frozen TC 기준에 따른다.

역사적 `TC-D-3`의 Styling-only Direction Authority는 Full-Look TC에서 superseded 상태다.

기존 V1의 Styling Gate들을 복원하지 않는다.

## 4.3 Product Departure의 예시

기존 CEO Clarification의 사례:

- Cropped Jacket
- 유효한 Oversized Trouser
- 유효한 Balloon / Barrel Proportion Departure
- 의미 있는 Construction Departure
- 기존 Conventional Grammar를 실질적으로 변형한 Product Design

이 사례는 새로운 파라미터를 만들라는 지시가 아니다.

현재 Frozen Vision Packet에 실제로 관측된 사실과 기존 Frozen TC 판단 규칙을 통해서만 판정한다.

단순히 어떤 명칭이 없다는 이유로 Classic을 확정하거나, 해당 명칭을 임의로 생성해 Transformative로 판정해서는 안 된다.

## 4.4 TC ≠ SR

SR의 Structured / Relaxed는 TC의 Classic / Transformative와 다르다.

예를 들어 Oversized는 SR에서 Relaxed일 수 있지만, TC에서 유효한 Proportion Departure가 성립하면 Transformative가 될 수 있다.

SR의 Direction이나 Score를 TC의 결정 근거로 사용하지 않는다.

Item TC의 Score를 합산해서 Full-Look TC를 결정하는 것도 금지한다.

---

# 5. FCR-TC-1 — MISSING EVIDENCE CORRECTION

이번 작업의 가장 중요한 구현 과제다.

## 5.1 전체 9개 UNRESOLVED 전수 감사

기존 V2에는 다음 9개 사례가 UNRESOLVED로 기록되어 있다.

| Case | 기존 기록상 원인 |
|---|---|
| F147 | Frozen interpretive gap |
| F187 | Frozen interpretive gap |
| F472 | Frozen interpretive gap |
| M269 | Missing material fact |
| REF_000622 | Missing material fact |
| M214 | Missing material fact |
| F033 | Unknown product identity |
| F267 | Unknown product identity |
| F418 | Unknown product identity |

별도의 2026-10-24 공통 Scoring 감사에서는 8건을 정상 평가 가능하지만 미결정인 사례로 분류했다.

따라서 먼저 다음을 정확히 대조한다.

- 전체 9개 사례
- 8개 Scorable 미결정 사례
- 나머지 1개 사례의 기술적 상태
- 실제 입력 Packet
- V2가 UNRESOLVED로 판단한 조건
- 당시 판정이 의존한 필드
- 현재 사용 가능한 증거

9건 전부를 일괄적인 기술적 실패로 처리하지 않는다.

특정 Look이 기술적 입력 실패에 해당하는지는 실제 Packet 구조로 입증한다. 과거 SR에서 같은 Look이 기술적 입력 실패였다는 이유만으로 TC에서도 자동 제외하지 않는다.

## 5.2 사례별 증거 분석

각 Case에 대해 다음을 기록한다.

1. 실제 Vision Packet에서 사용 가능한 Product Evidence
2. 현재 관측되지 않은 Evidence
3. 기존 TC Step 2 판단 결과
4. V2의 미결정 Rule
5. 다른 관측 증거로 판단 가능한지
6. 실제 Product Departure에 대한 긍정·부정 근거
7. 최종 C/T Direction
8. 적용된 일반 규칙
9. 잔여 불확실성
10. 해당 판단이 새로운 CEO 의미론을 요구하는지 여부

특정 GT를 맞히기 위해 추가 정보를 만드는 방식은 허용하지 않는다.

## 5.3 새로운 Mandatory Scoring Resolver

기존 Product-Only V2의 의미론을 최대한 보존하면서 Missing Evidence가 Direction을 막는 문제를 해결한다.

요구되는 판단 순서:

**STEP 1 — Valid Input**

입력 구조와 최소 Scorable Evidence를 확인한다.

전체 Packet 부재, 손상 또는 평가할 제품 증거가 사실상 없는 기술적 입력 실패만 별도로 취급할 수 있다.

**STEP 2 — Actual Available Evidence**

실제로 관측된 증거만 읽는다.

UNKNOWN은 어떤 Product Property로도 변환하지 않는다.

**STEP 3 — Product Departure Assessment**

기존 Frozen Step 2 기준에 따라 각 참여 의복의 유효한 Product Departure를 판단한다.

**STEP 4 — Full-Look Direction**

유효한 Transformative Product Departure가 성립하면 T.

그렇지 않은 유효한 Look은 현재 관측된 제품과 디자인 문법에 근거하여 C/T 중 가장 타당한 방향을 결정한다.

UNKNOWN을 자동 Classic으로 변환하지 않는다.

**STEP 5 — Diagnostic Provenance**

최종 Direction에 사용된 Evidence, 일반 규칙, 부족한 증거 및 불확실성을 별도 기록한다.

진단 정보는 Direction 결과와 분리한다.

## 5.4 금지되는 해결 방법

- Look ID별 Direction override
- GT lookup table
- REF identity branch
- Missing Material 자동 Classic
- Unknown Product Identity 자동 Classic
- Missing Step 2 Evidence 자동 T
- Styling Departure를 T로 재도입
- Vision Parameter 추가
- Vision 재추출 요구
- 유료 API 호출
- 기존 Frozen Item TC 변경
- Item별 Numeric Score 합산
- Confidence Threshold 때문에 정상 Scoring 차단

현재 허용된 Evidence로 판단할 수 있는 최선의 Direction을 반드시 반환한다.

---

# 6. TC RESOLVER SUCCESSOR IMPLEMENTATION

## 6.1 새 Version 생성

기존 V2를 수정하지 않는다.

새 Successor Candidate를 생성한다.

권장 이름:

`STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE`

정확한 경로는 기존 `STYLE_SCORING_ENGINE` 저장소 규칙과 일치시킨다.

기존 V1·V2는 역사적 비교 및 롤백을 위해 보존한다.

## 6.2 변경 범위

허용:

- TC-P2 Mandatory Scoring 수정
- 필요한 경우 TC-P0 / TC-PV와의 관계 수정
- Input validity / technical failure 경계 명확화
- Product Evidence에 기반한 C/T 결정 보정
- 진단 및 Provenance 개선
- 테스트 보강

금지:

- 새로운 TC Direction Pole
- TC Strength 신규 구현
- TC1~TC9 Numeric Projector 개발
- Item TC 재개방
- Vision Schema 변경
- Fashion Styling Direction Gate 부활
- 기존 Frozen Reference Knowledge의 임의 개정

특히 TC-P0, TC-P2, TC-PV의 기존 UNRESOLVED가 정상 평가 대상을 차단하는 모든 경로를 점검한다.

TC-P2의 여덟 사례만 고친 뒤 나머지 일반 입력에서 같은 문제가 다시 발생하도록 방치해서는 안 된다.

---

# 7. VALIDATION & REGRESSION

## 7.1 기존 43개 Packet 전수 Replay

V1, V2, V3의 결과를 나란히 비교한다.

필수 표:

| Look | V1 | V2 | V3 | Change Reason | Rule |
|---|---|---|---|---|---|

전수 집계:

- Total Input
- Valid Scorable
- Technical Input Failure
- Classic
- Transformative
- Final UNRESOLVED
- Missing Evidence Cases
- Deterministic Replay Match

정상 Scorable Input의 최종 UNRESOLVED 목표는 0이다.

단순히 Classic으로 몰아넣어 Coverage 100%를 달성하는 방식은 실패로 처리한다.

## 7.2 FCR-TC-1 Acceptance Tests

9개 기존 UNRESOLVED 사례를 개별 테스트한다.

기술적 입력 실패로 판정되는 사례는 그 근거를 정확히 공개한다.

정상 Scorable한 나머지는 C/T Direction을 반환해야 한다.

추가 필수 테스트:

1. Material UNKNOWN
2. Product Identity UNKNOWN
3. Fit 부분 누락
4. Construction 부분 누락
5. 한 가지 유효 Product Departure 존재
6. Classic 제품과 Transformative 제품 혼합
7. Styling-only Departure
8. Layering으로 일부 제품이 가려짐
9. Wearing Context 누락
10. 유효한 Product Departure가 없고 기존 Grammar가 관측되는 경우
11. Product Evidence가 매우 제한된 경우
12. 완전히 비어 있거나 손상된 Packet
13. 동일 Evidence / 다른 Look ID
14. Input Order 변경
15. 반복 실행 Determinism

같은 허용 입력에 서로 다른 CEO 판정이 존재하는 경우 임의의 Look-ID 예외를 만들지 않는다.

그런 충돌은 정확도 또는 표현 한계로 기록한다.

## 7.3 Product-Only Semantic Guards

다음 불변조건을 테스트한다.

- Valid Product Departure → T
- Classic Garment가 T를 상쇄하지 않음
- Styling-only Departure가 T를 생성하지 않음
- Styling Observation 부재가 Direction을 차단하지 않음
- Missing Evidence가 자동 C로 전환되지 않음
- Missing Evidence 때문에 정상 Scoring이 중단되지 않음
- TC와 SR의 판단은 독립적
- No GT Leakage
- No REF-ID Rule
- No Vision Expansion
- No Item TC Reopen

## 7.4 Existing Regression

반드시 기존 테스트를 재실행한다.

- TC V2 45/45
- TC V1 Candidate Tests
- Frozen Item TC Regression
- Frozen Step 2 Successor
- Frozen Vision R1–R9
- Full-Look SR Final Release Verification
- Architecture Guard Regression
- Production Dependency Isolation
- No Paid API / G53

기존 V2와 V3의 결과 차이는 전부 분류한다.

`INTENDED_CORRECTION | SEMANTIC_REGRESSION | TECHNICAL_REGRESSION | KNOWN_LIMITATION`

의도한 변화 이외에 설명되지 않은 Direction 변화가 존재하면 Freeze하지 않는다.

기존 테스트의 알려진 환경 문제는 새로운 Scoring 회귀와 분리한다.

---

# 8. ACCURACY & REPRESENTABILITY AUDIT

Coverage와 Accuracy는 반드시 별도로 보고한다.

Full-Look TC에는 현재 독립적으로 완결된 CEO GT 집합이 없다.

따라서 Full-Look TC Accuracy가 검증됐다고 주장해서는 안 된다.

기존 CEO가 실제로 판정한 개별 사례가 존재한다면 해당 판정의 권위를 정확히 구분하여 비교한다.

- CEO Full-Look TC Adjudication
- Historical Adjudication
- Item TC GT Proxy
- Engine Prediction

서로 다른 자료를 하나의 Accuracy Percentage로 합산하지 않는다.

현재 GT가 없는 43개 Packet에서는 Direction Coverage, 규칙 적합성, 결정론 및 회귀 검증 결과를 우선 보고한다.

M178의 Trouser Oversized / Frozen Vision Fit Boundary 문제와 기존 Interpretive Gap 등은 최종 결과에 미친 영향을 확인한다.

기존 알려진 한계가 새로운 Mandatory Scoring 원칙과 충돌하는지 분류한다.

정상 Scoring으로 결과를 반환하면서도 Accuracy Limitation을 문서화할 수 있다.

---

# 9. FINAL TC SCORING CONSTITUTION

보정 및 회귀 결과를 검증한 후 다음을 포함하는 최종 Constitution을 작성한다.

`STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1`

필수 내용:

1. Purpose & Scope
2. Product-Only Authority
3. Input Evidence Contract
4. Valid Input / Technical Failure Boundary
5. Product Departure Definition
6. Classic / Transformative Direction Rule
7. Multiple Garment Precedence
8. Styling Non-Authority
9. Missing Evidence Mandatory Scoring
10. TC-P0 / TC-P1 / TC-P2 / TC-PV 최종 적용 관계
11. Forbidden Proxies
12. Frozen Item TC Dependency
13. Diagnostic / Provenance Output
14. Known Limitations
15. Regression & Acceptance Results
16. Version / Freeze / Reopen Policy

기존 승인된 의미론을 재작성하지 않는다.

변경이 필요한 범위만 Controlled Successor로 기록한다.

이번 작업에서 새로운 CEO 의미론 선택이 필요하다고 판정되면 그 결정을 임의로 승인하지 않는다.

---

# 10. FINAL FREEZE GATES

모든 필수 조건을 충족한 경우에만 Final Freeze를 실행한다.

## F-01~F-16

| Gate | Acceptance Requirement |
|---|---|
| F-01 | Current CEO Authority 확인 |
| F-02 | Product-Only 의미론 보존 |
| F-03 | Mandatory Scoring 정상 입력 전체 준수 |
| F-04 | 기존 9개 UNRESOLVED 원인 전수 정리 |
| F-05 | 정상 Scorable 입력의 Final UNRESOLVED = 0 |
| F-06 | 기술적 Input Failure의 근거 확인 |
| F-07 | 기존 43개 Packet Replay 완료 |
| F-08 | Direction 변경 원인 전수 설명 |
| F-09 | Frozen Item TC Regression 보호 |
| F-10 | Frozen Vision Regression 보호 |
| F-11 | Frozen SR Regression 보호 |
| F-12 | No GT Leakage / Look-ID Exceptions |
| F-13 | Determinism / Missingness / Mutation Tests 통과 |
| F-14 | 최종 Constitution 및 Runtime Dependency 검증 |
| F-15 | Production Clean-Room Replay 성공 |
| F-16 | 신규 CEO 의미론 결정 필요 없음 및 모든 차단성 결함 해소 |

이 오더는 기존 CEO 승인 원칙의 구현과 모든 게이트 통과를 조건으로 Final Freeze 실행까지 승인한다.

다만 새로운 CEO 의미론 결정이 필요하면 그 결정 없이 Freeze하지 않는다.

모든 Gate PASS 시:

`TC_FINAL_FREEZE = VERIFIED`

권장 Release:

`01_ENGINES/STYLE_SCORING_ENGINE/FLTC_FINAL_V1/`

권장 Engine Identity:

`STMX_FULL_LOOK_TC_DIRECTION_ENGINE_V1`

최종 경로는 기존 SR Production Release의 짧은 경로 정책을 참고하여 결정한다.

Frozen Runtime은 다음에 독립적으로 접근할 수 없어야 한다.

- GT Files
- Historical Research Scripts
- Look-ID Overrides
- Candidate-only Development Assets
- External Network Services

필요한 모든 Dependency는 명시적으로 고정하고 해시로 검증한다.

Final Freeze Seal, Manifest 및 Production Authority Pointer를 작성한다.

새 버전의 Runtime과 Frozen Constitution을 봉인하며, 기존 후보 및 Frozen 파일은 변경하지 않는다.

---

# 11. LOCAL FINAL BACKUP

Final Freeze 검증이 성공한 뒤에만 백업을 생성한다.

## 11.1 Google Drive Destination

CEO가 지정한 상위 폴더:

`22_FULL_LOOK_STYLE_SCORING_ENGINES`

TC 최종 대상 폴더:

`02_TC_DIRECTION_ENGINE_FINAL`

최종 Drive 구조:

```text
22_FULL_LOOK_STYLE_SCORING_ENGINES/
    01_SR_DIRECTION_ENGINE_FINAL/
    02_TC_DIRECTION_ENGINE_FINAL/
```

현재 Drive에 TC 폴더가 이미 존재하는지는 확인되지 않았으므로, 존재한다고 가정하지 않는다.

## 11.2 Local Upload Folder

다음 경로로 최종 백업 패키지를 준비한다.

`C:\STMX_UPLOAD\02_TC_DIRECTION_ENGINE_FINAL\`

SR과 동일하게 CEO가 이 폴더 하나만 업로드하면 되도록 구성한다.

예상 구조:

```text
02_TC_DIRECTION_ENGINE_FINAL/
    FLTC_FINAL_V1/
        FINAL_FREEZE_SEAL.json
        RELEASE_MANIFEST.json
        ...
    FINAL_CLOSURE_REPORT/
        CEO_FINAL_REPORT.docx
        ...
    GOVERNANCE/
        ...
    SOURCE_AND_PROVENANCE/
        ...
    BACKUP_MANIFEST.json
    SHA256SUMS.txt
    START_HERE_KO.md
```

위 구조는 권장 구성이다.

실제 Release의 실행 및 복원에 필요한 파일을 누락하지 않으면서, 기존 SR Backup Protocol과 일관되게 구성한다.

필요 없는 연구 이미지, 임시 데이터, 빌드 캐시, 중복 개발 작업 공간을 무차별적으로 포함하지 않는다.

단, Frozen Authority와 실행에 필요한 역사적 Provenance는 정확히 보존한다.

## 11.3 Backup Verification

다음 검증을 전부 실시한다.

- Source/Backup File Inventory
- File Count
- Relative Paths
- SHA-256 전수 비교
- Freeze Seal 동일성
- Release Manifest 검증
- Backup Manifest 검증
- Production Runtime Dependency
- Clean-Room Restoration
- Golden Replay
- Rollback Rehearsal
- Windows Path Length
- Sensitive Data / Credentials Scan
- 반복 실행 시 동일성 및 비파괴성 확인

복원은 Master Repository 외부에서 실행한다.

복원 테스트가 Master Repository의 우연한 경로 또는 개발용 패키지에 의존해서 성공해서는 안 된다.

최종 출력:

`TC_LOCAL_FINAL_BACKUP = VERIFIED`

실제 검증이 실패하면 위 상태를 선언하지 않는다.

---

# 12. GOOGLE DRIVE UPLOAD

이번 작업에서 Google Drive 접근이 가능한지 실제 확인한다.

접근 권한과 실행 수단이 합법적으로 존재하면 업로드 후 파일 수·해시·폴더 위치를 검증할 수 있다.

접근 수단이 없다면 업로드를 시도했다고 주장하지 않는다.

Google Drive 접근이 없는 환경에서는 다음을 준비한다.

1. 업로드용 로컬 폴더 하나
2. 전체 파일 수
3. 총 용량
4. Final Freeze Seal
5. Release Manifest SHA-256 전체 값
6. Backup Manifest SHA-256
7. Google Drive 업로드 방법
8. 업로드 후 CEO 확인 체크리스트

CEO는 다음 경로에 폴더를 업로드한다.

`22_FULL_LOOK_STYLE_SCORING_ENGINES/02_TC_DIRECTION_ENGINE_FINAL/`

ZIP이 아닌 폴더 전체 업로드를 기본 방식으로 한다.

Google Drive 백업은 실제 업로드와 검증이 이루어져야 VERIFIED가 된다.

로컬 준비 상태를 Google Drive 완료 상태로 표시하지 않는다.

---

# 13. PROJECT CONTEXT & GOVERNANCE UPDATE

작업 완료 후 최신 상태를 Project Context에 반영한다.

필요한 파일:

- MASTER INDEX
- FROZEN DECISIONS
- CURRENT SPRINT
- BACKLOG
- ARCHITECTURE MAP
- MIGRATION LOG
- CLAUDE REPORTS INDEX
- DECISION HISTORY
- ARCHITECTURE GUARD
- VERSION
- CHANGELOG

업데이트 원칙:

- Append-only
- 기존 CEO 결정 원문 보존
- Historical Candidate 상태 보존
- 새로운 Frozen Authority의 정확한 승격 기록
- Production Pointer와 문서 정합성 확인
- 이전 Item TC와 Full-Look TC를 명시적으로 구분
- SR Final Freeze와 백업 기록 유지
- Backlog의 FCR-TC-1 처리 결과 기록

변경 사항이 없는 파일에는 불필요한 수정 작업을 하지 않는다.

Architecture Guard는 기존 Guard가 충분한지 먼저 감사한 후 실제 신규 불변조건이 있을 때만 추가한다.

프로젝트 전체 Version 변경은 기존 Version Governance 정책을 따른다.

---

# 14. CEO FINAL DELIVERABLES

작업 결과는 다음 패키지에 정리한다.

`04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_TC_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/`

필수 산출물:

**D1 — Korean CEO Final Report (DOCX)**

기존 STMX 보고서 서식 기준.

포함 내용:

- Executive Summary
- 기존 TC 상태
- 9개 UNRESOLVED 원인과 처리 결과
- 8개 정상 평가 대상 보정 결과
- V2 → Final Direction 변경
- 최종 Product-Only 의미론
- 43개 Full-Look 결과
- Coverage와 Accuracy의 구분
- Known Limitations
- Final Freeze Verification
- Production Release Identity
- Local Backup Verification
- Google Drive Backup Status
- 잔여 CEO Decision 여부
- EI 전환 조건

**D2 — Final TC Constitution**

**D3 — 43-Case Replay Comparison**

**D4 — FCR-TC-1 Detailed Correction Record**

**D5 — Regression & Architecture Guard Report**

**D6 — Final Freeze Seal / Production Manifest Report**

**D7 — Backup Integrity & Restore Report**

**D8 — Google Drive Upload & Verification Guide**

**D9 — Final Closure / CEO Decision Register**

모든 문서의 수치, 사례 수, 해시 및 상태는 실제 실행 결과에서 생성한다.

채팅 종료 메시지에 해시를 손으로 입력하지 않는다.

모든 해시는 파일에서 직접 읽어 검증한다.

영문 엔진 명칭과 기술 식별자는 원문 그대로 유지한다.

---

# 15. HARD PROHIBITIONS

이번 오더에서 다음 사항은 절대 금지한다.

1. Frozen Item TC 변경
2. Frozen Full-Look Vision Extractor 변경
3. Vision Parameter 추가 또는 재추출
4. 기존 TC Product-Only CEO 결정 변경
5. Styling-only Transformative Authority 부활
6. Frozen SR Engine 변경
7. EI / DM 개발 착수
8. TC Strength 및 Numeric Ordinal 개발
9. GT 또는 REF-ID Lookup을 Production Rule로 사용
10. Evidence가 부족하다는 이유로 정상 TC Scoring 중단
11. UNKNOWN을 무조건 Classic으로 치환
12. 허위 Coverage 또는 Accuracy 보고
13. 실패한 테스트를 성공으로 포장
14. 실제 업로드되지 않은 Drive 백업을 VERIFIED로 선언
15. 기존 Frozen 파일 삭제 또는 In-Place Mutation
16. 외부 유료 API 실행
17. 미승인 CEO 의미론을 자체 승인
18. Final Freeze 실패 후 형식적인 백업으로 완료 처리

---

# 16. REQUIRED FINAL STATUS

## OUTCOME A — ALL COMPLETED

다음이 실제로 전부 완료된 경우:

```text
TC_MANDATORY_SCORING       = VERIFIED
TC_DIRECTION_CONSTITUTION  = FINAL_FROZEN
TC_PRODUCTION_RELEASE      = VERIFIED
TC_FINAL_FREEZE            = VERIFIED
TC_LOCAL_FINAL_BACKUP      = VERIFIED
TC_GOOGLE_DRIVE_BACKUP     = VERIFIED
TC_WORKSTREAM              = COMPLETE_AND_CLOSED
NEXT                       = FULL_LOOK_EI
```

이 경우에만 TC 전체 완료로 보고한다.

## OUTCOME B — FREEZE & LOCAL BACKUP COMPLETE, DRIVE PENDING

Google Drive 접근이 없는 경우:

```text
TC_MANDATORY_SCORING       = VERIFIED
TC_DIRECTION_CONSTITUTION  = FINAL_FROZEN
TC_PRODUCTION_RELEASE      = VERIFIED
TC_FINAL_FREEZE            = VERIFIED
TC_LOCAL_FINAL_BACKUP      = VERIFIED
TC_DRIVE_UPLOAD_FOLDER     = READY_AND_VERIFIED
TC_GOOGLE_DRIVE_BACKUP     = PENDING_ACTUAL_UPLOAD_VERIFICATION
TC_WORKSTREAM              = BACKUP_GATE_PENDING
NEXT                       = CEO GOOGLE_DRIVE_UPLOAD
```

이 상태에서는 EI를 시작하지 않는다.

## OUTCOME C — FINAL FREEZE BLOCKED

다음과 같은 차단성 문제가 발견된 경우:

- 새로운 CEO 의미론 결정 필요
- 정상 Scorable Input이 계속 UNRESOLVED
- Product-Only 의미론 위반
- Regression Failure
- Production Dependency 검증 실패
- Frozen Authority Drift
- 기타 Final Freeze Gate 실패

다음으로 보고한다.

```text
TC_FINAL_FREEZE            = BLOCKED
TC_PRODUCTION_RELEASE      = NOT_PROMOTED
TC_LOCAL_FINAL_BACKUP      = NOT_FINAL
TC_WORKSTREAM              = OPEN
NEXT                       = SPECIFIC_BLOCKER_RESOLUTION
```

차단 사유와 영향을 받는 정확한 규칙 및 사례를 보고한다.

막연한 추가 연구 과제를 생성하지 않는다.

---

# 17. FINAL EXECUTION INSTRUCTION

이번 오더는 Full-Look TC Direction Engine을 마무리하기 위한 완결형 실행 오더다.

반드시 다음 순서로 진행한다.

**Authority Audit → Design Review → PRE Snapshot → FCR-TC-1 Correction → Successor Implementation → 43-Case Replay → Regression → Final Constitution → Freeze Gate → Production Release → Final Freeze → Local Backup → Restore Verification → Google Drive Preparation → Project Context Update → CEO Report**

핵심 성공 조건은 단순히 UNRESOLVED 숫자를 0으로 만드는 것이 아니다.

**Product-Only TC의 기존 의미론을 유지하면서, 실제 Vision Evidence Packet에서 얻을 수 있는 증거를 활용해 Classic과 Transformative를 정확하게 구분하는 결정적인 Direction Engine을 완성하는 것이다.**

기존 Vision에 없는 정보를 요구하거나 GT를 맞추기 위한 예외를 만드는 방식은 허용하지 않는다.

모든 필수 Gate가 통과되면 최종 동결과 로컬 백업까지 마무리한다.

Google Drive 업로드가 필요하면 CEO가 폴더 하나만 업로드할 수 있도록 준비한다.

최종 한국어 CEO 보고서를 제출하고, 실제 완료 상태를 정확하게 보고한다.

**HARD STOP: TC Final Freeze 및 Google Drive 백업 게이트가 끝나기 전에는 Full-Look EI 개발로 넘어가지 않는다.**
