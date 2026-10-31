# D06 — Known Limitations Record (copy of the CURRENT_CONSTITUTION register)

> Freeze `ITEM-V2-INTEGRATED-FINAL-FREEZE-V1-2026-10-29` · record `01_ENGINES/ITEM_SCORING_ENGINE/STMX_ITEM_V2_INTEGRATED_FINAL_FREEZE_AUTHORITY_V1.json` · documented, not reopened (CEO order 2026-10-29 §4).

## IV2-LIM-01 — Vision invocation output limit corrected — offline-verified only

- **Case:** REF_000010
- **Facts:** Order P live V1.3 output stopped at max_tokens 8192 (stop_reason max_tokens · 22,462 chars · JSON incomplete · billed, not retried). Order Q raised the Vision invocation limit to 16384 (config 1e5f01c377af9bdc…); offline 8/8.
- **Treatment:** configuration preserved exactly · NO subsequent live re-execution · not a scoring-engine defect · no rerun and no G53 request under this freeze
- **Status:** `ACCEPTED_KNOWN_LIMITATION (offline-verified, not live-verified)`

## IV2-LIM-02 — Suit with a member lacking a contract-valid V1.3 record is refused

- **Case:** REF_000841 · REF_000810
- **Facts:** Stored live V1.3: the bottom member is Incidental · extraction_depth NONE · NOT_RECONSTRUCTABLE (841: OCCLUDED_BY_OTHER_GARMENT; 810: TERMINAL_REGION_CROPPED + OCCLUDED) — no record, no category. R4 → INVALID_PRODUCT_INPUT · SUIT_MEMBER_ASSOCIATION_FAILED; EI R5 product unit TECHNICAL_INVALID_REQUEST; TC / SR / DM Suit successors SUIT_MEMBER_RECORD_INVALID (Order Q B 6/6).
- **Treatment:** commercial Suit identity preserved · existing valid-input contract preserved · no fabricated bottom observation · not converted to a Jacket-only product · Vision result not rewritten · Suit scorers unchanged. The release does NOT score every commercially designated Suit image: a Suit is scored only when each member holds its own contract-valid V1.3 record. Documenting this contract is not a new CEO product decision.
- **Status:** `ACCEPTED_KNOWN_INPUT_CONTRACT_LIMITATION`

## IV2-LIM-03 — Observed Vision sensitivity on the Jacket shoulder

- **Case:** REF_000840 SR
- **Facts:** Historical CEO GT SR6 (S). Stored historical record: shoulder_structure Strong → SR-V2-P1a → S. Latest live record: shoulder_structure None (shoulder_drop Dropped · fabric Semi-Structured) → SR-V2-P2b → R. Same frozen rule, two evidence packets.
- **Treatment:** CEO GT S preserved · live output R preserved · both Vision records preserved · no rule change, no image override. This is NOT proof that the latest observation is more visually accurate than the historical one.
- **Status:** `ACCEPTED_KNOWN_LIMITATION (Vision sensitivity)`

## IV2-LIM-04 — Historical GT disagreements (frozen-rule outcomes on the actual live evidence)

- **Case:** REF_000520 EI · REF_000840 EI · REF_000849 Jacket TC · REF_000849 Trouser TC
- **Facts:** REF_000520 U1 EI live E vs CEO GT EI5 (EI5 = NEUTRAL) · REF_000840 U1 EI live I vs CEO GT EI5 (EI5 = NEUTRAL) · REF_000849 U1 TC live CLASSIC vs CEO GT TC6 · REF_000849 U2 TC live CLASSIC vs CEO GT TC6 — each reproduced offline with the same Direction (Order P fp5b · Order Q C-04).
- **Treatment:** historical GT not overwritten · no new adjudication · no claim of 100% real-image accuracy (live comparable axes 13 / 18 = 72.2%)
- **Status:** `DISCLOSED`

## IV2-LIM-05 — Live E2E coverage is limited

- **Case:** —
- **Facts:** 7 images · 4 scored · 5 units COMPLETE · 13 / 18 comparable axes · Reasons 20 / 20 (Order P). OFFLINE REGRESSION PASS ≠ LIVE E2E COVERAGE.
- **Treatment:** recorded as two separate evidence classes
- **Status:** `DISCLOSED`

## IV2-LIM-06 — Inherited axis limitations

- **Case:** axis registers
- **Facts:** Each frozen axis keeps its own register (CURRENT_CONSTITUTION STMX_ITEM_{EI,TC,SR,DM}_V2_* limitation files); the SR V2 frozen suite resolves 3 undeclared test dependencies in its isolated replay (pre-existing, recorded since Order L).
- **Treatment:** unchanged · referenced
- **Status:** `INHERITED`
