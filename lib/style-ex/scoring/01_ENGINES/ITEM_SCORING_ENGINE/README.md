# 01_ENGINES/ITEM_SCORING_ENGINE

NEXT PRIMARY — 착수 시 이 폴더를 실제 작업 루트로 사용

> **Filesystem cleanup 2026-09-11.** 완료된 EI 개발 워크스페이스 144개를 엔진 루트에서 제거했습니다.
> 176 entries → 31. 고유 증거는 `99_ARCHIVE/ITEM_SCORING_ENGINE_CLEANUP_2026_09_11/`에 한 번만 보존.
> 기록: `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SCORING_ENGINE_FILESYSTEM_CLEANUP_V1/`
>
> **Filesystem cleanup 2026-09-16 (post SR freeze).** SR 후보/리뷰/QA 워크스페이스를 정리했습니다. 활성 SR 항목은 production engine + 그 binding 의존성만 남습니다.
> 고유 증거는 `99_ARCHIVE/SR_ENGINE_CLEANUP_2026_09_16/UNIQUE_HISTORY/` 에 한 번만 보존. 기록: `04_GOVERNANCE_AND_FINAL_DOCS/STMX_SR_POST_FREEZE_GOVERNANCE_AND_FILESYSTEM_CLEANUP_V1/`

---

## [SR] — ★ COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION (2026-09-15)

```text
SR PRODUCTION ENGINE = STMX_SR_ENGINE_V1   ·   COMPLETE_AND_CLOSED_AND_FROZEN
SR ELIGIBILITY · DIRECTION · STRENGTH · ORDINAL = CLOSED / FROZEN
⛔ Reopening any SR layer requires a CEO SR Change Proposal.
```

| 무엇 | 어디 |
|---|---|
| **production authority (start here)** | `STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json` |
| **production binding** | `STMX_SR_ENGINE_V1_FINAL_FREEZE/production/sr_engine_binding_v1.js` — binds every dependency BY NAME, fails closed, verifies the seal |
| **production entry point** | `STMX_SR_ENGINE_V1_FINAL_FREEZE/src/sr_engine_v1_final.js` |
| **ordinal projector (final)** | `STMX_SR_ENGINE_V1_FINAL_FREEZE/src/sr_ordinal_projector_v1_final.js` — SR7 = Full Governance · SR8 = exact ADR-125 predicate |
| **Direction dependency** | `STMX_SR_DIRECTION_FIRST_ENGINE_V1_2/` — frozen production dependency (aggregate `138adb1367ba7e4b…`) |
| **Strength dependency** | `STMX_SR_STRENGTH_TERNARY_V1_3_CANDIDATE/` — ⚠ frozen production dependency **despite the historical `_CANDIDATE` directory name**; the production binding and seal freeze it by explicit name and hash. Do not rename it. |
| **observation contract** | `../ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/` (37 parameters) |
| **eligibility authority** | `STMX_SR_DIRECTION_FIRST_ENGINE_V1_2/registry/sr_evidence_eligibility_registry_v1.json` (114 units · 101 ADJUDICABLE_WORN) — the engine never reads it; the caller supplies `sr_evidence_eligibility` and missing / invalid metadata fails closed |
| **freeze seal** | `STMX_SR_ENGINE_V1_FINAL_FREEZE/CODE_FREEZE_SEAL_SR_ENGINE_V1_FINAL.json` · full identity `59ea6dfdcca30ba8…` |
| **final governance** | `04_GOVERNANCE_AND_FINAL_DOCS/STMX_SR_ENGINE_FINAL_FREEZE_V1/` (read `17_…FINAL_REVIEW_V1.docx` first) |
| **post-freeze cleanup record** | `04_GOVERNANCE_AND_FINAL_DOCS/STMX_SR_POST_FREEZE_GOVERNANCE_AND_FILESYSTEM_CLEANUP_V1/` |
| **재현** | `node STMX_SR_ENGINE_V1_FINAL_FREEZE/tests/run_all.js` → 46/46 · canonical 101-unit replay · Vision API 0 |

```text
chain   governed sr_evidence_eligibility → Direction V1.2 → ternary Strength V1.3 → Final Ordinal Projector → SR1…SR9 | null
output  strength = ternary (canonical) · score = SR# (canonical)
        strength_legacy_v1_2_binary · score_legacy_v1_2 = explicitly named diagnostic provenance only
```

