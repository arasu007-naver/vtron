'use strict';
/**
 * STMX FULL-LOOK STYLE VISION — INTEGRATED EXTRACTOR CANDIDATE V1 · integrated-observation contract additions.
 *
 * Successor of STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_4_CORRECTION_CANDIDATE (preserved; 0 bytes changed). Everything the V1.4 contract
 * already carries (Item V1_3 domains · Colour V1 · frozen DM adapter · K-2 pool · candidate carriers) is reused through ./contracts.js.
 * This file adds ONLY what the integrated architecture (CEO 2026-10-13: INT-01 shoulder · INT-02 DMP-3 · INT-03 slit · no DM-only
 * re-reading · CA#29 pockets[] reuse) needs, and every addition names its authority. No new vocabulary: every token below is either an
 * existing Item V1_3 / Colour V1 / frozen-DM token or a document label (group ids · diagnostic codes) that never appears as an
 * observation value.
 *
 *   OBSERVATION GROUPS   G1 frame + registry + common visibility · G2 component appearance · G3 garment construction (SH shoulder ·
 *                        FR front · PK pocket bundles) · G4 final worn realization + look relations · A1 frozen-DM output assembly
 *                        (no reading). Groups are LOGICAL reading units inside ONE model pass — never four calls (order §3, §10).
 *   POCKET (CA#29)       pocket = Present → `pockets[]` is the sole morphology carrier (instances mirror the frozen Item producer shape:
 *                        { location ∈ POCKET_INSTANCE_LOCATIONS, construction {state,value}, projection {state,value} }). The scalar
 *                        pocket_construction / pocket_projection facts keep their parameter identity (SVP-117 / 118) but are NEVER stored
 *                        in the pool when a pocket is Present (NESTED). A Present pocket without instances is a contract failure.
 *   SHOULDER (INT-01)    shoulder_structure · shoulder_drop · shoulder_span · shoulder_connection (garment) + upper.shoulder (look) are
 *                        read in one shoulder bundle; the pool tags the facts G3.SH; nothing is derived between them (CA#15 D-2).
 *   SLIT (INT-03)        Skirt · Dress only (Item applicability); Present only when a structural slit is clearly visible; None only with
 *                        sufficient absence evidence; otherwise NOT_VISIBLE / UNKNOWN. No consumer may read a non-OBSERVED slit as None.
 *   CONDITIONAL TRIGGERS frozen Item V1_3 CONDITIONAL_TRIGGER reused on the consumption side: sleeve_volume (sleeve ≠ Sleeveless) ·
 *                        closure_type on tops / Dress / Jumpsuit (front_opening_extent ≠ None) · waist_definition (Two-Gate: category +
 *                        length not Cropped / Waist Length) · pocket_construction / pocket_projection (nested). N/A ≠ UNKNOWN.
 *   DMP-3 (INT-02)       common visibility → frozen dm_evidence_visibility ONLY where the mapping is deterministic. RC1 (IR-3 validation,
 *                        P-4 "CEO re-approval not required"): the common record = G1 frame limits + the per-fact states of the G2 appearance
 *                        reading (architecture V2 G1 row "공통 Visibility · Readability = 프레임 한계 + 판독하는 자리의 사실별 상태"). A look-level
 *                        value is emitted only from POSITIVE evidence for every one of the eight frozen limit reasons (DM_READABILITY rule
 *                        below); otherwise MAPPING_UNRESOLVED (the frozen DM block is withheld, never defaulted). No DM-only parameter exists.
 */
const C = require('./contracts');
const ITEM = C.ITEM;
const freeze = (o) => Object.freeze(o);

