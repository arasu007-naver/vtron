# STMX Full-Look Style Vision Extractor — FINAL V1

Freeze identity **FLV-FINAL-FREEZE-V1-2026-10-17** · accepted implementation = sealed **RC6** (`SEAL-FLV-RC6-2026-10-17`, promoted unchanged) · packet contract **V1_RC4** · prompt **V2** (`535bc1836a574e9c…`) · model **claude-opus-5-5**

이 프로그램은 Full-Look 이미지 한 장에서 **관찰 가능한 사실**을 읽어 STMX 증거 계약(Evidence Packet)으로 구조화해 채점 엔진에 넘깁니다. **점수, EI·TC·SR·DM 방향, Style ID는 계산하지 않습니다.**

## 1. 무엇을 입력받나
- **실제 새 이미지 판독은 외부 모델이 합니다.** 이 폴더의 프로그램은 오프라인 처리기이고, 이미지 인식 기능은 없습니다.
- 입력은 다음 중 하나입니다.
  - Anthropic Messages API의 원응답 JSON 전체 (`--raw-response`)
  - 모델 텍스트만 (`--model-text`)
  - 이미 해석된 모델 JSON (`--model-output`)
- 선택 입력 `--identity <json>`(image_ref · image_hash · prompt_version · prompt_hash · model_id · run_id)은 run_record의 출처 필드를 채웁니다.

## 2. 새 이미지를 관찰하는 방법 (외부 모델 — 이 릴리스는 호출하지 않음)
1. 이미지 원본 1장(JPEG · PNG · WEBP)과 `02_PROMPT/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt` 전문을 **한 개의 user 메시지**로 보냅니다(이미지 블록 + 텍스트 블록).
2. 설정: 모델 `claude-opus-5-5` · `max_tokens` 32000 · system·tools·temperature 없음. 자세한 내용은 `02_PROMPT/PROMPT_AND_MODEL_CONFIGURATION.json`에 있습니다.
3. 받은 응답 JSON 전체를 파일로 저장합니다.

⛔ 유료 모델 호출은 STMX 가드 **G53**에 따라 CEO의 별도 승인 없이는 금지됩니다. 런타임의 LiveVisionProvider는 항상 거부합니다.

## 3. 오프라인 처리 (저장된 응답)
Node.js 18 이상이면 됩니다. npm 패키지와 네트워크는 필요 없습니다.

```
node 01_RUNTIME/01_ENGINES/STYLE_VISION_EXTRACTOR/FLV_RC6_FINAL/cli/run_offline.js --raw-response 04_SAMPLES/inputs/F298.raw_response.json --identity 04_SAMPLES/inputs/F298.identity.json --out <출력폴더>
```

## 4. 출력 파일 (`--out` 폴더)
- **`packet.json` = 정본 Evidence Packet**(채점 엔진이 소비)
- `run_record.json` — 파라미터 ID별 셀 투영(SVP-xxx@cN)
- `validation.json` — 계약 검증 결과
- `provenance.json` — 변환·요청·격리 기록
- `native_check.json` — 원출력 계약 검사
- `summary.json` — 상태(`PACKET_VALID`)·종료 코드(0 = 유효, 2 = 추출 실패)
- `unresolved_fields.json`
- `tc_product_evidence_view.json` — 읽기 전용 진단, 패킷에는 들어가지 않음

## 5. 검증
- `validation.json`의 `ok: true`와 `summary.json`의 `PACKET_VALID`를 확인합니다.
- 릴리스 전체 검증:

  ```
  node 06_RELEASE_VERIFICATION/verify_release.js --out <릴리스 밖 폴더>
  ```

  다음을 확인하고, 모두 통과하면 `RELEASE_VERIFIED`를 출력합니다.
  - 파일 해시
  - 봉인
  - RC6 바이트 동일성
  - 의존성
  - 12개 표본 재현
  - 78/78 · 46/46
  - G53

## 6. 채점 엔진이 소비하는 방법
`05_DOCS/SCORING_ENGINE_HANDOVER.md`를 보세요. 다루는 내용:
- 입력 인터페이스
- 축별 증거 지도
- 상태 어휘
- 보존해야 할 동결 의존성
- 다음 스프린트 범위

## 폴더 구성
| 폴더 | 내용 |
|---|---|
| `01_RUNTIME/` | 실행 코드 = 봉인 RC6 바이트 그대로(`01_RUNTIME/01_ENGINES/STYLE_VISION_EXTRACTOR/FLV_RC6_FINAL`, 126개 파일) + 동결 의존성 4개(마스터와 같은 상대 위치) |
| `02_PROMPT/` | 승인 프롬프트 V2 원문 · 해시 · 모델 설정 · 출처 |
| `03_SCHEMAS_AND_AUTHORITIES/` | 패킷 스키마 · 계약 설명 · 파라미터 41개 참조 · 구성요소 참조 규칙 · 버전 manifest · RC6 봉인 · 런타임↔RC6 파일 대응표 |
| `04_SAMPLES/` | EX-04 실응답 12개(입력) · 기대 출력 · 단계별 표본(해석된 관찰 → 변환 → 패킷 → EI/TC/SR/DM 증거 보기) |
| `05_DOCS/` | 채점 엔진 인계서 · 알려진 제약 |
| `06_RELEASE_VERIFICATION/` | 독립 검증기 |
| `SHA256SUMS.txt` · `FINAL_FREEZE_SEAL.json` · `VERSION.json` | 무결성 · 동결 식별 · 버전 |

거부된 프롬프트 V3 · V3_UNVALIDATED · V3_1은 이 릴리스에 없습니다.
