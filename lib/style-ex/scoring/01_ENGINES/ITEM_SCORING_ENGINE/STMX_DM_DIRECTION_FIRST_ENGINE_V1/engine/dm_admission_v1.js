'use strict';
/**
 * STMX DM DIRECTION-FIRST ENGINE — ADMISSION V1
 *
 * Approval Anchor
 *   CEO Decision:   2026-09-10
 *   Order:          STMX DM DIRECTION-FIRST CLOSURE + ENGINE IMPLEMENTATION V1 §19 / §28
 *   Reason:         The Direction-First execution order makes Direction the primary runtime
 *                   authority. This module is the entry stage: it reads a GOVERNED DM
 *                   observation block and hands the resolvers admitted evidence in a form that
 *                   distinguishes "the record establishes X" from "the record leaves X open".
 *   Affected Scope: STMX_DM_DIRECTION_FIRST_ENGINE_V1/engine only.
 *
 * ⛔ THIS MODULE DOES NOT ADMIT ANYTHING ITSELF. Evidence Admission is a frozen OBSERVATION
 *    decision owned by STMX_DM_CURRENT_OBSERVATION_CONTRACT §1 and performed by the Vision
 *    layer. This module only reads what the observation layer already admitted. It never
 *    re-adjudicates admission, never re-reads an image and never invents evidence.
 * ⛔ NO NUMBERS. There is no integer anywhere in this file. Primitive values are compared by
 *    SET MEMBERSHIP against the frozen value domains — never by mapping small/medium/large to
 *    1/2/3, never summed, averaged, weighted or thresholded (order §23).
 * ⛔ NO REF LOOKUP, NO GT LOOKUP, NO IMAGE-NAME RULE, NO CATEGORY COEFFICIENT (order §12).
 */

/** Frozen value domains — verbatim from STMX_DM_CURRENT_OBSERVATION_CONTRACT §2.
 *  ⛔ Not extended, not reordered, not re-valued. `none`/`zero` are illegal by contract. */
const RELATIVE_SIZE = ['small', 'medium', 'large'];
const CONTRAST = ['low', 'medium', 'high'];
const SPATIAL_POSITION = ['localized', 'distributed', 'whole_garment'];

/** Frozen primitive states of the DM observation layer. ⛔ ABSENT is illegal on a DM primitive. */
const OBSERVED = 'OBSERVED';

/**
 * A READING is the set of domain values the record leaves open for one primitive.
 *   · a governed production observation is always a SINGLETON  ({state:OBSERVED, value:'large'})
 *   · NOT_VISIBLE / UNKNOWN / missing / malformed → UNRESOLVED (empty set)
 *   · a frozen paper record that wrote a RANGE ("medium~large") is carried as the CONTIGUOUS
 *     SUBSET it names. ★ That is an honest transcription of an uncertainty, not a value choice.
 *     ⛔ The production observation layer never emits a range — this shape exists so the frozen
 *     GT record can be replayed WITHOUT silently picking one end of a range it never fixed.
 */
function reading(raw, domain) {
  if (!raw || typeof raw !== 'object') return { resolved: false, values: [], why: 'missing or malformed' };
  if (raw.state !== OBSERVED) return { resolved: false, values: [], why: 'state=' + raw.state };

  // singleton — the production shape
  if (typeof raw.value === 'string' && raw.value) {
    if (!domain.includes(raw.value)) return { resolved: false, values: [], why: 'value "' + raw.value + '" outside frozen domain' };
    return { resolved: true, values: [raw.value], why: null };
  }
  // recorded range — frozen paper record only
  if (typeof raw.min === 'string' && typeof raw.max === 'string') {
    const a = domain.indexOf(raw.min), b = domain.indexOf(raw.max);
    if (a < 0 || b < 0 || b < a) return { resolved: false, values: [], why: 'range outside frozen domain' };
    return { resolved: true, values: domain.slice(a, b + 1), why: null, recorded_range: true };
  }
  return { resolved: false, values: [], why: 'no value' };
}

/** THE RECORD ESTABLISHES the primitive is one of `allowed` — true only when EVERY value the
 *  record leaves open is in `allowed`. An unresolved reading establishes nothing. */
