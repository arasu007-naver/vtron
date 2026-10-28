# STMX EI Phase 2 — Surface / Material & Decorative Expression Observation Canonical V1

> **STATUS: CANONICAL (CEO-Approved · Phase 2 Observation) · CURRENT.** Documentation / Canonical Update Only.
> **Sprint:** EI Phase 2 Surface/Material & Decorative Expression Canonical Update (2026-08-01 · ADR-096).
> **성격:** ChatGPT–CEO Design Review 확정사항의 원문 반영 — **재해석·추가·삭제 0.** Architecture Finalization/Runtime/Scoring/Numeric/Weight/Formula/evidence combination/double-count = **본 Sprint 범위 아님(Deferred).**

> ## CEO Approval Anchor — Phase 2 Surface/Material & Decorative Observation
> **CEO Decision: 2026-08-01** · Reason: EI Phase 2 = **Vision-observable Surface/Material/Decorative characteristic이 그 자체로 Positive Expressive Evidence인가**의 Observation 확정. Surface/Material Positive Evidence **10종** + Decorative Positive Evidence **4종** + No-Effect cases + Coverage vocabulary(Localized/Partial/Dominant) 확정. Embroidery standalone = REJECTED. **Observation only** — Consumption/Scoring/Interaction 후속. · Affected Scope: 본 문서(CURRENT Canonical) + Project Context 동기화. Runtime/Engine/Formula/Numeric/Weight 0 · Phase 1 Color·Phase 3 Exposure·DM/SR/TC·frozen 미수정.

---

## 1. Phase 2 Purpose

Vision을 통해 garment에서 **명확하게 관찰되는 Surface / Material / Decorative characteristic이 그 자체로 Positive Expressive Evidence인가**를 관측·확정한다. **소재 진위/섬유 조성/제조 방식/물성 판별 시스템이 아니다.**

---

## 2. Governing Principle (D1)

- Vision은 **visual appearance / visible phenomenon**을 관측한다. → **real vs faux 판별 불필요 · natural vs synthetic 불필요 · 제작기법 불안정 시 visual appearance 우선 · 소재명보다 관측 가능한 surface characteristic 우선.**
- **별도 `Non-Expressive Surface` classification을 만들지 않는다.** Positive Expressive Evidence가 명확히 존재 → **YES.** 아니면 → **EI Surface contribution 없음(No Effect).**

---

## 3. Surface / Material Positive Expressive Evidence Set (10종 · CEO Approved)

