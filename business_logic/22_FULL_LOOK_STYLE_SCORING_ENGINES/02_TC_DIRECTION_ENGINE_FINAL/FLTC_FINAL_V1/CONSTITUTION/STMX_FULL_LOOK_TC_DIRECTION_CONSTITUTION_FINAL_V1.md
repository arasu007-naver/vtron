# STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1

> **Status:** FINAL — becomes FROZEN only together with the release seal `FLTC-FINAL-FREEZE-V1-2026-10-25` (order §10). Date 2026-10-25.
> **Runtime:** `STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE` → production release `01_ENGINES/STYLE_SCORING_ENGINE/FLTC_FINAL_V1/` · engine identity `STMX_FULL_LOOK_TC_DIRECTION_ENGINE_V1`.
> **Controlled successor of:** the Product-Only V2 direction step (V2 candidate preserved unchanged). Approved semantics are cited, not rewritten.

> Approval Anchor — CEO Decision 2026-10-25 (order "STMX FULL-LOOK TC — FINAL MANDATORY SCORING CORRECTION, PRODUCTION FREEZE & VERIFIED BACKUP V1", verbatim `AUTHORIZATION/TC_FINAL_FREEZE_CEO_ORDER_VERBATIM.md`; conditional Final Freeze authorization §10). Reason: FCR-TC-1 — the V2 direction step withheld a direction on scorable looks, contrary to STMX-2026-10-AEMS. Affected Scope: Full-Look TC Direction only.

## 1. Purpose & Scope

Full-Look TC Direction returns, for one worn look described by one frozen Full-Look Vision evidence packet (`STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET` V1_RC4, Frozen Vision FLV-FINAL-FREEZE-V1-2026-10-17), exactly one of `CLASSIC | TRANSFORMATIVE`, or a technical input failure. Out of scope: TC Strength, TC1–TC9 projection, EI / SR / DM, four-axis composition, Item TC (frozen, `STMX_TC_ENGINE_V1`).

## 2. Product-Only Authority

`CEO_APPROVED_FULL_LOOK_TC_PRODUCT_ONLY_2026_10_23` (unchanged): a valid Transformative Product Departure on any participating garment → T; Classic garments never cancel it; products that keep their grammar → C; styling-created departure has no direction authority; the absence of styling evidence never blocks C. Wearing context (layering, exposure, securing) is reported, never decisive. TC-D-3 styling-only T is superseded for Full-Look TC; the V1 styling gates TC-S1 / S2 / S3 are not restored.

## 3. Input Evidence Contract

Input `{ packet, run_record }` of one image (frozen adapter `fl_tc_input_adapter_v1.js`, byte-identical since V1): packet contract + version, `requested_axes` ∋ TC, blocks `look_frame · component_registry · relations · canonical_exposure · common_visibility`, run_record parameters keyed `SVP-xxx@cN` consistent with the registry and the fact pool. Only OBSERVED values are read as values; `UNKNOWN · NOT_VISIBLE · ABSENT · not delivered` are kept as states. Look id, image ref, run id, file name and any GT are never read.

## 4. Valid Input / Technical Failure Boundary

The only non-direction outcome is `status = TECHNICAL_EXCEPTION`, `exception.class = INPUT_FAILURE`, `direction = null`, with one code:

| code | condition | AEMS clause |
|---|---|---|
| `INPUT_CONTRACT` | packet / run_record missing, unparsable or contract-invalid | no valid / unparsable packet |
| `NO_OBSERVABLE_WORN_LOOK` | SVP-001 `look_frame_state ≠ OBSERVED`, or limit `image_failure` / `not_a_worn_look` | not an evaluable Full-Look |
| `NO_GARMENT_OBSERVED` | no garment component (accessories / footwear only — outside the product gate, TC-D-4b) | no evaluable product evidence |
| `NO_TC_PRODUCT_EVIDENCE` | no valid departure **and** no garment carries Classic support (§6) — e.g. the only garment-like component has an UNKNOWN identity, or every product fact is unobserved | no evaluable product evidence (order §5.3 STEP 1) |

A frame limit `crop · lower_body_cropped · occlusion · feet_not_visible`, a missing fact, an unknown identity or a frozen interpretive gap is **never** an input failure on its own. An input failure is never a style class and is never used to hide missing observations.

## 5. Product Departure Definition