**Frozen accepted residue** — REF_000246 accepted governed cross-side residue · inherited Direction / Neutral-boundary residue · inherited Strength residue (475 · 493 · 494 · 575). These are governed and closed, not open defects.

**Open SR scoring-engine items: 0.** The only related future item is **SR-ING-1** (which governed upstream process supplies `sr_evidence_eligibility` for newly ingested evidence) — a future integration decision that does not reopen SR.

⛔ Do not rename or edit any bound dependency directory. ⛔ Do not re-bind the historical candidate projector. ⛔ No Parameter 38.


---

## [EI] — CLOSED_AND_FROZEN · ⛔ 재개 금지

| 무엇 | 어디 |
|---|---|
| **최종 동결 권위** | `STMX_EI_ENGINE_V1_SUCCESSOR_FREEZE_2026_09_08/` |
| **공식 종료 + Drive 검증** | `STMX_EI_ENGINE_V1_OFFICIAL_CLOSURE_2026_09_08/` |
| **Numeric frozen baseline** | `STMX_EI_NUMERIC_V1_FROZEN_BASELINE_R1/` · 15 entries · aggregate `5c5ad6e233277ae8…` |
| **Direction frozen baseline** | `STMX_EI_DIRECTION_FROZEN_BASELINE_V1/` · 324 entries |
| **production runtime** | `STMX_EI_DIRECTION_RUNTIME_V1_2_7/` |
| **production binding** | `STMX_EI_DIRECTION_RUNTIME_V1_2_7/src/producer_contract_binding_v1.js` → `STMX_VISION_PRODUCER_V1_1` (이름 bind) |
| **rollback target** | `STMX_EI_DIRECTION_RUNTIME_V1_2_6/` |
| **final review evidence** | `STMX_EI_ENGINE_V1_SUCCESSOR_FREEZE_2026_09_08/CHATGPT_INDEPENDENT_REVIEW_PACKAGE_EI_ENGINE_V1_SUCCESSOR_FREEZE/` |

**재현 명령**

```bash
node "STMX_EI_ENGINE_V1_SUCCESSOR_FREEZE_2026_09_08/CHATGPT_INDEPENDENT_REVIEW_PACKAGE_EI_ENGINE_V1_SUCCESSOR_FREEZE/reproduce_ei_engine_v1_successor_freeze.js"
```

116 assertions · package-only · ⛔ API 호출 0.

⛔ `STMX_EI_NUMERIC_V1_FROZEN_BASELINE`(R1 아님)는 SUPERSEDED_FOR_PACKAGING_INTEGRITY 전임자이며 현재 권위가 아닙니다.

---

## [DM] — COMPLETE_AND_CLOSED_AND_FROZEN · ⛔ 재개 금지

| 무엇 | 어디 |
|---|---|
| **Observation production** | `../ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/` (PRODUCTION · DIRECTION-BSC-1 coverage corrected) · M1 predicate `STMX_DM_OBSERVATION_LAYER_IMPLEMENTATION_V1/engine/` |
| **Engine source (Direction frozen · Strength · projection)** | `STMX_DM_DIRECTION_FIRST_ENGINE_V1/engine/` (bytes unchanged since 2026-09-12) |
| **★ Full-engine production authority** | `STMX_DM_ENGINE_PRODUCTION_AUTHORITY_V1.json` |
| **★ production binding** | `STMX_DM_ENGINE_V1_FINAL_FREEZE/production/dm_engine_binding_v1.js` → `STMX_DM_ENGINE_V1` + `STMX_VISION_PRODUCER_V1_3` (이름 bind · fails closed) |
| **★ final freeze seal** | `STMX_DM_ENGINE_V1_FINAL_FREEZE/CODE_FREEZE_SEAL_DM_ENGINE_V1_FINAL.json` |
| HOLD build (historical · rollback entry point) | `STMX_DM_ENGINE_V1_PRODUCTION_CLOSURE/` (binds V1_2) |
| Direction closure authority (historical) | `STMX_DM_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json` · `STMX_DM_DIRECTION_PRODUCTION_CLOSURE_V3/` |
| **GT · SET A / SET C** | `STMX_DM_DIRECTION_STRENGTH_CLOSURE_V2/tests/` |
| **GT · SET B(47) · live 8** | `STMX_DM_DIRECTION_FIRST_ENGINE_V1/tests/` · `STMX_DM_OBSERVATION_INTEGRATION_CLOSURE_LIVE_VALIDATION_V1/live/` |
| **Regression** | `STMX_DM_DIRECTION_FIRST_ENGINE_V1/tests/` (Direction 141 · Strength/Final Score 113) · BSC-1 targeted corpus `04_GOVERNANCE_AND_FINAL_DOCS/STMX_DM_DIRECTION_BSC1_CONTRACT_CORRECTION_FULL_FREEZE_V1/tests/` |
| **최종 closure / review** | `04_GOVERNANCE_AND_FINAL_DOCS/STMX_DM_DIRECTION_BSC1_CONTRACT_CORRECTION_FULL_FREEZE_V1/` |