const CANDIDATE_NAME = 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC6';   // RC6 (2026-10-17 Scoring-Impact-First correction: Colour V1 L89 stitching suppression on the model-output path); packet contract unchanged (V1_RC4). Earlier:    // RC5 (2026-10-16 EX-04 Defect Correction: D-EX04-1 colour part normalisation · D-EX04-2 footwear subtype key · local failure isolation); packet contract unchanged (V1_RC4). Earlier:    // RC4 (2026-10-15 Final Observable Evidence Delivery Correction — DM Evidence Transport V2): successor of RC3 (preserved, sealed)
const PACKET_VERSION = 'V1_RC4';
const PREDECESSOR = 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC5';   // RC6: predecessor RC5 (preserved, sealed SEAL-FLV-RC5-2026-10-16). Earlier RC4   // RC5: predecessor RC4 (preserved, sealed SEAL-FLV-RC4-2026-10-15)
const ARCHITECTURE_SOURCE = '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_VISION_INTEGRATED_OBSERVATION_CEO_FINAL_DECISION_UPDATE_V1 (Architecture Candidate V2.1; crosswalk V2.1)';

// ---- observation groups (document labels; never observation values)
const GROUPS = freeze(['G1', 'G2', 'G3', 'G3.SH', 'G3.FR', 'G3.PK', 'G4', 'A1']);
const GROUP_OF_FACT = freeze({
  grammar: 'G3', trouser_distinction: 'G3', silhouette: 'G3', fit: 'G3', asymmetry: 'G3', length: 'G3', sleeve: 'G3', sleeve_volume: 'G3', collar: 'G3', waist_definition: 'G3', slit: 'G3',
  shoulder_structure: 'G3.SH', shoulder_drop: 'G3.SH', shoulder_span: 'G3.SH', shoulder_connection: 'G3.SH',
  closure_type: 'G3.FR', front_opening_extent: 'G3.FR',
  pocket: 'G3.PK', pocket_construction: 'G3.PK', pocket_projection: 'G3.PK',
  pattern: 'G2', graphic: 'G2', surface: 'G2', material: 'G2', decorative_detail: 'G2', attachment: 'G2',
});
const GROUP_OF_PACKET_BLOCK = freeze({ look_frame: 'G1', component_registry: 'G1', common_visibility: 'G1', colour_composition: 'G2', upper_realization: 'G4', 'upper_realization.shoulder': 'G3.SH→G4', relations: 'G4', canonical_exposure: 'G4', dm_evidence: 'G2+G4 (systems) · A1 (look_components · dm_evidence_visibility)' });
const SHOULDER_BUNDLE_FACTS = freeze(['shoulder_structure', 'shoulder_drop', 'shoulder_span', 'shoulder_connection']);   // + upper.shoulder (SVP-008) from the same reading

// ---- pocket instance carrier (CA#29; shape mirrors the frozen Item producer validator)
const POCKET_INSTANCE_LOCATIONS = freeze(ITEM.POCKET_INSTANCE_LOCATIONS.slice());         // Chest · Lower Front · Sleeve · Leg
const POCKET_SCALAR_MORPHOLOGY = freeze(ITEM.POCKET_SCALAR_MORPHOLOGY.slice());           // pocket_construction · pocket_projection (retired as emission; identity kept)
const POCKET_INSTANCE_CHILD_DOMAIN = freeze({ construction: freeze(ITEM.VALUE_DOMAINS.pocket_construction.slice()), projection: freeze(ITEM.VALUE_DOMAINS.pocket_projection.slice()) });
const NESTED_FACTS = freeze({ pocket_construction: 'pocket.pockets[].construction', pocket_projection: 'pocket.pockets[].projection' });