A product departure is valid only when the frozen Item TC Step 2 predicates (`STMX_TC_ENGINE_V1`, via the bound Step 2 successor V4, evaluator V2.3.2 / V2.2.1 / V2.2 base) return it for that garment's archetype key: a silhouette / proportion / construction channel `TRUE`, or the governed independent asymmetry departure. Evaluated per participating garment by the unchanged product stage `fl_tc_product_departure_v1.js` (frozen predicates · Item V1_3 domains · IX-1 (b) exclusion · pocket instances · irrelevance proof). No predicate, domain, envelope or key is re-implemented or extended.

## 6. Classic / Transformative Direction Rule

- **TC-P1 → TRANSFORMATIVE:** any participating garment carries a valid product departure (§5).
- **TC-C → CLASSIC:** no valid departure, and at least one identified garment has **Classic support** — a frozen silhouette / proportion / construction verdict `FALSE` that rests on an OBSERVED fact: silhouette FALSE ⇔ fit observed; proportion FALSE ⇔ length observed; construction FALSE counts only when at least one construction carrier the frozen predicate reads for that key is observed (read-set: every key material · surface · attachment · pocket; TOPS + jumpsuit + shoulder_connection; tshirt + collar · front_opening_extent; Tailored jacket / coat + sleeve · collar · closure_type · front_opening_extent; jumpsuit + waist_definition). The frozen C-1 rule also returns FALSE when nothing was observed; such a FALSE is not evidence.
- `resolved_by = DIRECT` when every garment is proven (V2 product sufficiency) and the frame is observed without limits that reduce evidence; `AVAILABLE_EVIDENCE` otherwise. Both are final directions.

## 7. Multiple Garment Precedence

One valid departure on any garment decides T (no majority, no count, no second gate). Otherwise C rests on the Classic support of the identified garments; a garment without Classic support contributes nothing. Accessories never take part (TC-D-4b).

## 8. Styling Non-Authority

Layer relations, wearing position, draping, tying, exposure events, securing relations and garment repurposing neither create T nor withhold C. They are returned in `evidence_trace.wearing_context` with `decisive: false`.

## 9. Missing Evidence Mandatory Scoring

STMX-2026-10-AEMS (CEO 2026-10-24): a scorable look always receives C or T from the evidence it carries. Missing facts, UNKNOWN identities, crop / occlusion frame limits and frozen interpretive gaps (`SIL-MORPH`, `PRO-TOKEN-UNKNOWN`, `U-KEY`, `CON-UNRES-*`, `ASYM-SOURCE-UNRESOLVED`) contribute **nothing** — they are neither Transformative nor Classic evidence, and no value is written into them. `UNKNOWN → CLASSIC` is impossible because C requires Classic support on observed facts; `missing → TRANSFORMATIVE` is impossible because T requires a frozen-valid departure. They are reported as the sensitivity of the result (§13).

## 10. Final relationship of TC-P0 / TC-P1 / TC-P2 / TC-PV

| V2 rule | V2 outcome | FINAL_V1 |
|---|---|---|
| TC-P1 | TRANSFORMATIVE | unchanged — TRANSFORMATIVE |
| TC-C | CLASSIC (only when every garment fully proven + frame clean) | CLASSIC on Classic support (§6); the V2 sufficiency becomes `resolved_by DIRECT` |
| TC-P0 | DIRECTION_UNRESOLVED (no garment) | input failure `NO_GARMENT_OBSERVED` |
| TC-P2 | DIRECTION_UNRESOLVED (garment not fully proven / unknown identity) | diagnostic only: `sensitive_to` sources `PRODUCT_EVIDENCE_MISSING · FROZEN_TOKEN_REPRESENTATION_GAP · COMPONENT_IDENTITY_UNKNOWN`; the direction follows §6, or `NO_TC_PRODUCT_EVIDENCE` when nothing is readable |
| TC-PV | DIRECTION_UNRESOLVED (frame not observed / crop / occlusion / image_failure) | frame not observed · image_failure · not_a_worn_look → `NO_OBSERVABLE_WORN_LOOK`; crop · lower_body_cropped · occlusion → diagnostic `FRAME_LIMIT` only. The frame check now precedes TC-P1 (an invalid frame is an input failure even when a garment would depart; 0 of the 43 packets affected) |

`DIRECTION_UNRESOLVED` is no longer an output value.

## 11. Forbidden Proxies

Look-id / REF-id branches · GT or reference lookup · SR direction or score · Item TC numeric scores or their sum · styling relations · accessory volume · confidence thresholds · departure counts · default values for unknown facts · new Vision parameters or re-extraction · paid API calls (G53 ACTIVE).

## 12. Frozen Item TC Dependency

