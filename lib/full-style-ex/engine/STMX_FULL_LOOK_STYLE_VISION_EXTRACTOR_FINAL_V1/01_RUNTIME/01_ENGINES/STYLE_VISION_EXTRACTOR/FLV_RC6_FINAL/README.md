# STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC6

**Status:** RELEASE CANDIDATE RC6 — OFFLINE (not frozen · not production · identity-sealed, not a freeze). Successor of `STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC5` (preserved, sealed `SEAL-FLV-RC5-2026-10-16`).
Order: *STMX FULL-LOOK VISION — SCORING-IMPACT-FIRST VISUAL ACCURACY CORRECTION V1* (CEO 2026-10-17). Validated OFFLINE on the 12 sealed EX-04 live responses; RC6 received **no** live call.

**RC6 change vs RC5 (code-level only — live-validation prompt V2, schema, packet contract `V1_RC4`, frozen DM / Item / Colour authorities unchanged):**
- **A-1 (scoring-material)** `src/transport/convert.js` — frozen Colour V1 (`run/color_recovery/color_contract_v1.js` line 89: thread, stitching, buttonholes, seams … are NEVER additional colors) applied on the model-output path. A colour area whose `part` the model itself names stitching / thread is routed to the EXISTING G-1 suppression carrier (`suppressed_by: 'stitching'` → `colour_composition.suppressed`, rule `COLOUR_V1_SUPPRESSION:stitching`); it is never a field or point. Family / role / contrast / part are kept in the transport log (`COLOUR_V1_STITCHING_SUPPRESSED`). A carrier whose only area was stitching still receives the converter's explicit NOT_EMITTED → colour UNKNOWN entry. Designed contrast stitching stays DM evidence (family D) — DM systems are untouched. No new token, key or vocabulary.
- **Prompt V3 — UNVALIDATED CANDIDATE ONLY** `prompts/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V3_UNVALIDATED.txt` (built by `prompts/build_integrated_prompt_v3.js`; diff `prompts/INTEGRATED_PROMPT_V3_UNVALIDATED_DIFF_MANIFEST.json`): V2 + the frozen Item V1_3 fit definition (verbatim, `producer_prompt_v1.js` lines 503–523) after SVP-104 + the frozen Colour V1 suppression sentence. Root-cause candidate of A-2 (fit boundary, model perception — not code-fixable). **Not used by RC6, not live-validated; the seal's `key_identities.prompt` stays V2.** Any use needs a separately CEO-authorized live validation.
- **Tests** `tests/test_rc6_scoring_material.js` S1–S9; `tests/test_rc_closure.js` RC-1 identity version-scoped (RC6); `tests/test_rc5_correction.js` R4 (stitching preserved under `suppressed`) and R12 (M178 excluded from the RC4 byte-identity set) version-scoped — readings unchanged, only the test scope. Examples regenerated with the RC6 CLI.

---

*RC5 description (unchanged below):*

# STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC5

**Status:** RELEASE CANDIDATE RC5 — OFFLINE (not frozen · not production · identity-sealed, not a freeze). Successor of `STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC4` (preserved, sealed `SEAL-FLV-RC4-2026-10-15`).
Order: *STMX FULL-LOOK VISION EXTRACTOR — EX-04 DEFECT CORRECTION & RC5 FINAL OFFLINE VALIDATION V1* (CEO 2026-10-16). Validated OFFLINE on the 12 sealed EX-04 live responses (those responses were received on RC4); RC5 itself received **no** new live call.

**RC5 change vs RC4 (code-level only — prompt V2, schema, packet contract `V1_RC4`, frozen DM / Item authorities unchanged):**
- **D-EX04-1** `src/transport/convert.js` — a colour area that names a sub-part (`part`) is a part colour; prompt V2 line 23 and the G-1 contract (`src/g1_colour.js` header) say a part colour is a POINT with `carrier_part`. `field` + part is normalised to point + part: family, lightness, effect and part are kept as emitted; a field carries no contrast, so `contrast_with_field` stays UNRESOLVED in the existing partial carrier (never guessed). A free-text part equal to a Colour V1 token follows the same rule. Logged as `COLOUR_PART_ON_FIELD_NORMALIZED_TO_POINT` with the emitted standing.
- **D-EX04-2** `src/transport/convert.js` — a footwear subtype emitted under the prompt / native key `subtype` (or inside a refinement envelope) is carried under the registry key `product_subtype`; equal keys → one record; conflicting keys → neither chosen (UNCONVERTIBLE with both raw values, family stands). The value is still validated by the registry against `FOOTWEAR_PRODUCT_SUBTYPES`.
- **Local failure isolation** `src/isolation.js` (`extractIsolated`) — wraps the unchanged orchestrator for model-output inputs (CLI `--raw-response` / `--model-text` / `--model-output`); fixtures keep the plain path. On a thrown local error it locates the offending element with the SAME module check and isolates the narrowest scope (annotation → fact / colour area / relation / exposure supplement → component with every dependant), retries, and records every action (`provenance.json` `local_isolation`, `summary.json` `local_isolation`, packet `request_trace.provider_notes` note `RC5_LOCAL_ISOLATION`). Structural errors (duplicate / missing refs, a case-level participant with no colour entry — CEO §25) still fail the look. The DM block keeps its atomic frozen-adapter validation; DM systems are removed only when their carrier component is isolated.
- **Tests** `tests/test_rc5_correction.js` R1–R18; `tests/test_rc_closure.js` RC-1 identity version-scoped (RC5 note). Examples regenerated with the RC5 CLI (packets unchanged; summaries carry the RC5 tool name).

---

*RC4 description (unchanged below):*

# STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC4

