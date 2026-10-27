<!-- SR_FREEZE_V1 -->
> # 🔒 STMX SR = FROZEN (SR_FREEZE_V1 · 2026-07-23)
> **STATUS: FROZEN · Production Reference · No Further Modification** (변경 시 새 ADR/Amendment 필수). SR Canonical FROZEN Set 구성. 정본 Master Closing = `STMX_SR_FINAL_FREEZE_REPORT_V1.md`.
>
> ## 🛠 CONTROLLED AMENDMENT — ADR-123 (CEO 2026-08-09 · Shoulder & Waist Canonical Reconciliation)
> **P1 Pre-Pilot Scoring Sufficiency Audit(D1–D5)에서 확인된 SR ↔ Frozen Vision Extraction Schema contradiction을 CEO 결정으로 해소.** 정본 amendment = `STMX_SR_SHOULDER_WAIST_FROZEN_RECONCILIATION_AMENDMENT_V1.md`.
> - **Decision A (Shoulder):** `shoulder_structure = None/Mild/Strong/**Extreme**` (4-value 유지). SR 소비 범위 = **Outerwear · Dress · Jumpsuit**. `Extreme`는 legitimate canonical SR Shoulder state(unreachable/non-canonical 표기는 SUPERSEDED). Dress/Jumpsuit에서의 rarity ≠ applicability exclusion.
> - **Decision B (Waist):** Vision canonical = `waist_definition = Undefined/Defined/Cinched` 유지. **SR mapping: Undefined→None · Defined→Mild · Cinched→Strong.** duplicate `waist_cinching` Vision observation 신설 0(One Concept). SR 소비 범위 = **Outerwear · Dress · Jumpsuit**. Waist result = **visible silhouette** 판독(Belt/seam/corset-product-name presence ≠ automatic Cinched/Defined/Strong).
> - **SUPERSEDED (아래 clause):** 본 문서 §"유지되는 선행 승인" #1·#4 · §2 Outerwear Extension의 **EX-1·EX-2 "Outerwear 전용"** · §2.1 구조표의 Shoulder/Waist Outerwear-한정 · **EX-3**(Dress/Jumpsuit Upper 두 Carrier 부재) — 전부 **ADR-123으로 SUPERSEDED**. **EX-4(Carrier 부재 ≠ 값 None · 부재 시 필드 자체 없음)은 존치**(Dress/Jumpsuit는 이제 carrier 보유이므로 EX-4는 carrier-absent category[T-shirt/Shirt/Sweater/Sweatshirt]에만 적용).
> - **불변:** shoulder/waist **value domain**(신규 값 0) · Fit·Fabric Common Upper Physics · `fabric_behavior` Level 0(ADR-028 M3) · SR7 Shoulder Authority · WAIST_GOV_BRIDGE(R-BRIDGE 별도) · score physics 수치(numeric 0). **[★ ADR-125 RESOLVED 2026-08-10]** ~~`Extreme` score physics treatment = 현 Frozen에 미정~~ → **governance rule RESOLVED (ADR-123 Decision C · `Strong OR Extreme` interim)** · **canonical SR8 ordinal RESOLVED (ADR-125 · `Extreme` = SR8 escalator · `Extreme > Strong` canonical · DC-PARTIAL)** · **runtime implementation = pending**(별도 sprint · scoring number 신설 0). Engine SHA `225252b1afa8d75b` 불변(code 변경 0 · doc-first).

# STMX SR Upper Physics Contract V1

```text
STATUS : 🔒 FROZEN — CEO APPROVED
         ★ AMENDED 2026-07-21 — body_fitting ROLLBACK · Fit Canonical Restoration
TYPE   : SR UPPER PHYSICS CANONICAL CONTRACT
AXIS   : SR ONLY
DATE   : 2026-07-21
ID     : UP-C1

ARCHITECTURE            : FROZEN
RUNTIME                 : IMPLEMENTATION PENDING
VISION PRODUCER         : IMPLEMENTATION PENDING
REGRESSION ALIGNMENT    : NOT STARTED
HUMAN VALIDATION RE-RUN : NOT STARTED
```

