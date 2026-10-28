# STMX Full-Look EI Binary Direction Resolver V1_R3 — CANDIDATE

> CANDIDATE: not frozen and not in production. Its governance package is `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_EI_V1_R3_FINAL_CONTRACT_CORRECTION_AND_FREEZE_READINESS_V1/`. The three predecessors, `…_V1_CANDIDATE/`, `…_V1_R1_CANDIDATE/` and `…_V1_R2_CANDIDATE/`, are unchanged. 0 API calls.

V1_R3 is the final contract correction of V1_R2, made under the V1_R3 order of 2026-10-25. File names are unchanged, so each change can be diffed file by file against V1_R2.

| file | change vs V1_R2 |
|---|---|
| `src/fl_ei_evidence_v1.js` | **Evidence set:** the frozen EI Phase 2 Surface / Material / Decorative canonical (CEO 2026-08-01). It is read through `PHASE2_CLASS`, a transcription of the frozen Vision release `COVERAGE_EVIDENCE_MAP`, which a test checks against the pinned file text. Only the D02 – D04 ornament classes can support a point. |
| | **PS-1 (R3):** a pocket square is a conventional formal completion only when three facts are observed: (a) it has no expressive effect of its own, (b) its colour is an observed shirt colour, and (c) a bow tie is registered. A square that is not a completion is judged **only** by the governed point rule (PS-1 qualifies nothing). If a needed fact is not observed, the square's role is undetermined and it is not counted. The matched-suit fact has been removed. |
| | **ACC-1 (R3):** no accessory category qualifies or is excluded by itself. A white_family or camel non-metallic point qualifies only when an observed D02 – D04 ornament carries the colour. |
| | **ACC-2 (R3):** functional metal qualifies only with an observed D02 Applied Embellishment (Jewelry Attachment · Sequin-Beading · Appliqué) on the same component. |
| | EX-1 / EX-2 unchanged. |
| `src/fl_ei_authority_v1.js` | `CONSTITUTION_ID` is now `…_V1_R3`. Anchors `R3_CONTRACT` and `PHASE2` added. Two provenance pins added (the Phase 2 canonical, and `producer_rules_v1.js` hashed but never executed). Rule wording follows R3. |
| `src/fl_ei_direction_resolver_v1.js` | `RESOLVER_ID` and header only |
| `src/fl_ei_colour_base_v1.js` · `src/fl_ei_input_adapter_v1.js` | unchanged |
| `cli/run_offline_replay.js` | Four-way replay: V1, V1_R1 and V1_R2 are re-run read-only and checked against their sealed ledgers. Output is `validation/ei_r3_replay_ledger.json`. |
| `tests/run_tests.js` | The V1_R2 suite is kept. Four superseded expectations are reported NOT_APPLICABLE with their reason and a replacement test. R3 groups added: R3-P (P-01 … P-12) · B · M · D · E · S · G · H · K · J. Output is `validation/ei_r3_tests.json`. |

Run:

```bash
node cli/run_offline_replay.js
```

```bash
node tests/run_tests.js
```

Exit code 0 means no FAIL. Only PASS counts as a pass.