**Status:** RELEASE CANDIDATE RC4 — OFFLINE (not frozen · not production · no live call · identity-sealed for live validation, not a freeze). Visual accuracy: NOT YET LIVE-VERIFIED.
Successor of `STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC3` (preserved, sealed).
Order: *STMX FULL-LOOK VISION EXTRACTOR — FINAL OBSERVABLE EVIDENCE DELIVERY CORRECTION & RELEASE CANDIDATE CLOSURE V1* (CEO decision 2026-10-15: Observable Evidence Only / Vision–Scoring responsibility separation).

**RC4 change vs RC3 — DM Evidence Transport V2** (authority `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md`, CEO-approved scoped successor of the V1 transport requirement):
- the packet carries ONE DM record `dm_evidence { transport_contract, look_components, look_detail_systems, dm_evidence_visibility }` + provenance `dm_transport { authority, output_fingerprint }`; RC1–RC3 `dm_subsystem` / `dm_adapter` / `dm_block_withheld` are no longer emitted;
- observed DMP-1 / DMP-2 are delivered whenever admissible — an unresolved DMP-3 is no longer a gate (the 8 stored runs now deliver all 39 systems);
- DMP-3 = `{ state: OBSERVED, value }` when derived from the look-level record (RC3 mapping, unchanged), else `{ state: UNKNOWN }` — never invented, never `adjudicable` from absence;
- the system list is OBSERVED-ONLY: `[]` = no system observed, never a verified negative; the V1 record (with its absence semantics) is obtainable only through `src/dm_transport_v2.js` `toFrozenV1Block` when DMP-3 is OBSERVED — the unchanged frozen adapter refuses it otherwise;
- prompt candidate V2 (`prompts/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt`, built by `prompts/build_integrated_prompt_v2.js`) = V1 with the identity line and one §9 line changed (observed-only). V1 is kept byte-identical (`0eb3e6d9…`);
- new `tests/test_rc4_transport.js` (T1–T20); inherited tests that asserted the V1 interface are version-scoped with `RC4 (Transport V2)` notes; `tests/rc4_helpers.js` gives the V2 views (ev · tok · v1 · noDM).

Frozen DM families, primitives, admission rules, G65 and the frozen adapter are unchanged. No scoring, Direction, Strength or Style ID.

Packet contract `STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET` · version `V1_RC4`.

## What it does (one pass, four logical groups)

| Group | Reads | Carrier |
|---|---|---|
| G1 | look frame · component registry · common visibility | `look_frame` · `component_registry[]` · `common_visibility` |
| G2 | appearance (colour · pattern · graphic · surface · material · decorative_detail · attachment) | `colour_composition` · `component_fact_pool[]` |
| G3 | garment construction — `G3.SH` shoulder bundle (INT-01), `G3.FR` front state, `G3.PK` pocket with CA#29 `pockets[]` | `component_fact_pool[]` (`observation_group` on every entry) |
| G4 | worn realization · layer · securing · exposure | `upper_realization` · `relations` · `canonical_exposure` |
| A1 | frozen DM **assembly** — no reading: DMP-1 assembled from carrier refs, DMP-2 admitted with the frozen rules, DMP-3 derived from the look-level G1 record (RC2; single not_adjudicable reason only, RC3) or **UNKNOWN** — the systems are delivered either way (RC4, Transport V2) · an inadmissible block is refused as a block | `dm_evidence` + `dm_transport` · `dm_acquisition` (only when nothing was delivered) |

Everything the V1.4 candidate did is reused (`envelope`, `relations`, `exposure`, `ownership`, `g1_colour`,
`sr_realization`, `run_record`, `transport/*`, `diagnostics/*`); the integrated additions are
`src/integrated.js` (group routing · conditional gates · DM visibility mapping table), `src/integrated_pocket.js`
(CA#29 instance checks mirrored from the frozen producer validator), `src/dm_projection.js` (A1) and the
rewritten `src/k2_pool.js` / `src/extractor.js` / `src/validator.js`.

## Run (offline only — G53)

```bash
node tests/run_all.js --out <file>          # 328 tests, exit 1 on any failure (always pass --out: the default writes tests/_last_results.json)
node cli/run_offline.js --fixture M323 --out <dir> --frozen-tc-diagnostic
node cli/run_offline.js --raw-response <stored Messages response> --out <dir>
node prompts/build_integrated_prompt.js    # rebuilds the prompt candidate V1 from Prompt V1.2 (unchanged) + V1.4 supplement
node prompts/build_integrated_prompt_v2.js # derives prompt candidate V2 (RC4, the live-validation prompt) from V1
```

The live provider is DISABLED; no module names an API host or reads a credential (test DT-3).

## Fixtures

`fixtures/cases.json` and `fixtures/item_records.json` are the V1.4 copies, **unchanged**.
`fixtures/pocket_instances_overlay_candidate.json` is new: first-hand CA#29 instance readings for the nine legacy
scalar `pocket: "Present"` fixture readings (seven images). The overlay is applied only by the FixtureProvider and is
noted in `request_trace.provider_notes` (`POCKET_LEGACY_SCALAR_READING_BRIDGED_BY_OVERLAY`). A legacy `Present`
without instances fails closed (`POCKET_PRESENT_WITHOUT_INSTANCES`).

## Deliberately changed inherited expectations

Inherited V1.4 tests whose expectation changed under the integrated contract carry an `INTEGRATED V1` note at the
changed line (DM withholding under INT-02 · CA#29 retired scalars · frozen conditional triggers · observation-group
tags). No fixture reading was edited to make a test pass.

## Not in this candidate

Live validation (G53) · CDM-15 canonical governance · CDM-18 MULTI representation · CDM-14 shoulder product-vs-final
rule · RC-01 identity sentence · any Direction / score / Style ID. See the package's `08_REMAINING_BLOCKERS_AND_VALIDATION_READINESS.md`.
