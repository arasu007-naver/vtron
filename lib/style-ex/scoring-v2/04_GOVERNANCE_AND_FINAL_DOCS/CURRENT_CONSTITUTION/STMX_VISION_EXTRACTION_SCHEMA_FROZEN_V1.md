# STMX Vision Extraction Schema — FROZEN V1

> **🛠 Controlled Amendment #40 (2026-09-25 · ADR-126 CA#40 · FROZEN V1 유지 · CEO approved · STMX TC MAINLINE V2.3.54 · (1) CA#39 FORWARD SUPERSESSION RECORD + (2) SA-1 CONSTRUCTION-REFERENT PRIMITIVE INSTANCES):** **새 physical observation 0 · 새 parameter 0 · 기존 37 parameter identity / 값역 / applicability / state contract 불변 · 기존 primitive 의미 불변 · GT schema 0 · scoring 0.** 근거 = V2.3.52 Option 1 (CEO RATIFIED) · V2.3.53 Outcome B (CEO ACCEPTED) · Observation Constitution V1 (Art. 2 · 4.1 · 5.3 · 6.2 · 6.4 · 7).
>   - **(40-S) CA#39 FORWARD SUPERSESSION.** 아래 CA#39의 R1 `read_organiser` (PN 38) branch = **NON-PRODUCTION EXPERIMENTAL HISTORY · SUPERSEDED FOR FORWARD ARCHITECTURE.** R1은 Observation Constitution 하에서 Derived relation / dominance judgment이며 lawful Vision raw observation이 아니다(V2.3.52). **Forward governed parameter count = 37** (production STMX_VISION_PRODUCER_V1_3). CA#39 원문과 CA-G10.7 count-clause 블록은 역사로 보존(삭제·재작성 0). Producer V1_4 R1 candidate = EXPERIMENTAL · NEVER PRODUCTION · SUPERSEDED.
>   - **(40-1) SA-1 정의.** 기존 governed Atomic primitive 3종 — `relative_size` (small / medium / large) · `contrast` (low / medium / high) · `spatial_position` (localized / distributed / whole_garment) — 을 **constitutive-construction referent**에 instantiate할 수 있다. 값역 · state(OBSERVED · NOT_VISIBLE · UNKNOWN; ABSENT 불법) · 의미는 DM layer 정의 그대로(재정의 0).
>   - **(40-2) Referent family (closed · 4).** 각 referent = 기존 37-parameter carrier: `collar` (collar / lapel) · `closure_type` (front closure / opening system) · `cuff_type` (cuffs) · `pocket` (pocket system). 새 referent vocabulary 0 · free text 0. Applicability = carrier OBSERVED-present(collar ≠ None · cuff_type ≠ None · pocket = Present · closure_type OBSERVED) — 아니면 instance omitted(key-omission = N/A). 제외(근거): shoulder / waist construction = 기존 degree parameter(shoulder_structure · waist_definition) 존재 · seam / panel = 37-parameter carrier 없음(referent 신설은 본 amendment 범위 밖) · sleeve = sleeve_volume 존재.
>   - **(40-3) Container.** target-level sibling `construction_referent_evidence` = {"instances": [ {referent, relative_size, contrast, spatial_position, locations?, source_observation_ref?} ]}. parameter 아님 · completeness 불산입 · 37-parameter gate와 별개 gate. optional `locations` ⊆ 기존 D-4 component(collar: Collar / Lapel · cuff_type: Cuff · pocket: Pocket).
>   - **(40-4) ⛔ FIREWALL.** prominence · dominance · organiser · principal · MATERIAL · INCIDENTAL · BASE / INTERVENTION · TC tier · score · referent 간 비교 방출 금지. Coverage = Derived(Observation Constitution Art. 3 · Final Audit D3) — instance field 아님.
>   - **(40-5) Producer.** `STMX_VISION_PRODUCER_V1_5_SA1_CANDIDATE` = **CANDIDATE / SHADOW** (V1_3 byte-branch + SA-1 additive). **Production = STMX_VISION_PRODUCER_V1_3 불변(pointer 변경 0).** G46 여섯 조건 충족 근거 = V2.3.53 (need · 기존 evidence 불충분 · single-view 관측 가능 · 비중복 · information gain) + 본 CEO 승인.

> **🛠 Controlled Amendment #39 (2026-09-24 · ADR-126 CA#39 · FROZEN V1 유지 · CEO approved · STMX TC MAINLINE V2.3.51 · R1 `read_organiser` — GOVERNED PARAMETER EXPANSION 37 → 38):** **새 parameter 1 (PN 38 `read_organiser`) · 기존 37 parameter identity / 값역 / applicability / state contract 불변 · schema shape 불변(observation 1개 추가 · optional observation-level `components[]` metadata는 R1에만) · GT schema 0 · scoring 0.** 선례 = **CA#16–#19**(governed additive expansion) · Producer PN 36 `sleeve_volume`(D-SV-1) · PN 37 `collar_scale`(CEO 2026-08-23).
>   - **★ 승인 근거:** CEO 2026-09-24 — V2.3.50 Outcome C 수용 + bounded upstream-observation architecture package 구현 승인. 설계 정본 = `04_GOVERNANCE_AND_FINAL_DOCS/STMX_TC_MAINLINE_V2_3_50_TWO_NAMED_UPSTREAM_OBSERVATION_ARCHITECTURE_STUDY/prototypes/design_spec.json` (sha256 `62a3dd3072a986b47f6fcb56b90fa68de03b0a8f1bf8965c7074db403e742ae5`).
>   - **(R1-1) 정의.** `read_organiser` = **이 garment의 whole-garment read를 조직하는 요소** — "Which element of THIS garment organises its whole-garment read — the construction apparatus, the body form (volume / proportion), the material-surface, or the decoration — or is the read balanced with no single organiser?" · RAW VISUAL OBSERVATION · reference-free · axis-free.
>   - **(R1-2) 값역 (closed · 5):** `CONSTRUCTION` | `BODY_FORM` | `MATERIAL_SURFACE` | `DECORATION` | `BALANCED`. **STATE:** `OBSERVED` · `NOT_VISIBLE` · `UNKNOWN` — ⛔ `ABSENT` 불법(조직 요소는 부재할 수 없다) · ⛔ 의미적 `None` 없음 · `BALANCED` = 관측된 값(단일 조직 요소 없음), 기본값 아님.
>   - **(R1-3) Applicability:** **UNIVERSAL**(10/10 category) — Category=UNKNOWN routing의 GROUP A에도 포함(카테고리와 무관한 관측). Region = `whole_garment`.
>   - **(R1-4) Optional metadata:** `components[]` ⊆ 기존 D-4 component vocabulary("[\"Body\",\"Bodice\",\"Skirt Body\",\"Leg\",\"Shoulder\",\"Sleeve\",\"Hood\",\"Collar\",\"Lapel\",\"Cuff\",\"Hem\",\"Waistband\",\"Pocket\",\"Strap\"] (same pattern as locations[]") — `read_organiser` OBSERVED 이고 값이 BALANCED가 아닐 때만 · parameter가 아니다 · 생략 합법.
>   - **(R1-5) Adjudicability (fail-closed):** Primary / Secondary target(P1 layering)이고 body · front · main construction이 whole-garment read를 판단할 만큼 보일 때만 OBSERVED 가능. fragment · Incidental · critical occlusion · detail-only crop → `NOT_VISIBLE`. 보이지만 조직 요소를 결정할 수 없음 → `UNKNOWN`. ⛔ 부분 증거로 추론하지 않는다.
>   - **(R1-6) ⛔ FIREWALL (영구):** visual observation ≠ TC semantic conclusion. Vision은 `identity_participation` · `MATERIAL` · `INCIDENTAL` · `whole_garment_reading` · `BASE_GRAMMAR_PRINCIPAL` · `INTERVENTION_PRINCIPAL` · TC tier · style / register / 시대 / "classic" 판단을 방출하지 않는다(G40 GP-1). reference(archetype) 비교는 downstream(D-7 · D-FWD-2) 소관.
>   - **(R1-7) 37 → 38 거버넌스:** 파라미터 수 불변 조항(Descriptor protocol **CA-G10.7** "파라미터 수 37 불변")은 **본 CA#39와 동일한 controlled act에서 명시적으로 개정**된다(→ 38). CA-G10.7의 "factor 38 전환 금지"는 **그대로 유효** — PN 38은 **Vision observation parameter**이며 Descriptor factor가 아니다. 기존 37-parameter authority(Producer V1_3 production · CA#1–#38 · 역사 artefact)는 **역사로 보존**되며 in-place 재작성하지 않는다.
>   - **(R1-8) Producer:** `STMX_VISION_PRODUCER_V1_4_R1_CANDIDATE` = **CANDIDATE / SHADOW** successor. **Production = `STMX_VISION_PRODUCER_V1_3` 불변**(pointer 변경 0). 기존 37 출력 불변 regression 필수.

