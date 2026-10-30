# Input contract — STMX Full-Look TC Direction Engine V1

One look = two JSON files produced by the **Frozen Full-Look Vision Extractor Final V1** (`FLV-FINAL-FREEZE-V1-2026-10-17`, release `01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/`). The extractor CLI writes both.

| file | contract | required blocks |
|---|---|---|
| `packet.json` | `packet_contract = STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET`, `packet_version = V1_RC4`, `requested_axes` includes `TC` | `look_frame` · `component_registry` · `relations` · `canonical_exposure` · `common_visibility` (+ `component_fact_pool` when present) |
| `run_record.json` | `parameters` object; `packet_version` (if present) = `V1_RC4` | garment product cells `SVP-101 … SVP-126@<cNN>`; every `@cNN` ref exists in the registry; cell states agree with the fact pool |

Fields read are listed in `CONSTITUTION/STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1.md` §3 · §5 · §6.

- Any product fact may be absent or UNKNOWN / NOT_VISIBLE / ABSENT. Missingness never blocks scoring and is never Classic evidence.
- A violated contract gives `TECHNICAL_EXCEPTION / INPUT_FAILURE / INPUT_CONTRACT`.
- A non-observable look frame, `image_failure` or `not_a_worn_look` gives `NO_OBSERVABLE_WORN_LOOK`.
- No garment component gives `NO_GARMENT_OBSERVED`.
- No departure and no garment fact readable by the frozen TC predicates gives `NO_TC_PRODUCT_EVIDENCE`.
- Look id, image ref, run id and file names are never read for a decision.
