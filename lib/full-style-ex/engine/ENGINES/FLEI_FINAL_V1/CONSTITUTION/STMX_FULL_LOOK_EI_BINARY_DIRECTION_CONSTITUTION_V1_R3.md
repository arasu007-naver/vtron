# STMX_FULL_LOOK_EI_BINARY_DIRECTION_CONSTITUTION_V1_R3 — consolidated text of the frozen Full-Look EI V1 runtime

> **Status:** the constitution of the frozen release `STMX_FULL_LOOK_EI_DIRECTION_ENGINE_FINAL_V1` (`01_ENGINES/STYLE_SCORING_ENGINE/FLEI_FINAL_V1/`), consolidated at the Final Freeze of 2026-10-26.
>
> **This document restates; it does not change.** The id is the one the runtime binds (`fl_ei_authority_v1.js` `CONSTITUTION_ID`). Every rule below is the rule the byte-identical V1_R3 runtime executes.
>
> **Sources:**
> - base constitution: EIBI `D3_FULL_LOOK_EI_BINARY_CONSTITUTION.md` (sha `92ccaada…`);
> - R1 / R2 / R3 corrections: the rule headers of `src/fl_ei_evidence_v1.js` and their governance packages;
> - CEO decisions: Decision Log STMX-2026-10-FLEI-SEMANTICS-DEC-1-3 · STMX-2026-10-FLEI-DEC-4-BINARY · STMX-2026-10-FLEI-R1-CASE-ADJUDICATIONS · STMX-2026-10-FLEI-R2-POCKET-SQUARE-CLARIFICATION · STMX-2026-10-FLEI-R3-FINAL-CONTRACT-CORRECTION.
>
> **Known accepted limitation:** FL-EI-LIM-F228-001 (see `GOVERNANCE/`).

## 1. Scope

Full-Look EI **direction** of one completed, worn look, from one Frozen Full-Look Vision evidence packet:
- packet contract `STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET`, version `V1_RC4`;
- Vision freeze `FLV-FINAL-FREEZE-V1-2026-10-17`.

Out of scope: EI Strength, ladders and scores. Item EI is a different object and stays unchanged. TC, SR and DM are out of scope, and so is four-axis integration.

## 2. Directions (EI-DEC-4)

`EXPRESSIVE | INTROVERT` are the only Full-Look EI directions. NEUTRAL is not a Full-Look EI output; Item EI Neutral is unchanged.

## 3. Evaluation sequence (conceptual, not a formula)

1. **Valid input.** The input must satisfy the frozen packet contract V1_RC4 with EI requested. The look frame must be OBSERVED and not `image_failure` / `not_a_worn_look`. The registry must hold at least one component.
2. **Observed view.** The runtime reads, without rewriting:
   - component identity and subtype;
   - colour composition: field, points, partial, unreadable;
   - canonical exposure;
   - cells SVP-101 / 102 / 121 – 126.

   UNKNOWN stays UNKNOWN.
3. **Colour base.** Each colour is read with its frozen Base Character (Registry V3 `base_character`). Lightness never changes it.
   - **Non-Expressive:** black · gray · navy · beige · brown · khaki.
   - **Expressive:** white_family · blue · green · mint · olive · red · wine · pink · purple · yellow · orange · camel · gold · silver.
   - **Contextual colours** (contribute no E) come from the Registry V3 row for the garment category × product context. For example, white_family on every Shirt and T-Shirt; black / gray / navy on tailoring.
   - The Registry is never a Neutral output.
4. **Valid expressive evidence.** One basis is enough, and nothing cancels it:
   - **F** — an Expressive-base garment field that is not Contextual for that garment.
   - **AF** — an Expressive colour forming the field of a worn accessory.
   - **PT** — a colour point that is Expressive, Distinct, on a known carrier, not Contextual, and not a closure / pocket colour or metal hardware. It is subject to ACC-1 / ACC-2 / PS-1 (§4).
   - **PG** — an observed pattern with at least one pattern-carried colour that is Distinct.
   - **GR** — a Dominant graphic with at least one Distinct graphic colour.
   - **EX** — a Class A exposure (Shoulder · Chest / Décolletage · Midriff / Waist · Back · Upper Thigh) that is garment-intrinsic or styling-created and has a carrier. It is subject to EX-1 / EX-2.

   Pattern- and graphic-carried colours are absorbed into PG / GR and never counted again as points.
