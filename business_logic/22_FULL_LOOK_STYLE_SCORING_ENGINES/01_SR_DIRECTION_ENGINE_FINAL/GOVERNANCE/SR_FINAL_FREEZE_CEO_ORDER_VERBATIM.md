# STMX FULL-LOOK SR — FINAL DIRECTION CORRECTION, PRODUCTION FREEZE & VERIFIED BACKUP V1

Execution Model: Claude Opus 5.5

Implementation / Testing: Fable 5.1

Date: 2026-10-25

Workstream: Full-Look Style Scoring Engine

Current Milestone: 5 — SR Direction Engine

Execution Type: FINAL SEMANTIC CORRECTION · EXECUTABLE FINAL VALIDATION · PRODUCTION PROMOTION · FINAL FREEZE · LOCAL BACKUP · GOOGLE DRIVE BACKUP VERIFICATION

Priority: HIGHEST — Complete SR and clear the TC transition gate.

---

# 0. CEO EXECUTION DIRECTIVE

The CEO has approved the following workstream sequence:

1. Complete the remaining Full-Look SR correction.
2. Final Freeze the Full-Look SR Direction Engine.
3. Complete and verify its local and Google Drive backup.
4. Only after verified SR freeze and backup, return to Full-Look TC.
5. Complete any remaining Full-Look TC correction.
6. Final Freeze TC and verify its local and Google Drive backup.
7. Only afterward begin Full-Look EI and DM development.

This order executes the SR portion of that sequence.

Do not begin TC implementation inside this order.

Do not proceed to TC merely because SR code tests pass or a local backup folder exists.

The SR milestone is complete only after the applicable freeze and backup gates are satisfied.

## 0.1 Mandatory Scoring Authority

The CEO has already established:

`AVAILABLE_EVIDENCE_MANDATORY_SCORING`

This applies to EI, TC, SR and DM.

For every valid, scorable Full-Look, the Scoring Engine must produce its governed result using only the Vision evidence already supplied.

Missing material, shoulder, fit, shape detail or other partial observations must not block scoring.

No invented values.

No additional mandatory Vision parameters.

No Vision re-extraction dependency.

No routine UNKNOWN, UNRESOLVED, CONTRACT_GAP or EVIDENCE_REPAIR_REQUIRED final scoring output.

For Full-Look SR Direction specifically:

`STRUCTURED | RELAXED`

No NEUTRAL.

Upper Priority remains binding.

Direction and Strength remain separate.

The current release scope is SR Direction, not SR Strength, ordinal scoring or the entire four-axis integrated Style ID Engine.

## 0.2 Final Freeze Authorization Boundary

The CEO authorizes preparation and execution of the Full-Look SR Direction Final Freeze within this order, conditional on passing the specified technical, semantic, regression and release gates.

Do not use this authorization to freeze a candidate that has unresolved material scoring defects.

If an unapproved new semantic rule or a material contradiction still requires an explicit CEO choice, do not manufacture approval.

Complete all other work and present one consolidated, specific approval decision.

Do not stop for cosmetic, documentary or previously settled issues.

---

# 1. SOURCE OF TRUTH

Read current STMX Project Context in prescribed order:

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

Consult `06_STMX_CLAUDE_REPORTS_INDEX.md` and the original reports only where needed.

Primary predecessor:

`STMX_FULL_LOOK_SR_MANDATORY_SCORING_FINAL_CORRECTION_V1`

Current implementation:

`STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R3_FINAL_CANDIDATE`

Review:

- R3 executable source and tests.
- D2 SR Constitution.
- D4 43-case ledger.
- D5 stored live-response replay.
- D6 QA and regression.
- D7 Korean CEO review.
- Existing approval anchors.
- Frozen Item SR R2 semantics.
- Frozen Full-Look Vision Final V1.
- Existing TC Product-Only V2 dependency boundaries.
- Existing local and Google Drive backup protocol.

Do not automatically import Item SR precedence into Full-Look SR when it conflicts with the governing realized Full-Look silhouette.

---

# 2. CURRENT BASELINE

The R3 predecessor reported:

