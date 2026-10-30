'use strict';
/**
 * STMX FULL-LOOK STYLE VISION — INTEGRATED EXTRACTOR CANDIDATE V1 · contracts / constants
 *
 * Successor of STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_4_CORRECTION_CANDIDATE (preserved; 0 bytes changed). This file is the V1.4 contract
 * with two changed identity lines (PACKET_VERSION · PREDECESSOR); every integrated-observation addition lives in src/integrated.js so that the
 * inherited domains stay byte-comparable. CEO 2026-10-13 implementation order; G53: offline only. The V1.4 header below is the lineage record.
 *
 * STMX FULL-LOOK STYLE VISION EXTRACTOR V1.4 — CORRECTION CANDIDATE · contracts / constants
 *
 * Successor of STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_3_COMPLETION_CANDIDATE (preserved; not modified).
 * V1.4 (CEO order 2026-10-11, TARGETED CORRECTION & OFFLINE REGRESSION): targeted corrections after the EX-02 live smoke test —
 *   P1 identity vs attribute visibility (prompt supplement 8d + regression tests; K-2 routing unchanged, it was correct),
 *   P2 integrated self-belt (one consolidated CDM-03 S1 / CDM-04 B instruction, 8e; serialization = the V1.3 own-device candidate, unchanged),
 *   P3 CDM-18 MULTI representation comparator (validation/cdm18_comparator_v1_4_candidate.js; sealed evaluator and reference untouched),
 *   P4 raw-JSON-only output instruction (8c) + strict native parser (transport/parse.js parseStrictNative) + in-workspace native checker.
 * No new parameter, enum, category or scoring. Reference v1_4 does NOT exist (this is a software candidate name only). G53: offline only.
 * The V1.3 header below is kept as the lineage record.
 *
 * V1.3 — COMPLETION CANDIDATE · contracts / constants
 *
 * Successor of STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_2_PHASE1_VALIDATION_CANDIDATE (sealed; not modified — 0 bytes changed).
 * V1.3 (CEO order 2026-10-11, IMPLEMENTATION COMPLETION & OFFLINE VALIDATION): transport conversion of real model responses (isolated,
 * CDM-15 pending), state-semantics hardening, CDM-03 S1 own-device securing carrier, CDM-05 B garment-only layer pairs, partial-colour
 * carrier, DM acquisition status + model-facing DM route (frozen adapter unchanged), TC product-evidence diagnostic view (no scoring),
 * offline CLI. The V1.2 header below is kept as the lineage record.
 *
 * V1.2 — Successor of STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_1_ACCESSORY_COVERAGE_CANDIDATE (sealed; not modified), itself the successor of V1.
 * V1.2 additions (Phase-1 live validation preparation, CEO 2026-10-07): shoulder_drop as the 26th requestable Item raw fact (D-1 / D-2);
 * product_context as component context metadata (D-3); participation stays routing (D-4); validation run records (D-5, run_record.js);
 * the live provider stays DISABLED (G53).
 * Status: PROTOTYPE / CANDIDATE ONLY. No name here is registered vocabulary.
 * Every VALUE DOMAIN is read from an existing governed surface, read-only:
 *   · Item Vision V1_3 producer rules (states, limitations, category / fact domains, applicability)
 *   · Colour V1 contract (families, lightness, effect, contrast, additional-colour carrier kinds — frozen raw provenance)
 *   · frozen Full-Look DM Vision (frame reason tokens; adapter in dm_adapter.js)
 * Nothing is written back to those surfaces. No network, no model, no API (G53).
 *
 * V1.1 additions (CEO 2026-10-07, decisions A–D of the accessory coverage finalization):
 *   A  non-garment families + `tie` + `gloves`; optional subtype by the D-2 rule; footwear D-2 product family
 *   B  accessory appearance applicability set (explicit; garment applicability NOT inherited); optional Style-local `carrier_part`
 *   C  UNKNOWN keeps category-independent facts; one physical object = one record (ownership.js)
 *   D  no accessory micro-schema (no lens / frame / sole / heel / size / shape field)
 */
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..') + path.sep;           // master root
const ITEM = require(path.join(ROOT, '01_ENGINES', 'ITEM_VISION_EXTRACTOR', 'STMX_VISION_PRODUCER_V1_3', 'producer_rules_v1.js'));
const COLOUR = require(path.join(ROOT, '01_ENGINES', 'ITEM_VISION_EXTRACTOR', 'run', 'color_recovery', 'color_contract_v1.js'));

const freeze = (o) => Object.freeze(o);