| # | Evidence | 관측 정의(원문 반영) | 핵심 경계 |
|---|---|---|---|
| **S01** | **Pronounced Textured Surface** | 강한 coarse/nubby/looped/slubbed 표면 조직이 명확한 visual character 형성(예: Chanel-style bouclé/tweed appearance). **소재명 tweed 판별 아님 · pronounced visible surface texture 관측.** | — |
| **S02** | **Pronounced Exotic-Skin Surface** | crocodile/python/snake/ostrich 등 exotic-skin-like appearance 명확. **real/faux/embossed synthetic 판별 안 함.** | — |
| **S03** | **Pronounced Reflective / Light-Reactive Surface** | 강한 reflection/shine/sparkle/optical light reaction이 명확한 visual character. **포함: Metallic · Patent-like · High Gloss · Mirror/Reflective · Iridescent · Holographic · Sequin · Glitter · Sparkle · 기타 강한 light-reactive appearance.** 제작방식/소재 identity 구분 아님(sequin/metallic yarn/coating 구분 못해도 appearance 관측 시 보존). | Color Effect Metallic과 독립 보존(D8) |
| **S04** | **Pronounced Fur / Hairy Surface** | fur-like/hairy/pile surface 명확. 포함 short/long pile·fur-like·faux-fur-like·pronounced hairy. **real/faux 판별 안 함.** Coverage 별도 보존. | — |
| **S05** | **Pronounced Quilted Surface** | 반복 stitched/raised/recessed quilting structure가 명확한 surface pattern/visual character. | ⛔ **Padded/Lofted 자체는 자동 Evidence 아님**(일반 puffer padding/loft = No Effect). quilting≠단순 padding. |
| **S06** | **Pronounced Distressed Surface** | 의도적 physical surface disruption 명확. 포함 rip/tear/hole/fray/abrasion/destroyed. | ⛔ **Denim 자체는 Evidence 아님.** |
| **S07** | **Pronounced Treated / Washed Surface** | wash/bleach/acid/pronounced color depletion이 명확한 visual expression. 포함 acid wash·heavy bleach·strong irregular wash·pronounced uneven depletion. **Denim 한정 아님**(cotton/canvas/sweatshirt/jacket 등 공통). | ⛔ 일반 denim wash/normal fading = No Effect · `Faded` 별도 Evidence 안 만듦. |
| **S08** | **Pronounced Sheer / Transparent Surface** | 명확한 transparency/see-through로 underlying layer/body가 시각 인지. 포함 sheer·transparent·semi-transparent·mesh·net-like. **소재명(mesh/organza/chiffon) 판별 아님.** | **Surface Sheer ↔ Exposure(body visibility)는 독립 보존**(D9). |
| **S09** | **Pronounced Pleated Surface** | 반복 pleating이 명확한 surface character(garment surface 지배 repeated pleats). | ⛔ 일반 trouser single front pleat·작은 construction fold = 자동 Evidence 아님. |
| **S10** | **Pronounced Lace / Decorative Openwork** | 반복 lace-like/openwork/decorative open structure가 명확한 surface character. **반드시 transparent해야만 Expressive한 것 아님**(opaque lining이라도 복잡한 visible structure 명확 시 YES). | **Lace/Openwork ↔ Sheer/Transparency 독립 보존.** |

---

## 4. Decorative Detail Positive Expressive Evidence Set (4종 · CEO Approved)

| # | Evidence | 관측 정의(원문 반영) | 핵심 경계 |
|---|---|---|---|
| **D01** | **Pronounced Metal Hardware** | 장식적 존재감 명확한 metal-hardware-like appearance. 포함 multiple/prominent buckles·studs·spikes·chains·eyelets/grommets·prominent metal buttons·oversized/repeated zipper hardware. **real/plated/plastic 판별 불필요.** | ⛔ 기능성 zipper 하나·기본 button·작은 functional buckle = 자동 Evidence 아님. |
| **D02** | **Pronounced Applied Embellishment** | 부착된 decorative embellishment가 visual character 형성. 포함 crystal·rhinestone·beads·pearls·jewels·gem-like. | Reflective/Light-Reactive(S03)와 동시 관측 가능 — **Observation은 사실 모두 보존**(double count는 Synthesis). |
| **D03** | **Pronounced 3D Attached Objects** | garment surface 위 입체 decorative object 명확 부착. 포함 3D flowers·rosettes·bows·feathers·sculptural appliqué·3D ornaments·charms. 제작방식/소재 판별 불필요. | — |
| **D04** | **Pronounced Fringe / Tassel** | hanging strands/fringe/tassel structure가 명확한 decorative character. fabric-cut vs 부착 구분 무관. | ⛔ 작은 tassel 하나 = 자동 Evidence 아님(pronounced visual presence 필요). |

### Embroidery Decision (D5 · CEO Approved)
- **Standalone Embroidery Evidence = REJECTED.** (Vision에서 flat embroidery↔print/pattern 안정 구분 불요 · EI는 제작기법 자체를 Evidence로 요구 안 함.)
- 처리 원칙: flat/pattern-like embroidery → **기존 Pattern/Print observation pathway** · crystal/bead 결합 → **Applied Embellishment(D02)** · 명확 raised/3D → **3D Attached Objects(D03)** · 단순 제작기법=embroidery라는 사실 → **추가 EI Evidence 없음.** **Existing Vocabulary First.**

---