> ## ⚠ POST-APPROVAL ROLLBACK — 2026-07-21
>
> ```text
> POST-APPROVAL ROLLBACK
> CEO removed body_fitting
> from the active Architecture.
> Fit is the sole Canonical
> Upper Vocabulary.
> ```
>
> **본 Contract는 `body_fitting` Rollback을 반영하여 개정되었다.** 활성 Upper Canonical Vocabulary는 **`Fit` 하나뿐**이다.
> 동일 물리 현상에 두 개의 Canonical Vocabulary를 두지 않는다.

> **근거:** Claude Order — STMX SR Body_Fitting Rollback & Fit Canonical Restoration Sprint (CEO Decision 2026-07-21)
> **상위 정본:** `STMX_SR_CONSTITUTION_V3.md` **V3.13** (§0 Fit — Upper Canonical Vocabulary · §0 Waist Scope Principle · §1 SR6 Applicable Factor Principle)
> **신규 Vocabulary / Primitive / Enum / Category = 0.** 본 Contract는 **기존 Frozen 개념만** 사용한다.

---

## 0. CEO Approval Anchor

```text
CEO FINAL DECISION — 2026-07-21 (Rollback)

The term "body_fitting" is removed from the active SR Architecture.
It represented the same physical concept already expressed by Fit.

The active Upper Canonical Physics are:
    Fit
    Fabric

Outerwear extends them with:
    Shoulder
    Waist

No duplicate vocabulary is permitted for the same physical phenomenon.
Historical reports remain unchanged.
Only active normative documents are corrected.
```

**유지되는 선행 승인 (변경 없음):**

| # | 항목 |
|---|---|
| 1 | `shoulder_structure` · `waist_cinching`은 **Common Upper Physics가 아니다** — ~~Outerwear-only~~ structural extension. **[ADR-123 SUPERSEDED: "Outerwear-only" → Outerwear·Dress·Jumpsuit. Common Upper Physics(Fit+Fabric) 비소속은 불변.]** |
| 2 | Dress Upper · Jumpsuit Upper는 T-shirt/Shirt/Sweater/Sweatshirt 규칙을 **따르지 않는다.** Common Upper Physics를 **독립적으로 소비**한다. |
| 3 | **SR7 Shoulder Authority 불변.** |
| 4 | ~~`waist_cinching`은 **WS-1에 따라 Outerwear 전용**이다.~~ **[ADR-123 SUPERSEDED: Waist(Vision `waist_definition` → SR None/Mild/Strong) 소비 범위 = Outerwear·Dress·Jumpsuit. WS-1/ADR-032의 Outerwear-only scope는 ADR-123으로 확장.]** |
| 5 | **WAIST_GOV_BRIDGE는 본 승인에 포함되지 않으며 변경되지 않았다** — 별도 필수 Review(`R-BRIDGE`). |

---

## 1. Common Upper Physics

```text
COMMON UPPER PHYSICS
  1. Fit
  2. Fabric
```

**적용 대상:** T-shirt · Shirt · Sweater · Sweatshirt · **Dress Upper** · **Jumpsuit Upper** · **Outerwear**

> ⛔ **금지 표현:**
> ```text
> Common Upper Physics = shoulder_structure + Fit + Fabric        ← 금지
> Common Upper Physics = body_fitting + fabric_behavior           ← 금지 (Rollback)
> ```
> **`shoulder_structure`는 Common Upper Physics가 아니다.**
> **`body_fitting`은 활성 Architecture에 존재하지 않는다.**

> ⚠ **`Fabric`(`fabric_behavior`)은 Level 0 (Material) Factor다.** ADR-028 M3에 따라 **Runtime State/Tier 분류에 직접 참여하지 않는다.**
> **[★ ADR-124 SCOPE CLARIFICATION (CEO 2026-08-09 · RC3):** M3의 "Runtime State/Tier 미참여"는 **Fabric이 독립적으로 점수/Tier를 부여·이동시키지 않는다**는 뜻이다(numeric 0·Tier 단독 결정 0 불변). **그러나 Fabric Behavior는 다른 canonical carrier가 만든 Governance/Release State를 disambiguate하는 contextual evidence로 기능할 수 있다**(예: Extreme expansion이 Structured면 volume 유지→SR3-compatible / Fluid면 collapse→SR2-compatible). **Fabric alone은 결코 Tier를 결정하지 않는다.** 정본 = `STMX_SR_FABRIC_CONTEXTUAL_EVIDENCE_AMENDMENT_V1.md`.]**

