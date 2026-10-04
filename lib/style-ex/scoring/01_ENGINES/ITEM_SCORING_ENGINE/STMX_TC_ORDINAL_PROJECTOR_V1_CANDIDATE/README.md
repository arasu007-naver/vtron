# STMX_TC_ORDINAL_PROJECTOR_V1_CANDIDATE

Bounded, fail-closed, identity-free TC ordinal projector (STMX TC MAINLINE V2.3.90). **CANDIDATE** — not bound into the Clean Engine, not frozen, not promoted.

- Contract: `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_TC_ORDINAL_REPRESENTATION_CONTRACT_FREEZE_V1.md`
- Entry: `src/tc_ordinal_projector_v1.js` → `project(pkg)`
- Input (allowlist): `subject_ref` (opaque, echoed only) · `direction` · `direction_status` · `strength` · `strength_status`
- Output: `direction` · `direction_status` · `strength` · `strength_status` · `score` (always null today) · `score_status` (UNRESOLVED) · `ordinal_status` · `ordinal_bounds` · `unresolved_cause` · `authority_status` · `provenance`
- Tests: `node tests/run_projector_tests_v2390.js` (synthetic packages only)

No exact tier is emitted under current authority (contract O-6). TC5 is never emitted (O-3).
