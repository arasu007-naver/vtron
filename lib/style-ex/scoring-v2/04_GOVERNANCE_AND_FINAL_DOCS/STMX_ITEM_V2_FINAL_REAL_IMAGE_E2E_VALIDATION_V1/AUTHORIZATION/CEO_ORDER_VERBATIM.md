# CLAUDE EXECUTION ORDER

## STMX ITEM SCORING V2 — FINAL REAL-IMAGE END-TO-END VALIDATION & FINAL FREEZE DECISION

**Date:** 2026-10-29  
**Execution Model:** Opus 5.5  
**Project:** STMX Engine Architecture

**Objective:** Validate the completed Integrated Item Scoring V2 R4 using real product images, confirm four-axis Direction correctness, and prepare the final CEO Freeze decision.

**Scope:** FINAL VALIDATION ONLY — NO NEW ENGINE DEVELOPMENT.

---

# 1. CEO DIRECTIVE

All four Item Scoring V2 engines have already been completed, Final Frozen and backed up.

The following integration work is also complete:

- Item Product Selection
- Commercial Suit Scoring
- Suit TC/SR/DM successors
- Target-Aware Colour successor
- Integrated Item Scoring Runtime R4
- Offline regression and restore verification

**Do not reopen any completed architecture or scoring rules.**

The only remaining objective is to verify that actual product images produce the correct four-axis Directions through the complete pipeline.

```text
PRODUCT IMAGE
      ↓
PRODUCT TARGET SELECTION
      ↓
ITEM VISION V1.3
      +
TARGET-AWARE COLOUR
      ↓
INTEGRATED ITEM V2 R4
      ↓
EI / TC / SR / DM
      ↓
FINAL DIRECTIONS + KOREAN REASONS
```

No further Scoring Engine development is authorized under this order.

---

# 2. SOURCE AUTHORITY & PROTECTION

Read current STMX Project Context in its mandatory order, beginning with:

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

Inspect the latest R4 implementation package:

`STMX_ITEM_V2_TARGET_AWARE_COLOUR_AND_R4_V1`

Verify the existing seals and source identities.

Perform the required PRE Design Review and protected-source verification before testing.

Protected assets:

- Frozen Item Vision V1.3
- Frozen Colour V1
- Frozen EI/TC/SR/DM V2
- Frozen Suit scoring predecessors
- Integrated R3 and R4 candidates
- Historical CEO GT
- Existing backup capsules

**No modification to these assets.**

---

# 3. FINAL TEST IMAGES

Use the already prepared, source-verified images.

| Test | REF | Validation |
|---|---|---|
| 01 | REF_000520 | Ordinary single Item |
| 02 | REF_000010 | Multiple garments, explicit selected target |
| 03 | REF_000841 | Suit — Jacket Structured / Bottom Relaxed |
| 04 | REF_000840 | Suit — TC Product Departure |
| 05 | REF_000810 | Suit — DM Detail |
| 06 | REF_000816 | Suit — DM Minimal |
| 07 | REF_000849 | Multi-target Colour separation |

Use the exact approved Product Scoring Unit and target association for each image.

Do not infer a commercial Suit merely because garments visually match.

A Jacket Relaxed / Bottom Structured Suit and a two-tone commercial Suit remain unavailable as live samples.

**Do not delay the existing seven-image test to search indefinitely for those additional images.**

Record those two coverage limitations and proceed with the available test set when authorized.

---

# 4. PRE-TEST VERIFICATION

Before any external API call, verify:

1. The production Item Vision V1.3 identity.
2. The sealed Target-Aware Colour candidate.
3. The Integrated R4 identity.
4. All four Frozen V2 scorers.
5. Exact product-target IDs.
6. Suit Jacket/Bottom member IDs.
7. Image SHA-256 identities.
8. Current prompt and model configuration.
9. The existing G53 authorization status.
10. Full test invocation and estimated cost.

No additional architecture study.

No new prompt optimization.

No new scoring-rule analysis.

If an essential input contract is incompatible, report the exact blocker rather than developing a new architecture.

---

# 5. G53 — BOUNDED LIVE API AUTHORIZATION GATE

G53 remains ACTIVE.

This order establishes the intended test scope but **does not itself authorize paid inference**.

The previous verified planning estimate was:

- Seven test images
- Vision V1.3: one call per image
- Target-Aware Colour: one call per image
- Planned calls: 14
- Expected cost: approximately USD 3.36
- Estimated worst case: USD 5.56
- Proposed hard spending ceiling: USD 8.00

Reconfirm exact model, prompt identities, billable token estimates and current invocation behavior before execution.

Prepare a single explicit CEO approval request for a temporary G53 exception.

**If no valid matching CEO approval exists, stop at this gate without making any external inference call.**

Upon separate explicit approval, resume this same order using only the authorized images, models, invocation limit and expenditure ceiling.

Do not treat an expired G53 exception as reusable.

No paid call, credential probe or retry outside the approved scope.

---

# 6. REAL IMAGE E2E EXECUTION

Once the required G53 approval exists, execute the complete image pipeline.

For each image:

**STEP A — Product Selection**

Confirm the exact product to evaluate.

Where multiple garments are present, use explicit user/merchandise selection.

**STEP B — Vision Extraction**

Run the existing production Item Vision V1.3.

Preserve the actual raw result.

**STEP C — Colour Extraction**

Run the sealed Target-Aware Colour successor.

Verify that the returned Colour Evidence belongs to the selected garment.

For a commercial Suit, verify independent Jacket/Bottom Colour ownership.

**STEP D — Four-Axis Scoring**

