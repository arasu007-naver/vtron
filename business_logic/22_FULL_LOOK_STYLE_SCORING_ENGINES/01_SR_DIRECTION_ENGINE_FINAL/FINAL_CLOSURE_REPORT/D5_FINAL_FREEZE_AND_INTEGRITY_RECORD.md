# D5 — Final Freeze & Integrity Record

| item | value |
|---|---|
| seal | FLSR-FINAL-FREEZE-V1-2026-10-25 |
| frozen at | 2026-10-25T00:46:43.928Z |
| scope | Full-Look SR DIRECTION only (STRUCTURED / RELAXED) — not Strength, not ordinal, not EI / TC / DM, not four-axis integration, not Style ID |
| release manifest sha256 | f6b480d8233664b01988c31bc058f947c8f796635575549fd7c208b7bda8f431 |
| seal file sha256 | 83c1e65a7cb4bc2f564bc3d437371d9bc17f51cc05a3674768530e61b879d452 |
| runtime fingerprint | fd9590864a2a0e02d732539e769c7d781c9d0ee43f9284ae77a9057ef985b0a7 |
| constitution | STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4 · 0b6aef07221a67353f6976e6a7e36745c0acd1ca3064e74e2add472e2ebc78ee |
| dependency pins | 13 |
| freeze declaration | 04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_SR_DIRECTION_ENGINE_FINAL_FREEZE_V1.md (+ _MANIFEST.json) |
| production pointer | 01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_ENGINE_PRODUCTION_AUTHORITY_V1.json (status PRODUCTION) |
| rollback | FLSR_FINAL_V1/ROLLBACK.md · rehearsal B-8 (D6) |
| authority | STMX FULL-LOOK SR — FINAL DIRECTION CORRECTION, PRODUCTION FREEZE & VERIFIED BACKUP V1 (CEO 2026-10-25) §0.2 · §4 · §5 · order sha256 c9dfe5d405a579829de6b2bcec03f9c79342aff4f4b057b697990508200a5520 |

## Acceptance gates (evaluated by `_raw/z10_freeze.js` BEFORE any freeze file was written)

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

## Verification

| run | where | result |
|---|---|---|
| in place (pre-seal) | master release dir | RELEASE_VERIFIED |
| clean room (pre-seal) | C:\Users\lukek\AppData\Local\Temp\claude\C--work-STMX-STMX-project-master-files-STMX-EI-TC-SR-DM-master\d52cd3cb-be5a-44f7-aee2-f65ecae03cc9\scratchpad\cleanroom_pre_seal\FLSR_FINAL_V1 · empty environment | RELEASE_VERIFIED |
| in place (post-seal) | master release dir · V10 seal binding | RELEASE_VERIFIED |
| clean room (post-seal) | C:\Users\lukek\AppData\Local\Temp\claude\C--work-STMX-STMX-project-master-files-STMX-EI-TC-SR-DM-master\d52cd3cb-be5a-44f7-aee2-f65ecae03cc9\scratchpad\cleanroom_post_seal\FLSR_FINAL_V1 | RELEASE_VERIFIED |
| restored from backup | D6 B-7 | PASS |

First in-place run: V1 failed only because the verifier did not exclude `SHA256SUMS.txt` from the "unlisted" check. That was a verifier defect: fixed (SHA256SUMS now checked against the manifest), the release rebuilt and re-verified. Run 1 is preserved in `_raw/manifests/z8_verify_in_place_run1_V1_SUMS_DEFECT.json`.

## Freeze approval trace

1. **CEO order 2026-10-25:**
   - §0.2 authorizes the Final Freeze in this order, conditional on the gates;
   - §4 mandates the SRB-2g correction;
   - §5 preserves MS-1.
2. **Correction semantics:** FL-SR-C1 (CEO 2026-10-17) · Item CEO §3 · Frozen Item admission (Defined waist preserves structure) · order §4.2. All are pinned and checked at runtime load.
3. **Disclosed operationalisation (Claude):** the Defined waist + seated shoulder is the observable for "substantially governed".
4. **Gates:** F-01 … F-16 PASS; interim protected walk = PRE (16,642 files).
5. **Seal** written only after the verification passes above.

PRE / POST protected-file comparison, Context / Decision Log prefix identity, capsule finalize re-check and the package manifest: `_raw/manifests/z16_qa.json` + `_raw/manifests/z16_qa.md` (written by `_raw/z16_qa.js`; kept out of this document so that the copy in the backup capsule stays identical).