---

## 2. Outerwear Extension

```text
OUTERWEAR EXTENSION
  1. Shoulder   (shoulder_structure)
  2. Waist      (waist_cinching)
```

### 2.1 최종 구조 **[★ ADR-123 AMENDED — 아래 구조는 SUPERSEDED · 신규 구조 참조]**

> ~~(SUPERSEDED pre-ADR-123)~~
> ```text
> TOP / DRESS UPPER / JUMPSUIT UPPER      ← Fit + Fabric only (구)
> OUTERWEAR (JACKET·COAT)                 ← Fit + Fabric + Shoulder + Waist (구)
> ```

**신규 구조 (ADR-123 · CEO 2026-08-09):**

```text
TOP  (T-shirt · Shirt · Sweater · Sweatshirt)
    Fit
  + Fabric

OUTERWEAR (JACKET · COAT) · DRESS · JUMPSUIT
    Fit
  + Fabric
  + Shoulder     ← shoulder_structure (None/Mild/Strong/Extreme) · SR-consumable
  + Waist        ← Vision waist_definition (Undefined/Defined/Cinched) → SR (None/Mild/Strong)
```
> **Shoulder·Waist = SR-consumable observations for Outerwear·Dress·Jumpsuit when visually observable/applicable.** rarity ≠ non-applicability. Value domain 불변 · Fabric Level 0 불변.

### 2.2 불변사항

| # | 불변 |
|---|---|
| **EX-1** | ~~`shoulder_structure`는 **Outerwear 전용**이다. (Upper Carrier Amendment V2 · CEO 2026-07-20)~~ **[ADR-123 SUPERSEDED → Outerwear·Dress·Jumpsuit]** |
| **EX-2** | ~~`waist_cinching`은 **Outerwear 전용**이다. (WS-1 · CEO 2026-07-21)~~ **[ADR-123 SUPERSEDED → Outerwear·Dress·Jumpsuit · Vision `waist_definition` mapping]** |
| **EX-3** | ~~Top · Dress Upper · Jumpsuit Upper에는 **두 Carrier가 모두 존재하지 않는다.**~~ **[ADR-123 SUPERSEDED: Dress·Jumpsuit는 이제 Shoulder·Waist carrier 보유. Carrier-absent = T-shirt/Shirt/Sweater/Sweatshirt에만.]** |
| **EX-4** | **Carrier 부재 ≠ Factor 값 `None`.** `None` · `null` · `N/A` · placeholder · default **전부 금지.** 필드 자체가 존재하지 않는다. **[존치 · ADR-123: 이제 carrier-absent category(T-shirt/Shirt/Sweater/Sweatshirt)에만 적용]** |

```text
❌ shoulder_structure = None   ·   waist_cinching = None      ← 넣지 않는다
✅ 해당 필드 자체가 존재하지 않는다
```

---

## 3. Category / Region Matrix — 정본 **[★ ADR-123 CORRECTED 2026-08-09]**

> Shoulder/Waist applicability ✔ = SR-consumable observation **존재**(모든 image가 non-neutral 값 산출 의무 아님 · rarity ≠ non-applicability).

| Region | Fit | Fabric | Shoulder | Waist |
|---|---|---|---|---|
| **T-shirt** | ✔ | ✔ | ✘ | ✘ |
| **Shirt** | ✔ | ✔ | ✘ | ✘ |
| **Sweater** | ✔ | ✔ | ✘ | ✘ |
| **Sweatshirt** | ✔ | ✔ | ✘ | ✘ |
| **Dress Upper** | ✔ | ✔ | **✔ [ADR-123]** | **✔ [ADR-123]** |
| **Jumpsuit Upper** | ✔ | ✔ | **✔ [ADR-123]** | **✔ [ADR-123]** |
| **Outerwear** (JACKET · COAT) | ✔ | ✔ | ✔ | ✔ |
> *(구: Dress Upper·Jumpsuit Upper = Shoulder ✘ Waist ✘ · ADR-123으로 SUPERSEDED. Waist canonical Vision field = `waist_definition`→SR None/Mild/Strong.)*

