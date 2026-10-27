# D9 — Production Release Reproduction Guide

> STMX FULL-LOOK EI V1 — CONTROLLED FINAL FREEZE, KNOWN LIMITATION ACCEPTANCE & VERIFIED LOCAL / GOOGLE DRIVE BACKUP · 2026-10-26 · order `AUTHORIZATION/CEO_ORDER_VERBATIM.md` §8 · §13 · release `FLEI_FINAL_V1` · seal FLEI-FINAL-FREEZE-V1-2026-10-26 · 0 API calls (G53 active).

## Prerequisites

Node.js 18 or later. No network, no credential, no other STMX file.

## Steps (any machine)

1. Copy `FLEI_FINAL_V1/` (from the master tree or from the backup folder) to a short base directory, for example `C:\STMX_UPLOAD\…`.
2. Run `node verify_release.js --out <dir outside the release>`. Expect `RELEASE_VERIFIED`, with V1 – V10 PASS.
3. Run `node cli/replay_golden.js`. Expect `{"total":43,"identical":43,…"EXPRESSIVE":36,"INTROVERT":7…}`.
4. Run `node tests/run_release_tests.js`. Expect `{"PASS":14}`.
5. Score one look: `node cli/score.js <packet.json> <run_record.json>`.

## Expected identities

| item | value |
|---|---|
| RELEASE_MANIFEST.json sha256 | 96b0a31415a24773d08f43a3ab3cb0383e72f93fc33b21e596ac99e6260a261b |
| runtime fingerprint | 9093684e0f37c9e7c20fc64f5b843544c95efa6546449b1ed3d843a0c2d501e6 |
| seal | FLEI-FINAL-FREEZE-V1-2026-10-26 |
| code identity (src) | 429896dfb3a5d9b4a9edbc207e5adb8e337c218866b0ee3ffbfeafbd07ea1e5d |

## Reproduced in this order

| variant | where | result |
|---|---|---|
| V1_R3 candidate (master tree) | in memory + replay CLI | 43 outputs = sealed ledger |
| final release (in place) | 01_ENGINES/STYLE_SCORING_ENGINE/FLEI_FINAL_V1/ | RELEASE_VERIFIED (pre-seal + post-seal); 43 / 43 candidate output = release expected |
| clean-room release | session scratchpad (outside the master tree, empty environment) | RELEASE_VERIFIED pre-seal + post-seal |
| restored backup | scratchpad restore from C:/STMX_UPLOAD/03_EI_DIRECTION_ENGINE_FINAL/ | RELEASE_VERIFIED · restored 43 outputs = candidate outputs |
