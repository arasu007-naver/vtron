# STMX FULL-LOOK SR — CEO MANDATORY SCORING RULE INTEGRATION, FINAL CORRECTION & MILESTONE 5 CLOSURE

Execution Model: Claude Opus 5.5

Implementation & Regression: Fable 5.1

Date: 2026-10-24

Workstream: STMX Full-Look Style Scoring Engine

Current Milestone: 5 — SR Direction Engine

Execution Type: CEO ARCHITECTURE DECISION INTEGRATION · FINAL SR CORRECTION · MANDATORY DIRECTION OUTPUT · FULL REGRESSION · CLOSURE READINESS

Priority: HIGHEST — Finish SR without further unnecessary research.

---

# 0. CEO FINAL ARCHITECTURE DIRECTIVE

The CEO has issued a binding architecture decision applicable to all four STMX Scoring axes:

- EI
- TC
- SR
- DM

**Every Scoring Engine must make its scoring determination using only the parameter values and evidence already available from the Vision Extractor.**

Incomplete parameters must not prevent scoring.

If the material is unknown, score without knowing the material.

If shoulder information is missing, score using the remaining observations.

If the observed evidence is incomplete or ambiguous, select the most appropriate governed classification from the available evidence.

The Scoring Engine is responsible for making a judgment, not demanding perfect evidence.

## 0.1 Mandatory Operating Rule

For a valid, scorable input:

`AVAILABLE_VISION_EVIDENCE → SCORING_ENGINE → GOVERNED_SCORING_RESULT`

Not:

`AVAILABLE_VISION_EVIDENCE → MISSING_FIELD → UNKNOWN / UNRESOLVED / SCORING_BLOCKED`

The following are prohibited as routine final scoring outcomes:

- UNKNOWN
- UNRESOLVED
- EVIDENCE_REPAIR_REQUIRED
- CONTRACT_GAP
- WORN_BUT_INSUFFICIENT
- Any equivalent state that refuses to determine a style result merely because information is incomplete.

Such states may remain in internal observation diagnostics where appropriate, but they must not replace a required scoring result.

## 0.2 No Fabrication

Mandatory scoring does not authorize fabrication.

The engine must not invent:

- Material.
- Garment construction.
- Shoulder geometry.
- Body relationship.
- Shape retention.
- Cinching.
- New observations.
- CEO Ground Truth.

Unknown facts remain unknown internally.

The scorer determines the most appropriate style outcome using the facts actually available.

## 0.3 No New Evidence Dependency

A Scoring Engine must not require:

- New Vision parameters.
- Vision re-extraction.
- A new API call.
- Manual Human Reference substitution.
- CEO adjudication of every ambiguous image.

These are not prerequisites for ordinary scoring.

If an observation is not supplied, use other relevant evidence.

## 0.4 All-Axis Authority

This is a common STMX Scoring architecture rule.

It applies to all four axes, not only SR.

The existing scoring semantics remain authoritative:

| Axis | Direction Authority |
|---|---|
| EI | Existing governed Expressive / Introvert / valid Neutral semantics |
| TC | Classic / Transformative |
| SR | Structured / Relaxed |
| DM | Detail / Minimal |

A legitimate EI Neutral is a real classification and must not be confused with a missing-data exception.

At the current SR Direction milestone, mandatory output means a valid S/R Direction. Do not invent SR ordinal scores or Strength values before their governed implementation stage.

When a complete axis scoring contract includes ordinal or Strength outputs, the same non-blocking principle must apply to those governed outputs.

This directive does not authorize unrelated changes to Frozen Item Engines or the already closed TC codebase.

---

# 1. EXECUTION GOAL

Finish the Full-Look SR Direction Engine.

Do not start another Vision research cycle.

Do not introduce another parameter.

Do not reopen CG-1.

Do not repeat the previous twenty-call live validation.

Do not attempt to make every CEO GT case correct by adding special-case rules.

Instead:

