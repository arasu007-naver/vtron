# STMX FULL-LOOK SR DIRECTION ENGINE V1 — production release `FLSR_FINAL_V1`

**Release ID:** `STMX_FULL_LOOK_SR_DIRECTION_ENGINE_V1`
**Constitution:** `STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4` (`CONSTITUTION/`).
**Scope:** Full-Look SR **Direction** only — STRUCTURED | RELAXED.

**Not in this release:**
- SR Strength;
- SR ordinal projector;
- EI · TC · DM;
- four-axis integration;
- Style ID.

Freeze status: see `FINAL_FREEZE_SEAL.json` and `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_FREEZE_V1.md`.

## Use

```
node cli/score.js <packet.json> <run_record.json>     # one look → SR Direction record (JSON)
node cli/replay_golden.js                              # 63 golden inputs → identical outputs
node tests/run_release_tests.js                        # release tests
node verify_release.js --out <dir outside the release>  # full verification → RELEASE_VERIFIED
```

Inputs are the outputs of the Frozen Full-Look Vision Extractor Final V1 (`FLV-FINAL-FREEZE-V1`, packet contract `STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET` · `V1_RC4`). See `CONTRACTS/`.

## Layout

| path | content |
|---|---|
| `RT/` | Mini-root, read-only. It holds the runtime `RT/01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R4_FINAL_CANDIDATE/src/` (byte-identical to the R4 candidate) and its pinned dependencies at their master-relative paths. The runtime resolves ROOT = `RT/`; every pin is hash-checked at load (fail-closed). |
| `lib/release_paths.js` | Production entry: lane B only. |
| `cli/` | `score.js` · `replay_golden.js` |
| `golden/` | 43 corpus + 20 live inputs (frozen Vision outputs; no CG-1 sidecar, no GT) and their build-time outputs. |
| `tests/` | Release tests (self-contained). |
| `CONSTITUTION/` | The executable SR Direction constitution. |
| `CONTRACTS/` | Input contract · output schema. |
| `verify_release.js` | Checks V1–V10. |
| `RELEASE_MANIFEST.json` · `SHA256SUMS.txt` | File identities · runtime fingerprint · dependency pins. |
| `ROLLBACK.md` | Rollback procedure. |

The production path never reads:
- Lane A (SR V2 comparison);
- the ECC overlays;
- CEO GT;
- the CG-1 sidecar;
- research scripts;
- the network.