> **본 Matrix가 SR Upper Physics의 단일 정본이다.** 다른 모든 Live normative 문서의 Matrix는 이와 동일해야 한다.
> ✔ = Carrier 존재(Architecture Contract) · ✘ = **Carrier 부재(필드 자체 없음)**
> ⚠ ✔는 **Architecture상의 Carrier 적용 여부**이며 **Vision/Runtime 구현 완료를 뜻하지 않는다.**

---

## 4. Fit — Upper Canonical Vocabulary

> **`Fit`은 의복의 Upper Region이 신체 몸통에 얼마나 가깝게 맞고, 신체 윤곽을 얼마나 연속적으로 따라가는지를 표현하는 SR Upper Canonical Vocabulary이다.**

| 항목 | 내용 |
|---|---|
| **Canonical Name** | **`Fit`** (ADR-025 §3·§4 · **기존 Frozen**) |
| **Value Domain** | `Slim / Regular / Relaxed / Oversized` (Dress Lower · Skirt는 `Voluminous`) — **변경 0 · 신규 enum 0** |
| **적용 대상** | Upper 전 Region (Top 4 archetype · Dress Upper · Jumpsuit Upper · Outerwear) |
| **비적용** | **Lower 전 영역.** Lower는 `hip_thigh_control` · `release_behavior` · `silhouette_expansion` · `fabric_behavior` (Bottom Primitive Amendment · CEO 2026-07-20) |

### 4.1 Observation 예시 (Visible Observation → Fit)

```text
Visible Observation:
  - 몸통 외곽선이 신체 윤곽을 연속적으로 따라감
  - 의복과 신체 사이의 가시적 여유가 거의 없음
  - 몸통 구간 전체에서 밀착이 지속됨

Fit:
  - Slim
```

### 4.2 오판 방지 — **추론 금지**

`Fit`은 다음에서 **직접 추론하지 않는다:**

| # | 금지 근거 |
|---|---|
| 1 | **다트 존재** |
| 2 | **심 존재** |
| 3 | **패널 절개** |
| 4 | **Tailoring 명칭** |
| 5 | **"Bodycon"이라는 상품명** |
| 6 | **"Slim Fit"이라는 판매 문구** |

> **가시적인 외부 실루엣 결과를 관측한 뒤 판단한다.** (Constitution §0 Visible Silhouette Reading Principle)

### 4.3 중복 소비 금지

- 허리선 **한 지점**을 `waist_cinching`과 `Fit`이 **동시에** 근거로 삼지 않는다.
- Outerwear에서도 **몸 전체가 슬림하다는 이유만으로 `waist_cinching = Strong`을 부여하지 않는다.**

---

## 5. Fit Layer

```text
Fit  =  Upper Canonical Vocabulary  /  Upper Runtime Language Carrier
```

| 항목 | 내용 |
|---|---|
| **적용 범위** | **Upper 전용** |
| **Lower** | **`Fit`을 사용하지 않는다.** Lower는 Bottom Primitive 구조 유지 |
| **이름 충돌** | **정본 Contract에서는 이미 해소된 상태다** — `fit`은 Upper에만 존재하고 Lower에서는 금지 필드다 |

> ⛔ **`Fit` 위·아래에 별도 Judgment Primitive Layer를 두지 않는다.** (Rollback · CEO Decision 2026-07-21)

---

## 6. Traceability

```text
Visible Observation
   → Fit
      → SR Runtime State
```

**중간 Layer를 만들지 않는다.**

> ⛔ **삭제된 Traceability (Rollback):**
> ```text
> Observation → body_fitting → Fit → Runtime      ← 활성 Architecture에 존재하지 않는다
> ```

### 6.1 관측 해상도 — 미확정 (새 Rule을 만들지 않는다)

