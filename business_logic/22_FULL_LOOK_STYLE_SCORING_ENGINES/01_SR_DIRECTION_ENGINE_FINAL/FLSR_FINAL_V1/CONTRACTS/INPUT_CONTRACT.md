# Input contract — STMX Full-Look SR Direction Engine V1

One look = two JSON files produced by the **Frozen Full-Look Vision Extractor Final V1** (`FLV-FINAL-FREEZE-V1`, release `01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/`, seal `a6803bfa…`). The extractor CLI `run_offline.js` writes both.

| file | contract | required blocks |
|---|---|---|
| `packet.json` | `packet_contract = STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET`, `packet_version = V1_RC4`, `requested_axes` includes `SR` | `look_frame` · `component_registry` · `relations` · `upper_realization` (`source_refs`, `relation`, `shoulder`, `shape_behaviour`) · `common_visibility` · `component_fact_pool` |
| `run_record.json` | `parameters` object; packet_version (if present) = `V1_RC4` | cells `SVP-007` / `SVP-008` / `SVP-009` agree with `upper_realization`; `SVP-106@<gov>` drop · `SVP-119@<gov>` waist; every `@cNN` ref exists in the registry |

Fields read are listed in `CONSTITUTION/STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4.md` §1.

- Any field may be absent or UNKNOWN / NOT_VISIBLE / ABSENT. Missingness never blocks scoring (MS-1).
- A violated contract gives `TECHNICAL_EXCEPTION / INPUT_FAILURE / INPUT_CONTRACT`.
- A non-observable look frame or a missing governing upper gives `UPPER_NOT_VISIBLE`.
- A governing upper with no SR fact at all gives `NO_UPPER_SR_EVIDENCE`.
- A CG-1 sidecar (`cg1_extension`), if passed, is ignored.