| Dataset | Coverage | Reference Agreement |
|---|---|---|
| 43 original packets, MODE A | 42/42 S/R | CEO Full-Look GT 2/4 |
| 43 packets, MODE B | 42/42 S/R | CEO Full-Look GT 3/4 |
| 20 stored live responses | 20/20 S/R | CEO anchor executions 1/8 |
| Item GT proxy holdout | 49/49 classified | 44/49 matched |

Other predecessor results:

- R3 tests: 36/36 PASS.
- Frozen Vision release: R1–R9 PASS.
- Previous SR V1/V2/V3/R1/R2 replays preserved.
- TC V2: 45/45 PASS.
- Item SR: 45/46; known F31 environment assertion, not a scoring regression.
- Protected files: 16,349 unchanged.
- API calls: 0.

These are reported predecessor results, not newly verified results of this execution.

## 2.1 Current Core Defect

The last material SR issue is the candidate rule:

`SRB-2g`

Current behavior:

`Oversized + Strong/Extreme Shoulder + Structured Shape → STRUCTURED`

This rule overgeneralizes the structural contribution of the shoulder.

It creates or preserves CEO GT conflicts:

- M317: CEO RELAXED, R3 predicts STRUCTURED.
- F298: CEO RELAXED, Frozen R3 predicts STRUCTURED.
- M309: CEO RELAXED, stored live R3 predicts STRUCTURED.
- M320: CEO STRUCTURED, Frozen R3 predicts STRUCTURED, but stored live observations vary.

The predecessor proposed two alternatives:

A. Entire cell → STRUCTURED.

B. Entire cell → RELAXED.

Neither is satisfactory as a general Full-Look SR Constitution.

Do not merely choose whichever global cell output matches more historical labels.

A simple cell flip is not equivalent to a generalizable semantic correction.

---

# 3. MANDATORY DESIGN REVIEW CHECKLIST

Before modifying any candidate source, record PASS / FAIL for each item.

| ID | Review Requirement |
|---|---|
| DR-01 | CEO mandatory-scoring authority confirmed |
| DR-02 | Full-Look SR Binary Direction preserved |
| DR-03 | Strict Upper Priority preserved |
| DR-04 | Direction/Strength separation preserved |
| DR-05 | Existing 41-parameter Frozen Vision protected |
| DR-06 | No new Vision observation required |
| DR-07 | No API call required |
| DR-08 | Missing attributes remain non-blocking |
| DR-09 | No GT or Look-ID runtime leakage |
| DR-10 | Current SRB-2g systematic conflicts verified |
| DR-11 | Frozen Item SR versus Full-Look SR authority boundary understood |
| DR-12 | Oversized is not an automatic Relaxed rule |
| DR-13 | Strong Shoulder is not an automatic Structured rule |
| DR-14 | Shape Retention and Release remain separate |
| DR-15 | Actual governing upper silhouette controls Direction |
| DR-16 | No invented weights or confidence thresholds |
| DR-17 | Identical admissible inputs remain deterministic |
| DR-18 | Current R3 and all predecessors protected |
| DR-19 | No changes to Frozen Item SR or TC |
| DR-20 | Known CEO GT error is not hidden |
| DR-21 | Final Freeze is conditional on actual acceptance gates |
| DR-22 | Local staging is not represented as Google Drive upload |
| DR-23 | Backup and restore verification planned |
| DR-24 | TC workstream blocked until SR freeze and backup verified |

Take a PRE snapshot of all protected assets.

Document the decision review before writing code.

---

# 4. TASK A — FINAL SR SEMANTIC CORRECTION

This is a targeted correction, not another architecture research phase.

Use R3 as the development baseline.

Preserve R3 byte-identically.

Create one versioned successor candidate, provisionally:

`STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R4_FINAL_CANDIDATE`

## 4.1 Remove the SRB-2g Automatic Conclusion

The current rule uses:

- Oversized fit.
- Strong/Extreme shoulder.
- Structured upper shape.

These are relevant observations.

They are not automatically sufficient to establish the final Full-Look Direction.

Replace the overly broad conclusion with a governed assessment of the realized upper silhouette.

Preserve the distinction between:

1. Constructed shoulder strength.
2. Garment volume/release.
3. Actual shape retention.
4. Actual upper-body structural control.
5. Realized drape and structural loss.
6. Visible functional cinching effects.

