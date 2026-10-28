# 01 — Design Review Checklist (order §3, recorded BEFORE any R4 source exists)

> 2026-10-25 · Full-Look SR Milestone 5 · order `AUTHORIZATION/SR_FINAL_FREEZE_CEO_ORDER_VERBATIM.md`.
> PRE snapshot `_raw/manifests/z0_snapshot_pre.json`: 16,642 protected files; predecessors 43 / 43 intact.
> Sources read in the prescribed order: Context 00 → 10; the MSFC package (D2 · D4 · D5 · D6 · D7); the R3 source and tests; Frozen Item SR V1.2 admission and resolver; Context FL-SR-C1 (CEO clarification 2026-10-17); backup protocol (Drive rule; Vision final-freeze layout).

## 1. Checklist

| ID | Requirement | Result | Evidence / how R4 meets it |
|---|---|---|---|
| DR-01 | mandatory-scoring authority | PASS | AVAILABLE_EVIDENCE_MANDATORY_SCORING = approved CEO decision (Frozen Decision Log STMX-2026-10-AEMS); MS-1 kept byte-for-byte |
| DR-02 | binary Direction | PASS | RESOLVED ⇒ STRUCTURED / RELAXED; NEUTRAL guard kept |
| DR-03 | strict Upper Priority | PASS | governing upper = `upper_realization.source_refs[0]`; adapter byte copy |
| DR-04 | Direction ≠ Strength | PASS | no Strength / ordinal / confidence number |
| DR-05 | 41-parameter Frozen Vision protected | PASS | inputs = existing SVP-007 / 008 / 009 / 106 / 119 / securing / 123 / 124 only |
| DR-06 | no new observation | PASS | the R4 condition uses SVP-119 waist definition and SVP-106 drop, both already read by R3 |
| DR-07 | no API call | PASS | G53 ACTIVE; regression under the network-blocking preload |
| DR-08 | missingness non-blocking | PASS | MS-1 unchanged; an unobserved waist / drop contributes nothing |
| DR-09 | no GT / id leakage | PASS | source scan + identity-scramble tests carried over |
| DR-10 | SRB-2g conflicts verified | PASS | verified today on the R3 outputs: frozen M317 · F298 → S (CEO R); live M309 #15 → S (CEO R); M320 frozen S (CEO S) |
| DR-11 | Item vs Full-Look boundary | PASS | Item R2 (built shoulder = governance → S) is the frozen Item rule. It is NOT imported where it conflicts with the realized Full-Look silhouette (order §1). The Full-Look binding clarification FL-SR-C1 governs. |
| DR-12 | Oversized ≠ automatic R | PASS | Oversized + built shoulder + Structured + waist Defined + no drop → S (SRB-2os) |
| DR-13 | strong shoulder ≠ automatic S | PASS | Oversized + built shoulder + Structured without body governance → R (SRB-2or); Relaxed / Oversized + built + soft → R (2r) |
| DR-14 | retention ≠ release | PASS | shape (SVP-009) and form-retention material stay separate fields; neither is read as the other |
| DR-15 | realized silhouette controls | PASS | the R4 cell condition is a reading of whether the garment body itself is governed below the frame (waist shaped by the garment, shoulder seated) |
| DR-16 | no weights / thresholds | PASS | categorical conditions only |
| DR-17 | deterministic | PASS | pure function; replay 3× |
| DR-18 | R3 and predecessors protected | PASS | R3 is now a protected predecessor (PRE walk); R4 is a new directory |
| DR-19 | no Item SR / TC change | PASS | both under the protected walk; TC V2 manifest verified |
| DR-20 | known GT error not hidden | PASS | M320 (CEO S) becomes R in R4 — reported as the irreducible M317 / M320 collision |
| DR-21 | freeze conditional on gates | PASS | F-01 … F-16 evaluated before any freeze file is written |
| DR-22 | staging ≠ Drive | PASS | no Drive access in this environment (memory `drive_backup_rule`, re-detected in D7) → PENDING only |
| DR-23 | backup + restore planned | PASS | short-path capsule under `C:\STMX_UPLOAD\`, census, hash, clean-room restore, verifier on the restored copy, rollback rehearsal |
| DR-24 | TC blocked until SR gates | PASS | no TC file touched; TC handover only |

## 2. Diagnosis of SRB-2g

The R3 cell is Oversized + Strong / Extreme shoulder + Structured shape → S. It has two defects.

1. **It imports Item R2 wholesale.** In Item SR a built shoulder is governance → S under any fit. The Full-Look CEO clarification FL-SR-C1 (2026-10-17, binding) says:
   - "realized upper silhouette decides";
   - "strong release not cancelled by cinching";
   - "belt / knot presence ≠ silhouette control".

   Oversized is the frozen STRONG release (Item admission `STRONG_RELEASE_FITS`). Item's own CEO anchor §3 adds: "oversized + dropped shoulder … → release dominates".
2. **It reads three frame facts as body control.**
   - A built shoulder and a shape-holding cloth describe the garment's frame and cloth.
   - Under an Oversized fit, that frame can hold the volume *away* from the body — which is release (M317 · F298 · M309).
   - None of the three facts says the garment body governs the torso.

## 3. The R4 correction (one row split, nothing else)

Oversized + built shoulder (Strong / Extreme) + Structured shape:

| new rule | condition (all observed) | direction | basis |
|---|---|---|---|
| **SRB-2os** | waist definition = **Defined** (shaped by the garment itself) AND shoulder drop ≠ **Dropped** | STRUCTURED | Order §4.2: a "substantially governed structural silhouette" is not defeated by volume. Basis: Frozen Item admission — Defined waist (Item WAIST_MILD) is "actual construction hold" that *preserves structure under release*; a seated (not dropped) built shoulder + a shape-holding cloth + a garment-shaped waist = governance from the frame through the body. |
| **SRB-2or** | otherwise — waist Undefined / Cinched / not observed, or shoulder Dropped | RELAXED | FL-SR-C1: a strong release is not cancelled by cinching; belt ≠ silhouette control. Item CEO §3: oversized + dropped shoulder → release dominates. Without body governance, the built frame and stiff cloth hold the volume away from the body — the release governs the realized silhouette. |

- **Not used:** shoulder strength (Strong vs Extreme — a prohibited proxy), garment type, length, closure, colour, material.
- **Cinched is deliberately excluded** from 2os by FL-SR-C1 (approved).
- **Defined is the only body-governance fact** in the frozen contract that is not a securing device.

## 4. Expected effect (stated before running)

- Frozen M317 / F298 → R.
- Live M309 #15 (Cinched + Dropped) → R.
- M320 → R. This is the known irreducible collision: M317 and M320 have identical admissible inputs; only Extreme / Strong differs, which is prohibited.
- Live M323 #16 and srsuit1 #19 (waist Defined, no drop) → S.
- Every other row is unchanged.

## 5. Semantic authority (F-16)

- The correction is the execution of the CEO's §4.1–§4.3 instruction, built only from approved semantics:
  - FL-SR-C1 (CEO 2026-10-17);
  - Item CEO §3;
  - Frozen Item admission (Defined preserves structure under release);
  - order §4.2.
- MS-1 is preserved per order §5.
- The rest of the lane-B rows are carried unchanged. They are the constitution this order directs to freeze (§0.2 conditional authorization).
- One element is Claude's operationalisation, disclosed and not presented as a separate CEO decision: treating **Defined** as the observable for "substantially governed".
- If the CEO rejects that reading, the remedy is a governed reopen of one row. It does not block the freeze authorized by §0.2.

**Stop-Rule check:** no new vocabulary, enum, parameter or architecture. The rule ids SRB-2os / SRB-2or are internal labels.
