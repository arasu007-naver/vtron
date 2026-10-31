'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3 — FROZEN / GOVERNED VOCABULARIES (consumed, never extended).
 * Carried unchanged from V1 / V2 (every carrier set, cause set and channel set is identical):
 *   whole_garment_reading · statement_relation   Transformative process-trace carrier semantic freeze V1 (CEO 2026-09-23)
 *   realization_relation · identity_participation Classic relational carrier semantic freeze V1 (CEO 2026-09-23)
 *   unresolved causes                            V2.3.41 19_ evidence-gap classification contract (as sealed in V2.3.42)
 *   CONSTITUTIVE_SYSTEM_STATUS                   process-trace detail (V2.3.50 T-OBS-4 · V2.3.51 §17) — not a carrier, not a score
 * REMOVED versus V2: READ_ORGANISER / READ_ORGANISER_STATES (R1 is not an input of V3).
 * Consumed from the sealed V2.3.53 lane derivation specification (prototypes/lane_derivation_specifications.json · 333edd1e…), verbatim:
 *   PROMINENCE_SYSTEMS        BODY_FORM · CONSTRUCTION · MATERIAL_SURFACE · DECORATION        (prominence_predicate keys)
 *   PROMINENCE_VALUES         PROMINENT · NOT_PROMINENT · UNKNOWN   (NOT_PROMINENT is the string encoding of the spec's "¬PROMINENT")
 *   CLASSIC_RELATION          MOST_PROMINENT · ANOTHER_SYSTEM_MORE_PROMINENT · UNDETERMINED  (classic_organising_role.relation)
 *   TRANSFORMATIVE_RELATION   MOST_PROMINENT · NOT · UNDETERMINED                            (transformative_organising_reading.relation)
 * These are DERIVED relations inside the runtime, never Vision observations, never numbers, never tiers.
 */
const WHOLE_GARMENT_READING = Object.freeze(['BASE_GRAMMAR_PRINCIPAL', 'INTERVENTION_PRINCIPAL', 'UNRESOLVED']);
const STATEMENT_RELATION = Object.freeze(['COORDINATED', 'UNRELATED', 'UNRESOLVED', 'NOT_APPLICABLE']);
const REALIZATION_RELATION = Object.freeze(['CHARACTERISTIC', 'WITHIN_RANGE', 'INTENSIFIED', 'ATTENUATED', 'UNRESOLVED']);
const IDENTITY_PARTICIPATION = Object.freeze(['MATERIAL', 'INCIDENTAL', 'UNRESOLVED']);
const UNRESOLVED_CAUSE = Object.freeze(['SEMANTIC_AUTHORITY_GAP', 'REFERENCE_CONTENT_GAP', 'ITEM_OBSERVATION_RESOLUTION_GAP', 'RELATIONAL_EVIDENCE_GAP', 'GOVERNED_SCOPE_BOUNDARY']);
const CHANNELS = Object.freeze(['silhouette', 'proportion', 'construction']);
const CONSTITUTIVE_SYSTEM_STATUS = Object.freeze(['RETAINED', 'SUBORDINATED', 'DISPLACED', 'UNRESOLVED']);

const PROMINENCE_SYSTEMS = Object.freeze(['BODY_FORM', 'CONSTRUCTION', 'MATERIAL_SURFACE', 'DECORATION']);
const PROMINENCE_VALUES = Object.freeze(['PROMINENT', 'NOT_PROMINENT', 'UNKNOWN']);
const CLASSIC_RELATION = Object.freeze(['MOST_PROMINENT', 'ANOTHER_SYSTEM_MORE_PROMINENT', 'UNDETERMINED']);
const TRANSFORMATIVE_RELATION = Object.freeze(['MOST_PROMINENT', 'NOT', 'UNDETERMINED']);

module.exports = {
  WHOLE_GARMENT_READING, STATEMENT_RELATION, REALIZATION_RELATION, IDENTITY_PARTICIPATION, UNRESOLVED_CAUSE, CHANNELS, CONSTITUTIVE_SYSTEM_STATUS,
  PROMINENCE_SYSTEMS, PROMINENCE_VALUES, CLASSIC_RELATION, TRANSFORMATIVE_RELATION,
};
