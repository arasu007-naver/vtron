STMX_EI_NUMERIC_V1_FROZEN_BASELINE_R1
STMX EI NUMERIC V1 — FORMAL FROZEN BASELINE, PACKAGING REVISION R1

Freeze date : 2026-09-08
Runtime     : STMX_EI_NUMERIC_LAYER_V1
Runtime SHA : d656a579ca0bd107f024eb2671666de539aafe7a28b197dbe640274509a47c1b
Predecessor : STMX_EI_NUMERIC_V1_FROZEN_BASELINE  (preserved, SUPERSEDED_FOR_PACKAGING_INTEGRITY)

Why this revision exists
  The predecessor manifest classified tests/reproduce_ei_numeric_v1_frozen_baseline.js as
  IMMUTABLE_TEST_SOURCE. It is stale predecessor-stage reproduction code: it cannot run from this
  location, and its source writes REPRODUCTION_RESULT.json into its own directory, which is inside
  the Frozen tree. A file that writes into the Frozen tree is not immutable Frozen authority.
  It has been removed from the authority set. No replacement test was added.

  Scoring semantics were NOT superseded. Runtime byte delta 0, semantic delta 0 / 114.

Contents — authored, non-regenerable authority only
  src/        the resolver
  contracts/  the output contract and the exposure_realization representation authority
  fixtures/   the 114 semantic state and the CEO-authorised corrected inputs
  governance/ the CEO decisions and the correction proofs

  IMMUTABLE_TEST_SOURCE executable population = 0.
  Reproduction tooling lives OUTSIDE this tree, classified VERIFICATION_TOOL / NON_FROZEN.

Accepted V1 limitations, recorded rather than hidden
  REF_000616#SU2  Direction E · CEO GT EI7 · Numeric null · GOVERNED_WITHIN_SIDE_NUMERIC_RESIDUE
  EI7 recall 0.313 · EI8 recall 0 · within-E exact mismatch 16

Do not edit any file in this tree.
