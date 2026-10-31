# STMX FULL-LOOK TC DIRECTION ENGINE V1 — production release `FLTC_FINAL_V1`

**Release ID:** `STMX_FULL_LOOK_TC_DIRECTION_ENGINE_V1`
**Constitution:** `STMX_FULL_LOOK_TC_DIRECTION_CONSTITUTION_FINAL_V1` (`CONSTITUTION/`).
**Scope:** Full-Look TC **Direction** only — CLASSIC | TRANSFORMATIVE (Product-Only, mandatory scoring on the available evidence).

**Not in this release:**
- TC Strength;
- TC1–TC9 projection;
- Item TC (frozen `STMX_TC_ENGINE_V1`, consumed read-only through its Step 2 predicates);
- EI · SR · DM;
- four-axis integration.

Freeze status: see `FINAL_FREEZE_SEAL.json` and `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_TC_DIRECTION_ENGINE_FINAL_FREEZE_V1.md`.

## Use

```
node cli/score.js <packet.json> <run_record.json>     # one look → TC Direction record (JSON)
node cli/replay_golden.js                              # 43 golden inputs → identical outputs
node tests/run_release_tests.js                        # release tests
node verify_release.js --out <dir outside the release>  # full verification → RELEASE_VERIFIED
```

Inputs are the outputs of the Frozen Full-Look Vision Extractor Final V1 (`FLV-FINAL-FREEZE-V1-2026-10-17`, packet contract `STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET` · `V1_RC4`). See `CONTRACTS/`.

## Layout

| path | content |
|---|---|
| `RT/` | Mini-root, read-only. It holds the runtime `RT/01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_TC_PRODUCT_ONLY_RESOLVER_V3_FINAL_CANDIDATE/src/` (byte-identical to the V3 final candidate) and every file the runtime loads or hashes (frozen Step 2 successor V4 + its bound inputs, frozen Step 2 evaluators, Item V1_3 rules, TC production authority, Frozen Vision RC6 gates + seal) at their master-relative paths. The runtime resolves ROOT = `RT/`; every pin is hash-checked at load (fail-closed). |
| `lib/release_paths.js` | Production entry `score(packet, run_record)`. |
| `cli/` | `score.js` · `replay_golden.js` |
| `golden/` | 43 corpus inputs (frozen Vision outputs; no GT) and their build-time outputs. |
| `tests/` | Release tests (self-contained). |
| `CONSTITUTION/` | The Full-Look TC Direction constitution. |
| `CONTRACTS/` | Input contract · output schema. |
| `verify_release.js` | Checks V1–V10. |
| `RELEASE_MANIFEST.json` · `SHA256SUMS.txt` | File identities · runtime fingerprint · dependency closure · pins. |
| `ROLLBACK.md` | Rollback procedure. |

The production path never reads:
- the V1 / V2 candidates or any research script;
- CEO GT, the reference master or adjudication registers;
- look ids, file names or image refs (for a decision);
- the network.

**Path length:** inside the master tree the deepest `RT/` file is longer than 260 characters (the frozen dependencies keep their master-relative paths). Node.js reads it normally. Copy or restore the release to a short base directory (for example `C:\STMX_UPLOAD\...`), as the backup capsule does, when Windows tools without long-path support are used.
