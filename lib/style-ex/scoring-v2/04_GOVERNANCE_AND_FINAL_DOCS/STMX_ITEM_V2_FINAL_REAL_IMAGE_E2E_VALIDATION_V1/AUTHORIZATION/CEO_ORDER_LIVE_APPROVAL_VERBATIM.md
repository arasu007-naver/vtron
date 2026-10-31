# CLAUDE EXECUTION ORDER

## STMX ITEM SCORING V2 — CEO-APPROVED FINAL LIVE E2E EXECUTION, FOUR-AXIS VALIDATION & FREEZE READINESS

**Date:** 2026-10-29  
**Execution Model:** Opus 5.5  
**Project:** STMX Engine Architecture  
**Status:** CEO APPROVED — LIMITED LIVE API EXECUTION

---

# §0. CEO AUTHORIZATION — G53 TEMPORARY EXCEPTION

The CEO explicitly approves a one-time, bounded exception to Architecture Guard G53 for the final Item Scoring V2 real-image End-to-End validation.

**Approval Anchor**

CEO decision, 2026-10-29:

> "좋아 승인, 승인하고 오더 작성해 줘."

This approval refers specifically to the immediately preceding proposal:

- Seven fixed real product images
- Production Item Vision V1.3
- Sealed Target-Aware Colour successor
- Integrated Item Scoring V2 R4
- Model `claude-opus-4-8`
- Four-axis Direction validation
- 14 planned successful API calls
- 16 maximum HTTP attempts
- USD 8.00 absolute spending ceiling

**This approval is for this experiment only.**

It does not authorize any general relaxation of G53.

## §0.1 Authorized Images

Exactly the following seven images are authorized:

1. REF_000520
2. REF_000010
3. REF_000841
4. REF_000840
5. REF_000810
6. REF_000816
7. REF_000849

Use their exact local source files and SHA-256 identities as recorded in:

`STMX_ITEM_V2_FINAL_REAL_IMAGE_E2E_VALIDATION_V1/AUTHORIZATION/PREREGISTERED_PLAN_E2E.json`

No other images are authorized.

## §0.2 API Limits

```text
PROVIDER = ANTHROPIC MESSAGES API
MODEL = claude-opus-4-8

VISION_PRODUCER = STMX_VISION_PRODUCER_V1_3
COLOUR_PRODUCER = SEALED_TARGET_AWARE_COLOUR_SUCCESSOR
SCORING_RUNTIME = INTEGRATED_ITEM_V2_R4

AUTHORIZED_IMAGES = 7

PLANNED_VISION_CALLS = 7
PLANNED_COLOUR_CALLS = 7

MAX_ACCEPTED_INFERENCE_OUTPUTS = 14
MAX_HTTP_ATTEMPTS = 16
MAX_INFRASTRUCTURE_RETRIES = 2

HARD_COST_CEILING_USD = 8.00

SCORING_API_CALLS = 0
ADDITIONAL_IMAGES = 0
MODEL_SUBSTITUTIONS = 0
FROZEN_ENGINE_MODIFICATIONS = 0
```

The two additional HTTP attempts are permitted only for transport failures confirmed not to have produced a billable inference.

If billing status is uncertain, do not retry automatically.

No retries for unfavorable or incorrect scoring results.

Never exceed 14 accepted inference outputs or 16 total HTTP attempts.

Before each request, verify that cumulative expenditure plus a conservative upper-bound cost for the next attempt remains within USD 8.00.

Stop before any attempt that could violate the cap.

## §0.3 Exception Registration

Before the first API call:

1. Save this entire CEO order verbatim.
2. Verify the CEO Approval Anchor.
3. Register a scope-limited G53 temporary exception using the established append-only governance procedure.
4. Record the seven image hashes, model, producer versions, request limits, cost ceiling and expiry rules.
5. Verify the executable runner is identical to the prepared gated runner.
6. Verify all predecessor seals and protected hashes.

The temporary exception expires automatically at the earliest of:

- 14 accepted outputs
- 16 total HTTP attempts
- USD 8.00 spending ceiling
- Completion or termination of this execution order
- Model, prompt or image identity mismatch
- Governance or authorization violation

On expiry:

`G53 = FULLY ACTIVE`

Do not leave a reusable exception.

---

# §1. EXECUTIVE DIRECTIVE

The STMX Item Scoring V2 development program is complete at the candidate implementation level.

Completed components:

- Frozen Item EI V2
- Frozen Item TC V2
- Frozen Item SR V2
- Frozen Item DM V2
- Suit TC/SR/DM successors
- Product Selection
- Target-Aware Colour successor
- Integrated Runtime R4

All these components have passed their reported offline regression tests.

**The objective of this order is to validate the existing system with real images and reach a Final Freeze decision.**

Do not reopen scoring architecture.

Do not develop another engine.

Do not implement new scoring rules.

Do not create a separate Reason improvement project.

