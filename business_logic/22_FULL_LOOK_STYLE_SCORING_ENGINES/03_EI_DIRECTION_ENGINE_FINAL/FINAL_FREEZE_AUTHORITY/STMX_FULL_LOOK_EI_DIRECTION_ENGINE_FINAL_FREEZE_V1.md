# STMX FULL-LOOK EI DIRECTION ENGINE — FINAL FREEZE V1

> **Approval Anchor** — CEO Decision 2026-10-26 (order "STMX FULL-LOOK EI V1 — CONTROLLED FINAL FREEZE, KNOWN LIMITATION ACCEPTANCE & VERIFIED LOCAL / GOOGLE DRIVE BACKUP" §0 · §4 · §8; verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_EI_V1_FINAL_FREEZE_AND_VERIFIED_BACKUP/AUTHORIZATION/CEO_ORDER_VERBATIM.md`, sha256 `2a477887750dbf8b5b8e13277748c871b9a4fddb662b05732ee1e5649336b543`). Reason: controlled closure of Full-Look EI V1 with one CEO-accepted known limitation (FL-EI-LIM-F228-001). Gates A-1 … C-4 passed; the release verified in place and in a clean room. Affected Scope: new release `01_ENGINES/STYLE_SCORING_ENGINE/FLEI_FINAL_V1/` · this declaration (+ manifest) · `STMX_FULL_LOOK_EI_V1_KNOWN_LIMITATION_REGISTER.md` · production pointer `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_EI_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json`. No existing frozen authority changed (Item EI, Frozen Vision, Full-Look SR / TC, DM untouched).

```text
FINAL_V1_FROZEN        = TRUE
KNOWN_CEO_GT_MISMATCH  = F228   (CEO GT EXPRESSIVE · runtime INTROVERT · FL-EI-LIM-F228-001 · CONTROLLED_V1_KNOWN_LIMITATION)
CEO_GT_AGREEMENT       = 3/4
```

**Final Freeze of V1 is not resolution of every known accuracy limitation. F228 remains a known incorrect prediction.**

| item | value |
|---|---|
| release ID | STMX_FULL_LOOK_EI_DIRECTION_ENGINE_FINAL_V1 |
| seal | FLEI-FINAL-FREEZE-V1-2026-10-26 (`FLEI_FINAL_V1/FINAL_FREEZE_SEAL.json`) |
| status | FINAL_FROZEN_WITH_ACCEPTED_KNOWN_LIMITATION · PRODUCTION (Full-Look EI Direction) |
| freeze date | 2026-10-26T04:55:09.548Z |
| release manifest sha256 | 96b0a31415a24773d08f43a3ab3cb0383e72f93fc33b21e596ac99e6260a261b |
| runtime fingerprint | 9093684e0f37c9e7c20fc64f5b843544c95efa6546449b1ed3d843a0c2d501e6 |
| constitution | STMX_FULL_LOOK_EI_BINARY_DIRECTION_CONSTITUTION_V1_R3 · sha256 a81d0088e8f45d39ccd8f287ef6fd1e02691c5946828425bd38b2b804823331b |
| source candidate | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_EI_BINARY_DIRECTION_RESOLVER_V1_R3_CANDIDATE/ (code identity 429896dfb3a5d9b4a9edbc207e5adb8e337c218866b0ee3ffbfeafbd07ea1e5d; runtime src byte-identical true) |
| dependencies | 9 closure files bundled in RT/ (hash-recorded) · 9 authority pins (hash-checked at load, fail-closed) |
| Frozen Vision compatibility | FLV-FINAL-FREEZE-V1-2026-10-17 · packet V1_RC4 |
| tests | V1_R3 development suite re-run {"PASS":216,"FAIL":0,"SEMANTIC_CONFLICT":0,"NOT_REPLAYABLE":2,"NOT_APPLICABLE":5} (= historical, per test) · release tests 14 / 14 · verify_release V1–V10 PASS (in place + clean room) |
| 43-packet result | EXPRESSIVE 36 / INTROVERT 7 · input failures 0 · forbidden states 0 |
| CEO GT accuracy | 3 / 4 (M178 ✓ · M320 ✓ · M308 ✓ · F228 ✗ — accepted known limitation) |
| research artefacts (not in the release) | shared-raw-evidence consumer = RESEARCH_CANDIDATE_ONLY · SC-1 = NOT_APPROVED_NOT_IMPLEMENTED · V1_R4 = NOT_CREATED |
| rollback | `FLEI_FINAL_V1/ROLLBACK.md` (withdraw the pointer by a governed Full-Look EI reopen; no prior production engine) |

## Direction semantics

EXPRESSIVE | INTROVERT for every scorable look (EI-DEC-1 … 4 · STMX-2026-10-AEMS). One valid basis (F · AF · PT · PG · GR · EX, under ACC-1 / ACC-2 / PS-1 / EX-1 / EX-2) → EXPRESSIVE; nothing cancels it; otherwise INTROVERT with the observed and unobserved facts stated. Input failures only: INPUT_CONTRACT · NO_OBSERVABLE_WORN_LOOK · NO_COMPONENT_OBSERVED. Full text: `FLEI_FINAL_V1/CONSTITUTION/STMX_FULL_LOOK_EI_BINARY_DIRECTION_CONSTITUTION_V1_R3.md`.

## Acceptance gates (order §14 A – C)

| gate | requirement | result | evidence |
|---|---|---|---|
| A-1 | V1_R3 identity correct | PASS | recomputed 429896dfb3a5d9b4a9edbc207e5adb8e337c218866b0ee3ffbfeafbd07ea1e5d (candidate and inside the release) · 10 files = manifest |
| A-2 | 43 / 43 valid binary output | PASS | 43 RESOLVED E / I · 43 packets = seals · forbidden states 0 |
| A-3 | expected replay reproduced (E 36 / I 7; ledger) | PASS | E 36 / I 7 · sealed ledger reproduced row by row · V1 / V1_R1 / V1_R2 reproduce their ledgers |
| A-4 | determinism | PASS | in-memory twice · replay CLI · release V7 |
| A-5 | no new material regression | PASS | V1_R3 suite re-run {"PASS":216,"FAIL":0,"SEMANTIC_CONFLICT":0,"NOT_REPLAYABLE":2,"NOT_APPLICABLE":5} = historical (per test) · FLV R1–R9 · FLSR V1–V10 · FLTC V1–V10 PASS · 0 repository writes |
| A-6 | CEO GT 3 / 4 accurately reported | PASS | M178 INTROVERT ✓ · M320 EXPRESSIVE ✓ · M308 EXPRESSIVE ✓ · F228 INTROVERT ✗ |
| B-1 | F228 CEO E preserved; runtime I disclosed; limitation documented | PASS | D4 · D5 · D2 DR-09 |
| B-2 | controlled acceptance authorized by the CEO order | PASS | order §0 · §4.4 |
| B-3 | no SC-1 / no semantic change / consumer not integrated | PASS | runtime src byte-identical · closure has no EISREC file · no dm_evidence read |
| B-4 | no unrelated blocker (design review) | PASS | D2: 23 PASS + DR-09 KNOWN_ACCEPTED_LIMITATION · no BLOCKER |
| C-1 | final release created; code identity pinned; contracts + manifests complete | PASS | 158 files · fingerprint 9093684e0f37c9e7c20fc64f5b843544c95efa6546449b1ed3d843a0c2d501e6 |
| C-2 | source equivalent to V1_R3: candidate output = release golden expected (43 byte-identical); release replay identical | PASS | 43 / 43 candidate = release expected · release V5 43 / 43 |
| C-3 | clean-room verification passed | PASS | clean room outside the master tree, empty environment: RELEASE_VERIFIED |
| C-4 | protected files unchanged up to the freeze | PASS | interim walk = PRE (19079 files) |

## Known limitations

`STMX_FULL_LOOK_EI_V1_KNOWN_LIMITATION_REGISTER.md` (this folder): FL-EI-LIM-F228-001 (accepted) · EV-1 … EV-6 (its components) · L-1 … L-14 (previously disclosed, non-blocking).

## Explicit exclusions

EI Strength · Item EI · TC · SR · DM · four-axis integration · Style ID. EI V1 / V1_R1 / V1_R2 candidates, research scripts, the consumer candidate and SC-1 are not part of the release.

## Reopen

⛔ Any change to Full-Look EI Direction semantics, the constitution, the runtime, its dependencies or this release requires an explicit governed **Full-Look EI reopen decision** (for example a separately authorized V2 workstream). Successors are new directories with new seals; this release is never rebuilt in place.