5. **Whole-look direction.** At least one valid basis gives EXPRESSIVE (rule EI-E). Otherwise the look is INTROVERT (rule EI-I), and its record states:
   - the observed bases;
   - the elements that did not qualify, and why;
   - the unobserved facts.

## 4. Case-adjudication rules (R1 · R2 · R3)

| rule | content |
|---|---|
| ACC-1 (R3) | A white_family / camel non-metallic point on an accessory is an ordinary colour difference unless the colour is carried by an observed D02 – D04 ornament (Phase 2 canonical, read through the frozen Vision COVERAGE_EVIDENCE_MAP). No accessory category qualifies or is excluded by itself. |
| ACC-2 (R3) | Functional metal (Metal Hardware · Buckle · eyewear Frame · watch Case) qualifies only with an observed D02 Applied Embellishment on the same component. |
| PS-1 (R3) | A pocket square is a conventional formal completion only when three facts are observed: (a) no expressive effect of its own; (b) its colour is an observed shirt colour; (c) a bow tie is registered. Otherwise it is judged only by the governed point rule. A needed fact that is not observed leaves the role undetermined, and the square is not counted. |
| EX-1 (R1) | A Chest / Décolletage event on Shirts only, realized_state, with no other realized Class A event on that shirt = the ordinary collar opening. |
| EX-2 (R1) | An Upper Thigh event on Trousers (shorts) only = ordinary leg visibility. |

## 5. Never E evidence

- an accessory's presence;
- a colour difference that is not Distinct;
- a Contextual colour on its garment;
- closure / pocket / metal-hardware colours;
- a pattern or graphic by presence alone;
- surface token names (S-classes are reported, never a basis alone — a token never fixes force);
- a DM Detail status (V1 reads no `dm_evidence`);
- counts, ratios, averages, majorities;
- the wearer's intent;
- anything not in the packet.

## 6. Mandatory scoring (STMX-2026-10-AEMS)

Every scorable packet ends EXPRESSIVE or INTROVERT. Input failures are separate (TECHNICAL_EXCEPTION / INPUT_FAILURE): `INPUT_CONTRACT` · `NO_OBSERVABLE_WORN_LOOK` · `NO_COMPONENT_OBSERVED`.

No NEUTRAL, UNKNOWN, UNRESOLVED, EVIDENCE_REPAIR_REQUIRED or INSUFFICIENT_EVIDENCE output exists. No re-extraction is ever requested. A missing observation contributes nothing and is never written as a Non-Expressive fact.

## 7. Firewalls

- No look id, file name, image ref or GT is read for a decision.
- No other-axis state, score or direction is read (G-EI10). Raw DM evidence is not consumed in V1.
- Authorities are bound by name and hash (fail-closed): Registry V3 · state machine V1.1.1 · Neutral Colour Authority · Body Exposure Two-Class · Colour V1 contract · Item EI production authority · FLV freeze seal · Phase 2 canonical · frozen producer rules.

## 8. Known accepted limitation (V1)

**FL-EI-LIM-F228-001.** The CEO GT for F228 is EXPRESSIVE; the V1 runtime gives INTROVERT. This is a known incorrect prediction, accepted for V1 closure only (CEO order 2026-10-26).
- The decisive design phenomena are either not represented at sufficient resolution in the packet, or recorded only in the DM transport, which V1 does not consume.
- No approved general rule reproduces the GT. SC-1 is not approved.

The CEO GT is retained. GT agreement on the whole-look GT set is 3 / 4.

## 9. Reopen

Any change to Full-Look EI semantics, this constitution, the runtime or its dependencies requires an explicit governed **Full-Look EI reopen decision**, for example a future V2 workstream. The frozen release is never rebuilt in place.
