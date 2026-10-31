# STMX_SR_ENGINE_V2_DIRECTION_REASON_R3_CANDIDATE

> **R3 (CEO order "STMX Item SR V2 Final Evidence & Scoring Correction R3", 2026-10-27).** Versioned copy of the R1/R2 candidate
> `STMX_SR_ENGINE_V2_DIRECTION_REASON_CANDIDATE/` (kept unchanged). R3 changes: release corroboration from existing Vision values (soft
> sleeve volume · openwork Lace / Mesh, both only in Semi-Fluid / Fluid cloth) consulted ONLY in the Regular-fit drape-cloth branch → new rule
> SR-V2-P5r (R); verifier pattern fix for "구조이"; tests read the CEO versioned overlay (test layer only). Package:
> `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_SR_V2_FINAL_EVIDENCE_AND_SCORING_CORRECTION_R3/`. ⛔ Not production · not frozen.
> The text below is the R1/R2 description, still valid for every unchanged part.

**Status:** IMPLEMENTATION CANDIDATE — ⛔ NOT PRODUCTION · not bound into the Item V1 registry · SR production pointer unchanged · no Final Freeze.
**Order:** STMX ITEM SCORING ENGINE V2 — SR BINARY DIRECTION + VISION-GROUNDED REASON CANDIDATE IMPLEMENTATION & FULL REGRESSION (CEO 2026-10-26, step 1 of 6).
**Design authority:** `04_GOVERNANCE_AND_FINAL_DOCS/STMX_ITEM_V2_FOUR_AXIS_MANDATORY_DIRECTION_REASON_ARCHITECTURE_CLOSURE_V1/` (D7 / D14), under the CEO mandate that every valid product receives a Direction.

## What it does

```text
received record { category, observations } (+ { sr_evidence_eligibility } metadata)
  → frozen V1.2 adapter + admission (bound BY NAME, sha256-verified at load; read-only)
    → V2 product-level Direction resolver (every branch ends in S or R)
      → Korean Reason composer → independent provenance verifier
        → customer output { "direction": "S" | "R", "reason": "…" }
```

- No NEUTRAL / UNKNOWN / UNRESOLVED / NOT_SCORABLE / null result. No score, tier, Strength, confidence or rule id in the customer object.
- Eligibility metadata no longer gates scoring: it selects the Reason wording (worn-body vs garment-cut) and is recorded as a diagnostic. Missing metadata → garment-cut wording.
- A non-product packet (no observations / non-SR category) is a transport rejection (`SRV2TransportError`), never a Direction.
- ⛔ The frozen Direction resolver, Strength sidecar and ordinal projector are not loaded. ⛔ No GT, REF, filename or image is read.

## Run

```bash
node tests/run_all.js
```

Exit 0 = every suite passed. Suites: `replay_123.js` (full product census, GT layers attached after the decision), `test_guards.js` (incomplete / out-of-domain / flat inputs, identity / GT / category mutations, Reason mutations, determinism, contract), `test_holdout.js` (real unused records — coverage only; synthetic one-piece grid — labelled synthetic). Raw results: `tests/_replay_123_raw.json` · `_guards_result.json` · `_holdout_result.json` · `_run_all_result.json`.

Programmatic use:

```js
const E = require('./src/sr_v2_engine');
const r = E.evaluate(record, { sr_evidence_eligibility: 'ADJUDICABLE_WORN' });
r.customer            // { direction: 'S' | 'R', reason: '…' }
r.decisive_rule_id    // internal diagnostic (never shown to the customer)
```

## Files

| file | role |
|---|---|
| `BOUND_INPUTS.json` | the frozen dependencies, by path + sha256 (verified at load) |
| `src/sr_v2_binding.js` | binding + candidate identity |
| `src/sr_v2_evidence.js` | product-level evidence (regions), transport validation, SR-V2-X0 |
| `src/sr_v2_direction_resolver.js` | the rule chain P1a · P1b · M2 · P2a · P2b · P3a · P3b · P3c · P4 · P5 · P5b · Z1 |
| `src/sr_v2_reason_lexicon.js` | controlled Korean lexicon (worn / flat forms) |
| `src/sr_v2_reason_composer.js` | Reason composer (decided Direction → clauses with provenance) |
| `src/sr_v2_reason_verifier.js` | independent verifier (re-reads the record) |
| `src/sr_v2_engine.js` | entry point + customer output composer |
| `CODE_IDENTITY_SEAL_SR_ENGINE_V2_DIRECTION_REASON_CANDIDATE.json` | candidate identity (not a freeze) |
