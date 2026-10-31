# G53 APPROVAL REQUEST — FQ-REF010 (prepared, NOT active)

> Prepared under CEO order 2026-10-29 "ITEM V2 FINAL CLOSURE" §7. This order does not authorize new paid API calls. The expired Order P exception FE-E2E is not reused. No anchor exists; the runner refuses until the CEO approves and the exception is recorded in Guard 08 + the Frozen Decision Log.

| field | value |
|---|---|
| exception id | FQ-REF010 |
| image | REF_000010 only — `02_DATABASE_AND_CORPUS/REFERENCE_IMAGES/STMX_ACTIVE_REFERENCE_CORPUS_POST_CEO_V1/01_Jacket/REF_000010__스크린샷 2026-04-27 141834.png` · sha256 `b5a89565efbdfb6682fd124b2ef634d4f4f52b239f19fb0e52369b1dbf998c95` |
| provider / model | Anthropic Messages API · `claude-opus-4-8` |
| prompts | Vision = approved V1.3 built prompt (sha256 `aa6119bb338000cf7344112f7596cd1656946ea7068f44db5f42cb16cfe1dbd8`) · colour = target-aware colour successor ONE_CALL build of the live manifest (frozen Colour V1 body sha256 `53c96a901aa4ab30fbf93773195033d8fe3b93bd9fb1e0754a2f67c54f4a41e3`) |
| max_tokens | Vision 16384 · colour 8192 (config sha256 `1e5f01c377af9bdcd413a568116ffb78c2061bea2f7ba72be1cb7b61e4d160e7`) |
| requests | max 2 accepted · max 3 attempts · 1 reserve only after a non-billed transport failure · no retry for an unfavourable or incorrect result |
| expected cost | ≈ USD 0.64 (Vision ≈ 0.58 · colour ≈ 0.06) |
| worst case | USD 1.282 (Vision 0.7434 + colour 0.5386) |
| hard ceiling | USD 2.00, checked before every call |
| expiry | earliest of: 2 accepted calls · 3 attempts · ceiling · run completion · 24 h after registration |
| plan | `AUTHORIZATION/PREREGISTERED_PLAN_FQ.json` sha256 `e271e8757c60967b2154c8875420b2f12af7636ae3ce71815fcafc8a995eac48` |
| runner | `_raw/live_q/fq_live_runner_GATED_V2.js` sha256 `59887d3d3f58af3dd3b5a7e25950684f6dcf4ae28def5cced2c4d31810824f86` |

REF_000841 / REF_000810: 0 calls (stored Vision reused; a colour call is useless until CEO decision D-Q1).