> **🛠 Controlled Amendment #38 (2026-08-25 · ADR-126 CA#38 · FROZEN V1 유지 · CEO approved · `shoulder_drop` Anatomical-Reference Canonical Definition):** **observation semantics definition only — 값역 변경 0(`None | Dropped`) · 새 parameter 0 · parameter identity 불변(PN 11 · `ALL_PARAMS` 37) · applicability 불변 · state contract 불변 · schema shape 불변 · GT schema 0 · scoring 0.** 선례 = **CA#32**(`shoulder_structure` visual morphology recalibration).
>   - **★ 문제:** `shoulder_drop`에는 **canonical prose definition이 존재한 적이 없다.** §B 표는 `None/Dropped · Dropped≠Extended`만 기재했고, 실질 doctrine은 Producer prompt 한 줄(*"the POSITION of the shoulder seam relative to the wearer's natural shoulder point … Dropped = the seam is set clearly outboard/below the natural shoulder onto the upper arm"*)에만 존재했다. 그 문구는 **seam의 존재와 위치만** 판단 대상으로 삼아 **seam이 바깥에 보이면 곧 Dropped**가 되는 경로를 만들었고, 착용자의 **anatomical shoulder end**라는 기준점을 명시하지 않았다.
>   - **(SD-1) CANONICAL DEFINITION.** `Dropped` = garment의 **shoulder construction이 착용자의 정상적인 anatomical shoulder end에서 끝나지 않고, 그 지점을 넘어 upper arm 방향으로 연장되어 sleeve와 연결되는 구조.** 판정 질문은 단 하나다 — **"garment shoulder construction이 anatomical shoulder end 대비 어디서 끝나는가."**
>   - **★★ (SD-2) BOUNDARY CORRECTION — CEO 2026-08-25 · SD-OPEN-1 RESOLVED. 최종 판별자는 junction의 위치가 아니라 NORMAL SHOULDER ENDPOINT의 보존 여부다.** *(아래 원문 ①~⑤는 본 correction으로 **SUPERSEDED** — historical provenance로 보존: ~~① sleeve가 정상 anatomical shoulder end에서 시작하지 않는다 · ② garment shoulder line이 anatomical shoulder end를 넘어 upper arm 쪽으로 계속된다 · ③ shoulder-to-sleeve junction이 anatomical shoulder end보다 outboard 및/또는 아래, upper-arm 쪽에서 발생한다 · ④ conventional shoulder endpoint가 아예 없을 수 있다 · ⑤ visible seam이 있어도 된다 — 그 seam/junction이 anatomical shoulder end를 넘어 upper arm 쪽에 있으면 여전히 Dropped다.~~ ③/⑤가 **endpoint가 보존되어 있어도 junction이 바깥이면 `Dropped`**로 읽히게 만들었고, live validation에서 정확히 그 경로로 오판이 발생했다.)*
>   - **(SD-2-A) `Dropped` 성립 조건 (정정).** ① **정상 shoulder endpoint가 garment construction의 뚜렷한 끝점으로 보존되지 않는다**(시각적으로 소실) · ② shoulder construction이 그 지점을 지나 **upper arm 방향으로 계속 이어진 뒤** sleeve로 전환된다 · ③ conventional shoulder endpoint가 형성되지 않는다 · ④ **seam은 있을 수도 없을 수도 있다 — seam 유무는 primary criterion이 아니다.**
>   - **(SD-3) `None` (정정 · PRIMARY EVIDENCE).** 정상 anatomical shoulder endpoint가 garment construction 안에서 **명확한 끝점으로 보존**되어 *"여기까지가 shoulder"*라는 structural boundary를 시각적으로 읽을 수 있으면 `None`이다. **이때 다음은 모두 허용된다 — garment shoulder frame이 넓을 수 있고, sleeve seam/junction이 anatomical shoulder point보다 다소 outboard에 있을 수 있으며, garment가 Oversized일 수 있고, shoulder span이 Extended/Wide일 수 있다.** 명확히 보존된 normal shoulder endpoint가 존재하면 그 자체가 `None`의 핵심 근거다.
>   - **★ (SD-2-B) WIDTH-DISPLACEMENT FIREWALL — SD-OPEN-1의 CEO 최종 해소.** **CASE A**(extended frame · endpoint 보존): garment shoulder frame이 바깥으로 확장되어 sleeve가 그만큼 바깥에서 시작하지만 **명확한 shoulder endpoint가 남아 있다 → `None`.** **CASE B**(dropped construction): **뚜렷한 normal shoulder endpoint가 없고** shoulder line/construction이 anatomical shoulder end를 지나 연속적으로 흘러 **upper arm에서 sleeve로 전환된다 → `Dropped`.** ⛔ **`Extended/Wide Shoulder Frame ≠ Dropped` · `Oversized ≠ Dropped` · `Outboard sleeve junction alone ≠ Dropped`.**
>   - **(SD-2-C) DECISION ORDER (고정).** STEP 1 anatomical shoulder end 위치 추정(⛔ garment seam을 anatomical reference로 쓰지 않는다) → **STEP 2 endpoint 보존 여부 확인 — 이 검사가 junction 변위 검사보다 먼저다.** 보존이면 `None`(명백한 반대 morphology가 없는 한) → STEP 3 보존되지 않았다면 upper arm 방향 연장 여부 확인 → `Dropped` → STEP 4 sleeve junction 위치는 **supporting evidence일 뿐 primary discriminator가 아니다**. ⛔ *"junction이 outboard이므로 Dropped"* 는 endpoint 보존 검사 없이는 금지.
>   - **(SD-4) NEGATIVE RULES — 아래 어느 것도 단독으로 `shoulder_drop`을 결정하지 못한다:** Oversized fit · wide shoulder span · garment volume · padding · padding 부재 · structured vs relaxed 전반 인상 · sleeve volume · fabric stiffness/softness · fit tier. **명시 보존: `Oversized ≠ Dropped` · `Wide Shoulder Span ≠ Dropped` · `No Shoulder Pad ≠ Dropped` · `Dropped ≠ Oversized`.** 따라서 `Oversized + None`과 `Regular/Relaxed + Dropped`는 **실제 shoulder construction이 그렇다면 모두 적법한 조합**이다.
>   - **(SD-5) `shoulder_span`과 분리.** `shoulder_span` = shoulder frame의 외견상 **폭/확장**. `shoulder_drop` = shoulder construction이 **어디서 끝나고 sleeve가 어디서 시작하는가**(anatomical shoulder end 기준). **widened shoulder frame 단독으로는 `Dropped`가 성립하지 않는다.** 기존 §B 표기 `Dropped≠Extended`는 본 조항으로 구체화된다.
>   - **(SD-6) `shoulder_structure`와 분리.** `shoulder_structure`(CA#32)는 보이는 shoulder **contour의 형태**를 기술한다. `shoulder_drop`은 **anatomical shoulder end ↔ garment shoulder termination / sleeve junction**이라는 다른 형태 관계를 기술한다. ⛔ 어느 한쪽에서 다른 쪽을 자동 추론하지 않는다. D-2의 기존 **semantic independence**(`shoulder_structure = None` + `shoulder_drop = Dropped` = 정상 조합)는 그대로 유지된다.
>   - **★ SUPERSEDED:** Producer prompt의 *"seam position only"* 계열 표기 및 **seam이 outboard로 보이면 자동 `Dropped`**로 읽힐 수 있는 모든 derived wording은 본 Amendment로 **SUPERSEDED**(historical provenance로 보존). 새 doctrine은 판단을 **착용자의 anatomical shoulder end에 명시적으로 anchor**한다.
>   - **구현 = prompt 1개 파일**(`shoulder_drop` 관측 지시 + Fit 블록의 seam 관련 문구 정합화). rules/validator/controller/Colour V1 **0 변경** · 값역/applicability/state/schema **0 변경**.
>   - **⚠ VALIDATION STATUS = PARTIAL — 본 Amendment는 아직 VALIDATED로 선언하지 않는다.** live 검증(2026-08-25 · claude-opus-4-8 · 6 images · 6 calls · prompt `03710acd506e08bb`): **control 5/5 HOLD** — CEO-confirmed `Dropped` 3건(Relaxed+Dropped · **Oversized+Dropped** · conventional endpoint 부재 boat shoulder = SD-2④ 사례) 및 CEO-confirmed `None` 2건(Slim+None · **Oversized/Voluminous frame+None** = SD-4 사례) 전부 유지. **doctrine 자체는 실제로 작동한다** — 6/6 evidence 문자열이 전부 *"anatomical shoulder end"* 기준으로 재작성되었고(변경 전에는 *"seam sits outboard on upper arm"*), STEP 1–5 언어를 사용했다.
>   - **★★ SD-OPEN-1 = RESOLVED (CEO 2026-08-25).** CEO 최종 판정: **"enlarged shoulder frame 때문에 junction이 바깥에 있어도, 명확한 normal shoulder endpoint가 보존되어 있으면 `Dropped`가 아니다."** 이에 따라 위 **SD-2 → SD-2-A/2-B/2-C**로 정정하고 `None`의 primary evidence를 endpoint 보존으로 재정의했다(본 항목 상단 참조). 구현 = prompt decision hierarchy STEP 1→2(endpoint)→3→4(junction=supporting only) + WIDTH/FIT FIREWALL. Guards **SD-F1…SD-F7** (§45.19h2, 비공허성 포함).
>   - **★ BOUNDARY-CORRECTION 재검증 (2026-08-25 · prompt `4202afeb41ae4ac9` · 6 images · 6 calls):** **control 5/5 HOLD** — CEO `Dropped` 3(B4-12 Relaxed · B4-13 **Oversized+Dropped** · B4-14 endpoint-loss) · CEO `None` 2(B4-11 Slim · B4-16 **wide/voluminous frame+None**). **doctrine 전환이 실제 추론을 바꿨다:** endpoint를 언급한 evidence가 **R1 0/6 → R2 4/6**으로 증가했고, `None` 판정은 *"forms a clear endpoint"*, `Dropped` 판정은 *"no distinct shoulder endpoint"*로 서술이 통일됐다.
>   - **★★★ CA#38 CANONICAL DEFINITION STATUS = CEO APPROVED / CLOSED (CEO 2026-08-25).** 위 SD-1 · SD-2-A/2-B/2-C · SD-3 · SD-4 · SD-5 · SD-6이 `shoulder_drop`의 **최종 canonical 정의**다. 추가 정의 개정 없음 · 추가 prompt tuning 없음.
>   - **★ SD-OPEN-2 = CLOSED · DECISION: NO CROSS-PARAMETER COUPLING.** `shoulder_structure`와 `shoulder_drop`은 **독립 관측으로 유지**된다. ⛔ 어느 방향으로도 dependency를 만들지 않는다(`structure → drop` 금지 · `drop → structure` 금지). 한 extraction이 모순된 evidence를 낸 사실은 **model perception inconsistency이지 parameter를 coupling할 근거가 아니다.** ⛔ 두 parameter의 자연어 evidence 문자열이 기계적으로 일치하도록 요구하지 않는다 — 그 요구 자체가 금지된 coupling이다. DISPOSITION: 해당 case는 known perception failure로 보존.
>   - **★ LAYER 분리 (governance 원칙).** **Layer A — Semantic Authority**(*"Shoulder Drop은 무엇을 뜻하는가"*) = **CLOSED**. **Layer B — Model Performance**(*"Vision이 모든 이미지에서 그 morphology를 올바로 지각하는가"*) = **KNOWN LIMITATION EXISTS**. ⛔ **Layer B의 실패가 Layer A를 자동으로 재개방하지 않는다.** 정의의 타당성과 모델의 적용 능력은 별개 governance layer다.
>   - *(historical · 종결 전 상태 기록)* **~~VALIDATION STATUS = 여전히 PARTIAL — CLOSED 선언하지 않는다.~~** 지정 correction case는 2라운드 모두 `Dropped`로 남았다. **원인은 rule 미적용이 아니다** — 해당 call은 STEP 2를 실행하고 *"no distinct endpoint at natural shoulder"*라고 명시적으로 판단했다. 즉 doctrine이 아니라 **그 이미지에 대한 perception 불일치**다. ⛔ 개별 정답에 맞춰 wording을 재조정하지 않았다(Phase 12 overfitting 금지).
>   - *(historical · 제기 → CEO 종결)* **SD-OPEN-2 — CROSS-PARAMETER ENDPOINT INCOHERENCE. → 위에서 CLOSED(NO COUPLING)로 종결됨.** 동일 correction case의 **같은 호출 안에서** 두 parameter가 모순된 판단을 내렸다 — `shoulder_drop` evidence = *"**no distinct endpoint** at natural shoulder"* 인데 `shoulder_structure = Mild` evidence = *"**readable shoulder-line endpoint**, softly held"*. 두 parameter 모두 *"shoulder endpoint가 읽히는가"*에 의존하는데 서로 다른 답을 냈다. 이를 해소하려면 두 관측을 **coupling**해야 하지만, 본 Amendment **SD-6**과 CA#32는 **완전 독립**을 요구한다(⛔ 상호 추론 금지). 따라서 **coherence 요구를 신설할지 여부는 CEO architecture 결정 사항**이며, 이 order 범위 밖이다.
>   - *(historical) 최초 라운드에서 제기됐던 정의상 모호성:* 지정 correction case는 `Dropped`로 유지되어 CEO `None`과 불일치했다. **원인은 doctrine 오해가 아니라 doctrine 내부의 경계 미정의다.** 해당 case의 CEO 판정 근거는 *"shoulder endpoint가 여전히 시각적으로 defined이며, **apparent** lowered junction은 expanded shoulder proportion 때문"*이었다. 그러나 본 Amendment **SD-2③/⑤**는 *"junction이 anatomical shoulder end를 넘어 upper arm 쪽에 있으면 seam/endpoint가 보여도 여전히 `Dropped`"*라고 규정한다. 즉 **"넓은 shoulder frame이 junction을 바깥으로 밀어낸 경우"**를 SD-2③의 *construction이 anatomical end를 넘어 연장됨*으로 볼지, 아니면 **width가 만든 apparent displacement로 보아 `None`**으로 볼지가 정해져 있지 않다. SD-4는 *wide shoulder span 단독으로 Dropped를 결정하지 못한다*고만 하며, **width에 의해 변위된 junction을 할인하라고는 말하지 않는다.** ⛔ 이 경계는 CEO 결정 사항이며, 개별 정답에 맞춰 wording을 조정하지 않았다(overfitting 금지). **경계 확정 후 재검증 필요.**
>
> **Deliverable 1/4** · Vision Extraction Schema · **NO CODE · NO ENGINE IMPLEMENTATION**
> **Status:** 🔒 **FROZEN V1 · CEO FREEZE APPROVED (2026-08-08 · ADR-120)** — Vision Extraction Schema 공식 정본(active Source of Truth). 이 문서가 Vision Extraction Schema의 **유일 active SoT**이며 구 `..._CANDIDATE_V1` 명칭을 승계(rename·삭제 0). 변경은 **Controlled Amendment**(Validation Evidence → Issue Report → CEO Review → Amendment)로만.
> **★★ Controlled Amendment #19 (2026-08-18 · **D-8 `Piping`** · **ADR-126 CA#17** · CEO APPROVED · FROZEN V1 유지 · **canonical parameter count 36 불변** · value-domain expansion only · regression 529/0):** `decorative_detail` 값역 **3 → 4**.
>   - **`decorative_detail` = `Embroidery · Sequin-Beading · Appliqué · Piping`.**
>   - **`Piping` 정의:** seam 또는 edge를 **따라 달리는 좁은 applied cord/folded strip trim**. 실제로 보이는 applied trim line일 때만 보고한다.
>   - ⛔ **Piping이 아닌 것:** 단순 topstitch/seam line(스티칭은 applied trim 아님) · contrast **band/panel**(material/colour 차이) · cuff/hem의 **rib trim**(`rib_cuff`/`rib_hem` 소관) · fur/feather/ribbon trim(`attachment` 값).
>   - **▣ 3-계약 분리 (절대 collapse 금지):**
>     | 사실 | 계약 | 표현 |
>     |---|---|---|
>     | **무엇인가** (feature) | Producer-36 garment | `decorative_detail.values[] = "Piping"` |
>     | **어디에 있는가** (location) | D-4 (CA#16) | `locations[] = [{descriptor:"Edge"}]` 또는 `[{component:"Collar",descriptor:"Edge"}]` |
>     | **무슨 색인가** (colour) | Colour V1 (불변) | `additional_colors[] = [{color_family, carrier_kind:"generic_descriptor", carrier_ref:"Piping"}]` |
>     예: 검정 재킷 + 흰색 파이핑 = garment `Piping @ Edge` + colour `white_family → generic_descriptor(Piping)`. **세 사실은 서로를 대체하지 않는다.**
>   - **불변:** parameter 신설 0 · 새 family 0 · `decorative_detail` applicability(**Universal, 10/10**) 불변 · MULTI 멤버십 5 불변 · D-4 `locations[]`/`Edge` descriptor 동작 불변 · **Colour V1 전면 불변**(`GENERIC_DESCRIPTORS`의 `Piping`은 원래부터 존재 — colour carrier이며 garment feature와 별개) · controller 추론 0 · TC/DM 점수 추론 0.
>   - **Validator:** 정확한 canonical token만 허용 — `piping`·`PIPING`·`Pipe`·`Cord`·`Trim`·`Edge Piping` 등 alias는 기존 domain 검증(`VALUE_NOT_IN_DOMAIN`)으로 **거부**된다(§40.8로 검증).
>
> **★★ Controlled Amendment #18 (2026-08-18 · **D-4 LOCATION CONTRACT** · **ADR-126 CA#16** · CEO approved · FROZEN V1 유지 · **canonical parameter count 36 불변** · 신규 parameter 0 · regression 507/0):** eligible MULTI `values[]` item에 **선택적 per-value garment component binding**(`locations[]`)을 추가한다. **`locations[]`는 기존 MULTI value item 내부의 METADATA다** — parameter 37이 아니고, 별도 observation family가 아니고, `region`의 일부가 아니며, scoring field가 아니다.
>   - **▣ 4-LAYER SEPARATION (절대 상호 대체 금지):**
>     | Layer | 의미 | 값 |
>     |---|---|---|
>     | **`region`** | observation **SCOPE** — 어느 기록 슬롯인가 | `whole_garment` · `upper` · `lower` (**불변**) |
>     | **`component`** | 어느 구조적 **부품**이 그 값을 운반하는가 | canonical 14 (아래) |
>     | **`descriptor`** | 부품 내부의 통제된 위치 **정제** | `Panel` · `Edge` (2개뿐) |
>     | **`evidence[]`** | 사람이 읽는 **근거** | 자유 텍스트 — canonical taxonomy로 승격 금지 |
>     ⛔ 어느 하나도 다른 하나를 대체할 수 없다. **component/descriptor를 `region` enum으로 승격하는 것은 계속 금지**(§B4).
>   - **▣ ELIGIBILITY:** `material` · `surface` · `decorative_detail` · `attachment` **4개만**. **`exposure_opening`은 제외** — 그 값 자체가 이미 self-locating(`Open Back`/`Front Cutout`/`Side Cutout`/`Shoulder Cutout`)이다. 부적격 family에 `locations[]`가 오면 `LOCATION_NOT_ELIGIBLE`.
>   - **▣ CANONICAL COMPONENT VOCABULARY = 정확히 14 (alias 0):** `Body` · `Bodice` · `Skirt Body` · `Leg` · `Shoulder` · `Sleeve` · `Collar` · `Lapel` · `Hood` · `Cuff` · `Hem` · `Waistband` · `Pocket` · `Strap`.
>     - **Category-semantic (4):** `Body` = T-Shirt/Shirt/Sweater/Sweatshirt/Jacket/Coat **전용** · `Bodice` = Dress/Jumpsuit **전용** · `Skirt Body` = Skirt/Dress **전용** · `Leg` = Trouser/Jumpsuit **전용**. **Dress/Jumpsuit는 `Body`가 아니라 `Bodice`를 쓴다**(동일 category 내 상호 교체 금지).
>     - **Universal-Conditional (10):** `Shoulder`·`Sleeve`·`Collar`·`Lapel`·`Hood`·`Cuff`·`Hem`·`Waistband`·`Pocket`·`Strap` — ①실재하고 ②시각적으로 판독되며 ③값의 위치를 실질적으로 식별할 때 사용. **드물지만 실제로 보이는 디자인을 category 관례만을 이유로 폐기하지 않는다**(Guard **G40**).
>     - ⛔ **`Skirt`는 component token이 아니다**(garment category로 유지). ⛔ `Thigh`/`Knee`/`Calf`/`Ankle` component 신설 금지(이들은 `length` **값**이다). ⛔ `Placket`·`Yoke`·`Neckline`·`Waist`·`Closure`·`Seam`·`Rib`·`Trim` 추가 금지.
>   - **▣ DESCRIPTOR VOCABULARY = 정확히 2:** **`Panel`** = 조립 조각 — **단독 사용 절대 금지, 반드시 parent `component` 필요**(`Body+Panel`·`Sleeve+Panel`·`Bodice+Panel`·`Leg+Panel`). **`Edge`** = 경계/외곽 — component와 **함께**(`Collar+Edge`·`Pocket+Edge`) 또는 **단독**(외곽선을 따르는 feature) 사용 가능. ⛔ `Front Panel`/`Side Panel`/`Collar Edge`/`Outer Edge`/`Perimeter` 같은 **합성 canonical token 신설 금지**.
>   - **▣ LOCATION ITEM SHAPES (셋 중 하나여야 함):** **A** `{component}` · **B** `{component, descriptor}` · **C** `{descriptor:"Edge"}`. ⛔ **INVALID:** `{descriptor:"Panel"}`(component 없음) · `{}`(빈 항목) · 통제되지 않은 free-text key.
>   - **▣ CARDINALITY:** **0개(생략) 허용 — garment 전반에 적용되거나 국소화가 정보를 더하지 않으면 생략한다.** ⛔ **`Whole Garment` component 금지**(`region`이 이미 scope를 담당 — 이중 표현 금지). **1개** 정상. **다수** 허용 — **하나의 canonical value item에 여러 `locations[]` 항목**을 둔다(`Knit → Body + Hood`). ⛔ 같은 canonical value를 component별로 **중복 value item으로 쪼개지 않는다** — **기존 `DUPLICATE_VALUE` 금지 규칙은 그대로 유효**. 한 value item 내 **동일 location 중복**은 `LOCATION_DUPLICATE`.
>   - **▣ FIELD BEHAVIOR:** `material`·`surface` = 국소화가 보이면 **강하게 기대**됨. `decorative_detail`·`attachment` = **선택적**, 시각적으로 판독되고 재구성/정체성에 실질적으로 유용할 때만. ⛔ **relative size · salience · visual dominance · contrast magnitude를 D-4로 인코딩하지 않는다**(DM의 frozen primitive 영역 · `TCDM-SEP-01`).
>   - **▣ CONTROLLER FIREWALL:** controller는 `locations[]`를 **구조적으로 보존만** 한다(trim only). ⛔ **위치 추론 절대 금지** — *"Glossy는 보통 Lapel이니 Lapel로 설정"*, *"bomber의 Quilted는 아마 Body"* 같은 semantic guessing 금지. 관측하지 않았으면 기록하지 않는다.
>   - **▣ SERIALIZATION (implemented shape — §B5.2 확장):**
>     ```json
>     "material": { "state":"OBSERVED", "value": null, "region":"whole_garment", "evidence":[…],
>       "values": [ { "value":"Knit", "evidence":["ribbed knit body and hood"],
>                     "locations": [ { "component":"Body" }, { "component":"Hood" } ] },
>                   { "value":"Synthetic", "evidence":["quilted sleeves"],
>                     "locations": [ { "component":"Sleeve", "descriptor":"Panel" } ] } ] }
>     ```
>     **`.value = null` 및 `values[]` 정본 원칙은 불변**(Amendment #16 Part A). `locations[]`는 **선택적**이며 생략이 기본이다.
>   - **▣ 보고된 vocabulary gap (변경 0):** `Piping`은 **Colour V1 `GENERIC_DESCRIPTORS`에는 존재하나 `decorative_detail` 값역(`Embroidery`·`Sequin-Beading`·`Appliqué`)에는 없다.** 본 Amendment는 이를 **추가하지 않았다** — CEO 승인 없는 Decorative Detail 값역 확장 금지. **별도 vocabulary gap으로 보고만 한다.**
>
> **★★ Controlled Amendment #17 (2026-08-18 · Batch 001 Approved Remediation Stage 1 · **ADR-126 CA#15** · CEO Decision D-1 + D-2 + D-3 · FROZEN V1 유지 · **canonical parameter count 36 불변** · 신규 parameter 0 · 신규 vocabulary 0 · regression 456/0):** **Outerwear applicability correction + deterministic region metadata normalization.** *(applicability correction ≠ parameter 삭제/추가 — CA#3 선례. 근거 = Guard **G40** "Vision은 visually observable evidence를 downstream 미소비를 이유로 버리지 않는다 · Observation applicability ⊇ consumption scope".)*
>   - **D-1 `front_opening_extent` → MANDATORY (M) for `Jacket` · `Coat`** (was N). Value domain **불변** `None | Partial | Full`. `closure_type`(M, 불변)와 **함께** 소비되어 image-blind consumer가 `Zipper + Partial`(half-zip)과 `Zipper + Full`을 구분할 수 있어야 한다.
>     - **Closure authority consistency (기존 authority로 해소 · 새 rule 0 · 새 value 0):** `front_opening_extent = None` = **front opening 부재**. 기존 prompt authority가 이미 일반 규칙으로 명시 — *"Do NOT emit closure_type on a garment with no front opening."* Mandatory parameter가 미보고되면 `diagnostics.unreported`에 기록되며 이는 **diagnostic이지 contract error가 아니다**(validator는 **emit된** parameter만 검증). 따라서 `None` + `closure_type` 미emit은 정합적이다. `closure_type = Open`("a front opening with no visible fastening")은 `Partial`/`Full`과만 짝을 이루며 `None`과 공존하지 않는다.
>   - **D-2 `shoulder_drop` → MANDATORY (M) for `Jacket` · `Coat`** (was N). Value domain **불변** `None | Dropped`.
>     - **Semantic independence:** `shoulder_structure`(built structural support)와 `shoulder_drop`(seam position)은 **독립 관측**이다. **`shoulder_structure = None` + `shoulder_drop = Dropped`는 정상·유효 조합이며 모순으로 처리하지 않는다.** 선례: **Dress·Jumpsuit는 이미 두 parameter를 모두 M으로 보유**한다.
>     - **⛔ Scope firewall:** `shoulder_connection` · `shoulder_span`의 applicability는 **변경하지 않는다**(Jacket/Coat에서 계속 **N**). 기존 conditional applicability 결정은 재개하지 않는다(Guard CA#3: shoulder는 자동 확대 금지 · category별 CEO calibration).
>   - **D-3 Single-legal-region deterministic normalization (controller · metadata only):** 어떤 parameter가 해당 category에서 **legal region이 정확히 1개**면, controller가 emit된 region을 그 유일 legal region으로 **정규화**한다(기존의 "omit 시 기본값 채움" 동작을 "잘못 emit된 값도 정규화"로 확장). **frozen region authority(`regionFor`)에서 generic하게 파생** — shoulder_structure 전용 hard-code 아님.
>     - **불변 보장:** value · `values[]` · evidence · descriptor · state · count · density · applicability · semantic interpretation **전부 미변경**(shallow copy로 `region` 키만 교체).
>     - **⛔ legal region이 2개 이상이면 controller는 절대 선택하지 않는다** — 추론·추측·semantic repair 금지. 해당 관측은 그대로 통과하며 validator의 정상 판정(`BAD_REGION`/`MISSING_REGION`) 대상으로 남는다. `byRegion`(Dress/Jumpsuit `fabric_behavior`/`fit`)은 다중 region이므로 미접촉.
>   - **Applicability accounting (invariant `U+M+C+N=36` 유지 · N은 파생값이며 hard-code 아님):** **Jacket U9 / M14 / C4 / N9 = 36** · **Coat U9 / M14 / C4 / N9 = 36** · 나머지 8 category 변경 0(총계 전부 36). **Producer 총 parameter = 36 유지**(37번째 없음 · 삭제 없음).
>   - **Files / seal:** `producer_rules_v1.js` `4e680a19a8210b36`→**`47c7b2c7604c72ad`** · `producer_controller_v1.js` `a642194efb90a66d`→**`e385fd88509ccd8a`** · `producer_prompt_v1.js` `0c53d1e73fe3bc39`→**`8d3da09178a007c5`** · **`producer_validator_v1.js` UNCHANGED `e2813ac794ec25e4`**(N이 파생되므로 completeness invariant 수정 불필요). Color V1 · Producer V1 entrypoint · onecall UNCHANGED. **engine `225252b1afa8d75b` UNCHANGED.**
>   - **Batch 001 재검증(read-only · raw immutable `e5748101792b7d1a`):** contract-valid **7/12 → 11/12 · regression 0**. 해소 = `shoulder_structure/BAD_REGION` ×3 + `shoulder_drop/NOT_APPLICABLE_EMITTED` ×2. REF_000003은 `shoulder_connection/NOT_APPLICABLE_EMITTED`만 남아 invalid — **scope firewall이 유지되었다는 증거**. `front_opening_extent`는 historical raw에 애초에 존재하지 않으므로 **소급 복원 불가**(향후 추출부터 적용).
>
> **★★ Controlled Amendment #16 (2026-08-18 · Batch 001 Approved Remediation Stage 0 · CEO Decision D-5 + D-9 · FROZEN V1 유지 · documentation synchronization only · code 0 · Producer/validator behavior 불변):** 이 Amendment는 **이미 CEO 승인·구현·검증된 상태를 Schema에 반영하는 동기화**다. 새 결정·새 vocabulary·새 parameter 0.
>   - **▣ PART A — MULTI CANONICAL CONSUMPTION CONTRACT (CEO D-5, 2026-08-18).** **MULTI observation의 canonical 표현 = `values[]`.** MULTI parameter에서 **scalar `.value = null`은 정상 canonical 상태**이며 결함이 아니다. 실제 관측값은 전부 `values[]`가 운반한다.
>     - **MULTI = 5 (정정: 구 표기 "MULTI (4)" → 5):** `material` · `surface` · `decorative_detail` · `attachment` · `exposure_opening`. *(`exposure_opening`은 Amendment #15에서 MULTI로 신설되었으나 §B5 본문 목록이 4로 남아 있었다 — 본 Amendment로 정정.)*
>     - **Implemented canonical shape (operative = `producer_rules_v1.js` / `producer_controller_v1.js` / `producer_validator_v1.js`):** `{ state, value: null, region, evidence[], values: [ { value, descriptor?, evidence[] } ] }`. **아래 §B5/§B5.1의 구 `"value": [배열]` + `evidence:[{value,cue,location}]` 표기는 본 Amendment로 SUPERSEDED**(historical provenance로 보존).
>     - **Consumption rule (canonical · downstream 필수 준수):** MULTI parameter는 **`values[]`를 읽는다.** `.value`를 읽지 않는다. `.value === null`은 "관측 없음"이 아니라 **"MULTI이므로 정상"**이다. 관측 부재는 `state`(`ABSENT`/`NOT_VISIBLE`/`UNKNOWN`)로만 판정한다.
>     - **Validator 준거 동일:** validator는 MULTI에 대해 `values[]`만 검증한다(domain·중복·`Other` descriptor·per-value evidence). **`.value`는 MULTI에서 검증 대상이 아니다.**
>     - ⛔ **`.value` redundant 채움 금지**(dual canonical representation 금지 · dominant/primary material 함의 금지 — §B5 "dominant material 추론·percentage·ranking·primary/secondary taxonomy 신설 금지"와 충돌). ⛔ MULTI vocabulary 변경 0 · Producer 동작 변경 0 · validator 동작 변경 0.
>     - **Historical reconciliation (REF_000002):** CEO의 역사적 판정(**해당 Jacket의 surface = `Quilted`**)은 **그대로 유효하며 재작성하지 않는다.** 단 **기술적 진단은 정정된다** — raw는 `surface.values[] = [{"Quilted", evidence:"diamond-stitched quilting across whole body and sleeves"}]`로 **지각·emit되어 있었다.** 따라서 REF_000002는 **"Quilted를 관측하지 못한 Vision perception failure"로 기술 분류될 수 없다.** 실제 원인 = **표현/직렬화 + consumption-contract 모호성**(본 Part A로 해소). *(historical adjudication ≠ refined technical diagnosis — 두 계층을 분리 보존한다.)*
>   - **▣ PART B — RECOVERED SYNCHRONIZATION: Producer-35 → Producer-36 (CEO D-9 scope).** 본 root 문서는 **선언된 유일 active SoT**임에도 2026-08-16 승인·구현된 두 건이 반영되지 않은 채 35에 머물러 있었다(handoff package 사본 및 `STMX_GARMENT_LEVEL_VISION_FINAL_FREEZE_MANIFEST_V1.md`에는 반영되어 있었음 = duplicate-SoT divergence). 아래는 **새 결정이 아니라 누락된 동기화 복구**다.
>     - **`sleeve_volume` = PN 36** (D-SV-1 · CEO 2026-08-16) — domain `Regular / Full / Exaggerated`(magnitude only · sleeve-style name 금지) · **Conditional**, parent `sleeve`, gate `sleeve OBSERVED ∧ ≠ Sleeveless` · 8 sleeve-bearing categories(T-Shirt/Shirt/Sweater/Sweatshirt/Jacket/Coat/Dress/Jumpsuit) · **N** for Trouser/Skirt · region **UPPER**. `sleeve`는 LENGTH ONLY로 불변.
>     - **Silhouette Final Migration (SIL-FREEZE-A · CEO 2026-08-16):** `silhouette` = 공통 **Lower Geometry** carrier — Dress `Straight/Widening/Flared/Narrowing` · Skirt `Straight/Widening/Narrowing` · Trouser `Straight/Flared/Tapered` · Jumpsuit `Straight/Flared/Tapered`. legacy `Skinny/Slim/Wide/Oversized/Voluminous`는 silhouette에서 제거(`Skinny→Slim` collapse) · **Fit domain 불변**. 파생 출력 **`whole_garment_silhouette`** = deterministic controller 산출 · `record.derived` · **raw parameter 아님**(Dress→Column/A-Line/Fit-and-Flare/Tapered · Jumpsuit→Straight/Flared/Tapered · +Indeterminate).
>     - **★ Canonical parameter count = 36** · **U+M+C+N = 36 · all 10 categories.** 아래 Amendment #15의 35-param 표 및 "★35" 표기는 본 Amendment로 **SUPERSEDED**(보존). **Operative ground truth = `producer_rules_v1.js` PN 1..36.**
>
> **★★ Controlled Amendment #15 (2026-08-15 · Pre-Proportion Garment Vision Consolidation · 40 → 35 · CEO Decision 2026-08-15 · FROZEN V1 유지 · already-implemented + regression 355/0 + live-Vision 7/7):** 이미 CEO 승인·구현·검증된 **Producer-35** 계약을 Schema에 controlled amendment로 반영. **아래 PHASE A(40-inventory) 및 GROUP A(10)·C3 field-def·§D applicability matrix의 40-based content는 이 Amendment로 SUPERSEDED**(historical provenance로 보존). **Active canonical inventory = 아래 35-param 표.**
>   - **Closure 3→1:** `#20 front_opening_type`(Button/Snap Button/Zipper/Open) + `#21 closure_type`(…/Hook Closure) + `#22 closure_arrangement`(Single/Double Breasted) → **단일 `closure_type`** = `Button/Single Breasted Button/Double Breasted Button/Snap Button/Zipper/Hook Closure/Open`. `front_opening_extent` 독립 유지. Applicability = **M**(Jacket/Coat) + **C**(TOP/Dress/Jumpsuit · gate front_opening_extent≠None) · N(Trouser/Skirt).
>   - **`#33 front_overlap` REMOVED.**
>   - **`#34 cutout` + `#35 open_back` → 단일 MULTI `exposure_opening`** = `Open Back/Front Cutout/Side Cutout/Shoulder Cutout`. **location/magnitude 없음.** Dress/Jumpsuit Mandatory.
>   - **`#31 transparency` RETIRED** → optical Surface value.
>   - **`#28 surface` 8 → 11 (MULTI):** +`Glossy`·+`Semi Transparent`·+`Transparent`. Semi Sheer/Sheer 복원 금지.
>   - **GROUP A(Category-Independent) 10 → 9** (transparency 제거; surface가 이미 Universal). **MULTI = material/surface/decorative_detail/attachment/`exposure_opening`(5).**
>   - **Count 40 → 35** · U+M+C+N=35 all 10 categories. **Producer-35 = current pre-Proportion authority; Final Vision Architecture Freeze는 Proportion 후 보류.**
>
> **▼ ACTIVE Canonical Parameter Inventory (35 · Producer-35 · code `producer_rules_v1.js` PN 1..35 = ground truth)**
>
> | # | Canonical Parameter | Domain (Frozen) | Mult. | Applicability class (T/Sh/Sw/SwS/J/Co/Tr/Sk/D/Ju) |
> |---|---|---|---|---|
> | 1 | category | 10 categories | single | M M M M M M M M M M |
> | 2 | trouser_distinction | Tailored/Casual/Sport/Jeans/Leggings | single | N N N N N N M N N N |
> | 3 | silhouette | by-category | single | N N N N N N M M M M |
> | 4 | fit | Slim/Regular/Relaxed/Oversized (+Voluminous Skirt/Dress-Lower) | single | M M M M M M M M M M |
> | 5 | length | by-category | single | M M M M M M M M M M |
> | 6 | fabric_behavior | Structured/Semi-Structured/Semi-Fluid/Fluid | single | M M M M M M M M M M |
> | 7 | waist_definition | Undefined/Defined/Cinched | single | N N N N C C N N C C |
> | 8 | sleeve | Sleeveless/Short/Mid/Long | single | M M M M M M N N M M |
> | 9 | shoulder_connection | Standard/Strap/Strapless/Halter/One Shoulder | single | C C C N N N N N C C |
> | 10 | shoulder_span | Narrow/Regular/Extended | single | C C C N N N N N C C |
> | 11 | shoulder_drop | None/Dropped | single | M M M M N N N N M M |
> | 12 | shoulder_structure | None/Mild/Strong/Extreme | single | N N N N M M N N M M |
> | 13 | neckline_shape | Round/V/Square/Straight/Scoop/Mock/Turtleneck/Funnel | single | M M M M N N N N M M |
> | 14 | neckline_position | High/Regular/Low | single | M M M M N N N N M M |
> | 15 | collar | None/Shirt/Stand/Sailor/Peter Pan/Tie/Ruffle/Shawl/Notched/Peak | single | M M M M M M N N M M |
> | 16 | rib_cuff | None/Present | single | M M M M M M N N M M |
> | 17 | rib_hem | None/Present | single | M M M M M M N N M M |
> | 18 | hood | Present | single | N N N M M M N N N N |
> | 19 | front_opening_extent | None/Partial/Full | single | M M M M N N N N M M |
> | 20 | **closure_type** ★ | Button/Single Breasted Button/Double Breasted Button/Snap Button/Zipper/Hook Closure/Open | single | C C C C M M N N C C |
> | 21 | pocket | None/Present | single | U U U U U U U U U U |
> | 22 | pocket_construction | Inset/Applied | single | C C C C C C C C C C |
> | 23 | pocket_projection | Flat/Projected/Volumetric | single | C C C C C C C C C C |
> | 24 | french_cuff | None/Present | single | N C N N N N N N N N |
> | 25 | material | Cotton/Wool/Leather/Suede/Knit/Denim/Synthetic/Silk/Velvet/Fur/Padding/Other | **multi** | U U U U U U U U U U |
> | 26 | **surface** ★ | Pleated/Gathered/Quilted/Textured Knit/Lace/Mesh/Treated Surface/Reflective/Glossy/Semi Transparent/Transparent (11) | **multi** | U U U U U U U U U U |
> | 27 | pattern | Linear/Grid/Repeat | single | U U U U U U U U U U |
> | 28 | graphic | Localized/Dominant | single | U U U U U U U U U U |
> | 29 | asymmetry | None/Present | single | U U U U U U U U U U |
> | 30 | slit | None/Present | single | N N N N N N N M M N |
> | 31 | ruffle | None/Present | single | U U U U U U U U U U |
> | 32 | decorative_detail | Embroidery/Sequin-Beading/Appliqué | **multi** | U U U U U U U U U U |
> | 33 | attachment | Metal Hardware/Jewelry Attachment/Ribbon/Belt/Epaulette/Storm Flap/Fur Trim/Fringe/Feather/Other | **multi** | U U U U U U U U U U |
> | 34 | **exposure_opening** ★new | Open Back/Front Cutout/Side Cutout/Shoulder Cutout | **multi** | N N N N N N N N M M |
> | 35 | grammar | Tailored/Casual/Utility | single | N N N N M M N N N N |
>
> **Inventory Lock = 35/35.** Per-category U+M+C+N=35: T-Shirt 9/12/5/9 · Shirt 9/12/6/8 · Sweater 9/12/5/9 · Sweatshirt 9/13/3/10 · Jacket 9/12/3/11 · Coat 9/12/3/11 · Trouser 9/6/2/18 · Skirt 9/6/2/18 · Dress 9/16/6/4 · Jumpsuit 9/15/6/5. Retired (Frozen-40 provenance only): `front_opening_type`·`closure_arrangement`·`front_overlap`·`cutout`·`open_back`·`transparency`. 정본 = `STMX_GARMENT_VOCABULARY_PRODUCER35_AUTHORITY_SYNC_REPORT_V1.md` · `STMX_VISION_PRE_PROPORTION_GARMENT_CONSOLIDATION_IMPLEMENTATION_REPORT_V1.md` · code `producer_rules_v1.js`(`7cc2c5a0e27c7dc6`). Engine SHA `225252b1afa8d75b` 불변 · SR/TC/DM/EI/Color V1/production-code 0.
>
> **🛠 Controlled Amendment #1 (2026-08-08 · ADR-121 · FROZEN V1 유지):** §B3.1 Category UNKNOWN Routing 내부 모순 교정 — `silhouette·fit·length`를 ALL-applicable에서 제외(category-dependent domain/placement)하고 **GROUP A(9) 정상 extraction / GROUP B(silhouette·fit·length)+category-specific = key omit**로 확정. **40 canonical parameter·value domain·state·multiplicity·Region·applicability matrix 불변**(routing 정합화만). *(★ADR-126 CA#2로 GROUP A(9) → **GROUP A(10)**: `asymmetry` 추가 — 아래 §B3.1 참조. 이 CA#1 항목은 당시(ADR-121) 상태 기록.)*
> **Deliverable 1/4** · Vision Extraction Schema · **NO CODE · NO ENGINE IMPLEMENTATION**
> **Status:** 🔒 **FROZEN V1 · CEO FREEZE APPROVED (2026-08-08 · ADR-120)** — Vision Extraction Schema 공식 정본(active Source of Truth). 이 문서가 Vision Extraction Schema의 **유일 active SoT**이며 구 `..._CANDIDATE_V1` 명칭을 승계(rename·삭제 0). 변경은 **Controlled Amendment**(Validation Evidence → Issue Report → CEO Review → Amendment)로만.
> **★★ Controlled Amendment #19 (2026-08-18 · **D-8 `Piping`** · **ADR-126 CA#17** · CEO APPROVED · FROZEN V1 유지 · **canonical parameter count 36 불변** · value-domain expansion only · regression 529/0):** `decorative_detail` 값역 **3 → 4**.
>   - **`decorative_detail` = `Embroidery · Sequin-Beading · Appliqué · Piping`.**
>   - **`Piping` 정의:** seam 또는 edge를 **따라 달리는 좁은 applied cord/folded strip trim**. 실제로 보이는 applied trim line일 때만 보고한다.
>   - ⛔ **Piping이 아닌 것:** 단순 topstitch/seam line(스티칭은 applied trim 아님) · contrast **band/panel**(material/colour 차이) · cuff/hem의 **rib trim**(`rib_cuff`/`rib_hem` 소관) · fur/feather/ribbon trim(`attachment` 값).
>   - **▣ 3-계약 분리 (절대 collapse 금지):**
>     | 사실 | 계약 | 표현 |
>     |---|---|---|
>     | **무엇인가** (feature) | Producer-36 garment | `decorative_detail.values[] = "Piping"` |
>     | **어디에 있는가** (location) | D-4 (CA#16) | `locations[] = [{descriptor:"Edge"}]` 또는 `[{component:"Collar",descriptor:"Edge"}]` |
>     | **무슨 색인가** (colour) | Colour V1 (불변) | `additional_colors[] = [{color_family, carrier_kind:"generic_descriptor", carrier_ref:"Piping"}]` |
>     예: 검정 재킷 + 흰색 파이핑 = garment `Piping @ Edge` + colour `white_family → generic_descriptor(Piping)`. **세 사실은 서로를 대체하지 않는다.**
>   - **불변:** parameter 신설 0 · 새 family 0 · `decorative_detail` applicability(**Universal, 10/10**) 불변 · MULTI 멤버십 5 불변 · D-4 `locations[]`/`Edge` descriptor 동작 불변 · **Colour V1 전면 불변**(`GENERIC_DESCRIPTORS`의 `Piping`은 원래부터 존재 — colour carrier이며 garment feature와 별개) · controller 추론 0 · TC/DM 점수 추론 0.
>   - **Validator:** 정확한 canonical token만 허용 — `piping`·`PIPING`·`Pipe`·`Cord`·`Trim`·`Edge Piping` 등 alias는 기존 domain 검증(`VALUE_NOT_IN_DOMAIN`)으로 **거부**된다(§40.8로 검증).
>
> **★★ Controlled Amendment #18 (2026-08-18 · **D-4 LOCATION CONTRACT** · **ADR-126 CA#16** · CEO approved · FROZEN V1 유지 · **canonical parameter count 36 불변** · 신규 parameter 0 · regression 507/0):** eligible MULTI `values[]` item에 **선택적 per-value garment component binding**(`locations[]`)을 추가한다. **`locations[]`는 기존 MULTI value item 내부의 METADATA다** — parameter 37이 아니고, 별도 observation family가 아니고, `region`의 일부가 아니며, scoring field가 아니다.
>   - **▣ 4-LAYER SEPARATION (절대 상호 대체 금지):**
>     | Layer | 의미 | 값 |
>     |---|---|---|
>     | **`region`** | observation **SCOPE** — 어느 기록 슬롯인가 | `whole_garment` · `upper` · `lower` (**불변**) |
>     | **`component`** | 어느 구조적 **부품**이 그 값을 운반하는가 | canonical 14 (아래) |
>     | **`descriptor`** | 부품 내부의 통제된 위치 **정제** | `Panel` · `Edge` (2개뿐) |
>     | **`evidence[]`** | 사람이 읽는 **근거** | 자유 텍스트 — canonical taxonomy로 승격 금지 |
>     ⛔ 어느 하나도 다른 하나를 대체할 수 없다. **component/descriptor를 `region` enum으로 승격하는 것은 계속 금지**(§B4).
>   - **▣ ELIGIBILITY:** `material` · `surface` · `decorative_detail` · `attachment` **4개만**. **`exposure_opening`은 제외** — 그 값 자체가 이미 self-locating(`Open Back`/`Front Cutout`/`Side Cutout`/`Shoulder Cutout`)이다. 부적격 family에 `locations[]`가 오면 `LOCATION_NOT_ELIGIBLE`.
>   - **▣ CANONICAL COMPONENT VOCABULARY = 정확히 14 (alias 0):** `Body` · `Bodice` · `Skirt Body` · `Leg` · `Shoulder` · `Sleeve` · `Collar` · `Lapel` · `Hood` · `Cuff` · `Hem` · `Waistband` · `Pocket` · `Strap`.
>     - **Category-semantic (4):** `Body` = T-Shirt/Shirt/Sweater/Sweatshirt/Jacket/Coat **전용** · `Bodice` = Dress/Jumpsuit **전용** · `Skirt Body` = Skirt/Dress **전용** · `Leg` = Trouser/Jumpsuit **전용**. **Dress/Jumpsuit는 `Body`가 아니라 `Bodice`를 쓴다**(동일 category 내 상호 교체 금지).
>     - **Universal-Conditional (10):** `Shoulder`·`Sleeve`·`Collar`·`Lapel`·`Hood`·`Cuff`·`Hem`·`Waistband`·`Pocket`·`Strap` — ①실재하고 ②시각적으로 판독되며 ③값의 위치를 실질적으로 식별할 때 사용. **드물지만 실제로 보이는 디자인을 category 관례만을 이유로 폐기하지 않는다**(Guard **G40**).
>     - ⛔ **`Skirt`는 component token이 아니다**(garment category로 유지). ⛔ `Thigh`/`Knee`/`Calf`/`Ankle` component 신설 금지(이들은 `length` **값**이다). ⛔ `Placket`·`Yoke`·`Neckline`·`Waist`·`Closure`·`Seam`·`Rib`·`Trim` 추가 금지.
>   - **▣ DESCRIPTOR VOCABULARY = 정확히 2:** **`Panel`** = 조립 조각 — **단독 사용 절대 금지, 반드시 parent `component` 필요**(`Body+Panel`·`Sleeve+Panel`·`Bodice+Panel`·`Leg+Panel`). **`Edge`** = 경계/외곽 — component와 **함께**(`Collar+Edge`·`Pocket+Edge`) 또는 **단독**(외곽선을 따르는 feature) 사용 가능. ⛔ `Front Panel`/`Side Panel`/`Collar Edge`/`Outer Edge`/`Perimeter` 같은 **합성 canonical token 신설 금지**.
>   - **▣ LOCATION ITEM SHAPES (셋 중 하나여야 함):** **A** `{component}` · **B** `{component, descriptor}` · **C** `{descriptor:"Edge"}`. ⛔ **INVALID:** `{descriptor:"Panel"}`(component 없음) · `{}`(빈 항목) · 통제되지 않은 free-text key.
>   - **▣ CARDINALITY:** **0개(생략) 허용 — garment 전반에 적용되거나 국소화가 정보를 더하지 않으면 생략한다.** ⛔ **`Whole Garment` component 금지**(`region`이 이미 scope를 담당 — 이중 표현 금지). **1개** 정상. **다수** 허용 — **하나의 canonical value item에 여러 `locations[]` 항목**을 둔다(`Knit → Body + Hood`). ⛔ 같은 canonical value를 component별로 **중복 value item으로 쪼개지 않는다** — **기존 `DUPLICATE_VALUE` 금지 규칙은 그대로 유효**. 한 value item 내 **동일 location 중복**은 `LOCATION_DUPLICATE`.
>   - **▣ FIELD BEHAVIOR:** `material`·`surface` = 국소화가 보이면 **강하게 기대**됨. `decorative_detail`·`attachment` = **선택적**, 시각적으로 판독되고 재구성/정체성에 실질적으로 유용할 때만. ⛔ **relative size · salience · visual dominance · contrast magnitude를 D-4로 인코딩하지 않는다**(DM의 frozen primitive 영역 · `TCDM-SEP-01`).
>   - **▣ CONTROLLER FIREWALL:** controller는 `locations[]`를 **구조적으로 보존만** 한다(trim only). ⛔ **위치 추론 절대 금지** — *"Glossy는 보통 Lapel이니 Lapel로 설정"*, *"bomber의 Quilted는 아마 Body"* 같은 semantic guessing 금지. 관측하지 않았으면 기록하지 않는다.
>   - **▣ SERIALIZATION (implemented shape — §B5.2 확장):**
>     ```json
>     "material": { "state":"OBSERVED", "value": null, "region":"whole_garment", "evidence":[…],
>       "values": [ { "value":"Knit", "evidence":["ribbed knit body and hood"],
>                     "locations": [ { "component":"Body" }, { "component":"Hood" } ] },
>                   { "value":"Synthetic", "evidence":["quilted sleeves"],
>                     "locations": [ { "component":"Sleeve", "descriptor":"Panel" } ] } ] }
>     ```
>     **`.value = null` 및 `values[]` 정본 원칙은 불변**(Amendment #16 Part A). `locations[]`는 **선택적**이며 생략이 기본이다.
>   - **▣ 보고된 vocabulary gap (변경 0):** `Piping`은 **Colour V1 `GENERIC_DESCRIPTORS`에는 존재하나 `decorative_detail` 값역(`Embroidery`·`Sequin-Beading`·`Appliqué`)에는 없다.** 본 Amendment는 이를 **추가하지 않았다** — CEO 승인 없는 Decorative Detail 값역 확장 금지. **별도 vocabulary gap으로 보고만 한다.**
>
> **★★ Controlled Amendment #17 (2026-08-18 · Batch 001 Approved Remediation Stage 1 · **ADR-126 CA#15** · CEO Decision D-1 + D-2 + D-3 · FROZEN V1 유지 · **canonical parameter count 36 불변** · 신규 parameter 0 · 신규 vocabulary 0 · regression 456/0):** **Outerwear applicability correction + deterministic region metadata normalization.** *(applicability correction ≠ parameter 삭제/추가 — CA#3 선례. 근거 = Guard **G40** "Vision은 visually observable evidence를 downstream 미소비를 이유로 버리지 않는다 · Observation applicability ⊇ consumption scope".)*
>   - **D-1 `front_opening_extent` → MANDATORY (M) for `Jacket` · `Coat`** (was N). Value domain **불변** `None | Partial | Full`. `closure_type`(M, 불변)와 **함께** 소비되어 image-blind consumer가 `Zipper + Partial`(half-zip)과 `Zipper + Full`을 구분할 수 있어야 한다.
>     - **Closure authority consistency (기존 authority로 해소 · 새 rule 0 · 새 value 0):** `front_opening_extent = None` = **front opening 부재**. 기존 prompt authority가 이미 일반 규칙으로 명시 — *"Do NOT emit closure_type on a garment with no front opening."* Mandatory parameter가 미보고되면 `diagnostics.unreported`에 기록되며 이는 **diagnostic이지 contract error가 아니다**(validator는 **emit된** parameter만 검증). 따라서 `None` + `closure_type` 미emit은 정합적이다. `closure_type = Open`("a front opening with no visible fastening")은 `Partial`/`Full`과만 짝을 이루며 `None`과 공존하지 않는다.
>   - **D-2 `shoulder_drop` → MANDATORY (M) for `Jacket` · `Coat`** (was N). Value domain **불변** `None | Dropped`.
>     - **Semantic independence:** `shoulder_structure`(built structural support)와 `shoulder_drop`(seam position)은 **독립 관측**이다. **`shoulder_structure = None` + `shoulder_drop = Dropped`는 정상·유효 조합이며 모순으로 처리하지 않는다.** 선례: **Dress·Jumpsuit는 이미 두 parameter를 모두 M으로 보유**한다.
>     - **⛔ Scope firewall:** `shoulder_connection` · `shoulder_span`의 applicability는 **변경하지 않는다**(Jacket/Coat에서 계속 **N**). 기존 conditional applicability 결정은 재개하지 않는다(Guard CA#3: shoulder는 자동 확대 금지 · category별 CEO calibration).
>   - **D-3 Single-legal-region deterministic normalization (controller · metadata only):** 어떤 parameter가 해당 category에서 **legal region이 정확히 1개**면, controller가 emit된 region을 그 유일 legal region으로 **정규화**한다(기존의 "omit 시 기본값 채움" 동작을 "잘못 emit된 값도 정규화"로 확장). **frozen region authority(`regionFor`)에서 generic하게 파생** — shoulder_structure 전용 hard-code 아님.
>     - **불변 보장:** value · `values[]` · evidence · descriptor · state · count · density · applicability · semantic interpretation **전부 미변경**(shallow copy로 `region` 키만 교체).
>     - **⛔ legal region이 2개 이상이면 controller는 절대 선택하지 않는다** — 추론·추측·semantic repair 금지. 해당 관측은 그대로 통과하며 validator의 정상 판정(`BAD_REGION`/`MISSING_REGION`) 대상으로 남는다. `byRegion`(Dress/Jumpsuit `fabric_behavior`/`fit`)은 다중 region이므로 미접촉.
>   - **Applicability accounting (invariant `U+M+C+N=36` 유지 · N은 파생값이며 hard-code 아님):** **Jacket U9 / M14 / C4 / N9 = 36** · **Coat U9 / M14 / C4 / N9 = 36** · 나머지 8 category 변경 0(총계 전부 36). **Producer 총 parameter = 36 유지**(37번째 없음 · 삭제 없음).
>   - **Files / seal:** `producer_rules_v1.js` `4e680a19a8210b36`→**`47c7b2c7604c72ad`** · `producer_controller_v1.js` `a642194efb90a66d`→**`e385fd88509ccd8a`** · `producer_prompt_v1.js` `0c53d1e73fe3bc39`→**`8d3da09178a007c5`** · **`producer_validator_v1.js` UNCHANGED `e2813ac794ec25e4`**(N이 파생되므로 completeness invariant 수정 불필요). Color V1 · Producer V1 entrypoint · onecall UNCHANGED. **engine `225252b1afa8d75b` UNCHANGED.**
>   - **Batch 001 재검증(read-only · raw immutable `e5748101792b7d1a`):** contract-valid **7/12 → 11/12 · regression 0**. 해소 = `shoulder_structure/BAD_REGION` ×3 + `shoulder_drop/NOT_APPLICABLE_EMITTED` ×2. REF_000003은 `shoulder_connection/NOT_APPLICABLE_EMITTED`만 남아 invalid — **scope firewall이 유지되었다는 증거**. `front_opening_extent`는 historical raw에 애초에 존재하지 않으므로 **소급 복원 불가**(향후 추출부터 적용).
>
> **★★ Controlled Amendment #16 (2026-08-18 · Batch 001 Approved Remediation Stage 0 · CEO Decision D-5 + D-9 · FROZEN V1 유지 · documentation synchronization only · code 0 · Producer/validator behavior 불변):** 이 Amendment는 **이미 CEO 승인·구현·검증된 상태를 Schema에 반영하는 동기화**다. 새 결정·새 vocabulary·새 parameter 0.
>   - **▣ PART A — MULTI CANONICAL CONSUMPTION CONTRACT (CEO D-5, 2026-08-18).** **MULTI observation의 canonical 표현 = `values[]`.** MULTI parameter에서 **scalar `.value = null`은 정상 canonical 상태**이며 결함이 아니다. 실제 관측값은 전부 `values[]`가 운반한다.
>     - **MULTI = 5 (정정: 구 표기 "MULTI (4)" → 5):** `material` · `surface` · `decorative_detail` · `attachment` · `exposure_opening`. *(`exposure_opening`은 Amendment #15에서 MULTI로 신설되었으나 §B5 본문 목록이 4로 남아 있었다 — 본 Amendment로 정정.)*
>     - **Implemented canonical shape (operative = `producer_rules_v1.js` / `producer_controller_v1.js` / `producer_validator_v1.js`):** `{ state, value: null, region, evidence[], values: [ { value, descriptor?, evidence[] } ] }`. **아래 §B5/§B5.1의 구 `"value": [배열]` + `evidence:[{value,cue,location}]` 표기는 본 Amendment로 SUPERSEDED**(historical provenance로 보존).
>     - **Consumption rule (canonical · downstream 필수 준수):** MULTI parameter는 **`values[]`를 읽는다.** `.value`를 읽지 않는다. `.value === null`은 "관측 없음"이 아니라 **"MULTI이므로 정상"**이다. 관측 부재는 `state`(`ABSENT`/`NOT_VISIBLE`/`UNKNOWN`)로만 판정한다.
>     - **Validator 준거 동일:** validator는 MULTI에 대해 `values[]`만 검증한다(domain·중복·`Other` descriptor·per-value evidence). **`.value`는 MULTI에서 검증 대상이 아니다.**
>     - ⛔ **`.value` redundant 채움 금지**(dual canonical representation 금지 · dominant/primary material 함의 금지 — §B5 "dominant material 추론·percentage·ranking·primary/secondary taxonomy 신설 금지"와 충돌). ⛔ MULTI vocabulary 변경 0 · Producer 동작 변경 0 · validator 동작 변경 0.
>     - **Historical reconciliation (REF_000002):** CEO의 역사적 판정(**해당 Jacket의 surface = `Quilted`**)은 **그대로 유효하며 재작성하지 않는다.** 단 **기술적 진단은 정정된다** — raw는 `surface.values[] = [{"Quilted", evidence:"diamond-stitched quilting across whole body and sleeves"}]`로 **지각·emit되어 있었다.** 따라서 REF_000002는 **"Quilted를 관측하지 못한 Vision perception failure"로 기술 분류될 수 없다.** 실제 원인 = **표현/직렬화 + consumption-contract 모호성**(본 Part A로 해소). *(historical adjudication ≠ refined technical diagnosis — 두 계층을 분리 보존한다.)*
>   - **▣ PART B — RECOVERED SYNCHRONIZATION: Producer-35 → Producer-36 (CEO D-9 scope).** 본 root 문서는 **선언된 유일 active SoT**임에도 2026-08-16 승인·구현된 두 건이 반영되지 않은 채 35에 머물러 있었다(handoff package 사본 및 `STMX_GARMENT_LEVEL_VISION_FINAL_FREEZE_MANIFEST_V1.md`에는 반영되어 있었음 = duplicate-SoT divergence). 아래는 **새 결정이 아니라 누락된 동기화 복구**다.
>     - **`sleeve_volume` = PN 36** (D-SV-1 · CEO 2026-08-16) — domain `Regular / Full / Exaggerated`(magnitude only · sleeve-style name 금지) · **Conditional**, parent `sleeve`, gate `sleeve OBSERVED ∧ ≠ Sleeveless` · 8 sleeve-bearing categories(T-Shirt/Shirt/Sweater/Sweatshirt/Jacket/Coat/Dress/Jumpsuit) · **N** for Trouser/Skirt · region **UPPER**. `sleeve`는 LENGTH ONLY로 불변.
>     - **Silhouette Final Migration (SIL-FREEZE-A · CEO 2026-08-16):** `silhouette` = 공통 **Lower Geometry** carrier — Dress `Straight/Widening/Flared/Narrowing` · Skirt `Straight/Widening/Narrowing` · Trouser `Straight/Flared/Tapered` · Jumpsuit `Straight/Flared/Tapered`. legacy `Skinny/Slim/Wide/Oversized/Voluminous`는 silhouette에서 제거(`Skinny→Slim` collapse) · **Fit domain 불변**. 파생 출력 **`whole_garment_silhouette`** = deterministic controller 산출 · `record.derived` · **raw parameter 아님**(Dress→Column/A-Line/Fit-and-Flare/Tapered · Jumpsuit→Straight/Flared/Tapered · +Indeterminate).
>     - **★ Canonical parameter count = 36** · **U+M+C+N = 36 · all 10 categories.** 아래 Amendment #15의 35-param 표 및 "★35" 표기는 본 Amendment로 **SUPERSEDED**(보존). **Operative ground truth = `producer_rules_v1.js` PN 1..36.**
>
> **★★ Controlled Amendment #15 (2026-08-15 · Pre-Proportion Garment Vision Consolidation · 40 → 35 · CEO Decision 2026-08-15 · FROZEN V1 유지 · already-implemented + regression 355/0 + live-Vision 7/7):** 이미 CEO 승인·구현·검증된 **Producer-35** 계약을 Schema에 controlled amendment로 반영. **아래 PHASE A(40-inventory) 및 GROUP A(10)·C3 field-def·§D applicability matrix의 40-based content는 이 Amendment로 SUPERSEDED**(historical provenance로 보존). **Active canonical inventory = 아래 35-param 표.**
>   - **Closure 3→1:** `#20 front_opening_type`(Button/Snap Button/Zipper/Open) + `#21 closure_type`(…/Hook Closure) + `#22 closure_arrangement`(Single/Double Breasted) → **단일 `closure_type`** = `Button/Single Breasted Button/Double Breasted Button/Snap Button/Zipper/Hook Closure/Open`. `front_opening_extent` 독립 유지. Applicability = **M**(Jacket/Coat) + **C**(TOP/Dress/Jumpsuit · gate front_opening_extent≠None) · N(Trouser/Skirt).
>   - **`#33 front_overlap` REMOVED.**
>   - **`#34 cutout` + `#35 open_back` → 단일 MULTI `exposure_opening`** = `Open Back/Front Cutout/Side Cutout/Shoulder Cutout`. **location/magnitude 없음.** Dress/Jumpsuit Mandatory.
>   - **`#31 transparency` RETIRED** → optical Surface value.
>   - **`#28 surface` 8 → 11 (MULTI):** +`Glossy`·+`Semi Transparent`·+`Transparent`. Semi Sheer/Sheer 복원 금지.
>   - **GROUP A(Category-Independent) 10 → 9** (transparency 제거; surface가 이미 Universal). **MULTI = material/surface/decorative_detail/attachment/`exposure_opening`(5).**
>   - **Count 40 → 35** · U+M+C+N=35 all 10 categories. **Producer-35 = current pre-Proportion authority; Final Vision Architecture Freeze는 Proportion 후 보류.**
>
> **▼ ACTIVE Canonical Parameter Inventory (35 · Producer-35 · code `producer_rules_v1.js` PN 1..35 = ground truth)**
>
> | # | Canonical Parameter | Domain (Frozen) | Mult. | Applicability class (T/Sh/Sw/SwS/J/Co/Tr/Sk/D/Ju) |
> |---|---|---|---|---|
> | 1 | category | 10 categories | single | M M M M M M M M M M |
> | 2 | trouser_distinction | Tailored/Casual/Sport/Jeans/Leggings | single | N N N N N N M N N N |
> | 3 | silhouette | by-category | single | N N N N N N M M M M |
> | 4 | fit | Slim/Regular/Relaxed/Oversized (+Voluminous Skirt/Dress-Lower) | single | M M M M M M M M M M |
> | 5 | length | by-category | single | M M M M M M M M M M |
> | 6 | fabric_behavior | Structured/Semi-Structured/Semi-Fluid/Fluid | single | M M M M M M M M M M |
> | 7 | waist_definition | Undefined/Defined/Cinched | single | N N N N C C N N C C |
> | 8 | sleeve | Sleeveless/Short/Mid/Long | single | M M M M M M N N M M |
> | 9 | shoulder_connection | Standard/Strap/Strapless/Halter/One Shoulder | single | C C C N N N N N C C |
> | 10 | shoulder_span | Narrow/Regular/Extended | single | C C C N N N N N C C |
> | 11 | shoulder_drop | None/Dropped | single | M M M M N N N N M M |
> | 12 | shoulder_structure | None/Mild/Strong/Extreme | single | N N N N M M N N M M |
> | 13 | neckline_shape | Round/V/Square/Straight/Scoop/Mock/Turtleneck/Funnel | single | M M M M N N N N M M |
> | 14 | neckline_position | High/Regular/Low | single | M M M M N N N N M M |
> | 15 | collar | None/Shirt/Stand/Sailor/Peter Pan/Tie/Ruffle/Shawl/Notched/Peak | single | M M M M M M N N M M |
> | 16 | rib_cuff | None/Present | single | M M M M M M N N M M |
> | 17 | rib_hem | None/Present | single | M M M M M M N N M M |
> | 18 | hood | Present | single | N N N M M M N N N N |
> | 19 | front_opening_extent | None/Partial/Full | single | M M M M N N N N M M |
> | 20 | **closure_type** ★ | Button/Single Breasted Button/Double Breasted Button/Snap Button/Zipper/Hook Closure/Open | single | C C C C M M N N C C |
> | 21 | pocket | None/Present | single | U U U U U U U U U U |
> | 22 | pocket_construction | Inset/Applied | single | C C C C C C C C C C |
> | 23 | pocket_projection | Flat/Projected/Volumetric | single | C C C C C C C C C C |
> | 24 | french_cuff | None/Present | single | N C N N N N N N N N |
> | 25 | material | Cotton/Wool/Leather/Suede/Knit/Denim/Synthetic/Silk/Velvet/Fur/Padding/Other | **multi** | U U U U U U U U U U |
> | 26 | **surface** ★ | Pleated/Gathered/Quilted/Textured Knit/Lace/Mesh/Treated Surface/Reflective/Glossy/Semi Transparent/Transparent (11) | **multi** | U U U U U U U U U U |
> | 27 | pattern | Linear/Grid/Repeat | single | U U U U U U U U U U |
> | 28 | graphic | Localized/Dominant | single | U U U U U U U U U U |
> | 29 | asymmetry | None/Present | single | U U U U U U U U U U |
> | 30 | slit | None/Present | single | N N N N N N N M M N |
> | 31 | ruffle | None/Present | single | U U U U U U U U U U |
> | 32 | decorative_detail | Embroidery/Sequin-Beading/Appliqué | **multi** | U U U U U U U U U U |
> | 33 | attachment | Metal Hardware/Jewelry Attachment/Ribbon/Belt/Epaulette/Storm Flap/Fur Trim/Fringe/Feather/Other | **multi** | U U U U U U U U U U |
> | 34 | **exposure_opening** ★new | Open Back/Front Cutout/Side Cutout/Shoulder Cutout | **multi** | N N N N N N N N M M |
> | 35 | grammar | Tailored/Casual/Utility | single | N N N N M M N N N N |
>
> **Inventory Lock = 35/35.** Per-category U+M+C+N=35: T-Shirt 9/12/5/9 · Shirt 9/12/6/8 · Sweater 9/12/5/9 · Sweatshirt 9/13/3/10 · Jacket 9/12/3/11 · Coat 9/12/3/11 · Trouser 9/6/2/18 · Skirt 9/6/2/18 · Dress 9/16/6/4 · Jumpsuit 9/15/6/5. Retired (Frozen-40 provenance only): `front_opening_type`·`closure_arrangement`·`front_overlap`·`cutout`·`open_back`·`transparency`. 정본 = `STMX_GARMENT_VOCABULARY_PRODUCER35_AUTHORITY_SYNC_REPORT_V1.md` · `STMX_VISION_PRE_PROPORTION_GARMENT_CONSOLIDATION_IMPLEMENTATION_REPORT_V1.md` · code `producer_rules_v1.js`(`7cc2c5a0e27c7dc6`). Engine SHA `225252b1afa8d75b` 불변 · SR/TC/DM/EI/Color V1/production-code 0.
>
> **🛠 Controlled Amendment #1 (2026-08-08 · ADR-121 · FROZEN V1 유지):** §B3.1 Category UNKNOWN Routing 내부 모순 교정 — `silhouette·fit·length`를 ALL-applicable에서 제외(category-dependent domain/placement)하고 **GROUP A(9) 정상 extraction / GROUP B(silhouette·fit·length)+category-specific = key omit**로 확정. **40 canonical parameter·value domain·state·multiplicity·Region·applicability matrix 불변**(routing 정합화만). *(★ADR-126 CA#2로 GROUP A(9) → **GROUP A(10)**: `asymmetry` 추가 — 아래 §B3.1 참조. 이 CA#1 항목은 당시(ADR-121) 상태 기록.)*
> **🛠 Controlled Amendment #37 (2026-08-20 · ADR-126 CA#37 · FROZEN V1 유지 · CEO approved · SV-5 CLOSURE):** **★ CA#24 (SV-5) “`ABSENT` applicability enforcement는 본 amendment 범위 밖(future question)” 상태를 본 amendment로 **CLOSED**한다.** 새 parameter 0 · 새 vocabulary 0 · 새 state 0 · 값역 0 · applicability 0 · schema shape 0 · MULTI membership 0(5) · Producer-36 불변. **(SV-5-A) FAMILY A** — frozen canonical value domain에 canonical token `None`이 존재하는 parameter(**정확히 11개**: `shoulder_drop` · `shoulder_structure` · `collar` · `rib_cuff` · `rib_hem` · `front_opening_extent` · `pocket` · `french_cuff` · `asymmetry` · `slit` · `ruffle`)에서 **visible + readable + feature/morphology 부재**는 **반드시 `OBSERVED` / `"None"`**로 기록한다. ⛔ **해당 parameter에서 `ABSENT` / `null`은 더 이상 legal Producer representation이 아니다.** **(SV-5-B) READABILITY FIREWALL** — `NOT_VISIBLE` / `null`과 `UNKNOWN` / `null`은 **그대로 legal하며 `None`과 별개**다: `OBSERVED`/`None` ≠ `NOT_VISIBLE` ≠ `UNKNOWN`. ⛔ **보이지 않는 feature를 `None`으로 강제하지 않는다** — 이는 정보손실이며 closure 불가 사유다. **(SV-5-C) FAMILY B** — domain에 `None`이 없는 parameter의 feature 부재는 **기존대로 `ABSENT` / `null`**이며, `OBSERVED`/`None`은 기존 `SEMANTIC_NONE_ILLEGAL`로 계속 거부된다. **(SV-5-D) 양방향 invariant는 단일 authority에서 파생된다** — validator의 기존 `isNoneDomain(param, category)`(= `R.domainFor().includes('None')`)를 그대로 재사용하며, 11개를 layer별로 hard-code하지 않는다. 새 parallel mechanism 0. **신규 error code `SEMANTIC_NONE_REQUIRED`** — 기존 `SEMANTIC_NONE_ILLEGAL`의 **정확한 대칭(mirror)**이며 반대 방향의 위반이므로 동일 code로 합치면 진단이 불가능해진다. naming·F-class convention을 그대로 따른다. **Controller 미수정** — VALIDATION ≠ CORRECTION: Producer가 잘못 `ABSENT`를 내면 validator가 거부할 뿐, controller가 의미를 추론해 `None`으로 고치지 않는다. **GT** — historical ledger는 rewrite하지 않으며, CA#22/CA#35 additive overlay mechanism을 그대로 재사용해 current canonical만 추가한다. 정본 = `STMX_SV5_CLOSURE_SEMANTIC_NONE_ENFORCEMENT_V1.md`.

> **🛠 Controlled Amendment #34 (2026-08-20 · ADR-126 CA#34 · FROZEN V1 유지 · CEO approved · Body-less Length Hard Eligibility Gate):** **enforcement / clarification only — CA#22를 SUPERSEDE하지 않는다.** 새 parameter 0 · 새 vocabulary 0 · **새 state 0** · 값역 0 · applicability 0( = M × 10 category) · schema shape 0 · GT schema 0 · controller/validator 수정 0. **(BL-1)** body-relative 는 **실제 착용자의 신체 landmark와 hem의 관계**를 관찰하는 값이므로, 착용자가 없는 이미지에서는 판정하지 않는다 — flat lay · product-only/packshot · hanger · garment-only · ghost/invisible-mannequin · 신체 landmark가 human-body reference로 읽히지 않는 mannequin/body form → ** · **(기존 §B  정의 그대로 사용 · 새 의미 발명 0). **(BL-2)** ⛔ **garment 전체가 프레임에 보인다는 사실은 판정 근거가 되지 않는다** — garment visibility ≠ body-landmark visibility. 금지 proxy: garment pixel length · canvas proportion · product crop · garment overall shape/종류 · sleeve-to-body proportion · hanger/mannequin proportion · category stereotype · filename. ⛔ **가상의 착용자 상상 금지**. **(BL-3)** 실제 착용 + landmark 판독 가능 시 **CA#22 doctrine을 그대로 적용**하며 본 gate는 정상 판정을 **억제하지 않는다**. **(BL-4)** 4-state contract 유지. **구현 = prompt STEP 0 gate 1건**(분류 **이전** 실행 · 순서를 regression test로 강제). **★ 근거:** CA#22 gate 문구는 이미 존재했으나 landmark 규칙 뒤 caveat 위치여서 부분적으로만 준수됐다(REF_000002 leak 1/3 · REF_000145 leak 2/6 — 후자는 이라 적으며 존재하지 않는 form을 상상). **Validation:** body-less 7/7  · leakage 0 · worn control 3/3 · repeatability STABLE · regression 761/0. 정본 = .

> **🛠 Controlled Amendment #34 (2026-08-20 · ADR-126 CA#34 · FROZEN V1 유지 · CEO approved · Body-less Length Hard Eligibility Gate):** **enforcement / clarification only — CA#22를 SUPERSEDE하지 않는다.** 새 parameter 0 · 새 vocabulary 0 · **새 state 0** · 값역 0 · applicability 0(`length` = M × 10 category) · schema shape 0 · GT schema 0 · controller/validator 수정 0. **(BL-1)** body-relative `length`는 **실제 착용자의 신체 landmark와 hem의 관계**를 관찰하는 값이므로, 착용자가 없는 이미지에서는 판정하지 않는다 — flat lay · product-only/packshot · hanger · garment-only · ghost/invisible-mannequin · 신체 landmark가 human-body reference로 읽히지 않는 mannequin/body form → **`state = NOT_VISIBLE` · `value = null`**(기존 §B `NOT_VISIBLE` 정의를 그대로 사용 · 새 의미 발명 0). **(BL-2)** ⛔ **garment 전체가 프레임에 보인다는 사실은 판정 근거가 되지 않는다** — garment visibility ≠ body-landmark visibility. 금지 proxy: garment pixel length · canvas proportion · product crop · garment overall shape/종류 · sleeve-to-body proportion · hanger/mannequin proportion · category stereotype · filename. ⛔ **가상의 착용자 상상 금지**. **(BL-3)** 실제 착용 + landmark 판독 가능 시 **CA#22 doctrine을 그대로 적용**하며 본 gate는 정상 판정을 **억제하지 않는다**. **(BL-4)** 4-state contract 유지. **구현 = prompt STEP 0 gate 1건**(분류 **이전** 실행 · 순서를 regression test로 강제). **★ 근거:** CA#22 gate 문구는 이미 존재했으나 landmark 규칙 뒤 caveat 위치여서 부분적으로만 준수됐다(REF_000002 leak 1/3 · REF_000145 leak 2/6 — 후자는 "on the form"이라 적으며 존재하지 않는 form을 상상했다). **Validation:** body-less 7/7 `NOT_VISIBLE` · leakage 0 · worn control 3/3 · repeatability STABLE · regression 761/0. 정본 = `STMX_BODYLESS_LENGTH_HARD_GATE_V1.md`.

> **🛠 Controlled Amendment #32 (2026-08-20 · ADR-126 CA#32 · FROZEN V1 유지 · CEO approved · `shoulder_structure` Visual Morphology Recalibration):** **observation semantics recalibration only — 값역 변경 0 · 새 parameter 0 · parameter identity 불변(PN 12 · `ALL_PARAMS` 36) · applicability 불변(`NNNNMMNNMM`) · state contract 불변 · schema shape 불변 · GT schema 0.** **(SS-1) 판단 대상 = 보이는 shoulder outer contour / silhouette morphology 뿐이다.** ⛔ shoulder pad · 내부 padding · 내부 reinforcement · tailoring/봉제 내부 구조 · 보이지 않는 architectural build **추론 금지**. **If it cannot be seen in the image, it cannot be evidence.** 관찰 항목 = (1) shoulder line 방향·형태 (2) endpoint 명확성 (3) endpoint→sleeve contour 전환. **위 §B의 `shoulder_structure` 항목 및 기존 prompt 정의에 있던 "amount of BUILT structural shoulder · padding/architectural build · firmly padded" 계열 표기는 본 Amendment로 SUPERSEDED**(historical provenance로 보존). **(SS-2) Decision hierarchy(순서 고정):** STEP 1 round·continuous transition + structural endpoint 부재 → **`None`** · STEP 2 endpoint/direction change는 보이나 extension·line strength 제한적 → **`Mild`** · STEP 3 sustained straight/near-horizontal line **또는** substantial outward extension + 명확한 endpoint + sleeve의 뚜렷한 하강 → **`Strong`** · STEP 4 shoulder tip 자체가 elevated/upturned → **`Extreme`**. **(SS-3) `None↔Mild` 경계 = ROUND CONTINUITY → VISIBLE BREAK.** **(SS-4) ⛔ `Strong` 판정에 절대적 70°–90° angle requirement를 두지 않는다** — outward extension이 충분히 강하면 line이 다소 하향이어도 `Strong`. **angle alone must never decide Mild vs Strong.** **(SS-5) ⛔ `Extreme`은 visible upward/elevated shoulder tip morphology를 요구한다** — `very wide shoulder ≠ Extreme` · `oversized fit ≠ Extreme` · `large extension alone ≠ Extreme`. **(SS-6) Confound firewall:** garment fit · oversized fit · shoulder width 단독 · sleeve_volume · puff/gathered sleeve cap · quilting/thickness · fabric stiffness 단독 · shoulder_drop 단독 · 추론된 padding/construction은 **직접 근거 금지**. 해당 요소로 인해 **실제로 보이는 contour가 변한 경우 그 visible contour만** evidence로 사용한다. **★ 근거:** CA#31 forensic audit에서 `shoulder_structure` evidence 문자열의 **90%(56/62)** 가 padding/built/interfacing 추론을 담고 있었고(`"soft unbuilt padded shoulder"` 같은 자기모순 포함), 그 원인은 Producer 일탈이 아니라 **prompt가 BUILT structure 판단을 직접 지시**한 것이었다. 또한 `Extreme`은 **194 관측 중 0회 방출**됐는데 prompt에 실질 정의가 없었다(`"(Extreme if exaggerated)"` 괄호 한 줄). **CEO GT = CA#31 9-image review 판정**(`STMX_SHOULDER_STRUCTURE_CEO_GT_FREEZE_V1.json`). **downstream:** SR runtime이 `strong shoulder_structure → SR6` 경로로 본 값을 소비한다 — **SR 코드는 본 Amendment에서 수정하지 않는다**(SR FROZEN). 정본 = `STMX_SHOULDER_STRUCTURE_VISUAL_MORPHOLOGY_RECALIBRATION_V1.md`.

> **🛠 Controlled Amendment #30 (2026-08-20 · ADR-126 CA#30 · FROZEN V1 유지 · CEO approved · `sleeve_volume` Canonical Simplification):** **value-domain 축소 only — 새 parameter 0 · parameter identity 불변(PN 36 · `ALL_PARAMS` 36) · applicability 불변(`CCCCCCNNCC`) · state contract 불변 · schema shape 불변 · GT schema 0.** **위 §B의 D-SV-1 항목에 기재된 domain `Regular / Full / Exaggerated` 표기는 본 Amendment로 SUPERSEDED**(historical provenance로 보존). **Operative ground truth = `producer_rules_v1.js` `VALUE_DOMAINS.sleeve_volume`.** **(SVOL-1)** `sleeve_volume` 값역 **`Regular / Full / Exaggerated` → `Regular / Voluminous`**. **`Full` = RETIRED · `Exaggerated` = RETIRED.** 강도 등급(intensity grading) 자체를 폐기하고 **binary morphology distinction**만 남긴다: *"소매가 통상적인 sleeve-volume envelope 안에 있는가, 아니면 sleeve volume이 **의도적으로 확대되어 그 자체가 눈에 보이는 디자인 요소**가 되었는가."* **(SVOL-2) `Regular`** = 통상적인 sleeve-volume envelope. ⛔ 약간의 여유 · 두꺼운 소재 · padding/down/fill로 인한 두께만으로는 `Voluminous`가 **아니다**. **일반적인 puffer/down sleeve도 volume 자체가 의도된 디자인이 아니면 `Regular`.** `Regular`는 "좁은 소매"를 뜻하지 않으며 **`Narrow` 값을 만들지 않는다.** **(SVOL-3) `Voluminous`** = sleeve volume이 통상 envelope을 넘어 **의도적으로 확대**되었고 그 확대된 volume이 **시각적으로 유의미한 디자인 요소**인 경우(puff · balloon · 의도적으로 확장된 sleeve body · 명백히 oversized/rounded sleeve volume). **단순 fabric/insulation thickness는 근거로 불충분.** **(SVOL-4)** ⛔ 강도 질문 금지 — "얼마나 큰가" · "Full인가 Exaggerated인가" · "mild인가 extreme인가"를 Vision에게 묻지 않는다. **(SVOL-5)** ⛔ **automatic puffer rule 금지** — `Puffer/Down/Quilted → Voluminous` shortcut을 금지한다. padding/material/surface evidence와 sleeve volume morphology를 혼동하지 않는다. **★ 근거(측정):** 독립 Generalization Set B(Batch 002)에서 `sleeve_volume` 관측 **17/17이 전부 `Regular`**였고 puffer 1장·down coat 2장이 포함되어 있었다. 또한 **프로젝트 전체 artifact 누적 관측에서 `Exaggerated`는 단 한 번도 방출된 적이 없다**(`Regular` 175 · `Full` 22 · **`Exaggerated` 0**). 3-value 구조의 세 번째 값은 실질적으로 사문화되어 있었고, `Full↔Exaggerated` 강도 구분은 관측 신뢰도를 얻지 못했다. **Downstream firewall audit(PHASE 3) = CASE A:** `sleeve_volume`은 Frozen Decisions D-SV-1이 명시한 대로 **Vision observation 전용(no departure/Transformative/archetype/score)**이며 **TC/engine/scoring 코드에 소비자가 0건**임을 firsthand 확인했다. 따라서 `Full`/`Exaggerated`가 서로 다른 TC 의미나 score를 갖지 않으며, **본 amendment는 어떤 score mapping도 변경·발명하지 않는다.** **GT migration(SVOL/PHASE 5):** `Full → Voluminous` · `Exaggerated → Voluminous` · `Regular → Regular`. **historical raw GT를 조용히 rewrite하지 않는다** — overlay/provenance로 original과 current canonical migrated value를 분리 기록한다(CA#22/CA#23 precedent). Producer 예측을 보고 GT를 바꾸는 것이 아니라 **CEO가 정한 vocabulary migration을 적용**하는 것이다. **vocabulary fingerprint는 본 amendment로 변경된다**(값역 축소이므로 당연) — 그 외 parameter/applicability/state/schema는 전부 불변. 정본 = `STMX_SLEEVE_VOLUME_CANONICAL_SIMPLIFICATION_AND_FOCUSED_VALIDATION_V1.md`.
> **🛠 Controlled Amendment #29 (2026-08-19 · ADR-126 CA#29 · FROZEN V1 유지 · CEO approved · Pocket Single-Carrier Finalization):** **carrier 단일화 only — 새 parameter 0 · 새 vocabulary 0 · 새 state 0 · 새 location token 0 · pocket count 0 · parameter count 36 유지(36→34 축소 없음) · GT schema migration 0.** **★ 근거 = 측정된 Producer 행동:** CA#26 MODE B(scalar fallback)는 **live에서 한 번도 사용되지 않았다** — Batch 001 final campaign **0/29**, CA#28 focused validation **0/18**, 합계 **0/35**. CA#28이 명시적·의무적 scalar 지시를 넣은 뒤에도 **0**이었다. 실제 Producer 행동은 **`pockets[]` 아니면 omission** 두 가지뿐이다. 존재하지 않는 경로를 prompt tuning으로 되살리려 하지 않는다. **(D1) `pocket = Present` → `pockets[]`가 non-empty **유일 canonical carrier**다.** CA#26 MODE B scalar fallback은 **RETIRED**. **(D2) `pockets[]`는 multi-pocket 전용 구조가 아니다.** single pocket · homogeneous set · heterogeneous group · kangaroo pouch · 부분 가림 · morphology 판독 불가 — **전부 `pockets[]`로 표현한다.** instance = "여러 개"가 아니라 **observable pocket group과 그 morphology를 결합해 보존하는 canonical record**다. ⛔ 따라서 homogeneous garment에서 `pockets[]`를 쓰는 것은 **over-emission이 아니며**, CA#26의 over-emission watch는 **종료**된다. **(D3) Readability:** morphology를 읽을 수 없어도 **pocket instance를 삭제하지 않는다** — instance 안에서 기존 state로 표현한다(가림 → `NOT_VISIBLE`+null · 보이나 확정 불가 → `UNKNOWN`+null). **새 state 금지 · CA#23 semantics 보존.** **(D4) Kangaroo:** 하나의 연속된 pouch는 **하나의 pocket group**이다. 좌/우 opening 때문에 두 instance로 분할하지 않는다. **`Kangaroo` morphology vocabulary 신설 0**(P-4 미결 유지). **Scalar parameter 처리(중요):** `pocket_construction`·`pocket_projection`은 **Producer-36 parameter identity를 그대로 유지**한다(PN 22·23 · `ALL_PARAMS` 36 불변). 다만 **canonical carrier로 사용되지 않으며**, `pocket = Present`일 때 controller가 **governed suppression으로 key-omit**한다(CA#11 방식 · CA#26 Option C의 확장). **Historical GT의 scalar 값은 계속 읽을 수 있어야 하며**(ledger 12건 중 7건 보유) **절대 삭제·변경·재생성하지 않는다** — 은퇴하는 것은 **Producer emission**이지 GT가 아니다. **Validator:** `pocket = Present` ∧ `pockets[]` 부재/빈 배열 → `POCKET_MORPHOLOGY_CARRIER_MISSING`(CA#28 코드 재사용). `pocket = Present`에서 scalar이 등장하면 **retired-carrier 위반**(`POCKET_DUAL_CARRIER`). pocket이 Present가 아니면 기존 applicability semantics 유지. **새 repair logic 0 · controller inference 0.** **보존:** CA#23 readability · CA#26 location(4 token)/pairing · CA#28 completeness enforcement · D-4 · Colour V1 · canonicalization · FINALPIPE(둘 다 pocket scalar를 소비하지 않음을 firsthand 확인). **params 36 · MULTI 5 · states 4 · vocabulary `919f45fe9942f855` 불변 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_POCKET_SINGLE_CARRIER_FINALIZATION_AND_CEO_GROUP_A_PACK_V1.md`.
> **🛠 Controlled Amendment #28 (2026-08-19 · ADR-126 CA#28 · FROZEN V1 유지 · CEO approved · Pocket Morphology Carrier Completeness Enforcement):** **completeness invariant 신설 only — 새 parameter 0 · 새 vocabulary 0 · 새 state 0 · 새 location token 0 · pocket count 0 · instance architecture 변경 0 · canonical ownership(CA#26 Option C) 변경 0 · Kangaroo vocabulary 변경 0.** **★ 근거 = Batch 001 Final 12×3 campaign 실측:** `pocket = Present` run **29건 중 9건(31.0%)이 morphology carrier를 전혀 갖지 않았고**(instance 20 · **scalar fallback 0** · 누락 9), **validator는 9건 중 0건을 탐지**했다. CA#23 readability semantics 자체는 정상이었다 — 문제는 *"`pocket = Present`인데 morphology carrier가 아예 없는 output이 legal하게 통과한다"* 는 **계약의 빈틈**이었다. **(PM-1) `pocket.state = OBSERVED` ∧ `pocket.value = Present` → morphology response는 MANDATORY.** carrier가 전혀 없는 output은 **contract-incomplete**이며 invalid다. **(PM-2) 정확히 하나의 carrier mode를 쓴다.** **MODE A(INSTANCE)** = `pockets[]` non-empty → `pocket_construction`·`pocket_projection`은 **suppressed**(CA#26 Option C 그대로 · 유일 canonical carrier = `pockets[]`). **MODE B(SCALAR)** = `pockets[]` absent → **두 scalar observation이 모두 present여야 한다.** 각 scalar의 state는 서로 독립일 수 있다(예: construction `OBSERVED/Inset` + projection `UNKNOWN/null` 정상). **(PM-3) Readability는 state이지 applicability가 아니다.** ⛔ *"morphology를 못 읽겠으니 parameter를 N/A 처리하거나 생략한다"* 는 논리를 제거한다. 정확한 논리 = `pocket = Present` → **morphology response REQUIRED** → readable이면 `OBSERVED`+canonical value · 가림이면 `NOT_VISIBLE`+null · 보이나 확정 불가면 `UNKNOWN`+null. **carrier 부재는 readability state가 아니다.** 대체 value(`Undefined` 등) 신설 금지 · 5번째 state 금지. **(PM-4) trigger 문구 정정:** `CONDITIONAL_TRIGGER`의 `pocket === Present && morphology visually readable`에서 **`&& visually readable` 절을 제거**한다. canonical applicability trigger는 **`pocket === Present`** 뿐이며 readability는 Vision observation state가 담당한다(CA#23 P-8 소유권 분리와 동일 · **controller는 여전히 image를 보고 판단하지 않는다** · controller 동작 변경 0 — 코드는 이미 `pocket === Present`만 평가하고 있었고 문자열만 stale했다). **Validator 신규 error(F3 family):** `POCKET_MORPHOLOGY_CARRIER_MISSING`(carrier 전무) · `POCKET_MORPHOLOGY_CARRIER_INCOMPLETE`(scalar 한쪽만). 기존 `POCKET_DUAL_CARRIER`·`POCKET_GATE`·CA#24 state/value invariant는 **그대로 재사용**하며 Pocket 전용 state model을 만들지 않는다. **참고:** 누락은 종전에도 `diagnostics.unreported[]`에 기록되고 있었으나 **diagnostic은 validation substitute가 아니다** — CA#28이 이를 contract error로 승격한다(CA#27이 `waist_definition`에서 제거한 것과 동일한 invisibility class). **params 36 · MULTI 5 · states 4 · vocabulary fingerprint `919f45fe9942f855` 불변 · CA#22–27 보존 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_POCKET_MORPHOLOGY_CARRIER_COMPLETENESS_CLOSURE_V1.md`.
> **🛠 Controlled Amendment #27 (2026-08-19 · ADR-126 CA#27 · FROZEN V1 유지 · CEO approved · `waist_definition` Trigger Ownership + Readability Closure):** **deterministic defect 수정 + 기존 계약 명확화 only — 새 parameter 0 · 새 vocabulary 0 · 새 state 0 · applicability category 변경 0 · value semantics 변경 0.** **★ ROOT CAUSE (W2 · deterministic):** controller의 conditional trigger가 **자기 자신을 참조**했다 — `case 'waist_definition': g('waist_definition')` 이며 조건이 `state ∈ {OBSERVED, NOT_VISIBLE, UNKNOWN}`(= `ABSENT` 제외 아무 state)이라 **사실상 "모델이 emit하면 applicable"이라는 vacuous no-op gate**였다. 결과: Vision이 누락하면 trigger 미충족 → **`conditional_na`(= not applicable)로 분류되어 key-omit** → **`unreported[]`에 절대 들어가지 않고 validator error도 없다.** 즉 **누락이 구조적으로 관측 불가능**했다. 실측(Batch 001 + CA#20/21 전 artifact · applicable category record **130건**): **누락 45건(34.6%) · 그중 45/45가 조용히 `conditional_na` · `unreported[]` 진입 0건.** 이것이 CA#20/21이 F2로 기록한 trigger ownership gap의 정체다. **★ 결정 = MODEL B (self-contained observation) 확정** — 이는 **새 architecture가 아니라 이미 문서화된 authority의 복원**이다: 본 Schema field-def(row 7)은 `waist_definition`의 state set을 **`OBSERVED/NOT_VISIBLE/UNKNOWN`**으로 명시하고 §B가 이를 **`OBSERVED`+value 계열**로 분류해 왔다. 즉 applicable category에서는 **항상 answer해야 하는 observation**이었고, code만 이를 배반하고 있었다. **(1) Applicability = category-gate ONLY.** `Jacket · Coat · Dress · Jumpsuit`(class **C**, 변경 없음 — `N N N N C C N N C C` 유지)에서는 **언제나 observation target**이다. **parent parameter는 존재하지 않으며 신설하지 않는다.** **(2) Readability = 기존 4-state로만 표현**(새 state 0 · CA#22/CA#23 precedent 동일): waist가 crop/가림/layer로 **보이지 않으면 `NOT_VISIBLE`**, region은 보이나 garment shaping을 **확정할 수 없으면 `UNKNOWN`**, 읽히면 **`OBSERVED` + `Undefined/Defined/Cinched`**. ⛔ **key omission 금지** — 누락은 이제 `unreported[]`로 드러난다. ⛔ `Undefined` ≠ unreadable(판독 불가를 `Undefined`로 흘리지 않는다). **(3) Value semantics 불변**(CA#27은 재정의하지 않는다): `Defined` = cut/seaming으로 waist가 **가시적으로 shaped** · `Undefined` = **waist shaping 없음**(straight/column) · `Cinched` = drawstring/ruching 등으로 **실제로 안쪽으로 강하게 constrict**. **(4) 기존 firewall 유지·재확인:** ⛔ `Slim` fit → `Defined` 금지 · ⛔ belt 존재만으로 `Cinched` 금지 · ⛔ 착용자 **신체 허리선 ≠ garment waist definition** · ⛔ archetype(blazer/coat) 만으로 값 추론 금지 · **`Waist ≠ Fit ≠ Belt`**. **(5) controller는 image를 보고 waist shaping을 추론하지 않는다** — deterministic applicability routing만 담당한다. **측정(focused validation):** 아래 정본 참조. **params 36 · vocabulary fingerprint `919f45fe9942f855` 불변 · applicability class 불변 · MULTI 5 · states 4 · CA#22/23/24/25/26 보존 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_WAIST_DEFINITION_FORENSIC_AUDIT_AND_CLOSURE_V1.md`.
> **🛠 Controlled Amendment #26 (2026-08-19 · ADR-126 CA#26 · FROZEN V1 유지 · CEO approved · P-2 Multi-Pocket Instance Preservation · Option C):** **information-preservation metadata 신설 only — 새 top-level parameter 0 · canonical parameter 36 유지 · 새 morphology vocabulary 0 · 새 state 0 · MULTI membership 0(5 유지) · applicability class 0 · pocket count parameter 0.** **(1)** `pockets[]` = **`pocket` observation의 child metadata**로서 per-pocket-instance morphology를 보존한다. **37번째 parameter가 아니다** — `ALL_PARAMS`·vocabulary·applicability fingerprint 전부 불변. 선례 = `values[]`(Amendment #16) · `locations[]`(D-4/CA#16) · `byRegion{}`. **(2) ★ CANONICAL OWNERSHIP (Option C · CEO 2026-08-19):** `pockets[]`가 emit되면 **`pockets[]`가 pocket morphology의 유일한 canonical carrier**이며, 이때 `pocket_construction`·`pocket_projection`은 **CA#11과 동일한 governed suppression으로 key-omit**된다. `pockets[]`가 없으면 두 scalar은 **기존 CA#23 contract 그대로** 동작한다. **→ 어떤 record에서도 두 carrier가 동시에 canonical하게 존재하지 않는다**(dual-carrier 금지 · CA#25 교훈 적용). 위반 = `POCKET_DUAL_CARRIER`. **(3)** instance는 `location` + `construction` + `projection`을 **동일 object 안에서 pairing**한다 — 이것이 P-2의 목적(어느 morphology가 어느 pocket의 것인지 보존)이다. **(4) canonical location = 정확히 4개**: `Chest` · `Lower Front` · `Sleeve` · `Leg`. corpus 근거 기반이며 ⛔ `Side`·`Back`·`Left`·`Right`·`Hip`·`Thigh`·자유 텍스트·좌표 **전부 금지**(증거 확보 시 controlled amendment로만 추가). **(5)** morphology 값역 불변 — construction `Inset·Applied` · projection `Flat·Projected·Volumetric`. **새 값 0.** **(6) ⛔ count semantics 없음** — `pockets[].length`는 garment pocket 개수를 뜻하지 않는다(부분 가림으로 visible instance 수 ≠ 실제 수). `pocket_count` parameter 신설 금지(P-3 보류 유지). **(7) ⛔ L/R instance taxonomy 없음** — 좌우 대칭 pocket은 morphology가 같으면 **하나의 instance group**으로 표현한다. 단일 pouch(kangaroo)를 좌우로 분할하는 것을 금지한다. **(8) readability = CA#23 그대로** — instance child는 기존 4-state를 그대로 쓴다(`OBSERVED`+value · `NOT_VISIBLE`/`UNKNOWN`+null · CA#24 state/value invariant 재사용). **보이지 않는 location/morphology를 추론해 instance를 만들지 않는다.** segmentation 자체가 불가하면 `pockets[]`를 emit하지 않고 scalar fallback으로 둔다. **(9) ⛔ controller inference 0** — controller는 preserve/structural-trim 및 governed suppression만 수행하며 instance 생성·location 추론·morphology 추론·scalar↔instance 변환을 하지 않는다. **(10)** **P-4 Kangaroo vocabulary는 미결정(WATCH)** — 본 amendment는 `Inset/Applied`·`Flat/Projected` 재정의를 하지 않는다. 근거 설계 = `STMX_P2_MULTI_POCKET_INSTANCE_DESIGN_AND_OWNERSHIP_DECISION_V1.md` · 정본 = `STMX_P2_MULTI_POCKET_INSTANCE_IMPLEMENTATION_AND_POCKET_CLOSURE_V1.md`.
> **🛠 Controlled Amendment #25 (2026-08-19 · ADR-126 CA#25 · FROZEN V1 유지 · CEO approved · MULTI Serialization Alignment + SV-1 Full Enforcement):** **emitter alignment + enforcement only — 새 parameter 0 · 새 vocabulary 0 · 새 state 0 · MULTI membership 0(5 유지) · applicability 0 · consumer semantic 0 · primary/dominant 개념 신설 0.** **CEO Option (a) 승인**으로 CA#24의 **SV-1-OBSERVED OPEN ITEM 종결.** **Root cause = emitter serialization ambiguity**: prompt의 단일 `OUTPUT SHAPE` template이 모든 parameter에 `value`를 부여하고 `values`에는 `// MULTI parameters only` 주석만 달아 두어, 모델이 그 빈틈을 run마다 **4%~64%**로 다르게 메웠다(**결정론적 regression 아님 · stochastic drift**). **순서 = authority → prompt → tests → validator**(강제를 먼저 켜지 않았다). **(1) Prompt:** OUTPUT SHAPE을 **(A) SINGLE / (B) MULTI** 두 개의 명시적 template으로 분리 + MULTI 필수 문구 — scalar `.value`는 항상 `null` · 모든 관측값은 `values[]` · **값이 하나만 관측되어도 `values[]`** · scalar fallback 금지 · `OBSERVED`에서 `values[]` 생략 금지 · **scalar은 primary·dominant·representative·first·fallback 어느 것도 아님**. D-4 `locations[]`·`byRegion`·`descriptor` shape 보존. **(2) Tests:** scalar-on-MULTI fixture **9건 migrate**(assertion 약화 0 · 삭제 0 · `Other` descriptor 요구는 `values[]` item 내부에서 계속 검증) + **§46 신규 27**. GT-side fixture는 **의도적으로 미migrate**(GT serialization은 Amendment #16 관할 밖). **(3) Validator:** `MULTI_SCALAR_VALUE_PRESENT`를 **state 무관**으로 확장(OBSERVED 포함) + **신규 `MULTI_OBSERVED_NO_VALUES`**(F3 · `OBSERVED_NO_VALUE` 명명 관례 mirror · 권한 근거 = **Amendment #16 Part A Rule 1 + Rule 3** · 새 의미 발명 0). 아울러 MULTI 분기 조건이 `R.MULTI.includes(p) && Array.isArray(o.values)`였기 때문에 **`values[]`가 없는 MULTI observation이 SINGLE scalar 경로로 떨어져 SINGLE처럼 검증되던 구조 결함**(scalar-only가 통과하던 실제 경로)을 MULTI membership 단독 분기로 제거. **Live focused validation 5 anchors × 3 runs = 15 calls**(Batch 001 12×3 campaign 아님): **scalar contamination 0/37 OBSERVED MULTI(0.0%)** · **scalar-only 0/37(0.0%)** · **non-OBSERVED 위반 0/19** · duplicate 0 · **multiplicity 3값/2값 전부 3/3 안정** · **D-4 `locations[]` 53 value-entry 보존** · `Other`+descriptor가 **CEO GT와 정확히 일치**(REF_000012). **Artifact replay:** pre-CA#25 SET A **59/154(38.3%)** flagged = **`MULTI_SCALAR_VALUE_PRESENT` 89 + `MULTI_OBSERVED_NO_VALUES` 10**(사전 진단 수치와 정확히 일치) → **immutable · 자동 migration 0 · `PRE-CA#25 SERIALIZATION SHAPE` provenance만 부여**(이 flagging은 regression이 아니라 본 amendment가 제거하는 결함 그 자체) · post-CA#25 SET B **defect 0**. **Downstream:** `carrier_canonicalization_v1.js`·`stmx_final_extraction_pipeline_v1.js` 모두 MULTI를 **`values[]`만** 읽으며 observation-level scalar(`o.value`/`obs.value`)를 한 번도 읽지 않음을 firsthand 확인 · ⛔ **scalar fallback 추가 0**(§46.22 고정). **prompt `4260bf60f3aa2f80` → `7ce70c0911383ae3` · validator `d476183b6f35ad62` → `75110830ed0bcef6` · controller byte-identical `b0489306f2229fde` · params 36 · MULTI 5 · states 4 · vocabulary `919f45fe9942f855` · applicability 불변 · Colour V1/D-4/canonicalization/FINALPIPE 0 변경 · CA#22·CA#23·CA#24 보존 · **regression 821/0** · engine SHA `225252b1afa8d75b`.** ⚠️ **미해결 보고(CEO 판단 필요):** REF_000011 `surface` 판독 차이(historical `Textured Knit` → post `Glossy`/`ABSENT` · **surface semantics 문제로 serialization과 무관 · 미수정**) · **CEO GT는 12건 중 2건만 MULTI ruling 보유 → MULTI의 M3/M7을 GT 기준으로 측정 불가** · `exposure_opening`은 corpus에 positive anchor 부재(Dress/Jumpsuit 전용) · GT-side fixture serialization 미결. 정본 = `STMX_MULTI_SERIALIZATION_ALIGNMENT_AND_SV1_CLOSURE_V1.md` · provenance = `STMX_MULTI_SERIALIZATION_PROVENANCE_OVERLAY_V1.json`.
> **🛠 Controlled Amendment #24 (2026-08-19 · ADR-126 CA#24 · FROZEN V1 유지 · CEO approved · Global State/Value Validator Enforcement + SoT Reconciliation):** **enforcement + clarification only — 새 parameter 0 · 새 vocabulary 0 · 새 state 0 · applicability 0 · MULTI membership 0(5 유지) · state semantics rewrite 0.** **(SV-2)** SINGLE: `state ∈ {ABSENT, NOT_VISIBLE, UNKNOWN}` → `value = null` **강제** — validator가 이제 reject한다(`NON_OBSERVED_VALUE_PRESENT`, F3). 기존 `OBSERVED → canonical value 필수`(`OBSERVED_NO_VALUE`)는 불변. **(SV-1)** MULTI 5: scalar `.value`는 state와 무관하게 **항상 `null`** — 단 **`non-OBSERVED` 절만 validator 강제**(`MULTI_SCALAR_VALUE_PRESENT`)이고 **`OBSERVED` 절은 canonical 의미로 승인하되 강제 보류**(prompt emitter 미정렬 · 실측 30.4% 위반 · 강제 시 record 38.3% CONTRACT_INVALID · 10건은 `.value`가 유일 carrier → **SV-1-OBSERVED OPEN ITEM**, CEO 결정 대기). 그리고 **non-OBSERVED MULTI는 observed canonical `values[]`를 동시에 운반할 수 없다**(`MULTI_NON_OBSERVED_VALUES`) — Amendment #16 MULTI representation과 기존 state semantics를 논리적으로 완결한 clarification. `values[]=[]`는 독립적 의미를 갖지 않으며 **의미 소유자는 `state`**다. **(SV-3)** 검사는 **state 기준**으로만 — ⛔ 문자열 `"None"`을 invalid 처리 금지; semantic `None` domain parameter **11개**(`shoulder_structure`·`shoulder_drop`·`collar`·`rib_cuff`·`rib_hem`·`french_cuff`·`front_opening_extent`·`pocket`·`asymmetry`·`slit`·`ruffle`)의 `OBSERVED`+`"None"`은 계속 정상. **(SV-6)** §B2 semantic-`None` current list에서 퇴역 parameter 4개(`Transparency`·`Front Overlap`·`Cutout`·`Open Back`) 제거 — **RETIRED/HISTORICAL provenance로 보존**, historical amendment 원문 무삭제. **(SV-4)** legacy malformed 96건 **rewrite/migration/auto-clean 금지 · 소급 적용 없음**. **(SV-5) `ABSENT` applicability enforcement는 본 amendment 범위 밖**(future question). **Blast radius 실측: 현재 Producer-36 artifact 재검증 결과 새 invalid = 0.** **canonical parameter 36 유지 · vocabulary/applicability fingerprint 불변 · rules/controller/prompt 0 변경 · Colour V1/D-4/canonicalization/FINALPIPE 0 변경 · CA#22·CA#23 보존 · engine SHA `225252b1afa8d75b`.** 근거 = `STMX_STATE_VALUE_VALIDATOR_INVARIANT_FORENSIC_AUDIT_V1.md` · 정본 = `STMX_GLOBAL_STATE_VALUE_ENFORCEMENT_AND_REF008_CLOSURE_V1.md`.
> **🛠 Controlled Amendment #23 (2026-08-19 · ADR-126 CA#23 · FROZEN V1 유지 · CEO approved · Pocket Morphology Readability Semantics + SoT Restoration):** **semantic clarification + documentation restoration only — 새 parameter 0 · 새 vocabulary 0 · applicability semantic 변경 0 · multiplicity 변경 0 · state 신설 0.** **(P-1)** `pocket = Present`로 `pocket_construction`/`pocket_projection`이 applicable인데 morphology 판독 불가 시 **key omission 금지** — 필요한 evidence가 가려짐/occluded/crop 밖이면 **`NOT_VISIBLE`**, region은 보이나 canonical value를 신뢰성 있게 결정 불가면 **`UNKNOWN`**, readable이면 **`OBSERVED` + canonical value 필수**. ⛔ generic escape-hatch("확신 없으면 UNKNOWN") 금지 — `UNKNOWN`은 관측 조건에 묶이며 난이도 회피 수단이 아니다. **(P-8)** trigger 두 절의 소유자 분리 명문화 — `pocket === Present` = **controller deterministic gate**, `morphology visually readable` = **Vision observation-state decision(controller 미평가·미추론)**; `conditional_na`(parent 미충족 → applicable 아님) ≠ `NOT_VISIBLE`/`UNKNOWN`(applicable이나 값 확정 불가). **(P-6 · SoT-1)** field-def row 24/25 및 applicability matrix row의 pre-CA#12 whitelist(`Trouser·Skirt·Jacket·Coat`)를 **ALL 10 categories · Universal-Conditional**로 sync — **documentation correction only · CA#12는 2026-08-14 이미 승인·구현 · runtime applicability 변경 0.** **(P-7 · SoT-2)** Frozen Vocabulary Master에 누락되어 있던 `Volumetric`(CA#6 2026-08-11 승인 기존 canonical value) **문서 복원 — 신규 vocabulary 추가 아님.** CA#6 guards 전량 보존(flap≠Volumetric · Applied≠자동 Projected/Volumetric · Cargo 이름으로 정의 금지 · 독립 3-D depth 미가시 시 Volumetric 강요 금지 · numeric threshold 0). **(P-5)** REF_000010 morphology GT eligibility는 overlay에 분리 기록(historical GT 보존 · 새 GT schema 0). ⛔ **미포함:** P-2 multi-pocket information preservation · P-3 pocket count · P-4 kangaroo/seam-formed pouch vocabulary — 전부 **미해결 유지**. **canonical parameter 36 유지 · vocabulary token 0 변경 · applicability class 0 변경 · controller/validator 0 변경 · D-4/Colour V1/canonicalization/FINALPIPE 0 변경 · CA#22 Jacket Length 보존 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_POCKET_MORPHOLOGY_P1_CONTROLLED_CORRECTION_AND_VALIDATION_V1.md` · 근거 = `STMX_POCKET_MORPHOLOGY_FORENSIC_AUDIT_V1.md`.
> **🛠 Controlled Amendment #22 (2026-08-19 · ADR-126 CA#22 · FROZEN V1 유지 · CEO approved · Jacket Length Semantic Boundary + Length Readability Gate):** **semantic definition 신설 only — value-domain 확장/축소 0.** Jacket Length(`Cropped/Waist Length/Hip Length`) 토큰 불변 · Coat CA#13(`Thigh Length`) 권위 보존 · TOP/Trouser/Skirt/Dress/Jumpsuit 불변. **Waist Zone = 착용자 허리 기준면 ±약 10 cm의 body-relative zone**(단일 해부학적 선 아님 — 인체 비율·rise·포즈 편차 때문). `Cropped`=밑단이 zone보다 명확히 위 · `Waist Length`=밑단이 zone 내 · `Hip Length`=밑단이 zone을 명확히 지나 hip/pocket-coverage zone. **Waist↔Hip 실무 1차 판별자 = pocket coverage**(Waist=하의 앞주머니 상당 노출 · Hip=해당 영역 유의미 덮음). **Sleeve↔body hem 관계 = 2차 보강 전용**(자동 규칙 금지). ⛔ **construction feature(rib/elastic/waistband/drawstring/bomber archetype)를 Length proxy로 사용 금지**(CA#20 G3-B 실패 근거 · G3-B는 CA#21 revert 상태 유지). ⛔ `Hip Length` catch-all 금지 — thigh/knee 방향 진행 시 category routing 확인 후 `LENGTH CATEGORY/VOCABULARY EDGE CASE` 보고. **Length Readability Gate(전 category):** body-relative 근거 있을 때만 canonical value; **새 state 신설 0 · state 재정의 0** — Case A(밑단 프레임 밖/가림)=`NOT_VISIBLE` · Case B(밑단 보이나 body-relative 판정 불가)=`UNKNOWN` · Case C(flat lay/행거/신체 없음)=`NOT_VISIBLE`; ⛔ 도피처 사용 금지. **canonical parameter 36 유지 · vocabulary token 0 변경 · applicability class 0 변경 · validator/controller 0 변경 · Colour/D-4/canonicalization/FINALPIPE 0 변경 · SR/TC/DM/EI/Engine 0 · engine SHA `225252b1afa8d75b`.** 근거 = `STMX_PRODUCER36_LENGTH_CURRENT_STATE_FORENSIC_AUDIT_V1.md`(Jacket Waist/Hip canonical 정의 부재 확인). 정본 = `STMX_JACKET_LENGTH_CANONICAL_BOUNDARY_AND_READABILITY_IMPLEMENTATION_V1.md`.
> **🛠 Controlled Amendment #14 (2026-08-14 · ADR-126 CA#14 · FROZEN V1 유지 · CEO approved · TG-2 `Scoop` Neckline Shape Value):** **`neckline_shape` value-domain expansion** — `Round / V / Square / Straight / Mock / Turtleneck / Funnel`(7) → **`Round / V / Square / Straight / Scoop / Mock / Turtleneck / Funnel`(8)**. **`Scoop` semantics = deeper·broader rounded/U opening descending onto the upper chest** (distinct from the shallow neck-hugging `Round`) — **shape only**; depth remains `neckline_position`(High/Regular/Low, 불변). No `Deep Scoop`/`Low Scoop`/`Wide Scoop`/`U`/`U Neck`/`Scoop Neck` — canonical output token = exactly `Scoop`. **value-domain expansion only** — 새 parameter/region/state/applicability/multiplicity 0 · **canonical parameter 40 유지** · `neckline_shape` applicability 불변 · SR/TC/DM/EI/Engine 0 · engine code 0 · engine SHA `225252b1afa8d75b`. **GT auto-migration 0**(GT에 Scoop case 부재 · Batch A는 GT 밖). Producer `VALUE_DOMAINS.neckline_shape` + prompt Round↔Scoop discrimination note wired(prompt는 domain을 dynamic 렌더). Historical output(Run-1..4·Batch A raw) immutable(A-14 raw `neckline_shape=V` 불변). 정본 = `STMX_VISION_P2_TG2_SCOOP_NECKLINE_CONTROLLED_IMPLEMENTATION_REPORT_V1.md` · Review `STMX_VISION_P2_U_SCOOP_NECKLINE_TOKEN_DECISION_REVIEW_V1.md`.
> **🛠 Controlled Amendment #13 (2026-08-14 · ADR-126 CA#13 · FROZEN V1 유지 · CEO approved · AR-3 Coat Intermediate Length Token):** **Coat Length value-domain expansion** — `Hip Length / Knee Length / Maxi Length` → **`Hip Length / Thigh Length / Knee Length / Maxi Length`**. **`Thigh Length` semantics = hem clearly below `Hip Length` and clearly above `Knee Length`** (thigh zone; **band, NOT an exact mid-thigh midpoint**). **Coat only** — Jacket Length(`Cropped/Waist Length/Hip Length`) 불변 · Skirt/Dress/Trouser/Jumpsuit/TOP 불변(다른 Length system). AR-3 Design Review가 A-08(trench1)이 firsthand로 Hip과 Knee 사이 thigh-zone임을 확정 → Producer `Hip Length` under-read·manifest `Knee` over-read = genuine vocabulary gap. `Mid-Thigh Length`(over-precise · naming convention 위배)보다 `Thigh Length` 채택. **value-domain expansion only** — 새 observation parameter/region/state/applicability 0 · **canonical parameter 40 유지** · `length` applicability(Coat=M) 불변 · region 불변 · SR/TC/DM/EI/Engine 0 · engine code 0 · engine SHA `225252b1afa8d75b`. **GT auto-migration 0**(기존 thigh-length GT case 부재). Producer `lengthDomain('Coat')` + prompt Coat length landmark note wired. Historical output(Run-1..4·Batch A raw) immutable. 정본 = `STMX_VISION_P2_AR3_THIGH_LENGTH_CONTROLLED_IMPLEMENTATION_REPORT_V1.md` · Design Review `STMX_VISION_P2_BATCH_A_AR3_COAT_INTERMEDIATE_LENGTH_DESIGN_REVIEW_V1.md`.
> **🛠 Controlled Amendment #12 (2026-08-14 · ADR-126 CA#12 · FROZEN V1 유지 · CEO approved · D2/AR-2 Pocket Morphology Universal-Conditional):** `pocket_construction`·`pocket_projection` = **ALL 10 categories** (Conditional ← `pocket=Present` ∧ morphology 가시 · unreadable → invent 금지 · absent → gated off). CA#4/CA#7의 Jacket/Coat/Trouser/Skirt whitelist를 supersede(전 category로 확장). Domain 불변(`Inset/Applied` · `Flat/Projected/Volumetric`). Orthogonality 불변(validator `POCKET_GATE` 유지 · Applied→Volumetric 자동 금지 · flap≠Applied). 10×40 reconcile: **T-Shirt 25→27 · Shirt 26→28 · Sweater 25→27 · Sweatshirt 24→26 · Dress 32→34 · Jumpsuit 31→33**(각 C+2·N−2) · Jacket/Coat/Trouser/Skirt 불변 · 전 category U+M+C+N=40. **canonical parameter 40 유지 · 새 parameter/value/enum/category 0 · SR/TC/DM/EI/Engine/Look-Level 0 · code = producer_rules_v1(CONDITIONAL)·producer_controller_v1만 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_VISION_P2_BATCH_A_CEO_DECISION_IMPLEMENTATION_REPORT_V1.md`.
> **🛠 Controlled Amendment #11 (2026-08-14 · ADR-126 CA#11 · FROZEN V1 유지 · CEO approved · D1/AR-1 Polo Neckline Construction-Suppression):** construction-triggered — **static applicability cell 변경 아님**. `neckline_shape`·`neckline_position` static class는 T-Shirt/Shirt/Sweater/Sweatshirt/Dress/Jumpsuit에서 **M 유지**. 런타임 **Polo construction**(collar OBSERVED `Shirt` ∧ front_opening_extent OBSERVED `Partial` ∧ front_opening_type OBSERVED `Button`/`Snap Button`)이면 neckline_shape·neckline_position이 redundant → **해당 instance 한정 governed N/A**(controller key-omit · untriggered Conditional과 동일)로 처리 · 적용 family = TOP 4(T-Shirt/Shirt/Sweater/Sweatshirt). Crew/V/Stand/Mock/Turtleneck 및 full-placket shirt(extent=Full)는 미억제(neckline 유지). Observation↔Governance 분리 원칙에 따라 **prompt 무변경**(applicability는 controller authority). **canonical parameter 40 유지 · matrix cell 변경 0 · 새 parameter/value 0 · SR/TC/DM/EI/Engine 0 · code = producer_rules_v1(CONSTRUCTION_SUPPRESSION)·producer_controller_v1만 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_VISION_P2_BATCH_A_CEO_DECISION_IMPLEMENTATION_REPORT_V1.md`.
> **🛠 Controlled Amendment #10 (2026-08-13 · Calf/Ankle Final Length Token Reconciliation · FROZEN V1 유지 · CEO approved · terminology reconciliation · no new ADR):** CA#9가 남긴 유일 Length authority conflict(Vocab Master `Calf Length`/`Ankle Length` ↔ Schema/Producer bare `Calf`/`Ankle`) 종결. **CEO DECISION LOCKED:** Trouser/Jumpsuit-Lower canonical Length = `Short / Knee Length / Calf Length / Ankle Length / Full Length / Extended Length` — 즉 `Calf`→`Calf Length` · `Ankle`→`Ankle Length`. **방향 = Frozen Vocab Master(이미 `Calf Length`/`Ankle Length` Frozen) → Schema/Producer 정렬**(Frozen Master를 bare로 역수정하지 않음). **새 vocabulary/length stage 0**(Frozen Master 기존 canonical token으로 reconciliation). **Semantic change 0**(이미지 재판독 0·GT semantic answer 0·GT bare Calf/Ankle = 0 → GT 변경 0). Parameter-aware only(다른 parameter/prose의 유사 문자열 불수정). CA#9 header(및 이전 CA 전부) 원문 보존 — 본 CA#10이 Calf/Ankle 부분을 supersede. **canonical parameter 40 유지 · applicability/region/state 불변 · SR/TC/DM/EI/Engine/Look-Level 0 · engine code 0 · engine SHA `225252b1afa8d75b`.** **Remaining active Length authority conflict = 0.** 정본 = `STMX_VISION_P2_CALF_ANKLE_CANONICAL_TOKEN_RECONCILIATION_REPORT_V1.md`. **Run-3 미실행.**
> **🛠 Controlled Amendment #9 (2026-08-13 · Final Length Domain Closure + Outerwear Producer Wiring · FROZEN V1 유지 · CEO approved · terminology + existing domain wiring · no new ADR):** CA#8이 남긴 3 Length gap 종결(One Concept → One Canonical Token). **CEO LOCKED normalization(Length parameter 한정):** `Waist`→**`Waist Length`** · `Knee`→**`Knee Length`** · `Extended`→**`Extended Length`** · (기존 유지: `Hip Length`·`Maxi Length`·`Full Length`·`Cropped`·`Regular`·`Long`·`Short`·`Calf`·`Ankle`·`Mini`·`Midi`). **Category-specific canonical Length domain(Frozen Vocab Master §7 준거·semantic 불변):** TOP `Cropped/Regular/Long` · **Jacket `Cropped/Waist Length/Hip Length`** · **Coat `Hip Length/Knee Length/Maxi Length`** · Trouser·Jumpsuit-Lower `Short/Knee Length/Calf/Ankle/Full Length/Extended Length` · Skirt·Dress `Mini/Midi/Maxi Length`. **Producer Jacket/Coat = generic `Cropped/Regular/Long`에서 category-specific domain으로 실제 wiring**(validator가 이제 Jacket/Coat length를 category별 canonical로 강제). **Parameter-aware only:** 다른 parameter의 동일 문자열(`waist_definition`·`shoulder_span` `Extended`·`front_opening_extent` `Full`) 불수정. **Semantic change 0**(새 length 단계/parameter/category/region/applicability 0 · 이미지 재판독 0 · GT semantic answer 0). GT stale Length token = 0(이미 canonical). **★ 미해결(CEO 대기·임의결정 0):** Frozen Vocab Master §5/§6/§7이 Trouser/Jumpsuit에 `Calf Length`/`Ankle Length` 표기 → CEO의 bare `Calf`/`Ankle` 결정과 상충(reconciliation 필요·본 sprint 미변경). **canonical parameter 40 유지 · SR/TC/DM/EI/Engine/Look-Level 0 · engine code 0 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_VISION_P2_FINAL_LENGTH_DOMAIN_CLOSURE_REPORT_V1.md`. **Run-3 미실행.**
> **🛠 Controlled Amendment #8 (2026-08-13 · Length Canonical Token Normalization · FROZEN V1 유지 · CEO approved · terminology consistency only · no new ADR):** 동일 length 개념의 복수 spelling을 정규화(One Concept → One Canonical Token) — **`Maxi` → `Maxi Length` · `Full` → `Full Length` · `Knee Length` 유지**. **Semantic change 0**(새 length 단계/parameter/category/observation concept 0 · 이미지 재판독 0 · GT semantic answer 변경 0 · token spelling 정규화만). Active SoT(Length row #5 · field-def Dress · Trouser/Skirt/Jumpsuit)만 수정 · historical/handoff 문서 소급 rewrite 0(보존). Producer `producer_rules_v1` length domain(Skirt/Dress `Maxi`→`Maxi Length` · Trouser/Jumpsuit `Full`→`Full Length`) 및 `gt_v10.json` stale token 4건(Case-06 Dress·08 Skirt·10 Coat `Maxi`→`Maxi Length` · 07 Jumpsuit `Full`→`Full Length`) 정규화 → validator가 이제 canonical 강제(stale `Maxi`/`Full` flag). **미결정(CEO 대기·임의결정 0):** Jacket/Coat category-specific length domain wiring(Waist/Hip Length token) · Trouser `Knee` vs Coat `Knee Length` cross-category naming · `Extended` vs `Extended Length` doc 표기 불일치. **canonical parameter 40 유지 · SR/TC/DM/EI/Engine/Look-Level 0 · engine code 0 · engine SHA `225252b1afa8d75b`.** 정본 = `STMX_VISION_P2_LENGTH_CANONICAL_TOKEN_STANDARDIZATION_REPORT_V1.md`. **Run-3 미실행.**
> **🛠 Controlled Amendment #7 (2026-08-12 · ADR-126 CA#7 · FROZEN V1 유지 · CEO approved · Outerwear Pocket Morphology Applicability Expansion):** CA#6가 보고만 하고 미해결로 남긴 **Outerwear Pocket Morphology Applicability Gap** 해소. **Applicability-only 확장**(Pocket architecture/parameter/value 재설계 0). **`pocket_construction`·`pocket_projection` = +Jacket·+Coat**(Conditional ← pocket=Present ∧ morphology 가시 · 기존 primitive의 category 적용범위만 확장). 정본 canonical Outerwear = **Jacket·Coat 2종**(Vest는 canonical Vision category 아님 → 제외 · SoT firsthand 확인 · category 신설 0). Domain 불변: `pocket_construction=Inset/Applied` · `pocket_projection=Flat/Projected/Volumetric`(CA#6). Orthogonality 유지: Inset+Flat/Applied+Flat/Applied+Projected/Applied+Volumetric 등 유효 · **Applied→Volumetric 자동규칙 금지** · flap presence/pocket size/count/prominence ⊥ Projection(물리 construction·depth로만 판정). **Case-10 srcoat1 = pocket=Present · pocket_construction=Inset · pocket_projection=Flat**(welt/jetted set-in hip pocket flush · firsthand) → **Outerwear applicability gap RESOLVED**. P1 Outerwear 재조정: Case-02 srsuit1 Present·**Inset**·Flat(**★CA#7 Case-02 calibration correction · CEO Decision 2026-08-12:** 최초 CA#7 'Applied(patch)' 판독 SUPERSEDED — conventional tailored flap pocket(body가 jacket에 integrated·surface flush·flap이 opening 덮고 tuck 가능·external patch/3-D volume 없음) → **Inset·Flat**. Flap ≠ Applied·Flap ≠ Projection. presence/projection 불변·contradiction flag CLOSED·Review Book V9) · Case-04 srcoat2 Present·Inset·Flat(flap-over-jetted flush) · Case-09 cropjkovshoulder1 pocket **UNKNOWN 유지**(presence gate 미충족 → construction/projection 미해결 · invent 금지) · Case-12 zegnaivsuit1 pocket **UNKNOWN 유지**(invent 금지). **canonical top-level parameter count = 40 유지** · 새 parameter/value/enum/category 0 · Pocket-Flap 미추가 · Cargo canonical value 아님 · Volumetric = CA#6 기존값 불변 · multiplicity architecture 불변 · SR/TC/DM/EI/Engine/Producer/P2/Batch3/Look-Level = 0 · code 0 · engine SHA `225252b1afa8d75b`. 10×40 reconcile: **Jacket·Coat Applicable 24→26**(C 1→3 · N 16→14) · 나머지 8 category 불변 · 전 category U+M+C+N=40. 정본 = `STMX_VISION_P1_OUTERWEAR_POCKET_MORPHOLOGY_EXPANSION_REPORT_V1.md` · Review Book **V8**. CA#6 Outerwear applicability gap = **RESOLVED**(historical 보존).
> **🛠 Controlled Amendment #6 (2026-08-11 · ADR-126 CA#6 · FROZEN V1 유지 · CEO approved · Pocket 3D Morphology / CA#5 Closure):** CA#5 잔여 pending(Pocket-Flap) 해소. **구 `pocket_flap = None/Present` 제안 CANCELLED**(CEO 방향: 관측 대상은 flap 유무가 아니라 pocket body의 3-D projection). **`pocket_projection` value domain 확장: `Flat/Projected` → `Flat/Projected/Volumetric`**(1 value 추가 · 새 top-level parameter 0 · Cargo/Bellows/Box/3D-Pocket = canonical value 신설 0, descriptive evidence만). Boundary: **Flap ≠ Volumetric · Applied ≠ 자동 Volumetric · Construction⊥Projection · Multiplicity 별개 · 측면 volume 미가시 → Volumetric 강요 금지**. Case-08 skirt cargo pockets = **Volumetric**(firsthand 확인 · initial anchor). Case-10 coat = flap/welt pocket **flush(body Flat)** but **Outerwear는 pocket_construction/projection 미적용(CA#4)** → morphology 표현 불가 = **applicability gap 보고만**(auto-broaden 0). **canonical top-level parameter count = 40 유지** · state/multiplicity/Region/Universal-10/fabric-behavior 불변 · SR/TC/DM/EI/Engine/Producer/P2/Batch3 = 0 · code 0 · engine SHA `225252b1afa8d75b`. 정본 = `STMX_VISION_P1_POCKET_3D_MORPHOLOGY_REPORT_V1.md` · Review Book **V7**. CA#5 Pocket-Flap 제안 = **SUPERSEDED**(historical 보존).
> **🛠 Controlled Amendment #5 (2026-08-11 · ADR-126 CA#5 · FROZEN V1 유지 · CEO approved · CA#4 Post-Review Correction + Architecture Implementation):** CA#4 유지. (A) **Doc-state 교정:** Case-06 `fabric_behavior=Fluid(WHOLE)` 모순 제거 · Case-08 premature `Other` 모순 제거. (B) **CEO 승인 architecture 구현:** (1) **`fabric_behavior` Dress/Jumpsuit = UPPER+LOWER regional**(동일 canonical parameter · Fit Upper/Lower 선례 · 값 동일해도 collapse 금지 · 그 외 WHOLE). (2) **`attachment` +`Other`**(evidence-preservation escape-hatch · `evidence.descriptor` · DR-7 · 특정 enum 승격 0). (3) **`material` +`Other`**(descriptor · unverifiable fiber 주장 0 · Linen/Mohair canonical 신설 0). (4) **Multiplicity metadata**(MULTI-4+pocket evidence child: `count`(discrete)/`density`(distributed) · technical metadata · 새 top-level parameter 0). (5) **Case-07 shoulder Mild↔Strong = calibration anchor 명료화**(enum None/Mild/Strong/Extreme 불변 · 새 value/threshold 0). (C) **Pocket Flap = audit-first**(현 pocket vocabulary에 flap representation 없음 = Outcome C · 최소 확장 제안만 · **구현/freeze 0 · CEO review 대기**). **canonical top-level parameter count = 40 유지**(값역에 generic `Other` 2건 추가 = CEO-approved controlled vocabulary amendment · 특정 enum proliferation 0 · multiplicity/regional = metadata/region-placement). SR/TC/DM/EI/Engine/Producer/P2/Batch3 = 0 · code 0 · engine SHA `225252b1afa8d75b`. 정본 = `STMX_VISION_P1_CA4_POSTREVIEW_CORRECTION_REPORT_V1.md` · Review Book **V6**.
> **🛠 Controlled Amendment #4 (2026-08-11 · ADR-126 CA#4 · FROZEN V1 유지 · CEO approved · P1 12-Case Calibration Consolidation):** 12-Case CEO calibration 결과 반영 — (1) **`silhouette` = N/A for Outerwear**(Jacket/Coat; generic Slim/Regular/Relaxed/Oversized = Fit 중복 · Outerwear form은 Fit/Shoulder Structure/Waist/Length/Fabric Behavior로 관측) · silhouette 유지 = Trouser/Skirt/Dress/Jumpsuit. (2) **`shoulder_connection`·`shoulder_span` = Conditional**(applicable set T-Shirt/Shirt/Sweater/Dress/Jumpsuit · trigger = 의미있는 non-standard connection/span 가시 · 일반 sleeved garment → 해당 instance N/A · `Standard`/`Regular` 강제 출력 금지 · `shoulder_drop` 별개 유지). (3) **`pocket_construction`·`pocket_projection` = +Skirt**(Conditional ← pocket=Present · 기존 primitive 확장 · 새 value 0). **canonical parameter 40 유지(삭제 0·applicability/operational-class만) · value domain·state·multiplicity·Region·Universal 10·fabric_behavior ALL 10 불변 · 새 vocabulary/value 0.** Target Selection: Case-04 trouser·Case-05 jeans·Case-08 upper = INCIDENTAL(C2+C3 미충족). **미결정(implement 금지·CEO Decision 대기):** Multiplicity 표현·Attachment Other·Dress/Jumpsuit Fabric Behavior regionalization·Pocket Flap morphology·Material vocabulary coverage·Case-07 Mild↔Strong boundary. SR/TC/DM/EI/Engine/Producer/P2/Batch3 = 0 · code 0 · engine SHA `225252b1afa8d75b`. 10×40 reconcile 40/40. 정본 = `STMX_VISION_P1_12CASE_CONSOLIDATION_REPORT_V1.md` · Review Book **V5**.
> **🛠 Controlled Amendment #3 (2026-08-11 · ADR-126 CA#3 · FROZEN V1 유지 · CEO approved · P1 Case-01 Calibration Applicability Reconciliation):** P1 Case-01(hoodie1) CEO calibration에서 확인된 applicability 오류 교정 — (1) **`silhouette` = N/A for TOP 4**(T-Shirt/Shirt/Sweater/Sweatshirt) — Upper에서 Silhouette↔Fit이 동일 body-ease를 이중 관측 → Upper body-relation은 **`fit`** 하나가 담당(Silhouette parameter 삭제 아님·Bottom/Dress/Jumpsuit/Outerwear silhouette 불변, 각자 후속 calibration) · (2) **Sweatshirt `shoulder_connection` = N/A · `shoulder_span` = N/A**(Sweatshirt 한정 · `shoulder_drop` applicable 유지 · `shoulder_structure` N/A 유지 · 다른 category 자동 확대 0). **40 canonical parameter·value domain·state·multiplicity·Region 불변 · 새 Vocabulary/value 0 · parameter 삭제 0(applicability만) · Lower Fit 불변(audit-only) · SR/DM/EI/Engine 0 · code 0 · engine SHA `225252b1afa8d75b`.** 10×40 all reconcile 40/40. 정본 = `STMX_VISION_P1_CASE01_CALIBRATION_CORRECTION_REPORT_V1.md`.
> **🛠 Controlled Amendment #2 (2026-08-11 · ADR-126 · FROZEN V1 유지 · CEO approved):** Category-Level Observation **Applicability expansion** (evidence 관측 누락 방지) — (1) **`fabric_behavior` = ALL 10 categories**(구 Bottom/Outerwear/Dress → TOP·Jumpsuit 추가 · §D row + Frozen Scope #5 annotation) · (2) **`asymmetry` = ALL 10 categories**(구 Shirt/Dress/Skirt/Knit/Outerwear → Universal Scan layer 편입) · (3) **`french_cuff` = Conditional Branch**(trigger: Shirt ∧ cuff observable · applicability = Shirt 불변) · (4) **Model C Staged Applicability** = operational observation flow 채택 · (5) Sweater checklist completeness 복원. **40 canonical parameter·value domain(Structured/Semi-Structured/Semi-Fluid/Fluid · None/Present 불변)·state·multiplicity·Region 불변 · 새 Vocabulary 0 · Vision observation only(SR/DM/EI consumption 불변 · Bodycon+Fluid deferred SR-CB) · engine SHA `225252b1afa8d75b` IDENTICAL · code 0.** 정본 Governance = `STMX_VISION_APPLICABILITY_AMENDMENT_AND_GOVERNANCE_REPORT_V1.md`(F6) · Final Architecture = `STMX_VISION_EXTRACTION_APPLICABILITY_FINAL_ARCHITECTURE_V1.md`(F1) · Matrix = `STMX_VISION_10X40_FINAL_APPLICABILITY_MATRIX_V1.md`(F4).
> **★ Pre-Freeze Controlled Correction #1 (2026-08-08):** (1) Observation State = **4-state** `OBSERVED/ABSENT/NOT_VISIBLE/UNKNOWN`(feature 부재=ABSENT 신설·구 Surface `"None"` 오류 제거) · (2) Multiplicity MULTI = **Material·Surface·Decorative Detail·Attachment** · (3) Applicability 교정(Shoulder: TOP=Connection/Span/Drop·Outerwear=Structure only · Fabric Behavior: Jumpsuit 제외) · (4) 163 reconciliation direct→evidence 안전 재분류(별도 Ledger). **40 canonical parameter·Frozen value domain 불변.**
> **★ Pre-Freeze Controlled Correction #2 (2026-08-08 · Final):** (A) MULTI 4개 **per-value evidence association**(§B5.1 · value↔evidence self-describing·deterministic) · (B) **Category UNKNOWN Applicability Routing**(§B3.1 `applicability_status=RESOLVED|UNRESOLVED_CATEGORY` · NOT APPLICABLE≠APPLICABILITY UNRESOLVED≠NOT_VISIBLE≠UNKNOWN 4-way 분리) · (C) stale wording 정정(Principle #6 4-state·Hard Requirement 17/17). **canonical parameter count 40 불변·새 Vocabulary 0·Frozen domain 불변.**
> **Source of Truth (semantic):** `STMX_VISION_GARMENT_OBSERVATION_CONTRACT_CANDIDATE_V1.md` (APPROVED · ADR-119) → `STMX_GARMENT_VOCABULARY_FROZEN_MASTER_V1.md` (FROZEN + ADR-118).
> **출발점 = Approved 40 Canonical Observation Parameters.** Production 119/163-field·Unified Vision Pilot = migration evidence only (semantic source 아님).
> Engine SHA `225252b1afa8d75b` 불변 · Frozen Vocabulary 변경 0 · Production prompt 변경 0.

---

## C1. Schema Principles

1. **Contract-led** — Schema는 Approved Observation Contract(40 parameter)를 machine-readable structure로 정확히 투영한다. 기존 Production schema를 조금씩 고친 결과가 아니다.
2. **Frozen Vocabulary protected** — value domain은 Frozen Vocabulary 그대로. Schema 편의로 domain을 늘리거나 줄이지 않는다.
3. **image → facts only** — Vision은 observable garment fact만 반환. score/tier/departure/interpretation encode 금지.
4. **Deterministic output structure** — 모든 parameter가 동일한 observation wrapper를 사용. parser가 모호성 없이 읽는다.
5. **Explicit applicability** — garment에 적용되지 않는 parameter는 **key 자체를 emit하지 않는다**(N/A value 생성 금지).
6. **Explicit visibility** — `OBSERVED / ABSENT / NOT_VISIBLE / UNKNOWN` 4-state + semantic `None` value를 구조적으로 분리(semantic None ≠ ABSENT ≠ NOT_VISIBLE ≠ UNKNOWN).
7. **No inference beyond Contract** — hidden construction·fiber·product name·wrap 추론 금지.
8. **No scoring leakage** — TC 3-Departure judgement·SR tier·DM score·EI expressive 판정은 canonical Garment schema에 넣지 않는다(별도 axis).
9. **Metadata ≠ canonical parameter** — confidence·evidence·evidence_location·capture info는 control/technical structure이며 41번째 parameter로 계산하지 않는다.

---

## PHASE A — Canonical Parameter Inventory (40 · DR-6 Lock)  ⟶ **HISTORICAL (Frozen-40 provenance) · SUPERSEDED by Amendment #15 (35)**

> ⚠ **이 40-parameter 표는 historical baseline이다. Active canonical inventory = Amendment #15의 35-param 표(위).** `#20 front_opening_type`·`#22 closure_arrangement`·`#31 transparency`·`#33 front_overlap`·`#34 cutout`·`#35 open_back` = **RETIRED**; `#21 closure_type` = 7-value 통합; `#28 surface` = 11; `exposure_opening` = new MULTI. 아래는 그대로 보존(chronology).
> Contract §5 본문 직접 전수. Observation Class: **O1** Direct Visual · **O2** Derived Visual · **O3** Vision Garment Classification. Multiplicity: **single** / **multi**. Region: WHOLE_GARMENT / UPPER / LOWER (category-dependent = ⓒ).

| # | Canonical Parameter | Class | Applicability | Value Domain (Frozen) | Mult. | Primary Region |
|---|---|---|---|---|---|---|
| 1 | Category | O3 | ALL | T-Shirt/Shirt/Sweater/Sweatshirt/Jacket/Coat/Trouser/Skirt/Dress/Jumpsuit (10) | single | WHOLE |
| 2 | Trouser Distinction | O3 | Trouser | Tailored/Casual/Sport/Jeans/Leggings | single | WHOLE (ev. Lower) |
| 3 | Silhouette | O2 | 각 garment | garment별 set (Trouser Skinny/Slim/Straight/Wide/Oversized · Skirt Slim/Straight/Flared/Wide/Voluminous · Outerwear Fitted/Regular/Relaxed/Oversized · TOP Slim/Regular/Relaxed/Oversized) | single | WHOLE |
| 4 | Fit | O2 | 각 garment | Slim/Regular/Relaxed/Oversized (+Skirt/Dress-Lower Voluminous) | single | UPPER+LOWER split |
| 5 | Length | O1 | 각 garment | Upper Cropped/Regular/Long · Jacket Cropped/Waist Length/Hip Length (★CA#22 semantic boundary: Waist Zone = 허리 기준면 ±약 10 cm zone · Cropped=zone 위 · Waist=zone 내 · Hip=zone 아래 hip/pocket-coverage) · Coat Hip Length/**Thigh Length**/Knee Length/Maxi Length (★CA#13) · Trouser·Jumpsuit-Lower Short/Knee Length/Calf Length/Ankle Length/Full Length/Extended Length · Skirt·Dress Mini/Midi/Maxi Length | single | ⓒ (ev. Hem) |
| 6 | Fabric Behavior | O2 | Bottom/Outerwear/Dress (**Jumpsuit 제외**) | Structured/Semi-Structured/Semi-Fluid/Fluid | single | WHOLE |
| 7 | Waist Definition | O2 | Outerwear/Dress/Jumpsuit | Undefined/Defined/Cinched | single | WHOLE (ev. Waist) |
| 8 | Sleeve | O1 | Upper·Dress/Jumpsuit | Sleeveless/Short/Mid/Long | single | UPPER (ev. Sleeve) |
| 9 | Shoulder Connection | O1 | **TOP·Dress/Jumpsuit** (Outerwear 제외) | Standard/Strap/Strapless/Halter/One Shoulder | single | UPPER (ev. Shoulder/Neck) |
| 10 | Shoulder Span | O2 | **TOP·Dress/Jumpsuit** (Outerwear 제외) | Narrow/Regular/Extended | single | UPPER (ev. Shoulder) |
| 11 | Shoulder Drop | O1 | **TOP·Dress/Jumpsuit** (Outerwear 제외) | None/Dropped | single | UPPER (ev. Shoulder) |
| 12 | Shoulder Structure | O2 | **Outerwear·Dress·Jumpsuit** (TOP 제외) | None/Mild/Strong/Extreme | single | UPPER (ev. Shoulder) |
| 13 | Neckline Shape | O1 | Upper·Dress/Jumpsuit | Round/V/Square/Straight/**Scoop**/Mock/Turtleneck/Funnel (★CA#14) | single | UPPER (ev. Neck) |
| 14 | Neckline Position | O1 | Upper·Dress/Jumpsuit | High/Regular/Low | single | UPPER (ev. Neck) |
| 15 | Collar | O1 | Upper·Outerwear·Dress/Jumpsuit | Library 8: None/Shirt/Stand/Sailor/Peter Pan/Tie/Ruffle/Shawl (+Outerwear Lapel Type Notched/Peak/Shawl) | single | UPPER (ev. Neck) |
| 16 | Rib Cuff | O1 | Upper garments | None/Present | single | UPPER (ev. Sleeve end) |
| 17 | Rib Hem | O1 | Upper garments | None/Present | single | UPPER (ev. Hem) |
| 18 | Hood | O1 | Sweatshirt/Outerwear | Present (유무 관측) | single | UPPER (ev. Neck/Back) |
| 19 | Front Opening Extent | O1 | TOP·Dress/Jumpsuit | None/Partial/Full (T-shirt None/Partial) | single | UPPER (ev. Front) |
| 20 | Front Opening Type | O1 | TOP·Dress/Jumpsuit | Button/Snap Button/Zipper/Open | single | UPPER (ev. Front) |
| 21 | Closure Type | O1 | Outerwear | Button/Snap Button/Zipper/Hook Closure | single | UPPER (ev. Front) |
| 22 | Closure Arrangement | O1 | Outerwear | Single Breasted/Double Breasted | single | UPPER (ev. Front) |
| 23 | Pocket | O1 | 다수 | None/Present | single | WHOLE |
| 24 | Pocket Construction | O1 | **ALL 10**(Conditional ← pocket=Present ∧ readable · ★CA#12) | Inset/Applied | single | WHOLE |
| 25 | Pocket Projection | O1 | **ALL 10**(Conditional ← pocket=Present ∧ readable · ★CA#12) | Flat/Projected/**Volumetric**(★CA#6) | single | WHOLE |
| 26 | French Cuff | O1 | Shirt | None/Present | single | UPPER (ev. Sleeve end) |
| 27 | Material | O1 | ALL | Cotton/Wool/Leather/Suede/Knit/Denim/Synthetic/Silk/Velvet/Fur/Padding (11) | **multi** | WHOLE (ev. Region) |
| 28 | Surface | O1 | ALL | Pleated/Gathered/Quilted/Textured Knit/Lace/Mesh/Treated Surface/Reflective (8) | **multi** | WHOLE (ev. Region) |
| 29 | Pattern | O1 | ALL | Linear/Grid/Repeat | single | WHOLE (ev. Region) |
| 30 | Graphic | O1 | ALL | Localized/Dominant | single | WHOLE (ev. Region) |
| 31 | Transparency | O1 | ALL | None/Semi Sheer/Sheer | single | WHOLE (ev. Region) |
| 32 | Asymmetry | O1/O2 | Shirt/Dress/Skirt/Knit/Outerwear | None/Present | single | WHOLE |
| 33 | Front Overlap | O1 | Dress/Jumpsuit 등 | None/Present | single | WHOLE (ev. Front) |
| 34 | Cutout | O1 | Dress/Jumpsuit 등 | None/Present | single | WHOLE |
| 35 | Open Back | O1/O4 | Dress/Jumpsuit 등 | None/Present | single | WHOLE (ev. Back) |
| 36 | Slit | O1 | Dress/Skirt 등 | None/Present | single | LOWER (ev. Hem) |
| 37 | Ruffle | O1 | 다수 | None/Present | single | WHOLE (ev. Region) |
| 38 | Decorative Detail | O1 | ALL | Embroidery/Sequin-Beading/Appliqué | **multi** | WHOLE (ev. Region) |
| 39 | Attachment | O1 | ALL | Metal Hardware/Jewelry Attachment/Ribbon/Belt/Epaulette/Storm Flap/Fur Trim/Fringe/Feather (9) | **multi** | WHOLE (ev. Region) |
| 40 | Grammar | O3 | Outerwear (Coat/Jacket) | Tailored/Casual/Utility | single | WHOLE |

> **Inventory Lock = 40/40 확인.** Recognized Detail(Tiered/Overlay/Train/Cape-like/Peplum/Godet/High-Low Hem/Irregular Hem/Smocking/Pintuck) = **NON-PARAMETER**(canonical count 제외, descriptive reference only).
> **Multiplicity(Pre-Freeze Correction):** MULTI = `material`·`surface`·`decorative_detail`·`attachment`(동일 garment 내 독립 canonical value 동시 관측 가능 — §B5). 나머지 36 = single. **canonical value domain 불변**(vocabulary amendment 아님).

---

## B. Schema Design Principles

### B1. Semantic Parameter vs Technical Wrapper — Observation Wrapper Model
40개 parameter 전부 동일한 최소 wrapper를 사용한다:

```
"<schema_key>": {
  "value":      <canonical value | array(multi) | null>,             // semantic (Frozen domain)
  "state":      "OBSERVED" | "ABSENT" | "NOT_VISIBLE" | "UNKNOWN",   // technical observation state (4)
  "region":     "WHOLE_GARMENT" | "UPPER" | "LOWER",                 // canonical region
  "confidence": "high" | "medium" | "low",                           // technical metadata (optional)
  "evidence":   { "cue": "<concise visual cue>",                     // debugging (no reasoning)
                  "location": "<Shoulder|Neck|Waist|Sleeve|Hem|Front|Back>" }  // optional metadata
}
```

- **`value` + `state`는 semantic/visibility로 역할 분리**(B1). value는 Frozen domain에서만.
- `region`·`confidence`·`evidence`는 **control/technical metadata** — canonical parameter count에 포함하지 않는다(DR-5).

### B2. Observation State (4-state · technical observation semantics)
> **State는 technical observation semantics이며 Vocabulary canonical value와 혼합하지 않는다(DR-3).**

| Field 상태 | `state` | `value` | 의미 |
|---|---|---|---|
| Frozen value 안정 관측 | `OBSERVED` | 해당 canonical value | feature/value가 시각적으로 관측·식별됨 |
| Frozen `None` 값으로 관측 | `OBSERVED` | `"None"` (**semantic value**) | Frozen domain에 `None`이 실재하는 parameter만 |
| **feature 부재** | **`ABSENT`** | `null` | parameter applicable·region 충분히 가시·판단 가능·**해당 feature가 존재하지 않음** |
| region 미가시(crop/off-image/occlusion) | `NOT_VISIBLE` | `null` | 판단 필요 region이 image에 안 보임/occluded |
| region 가시하나 evidence 부족 | `UNKNOWN` | `null` | region은 보이나 canonical value 신뢰 결정 불가 |

> ⛔ **구조적 4-way 분리 강제(A3):** **semantic `None` ≠ `ABSENT` ≠ `NOT_VISIBLE` ≠ `UNKNOWN`.**
> - `None` = `state=OBSERVED`일 때의 **value**. **★ CURRENT Producer-36 기준 semantic `None` domain parameter = 정확히 11개** (★CA#24 2026-08-19 reconciliation · 코드 `VALUE_DOMAINS` 직접 대조): `shoulder_structure` · `shoulder_drop` · `collar` · `rib_cuff` · `rib_hem` · `french_cuff` · `front_opening_extent` · `pocket` · `asymmetry` · `slit` · `ruffle`. 그 외 parameter는 `"None"` value 불허.
>   - ⚠️ **RETIRED / HISTORICAL (현재 목록에서 제외 · provenance 보존):** `Transparency`(2026-08-15 폐기 → Surface optical value로 이관) · `Front Overlap`(2026-08-15 제거) · `Cutout`·`Open Back`(2026-08-15 `exposure_opening` MULTI로 통합). 이 4개는 **구 Frozen-40 시절 semantic `None` parameter였으며 현재 Producer-36에는 존재하지 않는다.** 위 CA#8~CA#15 historical amendment 기록은 원문 그대로 보존한다.
> - `ABSENT`·`NOT_VISIBLE`·`UNKNOWN` = **state**, `value=null` 강제.
>
> **★ B2-A · STATE/VALUE INVARIANT — VALIDATOR-ENFORCED (CEO Decision 2026-08-19 · ADR-126 CA#24)**
> 아래는 **새 규칙이 아니라 이미 canonical한 §B 계약을 명시적으로 완결**한 것이다. 새 state 0 · 새 parameter 0 · 새 vocabulary 0 · applicability 0 · MULTI membership 0.
>
> **SINGLE observation**
> ```text
> OBSERVED                          → value = legal canonical value  (REQUIRED)
> ABSENT / NOT_VISIBLE / UNKNOWN    → value = null                   (REQUIRED)
> ```
>
> **MULTI observation** (`material` · `surface` · `decorative_detail` · `attachment` · `exposure_opening` — 정확히 5개, 변경 없음)
> ```text
> OBSERVED                          → value = null   ·  values[] = observed canonical values
> ABSENT / NOT_VISIBLE / UNKNOWN    → value = null   ·  values[] = empty or omitted
> ```
> **scalar `.value`는 MULTI에서 state와 무관하게 항상 `null`이다**(Amendment #16 Part A 재확인).
>
> ★ **SV-1 `OBSERVED` 절 — CEO APPROVED (Option (a) · 2026-08-19 · CA#25):** **canonical MULTI serialization은 본 amendment의 emitter alignment 이후 validator에서 강제된다.** 순서 = **prompt(emitter) 정렬 → governed test migration → validator full enforcement.** canonical contract 자체는 변경되지 않는다(`MULTI OBSERVED: value = null · values[] = observed canonical values`). **MULTI canonical carrier는 오직 `values[]`이며, scalar `.value`는 primary·dominant·representative·first·fallback 중 어떤 의미도 갖지 않는다.** 값이 하나만 관측되어도 `values[]`에 넣는다.
>
> ⚠️ **PRE-FIX EVIDENCE (2026-08-19 실측 · 삭제 금지 · CA#25 이전 상태 기록):** 아래는 emitter alignment **이전**의 governed corpus 측정이며, CA#25가 무엇을 고쳤는지의 근거로 보존한다. `OBSERVED` MULTI observation **293건 중 89건(30.4%)이 non-null scalar `.value`를 보유**(79건 `values[0]` 중복 · **10건은 `values[]`가 아예 없어 `.value`가 유일한 observation carrier** · 충돌 0건). 강제 시 현재 record **154건 중 59건(38.3%)이 `GARMENT_CONTRACT_INVALID`**가 된다. 방출원은 Producer prompt의 단일 `OUTPUT SHAPE` template(모든 parameter에 `value`를 부여하며 MULTI 예외를 명시하지 않음)이고 governed test suite(§8-12·§14)도 동일 shape을 정상으로 고정하고 있다. **emitter(prompt) 정렬 없이 validator만 강제하면 live pipeline이 깨지므로 CA#24 범위에서는 강제하지 않았다.** ⛔ 그 상태에서 `.value`를 일괄 `null` 처리했다면 위 10건 유형의 observation이 소실되었을 것이다(downstream canonicalization·FINALPIPE는 `values[]`만 읽는다 — 해당 10건은 **CA#24 이전부터 이미 downstream에서 조용히 유실 중이던 선행 결함**이며 CA#24가 만든 것이 아니다). **→ CA#25(CEO Option (a))가 emitter를 정렬하여 이 결함의 원인을 제거하고 validator 강제를 완료한다.** 정본 = `STMX_MULTI_SERIALIZATION_ALIGNMENT_AND_SV1_CLOSURE_V1.md`.
>
> **▣ 오염률은 결정론적 regression이 아니라 ambiguous template 하의 stochastic drift였다**(artifact별 실측): Amendment #16 당시 envelopes **4%**(27건 중 1건) → CA#19 **25%** → CA#20 **21%** → CA#21 **26%** → repeatability run2 **64%** · run3 **27%**. 동일 prompt에서도 run마다 4%~64%로 흔들렸다 — 즉 **모델이 template의 빈틈을 매번 다르게 메웠다.** *(Amendment #16의 "Batch 001 12/12 전부 `value:null`" 경험적 서술은 그 시점 표본에서는 대체로 맞았으나 **완전하지 않았다** — 같은 파일에서 1건의 non-null scalar가 확인된다. historical 기록은 수정하지 않고 여기에 정정만 남긴다.)*
> **★ A non-OBSERVED MULTI observation cannot simultaneously carry observed canonical values.** — 이는 Amendment #16의 MULTI representation과 기존 state semantics를 논리적으로 완결한 clarification이며 새 MULTI architecture가 아니다.
>
> ⛔ **`values[] = []`는 canonical observed absence를 독립적으로 뜻하지 않는다. 의미의 소유자는 `state`다:**
>   `ABSENT` = feature absent · `NOT_VISIBLE` = region/evidence unavailable · `UNKNOWN` = value undecidable.
>   `values[]`는 non-OBSERVED 상태에서 **observed fact를 운반하지 않을 뿐**이다. 다섯 번째 state나 derived state를 만들지 않는다.
>
> **검사는 `state` 기준으로만 수행한다.** ⛔ 문자열 `"None"` 자체를 invalid로 취급하지 않는다 — 위 11개 parameter의 `OBSERVED` + `"None"`은 계속 정상이며, `UNKNOWN`/`NOT_VISIBLE`/`ABSENT` + `"None"`은 **non-OBSERVED + non-null value**이므로 invalid다.
>
> **Validator error codes (CA#24):** `NON_OBSERVED_VALUE_PRESENT`(SINGLE) · `MULTI_SCALAR_VALUE_PRESENT`(MULTI `.value`) · `MULTI_NON_OBSERVED_VALUES`(MULTI `values[]`) — 전부 F3 family(`OBSERVED_NO_VALUE`의 mirror).
>
> **Historical raw:** 본 enforcement는 **소급 적용되지 않는다.** Pre-Producer-36 legacy artifact의 malformed record(2026-08-19 감사 기준 96건 · 전부 `ABSENT` + `"None"`)는 **rewrite/migration/auto-clean 금지**이며 `PRE-PRODUCER-36 LEGACY / NOT CURRENT CANONICAL OUTPUT` provenance로 보존한다.
> - **`ABSENT`는 Frozen Vocabulary value가 아니다**(state로만 존재 · vocabulary에 추가 금지).
> **`ABSENT` 적용 대상(additive feature · Frozen domain에 `None` 없음):** `pattern` · `graphic` · `surface` · `decorative_detail` · `attachment` · `hood`. (예: solid garment에 Pattern 없음 → `pattern.state=ABSENT`, `value=null`. Surface treatment 없음 → `surface.state=ABSENT`.) — 이들에 `"None"` value를 넣는 것은 **금지**(Frozen domain에 None 미존재).

### B3. Applicability (not-applicable ≠ applicable+NOT_VISIBLE)
- **Parameter not applicable to garment** → schema instance에서 **key omit**(존재하지 않음). `N/A`를 Frozen value로 만들지 않는다.
- **Applicable + region 미가시** → key 존재 + `state=NOT_VISIBLE`.
- 두 상태가 구조적으로 다름(key 부재 vs state 값). Applicability는 §D matrix로 결정 — Category(O3) 관측 후 deterministic.

### B3.1 Category UNKNOWN Applicability Routing (PHASE B)
> **문제:** `category.state=UNKNOWN`이면 category-specific parameter의 applicable/non-applicable 판정 자체가 불가. 이를 단순 key omission으로 처리하면 **NOT APPLICABLE**과 **APPLICABILITY UNRESOLVED**가 구조적으로 구분되지 않는다.

`observation_metadata`에 technical routing status를 둔다:

```
"observation_metadata": { "applicability_status": "RESOLVED" | "UNRESOLVED_CATEGORY", … }
```

| status | 조건 | 처리 |
|---|---|---|
| **RESOLVED** | `category.state=OBSERVED` | §D applicability matrix 정상 적용 |
| **UNRESOLVED_CATEGORY** | `category.state=UNKNOWN` | **GROUP A(10)** 정상 extraction *(★ADR-126 CA#2: was `GROUP A(9)`; `asymmetry` 추가)* · **GROUP B(silhouette/fit/length) + 모든 category-specific parameter** = canonical key **omit** (아래) |

**GROUP A — Category-Independent Extraction (★9 · Amendment #15):** `material` · `surface` · `pattern` · `graphic` · `pocket` · `ruffle` · `decorative_detail` · `attachment` · **`asymmetry`**.  *(구 10에서 `transparency` 제거 — retired into `surface` optical values 2026-08-15.)*
> **★ ADR-126 Controlled Amendment #2 (2026-08-11):** `asymmetry`는 ADR-126에서 **Universal Scan(ALL 10 categories)** 으로 확정됨 → category-independent(domain `None/Present` 불변·category 무관) → **GROUP A로 편입(9 → 10)**. 구 category-specific(GROUP B) 위치는 supersede. **`fabric_behavior`는 GROUP A에 넣지 않는다** — ADR-126 classification = **M-all(Category-Mandatory)**, presence-gate/Universal 아님. 이번 correction으로 `fabric_behavior` Category-UNKNOWN routing을 재설계·변경하지 않는다.
> Category를 몰라도 (1) canonical value domain 불변 (2) canonical interpretation 불변 (3) category-dependent structural placement 불요 → Category UNKNOWN에서도 기존 4-state observation semantics로 **정상 extraction**. `category.state=UNKNOWN`이어도 이 10개(`asymmetry` 포함)는 category-dependent parameter처럼 omit하지 않는다.

**GROUP B — Category-Resolved-Only (omit until category resolved):** `silhouette` · `fit` · `length` **+ 모든 기존 category-specific parameter**.
> Category UNKNOWN에서 canonical value를 **추측하거나 partial-domain으로 반환하지 않고 canonical key omit**한다. 이유:
> - `silhouette` = category-dependent canonical **domain**(garment별 상이).
> - `fit` = category-dependent domain extension(Skirt/Dress-Lower `Voluminous`) + **Upper/Lower placement**.
> - `length` = category-dependent domain + **Whole/Upper/Lower placement**(TOP·Outerwear→Upper · Trouser·Skirt·Jumpsuit→Lower · Dress→Whole).
> ⛔ Category UNKNOWN에서 `silhouette/fit/length`를 `UNKNOWN` state로 emit하지 않는다 — canonical interpretation 조건(category 확정) 미충족 → **key omit**. garment category 추측 금지.

- **GROUP B/category-specific key omission은 NOT APPLICABLE을 의미하지 않는다.** 의미 = **APPLICABILITY / DOMAIN / PLACEMENT UNRESOLVED DUE TO UNKNOWN CATEGORY**. (필요 시 `observation_metadata.unresolved_parameters: []`로 명시 가능 — 불필요 확장 금지.)
> **Dependency rule:** *Category가 결정되어야 category-dependent canonical observation(silhouette/fit/length 포함)을 시작한다.* 예외 architecture(공통 domain·partial domain·generic parameter) 추가가 아니라 이 단순 dependency를 명시하는 것이 목적이다.

### B3.2 Four-Way Separation (혼합 금지)
| 경우 | 의미 | 표현 |
|---|---|---|
| **NOT APPLICABLE** | Category 확정 + matrix상 미적용 | category-specific key **omit** (status=RESOLVED) |
| **APPLICABILITY UNRESOLVED** | Category=UNKNOWN이라 **applicability · canonical domain · canonical placement** 중 하나 이상 미결정 | 해당 key(GROUP B `silhouette/fit/length` + category-specific) **omit** + `applicability_status=UNRESOLVED_CATEGORY` |
| **NOT_VISIBLE** | applicability 확정 + 필요 region 미가시 | key 존재 + `state=NOT_VISIBLE`, value=null |
| **UNKNOWN** | applicability 확정 + region 가시 + canonical value 신뢰 결정 불가 | key 존재 + `state=UNKNOWN`, value=null |

> ⛔ 4경우를 혼합하지 않는다. (key 부재+RESOLVED = NOT APPLICABLE · key 부재+UNRESOLVED_CATEGORY = APPLICABILITY UNRESOLVED · key 존재는 항상 applicability 확정 상태.)

### B4. Primary Region (canonical enum = 3)
`region` value = **`WHOLE_GARMENT` · `UPPER` · `LOWER`** 만.
- Shoulder/Neck/Waist/Sleeve/Hem/Front/Back = **canonical region 아님** → `evidence.location` **metadata**로만. Region enum으로 승격 금지.
- **★ADR-126 CA#5 — `fabric_behavior` region placement:** Dress/Jumpsuit는 `upper.fabric_behavior` + `lower.fabric_behavior` **둘 다 emit**(Fit Upper/Lower 선례 · 동일 canonical parameter #6 · 값 동일해도 collapse 금지). 그 외 category(Bottom/Outerwear)는 `whole_garment.fabric_behavior` 단일. **canonical parameter count 40 불변**(region-placement rule만).
- **Category-dependent 배치 규칙(Length):** TOP·Outerwear Upper → `upper.length`(region=UPPER) · Trouser·Skirt → `lower.length`(region=LOWER) · Dress → `whole_garment.length`(region=WHOLE_GARMENT) · Jumpsuit → `lower.length`(region=LOWER, **Upper Length = N/A → omit**). **Fit** = `upper.fit` / `lower.fit` split(Fit Observability V1).

### B5. Multiplicity (Pre-Freeze Correction · co-occurrence 검토 반영)
> 기준(B1): **동일 garment / applicable observation scope에서 서로 다른 canonical value가 동시에 독립적으로 관측될 수 있으면 schema가 그 정보를 버리지 않는다.** Multiplicity 변경은 **vocabulary amendment 아님**(canonical value domain 불변).

> ⚠ **SUPERSEDED BY AMENDMENT #16 PART A (2026-08-18).** 아래 "MULTI (4)" 및 `value`=array 표기는 **historical provenance**다. **Active canonical = MULTI 5 · `values[]` 운반 · scalar `.value = null` 정상.** 실제 구현 shape는 §B5.2 참조.

**MULTI (4):** `material` · `surface` · `decorative_detail` · `attachment` — `value`=array.
- `attachment`: 예 `["Belt","Epaulette","Storm Flap","Metal Hardware"]`.
- `surface`: 독립 surface evidence 동시 존재 가능(예 Pleated+Lace · Quilted+Reflective · Gathered+Lace).
- `decorative_detail`: 예 Embroidery+Sequin-Beading · Appliqué+Embroidery.
- `material`: mixed-material garment 실재(예 Knit+Leather · Wool+Fur · Denim+Leather). ⛔ **단, dominant material 추론·percentage·ranking·primary/secondary taxonomy 신설 금지** — 보이는 canonical materials만 array로 반환.

**SINGLE (36):** 나머지 canonical parameter.  ⟶ ⚠ **HISTORICAL (Frozen-40 기준). Active = SINGLE 31 · MULTI 5 · total 36 (§B5.2).**

- region-localized 반복은 multiplicity와 별개로 `evidence.location` metadata로도 보조 가능(B4).

### B5.2 ★ ACTIVE MULTI CANONICAL CONTRACT (Amendment #16 Part A · CEO D-5 · 2026-08-18)

> **이 절이 MULTI의 active canonical 표현이다.** §B5의 `value`=array 표기와 §B5.1의 `{value,cue,location}` evidence 표기는 historical provenance로 강등된다.

**MULTI = 5:** `material` · `surface` · `decorative_detail` · `attachment` · `exposure_opening`.
**SINGLE = 31.** (5 + 31 = 36)

**Canonical shape (operative ground truth = Producer code):**

```json
"surface": {
  "state":  "OBSERVED",
  "value":  null,
  "region": "whole_garment",
  "evidence": [ "<parameter-level cue>" ],
  "values": [
    { "value": "Quilted",       "evidence": ["<per-value cue>"] },
    { "value": "Textured Knit", "evidence": ["<per-value cue>"] }
  ]
}
```

**Rules (canonical):**
1. **`values[]` is the authoritative MULTI representation.** All observed canonical values live there, each self-describing with its own `evidence[]`.
2. **`value: null` is the NORMAL canonical state for a MULTI parameter.** It never means "nothing was observed."
3. **Absence is expressed by `state`**, never by `value` — `ABSENT` (feature not present) · `NOT_VISIBLE` (occluded/cropped) · `UNKNOWN` (visible but indeterminate). A MULTI parameter with `state = ABSENT` carries `values: []` or no `values` key.
4. **`Other` (where enabled: `material`, `attachment`) requires `descriptor`** on the `values[]` item.
5. **Consumers MUST read `values[]` and MUST NOT read `.value`** for MULTI. Reading `.value` yields `null` in 100% of MULTI observations and constitutes a consumption-contract error, not a data defect.
6. **Validator parity:** the deterministic validator validates MULTI **only** through `values[]` (domain membership · duplicate rejection · `Other`-descriptor requirement · per-value evidence warning). `.value` is **not** validated for MULTI.

**⛔ Prohibited:**
- populating `.value` redundantly for MULTI (creates a **dual canonical representation**);
- deriving a "primary"/"dominant" MULTI value into `.value` — §B5 forbids dominant-material inference, percentage, ranking and primary/secondary taxonomy;
- changing any MULTI vocabulary or the MULTI membership set under this Amendment.

**Batch 001 empirical confirmation (read-only, 12/12):** every OBSERVED MULTI observation across all 12 REFs carries `value: null` with populated `values[]` — e.g. REF_000002 `surface.values[] = ["Quilted"]`, REF_000011 `material.values[] = ["Leather"]`, REF_000012 `surface.values[] = ["Quilted","Textured Knit"]`. **The implementation is internally consistent; this Amendment aligns the documentation to it.**

### B5.1 Multi-Value Evidence Association (PHASE A · MULTI 4개만)  ⟶ **HISTORICAL · SUPERSEDED by §B5.2 (Amendment #16)**

> ⚠ 아래 `"value": [배열]` + `evidence:[{value,cue,location}]` shape는 **구현되지 않았다.** Active shape = §B5.2. `location` 개념은 **D-4 Location Contract Micro-Design**(설계 미승인·미구현)의 출발점으로 별도 보류된다.
> **문제:** MULTI parameter가 `value=[v1,v2,…]`인데 `evidence`가 단일 object면 각 value의 visual evidence/location association이 deterministic하지 않다(natural-language cue 안 서술 = deterministic association 아님).

**SINGLE parameter wrapper는 불변.** **MULTI 4개(`material`·`surface`·`decorative_detail`·`attachment`)만** `state=OBSERVED`일 때 `evidence`를 **self-describing item array**로 사용한다:

```
"material": {
  "value":  ["Silk", "Leather"],
  "state":  "OBSERVED",
  "region": "WHOLE_GARMENT",
  "confidence": "medium",
  "evidence": [
    { "value": "Silk",    "cue": "<concise cue>", "location": "<region metadata>" },
    { "value": "Leather", "cue": "<concise cue>", "location": "<region metadata>" }
  ]
}
```

**규칙:**
1. 각 evidence item은 자신이 설명하는 canonical `value`를 **명시**(self-describing) → order-dependence 금지.
2. `value` array의 각 원소는 대응 evidence item을 **정확히 1개** 가진다(value↔evidence deterministic).
3. `state ∈ {ABSENT, NOT_VISIBLE, UNKNOWN}`이면 `value=null`, `evidence` = 단일 object(per-value 불요).
4. **새 canonical parameter 생성 0** · **dominant/primary/secondary/ranking/percentage taxonomy 생성 0** · evidence = technical metadata 유지 · canonical parameter count = **40 유지**.
5. **★ADR-126 CA#5 — Multiplicity preservation (MULTI-4 wrapper child metadata · 새 top-level parameter 0):** MULTI 4(`material`·`surface`·`decorative_detail`·`attachment`) + `pocket`의 evidence item에 **multiplicity metadata** 추가 — discrete/countable(pocket·buckle·strap·discrete hardware·discrete appliqué) = `count`(신뢰 시 exact) · distributed/all-over(sequin·dense embroidery·beading) = `density`(밴드: sparse/moderate/dense 등, 절대 exact count 강요 금지). **Presence ≠ Type/Morphology ≠ Multiplicity 3-way 분리.** `count`/`density`는 **technical metadata**(evidence 하위)이며 canonical parameter가 아님 → **count 40 유지**. ranking/percentage 금지. 기존 wrapper/evidence array로 표현 불가한 경우에만 최소 child-field 확장(신규 top-level 0).

### B6. Evidence
- `evidence.cue` = **concise visual cue**(관측 근거 짧은 시각 단서) · `evidence.location` = Evidence Location metadata.
- **금지:** hidden reasoning·Chain-of-Thought·scoring rationale·consumer interpretation. free-text 서사 요구 안 함(validation/debugging 최소 수준).

### B7. Confidence
- `confidence` = technical metadata(`high/medium/low`). legacy confidence field(`cut_confidence` 등) 자동 승계 아님(별도 신설).
- 필요 이유: 동일 `OBSERVED`라도 관측 안정도 차등(validation·gating). **canonical garment parameter count에 미포함.**

---

## C2. Top-Level Structure

가장 단순·확장 가능한 top-level. 40 parameter를 conceptual separation으로 배치하되 Production nesting은 복제하지 않는다.

```
{
  "schema_version": "STMX_VISION_EXTRACTION_SCHEMA_FROZEN_V1",

  "garment_identity": {          // O3 classification block
    "category": {…},             // #1
    "trouser_distinction": {…},  // #2 (Trouser applicable)
    "grammar": {…}               // #40 (Outerwear applicable)
  },

  "whole_garment": {             // region = WHOLE_GARMENT
    "silhouette":{…}, "fabric_behavior":{…}, "waist_definition":{…},
    "material":{…}, "surface":{…}, "pattern":{…}, "graphic":{…},
    "transparency":{…}, "asymmetry":{…},
    "pocket":{…}, "pocket_construction":{…}, "pocket_projection":{…},
    "decorative_detail":{…}, "attachment":{…},
    "front_overlap":{…}, "cutout":{…}, "open_back":{…}, "ruffle":{…},
    "length":{…}               // Dress only (category-dependent, §B4)
  },

  "upper": {                     // region = UPPER
    "fit":{…}, "sleeve":{…},
    "shoulder_connection":{…}, "shoulder_span":{…}, "shoulder_drop":{…}, "shoulder_structure":{…},
    "neckline_shape":{…}, "neckline_position":{…}, "collar":{…},
    "rib_cuff":{…}, "rib_hem":{…}, "hood":{…},
    "front_opening_extent":{…}, "front_opening_type":{…},
    "closure_type":{…}, "closure_arrangement":{…}, "french_cuff":{…},
    "length":{…}               // TOP/Outerwear (category-dependent, §B4)
  },

  "lower": {                     // region = LOWER
    "fit":{…}, "slit":{…},
    "length":{…}               // Trouser/Skirt/Jumpsuit-lower (category-dependent, §B4)
  },

  "observation_metadata": {      // technical / control — NOT canonical parameters
    "applicability_status": "RESOLVED",   // "RESOLVED" | "UNRESOLVED_CATEGORY" (§B3.1)
    "capture_type": "…",         // (구 cut_observation, technical)
    "overall_confidence": "…",
    "notes": []                  // NON-PARAMETER descriptive reference (Recognized Detail 등)
  }
}
```

> **`length`는 category당 정확히 한 곳에만 emit**(§B4 규칙). Whole/Upper/Lower 세 곳에 동시 존재하지 않는다.
> **Non-applicable parameter는 해당 block에서 omit**(§B3).

---

## C3. Field Definitions (40)  ⟶ **HISTORICAL · SUPERSEDED by Amendment #15 (35)**

> ⚠ 아래 field-def 표는 Frozen-40 provenance. **Active = Amendment #15의 35-param 표.** `front_opening_type`·`closure_arrangement`·`transparency`·`front_overlap`·`cutout`·`open_back` = retired; `closure_type` = 7-value 통합(applicability M Jacket/Coat + C TOP/Dress/Jumpsuit); `surface` = 11(+Glossy/Semi Transparent/Transparent); `exposure_opening`(MULTI · Open Back/Front Cutout/Side Cutout/Shoulder Cutout · Dress/Jumpsuit M) 신설.

> 표기: **Key** = schema key · **Type** = value 타입 · **Values** = Frozen domain · **Appl.** = applicability(§D 참조) · **Mult.** = single/multi · **State** = 허용 state · **Region** · **Evidence** = evidence.location · **Non-Inference**.

### garment_identity
| # | Key | Type | Values | Appl. | Mult | State | Region | Ev.loc | Non-Inference |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `category` | enum | 10-tree | ALL | single | OBSERVED/UNKNOWN | WHOLE | — | product/brand name 금지 |
| 2 | `trouser_distinction` | enum | Tailored/Casual/Sport/Jeans/Leggings | Trouser | single | OBSERVED/UNKNOWN | WHOLE | Lower | Jeans≠Denim·Leggings≠Category |
| 40 | `grammar` | enum | Tailored/Casual/Utility | Outerwear | single | OBSERVED/UNKNOWN | WHOLE | — | 단일 parameter derive 아님·consumer-owned 아님 |

### whole_garment
| # | Key | Type | Values | Appl. | Mult | State | Region | Ev.loc | Non-Inference |
|---|---|---|---|---|---|---|---|---|---|
| 3 | `silhouette` | enum | garment별 set | 각 garment | single | OBSERVED/UNKNOWN | WHOLE | — | Fit과 분리 |
| 6 | `fabric_behavior` | enum | Structured/Semi-Structured/Semi-Fluid/Fluid | **ALL 10**(CA#2) | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE · **Dress/Jumpsuit = UPPER+LOWER**(★CA#5) | — | SR 3-value 축소 금지(별도 stage) · **★ADR-126 CA#5: Dress/Jumpsuit는 `fabric_behavior[UPPER]`+`fabric_behavior[LOWER]` 항상 emit(Fit Upper/Lower 선례 · 동일 canonical parameter · 새 parameter 0 · 값 동일해도 collapse 금지). 그 외 category = WHOLE 단일.** |
| 7 | `waist_definition` | enum | Undefined/Defined/Cinched | Outerwear/Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | Waist | Waist≠Fit≠Belt |
| 27 | `material` | enum[] | 11-set **+ `Other`**(★CA#5) | ALL | **multi** | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | Region | fiber 정확 추정 금지(외관만)·Surface와 분리·**multi: 보이는 material array·dominant/percentage/ranking 금지** · **★ADR-126 CA#5: `Other` = evidence-preservation escape-hatch(coarse family 미매칭 시 · `evidence.descriptor`에 linen-like slub/mohair-like halo 등 시각 descriptor 보존 · 실제 fiber 주장 금지 · Linen/Mohair 등 신규 canonical fiber 신설 0)** |
| 28 | `surface` | enum[] | 8-set | ALL | **multi** | OBSERVED/**ABSENT**/NOT_VISIBLE/UNKNOWN | WHOLE | Region | Textured Knit=Surface(≠Material Knit)·surface 없음→ABSENT·**multi(Pleated+Lace 등)** |
| 29 | `pattern` | enum | Linear/Grid/Repeat | ALL | single | OBSERVED/**ABSENT**/NOT_VISIBLE/UNKNOWN | WHOLE | Region | Graphic과 분리·solid→ABSENT |
| 30 | `graphic` | enum | Localized/Dominant | ALL | single | OBSERVED/**ABSENT**/NOT_VISIBLE/UNKNOWN | WHOLE | Region | Pattern과 분리·graphic 없음→ABSENT |
| 31 | `transparency` | enum | None/Semi Sheer/Sheer | ALL | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | Region | ≠Cutout/Open Back/Slit·EI Exposure와 별개 |
| 32 | `asymmetry` | enum | None/Present | Shirt/Dress/Skirt/Knit/Outerwear | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | — | One Shoulder≠Asymmetry |
| 23 | `pocket` | enum | None/Present | 다수 | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | — | count 파생 금지(presence only) |
| 24 | `pocket_construction` | enum | Inset/Applied | **ALL 10 categories**(★CA#12 Universal-Conditional ← `pocket=Present`) | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | — | Cargo taxonomy 미사용 · **★ADR-126 CA#7: applicability +Jacket·+Coat**(Conditional ← pocket=Present ∧ 가시 · 기존 primitive category 적용범위만 확장 · 새 value 0 · Inset=set-in(welt/jetted/seam) · Applied=patch). Outerwear 정본 = Jacket·Coat(Vest canonical 아님). |
| 25 | `pocket_projection` | enum | Flat/Projected/**Volumetric**(★CA#6) | **ALL 10 categories**(★CA#12 Universal-Conditional ← `pocket=Present`) | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | — | **★ADR-126 CA#6: `Volumetric` = pocket body가 garment surface와 독립된 명확한 3-D volume(gusset/bellows/box/expanded pouch). `Flat`=flush · `Projected`=stands away, 독립 volume 아님 · `Volumetric`=독립 3-D volume. Rule: Flap ≠ Volumetric(flap 크기로 추론 금지) · Applied ≠ 자동 Volumetric · garment name(Cargo)로 정의 금지 · 3-D 측면 depth 미가시 시 Volumetric 강요 금지(Projected/UNKNOWN). numeric threshold 0.** · **★ADR-126 CA#7: applicability +Jacket·+Coat**(Conditional ← pocket=Present ∧ projection 가시 · pocket type/name으로 추론 금지 · domain 불변). |
| 38 | `decorative_detail` | enum[] | Embroidery/Sequin-Beading/Appliqué | ALL | **multi** | OBSERVED/**ABSENT**/NOT_VISIBLE/UNKNOWN | WHOLE | Region | Surface≠Decorative≠Attachment·없음→ABSENT·**multi(Embroidery+Sequin 등)** |
| 39 | `attachment` | enum[] | 9-set **+ `Other`**(★CA#5) | ALL | **multi** | OBSERVED/**ABSENT**/NOT_VISIBLE/UNKNOWN | WHOLE | Region | Belt≠Waist Definition·multi 동시 허용·없음→ABSENT · **★ADR-126 CA#5: 관측되는 attachment가 9-set 미매칭이면 `ABSENT` 금지(DR-7) → `Other`(evidence-preservation) + `evidence.descriptor`(예: hanging/webbing strap/tie) + multiplicity 보존. Hanging Strap/Webbing Strap/Tie를 canonical enum으로 승격 0.** |
| 33 | `front_overlap` | enum | None/Present | Dress/Jumpsuit 등 | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | Front | wrap 추론 금지·≠Front Opening |
| 34 | `cutout` | enum | None/Present | Dress/Jumpsuit 등 | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | — | ≠Open Back·위치 taxonomy 없음 |
| 35 | `open_back` | enum | None/Present | Dress/Jumpsuit 등 | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | Back | Back 미가시→NOT_VISIBLE·≠Cutout |
| 37 | `ruffle` | enum | None/Present | 다수 | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | Region | 단일 위치(중복 금지)·Ruffle Collar=Collar |
| 5 | `length` | enum | Dress: Mini/Midi/Maxi Length | Dress | single | OBSERVED/NOT_VISIBLE/UNKNOWN | WHOLE | Hem | (Dress만 여기 배치) |

### upper
| # | Key | Type | Values | Appl. | Mult | State | Region | Ev.loc | Non-Inference |
|---|---|---|---|---|---|---|---|---|---|
| 4 | `fit` | enum | Slim/Regular/Relaxed/Oversized(+Voluminous) | 각 garment | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | — | Fit Observability V1 |
| 8 | `sleeve` | enum | Sleeveless/Short/Mid/Long | Upper·Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Sleeve | Mid=Elbow/3-4 흡수 |
| 9 | `shoulder_connection` | enum | Standard/Strap/Strapless/Halter/One Shoulder | Upper·Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Shoulder/Neck | ≠SR Shoulder·One Shoulder≠Asymmetry |
| 10 | `shoulder_span` | enum | Narrow/Regular/Extended | Upper garments | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Shoulder | ≠Structure·≠Drop·Oversized=Fit |
| 11 | `shoulder_drop` | enum | None/Dropped | Upper garments | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Shoulder | Dropped≠Extended |
| 12 | `shoulder_structure` | enum | None/Mild/Strong/Extreme | Outerwear/Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Shoulder | Slope=evidence(output 아님)·SR 재사용 |
| 13 | `neckline_shape` | enum | Round/V/Square/Straight/**Scoop**/Mock/Turtleneck/Funnel (★CA#14) | Upper·Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Neck | Position과 분리(combined label 금지) · Scoop=depth는 여전히 Position |
| 14 | `neckline_position` | enum | High/Regular/Low | Upper·Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Neck | ≠Collar(공존) |
| 15 | `collar` | enum | Library 8 (+Outerwear Lapel Type) | Upper·Outerwear·Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Neck | 단일 library 참조·Neckline과 별개 |
| 16 | `rib_cuff` | enum | None/Present | Upper garments | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Sleeve | ≠French Cuff·≠Textured Knit |
| 17 | `rib_hem` | enum | None/Present | Upper garments | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Hem | ≠hem construction taxonomy |
| 18 | `hood` | enum | Present(유무) | Sweatshirt/Outerwear | single | OBSERVED/**ABSENT**/NOT_VISIBLE/UNKNOWN | UPPER | Neck/Back | Hoodie=Sweatshirt+Hood·hood 없음→ABSENT(Frozen None 미존재) |
| 19 | `front_opening_extent` | enum | None/Partial/Full | TOP·Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Front | T-shirt Full 미사용 |
| 20 | `front_opening_type` | enum | Button/Snap Button/Zipper/Open | TOP·Dress/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Front | Wrap 미포함 |
| 21 | `closure_type` | enum | Button/Snap Button/Zipper/Hook Closure | Outerwear | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Front | Front Opening과 별개 field |
| 22 | `closure_arrangement` | enum | Single Breasted/Double Breasted | Outerwear | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Front | — |
| 26 | `french_cuff` | enum | None/Present | Shirt | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Sleeve | ≠Rib Cuff·일반 cuff taxonomy 미생성 |
| 5 | `length` | enum | TOP Cropped/Regular/Long · Jacket Cropped/Waist Length/Hip Length (★CA#22) · Coat Hip Length/**Thigh Length**/Knee Length/Maxi Length (★CA#13) | TOP/Outerwear | single | OBSERVED/NOT_VISIBLE/UNKNOWN | UPPER | Hem | Cropped Bottom 재도입 금지 · Thigh Length = Coat only · **★CA#22 Jacket semantic boundary + Length Readability Gate** (body-relative만 · construction feature proxy 금지 · flat-lay/행거/신체없음 → `NOT_VISIBLE` · 밑단 보이나 body-relative 판정 불가 → `UNKNOWN` · 도피처 사용 금지) |

### lower
| # | Key | Type | Values | Appl. | Mult | State | Region | Ev.loc | Non-Inference |
|---|---|---|---|---|---|---|---|---|---|
| 4 | `fit` | enum | Slim/Regular/Relaxed/Oversized(+Voluminous) | Bottom/Dress-Lower/Jumpsuit-Lower | single | OBSERVED/NOT_VISIBLE/UNKNOWN | LOWER | — | Fit Observability V1 |
| 5 | `length` | enum | Trouser/Jumpsuit-Lower Short/Knee Length/Calf Length/Ankle Length/Full Length/Extended Length · Skirt Mini/Midi/Maxi Length | Trouser/Skirt/Jumpsuit | single | OBSERVED/NOT_VISIBLE/UNKNOWN | LOWER | Hem | Extended=stacking/바닥끌림 |
| 36 | `slit` | enum | None/Present | Dress/Skirt 등 | single | OBSERVED/NOT_VISIBLE/UNKNOWN | LOWER | Hem | 세분화 없음 |

> **observation_metadata**는 canonical parameter가 아니다(`applicability_status`·capture_type·overall_confidence·notes). Recognized Detail 10종은 `notes[]`의 descriptive reference로만(강제 primitive 변환 금지).
> **MULTI 4개(`material`·`surface`·`decorative_detail`·`attachment`)**: `state=OBSERVED`일 때 `evidence` = per-value self-describing array(§B5.1). SINGLE 36개: `evidence` = 단일 object(불변).

---

## C4. Machine-Readable Example (illustrative only · NOT production code)

> **Dress** 예시 — Whole/Upper/Lower 모두 노출 · `OBSERVED`(+semantic `None`) · **`ABSENT`** · `NOT_VISIBLE` · `UNKNOWN` 4-state + multi-value(Material/Surface/Attachment) 전부 시연. Schema semantics 검증용이며 executable/production 아님. (Dress에 non-applicable한 grammar·trouser_distinction·closure·pocket_construction 등은 **omit**.)

```json
{
  "schema_version": "STMX_VISION_EXTRACTION_SCHEMA_FROZEN_V1",

  "garment_identity": {
    "category": { "value": "Dress", "state": "OBSERVED", "region": "WHOLE_GARMENT",
                  "confidence": "high", "evidence": { "cue": "single continuous one-piece, torso-to-hem" } }
  },

  "whole_garment": {
    "silhouette":       { "value": null, "state": "UNKNOWN", "region": "WHOLE_GARMENT",
                          "confidence": "low", "evidence": { "cue": "pose obscures outer contour" } },
    "fabric_behavior":  { "value": "Fluid", "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "medium", "evidence": { "cue": "soft vertical drape, follows body" } },
    "waist_definition": { "value": "Defined", "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "narrowed seam at waistline", "location": "Waist" } },
    "material":         { "value": ["Silk", "Leather"], "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "medium",
                          "evidence": [
                            { "value": "Silk",    "cue": "fluid sheen on body/skirt", "location": "Whole" },
                            { "value": "Leather", "cue": "matte panel at waistband", "location": "Waist" }
                          ] },
    "surface":          { "value": null, "state": "ABSENT", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "smooth; no surface treatment though fully visible" } },
    "pattern":          { "value": null, "state": "ABSENT", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "solid, no pattern" } },
    "graphic":          { "value": null, "state": "ABSENT", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "no graphic element" } },
    "transparency":     { "value": "None", "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "opaque body" } },
    "asymmetry":        { "value": "None", "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "bilateral symmetry" } },
    "cutout":           { "value": "None", "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "no internal openings on visible front" } },
    "open_back":        { "value": null, "state": "NOT_VISIBLE", "region": "WHOLE_GARMENT",
                          "confidence": "low", "evidence": { "cue": "back not in frame", "location": "Back" } },
    "decorative_detail":{ "value": null, "state": "ABSENT", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "no embroidery/sequin/appliqué" } },
    "attachment":       { "value": ["Belt", "Metal Hardware"], "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "high",
                          "evidence": [
                            { "value": "Belt",           "cue": "fabric belt at waist", "location": "Waist" },
                            { "value": "Metal Hardware", "cue": "metal buckle on belt", "location": "Waist" }
                          ] },
    "length":           { "value": "Midi", "state": "OBSERVED", "region": "WHOLE_GARMENT",
                          "confidence": "high", "evidence": { "cue": "hem at mid-calf", "location": "Hem" } }
  },

  "upper": {
    "fit":              { "value": "Regular", "state": "OBSERVED", "region": "UPPER",
                          "confidence": "medium", "evidence": { "cue": "close but not compressed at bodice" } },
    "sleeve":           { "value": "Sleeveless", "state": "OBSERVED", "region": "UPPER",
                          "confidence": "high", "evidence": { "cue": "no sleeve, bare arm", "location": "Sleeve" } },
    "shoulder_connection": { "value": "Halter", "state": "OBSERVED", "region": "UPPER",
                          "confidence": "high", "evidence": { "cue": "single strap around neck", "location": "Neck" } },
    "neckline_shape":   { "value": "V", "state": "OBSERVED", "region": "UPPER",
                          "confidence": "medium", "evidence": { "cue": "V opening at chest", "location": "Neck" } },
    "neckline_position":{ "value": null, "state": "UNKNOWN", "region": "UPPER",
                          "confidence": "low", "evidence": { "cue": "halter drape ambiguous depth", "location": "Neck" } }
  },

  "lower": {
    "slit":             { "value": "Present", "state": "OBSERVED", "region": "LOWER",
                          "confidence": "high", "evidence": { "cue": "thigh-height opening at left hem", "location": "Hem" } }
  },

  "observation_metadata": {
    "applicability_status": "RESOLVED",
    "capture_type": "worn",
    "overall_confidence": "medium",
    "notes": []
  }
}
```

> **Boundary 검증(4-state 구조 분리):**
> - `OBSERVED`+value: `category`·`fabric_behavior`·`waist_definition`·`length`·`fit`·`sleeve`·`shoulder_connection`·`neckline_shape`·`slit`.
> - `OBSERVED`+semantic **`None`**: `transparency`·`asymmetry`·`cutout`(Frozen domain에 None 실재).
> - **`ABSENT`**+null: `surface`·`pattern`·`graphic`·`decorative_detail`(feature 부재·충분히 가시·Frozen None 미존재 → value "None" 금지).
> - `NOT_VISIBLE`+null: `open_back`(Back 미가시).
> - `UNKNOWN`+null: `silhouette`·`neckline_position`(가시하나 판단불가).
> - **multi-value + per-value evidence array**(§B5.1): `material`(Silk→body·Leather→Waist)·`attachment`(Belt→Waist·Metal Hardware→Waist) — 각 value가 자기 evidence를 self-describing(ranking 없음).
> - **applicability_status=RESOLVED**(category=OBSERVED · §B3.1). Category=UNKNOWN이었다면 category-specific keys omit + `UNRESOLVED_CATEGORY`.
> ∴ **semantic None ≠ ABSENT ≠ NOT_VISIBLE ≠ UNKNOWN** 구조 분리 확인. 구 Surface `"None"`(Frozen 미존재) 오류 = **제거**(→ABSENT). value↔evidence deterministic association 확인.

---

## D. Applicability Matrix (category × parameter · §B3)  ⟶ **HISTORICAL (40) · SUPERSEDED by Amendment #15 + `STMX_VISION_10X40_FINAL_APPLICABILITY_MATRIX_V1.md` (35)**

> ⚠ 아래 matrix는 Frozen-40 provenance. **Active applicability (35) = Amendment #15 표 + F4 matrix doc.** retired rows(`front_opening_type`/`closure_arrangement`/`transparency`/`front_overlap`/`cutout`/`open_back`) 무효 · `closure_type` = M(Jacket/Coat)+C(TOP/Dress/Jumpsuit)+N(Trouser/Skirt) · `exposure_opening` = M(Dress/Jumpsuit)+N(rest).

> ✅ applicable(적용) · — not applicable(key omit). Recognized Detail 제외. (Fit/Length는 category별 region 배치 §B4.)

| Parameter | T-Shirt | Shirt | Sweater | Sweatshirt | Jacket | Coat | Trouser | Skirt | Dress | Jumpsuit |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| category | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| trouser_distinction | — | — | — | — | — | — | ✅ | — | — | — |
| grammar | — | — | — | — | ✅ | ✅ | — | — | — | — |
| silhouette | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ |  *(★CA#3: TOP 4 → N/A. ★ADR-126 CA#4 2026-08-11: **Outerwear (Jacket/Coat) → N/A** (generic Slim/Regular/Relaxed/Oversized merely repeated Fit; Outerwear form via Fit/Shoulder Structure/Waist/Length/Fabric Behavior). Applicable only Trouser(leg geom)/Skirt(skirt geom)/Dress(whole-dress shape)/Jumpsuit(Lower geom).)*
| fit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| length | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅(Lower) |
| fabric_behavior | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  *(★ADR-126 CA#2: was `— — — — ✅ ✅ ✅ ✅ ✅ —` → ALL 10 · observation only)*
| waist_definition | — | — | — | — | ✅ | ✅ | — | — | ✅ | ✅ |
| sleeve | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| shoulder_connection | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ |  *(★CA#3: Sweatshirt N/A. ★ADR-126 CA#4: **operational class = Conditional** — extract only when a meaningful non-standard connection is visible (Strap/Strapless/Halter/One Shoulder); ordinary conventional sleeved garment → N/A for that instance. Applicable set = T-Shirt/Shirt/Sweater/Dress/Jumpsuit.)*
| shoulder_span | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ |  *(★CA#3: Sweatshirt N/A. ★ADR-126 CA#4: **operational class = Conditional** — extract only when span itself is a meaningful design variable (sleeveless/tank/narrow/extended); ordinary sleeved garment → N/A. `shoulder_drop` remains a separate observation.)*
| shoulder_drop | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| shoulder_structure | — | — | — | — | ✅ | ✅ | — | — | ✅ | ✅ |
| neckline_shape | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| neckline_position | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| collar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| rib_cuff | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| rib_hem | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| hood | — | — | — | ✅ | ✅ | ✅ | — | — | — | — |
| front_opening_extent | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| front_opening_type | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| closure_type | — | — | — | — | ✅ | ✅ | — | — | — | — |
| closure_arrangement | — | — | — | — | ✅ | ✅ | — | — | — | — |
| french_cuff | — | ✅ | — | — | — | — | — | — | — | — |
| pocket | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| pocket_construction | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  *(**★ADR-126 CA#12 (2026-08-14): ALL 10 categories · Universal-Conditional ← `pocket=Present` ∧ morphology 가시. CA#4/CA#7 whitelist를 supersede. 본 행은 CA#12 승인 당시 미갱신되어 2026-08-19 P-6로 sync됨 — documentation correction only · runtime applicability 변경 0 · 코드는 CA#12를 이미 구현 중이었음.** 이하 historical: ★ADR-126 CA#4: **+Skirt** — existing primitive extended to Skirt (Conditional ← pocket=Present); Case-08 cargo morphology no longer collapses to Pocket=Present. No new value. ★ADR-126 CA#7 2026-08-12: **+Jacket·+Coat** — Outerwear pocket morphology applicability expansion (Conditional ← pocket=Present ∧ construction visually readable); closes CA#6 Outerwear gap. Canonical Outerwear = Jacket·Coat (Vest not canonical). No new value.)*
| pocket_projection | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  *(**★ADR-126 CA#12 (2026-08-14): ALL 10 categories · Universal-Conditional ← `pocket=Present`. CA#4/CA#7 whitelist를 supersede. 본 행은 2026-08-19 P-6로 sync됨 — documentation correction only · runtime applicability 변경 0.** 이하 historical: ★ADR-126 CA#4: **+Skirt** (Conditional ← pocket=Present). ★ADR-126 CA#7: **+Jacket·+Coat** (Conditional ← pocket=Present ∧ projection visually readable). Domain Flat/Projected/Volumetric unchanged.)*
| material | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| surface | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| pattern | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| graphic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| transparency | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| asymmetry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  *(★ADR-126 CA#2: was `— ✅ — — ✅ ✅ — ✅ ✅ —` → ALL 10 · Universal Scan)*
| front_overlap | — | — | — | — | — | — | — | — | ✅ | ✅ |
| cutout | — | — | — | — | — | — | — | — | ✅ | ✅ |
| open_back | — | — | — | — | — | — | — | — | ✅ | ✅ |
| slit | — | — | — | — | — | — | — | ✅ | ✅ | — |
| ruffle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| decorative_detail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| attachment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Applicability는 Contract §5 "Applicable" 열과 Frozen Master category tree에서 직접 도출. **Asymmetry**는 Contract "Shirt/Dress/Skirt/Knit/Outerwear"에 한정(Knit=Sweater). **Ruffle/Decorative/Attachment/Material/Surface/Pattern/Graphic/Transparency/Pocket**은 Contract "ALL/다수" → 전 category applicable(관측되지 않으면 semantic `None` 또는 `ABSENT`).
>
> **★ Pre-Freeze Applicability Correction(PHASE C · Contract/Frozen Master consistency correction · 새 architecture 아님):**
> - **Shoulder Connection/Span/Drop = TOP·Dress/Jumpsuit only**(Jacket/Coat 제거). **Shoulder Structure = Outerwear·Dress·Jumpsuit only**(TOP 제외). → Outerwear는 Structure만, TOP은 Connection/Span/Drop만, one-piece(Dress/Jumpsuit)는 4-obs 전부.
> - **Fabric Behavior = Bottom·Outerwear·Dress only**(Jumpsuit 제거 · Contract "Bottom/Outerwear/Dress" 정합). **[★ ADR-126 CA#2 SUPERSEDED 2026-08-11: `fabric_behavior` = ALL 10 categories(observation only · domain 불변 · SR consumption 불변). Asymmetry도 ALL 10(Universal). 위 pre-freeze scope는 historical.]**
> - **Full 40×10 re-audit 완료:** 위 2건(Shoulder·Fabric Behavior) 외 Contract 대비 추가 불일치 = **0**. transcription error 교정만 · 새 applicability 임의 설계 0 · semantic ambiguity로 CEO Decision 필요 항목 = 0.

---

## 6. Non-Inference Rules (Contract §6 보존)
- **Product/brand/style name** 추론 금지(Romper/Cardigan/Hoodie/Cargo Pants → Frozen 조합만).
- **Hidden construction**(안감/다트/심) 추론 금지 — 가시 evidence만.
- **Material fiber 정확성** 추정 금지 — 외관 appearance만.
- **Wrap/faux-wrap · Jeans↔Denim · Sweatshirt→Cotton** 자동 등치 금지.
- **Score/axis 결론**(Classic/Transformative·strong/weak·tier·EI expressive) encode 금지.

---

## 🔒 Frozen Scope (ADR-120 · 이 Freeze가 고정하는 것)
> 아래 9개 항목이 **FROZEN V1**이다. 변경은 Controlled Amendment(Validation Evidence → Issue Report → CEO Review → Amendment)로만.

1. **Canonical Parameter Inventory = ★36** (Frozen-40 → 35 · Amendment #15 · 2026-08-15 → **35 → 36 · Amendment #16 Part B · `sleeve_volume` PN36 · CEO 2026-08-16**) — 이후 추가/삭제/rename/semantic repurpose는 controlled amendment로만. *(구 "40"·"35"는 historical.)* **Operative ground truth = `producer_rules_v1.js` PN 1..36.**
2. **Canonical Value Domains** — 각 parameter의 Frozen Garment Vocabulary-derived 값역. Schema 편의로 value 추가/삭제/rename/domain merge·split 금지(필요 시 Vocabulary controlled amendment 선행).
3. **Observation State Model = `OBSERVED / ABSENT / NOT_VISIBLE / UNKNOWN`** + **semantic None ≠ ABSENT ≠ NOT_VISIBLE ≠ UNKNOWN** distinction.
4. **Multiplicity** — MULTI 4(`material`·`surface`·`decorative_detail`·`attachment`) + SINGLE 36. MULTI = per-value deterministic evidence association(§B5.1).
5. **Applicability Model** — 40×10 matrix + category-specific applicability. 특히 Shoulder(TOP=Connection/Span/Drop · Outerwear=Structure only · Dress/Jumpsuit=4) · Fabric Behavior(Bottom/Outerwear/Dress · Jumpsuit·TOP 제외) corrected applicability. **[★ ADR-126 CA#2 (2026-08-11): `fabric_behavior` = ALL 10 · `asymmetry` = ALL 10(Universal) · `french_cuff` = Conditional(Shirt ∧ cuff · applicability=Shirt 불변). 40 param·value domain 불변. 정본 F4/F6.]**
6. **Category UNKNOWN Routing** (Controlled Amendment ADR-121; **★ADR-126 CA#2 propagation 2026-08-11**) — `observation_metadata.applicability_status={RESOLVED|UNRESOLVED_CATEGORY}` · UNKNOWN 시 **GROUP A(10: material·surface·pattern·graphic·transparency·pocket·ruffle·decorative_detail·attachment·`asymmetry`) 정상 extraction** *(구 9 → 10, ADR-126 asymmetry Universal)* · **GROUP B(silhouette·fit·length) + category-specific = key omit**(domain/placement category-dependent → category 확정 전 canonical observation 미시작) · category 추측 금지. **`fabric_behavior` = M-all(GROUP A 아님 · routing 재설계 0).**
7. **Region Model** — canonical Region = `WHOLE_GARMENT/UPPER/LOWER`. Shoulder/Neck/Waist/Sleeve/Hem/Front/Back 등 = evidence location technical metadata(canonical Region 아님).
8. **Metadata Separation** — state·region·confidence·evidence·evidence.location·applicability_status·capture_type·overall_confidence·notes = **canonical parameter 아님**. canonical parameter count = **★35** (Amendment #15 · 구 40 historical).
9. **Non-Parameter / Non-Inference Rules** — Recognized Detail=NON-PARAMETER · Shoulder Slope=evidence only(canonical output 아님) · product taxonomy·hidden construction·fiber certainty inference 금지 · score/tier/axis judgement leakage 금지.

**이 ADR이 Freeze/승인하지 않는 것:** Production 163 schema · Production migration · Vision producer implementation · Engine implementation · parser/runtime · TC/SR/DM/EI integration · validation result · score physics/formula/thresholds. (전부 후속 별도 CEO Sprint.)

## Approval Anchor
> **CEO Decision:** 2026-08-08 (**ADR-120** · Vision Extraction Schema V1 Freeze Order). **Reason:** CEO+ChatGPT Final Review 통과한 Vision Extraction Schema Candidate V1(Pre-Freeze Correction #1·#2 완료)을 **FROZEN V1**으로 승격. Basis: Approved Observation Contract(ADR-119)·Frozen Garment Vocabulary+ADR-118·40/40 coverage·PASS 36/REVIEW 4/BLOCKED 0·Hard Requirement 22/22·Production 163/163 reconciliation. **Affected Scope:** 본 문서 status/naming 승격(구 `..._CANDIDATE_V1` → `..._FROZEN_V1` rename·삭제 0·semantic content 불변). **NO CODE · Engine SHA `225252b1afa8d75b` 불변 · Frozen Vocabulary 변경 0 · Production 변경 0.** Status = **FROZEN V1 · CEO FREEZE APPROVED**.
> **이전 Approval Anchor(보존):** ADR-119(2026-08-08) — 40-Parameter Observation Contract → Extraction Schema Candidate 투영. Pre-Freeze Correction #1·#2(2026-08-08) 반영.