1. Integrate the new CEO mandatory-scoring rule.
2. Remove SR scoring-blocking dependencies on missing parameters.
3. Remove the failed CG-1 scoring logic.
4. Correct the final SR Direction resolver using existing governed evidence.
5. Ensure every valid, scorable Full-Look Packet returns STRUCTURED or RELAXED.
6. Run the complete historical corpus and stored live-response regression.
7. Measure actual accuracy separately from output coverage.
8. Deliver a compact, final CEO closure review.

The intended outcome is a runnable SR final candidate that can proceed directly to closure approval.

---

# 2. REQUIRED SOURCE REVIEW

Read the current STMX Project Context in this order:

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

Consult the Claude Reports Index and original source packages as needed.

Mandatory predecessor packages:

- Full-Look SR V1 / V2 / V3.
- SR V3_R1 Final Correction.
- SR V3_R2 CG-1 Final Candidate.
- SR CG-1 Targeted Vision Reopen Candidate.
- SR CG-1 G53 Live Validation Execution V1.
- Frozen Full-Look Vision Extractor Final V1.
- Frozen Item SR Constitution.
- Full-Look TC Product-Only V2.

The most recent CG-1 live validation reported:

`CG1_LIVE_VALIDATION_FAIL — CONTRACT_REVIEW_REQUIRED`

Use the actual recorded findings.

Do not treat rejected CG-1 proposals as approved authority.

---

# 3. DESIGN REVIEW CHECKLIST

Complete this review before modifying code.

| ID | Design Requirement |
|---|---|
| DR-01 | CEO mandatory-scoring directive recognized as binding |
| DR-02 | Applies to EI / TC / SR / DM |
| DR-03 | SR Binary Direction preserved |
| DR-04 | Upper Priority preserved |
| DR-05 | Direction and Strength separated |
| DR-06 | Missing material cannot block SR |
| DR-07 | Missing shoulder/fit evidence cannot automatically block SR |
| DR-08 | No invented parameter values |
| DR-09 | No mandatory Vision re-extraction |
| DR-10 | Failed CG-1 classification paths not promoted |
| DR-11 | No unapproved candidate rule silently promoted |
| DR-12 | No CEO GT or Look-ID runtime dependency |
| DR-13 | No lower-body Direction override |
| DR-14 | No automatic Belt → Structured rule |
| DR-15 | No automatic Oversized → Relaxed rule |
| DR-16 | No arbitrary unconditional default Direction |
| DR-17 | Same admissible input produces same output |
| DR-18 | Frozen Vision protected |
| DR-19 | Frozen Item Engines protected |
| DR-20 | TC Product-Only V2 protected |
| DR-21 | No API calls |
| DR-22 | Full regression and accuracy reporting planned |
| DR-23 | New semantic authority remains Candidate until approved |
| DR-24 | Freeze/backup require their governed gates |

Identify any conflicts with older scoring-sufficiency or exception-return rules.

Apply the latest CEO directive to the SR Candidate without rewriting historical Frozen artifacts.

---

# 4. ARCHITECTURE CORRECTION — MANDATORY SCORING

The previous SR implementations adopted an overly defensive approach.

When an observation was unavailable or a rule could not distinguish two looks, the resolver returned an exception rather than a style Direction.

The CEO has rejected this operating model.

## 4.1 Required Resolution Behavior

Given a valid Full-Look evidence packet:

1. Identify the governing upper-body evidence.
2. Collect all available SR-relevant observations.
3. Identify Structured-supporting visual evidence.
4. Identify Relaxed-supporting visual evidence.
5. Assess which direction is better supported by the realized upper silhouette.
6. Return the selected Direction.

The resolver must always return:

`STRUCTURED`

or

`RELAXED`

for valid, scorable inputs.

Do not require every SR factor to be populated.

Do not wait for a particular missing field if other evidence supports a directional judgment.

## 4.2 Preserve Actual Visual Meaning

The engine must evaluate the visual character of the realized silhouette.

Structured-supporting evidence may include:

- Actual upper structural containment.
- Shape retention.
- Shoulder structure that genuinely governs the silhouette.
- Controlled shape and garment-body relationship.
- Effective functional cinching that changes the realized silhouette.