Use existing observations only.

Do not introduce a new `torso_control`, `body_fitting`, contour-return or CG-1 parameter.

Do not resurrect the failed CG-1 rules.

## 4.2 Structure Versus Release

The final direction must reflect which visual behavior governs the upper silhouette.

Strong shoulder construction may contribute to Structure, but must not automatically defeat dominant realized release.

Oversized volume may contribute to Relaxed, but must not automatically defeat a substantially governed structural silhouette.

A garment can be:

- Oversized and Structured.
- Oversized and Relaxed.
- Regular and Structured.
- Regular and Relaxed.

These distinctions must remain possible.

Do not write:

`Oversized → Relaxed`

or:

`Built Shoulder → Structured`

as universal rules.

## 4.3 Exact Executable Constitution

Do not merely rename SRB-2g to "overall impression" or "dominant evidence".

Produce an actual executable constitution specifying:

- Admissible existing inputs.
- Structural-support conditions.
- Release-support conditions.
- Governing-upper precedence.
- What constitutes a sufficient observed structural force.
- How observed release is treated.
- What happens when both sets of evidence coexist.
- How incomplete fields are ignored without stopping scoring.
- How a weak but valid Direction is selected.
- Deterministic conflict resolution.
- Cases where a candidate semantic rule still requires CEO approval.

Every output must include an auditable rule/evidence trace.

Do not invent unapproved numerical weights or arbitrary thresholds.

The rule must generalize beyond existing case IDs.

## 4.4 No Forced Perfect GT

Known CEO anchors:

- F298 — RELAXED.
- M309 — RELAXED.
- M317 — RELAXED.
- M320 — STRUCTURED.

Use them for evaluation, not runtime input or case-specific fitting.

Prior evidence audits found that M317/M320 have effectively indistinguishable governing SR inputs.

If that remains true, a deterministic rules engine cannot guarantee both labels correctly.

Do not create a fake distinction.

Return the strongest evidence-supported Direction and record any disagreement as an accuracy limitation.

A genuinely irreducible information collision must be clearly distinguished from an avoidable systematic scoring-rule defect.

The former may be documented as a bounded accuracy limitation.

The latter requires correction before freeze.

---

# 5. TASK B — PRESERVE MANDATORY SCORING

R3 already introduced:

`MS-1: Unobserved facts do not contribute to scoring.`

Preserve this principle.

For every valid, scorable Full-Look:

- Select STRUCTURED or RELAXED.
- Never fabricate observations.
- Never withhold output for missing material.
- Never return UNKNOWN as a style classification.
- Never require additional Vision extraction.

Maintain diagnostic traces for missingness and sensitivity, without making them output blockers.

Known formerly blocked looks:

- M269.
- M270.
- M178.
- F109.

These must continue receiving their governed S/R Direction.

Do not regress to the R2 evidence-sufficiency gate.

## 5.1 Input Exception

Only genuine non-scorable input failures may use a technical failure status.

Previously:

`REF_000622`

was identified as lacking governing upper SR evidence.

Reverify that exception.

Do not convert ordinarily incomplete packets into technical failures.

Do not manipulate the evaluable denominator.

---

# 6. TASK C — FINAL OFFLINE REGRESSION

Use existing source images, existing Frozen packets and the 20 sealed live responses.

No new paid API calls.

No additional Vision studies.

## 6.1 Original 43-Case Replay

Report:

- Total source looks.
- Valid scorable looks.
- Genuine technical-input failures.
- STRUCTURED count.
- RELAXED count.
- UNKNOWN/UNRESOLVED count.
- Rule trace.
- Missing evidence.
- CEO GT agreement.
- CEO GT disagreement.

Acceptance target:

`SCORABLE_DIRECTION_COVERAGE = 100%`

`NORMAL_SR_UNKNOWN = 0`

`NORMAL_SR_UNRESOLVED = 0`

`NEUTRAL = 0`

Do not confuse 100% coverage with 100% accuracy.

## 6.2 Stored 20 Live Responses

Replay all 20 stored actual Vision outputs.

Specifically verify:

- M317.
- M320.
- M309.
- F298.
- M323.
- Previously examined positive and negative controls.
- Previously unseen image controls.
- Material UNKNOWN cases included in the stored run.

Compare:

`R2 → R3 → R4`

Report whether the correction:

- Eliminates avoidable systematic SRB-2g errors.
- Introduces any new CEO-anchor contradictions.
- Changes the output of unrelated rules.
- Produces deterministic results.
- Preserves mandatory Direction output.

Do not claim success if the new rule merely trades one systematic error for another without a valid semantic justification.

## 6.3 Existing 49-Unit Item GT Proxy

Re-run the available proxy corpus.

Prior R3 result:

`49/49 classified, 44/49 matched`

Report the new count.

This is Item GT used as a diagnostic proxy.

Do not call it Full-Look GT accuracy.

Inspect material regressions but do not fit the Full-Look resolver solely to Item ordinal targets.

## 6.4 Missingness

Test removal of individual nonessential observations:

- Material.
- Surface.
- Shoulder.
- Fit.
- Drop.
- Shape detail.
- Cinching.
- Relevant combinations.

A valid scorable packet must still return Direction.

If evidence loss changes the Direction, report it as sensitivity, not an exception.

A genuine zero-evidence input may remain a technical failure.

## 6.5 Semantic Guards

Test:

- Structured upper + Relaxed lower.
- Relaxed upper + Structured lower.
- Oversized Structured upper.
- Oversized Relaxed upper.
- Strong Shoulder with dominant release.
- Soft draped upper with functional cinching.
- Tailored open jacket.
- Built shoulder with retained upper structure.
- Fit alone not deciding Direction.
- No arbitrary default.
- No GT leakage.
- No Look-ID or filename leakage.

Use predefined, repeatable inputs.

No synthetic case may be described as human GT.

---

# 7. TASK D — COMPREHENSIVE PROTECTED REGRESSION

Run:

1. SR V1 replay and tests.
2. SR V2 replay and tests.
3. SR V3 replay and tests.
4. SR V3_R1 replay and tests.
5. SR V3_R2 replay and tests.
6. SR V3_R3 replay and tests.
7. New SR V3_R4 candidate tests.
8. Frozen Item SR tests.
9. TC Product-Only V2 tests.
10. Frozen Full-Look Vision release verifier R1–R9.
11. Full-Look 43-case replay.
12. Stored 20-response replay.
13. Proxy holdout.
14. Direction determinism.
15. Missing-evidence regression.
16. No forbidden scoring states.
17. PRE/POST protected-file hash comparison.
18. Dependency/contract verification.
19. Manifest verification.
20. Clean-room release rehearsal.

The known Item SR F31 environment assertion must be reported separately.

Do not edit Frozen Item SR merely to obtain a full green count.

No unrelated TC changes.

---

# 8. TASK E — FINAL TECHNICAL ACCEPTANCE

Before freeze, verify all acceptance gates.

| Gate | Required Result |
|---|---|
| F-01 | 100% S/R Direction coverage on valid scorable SR packets |
| F-02 | No normal UNKNOWN/UNRESOLVED output |
| F-03 | No invented missing facts |
| F-04 | Upper Priority preserved |
| F-05 | Failed CG-1 scoring switches absent |
| F-06 | SRB-2g systematic defect corrected or precisely bounded |
| F-07 | No arbitrary automatic Oversized/Shoulder shortcut |
| F-08 | Available CEO GT assessed honestly |
| F-09 | No newly introduced, unexplained material accuracy regression |
| F-10 | Holdout and edge cases evaluated |
| F-11 | Determinism verified |
| F-12 | Frozen Item SR unchanged |
| F-13 | Frozen Vision unchanged |
| F-14 | TC V2 unchanged |
| F-15 | Current Constitution complete and executable |
| F-16 | Approval authority and release scope unambiguous |

Important:

A known irreducible ambiguity caused by identical admissible inputs does not justify fabricating evidence or reopening Vision.

However, a preventable and systematic misclassification caused by an overbroad rule cannot be dismissed merely because output coverage is 100%.

If the final correction introduces a genuinely new unresolved semantic decision outside previously approved CEO principles, isolate that exact decision for CEO approval rather than pretending it is authorized.