```text
DM_OBSERVATION   = PRODUCTION
DM_DIRECTION     = FINAL CLOSED_AND_FROZEN
DM_STRENGTH      = CLOSED_AND_FROZEN   (CEO 2026-09-12)
DM_FINAL_SCORE   = CLOSED_AND_FROZEN   (CEO 2026-09-12)
DM_FULL_ENGINE   = COMPLETE_AND_CLOSED_AND_FROZEN   (2026-09-13)
```

---

## [TC] — COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION (2026-09-27)

```text
EI = COMPLETE_AND_CLOSED_AND_FROZEN
DM = COMPLETE_AND_CLOSED_AND_FROZEN
SR = COMPLETE_AND_CLOSED_AND_FROZEN
TC = COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION   (STMX_TC_ENGINE_V1)
```

| 무엇 | 어디 |
|---|---|
| **production authority** | `STMX_TC_ENGINE_PRODUCTION_AUTHORITY_V1.json` |
| **production runtime** | `STMX_TC_INTEGRATED_RUNTIME_V1_CANDIDATE/` — ⚠ historical `_CANDIDATE` directory name, production by explicit name and hash; do not rename |
| **freeze + limitations** | `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_TC_ENGINE_FINAL_FREEZE_V1.md` · `STMX_TC_FINAL_LIMITATION_REGISTER_V1.md` |

TC output: CLASSIC → TC1–TC4 bounded · TRANSFORMATIVE → TC6–TC9 bounded · DIRECTION_UNRESOLVED → NOT_ELIGIBLE · `score = null` with a governed cause (no exact TC score under the frozen limitations) · TC5 never emitted. ⛔ Changes need an explicit TC REOPEN DECISION. ⛔ `stmx_engine_latest.js`(RETIRED)로 되돌아가지 않습니다.

---

## [STMX ITEM SCORING ENGINE V1] — four-axis composition · COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION (2026-09-27)

EI · TC · SR · DM are integrated through the Clean Engine (Item Entry → unchanged generic binding → registry `AXIS_BINDING_CONTRACTS_V5_PRODUCTION` → the four frozen axis authorities → Result Composer). **The unified layer is orchestration / composition, not a fifth scorer:** the four axes remain independently governed scoring authorities and each result is returned unchanged (null · range · status preserved).

| 무엇 | 어디 |
|---|---|
| **V1 manifest (start here)** | `STMX_ITEM_SCORING_ENGINE_V1_MANIFEST.json` (FINAL_PRODUCTION_AUTHORITY) |
| **Item Entry · Result Composer · contracts** | `STMX_CLEAN_ENGINE/04_CLEAN_ENGINE_CODE/src/item/` |
| **EI production pointer** | `STMX_EI_ENGINE_PRODUCTION_AUTHORITY_V1.json` (EI-owned integration `STMX_EI_PRODUCTION_INTEGRATION_V1_CANDIDATE/`) · DM adapter `STMX_DM_ITEM_ENTRY_ADAPTER_V1_CANDIDATE/` |
| **freeze · limitations · replay** | `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_ITEM_SCORING_ENGINE_V1_FINAL_FREEZE.md` · `…_FINAL_LIMITATION_REGISTER.md` · replay in `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SCORING_ENGINE_V1_FINAL_FREEZE_AND_PRODUCTION_PROMOTION/prototypes/` |

V1 limits: no real governed record carries evidence for all four axes · no exact TC score · no SR engine-level matched-pair result (9 units) · arbitrary new garments / photos not supported · legacy Clean Engine L1 / L2 is outside the V1 path. No public API.


---

## [Shared]

| 무엇 | 어디 |
|---|---|
| canonical score notation | `stmx_score_notation_v1.js` (DM1…DM9) |
| notation 테스트 | `tests/` |
| forward runtime target | `STMX_CLEAN_ENGINE/` |
