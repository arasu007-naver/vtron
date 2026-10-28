# Input contract — STMX Full-Look EI Direction Engine Final V1

One look = two JSON files produced by the **Frozen Full-Look Vision Extractor Final V1** (`FLV-FINAL-FREEZE-V1-2026-10-17`, release `01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/`).

| file | contract | required blocks |
|---|---|---|
| `packet.json` | `packet_contract = STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET`, `packet_version = V1_RC4`, `requested_axes` includes `EI` | `look_frame` · `component_registry` (array) · `colour_composition` (`field[]`, `points[]`) · `canonical_exposure` (+ `component_fact_pool` when present) |
| `run_record.json` | `parameters` object; `packet_version` (if present) = `V1_RC4` | cells `SVP-101 / 102 / 121 … 126@<cNN>`; every `@cNN` ref exists in the registry; cell states agree with the fact pool |

Fields read are listed in `CONSTITUTION/STMX_FULL_LOOK_EI_BINARY_DIRECTION_CONSTITUTION_V1_R3.md` §3.
- Any fact may be absent or UNKNOWN / NOT_VISIBLE. Missingness never blocks scoring and never creates E.
- `dm_evidence`, `dm_transport` and other-axis blocks are **not** read.
- A violated contract (or EI not requested) gives `TECHNICAL_EXCEPTION / INPUT_FAILURE / INPUT_CONTRACT`.
- A non-observed look frame, `image_failure` or `not_a_worn_look` gives `NO_OBSERVABLE_WORN_LOOK`.
- An empty registry gives `NO_COMPONENT_OBSERVED`.
- Look id, image ref, run id and file names are never read for a decision.