## 5. Explicit Surface/Material No-Effect Cases (D3)

> 아래는 **존재한다는 이유만으로 EI Surface Evidence가 되지 않는다.**
- Denim 자체 · 일반 Leather · Suede · **Velvet/Velour 자체** · 일반 Wool · 일반 Cotton · 일반 conventional fabric/material · **Padded/Lofted 자체** · 일반 denim wash · ordinary fading.
- 단, 해당 garment에 **다른 Positive Surface Evidence가 실제로 보이면 그 Evidence는 별도 관측**(예: Velvet 자체=No Effect · 그러나 pronounced reflective/high-gloss appearance 보이면 S03 YES 가능).

---

## 6. Coverage Observation Vocabulary (D6 · CEO Approved)

| 값 | 정의 |
|---|---|
| **Localized** | Evidence가 garment의 제한된 일부 영역에 나타남. |
| **Partial** | 상당 부분에 나타나나 garment 전체의 지배적 character는 아님. |
| **Dominant** | garment 대부분/전체에서 지배적 surface/decorative character. |

- Coverage는 Surface·Decorative Evidence와 함께 **독립 Observation으로 보존**(예: Fur+Localized · Quilted+Dominant · Metal Hardware+Partial · Lace/Openwork+Dominant).
- ⛔ **Localized/Partial/Dominant에 numeric score/weight/EI increment/formula/threshold 부여 0.** Coverage의 EI 영향 = 후속 Score Physics/Synthesis.

---

## 7. Observation vs Consumption Boundary (D7)

- **Observation은 보이는 사실을 보존한다. Consumption은 이후 설계한다.**
- 동일 garment에서 **복수 Evidence 동시 관측 허용**(예: crystal-covered → Applied Embellishment YES ∧ Reflective YES · lace sheer → Lace/Openwork YES ∧ Sheer YES). Observation 단계에서 강제 제거 안 함.
- 동일 Evidence가 DM/EI Surface/EI Exposure 등 복수 pathway 관측 가능해도 **Observation 사실 삭제 안 함.**
- ⛔ **본 Sprint 결정 금지:** double counting resolution · additive consumption · merge rule · interaction rule · priority · weighting · numeric contribution · EI final scoring. → EI Synthesis/Score Physics 후속.

---

## 8. Phase 1 Color Boundary (D8)

- Phase 1 Color Architecture **변경 없음.** Surface/Material은 Color와 겹치는 visual phenomenon이 있어도 **서로 다른 Observation 보존.**
- 예: Pronounced Washed Surface의 color variation 발생해도 Surface Treatment Evidence 보존 · Reflective/Metallic appearance ↔ Color Effect 동시 관측해도 **하나 제거/merge 안 함.** Overlap resolution = 후속.

---

## 9. Phase 3 Exposure Boundary (D9)

- Phase 3 Exposure Architecture **설계·수정 안 함.** Sheer/Transparent Evidence가 Exposure와 연결될 수 있으나:
  - **Surface** = material/surface transparency 관측 · **Exposure** = 실제 body visibility 관측.
- 두 Observation의 consumption 관계 = 후속 단계.

---

## 10. Candidate Map Reconciliation (D10)

> 원본 `STMX_EI_SURFACE_MATERIAL_CANDIDATE_MAP_V1.md`(historical study) **미수정** — 본 CURRENT canonical에 reconciliation table 생성.