Do not reopen all prior SR decisions.

---

# 9. TASK F — FINAL PRODUCTION PROMOTION & FREEZE

Proceed only if the acceptance gates pass and the applicable authorization requirements are satisfied.

Freeze scope:

`STMX FULL-LOOK SR DIRECTION ENGINE V1`

Do not claim to have frozen:

- SR Strength.
- SR ordinal score projector.
- EI.
- DM.
- Four-axis integration.
- Final Style ID.

## 9.1 Production Package

Produce a standalone, reproducible SR Direction production release.

Required:

- Runtime source.
- Input schema and adapter.
- Output schema.
- Approved SR Constitution.
- Dependency identities.
- Frozen Vision compatibility.
- Test suite.
- Replay runner.
- Golden outputs and diagnostics.
- README.
- Manifest.
- Release verifier.
- Rollback instructions.

Production must not depend on:

- Claude conversation history.
- CEO GT files.
- Manual ECC substitution.
- CG-1 sidecar.
- Research-only scripts.
- External live API access.
- Look-ID-specific data.

Preserve historical candidate and experimental packages unchanged.

## 9.2 Freeze Record

Create a canonical versioned Freeze Declaration containing:

- Release ID.
- Freeze date.
- Source and manifest SHA-256.
- Runtime fingerprint.
- Constitution identity.
- Exact scoring Direction semantics.
- Dependency pinning.
- Test results.
- Known bounded accuracy limitations.
- Explicit exclusions.
- Protected-file verification.
- Rollback location.

Mark Final Freeze only after successful independent clean-room verification and confirmation of required semantic authority.

Do not use a planned freeze date as evidence that freeze occurred.

---

# 10. TASK G — LOCAL BACKUP

After the successful Final Freeze, create a versioned backup capsule using the established STMX backup protocol.

Do not reuse the Item Scoring Engine backup capsule.

Use the appropriate governed Full-Look Scoring destination and naming convention from the actual Project Context / backup registry.

If the required destination is not formally defined, propose a clear new Full-Look SR destination without altering unrelated backup structures.

Include:

- Frozen production runtime.
- Frozen Constitution.
- Approval and freeze records.
- Input/output contracts.
- Regression tests.
- Dependency manifest.
- Source identity hashes.
- Golden replay data.
- Release verifier.
- Restore instructions.
- Relevant final CEO report.

Exclude:

- Credentials.
- Secrets.
- Unnecessary scratch files.
- Temporary caches.
- Paid-API credentials.
- Redundant experimental artifacts unrelated to restoring the release.

Perform:

1. Backup file census.
2. Manifest hash verification.
3. Production versus backup identity comparison.
4. Path-length check.
5. Dependency completeness check.
6. Clean-room restore.
7. Re-run release verification on the restored copy.
8. Rollback rehearsal where supported.

Only after these steps:

`SR_LOCAL_FINAL_BACKUP = VERIFIED`

---

# 11. TASK H — GOOGLE DRIVE BACKUP & ACTUAL VERIFICATION

Google Drive backup is mandatory before transitioning to TC.

This is a distinct gate from:

- Final Freeze.
- Local backup.
- Local Drive-export preparation.

Use the actual authorized Full-Look Scoring Google Drive destination.

Do not invent an existing Drive folder or claim one exists without verification.

## 11.1 If Direct Drive Access Is Available

Upload the completed frozen capsule.

Verify:

- Destination folder identity.
- Exact release folder.
- File/folder census.
- Manifest.
- SHA-256 or equivalent content integrity evidence.
- Upload completion.
- Remote file availability.
- A representative remote download/restore verification.
- Correct latest release pointer.

Preserve historical versions.

Do not overwrite unrelated backups.

## 11.2 If Direct Drive Access Is Not Available

Prepare a complete upload-ready backup folder with:

- Exact local path.
- Exact intended Drive destination.
- Final manifest.
- Upload instructions.
- Remote verification checklist.
- CEO confirmation requirements.

Then report:

`SR_FINAL_FREEZE = COMPLETE`

`SR_LOCAL_BACKUP = VERIFIED`