Relaxed-supporting evidence may include:

- Released upper volume.
- Fluid or freely falling silhouette.
- Loss or absence of effective shape containment.
- Drape and release that govern the realized form.

These are existing conceptual evidence families, not newly authorized automatic scoring rules.

A single token must not replace assessment of the actual silhouette.

## 4.3 Mixed Evidence

When Structured and Relaxed signals coexist:

Determine which direction is better supported by the available governing upper-body evidence.

A weak direction still receives its proper S/R label.

Do not create Neutral or Unresolved as an intermediate final result.

Do not use an invented scoring threshold merely to eliminate unresolved outputs.

If a deterministic tie-resolution convention is required, derive it from existing approved semantic precedence where possible.

Any genuinely new precedence or tie-resolution rule must be explicitly labeled Candidate and submitted for CEO approval.

No blanket default such as:

`IF UNCERTAIN THEN RELAXED`

or

`IF UNCERTAIN THEN STRUCTURED`

is authorized.

The engine must have an auditable, evidence-grounded reason for its selected direction.

---

# 5. TASK A — REMOVE MISSING-PARAMETER BLOCKERS

Audit SR V3_R2 and its relevant predecessor logic.

Identify every branch that returns an exception because:

- Material is UNKNOWN.
- Surface is UNKNOWN.
- Shoulder evidence is missing.
- Fit is incomplete.
- Shape behaviour is not fully recorded.
- A peripheral field is missing.
- Multiple admissible missing-field values could theoretically change a result.
- A prior CG-1 contract distinction is unavailable.

Remove these conditions as blockers for otherwise valid, scorable Full-Look inputs.

Preserve missingness in diagnostic traces if useful.

## 5.1 SRB-2f Material Handling

The previous R2 implementation blocked cases where material could theoretically change the classification.

Known examples:

- M269
- M178
- M270
- F109

This must change.

Material and surface observations are supporting evidence only when supplied and relevant.

If `SVP-123` or `SVP-124` is missing:

- Do not invent a material.
- Do not hypothetically assign Leather to force Structured.
- Do not hypothetically assign Cotton or Wool to force Relaxed.
- Do not refuse to score.
- Use the observed fit, shoulder, shape, release and related evidence.

Material may influence Direction when genuinely observed and semantically relevant.

It must not be a mandatory gate for routine SR scoring.

## 5.2 Invariance Logic

The previous implementation attempted to prove that a result would be unchanged across every hypothetical value of a missing field.

This proof may be useful for internal testing.

However, the absence of such proof must not itself cause scoring refusal.

Replace the blocking use of invariance with non-blocking sensitivity diagnostics.

Example:

`DIRECTION = RELAXED`

`MISSING_EVIDENCE = MATERIAL`

`SENSITIVITY = POSSIBLE`

The diagnostic metadata may indicate limitations.

It must not replace the Direction result.

---

# 6. TASK B — REMOVE FAILED CG-1 SCORING PATHS

The live validation failed to support the CG-1 torso-return hypothesis.

Recorded outcomes:

- M317: R, 3/3.
- M320: R, 3/3, conflicting with CEO S.
- M309: new Structured prediction conflicting with CEO R.
- Unseen-look control failures.
- Observation instability.

The following are not valid automatic sufficient conditions:

`Torso Returns → STRUCTURED`

`Torso Remains Detached / Oversized → RELAXED`

Do not retain one simply because it worked on a selected image.

## 6.1 Required Action

Retire or disable the failed candidate scoring branches:

- SRB-2xs
- SRB-2xr as an independently sufficient Direction switch

Preserve the full experimental history and raw live responses.

Do not delete source evidence.

The CG-1 observation may remain in historical candidate artifacts but must not become a required runtime dependency.

Do not modify the Frozen 41-parameter Vision contract.

Do not register the experimental Fit subfield.

Do not perform another live API experiment.

## 6.2 Existing Upper Evidence

Use the existing authorized upper-body observations and SR Factors.

