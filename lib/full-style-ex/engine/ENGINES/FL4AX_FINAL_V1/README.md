# STMX FULL-LOOK FOUR-AXIS INTEGRATED SCORING RUNTIME FINAL V1 — release `FL4AX_FINAL_V1`

**Release ID:** `STMX_FULL_LOOK_FOUR_AXIS_INTEGRATED_FINAL_V1` · **Freeze:** `FL4AX-FINAL-FREEZE-V1-2026-10-29` · **Contract:** `STMX_FULL_LOOK_FOUR_AXIS_INTEGRATION_CONTRACT_V1` (`CONSTITUTION/`).
**Runtime:** byte-identical freeze of the integration candidate `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_FOUR_AXIS_INTEGRATED_SCORING_RUNTIME_V1_CANDIDATE` (code aggregate `b4b5be8b40906f58a4562d70f9e65362f0d5ad8442b84045d2ba49976b67ce1c`) in `RUNTIME/`.
**Scope:** orchestration of the four Final Frozen Full-Look Direction engines → four binary Directions + 16-type Style ID + Korean reasons. Not a fifth scorer. **Consumer production deployment is not authorized.**

## Dependencies (must sit beside this release, same parent directory — or set `FL4AX_ENGINES_ROOT`)

| axis | release dir | seal id |
|---|---|---|
| EI | FLEI_FINAL_V1 | FLEI-FINAL-FREEZE-V1-2026-10-26 |
| TC | FLTC_FINAL_V1 | FLTC-FINAL-FREEZE-V1-2026-10-25 |
| SR | FLSR_FINAL_V1 | FLSR-FINAL-FREEZE-V1-2026-10-25 |
| DM | FLDM_FINAL_V1 | FLDM-FINAL-FREEZE-V1-2026-10-29 |

## Use (Node.js 18+, no network, no credential, no package install)

```
node RUNTIME/cli/score_full_look.js <packet.json> <run_record.json>   # one look → four Directions + Style ID (JSON)
node RUNTIME/cli/score_full_look.js --dir <extractor output dir>
node RUNTIME/cli/resolve_style_id.js E C S M        # or --all
node cli/replay_golden.js                             # 43 golden looks → identical results
node tests/run_release_tests.js                       # release tests (7)
node verify_release.js --out <dir outside the release>   # V1–V11 → RELEASE_VERIFIED
```

Entry: `lib/release_entry.js` → `scoreFullLook({ packet, run_record })` · `fromExtractorOutputDir(dir)` · `resolveStyleId(ei, tc, sr, dm)`.

## Results on the 43 stored looks

COMPLETE 41 · INPUT_FAILURE 2 (F033 TC · REF_000622 SR — governed engine input failures, no Style ID) · direct = integrated 43 / 43 per axis · 13 distinct Style IDs. Known limitations: `GOVERNANCE/FL4AX_V1_KNOWN_LIMITATION_REGISTER.md`.

## Layout

| path | content |
|---|---|
| RUNTIME/ | frozen integration runtime (src: bindings · contract normaliser · Style ID resolver · Korean reason composer · runtime · pins; cli; tests) |
| lib/release_entry.js | entry |
| cli/replay_golden.js | golden replay |
| golden/ | 43 stored Frozen Vision outputs (packet + run_record; no GT) + build-time integrated results |
| tests/ | release tests |
| CONSTITUTION/ | integration contract |
| CONTRACTS/ | input · output schema · Style ID · frozen Vision input contract copies |
| GOVERNANCE/ | known limitations · 16 mapping results · 43 ledger · CEO order record |
| verify_release.js | V1–V11 |
| RELEASE_MANIFEST.json · SHA256SUMS.txt · FINAL_FREEZE_SEAL.json | identities · fingerprint · seal |
| ROLLBACK.md | rollback / restore |
