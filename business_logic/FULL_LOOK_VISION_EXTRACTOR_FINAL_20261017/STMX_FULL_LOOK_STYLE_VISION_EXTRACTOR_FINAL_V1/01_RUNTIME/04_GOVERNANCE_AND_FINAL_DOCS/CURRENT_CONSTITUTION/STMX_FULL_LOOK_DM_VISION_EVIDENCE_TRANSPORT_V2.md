# STMX FULL-LOOK DM VISION — EVIDENCE TRANSPORT CONTRACT V2

> **Status:** `CEO_APPROVED_SCOPED_SUCCESSOR — IN FORCE for new Full-Look Vision evidence transport` · CEO 2026-10-15 · installed by `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_VISION_FINAL_OBSERVABLE_EVIDENCE_DELIVERY_CORRECTION_V1/`. Manifest: `STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2_MANIFEST.json` (same folder).
>
> **Scope:** the **transport requirement** of the Full-Look DM Vision evidence ONLY — how observed DMP-1 / DMP-2 evidence and the DMP-3 visibility classification travel from the Vision Extractor to a downstream consumer.
>
> **Supersedes (transport requirement only):** the mandatory co-emission of `dm_evidence_visibility` with `look_components` and `look_detail_systems` in one canonical block, as fixed by `STMX_FULL_LOOK_DM_VISION_EXTRACTION_FINAL_FREEZE_V1.md` §3 (Schema) and executed by the frozen adapter. **Everything else in the V1 Final Freeze stays in force unchanged** (§16 of this document). V1 is preserved byte-identically and remains valid for its original pinned consumers.
>
> **Not a scoring authority.** No score, Direction, Strength, threshold, weight, formula, DM1–DM9 mapping or scoring-eligibility rule is defined here. A Full-Look DM Scoring Engine is still not built.

## 1. Approval Anchor

```
Approval Anchor

CEO Decision: 2026-10-15
Reason:       CEO final architecture decision "Observable Evidence Only / Vision–Scoring Responsibility Separation"
              (order STMX FULL-LOOK VISION EXTRACTOR — FINAL OBSERVABLE EVIDENCE DELIVERY CORRECTION & RELEASE
              CANDIDATE CLOSURE V1, Part A §1 "Bounded CEO approval"): "Remove the requirement that DMP-3 must have a
              resolved value before observed Full-Look DM evidence can be delivered to an authorized downstream
              consumer. This is a scoped reopening of the Full-Look DM Vision evidence transport contract, not a
              reopening of DM Scoring physics."
Old requirement (V1 Final Freeze §3 Schema + frozen adapter):
              the DM output is ONE record { look_components, look_detail_systems, dm_evidence_visibility };
              dm_evidence_visibility carries no optional marker ("?"), so it is mandatory; the frozen adapter
              (src/dm_adapter.js, byte-identical since Style Vision Extractor V1.2) refuses a record without it
              (DM_OUTPUT_SHAPE_ILLEGAL); look_detail_systems [] = positive "no designed detail".
Amended requirement (this V2): observed DMP-1 / DMP-2 evidence is transported whether or not DMP-3 is resolved;
              DMP-3 travels as separate visibility metadata { state, value } and is present with a value only when
              it is actually derived from the look-level common record; the transported system list is
              OBSERVED-ONLY evidence and is never a verified-negative ("no designed detail") conclusion.
Scope of reopening: Full-Look DM Vision evidence TRANSPORT only.
Affected producer interface: Full-Look Style Vision Extractor packet (V1_RC4 and later): new block dm_evidence
              (+ dm_transport provenance) replaces dm_subsystem / dm_adapter / dm_block_withheld in that packet.
              Integrated extraction prompt §9: the "[] is a positive record" sentence is replaced (observed-only).
Affected consumer interface: any future Full-Look scoring consumer reads dm_evidence under this V2 contract.
              No consumer exists today; no consumer contract is created here.
Unchanged DM semantics: §16 (families A–J, primitives, states, relational form, repeated units, admission and
              individuation rules, negative boundaries, surface / relational rules, firewalls, G65).
Version / compatibility: V2 is a successor transport version. A V1 frozen record is derivable from a V2 record
              ONLY when DMP-3 is OBSERVED (§10); otherwise the V1 adapter still refuses it — V1 behaviour is
              reproducible exactly.
Historical authority preserved: V1 Final Freeze document + manifest, Canonical Dictionary V1.11, frozen adapter,
              Guard G65, all earlier extractor candidates (RC3 / RC2 / RC1 …) and their packages — byte-identical.
Affected Scope: this document + manifest; Style Vision Extractor V1_RC4 (src/dm_transport_v2.js,
              src/dm_projection.js, src/extractor.js, src/validator.js, schema, prompt V2); Project Context.
```