CG-1 must not be replaced by another speculative single-field Direction switch.

---

# 7. TASK C — FINAL DIRECTION RESOLVER

Create a final SR correction candidate from the existing V3_R2 source.

Suggested version:

`STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R3_FINAL_CANDIDATE`

Preserve V3_R2 byte-identically.

Do not recreate the engine from scratch.

## 7.1 Resolver Responsibilities

The resolver must:

- Accept the governed Full-Look Vision Packet.
- Work with partially populated parameter records.
- Use only supplied observations.
- Select the actual governing upper silhouette.
- Preserve Upper Priority.
- Evaluate Structure versus Release using available valid evidence.
- Select the most supported S/R Direction.
- Return a deterministic result.
- Record the evidence and rule rationale.

A valid output contract may contain:

```json
{
  "axis": "SR",
  "direction": "STRUCTURED",
  "basis": {
    "governing_region": "UPPER",
    "evidence_used": [],
    "missing_observations": []
  }
}
```

This is illustrative; preserve existing transport and naming conventions where authoritative.

`missing_observations` is diagnostic metadata, not a scoring-status gate.

Do not add invented numerical confidence values.

## 7.2 Direction-First

Do not convert SR Direction into numeric score fitting.

Do not implement Strength or SR ordinal scores as part of this correction.

The present milestone is SR Direction.

Mandatory final direction output must be solved first.

## 7.3 No Unauthorized GT Fitting

The four CEO Full-Look anchors remain:

- F298 — RELAXED.
- M309 — RELAXED.
- M317 — RELAXED.
- M320 — STRUCTURED.

These are evaluation authorities, not input features.

No rules may reference their IDs, filenames or expected labels.

---

# 8. M317 / M320 — HANDLE THE INFORMATION LIMITATION CORRECTLY

Previous investigations found the two Frozen Packets indistinguishable in the legitimate governing SR evidence needed for the opposite CEO labels.

This does not authorize an unresolved runtime outcome.

But it also does not authorize fabrication.

If both packets truly provide equivalent admissible SR inputs:

- Apply the same generalized resolver to both.
- Return the Direction best supported by that evidence.
- Accept that the same Direction may be returned for both.
- Record any CEO GT disagreement as an accuracy error.
- Explain the information limitation in the CEO report.

**Do not hardcode M317 or M320 to reproduce their opposite CEO labels.**

One correctly functioning deterministic engine cannot produce opposite predictions from indistinguishable admissible inputs.

This is an accuracy limitation, not permission to block normal scoring.

The completion requirement is reliable Direction determination from available evidence, not fabricated perfect agreement with the calibration corpus.

---

# 9. TECHNICAL INPUT FAILURE BOUNDARY

Separate genuine technical input failure from incomplete observations.

The following must not cause scoring refusal for an otherwise scorable look:

- Missing material.
- Missing shoulder.
- Missing cinching.
- Unknown shape detail.
- Mixed Structure / Release.
- Weak visual force.
- Lack of CEO GT.
- Incomplete optional component facts.

A truly invalid or unusable input is different.

Examples:

- No valid evidence packet was delivered.
- Packet cannot be parsed.
- No meaningful visual look evidence exists at all.
- A source image does not actually depict an evaluable Full-Look, as previously reported for REF_000622.

Such failures should use a transport/input-error mechanism, separate from SR Direction.

Do not count technical input errors as a new style category.

Do not misuse technical input errors to hide cases that simply have missing observations.

---

# 10. ALL-AXIS CEO DIRECTIVE INTEGRATION

Record the new mandatory-scoring rule as a cross-axis STMX architecture authority.

Applicable to:

`EI · TC · SR · DM`

Required interpretation:

Each Scoring Engine must use the existing delivered evidence and return the best governed scoring result for a valid, scorable input.

Missingness is not a veto.

Vision observes.

Scoring decides.

Do not modify or expand the Vision Extractor merely to satisfy one scoring rule.

## 10.1 Current Implementation Scope

This order authorizes:

