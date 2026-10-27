# D4 — FCR-TC-1 Detailed Correction Record

> FCR-TC-1 (recorded 2026-10-24 under STMX-2026-10-AEMS): TC Product-Only V2 returned `DIRECTION_UNRESOLVED` (rule TC-P2) on scorable looks. This record audits **all 9** V2-unresolved looks one by one (order §5.1 / §5.2). Generated from the V3 ledger and the V3 test results; the per-garment traces are those of the unchanged product stage (byte-identical to V2).

## 1. Reconciliation with the 2026-10-24 count of "8 scorable"

| source | scorable | excluded | basis |
|---|---|---|---|
| 2026-10-24 cross-axis review (MSFC D1) | 8 | REF_000622 (implicitly — PRODUCT_EVIDENCE_MISSING ×2 listed) | SR input-failure finding (REF_000622 has no upper SR fact) and an earlier image review ("lower-body product shot") |
| this audit — TC packet structure | 8 | F033 | REF_000622: c1 Skirt fully observed (Straight · Slim · Maxi Length · Knit) → Classic support; F033: no component identified as a garment (c1 UNKNOWN identity, only material / surface / attachment) → no fact the frozen TC predicates can read |

The count stays 8 + 1, but the technical failure is **F033**, not REF_000622. REF_000622 is not excluded because SR failed on it: the SR failure is upper-priority-specific; for Product-Only TC the skirt is a participating garment with complete product evidence. The resolver has no image access and no look-id branch, so the earlier image-level finding cannot and does not enter TC (disclosed as KL-5 in D2 §14).

## 2. Cause classes

| V2 reason | looks | cause in the frozen product stage | V3 handling |
|---|---|---|---|
| FROZEN_TOKEN_REPRESENTATION_GAP | F147 · F187 · F472 | frozen `SIL-MORPH` on observed morphology (Voluminous sleeve; F187 also Strong shoulder + Extended span) | gap contributes nothing; CLASSIC on proportion / construction (+ other garments) observed readings |
| PRODUCT_EVIDENCE_MISSING | M269 · REF_000622 · M214 | an unobserved fact would create a departure if completed (sweater fit=Oversized · T-shirt fit=Oversized · shirt asymmetry=Present) | completion named in `sensitive_to`; CLASSIC on the other garments' observed readings |
| COMPONENT_IDENTITY_UNKNOWN | F267 · F418 · F033 | a component whose identity Vision could not read | unknown component contributes nothing; F267 / F418 CLASSIC from identified garments; F033 has none → input failure |

## 3. Case-by-case analysis (10 items each)

### F147 (release_12)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c1 Sweater — fit="Relaxed", asymmetry="None", length="Long", sleeve_volume="Voluminous", shoulder_span="Regular", front_opening_extent="None", collar="Stand", sleeve="Long", shoulder_connection="Standard", pocket="None", surface=["Semi Transparent"], material=["Knit"] ; c2 T-Shirt — asymmetry="None", front_opening_extent="None", collar="None" ; c3 Trouser — silhouette="Straight", fit="Relaxed", asymmetry="None", length="Full Length", pocket="Present", pocket_construction="Inset", pocket_projection="Flat", material=["Cotton"] |
| 2 | evidence not observed | missing c2.sleeve_volume, c2.shoulder_connection, c2.surface, c2.material · hidden by another garment (IX-1 b) c2.fit, c2.length, c2.shoulder_span, c2.sleeve, c2.pocket · unknown identity none · frame limits none |
| 3 | frozen TC Step 2 result per garment | c1 Sweater (sweater): UNRESOLVED_FROZEN_INTERPRETIVE · SIL-MORPH / PRO-FALSE-Q7 / CON-FALSE-C1-RELATIONAL ; c2 T-Shirt (tshirt): NO_VISIBLE_DEPARTURE · SIL-STATE / PRO-STATE / CON-FALSE-C1 ; c3 Trouser (trouser): NO_VISIBLE_DEPARTURE · SIL-FALSE-LADDER / PRO-FALSE-Q2 / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · FROZEN_TOKEN_REPRESENTATION_GAP |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c1 Sweater: proportion PRO-FALSE-Q7 [length=Long] · construction CON-FALSE-C1-RELATIONAL [material=Knit, surface=Semi Transparent, pocket=None, shoulder_connection=Standard] ; c2 T-Shirt: construction CON-FALSE-C1 [collar=None, front_opening_extent=None] ; c3 Trouser: silhouette SIL-FALSE-LADDER [fit=Relaxed] · proportion PRO-FALSE-Q2 [length=Full Length] · construction CON-FALSE-C1 [material=Cotton, pocket=Present] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | FROZEN_TOKEN_REPRESENTATION_GAP@c1 [silhouette:SIL-MORPH] |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A01 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c1:proportion+construction c2:construction c3:silhouette+proportion+construction · sensitive_to FROZEN_TOKEN_REPRESENTATION_GAP |