// ---- fact envelope states (Item V1_3 STATES) + request-return pseudo-state
const STATES = freeze(ITEM.STATES.slice());                                        // OBSERVED · ABSENT · NOT_VISIBLE · UNKNOWN
const NOT_APPLICABLE = 'NOT_APPLICABLE';                                           // request return only; never stored
// Item V1_3 readability limitations (producer_controller_v1.js)
const LIMITATIONS = freeze(['TERMINAL_REGION_CROPPED', 'FRAGMENTARY_VISIBILITY', 'OCCLUDED_BY_OTHER_GARMENT', 'CONTINUOUS_STRUCTURE_VISIBLE']);
// look-frame reasons: frozen DM `dm_evidence_visibility` reason tokens (IX-2). `small_detail_unresolvable` is DM-specific and NOT reused.
const FRAME_TOKENS = freeze(['crop', 'lower_body_cropped', 'feet_not_visible', 'occlusion', 'image_failure', 'not_a_worn_look']);
const ROUTES = freeze(['derived', 'observed']);
const SOURCES = freeze(['fixture', 'item_record']);                                // 'live' never exists under G53

// ---- identities
const GARMENT_CATEGORIES = freeze(ITEM.VALUE_DOMAINS.category.slice());            // T-Shirt … Jumpsuit
// A — approved broad non-garment families (CEO 2026-10-07). Broad Vision families, not retail terminology. `other` ≠ UNKNOWN (UNKNOWN is a state).
const NON_GARMENT_KINDS = freeze(['footwear', 'bag', 'headwear', 'scarf', 'jewellery', 'belt', 'eyewear', 'hosiery', 'tie', 'gloves', 'other']);
const ACCESSORY_FAMILIES = freeze(NON_GARMENT_KINDS.filter((k) => k !== 'other'));   // the 10 named families
// footwear D-2 (CEO principle, 2026-09-30): Level A product family (discussion examples; `other` = identifiable, outside the list) + Level B conditional subtype.
// Heel is NOT a family and has no field.
const FOOTWEAR_PRODUCT_FAMILIES = freeze(['shoe', 'sneaker', 'boot', 'sandal', 'other']);
const FOOTWEAR_PRODUCT_SUBTYPES = freeze({ sneaker: freeze(['running_sneaker', 'court_sneaker']), boot: freeze(['western_boot']) });   // demonstrated examples, open by the D-2 rule
// optional subtype metadata for the other families (D-2 rule: visually identifiable AND collapse loses reconstruction; never required; never scoring).
const OBJECT_SUBTYPES = freeze({
  bag: freeze(['handbag', 'shoulder_bag', 'crossbody', 'clutch', 'tote', 'backpack', 'belt_bag']),
  headwear: freeze(['hat', 'cap', 'beanie', 'hairband', 'hair_ornament']),
  scarf: freeze(['shawl', 'stole', 'neckerchief', 'bandana', 'handkerchief', 'pocket_square']),
  tie: freeze(['necktie', 'bow_tie']),
  jewellery: freeze(['necklace', 'chain', 'earrings', 'bracelet', 'ring', 'brooch', 'body_chain', 'anklet', 'watch']),
  belt: freeze(['chain_belt', 'sash', 'harness']),
  eyewear: freeze(['glasses', 'sunglasses']),
  hosiery: freeze(['socks', 'tights', 'stockings', 'leg_warmer']),
  gloves: freeze([]),
});
const SUBTYPE_FORBIDDEN_RE = /heel|formal|casual|classic|transform|express|detail|minimal|structur|relax|neutral|accent|statement/i;   // no heel family, no scoring semantics in a subtype
// Item `attachment` tokens that can describe a separately worn object attached to a garment (one physical object = one record; ownership.js)
const HOST_ATTACHMENT_TOKEN = freeze({ jewellery: 'Jewelry Attachment', belt: 'Belt' });
const ATTACHMENT_DOMAIN = freeze(ITEM.VALUE_DOMAINS.attachment.slice());

// ---- as-worn front state (C-1 candidate)
const FRONT_STATES = freeze(['fastened', 'partly_fastened', 'unfastened_worn_open', 'closed_by_other_means']);

// ---- SR realization domains (Item V1_3)
const UPPER_FIT_DOMAIN = freeze(ITEM.fitDomain('Coat').slice());                   // Slim · Regular · Relaxed · Oversized
const SHOULDER_DOMAIN = freeze(ITEM.VALUE_DOMAINS.shoulder_structure.slice());    // None · Mild · Strong · Extreme
const G6_DOMAIN = freeze(ITEM.VALUE_DOMAINS.fabric_behavior.slice());             // Structured · Semi-Structured · Semi-Fluid · Fluid  (IX-3R: used directly)
const G6_AMBIGUOUS_PAIR = freeze(['Semi-Structured', 'Semi-Fluid']);               // cannot be told apart → UNKNOWN (order §26)
const WAIST_DOMAIN = freeze(ITEM.VALUE_DOMAINS.waist_definition.slice());
const EXPOSURE_REGIONS = freeze(ITEM.VALUE_DOMAINS.exposure_opening.slice());      // 5 regions + 4 cut-out tokens (Item domain reused as-is)