- The cross-axis architecture decision record.
- The SR Direction code correction.
- Read-only compatibility review of TC and existing contracts.
- A future implementation requirement for EI and DM.

This order does NOT authorize:

- Reopening Frozen Item Engines.
- Reimplementing TC Product-Only V2.
- Developing EI.
- Developing DM.
- Implementing Strength/ordinal scoring.
- Four-Axis Integration.

If the read-only review discovers any current TC behavior inconsistent with this CEO principle, document the exact conflict as a separate future correction requirement.

Do not silently patch closed TC code in this SR task.

---

# 11. TESTING — MANDATORY COMPLETION GATES

Run actual tests, not merely architecture documentation.

## 11.1 Original 43 Packets

Run all 43.

Report:

- Valid, scorable cases.
- Technical non-evaluable inputs.
- STRUCTURED count.
- RELAXED count.
- Missing evidence cases.
- CEO GT matches.
- CEO GT conflicts.
- Exact rule/evidence basis.

Target:

`SCORABLE_CASES = 42`

`SCORABLE_S_OR_R_OUTPUTS = 42`

`SCORABLE_UNRESOLVED = 0`

`SCORABLE_UNKNOWN = 0`

`NEUTRAL = 0`

Maintain the existing REF_000622 technical-input distinction if verified.

Do not change the denominator to improve coverage.

## 11.2 Stored 20 Live Responses

Replay all 20 previously obtained CG-1 live responses offline.

No new API calls.

Evaluate:

- Whether the corrected resolver returns S/R for each valid packet.
- Whether the M309 CG-1-induced error disappears.
- M317/M320 final predicted directions.
- Missing material handling.
- Rule trace determinism.
- Any newly introduced CEO GT conflict.

The fact that a direction is returned does not prove its correctness.

Report accuracy separately.

## 11.3 Missingness Regression

Introduce deterministic test variants where one or more nonessential observations are omitted.

Include:

- Material omitted.
- Surface omitted.
- Shoulder omitted.
- Fit omitted.
- Shape detail omitted.
- Cinching omitted.
- Multiple fields missing simultaneously.
- Contradictory but valid observations.
- Weak Direction evidence.
- Governing outer layer present with incomplete inner-layer fields.

For every scorable input, the engine must return a governed S/R Direction.

Record when missingness changes the selected Direction.

Do not require the same result when genuinely relevant evidence has been removed.

The required invariant is that valid scorable input still produces a Direction, not that every prediction remains unchanged under information loss.

## 11.4 Semantic Regression

Validate:

- Strict Upper Priority.
- Relaxed upper + Structured lower → Relaxed.
- Structured upper + Relaxed lower → Structured.
- Strong shoulder does not automatically force Structured.
- Oversized does not automatically force Relaxed.
- Belt presence does not automatically force Structured.
- Body closeness does not automatically force Structured.
- Material category does not independently dictate Direction.
- Governing outer garment is not replaced by a fitted inner garment.
- Shape retention and release remain distinct.
- No Neutral output.
- No case-ID leakage.
- No CEO GT leakage.

## 11.5 Existing Engine Protection

Run:

- SR V1 replay and tests.
- SR V2 replay and tests.
- SR V3 replay and tests.
- SR V3_R1 replay and tests.
- SR V3_R2 replay and tests.
- New SR V3_R3 candidate replay and tests.
- Frozen Item SR regression.
- TC Product-Only V2 regression.
- Frozen Vision release verifier.
- PRE/POST protected-file integrity.
- Manifest verification.

The known Item SR F31 environment assertion must be reported separately.

Do not patch unrelated Frozen source files.

---

# 12. HOLDOUT AND GENERALIZATION

The resolver must not merely produce 42 labels for the known corpus.

Use existing holdout evidence and stored images outside the 43-case set.

Evaluate ordinary upper-silhouette variations:

- Clear Structured.
- Clear Relaxed.
- Weak Structured.
- Weak Relaxed.
- Oversized yet structured.
- Slim but soft.
- Tailored jacket worn open.
- Soft draped coat.
- Built shoulder with extensive release.
- Mixed upper and lower signals.