// ---- conditional triggers reused from frozen Item V1_3 (consumption side; the frozen Producer applies the same gates on emission)
const WAIST_GATE1_CATEGORIES = freeze(['Jacket', 'Coat', 'Dress', 'Jumpsuit']);          // frozen §5 Gate 1 (sr_input_adapter_v1.js WAIST_GATE1)
const WAIST_SHORT_LENGTHS = freeze(['Cropped', 'Waist Length']);                           // frozen §5.5 Gate 2 (from the Jacket length domain; no new vocabulary)
const CLOSURE_CONDITIONAL_CATEGORIES = freeze(ITEM.VALUE_DOMAINS.category.filter((c) => (ITEM.CONDITIONAL[c] || []).includes('closure_type')));   // tops · Dress · Jumpsuit (Jacket / Coat mandatory)
const CONDITIONAL_GATES = freeze({
  sleeve_volume: freeze({ parent: 'sleeve', rule: 'N/A when sleeve OBSERVED = Sleeveless (frozen CONDITIONAL_TRIGGER.sleeve_volume)', na_when: (p) => p && p.state === 'OBSERVED' && p.value === 'Sleeveless', categories: null }),
  closure_type: freeze({ parent: 'front_opening_extent', rule: 'N/A when front_opening_extent OBSERVED = None on tops / Dress / Jumpsuit (frozen CONDITIONAL_TRIGGER.closure_type); mandatory on Jacket / Coat', na_when: (p) => p && p.state === 'OBSERVED' && p.value === 'None', categories: CLOSURE_CONDITIONAL_CATEGORIES }),
  waist_definition: freeze({ parent: 'length', rule: 'Two-Gate: Gate 1 category ∈ Jacket · Coat · Dress · Jumpsuit (Item applicability) · Gate 2 N/A when length OBSERVED ∈ Cropped · Waist Length (frozen §5)', na_when: (p) => p && p.state === 'OBSERVED' && WAIST_SHORT_LENGTHS.includes(p.value), categories: WAIST_GATE1_CATEGORIES }),
});
const SLIT_CATEGORIES = freeze(ITEM.VALUE_DOMAINS.category.filter((c) => ITEM.applicableSet(c).has('slit')));   // Skirt · Dress

// ---- DMP-3 (INT-02): deterministic subset of common visibility → frozen dm_evidence_visibility
//   Frozen grammar (VP-DM4-C1): adjudicable | partially_observable:{feet_not_visible|lower_body_cropped|small_detail_unresolvable|occlusion}
//                              | not_adjudicable:{crop|occlusion|image_failure|not_a_worn_look}
//   Style frame tokens (IX-2): crop · lower_body_cropped · feet_not_visible · occlusion · image_failure · not_a_worn_look
const DM_VISIBILITY_TOKEN_CLASS = freeze({ image_failure: 'not_adjudicable', not_a_worn_look: 'not_adjudicable', crop: 'not_adjudicable', lower_body_cropped: 'partially_observable', feet_not_visible: 'partially_observable', occlusion: 'AMBIGUOUS' });
const DM_VISIBILITY_GAPS = freeze({   // RC2 (look-level record only; value-level states stay value-level — frozen §10)
  AVG_1: 'occlusion appears in both frozen classes (partially_observable and not_adjudicable); the G1 record carries no degree → not converted (CEO decision)',
  AVG_2: 'RESOLVED: a value hidden by the own-look layering is a value-level state, never a look-level limit; RC2 reads no per-fact state at all for DMP-3',
  AVG_3: 'RESOLVED as a vocabulary question (see D_1): RC2 never converts value-level UNKNOWN / NOT_VISIBLE into a look-level reason',
  AVG_4: 'absence of a G1 limit never yields adjudicable by itself (see D_1)',
  D_1: 'OBSERVED G1 record with no limit: the frozen enum offers adjudicable and partially_observable:{small_detail_unresolvable}; the SVP-001 limit vocabulary cannot record small_detail_unresolvable, so the common record cannot tell them apart → DMP-3 not established, never defaulted. RC4 (DM Evidence Transport V2, CEO 2026-10-15): dm_evidence_visibility { state: UNKNOWN } and the observed systems are delivered (the old D-1 option choice is superseded for transport)',
});
// Readability evidence set (AVG-3): the G2 appearance facts that carry small designed detail (frozen DM families A · B · D · E · G read from pattern · graphic ·
// surface · decorative_detail · attachment). material is NOT in the set: material identity is never DM evidence (frozen §7 principle · §8 surface / material).
// RC2: the RC1 readability set / layering rule moved to src/candidate_proofs/dmp3_d1_proof.js (non-canonical; not used by production code)
const DM_REASON_ORDER = freeze({ partially_observable: freeze(['feet_not_visible', 'lower_body_cropped', 'small_detail_unresolvable', 'occlusion']), not_adjudicable: freeze(['crop', 'occlusion', 'image_failure', 'not_a_worn_look']) });   // frozen VP-DM4-C1 order
const INTEGRATED_FACT_FAMILIES = freeze({});                                                 // RC2: the RC1 dm_readability request family is withdrawn          // request family label for the A1 readability read (cache reuse of the G2 observation; no new fact)
const DM_WITHHELD_REASON = 'DM_VISIBILITY_MAPPING_UNRESOLVED';                               // candidate diagnostic token (outside the frozen block; never a frozen enum)