function establishes(r, allowed) {
  return !!(r && r.resolved && r.values.length > 0 && r.values.every(v => allowed.includes(v)));
}
/** THE RECORD ALLOWS the primitive to be one of `allowed` — used only to detect UNDECIDABILITY,
 *  never to assert a fact. ⛔ A predicate is never satisfied by `allows` alone. */
function allows(r, allowed) {
  return !!(r && r.resolved && r.values.some(v => allowed.includes(v)));
}

/** Read one admitted evidence into the shape the resolvers consume.
 *  ⛔ `evidence_family` is carried for PROVENANCE ONLY. The Direction and Strength resolvers
 *     must never branch on it — descriptor identity is NON-SCORING (Observation Contract §10).
 *     The single legal consumer of the family is the frozen M1 predicate's own eligibility test,
 *     which is frozen CEO authority and lives in its own module. */
function readEvidence(ev) {
  const size = reading(ev && ev.relative_size, RELATIVE_SIZE);
  const contrast = reading(ev && ev.contrast, CONTRAST);
  const spatial = reading(ev && ev.spatial_position, SPATIAL_POSITION);
  return {
    evidence_id: (ev && ev.evidence_id) || null,
    evidence_family: (ev && ev.evidence_family) || null,   // ⛔ provenance only
    size, contrast, spatial,
    raw: ev,
    fully_resolved: size.resolved && contrast.resolved && spatial.resolved,
  };
}

/**
 * Admit a governed DM observation block for engine consumption.
 * @returns {{ok:boolean, reason:string|null, block_present:boolean, evidence:Array, empty:boolean}}
 *
 * ★ A MISSING block is NOT "no designed detail" — it is "we do not know whether DM observation
 *   happened", and the engine must fail closed rather than read it as a plain garment. This is
 *   the same rule the Producer requiredness gate enforces one layer up.
 */
function admit(dmBlock) {
  if (dmBlock === undefined || dmBlock === null)
    return { ok: false, reason: 'DM_OBSERVATION_BLOCK_ABSENT', block_present: false, evidence: [], empty: false };
  if (typeof dmBlock !== 'object' || Array.isArray(dmBlock))
    return { ok: false, reason: 'DM_OBSERVATION_BLOCK_MALFORMED', block_present: true, evidence: [], empty: false };

  /* ★ SELF-FOUND DEFECT, CORRECTED 2026-09-10 — recorded in deliverable 12 §C-E1.
   *   This gate first REQUIRED axis_target === 'DM' and evaluation_unit === 'whole_garment',
   *   copied out of the frozen PAPER schema (Observation Contract §11). The bound Producer
   *   contract STMX_VISION_PRODUCER_V1_2 does not emit those two fields — a governed
   *   dm_designed_detail_evidence block is { evidence, excluded } — so the engine rejected
   *   every real Vision observation while passing every fixture I had written, because the
   *   fixtures had been shaped to my own gate instead of to Producer output.
   *   ⛔ The lesson from the two preceding orders, hit again: a fixture written by the same
   *      author in the same pass as the code is a consistency check, not a verification. The
   *      live replay is what caught it.
   *   The fields are now OPTIONAL — absent is legal because the contract does not emit them —
   *   but a PRESENT value is still checked, so a genuinely mis-targeted block cannot slip past. */
  if (dmBlock.axis_target !== undefined && dmBlock.axis_target !== 'DM')
    return { ok: false, reason: 'DM_AXIS_TARGET_INVALID', block_present: true, evidence: [], empty: false };
  if (dmBlock.evaluation_unit !== undefined && dmBlock.evaluation_unit !== 'whole_garment')
    return { ok: false, reason: 'DM_EVALUATION_UNIT_INVALID', block_present: true, evidence: [], empty: false };

  if (!Array.isArray(dmBlock.evidence))
    return { ok: false, reason: 'DM_EVIDENCE_NOT_ARRAY', block_present: true, evidence: [], empty: false };

  const evidence = dmBlock.evidence.map(readEvidence);
  return {
    ok: true, reason: null, block_present: true, evidence,
    /** ★ evidence[] === [] is a POSITIVE observation: nothing designed was admitted.
     *  ⛔ It is never a placeholder and never equivalent to a missing block. */
    empty: evidence.length === 0,
  };
}

module.exports = {
  admit, readEvidence, reading, establishes, allows,
  RELATIVE_SIZE, CONTRAST, SPATIAL_POSITION, OBSERVED,
};