Do not initiate unrelated research.

This is an execution and validation order, not a development order.

---

# §2. SOURCE OF TRUTH & PRE-EXECUTION

Read the current Project Context in the established mandatory order:

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

Then load the previous Order O package:

`STMX_ITEM_V2_FINAL_REAL_IMAGE_E2E_VALIDATION_V1`

Reuse:

- Pre-registered test plan
- Seven verified image identities
- CEO GT mapping
- Product-scoring-unit mapping
- Gated live runner
- Vision prompt and model pins
- Target-aware Colour invocation contract
- Existing offline regression
- Previously tested no-network dry run

**Do not rebuild a new runner or repeat completed research.**

Perform a short PRE Design Review and integrity verification.

If the stored source hashes, production prompt or approved model do not match, stop and report the discrepancy.

---

# §3. EXECUTE FINAL LIVE E2E

Use this exact processing chain:

```text
REAL PRODUCT IMAGE
        ↓
PRODUCT TARGET / COMMERCIAL SUIT IDENTIFICATION
        ↓
ITEM VISION V1.3
        ↓
TARGET-AWARE COLOUR
        ↓
INTEGRATED ITEM SCORING V2 R4
        ↓
EI / TC / SR / DM
        ↓
FOUR DIRECTIONS
FOUR KOREAN REASONS
```

For each of the seven images:

1. Verify source SHA-256.
2. Use the pre-registered Scoring Unit.
3. Run Item Vision V1.3 using the approved model.
4. Preserve the original raw Vision output.
5. Run Target-Aware Colour with the approved target manifest.
6. Preserve the original Colour output.
7. Validate actual Colour-to-Target association.
8. Supply the actual Vision and Colour evidence to Integrated R4.
9. Execute the four Frozen scoring paths.
10. Save the actual Directions and Korean Reasons.
11. Compare results against the separately pre-registered expected Direction values.
12. Record PASS / FAIL for each axis.

No GT or expected Direction may enter the inference prompt.

Do not manually correct extracted evidence before scoring.

Do not change input values to obtain favorable results.

---

# §4. TEST-SPECIFIC REQUIREMENTS

## REF_000520 — Ordinary Item

Verify that a standard single product produces four Directions from actual Vision and Colour evidence.

## REF_000010 — Selected Product

Evaluate the pre-registered Jacket product.

Verify that Shirt and Trouser colours do not contaminate the selected product.

## REF_000841 — Commercial Suit SR

Apply the current CEO-approved Suit Upper Priority rule.

The Jacket's realized silhouette governs SR.

Expected Suit SR Direction: **S**.

Preserve the original historical SR4 GT separately.

## REF_000840 — Commercial Suit TC

Verify the existing Suit Product-Level Departure rule.

The actual qualifying Departure must be present in the extracted evidence.

Do not invent a Departure to match the expected outcome.

## REF_000810 — Commercial Suit DM Detail

Verify the qualifying Designed Detail Point/System and member association.

The actual extracted evidence must support the resulting Direction.

## REF_000816 — Commercial Suit DM Minimal

Verify that the current valid Vision evidence does not establish a qualifying Designed Detail under the governed rule.

Do not use legacy missing DM blocks to manufacture Minimal.

## REF_000849 — Multi-Target Colour

Evaluate the pre-registered Jacket and Trouser as separate merchandise targets.

Verify correct Colour ownership and independent four-axis output.

This must remain within the authorized one-Vision-call and one-Colour-call budget for the image.

If the approved current Colour contract cannot establish the required target identities within the existing call scope, report the limitation. Do not add unauthorized calls.

---

# §5. FINAL DIRECTION VALIDATION

The principal acceptance criterion is **Direction correctness**.

For each valid scoring unit:

| Axis | Final Direction |
|---|---|
| EI | E / I / permitted Item Commercial Neutral |
| TC | C / T |
| SR | S / R |
| DM | D / M |

Use the existing Frozen V2 scoring constitutions without modification.

Verify:

- Correct product identity
- Correct Vision observations
- Correct Colour ownership
- Correct Suit member association
- Correct four-axis Directions

Historical CEO GT values must be interpreted through the actual governed scoring-unit and Direction mapping.

Do not automatically treat a historical score of 5 as a valid final Neutral for an axis where Neutral is prohibited.

Pre-registered historical expectations and successor-rule expectations must be distinguished.

## Previously Identified Mismatches

The offline rehearsal reported:

- EI mismatches: 3
- REF_000849 TC mismatches: 2

Verify these using fresh live evidence.

For each mismatch:

- Show original expectation.
- Show actual Direction.
- Show the decisive Vision/Colour evidence.
- Identify whether the disagreement comes from observation, product association, scoring interpretation or historical comparison.

Do not create an additional investigation project.

Do not patch a scoring engine during this validation.

---

# §6. KOREAN REASON VALIDATION