### M269 (release_12)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c2 Shirt — collar="Shirt", sleeve="Long" ; c4 Sweater — asymmetry="None", length="Regular", closure_type="Button", front_opening_extent="Full", collar="None", material=["Knit"] ; c5 Jacket — fit="Relaxed", shoulder_structure="Mild", asymmetry="None", length="Hip Length", sleeve_volume="Regular", closure_type="Double Breasted Button", front_opening_extent="Full", collar="Peak", sleeve="Long", pocket="Present", pocket_construction=["Inset","Inset"], pocket_projection=["Flat","Flat"], waist_definition="Undefined", attachment=["Metal Hardware"] ; c8 Trouser — silhouette="Straight", fit="Regular", asymmetry="None", length="Ankle Length", pocket="Present", pocket_construction="Inset", pocket_projection="Flat" |
| 2 | evidence not observed | missing c2.material, c4.fit, c5.material, c8.material · hidden by another garment (IX-1 b) c2.fit, c2.asymmetry, c2.length, c2.sleeve_volume, c2.shoulder_span, c2.closure_type, c2.front_opening_extent, c2.shoulder_connection, c2.pocket, c4.sleeve_volume, c4.shoulder_span, c4.sleeve, c4.shoulder_connection, c4.pocket · unknown identity none · frame limits none |
| 3 | frozen TC Step 2 result per garment | c2 Shirt (shirt): NO_VISIBLE_DEPARTURE · SIL-STATE / PRO-STATE / CON-FALSE-C1 ; c4 Sweater (sweater): UNRESOLVED_MATERIAL_MISSING · SIL-STATE / PRO-FALSE-Q7 / CON-FALSE-C1 ; c5 Jacket (JACKET:Tailored): NO_VISIBLE_DEPARTURE · SIL-FALSE-LADDER / PRO-FALSE-Q5 / CON-FALSE-C1-RELATIONAL ; c8 Trouser (trouser): NO_VISIBLE_DEPARTURE · SIL-FALSE-LADDER / PRO-FALSE-Q2 / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · PRODUCT_EVIDENCE_MISSING |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c4 Sweater: proportion PRO-FALSE-Q7 [length=Regular] · construction CON-FALSE-C1 [material=Knit] ; c5 Jacket: silhouette SIL-FALSE-LADDER [fit=Relaxed] · proportion PRO-FALSE-Q5 [length=Hip Length] · construction CON-FALSE-C1-RELATIONAL [attachment=Metal Hardware, pocket=Present, sleeve=Long, collar=Peak, closure_type=Double Breasted Button, front_opening_extent=Full] ; c8 Trouser: silhouette SIL-FALSE-LADDER [fit=Regular] · proportion PRO-FALSE-Q2 [length=Ankle Length] · construction CON-FALSE-C1 [pocket=Present] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | PRODUCT_EVIDENCE_MISSING@c4 (could depart if fit=Oversized) |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A04 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c4:proportion+construction c5:silhouette+proportion+construction c8:silhouette+proportion+construction · sensitive_to PRODUCT_EVIDENCE_MISSING |


