# D2 — STMX Full-Look SR Direction Constitution V3_R4 (`STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4`)

> Scope: Full-Look SR **Direction** only, STRUCTURED | RELAXED. Strength, ordinal scores and Style ID are out of scope.
>
> Executable source:
> - `src/fl_sr_binary_constitution_v3_r4.js` (rules + MS-1);
> - `src/fl_sr_direction_resolver_v3_r4.js` (governing upper, inputs, trace);
> - `src/fl_sr_authority_v3_r4.js` (rule register, pins).
>
> Release `FLSR_FINAL_V1` bundles them byte-identical.
>
> Authority: CEO order 2026-10-25 §0.2 · §4 · §5 (correction + conditional Final Freeze). AVAILABLE_EVIDENCE_MANDATORY_SCORING (CEO 2026-10-24, approved cross-axis decision). FL-SR-C1 (CEO 2026-10-17). SR Upper Physics Contract (frozen).

## 1. Admissible inputs (existing Frozen Full-Look Vision V1 evidence only)

| input | source | domain |
|---|---|---|
| governing upper | `upper_realization.source_refs[0]` (the frozen extractor's resolution of the outermost visible upper) | component ref |
| relation (Fit) | SVP-007 | Slim · Regular · Relaxed · Oversized |
| shoulder | SVP-008 | None · Mild · Strong · Extreme |
| shape | SVP-009 shape behaviour | Structured · Semi-Structured · Semi-Fluid · Fluid |
| drop | SVP-106 @ governing upper | None · Dropped |
| waist | SVP-119 @ governing upper (absent on a non-waist-carrier top = Undefined) | Undefined · Defined · Cinched |
| constriction | securing relation on the governing upper with visible constriction OBSERVED | true · false |
| form retention | SVP-124 material Leather / Padding or SVP-123 surface Quilted @ governing upper (classes read from Frozen Item SR) | true · false |

**Never read:**
- lower-body garments (Upper Priority);
- inner / non-governing garments;
- length, garment type, closure or front state;
- colour, pattern, attachments;
- belts as objects, accessories;
- the CG-1 sidecar;
- ECC overlays in production;
- look ids, file names, CEO GT.

## 2. Direction rules — first matching row; every row is categorical (no weights, scores or thresholds)

| # | rule | condition | direction | basis |
|---|---|---|---|---|
| 1 | SRB-1 | Fit Slim | STRUCTURED | Fit definition (Upper Physics §4.1): the torso outline is followed continuously; FA-SR-3 SR-1 |
| 2 | SRB-2m | Fit Relaxed + shoulder Strong / Extreme + shape Structured | STRUCTURED | moderate release, construction holds (FA-SR-3 SR-2m) |
| 3 | **SRB-2os** | Fit Oversized + shoulder Strong / Extreme + shape Structured + waist **Defined** + drop ≠ Dropped | STRUCTURED | order §4.2 "a substantially governed structural silhouette"; Frozen Item admission (Defined waist preserves structure under release) |
| 4 | **SRB-2or** | Fit Oversized + shoulder Strong / Extreme + shape Structured, otherwise | RELAXED | FL-SR-C1 (strong release not cancelled by cinching; belt ≠ silhouette control); Item CEO §3; SR-06 |
| 5 | SRB-2f | Fit Relaxed + observed form-retaining material / Quilted surface (rows 2–4 not met) | STRUCTURED | Item SR V1.2 R3d (CEO 2026-09-14 §4.2); never under Oversized |
| 6 | SRB-2r | Fit Relaxed / Oversized, rows 2–5 not met | RELAXED | released upper without full structure |
| 7 | SRB-3h | Fit Regular + shape Structured | STRUCTURED | FA-SR-3 SR-3s + SR-3m |
| 8 | SRB-3s | Fit Regular + shape Semi-Structured + drop ≠ Dropped | STRUCTURED | FA-SR-3 SR-3s |
| 9 | SRB-3k | Fit Regular + Semi-Structured + Dropped + something holds (shoulder ≠ None, waist Defined, or cinch) | STRUCTURED | Item R4c (narrowed SR-3d) |
| 10 | SRB-3d | Fit Regular + Semi-Structured + Dropped + nothing holds | RELAXED | Item R4b |
| 11 | SRB-3g | Fit Regular + soft shape (Semi-Fluid / Fluid) + shoulder Strong / Extreme or cinch | STRUCTURED | FQ-SR-2 (Item R2 force) |
| 12 | SRB-3r | Fit Regular + soft shape, no force | RELAXED | FQ-SR-2 |

"cinch" = waist Cinched or observed constriction. The table is total over the frozen domains: all 1,344 complete combinations give S or R. It has no default branch; the code ends in a throw.

## 3. Structure, release and their coexistence

- **Structural force** — counts only when observed:
  - Slim Fit (body contour);
  - built shoulder (Strong / Extreme) with a Structured shape — sufficient under a moderate release (Relaxed);
  - under a strong release (Oversized), only with observed body governance — waist Defined + seated shoulder;
  - observed form retention under Relaxed only;
  - shape retention (Structured / Semi-Structured) under Regular;
  - shoulder force or cinch on a soft Regular upper.
- **Release:**
  - Relaxed Fit = moderate release; Oversized = strong release (Frozen Item `STRONG_RELEASE_FITS`);
  - a Dropped shoulder is a governance-loss signal;
  - a soft shape (Semi-Fluid / Fluid) gives no retention.
- **Both present:** the row precedence above decides.
  - A strong release is overcome only by structure that reaches the body (2os).
  - Cinching never overrides a release (FL-SR-C1).
  - A Dropped shoulder defeats 2os and Semi-Structured retention (3s → 3k / 3d).
- **Weak but valid Direction:** a look with little evidence still gets the row its observed facts select. For example, Regular + soft + nothing else → RELAXED (3r).

## 4. Missingness — MS-1 (preserved per order §5)

An unobserved fact contributes nothing. The table reads it as giving no evidence:

| field | reading |
|---|---|
| Fit | no fit force → shape-governed rows |
| shape | no retention → soft rows |
| shoulder | no shoulder governance |
| drop | no release |
| waist | no definition |
| constriction | none observed |
| form retention | none observed |

No value is written into the evidence record. Diagnostics, never a status: `basis.missing_observations` · `sensitivity` (NONE / POSSIBLE) · `sensitive_to` · `possible_outcomes_if_observed`.

## 5. Non-direction outputs (input failures only)

`status: TECHNICAL_EXCEPTION`, `exception.class: INPUT_FAILURE`, with one of:

- `INPUT_CONTRACT` — packet / run_record contract, version, registry or out-of-domain value;
- `UPPER_NOT_VISIBLE` — look frame not observed, or no governing upper;
- `NO_UPPER_SR_EVIDENCE` — Fit, shape, shoulder and drop all unobserved.

They are never a style class and never NEUTRAL / UNKNOWN / UNRESOLVED.

## 6. Output and trace

```
{ axis: 'SR', resolver, lane: 'B', evidence_mode, authority: 'STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4',
  direction: STRUCTURED | RELAXED, status: 'RESOLVED', rule, resolved_by: DIRECT | AVAILABLE_EVIDENCE (MS-1),
  basis: { governing_region: 'UPPER', governing_upper, rule, rule_meaning, evidence_used[], missing_observations[], sensitivity, sensitive_to[], possible_outcomes_if_observed[] },
  evidence: { frozen facts (raw states), form retention, … }, trace: [ governing upper · facts · form retention · inputs · MS-1 readings · RESOLVED … via rule · sensitivity ] }
```

## 7. Exclusions (tested)

- Oversized ≠ automatic RELAXED (2os);
- built shoulder ≠ automatic STRUCTURED (2or · 2r);
- belt / cinch ≠ STRUCTURED under a release;
- material never decides alone;
- shape retention ≠ release;
- lower body never overrides;
- an inner garment never replaces the governing outer;
- no NEUTRAL; no default;
- no id / GT input.

**Documented exception to "fit alone":** Slim → STRUCTURED (SRB-1). The frozen Fit definition of Slim is itself the realized body-contour observation.

## 8. Bounded accuracy limitation (known, not hidden)

- M317 (CEO RELAXED) and M320 (CEO STRUCTURED) have identical admissible inputs. The only difference is shoulder Extreme vs Strong, which is a prohibited proxy.
- The engine returns RELAXED for both. M320 is therefore a known, irreducible error:
  - 1 of 4 Full-Look anchors in the corpus;
  - 3 of 8 anchor runs in the stored live replay (all M320).

## 9. Approval trace

- **Correction and freeze authority:** this constitution is the execution of CEO order 2026-10-25 §4 (SRB-2g correction) and §5 (MS-1 preservation), under the §0.2 conditional Final Freeze authorization.
- **SRB-2os / SRB-2or** use only approved semantics: FL-SR-C1 · Item CEO §3 · Frozen Item admission · order §4.2.
- **One element is Claude's operationalisation** within that authority: treating the Defined waist as the observable for "substantially governed". It is disclosed in the CEO report, and any change requires a governed SR reopen.
