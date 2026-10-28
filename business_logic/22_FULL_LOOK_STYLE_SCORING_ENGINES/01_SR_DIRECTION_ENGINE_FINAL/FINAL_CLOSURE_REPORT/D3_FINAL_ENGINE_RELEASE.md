# D3 — Final Engine Release `FLSR_FINAL_V1`

| item | value |
|---|---|
| release ID | STMX_FULL_LOOK_SR_DIRECTION_ENGINE_V1 |
| directory | 01_ENGINES/STYLE_SCORING_ENGINE/FLSR_FINAL_V1/ (short name: master-relative dependency paths stay < 260 characters; longest 253) |
| files | 216 + RELEASE_MANIFEST.json + SHA256SUMS.txt + FINAL_FREEZE_SEAL.json |
| release manifest sha256 | f6b480d8233664b01988c31bc058f947c8f796635575549fd7c208b7bda8f431 |
| runtime fingerprint | fd9590864a2a0e02d732539e769c7d781c9d0ee43f9284ae77a9057ef985b0a7 (4 runtime src files, byte-identical to the R4 candidate: true) |
| constitution | STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4 (`CONSTITUTION/`, = D2) |
| source candidate | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R4_FINAL_CANDIDATE/ · code identity fb72c54225d4eab1a02aef56c00bd3dca213b5ddf3f43e58c69784ffe2031310 · tests {"PASS":41} |
| dependency pins | 13 bundled in `RT/` at master-relative paths, hash-checked at load |
| production entry | lib/release_paths.js → score(packet, run_record) (lane B) |
| Frozen Vision compatibility | FLV-FINAL-FREEZE-V1 · seal a6803bfac096c8fc… · packet V1_RC4 |
| golden data | 43 corpus + 20 live inputs with build-time outputs (no GT, no CG-1 sidecar) |
| excluded by design | Lane A (SR V2 comparison) · ECC_V3 overlay · CEO GT registers · CG-1 sidecars / Vision CG-1 candidate · research scripts · network / credentials |

## Dependency pins (RT/)

| key | path | sha256 |
|---|---|---|
| flv_freeze_seal | 01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/FINAL_FREEZE_SEAL.json | a6803bfac096c8fc… |
| flv_scoring_handover | 01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/05_DOCS/SCORING_ENGINE_HANDOVER.md | da91e002b7f3da8b… |
| sr_upper_physics_contract | 04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_SR_UPPER_PHYSICS_CONTRACT_V1.md | 222661a6f421663c… |
| item_sr_production_authority | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json | 6a670aa417c96923… |
| item_sr_evidence_admission | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_DIRECTION_FIRST_ENGINE_V1_2/src/sr_evidence_admission_v1.js | 4bd774a883dd7de1… |
| item_sr_direction_resolver | 01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_DIRECTION_FIRST_ENGINE_V1_2/src/sr_direction_resolver_v1.js | 909a8328b0a616fe… |
| sr_v3_r3_candidate_manifest | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R3_FINAL_CANDIDATE/PACKAGE_MANIFEST.json | c94c565a229e5517… |
| fl_sr_c1_ceo_clarification | 04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_STYLE_SCORING_ENGINE_ARCHITECTURE_BASELINE_V1/05_CEO_CLARIFICATION_INTEGRATION_RECORD.md | dd61189b1d81a33a… |
| ceo_sr_final_freeze_order | 04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/AUTHORIZATION/SR_FINAL_FREEZE_CEO_ORDER_VERBATIM.md | c9dfe5d405a57982… |
| sr_v3_r2_candidate_manifest | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R2_CG1_FINAL_CANDIDATE/PACKAGE_MANIFEST.json | 0794ee0107855519… |
| sr_v2_candidate_manifest | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V2_CANDIDATE/PACKAGE_MANIFEST.json | e2e45e4950d4e50f… |
| cg1_live_validation_record | 04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_CG1_G53_LIVE_VALIDATION_EXECUTION_V1/PACKAGE_MANIFEST.json | b40378b48ddebde2… |
| ceo_mandatory_scoring_order | 04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_MANDATORY_SCORING_FINAL_CORRECTION_V1/AUTHORIZATION/SR_MANDATORY_SCORING_CEO_ORDER_VERBATIM.md | 485d3c4e689af60a… |

## Run

```
node cli/score.js <packet.json> <run_record.json>
node cli/replay_golden.js
node tests/run_release_tests.js
node verify_release.js --out <dir outside the release>
```

Contracts: `CONTRACTS/INPUT_CONTRACT.md` · `CONTRACTS/OUTPUT_SCHEMA.json`. Rollback: `ROLLBACK.md`. Verifier checks V1 … V10 (manifest · fingerprint · pins · isolation · golden · coverage · determinism · release tests · no network · seal).