### F187 (release_12)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c1 Dress — silhouette="Straight", fit="Regular", shoulder_structure="Strong", asymmetry="None", length="Mini", sleeve_volume="Voluminous", shoulder_span="Extended", front_opening_extent="None", collar="None", sleeve="Short", shoulder_connection="Standard", pocket="Present", pocket_projection="Flat", waist_definition="Defined", slit="None", material=["Knit"] |
| 2 | evidence not observed | missing c1.pocket[0].construction, c1.pocket_construction · hidden by another garment (IX-1 b) none · unknown identity none · frame limits lower_body_cropped, feet_not_visible |
| 3 | frozen TC Step 2 result per garment | c1 Dress (dress): UNRESOLVED_FROZEN_INTERPRETIVE · SIL-MORPH / PRO-FALSE-Q2 / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · FROZEN_TOKEN_REPRESENTATION_GAP |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c1 Dress: proportion PRO-FALSE-Q2 [length=Mini] · construction CON-FALSE-C1 [material=Knit, pocket=Present] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | FROZEN_TOKEN_REPRESENTATION_GAP@c1 [silhouette:SIL-MORPH] · FRAME_LIMIT [lower_body_cropped] |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A02 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c1:proportion+construction · sensitive_to FROZEN_TOKEN_REPRESENTATION_GAP,FRAME_LIMIT |


### REF_000622 (release_12)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c1 Skirt — silhouette="Straight", fit="Slim", asymmetry="None", length="Maxi Length", pocket="None", slit="Present", material=["Knit"] ; c2 T-Shirt — no observed product value |
| 2 | evidence not observed | missing c2.fit, c2.asymmetry, c2.length, c2.sleeve_volume, c2.shoulder_span, c2.closure_type, c2.front_opening_extent, c2.collar, c2.sleeve, c2.shoulder_connection, c2.pocket, c2.surface, c2.material, c2.attachment · hidden by another garment (IX-1 b) none · unknown identity none · frame limits crop |
| 3 | frozen TC Step 2 result per garment | c1 Skirt (skirt): NO_VISIBLE_DEPARTURE · SIL-FALSE-SLIM-Q1 / PRO-FALSE-Q2 / CON-FALSE-C1 ; c2 T-Shirt (tshirt): UNRESOLVED_MATERIAL_MISSING · SIL-STATE / PRO-STATE / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · PRODUCT_EVIDENCE_MISSING |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c1 Skirt: silhouette SIL-FALSE-SLIM-Q1 [fit=Slim] · proportion PRO-FALSE-Q2 [length=Maxi Length] · construction CON-FALSE-C1 [material=Knit, pocket=None] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | PRODUCT_EVIDENCE_MISSING@c2 (could depart if fit=Oversized) · FRAME_LIMIT [crop] |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A05 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c1:silhouette+proportion+construction · sensitive_to PRODUCT_EVIDENCE_MISSING,FRAME_LIMIT |


### F033 (cv2_31)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c1 identity UNKNOWN — SVP-004="fastened", SVP-121="Repeat", material=["Wool"], SVP-125=["Piping"] (colour cells SVP-005 / 006 omitted: not TC product facts) |
| 2 | evidence not observed | missing none · hidden by another garment (IX-1 b) none · unknown identity c1 · frame limits none |
| 3 | frozen TC Step 2 result per garment | no garment evaluated |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · COMPONENT_IDENTITY_UNKNOWN |
| 5 | decidable from the other observed evidence? | NO — no garment is identified, so no frozen predicate can read any fact (packet structure: registry 0 garments; unknown c1) |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): none |
| 7 | final direction | INPUT_FAILURE (NO_TC_PRODUCT_EVIDENCE) |
| 8 | general rule applied | Constitution §4 — NO_TC_PRODUCT_EVIDENCE (no departure and no Classic support anywhere); the same rule applies to any look |
| 9 | residual uncertainty (sensitivity POSSIBLE) | COMPONENT_IDENTITY_UNKNOWN@c1 |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A09 PASS | INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · registry UNKNOWN,belt,footwear,jewellery |