| 항목 | 상태 |
|---|---|
| `Fit = Slim` | 밀착이 지속되는 상태 — 관측 가능 |
| `Fit = Regular` ↔ `Relaxed` **경계 판별 기준** | **`UNRESOLVED`** — 기존 Frozen 근거로 단일 결정되지 않음 |

```text
VALUE DOMAIN FROZEN
OBSERVATION RESOLUTION — IMPLEMENTATION STUDY REQUIRED
```

> **근거(원문):** `STMX_SR_OBSERVATION_EXPANSION_ARCHITECTURE_V1` — Top·Outerwear·Dress Upper·Jumpsuit Upper 공통 "현재 불가능한 것: **Regular ↔ Relaxed**".
> ⛔ **본 Contract에서 `Regular` 판별 기준을 새로 추측하지 않는다.** → Backlog `AL-4`.

---

## 7. Dress / Jumpsuit Upper Contract

### 7.1 정본 (영)

> **Dress Upper and Jumpsuit Upper are independent consumers of the Common Upper Physics Contract.**

### 7.2 정본 (한)

> **Dress Upper와 Jumpsuit Upper는 특정 Top Archetype의 규칙을 상속하거나 추종하지 않는다. 두 영역은 다른 Upper Category와 동일한 Common Upper Physics를 독립적으로 소비한다.**

```text
Dress Upper        ≠ T-shirt follower  ≠ Shirt follower  ≠ Sweater follower  ≠ Sweatshirt follower
Jumpsuit Upper     ≠ T-shirt follower  ≠ Shirt follower  ≠ Sweater follower  ≠ Sweatshirt follower
```

### 7.3 반드시 유지할 것

| # | 유지 항목 |
|---|---|
| **DJ-1** | Dress/Jumpsuit의 **ONE-PIECE Archetype 유지** |
| **DJ-2** | **Upper / Lower Region 분리 유지** (ADR-028 M4) |
| **DJ-3** | **제품 단일 SR = Runtime이 Midpoint Resolution으로 결정**(CEO 2026-07-22 · MR-1). ⛔ 원 정의(Historical): "Score Physics Layer 책임" — 폐지 |
| **DJ-4** | Neckline · Sleeve · Collar · Knit 여부를 근거로 **숨은 Top Archetype을 생성하지 않는다** |
| **DJ-5** | **Shirt Dress를 Shirt로 재분류하지 않는다** |
| **DJ-6** | **Knit Dress를 Sweater로 재분류하지 않는다** |

> **[★ ADR-123 CORRECTED]** ~~Top 4 archetype과 Dress/Jumpsuit Upper의 Factor 구성은 동일하다.~~ **정정:** Common Upper Physics(**Fit + Fabric**)는 전 Upper Category 공통이나, **Dress/Jumpsuit Upper는 ADR-123으로 Shoulder + Waist를 추가로 소비**하므로 Top 4 archetype(Fit+Fabric only)과 **Factor 구성이 더 이상 동일하지 않다.** "따른다"가 아니라 "같은 Common Contract를 각자 소비 + Dress/Jumpsuit는 Shoulder/Waist extension 보유"다.
> **Dress/Jumpsuit는 여전히 ONE-PIECE archetype**(Top follower 아님) · **차이는 Segment 수(Upper/Lower 2 Region)에 더해 Shoulder/Waist carrier 보유.**

---

## 8. Explicit Non-Rules

