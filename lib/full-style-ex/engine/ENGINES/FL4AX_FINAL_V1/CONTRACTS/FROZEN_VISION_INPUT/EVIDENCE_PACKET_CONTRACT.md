# Canonical Evidence Packet — `STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET` version `V1_RC4`

One JSON object per image (`packet.json`). Top-level blocks (in order): `packet_contract` · `packet_version` · `source_mode` · `requested_axes` · `look_frame` · `component_registry` · `relations` · `colour_composition` · `upper_realization` · `canonical_exposure` · `component_fact_pool` · `common_visibility` · `dm_evidence` · `dm_transport` · `request_trace`.

| block | content |
|---|---|
| packet_contract / packet_version | contract identity (unchanged since RC4) |
| source_mode · requested_axes | observation route (B = direct look) · EI / TC / SR / DM |
| look_frame | whole-look readability state + limits (crop · lower_body_cropped · feet_not_visible · occlusion …) |
| component_registry | participating components: ref · identity · as-worn front state · footwear family / subtype |
| relations | layer relations (over / under / revealed) and securing relations |
| colour_composition | Colour V1: field[] · points[] (contrast Tonal / Subtle / Distinct, optional carrier_part) · partial[] (unresolved lightness / effect / contrast kept partial) · suppressed[] (Colour V1 suppression, e.g. stitching) · unreadable[] |
| upper_realization | governing upper component(s) and the final upper relation · shoulder · shape |
| canonical_exposure | exposure events and hidden regions |
| component_fact_pool | every demanded fact per component: state OBSERVED / ABSENT / NOT_VISIBLE / UNKNOWN, value, route, observation group |
| common_visibility | frame state + facts not visible with limitation |
| dm_evidence | DM Evidence Transport V2: look_components · look_detail_systems (verbatim from the model) · dm_evidence_visibility (DMP-3, derived from the frame or UNKNOWN) |
| dm_transport | authority hashes + output fingerprint |
| request_trace | which axis requested what; isolation notes |

No block contains a score, a direction, a strength, a verdict, an eligibility flag or a Style ID (acceptance gate C-05). The JSON schema of record: `EVIDENCE_PACKET_SCHEMA_V1_RC4.json`; enforcement: `01_RUNTIME/01_ENGINES/STYLE_VISION_EXTRACTOR/FLV_RC6_FINAL/src/validator.js`.