### F267 (cv2_31)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c1 Sweater — fit="Regular", asymmetry="None", sleeve_volume="Regular", shoulder_span="Regular", closure_type="Button", sleeve="Short", shoulder_connection="Standard", pocket="None", surface=["Textured Knit"], material=["Knit"] ; c3 Trouser — silhouette="Straight", fit="Relaxed", asymmetry="None", length="Full Length", pocket="Present", pocket_construction="Inset", pocket_projection="Flat", material=["Denim"] ; c2 identity UNKNOWN — surface=["Semi Transparent"] |
| 2 | evidence not observed | missing c1.front_opening_extent · hidden by another garment (IX-1 b) c1.length, c1.collar · unknown identity c2 · frame limits occlusion |
| 3 | frozen TC Step 2 result per garment | c1 Sweater (sweater): NO_VISIBLE_DEPARTURE · SIL-FALSE-LADDER / PRO-STATE / CON-FALSE-C1 ; c3 Trouser (trouser): NO_VISIBLE_DEPARTURE · SIL-FALSE-LADDER / PRO-FALSE-Q2 / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · COMPONENT_IDENTITY_UNKNOWN |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c1 Sweater: silhouette SIL-FALSE-LADDER [fit=Regular] · construction CON-FALSE-C1 [material=Knit, surface=Textured Knit, pocket=None, shoulder_connection=Standard] ; c3 Trouser: silhouette SIL-FALSE-LADDER [fit=Relaxed] · proportion PRO-FALSE-Q2 [length=Full Length] · construction CON-FALSE-C1 [material=Denim, pocket=Present] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | COMPONENT_IDENTITY_UNKNOWN@c2 · FRAME_LIMIT [occlusion] |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A07 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c1:silhouette+construction c3:silhouette+proportion+construction · sensitive_to COMPONENT_IDENTITY_UNKNOWN,FRAME_LIMIT |


### F418 (cv2_31)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c4 Skirt — silhouette="Widening", fit="Voluminous", asymmetry="None", length="Maxi Length", slit="None", surface=["Textured Knit"], material=["Knit"] ; c2 identity UNKNOWN — SVP-121="Linear", surface=["Textured Knit"], material=["Knit"] ; c3 identity UNKNOWN — SVP-121="Repeat", material=["Knit"] |
| 2 | evidence not observed | missing none · hidden by another garment (IX-1 b) c4.pocket · unknown identity c2, c3 · frame limits feet_not_visible |
| 3 | frozen TC Step 2 result per garment | c4 Skirt (skirt): NO_VISIBLE_DEPARTURE · SIL-FALSE-VOLUM-Q3 / PRO-FALSE-Q2 / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · COMPONENT_IDENTITY_UNKNOWN |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c4 Skirt: silhouette SIL-FALSE-VOLUM-Q3 [fit=Voluminous] · proportion PRO-FALSE-Q2 [length=Maxi Length] · construction CON-FALSE-C1 [material=Knit, surface=Textured Knit] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | COMPONENT_IDENTITY_UNKNOWN@c2 · COMPONENT_IDENTITY_UNKNOWN@c3 |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A08 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c4:silhouette+proportion+construction · sensitive_to COMPONENT_IDENTITY_UNKNOWN,COMPONENT_IDENTITY_UNKNOWN |


### F472 (cv2_31)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c1 Jacket — fit="Relaxed", shoulder_structure="None", asymmetry="None", length="Waist Length", sleeve_volume="Voluminous", closure_type="Zipper", front_opening_extent="Full", sleeve="Long", material=["Fur"], attachment=["Metal Hardware"] ; c2 Trouser — silhouette="Tapered", fit="Slim", asymmetry="None" |
| 2 | evidence not observed | missing c1.collar, c1.pocket, c2.length, c2.pocket, c2.material · hidden by another garment (IX-1 b) none · unknown identity none · frame limits none |
| 3 | frozen TC Step 2 result per garment | c1 Jacket (JACKET:Casual): UNRESOLVED_FROZEN_INTERPRETIVE · SIL-MORPH / PRO-FALSE-Q5 / CON-FALSE-C1 ; c2 Trouser (trouser): NO_VISIBLE_DEPARTURE · SIL-FALSE-SLIM-Q1 / PRO-STATE / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · FROZEN_TOKEN_REPRESENTATION_GAP |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c1 Jacket: proportion PRO-FALSE-Q5 [length=Waist Length] · construction CON-FALSE-C1 [material=Fur, attachment=Metal Hardware] ; c2 Trouser: silhouette SIL-FALSE-SLIM-Q1 [fit=Slim] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | FROZEN_TOKEN_REPRESENTATION_GAP@c1 [silhouette:SIL-MORPH] |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A03 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c1:proportion+construction c2:silhouette · sensitive_to FROZEN_TOKEN_REPRESENTATION_GAP |


