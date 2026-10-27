# STMX FULL-LOOK STYLE VISION EXTRACTOR — FINAL FREEZE V1

> **상태:** `FULL_LOOK_STYLE_VISION_EXTRACTOR = COMPLETE_AND_CLOSED_AND_FROZEN` · PRODUCTION · Freeze ID `FLV-FINAL-FREEZE-V1-2026-10-17` · 2026-10-17
>
> Approval Anchor — CEO Decision 2026-10-17 (order "STMX FULL-LOOK STYLE VISION EXTRACTOR — FINAL FREEZE, PRODUCTION PACKAGE, GOOGLE DRIVE BACKUP & SCORING HANDOVER V1", verbatim in `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_CLOSURE_V1/AUTHORIZATION/FINAL_CLOSURE_CEO_ORDER_VERBATIM.md`). Reason: the sealed RC6 candidate passed every technical acceptance gate and the clean-room release QA; it is promoted unchanged as the final Vision authority. Affected Scope: this file · its manifest · the production authority pointer · the final release directory · Project Context (append-only).

## 1. What is frozen
| item | identity |
|---|---|
| Final release | `01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/` · 303 files · aggregate `de1e46ce046c960226f9d5258dbe6e5f13731271ed537a17331cd28527c7e5bd` · `FINAL_FREEZE_SEAL.json` sha256 `a6803bfac096c8fc466dcc4a1a3e4891c73856b384df123525f11ff6d135cb6a` |
| Accepted implementation | RC6 `SEAL-FLV-RC6-2026-10-17` (aggregate `78e4a31e93f668cdf96c436be5bad16f2bb888a2336af355c203ba9943684963`) — promoted without code change; no RC7 |
| Runtime | `01_RUNTIME/01_ENGINES/STYLE_VISION_EXTRACTOR/FLV_RC6_FINAL/` = 126 RC6 files byte-identical to the RC6 seal (directory renamed for the Windows path limit only); the 3 rejected prompt-V3 candidate files are excluded |
| Entry point | `cli/run_offline.js` (sha `bd96756b5b5788a4…`) |
| Validator | `src/validator.js` (sha `5af932ee16dd212c…`) · converter `src/transport/convert.js` (`dd6c765f1e7ac83b…`) · local isolation `src/isolation.js` (`15a1ef4cbf4f36c4…`) |
| Evidence Transport V2 | code `src/dm_transport_v2.js` (`b5450fb27434cb9e…`) · authority `CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md` |
| Prompt | V2 `535bc1836a574e9c8142184ddee7b41f5447bf28d633c857e4163efc95726aba` (approved; V3 / V3_UNVALIDATED / V3_1 rejected) · model `claude-opus-5-5` |
| Packet contract | STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET V1_RC4 · schema sha `2f1ee1ef015c0344…` |
| Parameter inventory | 41 parameters (`CEO_APPROVED_CANDIDATE`, sha `0bc2d1522e8e86f9…`) |
| Frozen dependencies (bundled, hash-pinned) | `01_ENGINES/ITEM_VISION_EXTRACTOR/STMX_VISION_PRODUCER_V1_3/producer_rules_v1.js` (c22e59140dee…) · `01_ENGINES/ITEM_VISION_EXTRACTOR/run/color_recovery/color_contract_v1.js` (ccda8495fcf2…) · `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EXTRACTION_FINAL_FREEZE_V1.md` (49e513ea1c2a…) · `04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md` (2e6bd0c7391c…) |

## 2. Acceptance evidence
- Final Acceptance Audit: 13 / 13 PASS — RC6 suite 355/355 · 12 / 12 packets · components 78 / 78 · DM 46 / 46 (verbatim, admitted under 9 DMP-3 tokens) · no scoring field · ABSENT never fabricated · deterministic · no silent loss (demand-conditional / frozen-N/A facts classified in the K-2 ledger) · all 41 parameters produced as OBSERVED in at least one actual look.
- Clean-room release QA (copy outside the master tree): copy byte-identical to the seal · `verify_release.js` R1–R9 PASS (manifest · seal · RC6 identity · dependencies · portability · 12-response replay byte-identical · 78 / 46 delivery · G53 · fixture) · RC6 suites in the clean room 243 PASS / 0 FAIL / 26 environment-dependent (historical packages not part of the release) · authoritative release unchanged after QA.

## 3. Known non-blocking limitations
See `STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/05_DOCS/KNOWN_LIMITATIONS.md` (L-1 fit boundary · L-2 visual residuals · L-3 pending scoring rules · L-4 demand-conditional facts · L-5 route label · L-6 Colour V1 buttonholes / seams scope · L-7 TC diagnostic · L-8 new-image inference needs the external model + G53 authorization).

## 4. Rules after the freeze
- ⛔ The Full-Look Vision Extractor is not modified during Full-Look Scoring Engine development. A genuine Vision contract defect requires a separate governed REOPEN decision (reason · affected authority · migration plan · regression plan · new release identity). The final release is never rebuilt in place; RC1 … RC6 and every earlier package remain preserved.
- Live inference (new images) needs the external model and a CEO G53 authorization; this release never calls a model.
- Next workstream: `FULL_LOOK_STYLE_SCORING_ENGINE` — interface and axis evidence mapping in `STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/05_DOCS/SCORING_ENGINE_HANDOVER.md`.
