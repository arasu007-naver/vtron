# STMX FULL-LOOK SR DIRECTION ENGINE — FINAL FREEZE V1

> **Approval Anchor** — CEO Decision 2026-10-25 (order "STMX FULL-LOOK SR — FINAL DIRECTION CORRECTION, PRODUCTION FREEZE & VERIFIED BACKUP V1" §0.2 conditional Final Freeze authorization · §4 SRB-2g correction mandate · §5 MS-1; verbatim `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/AUTHORIZATION/SR_FINAL_FREEZE_CEO_ORDER_VERBATIM.md`, sha256 `c9dfe5d405a579829de6b2bcec03f9c79342aff4f4b057b697990508200a5520`). Reason: every acceptance gate F-01 … F-16 passed and the release verified in place and in a clean room. Affected Scope: new release `01_ENGINES/STYLE_SCORING_ENGINE/FLSR_FINAL_V1/` · this declaration (+ manifest) · production pointer `01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json`. No existing frozen authority changed.

| item | value |
|---|---|
| release ID | STMX_FULL_LOOK_SR_DIRECTION_ENGINE_V1 |
| seal | FLSR-FINAL-FREEZE-V1-2026-10-25 (`FLSR_FINAL_V1/FINAL_FREEZE_SEAL.json`) |
| status | COMPLETE_AND_CLOSED_AND_FROZEN · PRODUCTION (Full-Look SR Direction) |
| freeze date | 2026-10-25T00:46:43.928Z |
| release manifest sha256 | f6b480d8233664b01988c31bc058f947c8f796635575549fd7c208b7bda8f431 |
| runtime fingerprint | fd9590864a2a0e02d732539e769c7d781c9d0ee43f9284ae77a9057ef985b0a7 |
| constitution | STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4 · sha256 0b6aef07221a67353f6976e6a7e36745c0acd1ca3064e74e2add472e2ebc78ee |
| source candidate | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R4_FINAL_CANDIDATE/ (code identity fb72c54225d4eab1a02aef56c00bd3dca213b5ddf3f43e58c69784ffe2031310; runtime src byte-identical true) |
| dependency pins | 13 (hash-checked at load; bundled in RT/) |
| Frozen Vision compatibility | FLV-FINAL-FREEZE-V1 · packet V1_RC4 |
| tests | R4 development suite {"PASS":41} · release tests 15 / 15 · verify_release V1–V10 PASS (in place + clean room) |
| rollback | `FLSR_FINAL_V1/ROLLBACK.md` (withdraw the pointer by governed SR reopen; no prior production engine) |

## Direction semantics

STRUCTURED | RELAXED for every scorable look (AVAILABLE_EVIDENCE_MANDATORY_SCORING; MS-1). Input failures only: INPUT_CONTRACT · UPPER_NOT_VISIBLE · NO_UPPER_SR_EVIDENCE. Rule table, precedence, exclusions: `FLSR_FINAL_V1/CONSTITUTION/STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4.md`.

## Acceptance gates

| gate | requirement | result | evidence |
|---|---|---|---|
| F-01 | 100% S/R Direction coverage on valid scorable SR packets | PASS | 43 corpus: 42 / 42 · live 20 / 20 · 13,500 partial inputs |
| F-02 | no normal UNKNOWN / UNRESOLVED output | PASS | UNKNOWN / UNRESOLVED / NEUTRAL 0 |
| F-03 | no invented missing facts | PASS | evidence record = frozen facts; MS-1 writes nothing |
| F-04 | Upper Priority preserved | PASS | lower / inner garments never change a result |
| F-05 | failed CG-1 switches absent | PASS | no SRB-2x* rule; sidecar ignored |
| F-06 | SRB-2g systematic defect corrected or precisely bounded | PASS | live anchor runs R3 1/8 → R4 5/8; MODE A 2/4 → 3/4; every remaining miss = M320 (identical admissible inputs to M317 — bounded limitation) |
| F-07 | no arbitrary Oversized / shoulder shortcut | PASS | Oversized → S possible (2os); built shoulder → R possible (2or · 2r) |
| F-08 | available CEO GT assessed honestly | PASS | MODE A 3/4 · MODE B 3/4 · live runs 5/8 — M320 reported |
| F-09 | no newly introduced, unexplained material accuracy regression | PASS | changes only in former SRB-2g rows; holdout 44 / 49 unchanged; no anchor turned wrong (M320 was the collision already) |
| F-10 | holdout and edge cases evaluated | PASS | Item-GT proxy 49 / 49 resolved · 44 match · missingness 378 variants · §6.5 guards |
| F-11 | determinism verified | PASS | repeat · reversed order · fresh-process replay |
| F-12 | Frozen Item SR unchanged | PASS | protected walk = PRE; Item SR 45 / 46 (F31 environment assertion, unpatched) |
| F-13 | Frozen Vision unchanged | PASS | protected walk = PRE; verify_release R1–R9 PASS |
| F-14 | TC V2 unchanged | PASS | protected walk = PRE; TC V2 45 / 45 |
| F-15 | constitution complete and executable | PASS | D2 + executable source byte-identical in the release; in-place and clean-room verification PASS |
| F-16 | approval authority and release scope unambiguous | PASS | CEO order 2026-10-25 §0.2 (conditional Final Freeze) + §4 (correction mandate) + §5 (MS-1); scope = SR Direction only |

## Known bounded accuracy limitation

M320 (CEO STRUCTURED) has the same admissible SR inputs as M317 (CEO RELAXED) except the prohibited Extreme / Strong proxy → both RELAXED; bounded, irreducible. CEO anchors: corpus 3 / 4 · live runs 5 / 8.

## Explicit exclusions

SR Strength · SR ordinal projector · EI · TC · DM · four-axis integration · Style ID. Lane A (SR V2 comparison), ECC overlays, CEO GT, CG-1 sidecars and research scripts are not part of the release.

## Reopen

⛔ Any change to the Full-Look SR Direction semantics, constitution, runtime or this release requires an explicit governed SR reopen decision. Successors are new directories with new seals; this release is never rebuilt in place.
