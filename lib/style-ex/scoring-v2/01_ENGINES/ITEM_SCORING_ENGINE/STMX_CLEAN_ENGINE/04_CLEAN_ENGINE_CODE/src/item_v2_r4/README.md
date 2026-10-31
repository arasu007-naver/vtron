# src/item_v2_r4 — STMX Integrated Item Scoring Runtime V2 · R4 (CANDIDATE)

> Status: **CANDIDATE** — offline-verified only · not production · not frozen · live multi-target colour accuracy **NOT_DEMONSTRATED** (G53 ACTIVE).
> Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — TARGET-AWARE COLOUR EXTRACTION SUCCESSOR, SUIT MEMBER COLOUR ASSOCIATION, INTEGRATED RUNTIME R4 … §9). Affected Scope: this directory (new). `src/item_v2_r3/` and its chain (R2 · R1 · item_v2), the four frozen V2 engines, the three Suit successors, Item Vision V1.3 and Colour V1 are unchanged.

## 한국어 요약

R4는 R3를 그대로 쓰고, 색상 연결만 추가합니다.

1. 채점할 상품(옷 한 벌 또는 수트 두 벌)을 먼저 정합니다. R3의 선택 규칙을 그대로 씁니다.
2. 그다음 그 상품의 대상 옷에 해당하는 색만 붙입니다. 색은 대상 지정 색상 후속 버전이 만든 검증된 패킷으로만 받습니다.
3. 패킷의 사진 해시, 대상 목록, 무결성이 이 요청과 맞지 않으면 채점하지 않습니다(INPUT_CONTRACT_NONCONFORMING).
4. 다른 옷의 색을 빌리지 않고, 수트 구성품끼리 색을 복사하지 않습니다. 색이 없는 대상은 동결 EI 규칙대로 "색상 미확인"으로 채점됩니다.
5. 같은 색이 주어지면 결과는 R3와 바이트 단위로 같습니다.

## Flow

```
request = R3 request + image_sha256 + target_colour_packet        (raw colour_observations → COLOUR_PROVENANCE_REQUIRED)
  resolve the scoring unit (sealed R1 validate / select + sealed R3 §8 policy)
    invalid / UNRESOLVED → sealed R3 result verbatim (selection request; colour waits for resumeWithSelection)
    ITEM target | SUIT members →
      packet checks: successor verifyPacket · image sha256 + image_id · packet manifest == the manifest THIS envelope yields   (fail → INPUT_CONTRACT_NONCONFORMING)
      attach each unit target's OWN OBSERVED colour (by target_id) — NOT_ACQUIRED / NOT_VISIBLE / NOT_RETURNED / REJECTED → no colour
      sealed R3 scores the request + those colours → result verbatim + internal.colour_association
planColourAcquisition(request) → manifest + ONE_CALL / PER_TARGET call plans (no call)
```

## Files

| File | Role |
|---|---|
| `item_v2_r4_contracts.js` | R4 identifiers (candidate vocabulary) |
| `item_v2_r4_predecessor_pin.js` | pins sealed R3 (and its chain) + the sealed colour successor — fail closed |
| `item_v2_r4_colour_binding.js` | packet ↔ request / envelope checks · own-colour attachment |
| `item_v2_r4_entry.js` | `scoreItemV2R4` · `resumeWithSelection` · `planColourAcquisition` |
| `item_v2_r4_cli.js` | offline demonstration CLI |
| `tests/run_all.js` | order §10 A – G (labels: REAL_V1_3 · REAL_STORED_COLOUR · CONFORMING_GRAFT · SYNTHETIC) |
| `verify_identity.js` | seal check |

## Run (offline)

```
node tests/run_all.js
node verify_identity.js
```

Rollback: do not call R4. R3 is unchanged and remains callable as before.