| # | 금지 규칙 |
|---|---|
| **NR-1** | Dress Upper를 자동으로 **Shirt로 분류하지 않는다.** |
| **NR-2** | Jumpsuit Upper를 자동으로 **T-shirt로 분류하지 않는다.** |
| **NR-3** | Neckline · Sleeve · Collar만으로 **follower archetype을 만들지 않는다.** |
| **NR-4** | Shirt Dress를 SR에서 **Shirt Archetype으로 재분류하지 않는다.** |
| **NR-5** | Knit Dress를 **Sweater Archetype으로 재분류하지 않는다.** |
| **NR-6** | Tailored Dress에 **Waist를 자동 부여하지 않는다.** |
| **NR-7** | Bodycon Dress의 신체 밀착을 **Waist로 중복 소비하지 않는다.** |
| **NR-8** | Outerwear에서도 **전신 슬림만으로 Waist Strong을 부여하지 않는다.** |
| **NR-9** | `torso_control` · `upper_contact` · `dress_upper_fit` · `one_piece_fit` · `tailored_body_control` · `waist_fit` · `silhouette_waist` 등 **신규 Primitive를 만들지 않는다.** |
| **NR-10** | **`shoulder_structure`를 Common Upper Physics에 넣지 않는다.** |
| **NR-11** | ~~**`waist_cinching`을 Outerwear 밖에 적용하지 않는다.**~~ **[★ ADR-123 SUPERSEDED]** Canonical rule: Vision canonical = `waist_definition`(Undefined/Defined/Cinched) · **SR Waist 소비 = Outerwear·Dress·Jumpsuit**(→ SR None/Mild/Strong mapping). ⛔ duplicate Vision `waist_cinching` observation 신설 금지(One Concept 유지). |
| **NR-12 ★** | **`body_fitting`을 활성 Architecture에 재도입하지 않는다.** 동일 물리 현상에 중복 Canonical Vocabulary를 두지 않는다. |
| **NR-13** | **Slim Fit만으로 SR7을 부여하지 않는다.** |
| **NR-14** | SR은 **Grammar(Tailored/Casual/Utility) 분류를 사용하지 않는다.** Category 기준만 사용한다. |
| **NR-15 ★** | **Observation과 Runtime State 사이에 중간 Judgment Layer를 만들지 않는다.** |

---

## 9. SR6 — Applicable Factor Principle

### 9.1 정본 (영)

> **SR6 — Strong governance is established when at least one applicable governance factor — shoulder structure, independent waist shaping, or a Slim Fit — materially controls the visible silhouette.**

### 9.2 정본 (한)

> **SR6 — 해당 Category에 적용되는 거버넌스 Factor 중 어깨 구조, 독립적 허리 조형 또는 Slim Fit 중 하나가 외부 실루엣을 실질적으로 지배하는 상태.**

### 9.3 "applicable"의 의미

**모든 Category가 세 Factor를 전부 가져야 한다는 뜻이 아니다.** 해당 Category에 **존재하는** Factor만 평가한다.

| Category | SR6 Governance 경로로 적용 가능한 Factor |
|---|---|
| **Top** (T-shirt · Shirt · Sweater · Sweatshirt) | `Fit` |
| **Dress Upper · Jumpsuit Upper** | **`Fit` · `shoulder_structure` · Waist(`waist_definition`→SR) [★ ADR-123]** |
| **Outerwear** (JACKET · COAT) | `shoulder_structure` · `waist_cinching` · `Fit` |
> *(구: Dress Upper·Jumpsuit Upper = `Fit` only · ADR-123으로 Shoulder+Waist 추가. SR6 scoring physics는 ADR-123·기존 Frozen 범위 내 불변 — 새 수치 0.)*

```text
strong shoulder_structure  OR  strong waist_cinching  OR  Fit = Slim
        →  SR6 Governance Evidence
```

> **`Fit = Slim`은 ADR-031 Structure Evidence Predicate가 이미 사용하는 표현이다** — `(Shoulder == Mild) OR (Waist == Mild) OR (Fit == Slim)`. **신규 Vocabulary 0.**
> ⚠ **실제 Runtime 조건 · 우선순위 · 결정 트리는 본 Contract에 포함되지 않는다.** 구현 Sprint에서 **별도 SR Change Proposal**과 함께 작성한다. **본 조항은 Rule이 아니라 원칙이다.**
> ⛔ **본 Contract에는 predicate · 함수 · Numeric · Threshold · Weight가 하나도 없다.**

---

## 10. SR7 — Shoulder Authority (불변)

```text
SR7 requires shoulder authority.
```

