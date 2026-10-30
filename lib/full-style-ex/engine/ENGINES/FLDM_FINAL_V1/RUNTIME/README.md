# STMX Full-Look DM Direction Resolver — V3.1 CANDIDATE (`FL_DM_DIRECTION_CANDIDATE_V3_1`)

> **CANDIDATE — not approved, not frozen, not a production pointer.** CEO order FCR-DM-1 V3 correction (2026-10-29). Successor of V3 (`STMX_FULL_LOOK_DM_DIRECTION_RESOLVER_V3_CANDIDATE/`, unchanged). Governance package: `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_DM_V3_1_TARGETED_CORRECTION_AND_BINARY_VALIDATION_V1/`.

**The only change vs V3:** rule **DM31-D4 SURFACE_ARTICULATION_FIELD** — a constructed-surface articulation (family B) on a worn garment with observed size medium or large is Detail at any contrast / position (see `src/fl_dm_authority_v3_1.js`). Neutral: prohibited (CEO: all Full-Look axes binary).

**Input:** one frozen Full-Look Vision Evidence Packet (DM Vision Evidence Transport V2).
- The adapter reads only SVP-001 `look_frame`, SVP-002 component identity, and DMP-1/2/3 (`look_components`, `look_detail_systems`, `dm_evidence_visibility`).

**Output:**
- `status` (SCORED / INPUT_FAILURE)
- `direction` (D / M)
- `direction_reason` (Korean)
- `evidence_used`, `evidence_not_deciding`
- `rule_trace`
- `candidate_version`
- `diagnostics` — non-scoring: visibility, impact-not-establishable systems, unobserved primitives, Neutral policy.

**Rules:** see `src/fl_dm_authority_v3_1.js` (DM3-S0 · MS1 · D1 · D2 · D3 · DM31-D4 · M1).
- Changes from V2-C:
  - mandatory scoring (STMX-2026-10-AEMS): no UNRESOLVED final result;
  - MS-1 (an unobserved primitive contributes nothing);
  - input failures are reported separately;
  - Korean Reason and trace.
- The three D routes are unchanged.
- Neutral is prohibited (CEO 2026-10-29: binary).

```
node tests/run_tests.js
node cli/run_offline_replay.js <packet.json> ...
```

Deterministic · GT-blind · no look-id branch · no Item DM fallback · no Vision repair · no network.