Use existing CEO GT where available.

Clearly distinguish:

- CEO Full-Look GT.
- CEO Item GT.
- Historical Claude observation.
- Unlabeled exploratory test.

Report both:

1. Direction output coverage.
2. Observed agreement with available GT.

Do not claim 100% classification accuracy merely because output coverage reaches 100%.

---

# 13. REQUIRED DELIVERABLES

Create one compact final package:

`04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_MANDATORY_SCORING_FINAL_CORRECTION_V1/`

## D1 — CEO Architecture Decision Record

Record the binding new rule:

`AVAILABLE_EVIDENCE_MANDATORY_SCORING`

Scope:

`ALL FOUR SCORING AXES`

Include:

- CEO decision provenance.
- Applicability.
- Missingness handling.
- Final output requirements.
- No fabrication rule.
- Vision/Scoring responsibility separation.
- Relationship to older UNKNOWN/UNRESOLVED behavior.
- Authority precedence.
- Protected Frozen boundaries.

## D2 — Final SR Scoring Constitution Candidate

Provide the actual executable Direction conditions.

Describe:

- Governing upper selection.
- Structure evidence.
- Release evidence.
- Mixed-signal handling.
- Missingness handling.
- Generalized direction selection.
- Rule precedence.
- Exact exclusions.
- Deterministic rationale.
- Candidate approval status.

Do not include unvalidated CG-1 rules.

Clearly identify any genuinely new semantic convention requiring CEO approval.

## D3 — Final Executable SR Candidate

Deliver:

- Source.
- Tests.
- CLI/runner.
- Input/output contract.
- Evidence trace.
- README.
- Versioned diff.
- Deterministic replay.
- Manifest.

The final code must be independently runnable.

## D4 — Original 43-Case Final Ledger

Show:

`V2 → V3 → R1 → R2 → R3 Candidate`

For every look:

- Final Direction.
- Available scoring evidence.
- Missing information.
- Rule activated.
- GT if applicable.
- Match/conflict.
- No-scoring exceptions, if any, classified strictly as genuine technical input failures.

## D5 — Stored 20-Call Replay

Show the exact actual-image response outcomes without new API calls.

Compare prior CG-1 behavior and the corrected SR result.

## D6 — QA / Integrity / Closure Readiness

Provide actual test counts, protected-file verification, semantic checks and any remaining approval requirements.

## D7 — Korean CEO Final Review DOCX

Filename:

`STMX_FULL_LOOK_SR_FINAL_CLOSURE_CEO_REVIEW.docx`

This is the primary CEO-facing deliverable.

It must clearly answer:

1. How was the CEO mandatory-scoring rule incorporated?
2. Were all missing-material scoring blockers removed?
3. Were the failed CG-1 rules removed?
4. Does the final candidate return S/R for every valid look?
5. How many of the 43 cases are Structured?
6. How many are Relaxed?
7. Are any ordinary scorable cases still UNKNOWN or UNRESOLVED?
8. How are M269/M270/M178/F109 handled?
9. How does the new resolver treat M317/M320?
10. Does M309 return to Relaxed?
11. Were additional CEO GT errors introduced?
12. Does the engine generalize to unseen looks?
13. What is the difference between coverage and accuracy?
14. What exact rules were changed?
15. Which changes require final CEO approval?
16. Is SR ready for final release?
17. What remains before SR Freeze and backup?
18. Is EI the next workstream?

Avoid repeating the failed CG-1 research at length.

Include only the critical before/after case images and results.

---

# 14. PROJECT CONTEXT UPDATE

Update applicable Project Context files additively.

The new CEO mandatory-scoring decision must be recorded clearly as an overarching cross-axis rule.

Preserve the distinction between:

- CEO-approved architecture principle.
- Implemented SR candidate.
- Unapproved final Scoring Constitution.
- Historical Frozen Authority.
- Future EI/DM implementation requirements.

Do not retroactively rewrite past research results.

