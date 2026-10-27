# STMX FULL-LOOK EI DIRECTION ENGINE FINAL V1 — production release `FLEI_FINAL_V1`

**Release ID:** `STMX_FULL_LOOK_EI_DIRECTION_ENGINE_FINAL_V1`
**Constitution:** `STMX_FULL_LOOK_EI_BINARY_DIRECTION_CONSTITUTION_V1_R3` (`CONSTITUTION/`). This is the consolidated text of the rules the runtime executes.
**Runtime:** byte-identical promotion of `STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_R3_CANDIDATE` (code identity `429896dfb3a5d9b4a9edbc207e5adb8e337c218866b0ee3ffbfeafbd07ea1e5d`).
**Scope:** Full-Look EI **Direction** only — EXPRESSIVE | INTROVERT, with mandatory scoring on the available evidence.

**Not in this release:**
- EI Strength / scores;
- Item EI;
- TC · SR · DM;
- four-axis integration;
- Style ID;
- the shared-raw-evidence consumer candidate and SC-1 (research artefacts, not approved).

## Known accepted limitation — read before use

**FL-EI-LIM-F228-001.** The CEO ground truth for look F228 is **EXPRESSIVE**; this engine outputs **INTROVERT**.
- This is a **known incorrect prediction**, accepted by the CEO for V1 closure (2026-10-26).
- The CEO GT is retained, so GT agreement on the 4-look CEO GT set is **3 / 4**.
- Details: `GOVERNANCE/D4_CEO_CONTROLLED_KNOWN_LIMITATION_ACCEPTANCE_RECORD.md` · `GOVERNANCE/D5_EI_FINAL_V1_KNOWN_LIMITATION_REGISTER.md`.

Freeze status: `FINAL_FREEZE_SEAL.json` · `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_EI_DIRECTION_ENGINE_FINAL_FREEZE_V1.md`.

## Use / reproduction

```
node cli/score.js <packet.json> <run_record.json>     # one look → EI Direction record (JSON)
node cli/replay_golden.js                              # 43 golden inputs → identical outputs (E 36 / I 7)
node tests/run_release_tests.js                        # release tests (14)
node verify_release.js --out <dir outside the release>  # full verification V1–V10 → RELEASE_VERIFIED
```

Inputs are the outputs of the Frozen Full-Look Vision Extractor Final V1 (`FLV-FINAL-FREEZE-V1-2026-10-17`, packet contract `STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET` · `V1_RC4`). See `CONTRACTS/`. Node.js 18 or later; no network, no credential.

## Layout

| path | content |
|---|---|
| `RT/` | Mini-root, read-only. It holds the runtime `RT/01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_R3_CANDIDATE/src/` (byte-identical to the candidate) and every file the runtime loads or hashes, at their master-relative paths: Registry V3 · state machine V1.1.1 · Item EI production authority · Colour V1 contract · Neutral Colour Authority · Body Exposure Two-Class · Phase 2 canonical · frozen producer rules · FLV seal. The runtime resolves ROOT = `RT/`. Every pin is hash-checked at load (fail-closed). |
| `lib/release_paths.js` | Production entry `score(packet, run_record)`. |
| `cli/` | `score.js` · `replay_golden.js` |
| `golden/` | 43 corpus inputs (frozen Vision outputs; no GT) and their build-time outputs. |
| `tests/` | Release tests (self-contained). |
| `CONSTITUTION/` | The Full-Look EI direction constitution (V1_R3, consolidated). |
| `CONTRACTS/` | Input contract · binary output schema. |
| `GOVERNANCE/` | Controlled acceptance record (D4) · known-limitation register (D5) · CEO GT register reference. These are documentation only; the runtime never reads them. |
| `verify_release.js` | Checks V1–V10. |
| `RELEASE_MANIFEST.json` · `SHA256SUMS.txt` | File identities · runtime fingerprint · dependency closure · pins. |
| `ROLLBACK.md` | Rollback procedure. |

The production path never reads:
- the V1 / V1_R1 / V1_R2 candidates or any research script;
- CEO GT, reference registers or `GOVERNANCE/`;
- look ids, file names or image refs (for a decision);
- `dm_evidence` or any other-axis result;
- the network.

**Path length:** inside the master tree the deepest `RT/` file is longer than 260 characters. Node.js reads it normally. Copy or restore the release to a short base directory (for example `C:\STMX_UPLOAD\...`), as the backup folder does, when using Windows tools without long-path support.