### M214 (cv2_31)

| # | item | finding |
|---|---|---|
| 1 | available product evidence (observed values) | c1 Jacket — fit="Slim", shoulder_structure="None", asymmetry="None", length="Waist Length", sleeve_volume="Regular", closure_type="Zipper", front_opening_extent="Full", collar="Shirt", sleeve="Long", pocket="Present", pocket_construction="Applied", pocket_projection="Flat", material=["Suede"], attachment=["Fur Trim","Metal Hardware"] ; c2 Shirt — no observed product value ; c3 Trouser — silhouette="Straight", fit="Relaxed", asymmetry="None", length="Ankle Length", material=["Denim"] |
| 2 | evidence not observed | missing c2.asymmetry, c2.closure_type, c2.front_opening_extent, c2.surface, c2.material, c2.attachment · hidden by another garment (IX-1 b) c2.fit, c2.length, c2.sleeve_volume, c2.shoulder_span, c2.collar, c2.sleeve, c2.shoulder_connection, c2.pocket, c3.pocket · unknown identity none · frame limits none |
| 3 | frozen TC Step 2 result per garment | c1 Jacket (JACKET:Casual): NO_VISIBLE_DEPARTURE · SIL-FALSE-SLIM-Q1 / PRO-FALSE-Q5 / CON-UNRES-ATTACHMENT-ROLE-NOT-OBSERVED ; c2 Shirt (shirt): UNRESOLVED_MATERIAL_MISSING · SIL-STATE / PRO-STATE / CON-FALSE-C1 ; c3 Trouser (trouser): NO_VISIBLE_DEPARTURE · SIL-FALSE-LADDER / PRO-FALSE-Q2 / CON-FALSE-C1 |
| 4 | V2 rule that withheld a direction | TC-P2 · VISION_LIMITATION · PRODUCT_EVIDENCE_MISSING |
| 5 | decidable from the other observed evidence? | YES |
| 6 | evidence for / against a product departure | for T: no frozen departure on any garment · against (Classic support): c1 Jacket: silhouette SIL-FALSE-SLIM-Q1 [fit=Slim] · proportion PRO-FALSE-Q5 [length=Waist Length] ; c3 Trouser: silhouette SIL-FALSE-LADDER [fit=Relaxed] · proportion PRO-FALSE-Q2 [length=Ankle Length] · construction CON-FALSE-C1 [material=Denim] |
| 7 | final direction | CLASSIC · resolved_by AVAILABLE_EVIDENCE |
| 8 | general rule applied | Constitution §6 TC-C — no valid frozen departure + Classic support on observed facts; missing / unknown / gap facts contribute nothing (§9) |
| 9 | residual uncertainty (sensitivity POSSIBLE) | FROZEN_TOKEN_REPRESENTATION_GAP@c1 [construction:CON-UNRES-ATTACHMENT-ROLE-NOT-OBSERVED] · PRODUCT_EVIDENCE_MISSING@c2 (could depart if asymmetry=Present) |
| 10 | new CEO semantics required? | NO — application of STMX-2026-10-AEMS + Product-Only + frozen Step 2 validity (D2 §6 · §9); no frozen rule read differently, no fact written |
| test | A06 PASS | CLASSIC TC-C AVAILABLE_EVIDENCE · support c1:silhouette+proportion c3:silhouette+proportion+construction · sensitive_to FROZEN_TOKEN_REPRESENTATION_GAP,PRODUCT_EVIDENCE_MISSING |


## 4. General-path check (order §6.2: TC-P0 / TC-P2 / TC-PV must not block normal inputs anywhere)

