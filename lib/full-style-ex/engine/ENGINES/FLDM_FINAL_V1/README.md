# STMX FULL-LOOK DM DIRECTION ENGINE FINAL V1 — release `FLDM_FINAL_V1`

**Release ID:** `STMX_FULL_LOOK_DM_DIRECTION_ENGINE_FINAL_V1` · **Freeze:** `FLDM-FINAL-FREEZE-V1-2026-10-29` · **Constitution:** `STMX_FULL_LOOK_DM_BINARY_DIRECTION_CONSTITUTION_V3_1` (`CONSTITUTION/`).
**Runtime:** byte-identical freeze of `FL_DM_DIRECTION_CANDIDATE_V3_1` (`01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_DM_DIRECTION_RESOLVER_V3_1_CANDIDATE/`, code aggregate `03ff42d1a1331975b51ba88ad654256b94dd1ab2f6949cdc0091685e3cda5e84`) in `RUNTIME/`.
**Scope:** Full-Look DM **Direction** only — DETAIL | MINIMAL (binary, mandatory scoring on the available evidence). Not DM Strength, not Item DM, not EI / TC / SR, not four-axis integration, not Style ID. **Production deployment is not authorized by the freeze order.**

## Known accepted limitations — read before use

FLDM-LIM-001 F012 (CEO D → runtime M) · FLDM-LIM-002 F472 (CEO D → runtime M) · FLDM-HIST-001 F267 (historical Neutral → binary M). Agreement on the 43 development looks: binary 40 / 42 — not 100 %. See `GOVERNANCE/`.

## Use / reproduction (Node.js 18+, no network, no credential)

```
node cli/score.js <packet.json>                         # one look → DM Direction result (JSON)
node cli/replay_golden.js                               # 43 golden inputs → identical outputs (D 25 / M 18)
node tests/run_release_tests.js                         # release tests (5)
node verify_release.js --out <dir outside the release>   # V1–V10 → RELEASE_VERIFIED
```

Entry: `lib/release_entry.js` → `score(packet)`.

## Layout

| path | content |
|---|---|
| RUNTIME/ | the frozen runtime (byte-identical copy of the V3.1 candidate: src · cli · tests · README); no external dependency |
| lib/release_entry.js | entry `score(packet)` |
| cli/ | score.js · replay_golden.js |
| golden/ | 43 frozen Vision packets (no GT) + build-time outputs |
| tests/ | release tests |
| CONSTITUTION/ | consolidated rules |
| CONTRACTS/ | input contract · output schema |
| GOVERNANCE/ | CEO final decision · known-limitation register · 43-case ledger (documentation only) |
| verify_release.js | V1–V10 |
| RELEASE_MANIFEST.json · SHA256SUMS.txt · FINAL_FREEZE_SEAL.json | identities · fingerprint · seal |
| ROLLBACK.md | rollback |