Do not mark an unapproved candidate as Frozen.

No silent promotion.

---

# 15. MILESTONE 5 CLOSURE CRITERIA

Report whether the following are satisfied.

| Gate | Requirement |
|---|---|
| C1 | Every valid, scorable SR input produces S/R |
| C2 | No UNKNOWN/UNRESOLVED normal final outcome |
| C3 | No fabricated missing values |
| C4 | Upper Priority preserved |
| C5 | Failed CG-1 scoring dependence removed |
| C6 | Available evidence supports reproducible Direction selection |
| C7 | All four CEO SR anchors evaluated honestly |
| C8 | Historical and holdout regressions disclosed |
| C9 | Frozen assets protected |
| C10 | Final Constitution and authorization dependencies explicit |

If C1–C10 pass technically, report:

`SR_MILESTONE_5_TECHNICALLY_READY_FOR_CEO_FINAL_APPROVAL`

If a material semantic or accuracy problem remains, report:

`SR_MILESTONE_5_REQUIRES_SPECIFIC_CORRECTION`

Do not create a new Vision research workstream merely because the accuracy is imperfect.

Accuracy concerns should be reported and assessed against the actual available evidence.

A mandatory output is not a guarantee of a correct output.

Any material, systematic error in valid directional interpretation remains a legitimate closure blocker and must not be hidden by high coverage.

---

# 16. FINAL FREEZE AND BACKUP BOUNDARY

This task is authorized to complete the SR final correction candidate and closure-readiness package.

It does not itself authorize:

- Final Freeze.
- Production Promotion.
- Overwriting a Frozen release.
- Google Drive upload declaration.
- EI development.
- DM development.
- Strength implementation.
- Four-Axis Integration.

If the SR Candidate passes its closure-readiness gates, provide one complete final approval package covering:

1. Final Scoring Constitution approval.
2. Production Candidate promotion.
3. Final deterministic regression.
4. Final Freeze.
5. Local backup verification.
6. Google Drive backup/upload verification.
7. Milestone 5 CLOSED.
8. EI transition readiness.

These are subsequent approval/execution gates.

Do not declare Google Drive PASS without actual verification.

---

# 17. STRICT EXECUTION LIMITS

Do not:

- Restart SR architecture research.
- Reopen the Frozen Vision Extractor.
- Add new Vision parameters.
- Run paid Vision APIs.
- Request further CEO GT just to complete Direction output.
- Build another CG-1 observation.
- Introduce arbitrary scoring defaults.
- Create case-specific GT-fitting rules.
- Modify Frozen Item SR.
- Modify closed TC source.
- Develop EI or DM.
- Implement Strength or Style ID.
- Perform Final Freeze without authorization.

Use existing evidence and finish the current scoring work.

---

# 18. HARD STOP

Execute the full correction in one cycle:

1. Review authority and design checklist.
2. Record the cross-axis CEO mandatory-scoring rule.
3. Correct SR missingness blockers.
4. Remove failed CG-1 Direction switches.
5. Finalize the SR Candidate resolver.
6. Replay the 43 packets and 20 live responses.
7. Run full regression and holdout checks.
8. Deliver the Korean CEO final review.
9. Provide the exact final SR closure decision.

Do not stop after merely proposing code changes.

Implement and test the Candidate.

Do not ask for repeated small approvals where a consolidated CEO final review is sufficient.

Stop only after producing a verified result or identifying a concrete material blocker that cannot lawfully be resolved within this order.

Then:

**HARD STOP FOR CEO FINAL APPROVAL.**

# PRIMARY SUCCESS CONDITION

Complete a Full-Look SR Direction Engine that uses only available Vision evidence and reliably returns STRUCTURED or RELAXED for every valid, scorable outfit, without missing-parameter blocking, fabricated evidence, unapproved CG-1 dependencies or case-specific rules.

Record the same mandatory-scoring principle as binding for EI, TC and DM.

Prepare SR Milestone 5 for final CEO closure and subsequent EI development.

END OF CLAUDE EXECUTION ORDER