Record the Korean Reason accompanying each Direction.

Check only:

- Whether Reason is provided.
- Whether it corresponds to the scored Direction.
- Whether it describes actual available evidence.

Previous offline tests found occasional Reason withholding in the Frozen EI/TC paths.

Do not treat that finding as authorization for a new Reason development project.

If a Reason is withheld during actual E2E:

1. Record the affected case.
2. Confirm whether Direction is still valid.
3. Disclose the missing Reason in the final report.
4. Do not invent a replacement.
5. Do not reopen Frozen engine architecture.

Keep Direction correctness and Reason completeness as separate validation measures.

---

# §7. STRICT FAILURE POLICY

If a live test reveals an error, identify its first proven cause:

- Product-selection error
- Vision observation error
- Target-aware Colour error
- Suit member-association error
- Scoring Direction error
- Integration error
- Historical expectation mismatch

No automatic source-code changes.

No new scoring rule.

No image-specific hardcoding.

No unapproved additional API test.

A genuine failure must be reported with exact evidence and the smallest proposed remedy.

If the failure requires changing a Frozen authority, stop and request CEO approval rather than changing it.

If a test case cannot complete validly, mark it NOT_COMPLETED or FAIL as appropriate.

Do not convert an incomplete test into PASS.

---

# §8. FINAL OFFLINE REGRESSION

After the live E2E calls, execute the existing offline regression suite once.

Verify:

- Frozen EI/TC/SR/DM integrity
- Suit TC/SR/DM integrity
- Target-Aware Colour integrity
- Integrated R4 regression
- Product Selection
- Four-axis Direction contract
- No GT runtime reads
- Original source hashes
- Deterministic replay
- Existing backup candidate integrity

Do not rerun unnecessary historical research.

Do not generate additional engine versions.

Do not rebuild backup architecture.

---

# §9. FINAL CEO REPORT

Produce **one Korean CEO report**.

Include:

## A. Live Execution Summary

- Actual images processed
- Successful Vision calls
- Successful Colour calls
- Total HTTP attempts
- Retries and causes
- Actual token usage
- Actual USD cost
- G53 exception expiry confirmation

## B. Four-Axis Result Table

For each scoring unit:

| REF | Product | EI | TC | SR | DM | Result |
|---|---|---|---|---|---|---|

Show both actual and expected Directions.

REF_000849 has two independently scored merchandise units.

## C. Accuracy Assessment

Report:

- Number of valid scoring units
- Number of comparable axis Directions
- Number of matches
- Number of mismatches
- Accuracy percentage for the comparable test population
- Missing/incomplete observations
- Previously known mismatch dispositions

Do not inflate sample size.

## D. Target-Aware Colour Verification

Confirm:

- Selected product Colour correctness
- Correct Jacket/Bottom association
- No unrelated garment contamination
- Whether actual multi-target extraction succeeded

## E. Korean Reason

Report completeness and any concrete output defects separately from Direction accuracy.

## F. Final Regression

Concise PASS / FAIL summary.

## G. Final Freeze Recommendation

Conclude with exactly one of:

`READY_FOR_FINAL_FREEZE_CEO_APPROVAL`

`READY_WITH_DOCUMENTED_NONBLOCKING_LIMITATIONS`

`NOT_READY_SPECIFIC_PROVEN_BLOCKER`

Explain the decision briefly.

Preserve raw logs and evidence.

Do not produce another large collection of unnecessary reports.

---

# §10. FINAL FREEZE BOUNDARY

This order authorizes the live E2E test only, within §0 limits.

It does not authorize:

- Final Freeze
- Production promotion
- New production pointer
- Modification of Frozen engines
- GT rewriting
- Existing backup overwriting
- Google Drive upload
- Further paid experiments

After delivering the actual E2E result, stop for CEO review.

If Directions are confirmed and no blocking defect remains, recommend Final Freeze and final backup.

**Do not execute Final Freeze automatically.**

---

# FINAL CEO INSTRUCTION

The objective is to finish STMX Item Scoring V2.

The four Scoring Engines, Suit successors, Target-Aware Colour and Integrated R4 have already been implemented.

The CEO now authorizes **one bounded live E2E experiment** using seven predetermined images, the existing production Vision V1.3, the sealed Target-Aware Colour successor and Integrated R4.

Register the temporary G53 exception before execution.

Execute the existing gated runner within:

- 14 accepted inference outputs
- 16 maximum HTTP attempts
- 2 strictly limited infrastructure retries
- USD 8.00 maximum expenditure

Validate the four Directions on actual images.

Verify the Target-aware Colour association.

Record Korean Reasons without opening a separate development workstream.

Run the existing regression once.

Deliver one clear Korean CEO report with the actual results and a Final Freeze recommendation.

**No scope expansion. No new engines. No speculative development. No additional API experiments.**

**STOP AFTER REPORTING RESULTS.**

**END OF ORDER**