## 2. Why the transport requirement was separated (CEO principle, verbatim intent)

The Vision Extractor is an observation and evidence-transfer engine. It delivers what was observed and does not decide whether the evidence suffices to score. Under V1 a look whose common record carries no frame limit could not fix DMP-3 (the frozen enum offers `adjudicable` or `partially_observable:{small_detail_unresolvable}` and the record cannot tell them apart), so every observed DM system of such a look was blocked from delivery. V2 removes that block without inventing a DMP-3 value.

## 3. V2 transport record (one canonical successor interface)

```
dm_evidence: {
  transport_contract:     "STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2",
  look_components:        [ { component_ref, item_record_ref? } ],          // DMP-1 — V1 field, V1 meaning (carrier registry)
  look_detail_systems:    [ <V1 system schema, unchanged> ],                // DMP-2 — V1 fields; OBSERVED-ONLY list (§5)
  dm_evidence_visibility: { state: OBSERVED, value: <V1 token> }            // DMP-3 — derived from the look-level record
                        | { state: UNKNOWN }                                //          not established — no value, never invented
}
dm_transport: { authority: { v1_freeze: { path, sha256 }, v2_transport: { path, sha256 } }, output_fingerprint }
```

- **No new vocabulary for DM semantics.** Field names `look_components` · `look_detail_systems` · `dm_evidence_visibility` and every value are V1 / Dictionary V1.11 terms. The `{ state, value }` envelope and the states `OBSERVED` · `UNKNOWN` are the frozen Item DM states already used by the V1 primitives (§3 V1 Schema).
- **New interface identifiers (transport metadata, not DM evidence vocabulary):** the packet block names `dm_evidence` and `dm_transport`, and the contract identifier string `STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2`. They exist so that a V2 record can never be mistaken for a V1 record (whose empty list has absence semantics, §5).
- **One DM block per packet.** A V2 packet carries `dm_evidence` (or, when no DM evidence exists, the candidate status `dm_acquisition { NOT_ACQUIRED, reason }`), never a V1 `dm_subsystem` and never a withheld twin. There is one DM producer.

## 4. DMP-3 handling

| Situation | `dm_evidence_visibility` |
|---|---|
| the look-level common record (SVP-001 state + limits) maps deterministically to one V1 token (RC3 mapping rules: one frozen class; not_adjudicable with exactly one reason) | `{ state: OBSERVED, value: <that token> }` |
| no limit recorded · occlusion alone (AVG-1) · tokens of both classes · several not_adjudicable reasons · frame not OBSERVED · token without a frozen class | `{ state: UNKNOWN }` — reason recorded in diagnostics (provenance only) |

- `adjudicable` is **never** inferred from a complete frame or from the absence of limits.
- `not_adjudicable` is **never** inferred from an unreadable accessory value or any other value-level UNKNOWN / NOT_VISIBLE.
- A model-emitted visibility value is not read (CEO INT-02, 2026-10-13) — it is kept for comparison only.
- DMP-3 is **not a prerequisite** for transporting DMP-1 / DMP-2. Diagnostics never gate the output.

## 5. Observed-only semantics — no observation is not absence

- In V2, `look_detail_systems` lists the qualifying Detail Systems **that were observed**. It is **not** a claim that the list is exhaustive.
- `look_detail_systems: []` in V2 means **"no qualifying system was observed"**. It does **not** mean "the look contains no designed detail".
- **V2 never carries a verified-negative conclusion.** The V1 statement `[] = positive "no designed detail"` exists only inside a V1 record, which can be derived only when DMP-3 is OBSERVED (§10) and is then governed by V1 §3 / §10.
- What the available evidence supports (including any Minimal / Neutral / Detailed reading) is decided by a future, separately approved scoring contract — never by the Vision Extractor. V1 §10 "Insufficient visibility never becomes Minimal" stays binding on every consumer.

## 6. Admission (unchanged V1 rules, block-level atomicity)

- Every system is admitted with the V1 frozen rules: family A–J · `relational_form` only on H (`accent` · `composition`) · carriers ⊆ the component registry (1..n) · the three primitives in the V1 domains with the frozen states · `repeated_units` yes / no · one phenomenon = one system (identical duplicate refused) · G65 (no count / coverage / score key, no number).
- DMP-1 is assembled from the systems' carrier references with registry lineage (V1 adapter A-1 / A-2 hold by construction); a model-emitted list is compared, never used.
- **Atomicity (approved V1 rule kept):** an inadmissible system refuses the whole DM block (never repaired, nothing kept from it), status `dm_acquisition { NOT_ACQUIRED, DM_BLOCK_REJECTED_BY_FROZEN_ADAPTER }`. The rejection stays local to DM: every EI / TC / SR observation of the look is kept.
- Equivalence with the RC3 delivery path (proved by tests in RC4): V2 admits exactly the system sets RC3 admitted — the extractor's frozen-rule check (which additionally enforces the G65 count / number keys and the identical-duplicate rule) — and every set V2 admits is also admitted by the unchanged frozen adapter with every lawful V1 token. V2 admits nothing the frozen adapter would refuse.