// ---- integrated candidate carriers (in addition to contracts.CANDIDATE_CARRIERS)
const INTEGRATED_CANDIDATE_CARRIERS = freeze({
  pocket_instances: freeze({ where: 'component_fact_pool[pocket].pockets[] (+ transport facts.<ref>.pocket = { value, pockets })', semantics: 'CA#29 (frozen Item V1_3, 2026-08-19): pockets[] is the sole canonical morphology carrier when pocket = Present; instance = one observable pocket group with its morphology; readability inside the instance via NOT_VISIBLE / UNKNOWN + null', approval_needed: 'none for the semantics (frozen); the Full-Look packet slot itself is the GAP-4 implementation this candidate provides (CDM-15 structured-schema governance pending)' }),
  observation_group_trace: freeze({ where: 'component_fact_pool[].observation_group · request_trace.observation_groups', semantics: 'provenance of WHICH logical reading produced a fact (G1…G4 / bundles); labels only, never values', approval_needed: 'none (provenance); the four-group structure is Architecture Candidate V2.1' }),
  dm_block_withheld_rc3_only: freeze({ where: '(RC1–RC3 only; NOT emitted by RC4) packet.dm_block_withheld { look_components, look_detail_systems, dm_evidence_visibility: null, withheld_reason, diagnostics }', semantics: 'INT-02: the frozen DM block is delivered only when dm_evidence_visibility maps deterministically from common visibility; otherwise the assembled components + systems are preserved here (not discarded, not validated as frozen, never defaulted to adjudicable)', approval_needed: 'DMP-3 adapter validation (IR-3 / BL-FLV-23): a resolution of AVG-1…4 within frozen vocabulary' }),
  dm_evidence_transport_v2: freeze({ where: 'packet.dm_evidence { transport_contract, look_components, look_detail_systems, dm_evidence_visibility { state, value? } } + packet.dm_transport { authority, output_fingerprint }', semantics: 'CEO 2026-10-15 scoped successor (CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md): observed DMP-1 / DMP-2 delivered whether or not DMP-3 is established; observed-only list ([] = none observed, never a verified negative)', approval_needed: 'none for transport (CEO-approved); Canonical Dictionary registration of the interface identifiers is an open CEO item' }),
  dm_components_assembled: freeze({ where: 'dm_evidence.look_components (assembled, A1; RC1–RC3: dm_subsystem.look_components)', semantics: 'DMP-1 = ∪ look_detail_systems[].carrier_refs + registry lineage (frozen adapter A-1 / A-2 hold by construction); no DM component detection; a model-emitted look_components is dropped and compared', approval_needed: 'none for the frozen semantics; assembly method = Architecture Candidate' }),
});

module.exports = freeze({ CANDIDATE_NAME, PACKET_VERSION, PREDECESSOR, ARCHITECTURE_SOURCE, GROUPS, GROUP_OF_FACT, GROUP_OF_PACKET_BLOCK, SHOULDER_BUNDLE_FACTS,
  POCKET_INSTANCE_LOCATIONS, POCKET_SCALAR_MORPHOLOGY, POCKET_INSTANCE_CHILD_DOMAIN, NESTED_FACTS,
  WAIST_GATE1_CATEGORIES, WAIST_SHORT_LENGTHS, CLOSURE_CONDITIONAL_CATEGORIES, CONDITIONAL_GATES, SLIT_CATEGORIES,
  DM_VISIBILITY_TOKEN_CLASS, DM_VISIBILITY_GAPS, DM_WITHHELD_REASON, INTEGRATED_CANDIDATE_CARRIERS,
  DM_REASON_ORDER, INTEGRATED_FACT_FAMILIES });