| Candidate (Map V1) | Phase 2 결과 | 귀속 |
|---|:--:|---|
| Reflective(retro) | **APPROVED** | S03 Reflective/Light-Reactive |
| Glossy/High-Luster | **APPROVED** | S03 (High Gloss/Patent) |
| surface_finish metallic | **APPROVED** | S03 (Metallic appearance) |
| **Iridescent / Holographic** | **MERGED** | → S03 Reflective/Light-Reactive |
| **Sequin / Glitter / Sparkle** | **MERGED(포함)** | → S03 Reflective/Light-Reactive |
| Fur/Long-Pile(fabric) | **APPROVED** | S04 Fur/Hairy |
| Distressed | **APPROVED** | S06 Distressed |
| Washed/Treated | **APPROVED** | S07 Treated/Washed |
| body_visibility sheer / Mesh | **APPROVED**(Surface) | S08 Sheer/Transparent (Exposure 별도) |
| Pleated Surface | **APPROVED** | S09 Pleated |
| Lace / Decorative Openwork | **APPROVED** | S10 Lace/Openwork |
| Embossed exotic | **APPROVED** | S02 Exotic-Skin |
| Pronounced Textured(bouclé/tweed) | **APPROVED** | S01 Textured |
| Metal Hardware / Embellishment / 3D Objects / Fringe | **APPROVED** | D01–D04 Decorative |
| **Padded / Lofted (standalone)** | **REJECTED** | No-Effect(§5) · Quilted(S05)만 Evidence |
| **Denim identity (standalone)** | **REJECTED** | No-Effect(§5) |
| **Velvet / Suede (standalone)** | **REJECTED** | No-Effect(§5) |
| **Embroidery (standalone)** | **REJECTED** | D5 → Pattern/Embellishment/3D로 |
| Leather/Wool/Cotton (standalone) | **REJECTED** | No-Effect(§5) |
| fabric_behavior(fluid/structured) | **DEFERRED** | SR FROZEN 소유(Phase 2 비대상) |
| Embossed/Iridescent 관측 취약성 | **DEFERRED**(관측 신뢰도) | S02/S03 내 · Vision feasibility 후속 |

---

## 11. Open Issues / Deferred Decisions (D12)

- Surface/Decorative Evidence별 **EI score · Coverage numeric effect · evidence count effect · multiple evidence accumulation · Color+Surface / Surface+Exposure / Surface+DM interaction · duplicate consumption · weighting · formula · final EI tier mapping · Runtime wiring · Engine implementation** = **전부 Deferred(EI Synthesis/Score Physics).**
- Boundary(D8 Color overlap · D9 Sheer↔Exposure) resolution = 후속.
- Vision feasibility 취약 후보(S02 Exotic-Skin 해상도 · S03 Iridescent still-image) = 후속 validation.

---

## 12. CEO Approval Anchor
(상단 헤더 Approval Anchor 참조 · CEO Decision 2026-08-01 · ADR-096.)

---

## STOP
- **EI Phase 2 Surface/Material & Decorative Expression Observation Architecture = Canonically Updated to CEO-Approved State.**
- Scoring/Consumption/Interaction/Double-counting/Runtime = **NOT YET DESIGNED.** Phase 3/후속 Synthesis로 임의 진행 안 함. frozen/Engine/Runtime/Phase1/Phase3 미수정.

---

> **정직 고지:** ChatGPT–CEO Design Review 확정 Phase 2 Observation Decisions를 **원문 그대로** CURRENT Canonical에 반영했다 — Surface/Material Positive Evidence **10종(S01–S10)** · Decorative Positive Evidence **4종(D01–D04)** · Embroidery standalone REJECTED · No-Effect cases(Denim/Leather/Suede/Velvet/Wool/Cotton/Padded-Lofted/ordinary wash·fading) · Coverage vocabulary(Localized/Partial/Dominant · numeric 0). Iridescent/Holographic·Sequin/Glitter → S03 Reflective로 MERGED · Padded/Lofted·Denim·Velvet/Suede·Embroidery standalone = REJECTED. Observation vs Consumption 분리(overlap 보존·double-count/merge/interaction/weighting/scoring = Deferred) · Phase 1 Color·Phase 3 Exposure·DM/SR/TC·Engine 미수정. Candidate Map 원본은 수정하지 않고 reconciliation table을 CURRENT에 생성했다. Numeric/Formula/Weight/Runtime을 만들지 않았고 CEO 확정사항을 재해석·추가·삭제하지 않았다.