Bound by name and hash, fail-closed at load (`fl_tc_authority_v1.js`, byte-identical since V1): Step 2 successor V4 `868850fdc40221c4…` (and through it the frozen evaluators and bound inputs), TC production authority `5b237300e9fc5b99…` (status COMPLETE_AND_CLOSED_AND_FROZEN required), Item Vision V1_3 rules `c22e59140deecb7e…`, Frozen Vision RC6 conditional gates `94cbb95945ef4986…`, FLV seal id. Item TC is not reopened; its own Item-level `DIRECTION_UNRESOLVED` / NOT_ELIGIBLE semantics are untouched.

## 13. Diagnostic / Provenance Output

`basis` (separate from the direction): `classic_support[]` (garment · channel · frozen rule · observed facts) · `departures[]` · `missing_observations[]` · `excluded_hidden_by_other_garment[]` · `unknown_identity[]` · `interpretive_gaps[]` · `frame_limits[]` · `sensitivity NONE | POSSIBLE` · `sensitive_to[]` (source + garment + the completion that could depart, when proven) · `possible_outcomes_if_observed[]`. T is `sensitivity NONE` (a valid departure is not cancelled). `rule_trace[]`, `evidence_trace` (garment traces identical to V2) and `authority_provenance` (constitution · anchors · pins · applied authorities) accompany every record. No score, strength, ordinal, tier, TC5 or Neutral is ever emitted.

## 14. Known Limitations

- **KL-1 Frozen interpretive gaps (V2 PO-R2):** frozen Item TC does not adjudicate preserved morphology (Voluminous sleeve · Strong shoulder · Extended span → `SIL-MORPH`) or unbound construction roles. They contribute nothing; F147 · F187 · F472 are CLASSIC on their other observed evidence with sensitivity POSSIBLE. Only a TC REOPEN DECISION could change this.
- **KL-2 Missing material facts (V2 PO-R3):** M269 sweater fit · REF_000622 T-shirt (every product fact cropped) · M214 shirt asymmetry could each create a departure if observed; the looks are CLASSIC with that completion named in `sensitive_to`.
- **KL-3 Unknown identities (V2 PO-R4):** F267 · F418 are CLASSIC from their identified garments; F033 has no identified garment → `NO_TC_PRODUCT_EVIDENCE`.
- **KL-4 Fit boundary (V2 PO-R5, Frozen Vision L-1 / A-2):** M178 trouser fit Oversized (human reference Relaxed) → T; with the reference value the look would be C. 14 of the 21 T looks rest only on `SIL-TRUE-OVERSIZED`, so the Vision fit boundary is TC-critical.
- **KL-5 REF_000622:** scorable for TC by packet structure (skirt fully observed) although SR treats it as an input failure (no upper SR facts) and an earlier image review called the source a lower-body product shot; the packet says `look_frame_state OBSERVED` and the runtime has no image access.
- **KL-6 Accuracy:** no Full-Look TC CEO GT exists; accuracy is not verified. Item TC GT proxy 2 garments (REF_000622 skirt TC4 ↔ C · F298 coat via REF_000183 TC7 ↔ T) — proxy only.
- **KL-7 Pocket density / hardware location** not transported by Vision V1 (0 looks affected).

## 15. Regression & Acceptance Results

43 sealed packets: 42 scorable → CLASSIC 21 / TRANSFORMATIVE 21 · input failure 1 (F033) · final UNRESOLVED 0 · V2 → V3 changes 9, all INTENDED_CORRECTION · unexplained 0 · deterministic. Candidate tests 54 / 54. Protected regression 14 / 14 runs as expected (TC V1 32 · TC V2 45 · sealed V1 / V2 ledgers reproduced · Item TC integrated runtime 26 / 26 · Step 2 successor V4 15 / 15 · Frozen Vision R1–R9 · FLSR_FINAL_V1 V1–V10 · SR R4 41 · G53 refusals; Item SR 45 / 46 = pre-existing F31 environment assertion). Figures are generated from `D3` / `D5` and the package manifests.

## 16. Version / Freeze / Reopen Policy

Frozen with the release seal `FLTC-FINAL-FREEZE-V1-2026-10-25` (only after F-01 … F-16 PASS). After the freeze: `FLTC_FINAL_V1/` and this constitution are never rebuilt or edited in place; any change of Full-Look TC Direction semantics, input boundary or dependencies requires a governed **Full-Look TC reopen decision** (reason · affected rule · migration · regression plan) and a new versioned successor. Item TC changes remain governed by the TC REOPEN rule. V1 / V2 candidates stay as historical comparison and rollback references.
