# STMX ITEM SCORING ENGINE V1 — FINAL LIMITATION REGISTER

> **Status:** frozen with STMX ITEM SCORING ENGINE V1 (Final Freeze 2026-09-27) · Approval Anchor: CEO Decision 2026-09-27 (Final Freeze order Decisions 4–6 · §26–§27 · §33). None of these limitations invalidates the integration architecture; none may be "fixed" by the composition layer.

| id | limitation | disposition |
|---|---|---|
| L1 | No real governed record currently supplies all required evidence for all four axes. EI · TC · SR share the governed 114 population; DM is validated on its own populations (75-case replay · 77 BSC-1 targeted · 220 guard); the 114 records carry no V1_3 DM block. A four-axis request on them returns INCOMPLETE with DM = MISSING_REQUIRED_INPUT. | frozen truth — no synthetic evidence |
| L2 | TC may return bounded / null score output (side + range, `score = null`, governed cause). This is lawful production truth and can be part of a COMPLETE request. | frozen truth |
| L3 | TC exact numeric scoring remains unavailable under the frozen TC limitations (0 / 114 exact; TC Final Freeze limitation register L1–L8). | frozen TC limitation |
| L4 | SR has no engine-level matched-pair combined result for the 9 MATCHING_PAIR units. The pair combination exists only in the frozen SR replay / test context (`tests/replay_101_final.js`); V1 evaluates SR per garment record and does not move that logic into SR. | frozen limitation (CEO Decision 4) |
| L5 | V1 does not itself support arbitrary new garments / photos: EI needs Colour V1 `color_observation` (not emitted by Producer V1_1 or V1_3); the TC input is a corpus-bound governed `anchor_id`; SR needs caller-supplied governed eligibility metadata. | out of V1 scope (CEO Decision 6) |
| L6 | Legacy Clean Engine L1 / L2 Vision vocabulary (`body_fitting` · `waist_cinching`) remains stale but is outside the canonical V1 path (PRE-EXISTING CLEAN ENGINE UPSTREAM DRIFT NOT ON STMX ITEM SCORING ENGINE V1 CANONICAL PRODUCTION PATH). | pre-existing |
| L7 | EI integration preserves the existing frozen NO_FORCE behavior as a behavioral invariant (the frozen Direction runtime marks those pathways NO_FORCE; the frozen Numeric state contains none; exclusion is required for the 114 / 114 exact reproduction). It does not create new EI semantics. | existing frozen EI behavioral invariant preserved by V1 integration (CEO Decision 5) |
| L8 | SR `halves[].strength` (one-piece garments) carries the V1.2 binary state inside a field the SR canonical output contract does not classify; the composer withholds only authority-named diagnostic fields, so it is preserved verbatim. | demonstrated · preserved (SR unchanged) |
| L9 | The TC semantic payload carries its own historical `authority_status: CANDIDATE` field while the envelope reports PRODUCTION (pre-existing since TC V2.3.92; PRODUCTION_STATUS_NOTICE). | demonstrated · pre-existing |
| L10 | SR is bound by the pointer kind, which does not re-hash SR files at invocation (generic binding design, unchanged); SR drift is covered by SR `verifyFrozenBaseline()` in every replay. | demonstrated · pre-existing design |
| L11 | EI / DM return integer scores and SR returns SR#; display labels exist only at the presentation boundary (`presentNotation`). | presentation boundary |
| L12 | No public API; the Item Entry is an internal governed entry surface. | out of V1 scope |