`SR_GOOGLE_DRIVE_BACKUP = PENDING_ACTUAL_UPLOAD_VERIFICATION`

Do not mark Google Drive PASS based only on local staging.

Do not claim that files were uploaded if Claude lacks actual Drive access.

The CEO may complete and confirm the upload through the established manual protocol.

After actual confirmation, record that confirmation and complete the remote backup gate.

## 11.3 Mandatory Transition Gate

TC may become the active workstream only when:

`SR_FINAL_FREEZE = VERIFIED`

AND

`SR_LOCAL_BACKUP = VERIFIED`

AND

`SR_GOOGLE_DRIVE_BACKUP = VERIFIED`

All three are mandatory.

If the remote backup remains pending, the next action is backup completion—not TC development.

---

# 12. PROJECT CONTEXT GOVERNANCE

Update the Project Context additively.

Required changes when verified:

- SR final rule correction.
- New Scoring Candidate and release identity.
- Actual regression results.
- Final SR Constitution approval status.
- Final Freeze status.
- Local backup status.
- Google Drive backup status.
- Known accuracy limitations.
- Next workstream gate.

Use the standard Source-of-Truth priority.

Keep historical reports unchanged.

Do not mark unexecuted actions as completed.

Do not promote a candidate's documentation to Frozen Authority without its required gate.

Record:

`AVAILABLE_EVIDENCE_MANDATORY_SCORING`

as the already approved cross-axis CEO decision, not a newly proposed rule requiring repeated semantic approval.

Keep the existing TC backlog correction requirement:

`FCR-TC-1`

for the later Full-Look TC completion stage.

---

# 13. REQUIRED DELIVERABLES

Create one final, compact package:

`04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/`

## D1 — CEO Final Closure Report (Korean DOCX)

Filename:

`STMX_FULL_LOOK_SR_FINAL_FREEZE_AND_BACKUP_CEO_REPORT.docx`

Required content:

1. Executive conclusion.
2. Exact change from R3 to R4.
3. Whether SRB-2g was corrected.
4. Final Structure/Release interpretation.
5. Original 43-case results.
6. Stored 20-response results.
7. Item GT proxy results.
8. Final CEO GT agreement/disagreement.
9. Any irreducible M317/M320 limitation.
10. Evidence-missing behavior.
11. New regression failures, if any.
12. Final Constitution identity.
13. Production release identity.
14. Final Freeze result.
15. Local backup result.
16. Google Drive upload result.
17. Remaining CEO approval or manual upload action, if any.
18. TC transition readiness.

Include only essential before/after case evidence.

Avoid another lengthy historical SR research recap.

## D2 — Final SR Constitution

Exact executable S/R rule contract, precedence, exclusions and evidence traces.

## D3 — Final Engine Release

Runnable code, tests, input/output contracts, CLI, README, verifier, manifest.

## D4 — Consolidated Regression Ledger

43 original looks + 20 stored live responses + available holdout comparisons.

## D5 — Final Freeze & Integrity Record

Release fingerprint, dependency pins, clean-room verification, freeze approval trace.

## D6 — Local Backup & Restore Verification

Complete capsule identity, manifest and restore results.

## D7 — Google Drive Upload & Verification

Exact real upload status, destination, file census and confirmation evidence.

If upload is pending, provide the ready-to-upload capsule and precise next action.

## D8 — Milestone 5 Closure & TC Transition Gate

State whether SR is fully closed, locally frozen but Drive-pending, or technically blocked.

Do not hide pending backup work.

---

# 14. FINAL STATUS CONTRACT

Report exactly one primary status:

## STATUS A

`FULL_LOOK_SR_DIRECTION_FINAL_FROZEN_AND_BACKUP_VERIFIED`

Requirements:

- Semantic and regression acceptance passed.
- Production Final Freeze verified.
- Local backup verified.
- Google Drive backup verified.

Result:

`SR_MILESTONE_5 = CLOSED`

`NEXT_WORKSTREAM = FULL_LOOK_TC_FINAL_CORRECTION`

TC may begin under the next authorized execution order.

## STATUS B

`FULL_LOOK_SR_DIRECTION_FROZEN_LOCAL_BACKUP_VERIFIED_DRIVE_PENDING`

Requirements:

