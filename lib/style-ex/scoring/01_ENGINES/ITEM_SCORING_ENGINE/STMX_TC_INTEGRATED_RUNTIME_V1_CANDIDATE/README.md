# STMX TC INTEGRATED RUNTIME V1 — CANDIDATE

> STMX TC MAINLINE V2.3.91 · TC ENGINE INTEGRATION · 2026-09-27 · CANDIDATE — executes only in SHADOW mode through the Clean Engine L7 axis-runtime binding · NOT FROZEN · NOT PRODUCTION

> **Approval Anchor** — CEO Decision 2026-09-27 (order V2.3.91 §1 · §4 · §12 · §37; D-91-1 registry rebinding approved in session). Reason: connect the frozen TC Direction, the Strength status and the frozen ordinal projector into one governed runtime chain without changing TC semantics. Affected Scope: this directory (new) · Clean Engine registry TC entry.

## Chain

`governed TC input → frozen Direction (STMX_TC_DIRECTION_FREEZE_V1, fingerprint-verified) → Direction status → Transformative Strength status → ordinal projector V1 → output payload` (collected by the Clean Engine into the common envelope).

| step | component | authority |
|---|---|---|
| Direction | Step 2 successor V4 shadow binding V3 (`runShadow`) | STMX_TC_DIRECTION_FREEZE_V1 (fingerprint `a7d53f76…` checked on every corpus run) |
| Strength status | `strengthStatus()` | frozen Strength contract + automation limitation: CLASSIC → NOT_APPLICABLE · TRANSFORMATIVE → UNRESOLVED / KNOWN_INFORMATION_OR_REPRESENTATION_LIMITATION · DIRECTION_UNRESOLVED → NOT_ELIGIBLE · no resolver |
| ordinal | STMX_TC_ORDINAL_PROJECTOR_V1_CANDIDATE `project()` (verbatim) | STMX_TC_ORDINAL_REPRESENTATION_CONTRACT_FREEZE_V1 |
| guard | `assertOutput()` | O-3 · O-5 · O-6 checks; refuses, never repairs |

## Entry points

- `runCorpus()` — governed 114-unit population (Clean Engine CORPUS invocation, key `anchor_id`, score output `score`).
- `integrateUnit(pkg)` — one governed Direction result package `{ schema_version: STMX_TC_INTEGRATED_INPUT_V1, direction_authority: STMX_TC_DIRECTION_FREEZE_V1, direction, subject_ref? }`. Strength, score, tier and ordinal fields are refused; unknown fields are refused; nothing is coerced.

The ordinal projector inside this chain carries the governance status **INTEGRATED_CANDIDATE** (V2.3.91); its code and contract are unchanged (still identity `352a7ea6…`).

This is not a Vision → TC arbitrary-image path, not Score Physics, not a Strength resolver, not production.