| # | 불변 |
|---|---|
| **S7-1** | **Slim Fit만으로 SR7에 도달하지 않는다.** *(불변)* |
| **S7-2** | **Waist Strong만으로도 SR7에 도달하지 않는다.** *(불변)* |
| **S7-3** | ~~Top · Dress · Jumpsuit는 Shoulder Carrier가 없으므로 **SA-3 Ceiling에 따라 SR6이 최고 Tier**다.~~ **[⚠ ADR-123 DECISION-DEPENDENT · CEO REVIEW REQUIRED]** — ADR-123으로 **Dress·Jumpsuit는 이제 Shoulder Carrier 보유** → 본 clause의 "Shoulder Carrier 부재" 근거가 소멸. **Top은 여전히 SA-3 Ceiling SR6**(carrier 부재 불변). ~~Dress·Jumpsuit SR6 ceiling 존치/해제 = CEO Decision 대기~~ **[★ ADR-125 RESOLVED 2026-08-10] Dress·Jumpsuit = category-neutral governance eligibility · Midpoint KEEP · 구 Product-SR6 clamp SUPERSEDED.** |
| **S7-4** | ~~Outerwear만 **SR7 path available**.~~ **[⚠ ADR-123 DECISION-DEPENDENT · CEO REVIEW REQUIRED]** — ~~Dress·Jumpsuit SR7 path 가부는 CEO Decision 대기~~ **[★ ADR-125 RESOLVED] Dress·Jumpsuit SR7/SR8 path = 개방**(category-neutral governance · 관측·구현 가능 시). **Outerwear SR7 path는 불변.** |
| **S7-5** | **SR8 · SR9 및 다른 Tier 정의는 본 Contract에서 재개방하지 않는다.** *(불변)* |

```text
Top                      →  maximum SR6                    (불변 · carrier 부재)
Dress / Jumpsuit         →  ★ ADR-125 RESOLVED — category-neutral governance eligibility (SR7 Strong+Strong+Slim · SR8 Extreme+Strong+Slim) · Midpoint KEEP · 구 Product-SR6 clamp SUPERSEDED · runtime 별도 sprint
Outerwear                →  SR7 path available             (불변)
```

**근거(historical):** Constitution §1 SR7 — "전체 거버넌스. **3축 + slim fit.**" · Upper Carrier V2 · SA-3 Tier Ceiling.
> **[★ ADR-123]** "3축 + slim fit"이 category-agnostic governance 조건인지, Outerwear 한정 carrier 근거인지 = SR7 Decision Audit 대상. Dress·Jumpsuit ceiling 자동 결정 금지.

---

## 11. WAIST_GOV_BRIDGE — ⚠ 별도 Review (본 Freeze에 **포함되지 않음**)

```text
FROZEN LEGACY / FROZEN ARCHITECTURE CLAUSE
SEPARATE REVIEW REQUIRED
NOT PART OF THIS APPROVAL
```

> ⛔ **`WAIST_GOV_BRIDGE`는 본 Sprint에서도 수정하거나 폐지하지 않았다.**

**현재 구조 (Constitution §4 · CEO Decision 2026-07-03 · 변경 0):**

```text
waist mild  +  belt present  +  body_fitting not none   →   waist strong
```

> ⚠ **본 조항에는 Legacy Vocabulary `body_fitting`이 남아 있다.** 이는 **Legacy Engine의 실제 동작 기록**이며, 수정하려면 **Frozen Clause 변경(CEO 승인)**이 필요하다. **본 Rollback 범위 밖이므로 손대지 않았다.**
> **처리:** `R-BRIDGE`를 별도 Review Item으로 유지 · **Outerwear Runtime 구현 전 필수 선행 Review** · 기존 동작·Frozen 상태 변경 0.

---

## 12. 상태 선언

```text
Architecture             = FROZEN
Runtime                  = IMPLEMENTATION PENDING
Vision Producer          = IMPLEMENTATION PENDING   (UG-1)
Regression Alignment     = NOT STARTED
Human Validation Re-run  = NOT STARTED
```

> **Constitution 문장을 고쳤다는 이유만으로 Runtime이 자동 정합됐다고 선언하지 않는다.**

---

## 13. Vocabulary Audit