- Production Final Freeze verified.
- Local backup verified.
- Google Drive actual upload/verification incomplete.

Result:

`SR_MILESTONE_5 = BACKUP_GATE_PENDING`

`NEXT_ACTION = GOOGLE_DRIVE_UPLOAD_AND_VERIFICATION`

Do not start TC yet.

## STATUS C

`FULL_LOOK_SR_FINAL_FREEZE_BLOCKED`

Requirements:

A material rule, semantic, regression, governance or release gate remains unsatisfied.

Result:

Provide one exact blocker and the minimum correction or CEO decision required.

No Final Freeze claim.

No backup-complete claim.

No TC transition.

---

# 15. NEXT WORKSTREAM — TC HANDOVER ONLY

When SR final freeze and both backups are actually verified, the next workstream is:

`FULL_LOOK_TC_PRODUCT_ONLY_V2_FINAL_CORRECTION_FREEZE_AND_BACKUP`

Known pending TC issue:

`FCR-TC-1`

The previous read-only audit identified eight cases where missing evidence prevented TC Direction resolution.

The same CEO mandatory-scoring rule must be applied to Full-Look TC.

The subsequent TC execution must:

1. Preserve already completed TC Product-Only V2 semantics.
2. Remove missing-evidence scoring blockers.
3. Return Classic/Transformative for valid, scorable inputs.
4. Test actual accuracy and completeness.
5. Final Freeze TC.
6. Verify local backup.
7. Verify Google Drive backup.
8. Then clear the EI development gate.

This section is a handover instruction, not authorization to implement TC inside the current SR order.

Do not confuse Frozen Item TC with Full-Look TC.

No EI/DM development before verified TC completion and backup.

---

# 16. HARD PROHIBITIONS

Do not:

- Restart SR research.
- Add Vision parameters.
- Reopen Frozen Vision.
- Make paid API calls.
- Reintroduce CG-1.
- Reintroduce missingness-based scoring refusal.
- Add arbitrary S/R defaults.
- Fit scoring rules to Look IDs.
- Use CEO GT as runtime input.
- Automatically assign Relaxed to every Oversized look.
- Automatically assign Structured to every strong-shouldered look.
- Change Frozen Item SR.
- Modify TC code.
- Implement EI or DM.
- Implement SR Strength/ordinal scoring.
- Implement four-axis Style ID integration.
- Alter historical frozen artifacts.
- Misrepresent local staging as Google Drive.
- Skip freeze verification.
- Skip restore testing.
- Declare backup verified without actual evidence.
- Start TC while the SR backup gate remains open.

---

# 17. EXECUTION INSTRUCTION — COMPLETE THE WORK

Carry out the following in order:

1. Source-of-Truth and Design Review.
2. PRE integrity snapshot.
3. Targeted SRB-2g correction.
4. R4 executable Candidate.
5. 43-case / 20-live / holdout regression.
6. Final semantic and technical gate evaluation.
7. Final Constitution and release verification.
8. Production promotion and Final Freeze, if authorized gates pass.
9. Local backup and clean-room restore.
10. Google Drive upload and actual verification if access permits.
11. Project Context and version updates.
12. Korean CEO Final Report.
13. SR closure status and next TC gate.

Do not stop after producing only another scoring candidate if the verified release is eligible for freeze.

Do not return with repeated small research recommendations.

Use the existing codebase and evidence.

If a material semantic or scoring problem prevents legitimate freeze, disclose the exact issue without fabricating approval or success.

If Google Drive access is unavailable, finish every local step and present the upload-ready package rather than claiming a remote backup that did not occur.

Then stop at the actual remaining gate.

---

# PRIMARY SUCCESS CONDITION

Complete and Final Freeze the Full-Look SR Direction Engine using the CEO-approved available-evidence mandatory-scoring architecture.

Correct the final avoidable SR classification defect without introducing simplistic fit/shoulder shortcuts.

Preserve deterministic Structured/Relaxed output for all valid, scorable Full-Looks.

Verify the production release, local backup and actual Google Drive backup.

Only after all three gates are satisfied may the project transition to Full-Look TC final correction, freeze and backup.

END OF CLAUDE EXECUTION ORDER
