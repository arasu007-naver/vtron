# D4 — CEO Controlled Known-Limitation Acceptance Record

> Order §4 · §5. Source: `AUTHORIZATION/CEO_ORDER_VERBATIM.md` (sha `2a477887750dbf8b5b8e13277748c871b9a4fddb662b05732ee1e5649336b543`), CEO 2026-10-26, "STMX FULL-LOOK EI V1 — CONTROLLED FINAL FREEZE, KNOWN LIMITATION ACCEPTANCE & VERIFIED LOCAL / GOOGLE DRIVE BACKUP".

```text
FULL_LOOK_EI_V1_KNOWN_LIMITATION_ACCEPTANCE

LIMITATION_ID          = FL-EI-LIM-F228-001
CEO_GROUND_TRUTH       = EXPRESSIVE
FROZEN_RUNTIME_OUTPUT  = INTROVERT
GT_AGREEMENT           = 3/4
ACCEPTANCE_TYPE        = CONTROLLED_V1_KNOWN_LIMITATION
CORRECTION_STATUS      = DEFERRED_NOT_IMPLEMENTED
CEO_GT_STATUS          = RETAINED_FINAL
V1_FINAL_FREEZE        = AUTHORIZED_SUBJECT_TO_ACCEPTANCE_GATES
```

## 1. What is accepted

The CEO accepts, for the closure of Full-Look EI **V1** only, that the frozen V1 runtime (V1_R3, code identity `429896df…`) classifies **F228 as INTROVERT**, while the CEO's final whole-look judgment is **EXPRESSIVE**.

## 2. What is not accepted or implied

| statement | status |
|---|---|
| F228 is correctly reproduced / "F228 FIXED" | **false** — F228 remains a known incorrect prediction |
| the CEO GT is overridden or changed | **false** — CEO_GT_STATUS = RETAINED_FINAL |
| F228 is removed from the GT denominator | **false** — agreement is reported 3 / 4 with F228 in it |
| the INTROVERT output is semantically correct | **false** (order §4.4) |
| a runtime GT override is authorized | **false** — the runtime reads no GT and has no case-ID branch |
| other, unknown GT mismatches are accepted | **false** — this acceptance covers FL-EI-LIM-F228-001 only |
| SC-1 is approved | **false** — SC1 = NOT_APPROVED_NOT_IMPLEMENTED |

## 3. Why the limitation exists (from the RC-C → RC-B → EISREC audits)

The frozen packet captures part of the visible design (order §4.3):
- white and beige garments, with white recorded as a **field** colour;
- `Gathered` on the shirt;
- DM Family F decorative construction on the shirt (contrast medium);
- DM Family B constructed surface on the cardigan (contrast low);
- the cardigan-over-shirt layer relation.

It does not preserve the visual distinctions used in the CEO judgment:
- the strong White–Beige relation as a qualifying point;
- the sailor-like vs flower-like collar forms;
- the raised bobble texture.

The V1 constitution has no approved general rule that reproduces EXPRESSIVE from these records. The only candidate rule (SC-1) is not accepted.

## 4. Separation of the frozen engine from research artefacts (order §5)

```text
SHARED_RAW_EVIDENCE_CONSUMER = RESEARCH_CANDIDATE_ONLY
SC1                          = NOT_APPROVED_NOT_IMPLEMENTED
V1_R4                        = NOT_CREATED
FROZEN_RUNTIME               = V1_R3_ONLY
```

These remain preserved, unchanged and outside the release:
- the consumer reference implementation (EISREC `_raw/consumer/`);
- the Family F qualification analysis;
- SC-1 and its counterfactuals;
- the RC-B research candidates and the F228 proposed corrections.

A future V2 may revisit them only under a separately authorized workstream.

## 5. Conflict with general freeze-acceptance rules

Previous Full-Look EI orders made "all CEO GT reproduced" a Final Freeze eligibility condition. Examples:
- EIF228 / EIF228V acceptance item "F228 E reproduced only if lawfully supported";
- EISREC §16 Outcome A "All CEO GT reproduced".

**Precise conflict:** under those conditions GT 3 / 4 is not eligible.

**Narrow, traceable exception applied:** this order (§0, §4.4) authorizes the Final Freeze subject to the acceptance gates, with exactly one disclosed mismatch, FL-EI-LIM-F228-001.
- The exception is recorded here, in the freeze declaration, in the seal (`known_accepted_limitation`) and in the Decision Log.
- It is applied **only** to the GT-agreement condition and **only** to F228.
- Every other gate is evaluated unchanged: identity, binary coverage, replay, determinism, regression, integrity and backup.
- No other conflict was found.

## 6. Gate B (order §14)

| requirement | result | evidence |
|---|---|---|
| F228 CEO E preserved | PASS | GT register unchanged; Decision Log entries kept |
| runtime I disclosed | PASS | release test RT08 guards it; D6 |
| known limitation formally documented | PASS | this record + D5 + `CURRENT_CONSTITUTION/STMX_FULL_LOOK_EI_V1_KNOWN_LIMITATION_REGISTER.md` (written at freeze) |
| no GT rewriting | PASS | no GT file written (QA scan) |
| no SC-1 implementation | PASS | runtime byte-identical to V1_R3 |
| no unapproved semantic changes | PASS | runtime fingerprint = V1_R3 src; the constitution restates only |
| no unrelated blocker concealed | PASS | D2: no BLOCKER; D5 reconciles every prior L-item |