| 항목 | 결과 |
|---|---|
| 새로운 Vocabulary | **0** — `Fit`은 ADR-025 기존 Frozen |
| 새로운 Primitive | **0** |
| 새로운 Enum | **0** — `Slim/Regular/Relaxed/Oversized` 그대로 |
| 새로운 Category | **0** |
| **`body_fitting` 활성 사용** | **0** ★ Rollback |
| 중간 Judgment Layer | **0** ★ Rollback |
| Numeric / Formula / Weight / Threshold | **0** |
| Runtime predicate / 함수 | **0** |
| Dress/Jumpsuit follower rule | **0** |
| Common Upper Physics 내 Shoulder | **0** |
| Outerwear 밖 Waist | **0** *(2026-07-21 Rollback 시점 · **ADR-123으로 Dress·Jumpsuit Waist 소비 허용** — 상단 배너 참조)* |
| Lower Architecture 재개방 | **0** |
| WAIST_GOV_BRIDGE 수정 | **0** |

---

## 14. Approval Anchor

```text
Approval Anchor

CEO Decision: 2026-07-21 (Claude Order — STMX SR Body_Fitting Rollback & Fit Canonical Restoration Sprint)
Reason:       body_fitting을 활성 SR Architecture에서 제거하고 Fit을 단일 Upper Canonical Vocabulary로
              복원한다(Rollback · 신규 설계 아님). body_fitting은 Fit이 이미 표현하고 있던 동일한 물리
              현상을 가리키는 중복 Vocabulary였다.
              Common Upper Physics = Fit + Fabric (2 Factor).
              Outerwear Extension  = Shoulder + Waist (Outerwear 전용).
              Traceability = Observation -> Fit -> Runtime State. 중간 Layer 0.
              SR6 = applicable governance factor 중 하나 — 어깨 구조 / 독립적 허리 조형 / Slim Fit.
                    "Fit = Slim"은 ADR-031 Structure Evidence Predicate가 이미 쓰는 표현이므로 신규 어휘 0.
              SR7 Shoulder Authority 불변 · Top/Dress/Jumpsuit Ceiling SR6 유지(SA-3).
              Dress/Jumpsuit Upper = Common Upper Physics 독립 소비자(follower 아님) — 변경 0.
              waist_cinching = Outerwear 전용(WS-1) — 변경 0.
              WAIST_GOV_BRIDGE = 본 승인 미포함 · 변경 0 · R-BRIDGE 별도 Review 유지
                    (해당 Frozen Clause에는 Legacy Vocabulary body_fitting이 남아 있음 — 보고만).
              신규 Vocabulary/Primitive/Enum/Category 0 · Numeric/Formula/Weight/Threshold 0 ·
              Runtime/Vision/Adapter/Regression/Human Validation 수정 0.
Affected Scope: STMX_SR_UPPER_PHYSICS_CONTRACT_V1.md (개정 · FROZEN)
              상위 정본 STMX_SR_CONSTITUTION_V3.md V3.13 (§0 · §1)
```

> **정직 고지:** 본 Contract는 **Architecture만 FROZEN**이다. **Runtime · Vision Producer · Regression · Human Validation은 전부 미착수**다. §9의 SR6 원칙은 **Rule이 아니며** 실행 조건·우선순위·결정 트리를 포함하지 않는다. §6.1의 `Regular ↔ Relaxed` 경계는 **의도적으로 `UNRESOLVED`로 남겼다.** **§11 WAIST_GOV_BRIDGE에는 Legacy `body_fitting` 표기가 남아 있으며, 이는 Frozen Clause라 본 Rollback에서 수정하지 않았다 — 보고 사항이다.**
>
> **[★ ADR-123 UPDATE 2026-08-09]** 위 §14 Approval Anchor(2026-07-21)의 *"Ceiling SR6 유지(SA-3)"* · *"waist_cinching = Outerwear 전용(WS-1)"*은 **historical 기록**이며 **ADR-123으로 갱신**: (1) Shoulder·Waist SR 소비 = **Outerwear·Dress·Jumpsuit** · (2) Waist canonical Vision field = `waist_definition`→SR(None/Mild/Strong) · (3) **Top** Ceiling SR6 불변 · **Dress·Jumpsuit SR6 ceiling = CEO Decision PENDING**(S7-3/S7-4 참조). 상단 ADR-123 배너 = 정본. 역사 기록은 그대로 보존.
