'use strict';
/**
 * STMX EI — DIRECTION → NUMERIC GOVERNED BRIDGE V1 (EI-owned · production integration successor · CANDIDATE)
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-27 · Order: STMX ITEM SCORING ENGINE V1 — FOUR-AXIS PRODUCTION INTEGRATION SPRINT · D3 · §8–§10
 *   Reason:         The frozen EI Numeric layer V1 (R1) consumes an admission-aware state
 *                   { frozen_direction, exposure, pathways, admitted } derived from the frozen EI Direction trace.
 *                   No governed component produced that state live: the frozen Numeric replay consumes the precomputed
 *                   fixture NUMERIC_SEMANTIC_STATE_114.json. This module is the minimum EI-owned connection. It was
 *                   proven mechanical (class A) by exact byte reproduction of that frozen fixture on all 114 governed units.
 *   Affected Scope: this module only. ⛔ No frozen EI Direction or Numeric file is modified.
 *
 * What it does — transport, reshape and rename only:
 *   frozen_direction ← trace.final_direction (verbatim)
 *   pathways         ← trace.independent_pathways, keeping the pathways the frozen Direction runtime itself resolved with
 *                      force (resolution_status ≠ NO_FORCE); a NO_FORCE pathway is never counted as a mechanism by the
 *                      governed admission semantics (STMX_EI_NUMERIC_V1_FROZEN_BASELINE_R1/governance/REF_000616_BLOCKER_ANALYSIS.json)
 *   admitted         ← trace.observed_evidence (id · parameter · value · canonical_id)
 *   exposure         ← every observed exposure_opening evidence whose region is one of the frozen Numeric class constants
 *                      (CLASS_A_UPPER · CLASS_A_LOWER, read from the Numeric layer itself), linked to its own pathway, with the
 *                      realization mode read from the governed qualifier of the SAME record
 *                      (exposure_opening.realization_qualifiers[] · STMX_EI_EXPOSURE_REALIZATION_AUTHORITY_V1: a missing
 *                      qualifier is never inferred — absence is read as UNKNOWN)
 * ⛔ No force, direction, tier, threshold or rule is decided here. ⛔ No GT, no REF identity, no image, no fallback.
 */
const path = require('path');
const ISE = path.resolve(__dirname, '..', '..');
const NUMERIC = require(path.join(ISE, 'STMX_EI_NUMERIC_V1_FROZEN_BASELINE_R1', 'src', 'ei_numeric_layer_v1.js'));

const BRIDGE_ID = 'STMX_EI_DIRECTION_NUMERIC_BRIDGE_V1';
const UNKNOWN_MODE = NUMERIC.MODE.UNKNOWN;
const klassOf = (region) => (NUMERIC.CLASS_A_UPPER.includes(region) ? 'CLASS_A_UPPER' : NUMERIC.CLASS_A_LOWER.includes(region) ? 'CLASS_A_LOWER' : null);

/**
 * @param {object}   trace          a frozen EI Direction trace (run / runPair output), consumed read-only
 * @param {function} qualifiersFor  evidence → the realization_qualifiers[] of the record that evidence was observed on
 * @returns {{frozen_direction, exposure, pathways, admitted}}
 */
function buildNumericState(trace, qualifiersFor) {
  const pathways = (trace.independent_pathways || []).filter((p) => p.resolution_status !== 'NO_FORCE').map((p) => ({
    id: p.independent_pathway_id, dedup_group: p.dedup_group, resolution_status: p.resolution_status, force: p.force,
    members: (p.member_observations || []).slice(),
  }));
  const admitted = (trace.observed_evidence || []).map((e) => ({ id: e.evidence_id, parameter: e.source_parameter, value: e.source_value, canonical_id: e.canonical_id }));
  const exposure = [];
  for (const e of trace.observed_evidence || []) {
    if (e.source_parameter !== 'exposure_opening') continue;
    const klass = klassOf(e.source_value);
    if (!klass) continue;
    const p = pathways.find((x) => x.members.includes(e.evidence_id));
    const q = (qualifiersFor(e) || []).find((x) => x && x.region === e.source_value);
    exposure.push({ region: e.source_value, canonical_id: e.canonical_id, evidence_id: e.evidence_id, pathway_id: p ? p.id : null,
      resolution_status: p ? p.resolution_status : null, force: p ? p.force : null, klass, mode: q ? q.mode : UNKNOWN_MODE });
  }
  return { frozen_direction: trace.final_direction, exposure, pathways, admitted };
}

/** the governed qualifier list stored on one record (exposure_opening.realization_qualifiers[]) — read, never defaulted */
const qualifiersOf = (observations) => (((observations || {}).exposure_opening || {}).realization_qualifiers) || [];

module.exports = { BRIDGE_ID, buildNumericState, qualifiersOf };