// ---- colour (Colour V1)
const COLOUR_FAMILIES = freeze(COLOUR.FAMILIES.slice());
const COLOUR_LIGHTNESS = freeze(COLOUR.LIGHTNESS.slice());
const COLOUR_EFFECT = freeze(COLOUR.EFFECT.slice());
const CONTRAST = freeze(COLOUR.CONTRAST_WITH_BODY.slice());                        // Tonal · Subtle · Distinct
// Colour V1 additional-colour carrier kinds — FROZEN raw provenance, reused verbatim inside the optional Style-local `carrier_part`.
// G-1 `carrier_ref` (a Style component_ref) and Colour V1 `carrier_ref` (a part / owner token) are DIFFERENT architectural objects; never aliased.
const CARRIER_KINDS = freeze(COLOUR.CARRIER_KINDS.slice());

// ---- K-2 fact families (spec 08). The requestable pool is exactly these facts; nothing else can be requested.
const FACT_FAMILIES = freeze({
  tc_archetype_key: freeze(['grammar', 'trouser_distinction']),
  tc_silhouette: freeze(['silhouette', 'fit', 'shoulder_structure', 'asymmetry']),
  tc_proportion: freeze(['length', 'fit', 'sleeve_volume', 'shoulder_span']),
  tc_construction: freeze(['closure_type', 'front_opening_extent', 'collar', 'sleeve', 'shoulder_connection', 'pocket', 'pocket_construction', 'pocket_projection', 'attachment', 'material', 'surface', 'waist_definition', 'slit']),
  ei_appearance: freeze(['pattern', 'graphic', 'surface', 'material', 'decorative_detail', 'attachment']),
  sr_own_waist: freeze(['waist_definition']),
  // V1.2 (D-1 / D-2, CEO 2026-10-07): physical shoulder facts of the governing upper as INDEPENDENT upstream raw observations.
  // shoulder_drop (None · Dropped) and shoulder_structure are never inferred from one another, and neither maps automatically onto the
  // final shoulder realization (sr_realization.js reads shoulder_structure only when lossless; it never reads shoulder_drop).
  sr_upper_shoulder: freeze(['shoulder_structure', 'shoulder_drop']),
});
const TC_BATCHES = freeze(['tc_silhouette', 'tc_proportion', 'tc_construction']);
const REQUESTABLE_FACTS = freeze([...new Set(Object.values(FACT_FAMILIES).flat())]);   // 26 = the corrected inventory's Item raw-fact reuse set (SVP-101…126); category / exposure_opening / fabric_behavior are NOT requestable (folded)
const PRODUCT_CONTEXT_DOMAIN = freeze(ITEM.PRODUCT_CONTEXT.slice());                   // D-3: governed Item category.product_context — component CONTEXT METADATA, never a parameter, never requestable
const UNIVERSAL_FACTS = freeze([...ITEM.applicableSet('__none__')]);               // Item facts every garment category carries (garment use only in V1.1)
// B — explicit accessory applicability (REUSE VISUAL VALUE DOMAIN ≠ REUSE GARMENT PARAMETER APPLICABILITY).
// pocket · asymmetry · exposure_opening and every garment archetype fact are NOT accessory facts.
const ACCESSORY_APPEARANCE_FACTS = freeze(['pattern', 'graphic', 'surface', 'material', 'decorative_detail', 'attachment']);