## 7. Integrity

- `dm_transport.output_fingerprint` = the V1 fingerprint function over the whole `dm_evidence` record; any later edit fails validation.
- Both authorities are hash-pinned and verified at every extraction: the V1 Final Freeze (`49e513ea…`) and this document.
- The validator re-derives DMP-3 from the packet's own look-level record: an OBSERVED value the record does not support (e.g. `adjudicable` from absence) or an UNKNOWN the record would resolve fails validation.

## 8. Failure isolation

A malformed DM block never erases EI / TC / SR evidence; a value-level UNKNOWN never removes a DM system; DMP-3 uncertainty never removes DMP-1 / DMP-2.

## 9. Producer instruction (prompt) consequence

The integrated extraction prompt keeps every V1 rule for systems and primitives. Only the sentence that declared `[]` a positive no-detail record is replaced by the observed-only sentence (§5). Prompt V2 = Prompt Candidate V1 with that one comment line changed (exact diff in the RC4 prompt diff manifest). The model still emits neither `look_components` nor `dm_evidence_visibility`.

## 10. Backward compatibility (V1)

- `toFrozenV1Block(dm_evidence)` (RC4 `src/dm_transport_v2.js`) passes `{ look_components, look_detail_systems, dm_evidence_visibility: <value> }` to the **unchanged** frozen adapter. With DMP-3 `OBSERVED` it returns the V1 record and fingerprint (equal to what RC3 delivered). With DMP-3 `UNKNOWN` it passes no visibility, and the frozen adapter refuses exactly as V1 requires (`DM_OUTPUT_SHAPE_ILLEGAL`).
- RC3 and earlier candidates keep emitting V1 records; their seals and suites are unchanged.
- Migration: a consumer written for V1 must either keep reading V1 records (RC3) or adopt V2 explicitly; it must not read a V2 `[]` with V1 absence semantics.

## 11. G65 (unchanged and binding)

Evidence, not score · no material / process proxy · relational colour = functioning role · one phenomenon = one system · no distribution proxy · no component-count proxy. V2 adds no field that could carry any of them.

## 12. What V2 does not authorize

Changing DM families, primitives or their domains · new Detail categories or parameters · scoring Direction / Strength / thresholds / weights / formulae / Style ID · numeric DM scores · assigning `adjudicable` automatically · treating unknown as absent · changing frozen Item Scoring engines · weakening G65 · rewriting historical frozen packages · changing Ground Truth.

## 13. Reopen rule

Any further change to this transport contract or to the V1 semantics it carries requires an explicit CEO **DM VISION REOPEN DECISION** (reason · affected authority · migration plan · regression plan).

## 14. Vocabulary note

The transport identifiers in §3 are interface metadata. Registration of `dm_evidence` / `dm_transport` / the contract identifier in the Canonical Dictionary was not part of the approved order and is recorded as an open governance item (Dictionary is CEO-owned).

## 15. Provenance

| Stage | Location | Status |
|---|---|---|
| V1 Final Freeze | `CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EXTRACTION_FINAL_FREEZE_V1.md` | in force except the transport requirement above; byte-identical |
| Contract finding | `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_VISION_FINAL_EVIDENCE_DELIVERY_CONTRACT_RECONCILIATION_V1/02_FROZEN_CONTRACT_AUTHORITY_AUDIT.md` | the mandatory-DMP-3 finding that this V2 resolves |
| CEO approval + implementation | `04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_VISION_FINAL_OBSERVABLE_EVIDENCE_DELIVERY_CORRECTION_V1/` | this V2; RC4 |

## 16. V1 content carried unchanged (not superseded)

V1 §1 scope · §2 purpose and firewall · §3 the three parameters and their meanings, the system schema, the normalizations (`look_detail_family`, `whole_look`) · §4 Detail System definition · §5 taxonomy A–J · §6 relational rules · §7 surface rules (Q1 · Q2 · Q4 · B-1 · B-2) · §8 negative boundaries · §9 Item Vision reuse boundary · §10 visibility / fail-closed (value states; "Missing detail is never inferred"; "Insufficient visibility never becomes Minimal") · §11 duplication firewall · §12 repeated-unit firewall · §13 no-scoring firewall · §14 cross-axis notes · CEO decision index Q1–Q12, B-1, B-2.