Pass the actual valid Vision and Colour evidence to Integrated Item V2 R4.

Do not insert historical GT or manually corrected Vision values.

**STEP E — Final Result**

Record:

```text
IMAGE ID:
PRODUCT TARGET:
SCORING UNIT:

EI DIRECTION:
EI REASON:

TC DIRECTION:
TC REASON:

SR DIRECTION:
SR REASON:

DM DIRECTION:
DM REASON:
```

All actual outputs must be preserved unchanged.

---

# 7. FINAL ACCURACY VALIDATION

The primary acceptance requirement is:

**Each of the four Scoring Engines must generate the correct governed Direction for the evaluated product.**

Evaluate:

| Axis | Verification |
|---|---|
| EI | Correct direction using actual target-specific Colour and EI evidence |
| TC | Correct product-level Classic/Transformative distinction |
| SR | Correct Structured/Relaxed direction |
| DM | Correct Detail/Minimal direction |

For commercial Suits:

- TC: valid Departure on either member → T
- SR: Jacket realized silhouette governs
- DM: qualifying designed detail on either member → D
- EI: preserve the existing Frozen Suit interpretation

Compare outputs with applicable existing CEO GT or a separately recorded visual assessment.

Do not provide GT to the inference model.

Do not modify expected results to force PASS.

## Korean Reason

Record the Korean Reasons as part of the output check.

**Do not create a separate Reason development project.**

A pre-existing withheld Reason must be classified accurately, but it does not automatically authorize another implementation sprint.

If the actual test reveals a reproducible final-output contract failure, report the specific case for CEO disposition.

The main purpose of this test is Direction correctness and complete pipeline functionality.

---

# 8. FAILURE HANDLING — STRICT SCOPE CONTROL

If a real test fails, identify the precise cause:

- Wrong Product Target
- Vision observation error
- Colour association error
- Existing Scoring Direction defect
- Suit member association error
- Runtime integration error
- Test expectation problem

Do not automatically develop a new engine.

Do not change Frozen scoring rules.

Do not introduce case-specific scoring exceptions.

Only report the concrete error, affected image, evidence and required correction.

Any scoring-semantic or frozen-authority modification requires separate CEO approval.

**No speculative improvements or unrelated discoveries are to become new workstreams.**

---

# 9. FINAL REGRESSION & BACKUP READINESS

After any authorized live tests, run the existing approved offline regression once.

Verify:

- Frozen four-axis results unchanged
- Suit TC/SR/DM regression PASS
- Integrated R4 regression PASS
- Product Selection PASS
- Target-Aware Colour association PASS
- No GT runtime lookup
- No protected source mutation
- Deterministic replay
- Existing backup candidates intact

Do not repeat the complete historical architecture audits.

Do not redesign backup structures.

Use the already verified short-root robocopy procedure for Windows path-length compatibility.

The purpose is to confirm that the existing candidate remains suitable for Final Freeze.

---

# 10. FINAL DELIVERABLE — ONE CEO REPORT

Produce a single Korean CEO final-validation report containing:

### A. Actual E2E Results

| Image | EI | TC | SR | DM | Overall |
|---|---|---|---|---|---|

Show the actual four Directions, expected evaluations, mismatches and brief evidence.

### B. Colour Validation

Confirm whether:

- User-selected products receive the correct Colour.
- Non-prominent selected garments are handled correctly.
- Suit member Colour evidence remains correctly associated.
- Unrelated garments do not contaminate EI evidence.

### C. Scoring Accuracy

Provide exact tested-case counts, Direction agreement and all discrepancies.

Separate actual tested results from untested scenarios.

### D. Final Regression

Concise PASS/FAIL summary.

### E. Final Freeze Readiness

State one of:

`READY_FOR_FINAL_FREEZE_CEO_APPROVAL`

`READY_WITH_EXPLICIT_COVERAGE_LIMITATIONS`

`NOT_READY — SPECIFIC_PROVEN_BLOCKER`

If execution is stopped by G53, report:

`LIVE_E2E_BLOCKED_PENDING_CEO_G53_APPROVAL`

Do not report live validation as completed when API calls were not executed.

### F. CEO Decision Required

Provide the exact remaining decision, if any.

Do not generate 20 new supporting reports.

Preserve raw evidence, logs and reproducibility manifest, but deliver **one consolidated CEO report**.

---

# 11. FINAL FREEZE BOUNDARY

Successful testing does not automatically authorize Final Freeze.

After verified completion, prepare for:

1. CEO approval of final Integrated Item V2
2. Final Freeze
3. New local backup
4. New Google Drive backup
5. Isolated restore verification

Do not execute these actions until the CEO explicitly approves the final results.

Existing Frozen backups must never be overwritten.

---

# FINAL CEO INSTRUCTION

**This project must now be completed, not expanded.**

The Item V2 Scoring Engines, Suit successors and Target-Aware Colour integration have already been implemented.

Do not create new scoring engines, new scoring rules, new Reason projects, new feature-development tracks or unnecessary architecture investigations.

Use the completed Integrated R4.

Finish all permitted offline preparations, obtain the required separate G53 approval before paid inference, and then run the controlled real-image E2E validation under that approval.

Determine whether the four Directions are correct for the actual evaluated merchandise products.

If no genuine blocking defect is found, recommend Final Freeze.

If a genuine defect is found, report only that defect and the minimum necessary remedy.

**No scope expansion. No speculative development. No repeated supplementary orders.**

Deliver one final Korean CEO report.

**STOP FOR CEO FINAL FREEZE DECISION.**

**END OF ORDER**