// ---- V1.3 COMPLETION CANDIDATE — isolated candidate carriers (CEO 2026-10-11 order; none is registered vocabulary)
//   Each carrier is tied to the exact authority that governs its semantics and the exact approval that its SERIALIZATION still needs.
//   The extractor uses them only where the approved semantics already require the observation to be representable.
const CANDIDATE_CARRIERS = freeze({
  own_device_securing: freeze({ where: 'relations.securing_relations[].device_is_own = true (securing_ref = affected_ref)', semantics: 'CDM-03 S1 (CEO 2026-10-10, approved): a garment\'s own self-belt is an integrated device; actual securing constriction is separately observed; one physical cause is counted once', approval_needed: 'CDM-03 serialization / schema (the register states: no schema implementation was approved)' }),
  securing_region_raw: freeze({ where: 'relations.securing_relations[].affected_region (verbatim observed token; no enum enforced)', semantics: 'CDM-04 B (approved): affected region ≠ affected component; do not force the region into an unrelated token domain', approval_needed: 'CDM-04 securing-region canonical vocabulary (CD-F298-11)' }),
  partial_colour: freeze({ where: 'colour_composition.partial[]', semantics: 'Colour V1 tuple = family + lightness + effect; a family read without a settled lightness / effect is NOT completed by the converter (no invented value)', approval_needed: 'partial-colour representation contract (D-2 / CDM-16 family)' }),
  dm_acquisition: freeze({ where: 'packet.dm_acquisition { status, reason }', semantics: 'frozen Full-Look DM Vision has no "not acquired" token (visibility reasons are crop · occlusion · image_failure · not_a_worn_look); a packet must still say whether a DM block was acquired at all', approval_needed: 'status token registration (DM Vision vocabulary is frozen; this block sits OUTSIDE dm_subsystem and never alters it)' }),
  transport_conversion: freeze({ where: 'src/transport/*', semantics: 'model response → canonical case: structure only, provenance-logged, nothing invented', approval_needed: 'CDM-15 structured-output / transport schema enforcement' }),
});
const DM_ACQUISITION_STATUSES = freeze(['ACQUIRED_FROZEN_BLOCK', 'NOT_ACQUIRED']);
const DM_NOT_ACQUIRED_REASONS = freeze(['PROMPT_V1_2_HAS_NO_DM_SECTION', 'FIXTURE_HAS_NO_DM_BLOCK', 'NOT_REQUESTED', 'DM_BLOCK_REJECTED_BY_FROZEN_ADAPTER']);
const PARTIAL_COLOUR_UNRESOLVED = freeze(['color_lightness', 'color_effect', 'contrast_with_field']);
const SECURING_REGION_REFERENCE_DOMAIN = freeze(EXPOSURE_REGIONS.slice(0, 5));      // informational: the 5 body regions reference v1_3 uses; NOT enforced (CDM-04 B)

// ---- guards
const VERDICT_KEY_RE = /(score|verdict|direction|style_id|styleid|tier|strength|ordinal|balanced)/i;        // forbidden packet keys
const JUDGMENT_VALUE_RE = /\b(expressive|detailed|minimal|qualifying|statement|classic|transformative|balanced|accent|conventional)\b/i; // forbidden in Style evidence (frozen DM block excluded)
const ITEM_OUTPUT_KEY_RE = /(score|direction|strength|ordinal|tier|verdict|ei_|tc_|sr_|dm_)/i;                 // Item engine output never admitted as a record fact

function applicableFacts(category) { return ITEM.applicableSet(category); }

module.exports = freeze({
  ROOT, STATES, NOT_APPLICABLE, LIMITATIONS, FRAME_TOKENS, ROUTES, SOURCES,
  GARMENT_CATEGORIES, NON_GARMENT_KINDS, ACCESSORY_FAMILIES, FOOTWEAR_PRODUCT_FAMILIES, FOOTWEAR_PRODUCT_SUBTYPES, OBJECT_SUBTYPES, SUBTYPE_FORBIDDEN_RE,
  HOST_ATTACHMENT_TOKEN, ATTACHMENT_DOMAIN, FRONT_STATES,
  UPPER_FIT_DOMAIN, SHOULDER_DOMAIN, G6_DOMAIN, G6_AMBIGUOUS_PAIR, WAIST_DOMAIN, EXPOSURE_REGIONS,
  COLOUR_FAMILIES, COLOUR_LIGHTNESS, COLOUR_EFFECT, CONTRAST, CARRIER_KINDS,
  FACT_FAMILIES, TC_BATCHES, REQUESTABLE_FACTS, UNIVERSAL_FACTS, ACCESSORY_APPEARANCE_FACTS, PRODUCT_CONTEXT_DOMAIN,
  VERDICT_KEY_RE, JUDGMENT_VALUE_RE, ITEM_OUTPUT_KEY_RE,
  CANDIDATE_CARRIERS, DM_ACQUISITION_STATUSES, DM_NOT_ACQUIRED_REASONS, PARTIAL_COLOUR_UNRESOLVED, SECURING_REGION_REFERENCE_DOMAIN,
  ITEM,                                                                              // read-only handle (domains for the transport converter / TC evidence view)
  applicableFacts,
  PACKET_CONTRACT: 'STMX_FULL_LOOK_STYLE_VISION_EVIDENCE_PACKET',
  PACKET_VERSION: 'V1_RC4',                                                                  // RELEASE CANDIDATE RC4 (DM Evidence Transport V2; successor of RC3; see src/integrated.js)
  PREDECESSOR: 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC5',            // RC6: candidate predecessor RC5; PACKET_VERSION unchanged            // RC5: candidate predecessor RC4; PACKET_VERSION deliberately unchanged (no packet field changed)
  INVENTORY_VERSION: 'canonical_style_vision_parameter_inventory_candidate_v1_1',          // 38 = 12 Style-owned + 26 Item reuse (CEO 2026-10-07)
});