| path | V2 effect | V3 effect | test evidence |
|---|---|---|---|
| TC-P2 (garment not fully proven / unknown identity) | DIRECTION_UNRESOLVED | diagnostic only | G07 PASS — 1169 single-fact omissions · bad  · R02 PASS · R03 PASS · R04 PASS · R11 PASS |
| TC-PV (frame limit) | DIRECTION_UNRESOLVED | crop / occlusion / lower_body_cropped = diagnostic; not observed / image_failure / not_a_worn_look = input failure | G04 PASS — 42 / 42 keep their direction · E03 PASS |
| TC-P0 (no garment) | DIRECTION_UNRESOLVED | input failure NO_GARMENT_OBSERVED | E04 PASS |

## 5. Guard against "Classic by default"

| check | result | evidence |
|---|---|---|
| G05 missing evidence is never Classic evidence: removing every Classic-support fact of the 8 corrected looks (set UNKNOWN) → never CLASSIC (input failure when nothing else is observed) | PASS | F147 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · F187 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · F472 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · M269 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · REF_000622 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · M214 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · F267 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE · F418 INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE |
| G06 C is evidence-sensitive, not a default: completing the reported sensitive fact toward its departure flips the look to T (M269 sweater fit · M214 shirt asymmetry · F418 unknown top identified as an Oversized sweater) | PASS | TRANSFORMATIVE TC-P1 DIRECT · TRANSFORMATIVE TC-P1 DIRECT · TRANSFORMATIVE TC-P1 DIRECT |
| E02 every CLASSIC has Classic support resting on OBSERVED facts (each listed fact is OBSERVED in the run_record) | PASS | 21 CLASSIC looks |
| R11 very limited product evidence: one garment with only its length observed → CLASSIC (AVAILABLE_EVIDENCE, POSSIBLE); nothing observed → input failure, never CLASSIC | PASS | CLASSIC TC-C AVAILABLE_EVIDENCE / INPUT_FAILURE NO_TC_PRODUCT_EVIDENCE |

## 6. Accuracy and representability (order §8)

- Full-Look TC CEO adjudications of the 43 looks: 0 (register mention ADJ-TC-04 names M320 only to say the case is not M320). Accuracy NOT verified.
- Item TC GT proxy (garment level, reported apart): F298 / REF_000183 Coat TC7 (TRANSFORMATIVE) vs V3 TRANSFORMATIVE · REF_000622 / REF_000622 Skirt TC4 (CLASSIC) vs V3 CLASSIC — same pole 2 / 2.
- M178: packet trouser fit Oversized → TRANSFORMATIVE TC-P1; with the reference fit Relaxed (in-memory counterfactual) → CLASSIC TC-C. KNOWN_LIMITATION — Vision observation boundary (frozen L-1 / A-2); the frozen predicate applies the approved rule to the value it receives; not a mandatory-scoring conflict (the look is scored either way).
- 14 of 21 Transformative looks rest only on `SIL-TRUE-OVERSIZED` — the frozen Vision fit boundary is TC-critical (KL-4).
- Looks with a frozen interpretive gap: 13 (F147 CLASSIC, M323 TRANSFORMATIVE, M178 TRANSFORMATIVE, F187 CLASSIC, M320 TRANSFORMATIVE, F074 TRANSFORMATIVE, F134 CLASSIC, F146 TRANSFORMATIVE, F372 CLASSIC, F472 CLASSIC, M120 CLASSIC, M214 CLASSIC, M309 TRANSFORMATIVE); each is still scored (KL-1).
- Known limitations vs the mandatory-scoring rule: V2 PO-R2 frozen interpretive gap (F147 · F187 · F472) → RESOLVED (scored) · V2 PO-R3 material fact missing (M269 · REF_000622 · M214) → RESOLVED (scored) · V2 PO-R4 unknown identity (F033 · F267 · F418) → RESOLVED (scored / input boundary) · V2 PO-R5 M178 fit boundary → NONE (accuracy limitation only) · V2 PO-R6 pocket density / hardware locations not transported → NONE.
