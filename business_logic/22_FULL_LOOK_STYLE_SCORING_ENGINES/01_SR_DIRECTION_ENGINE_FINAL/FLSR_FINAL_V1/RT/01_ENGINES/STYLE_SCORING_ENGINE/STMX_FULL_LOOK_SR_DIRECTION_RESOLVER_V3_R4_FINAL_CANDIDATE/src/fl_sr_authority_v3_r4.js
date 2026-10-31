'use strict';
/**
 * STMX FULL-LOOK SR DIRECTION RESOLVER V3_R4 — FINAL CANDIDATE · authority binding (offline; candidate for the SR Direction Final Freeze).
 * Copy of V3_R3 (pinned by its manifest, unchanged) with ONE semantic change, marked [R4]:
 *   [R4] SRB-2g (Oversized + built shoulder + Structured → S, imported from Item R2 — contrary to SR-06 "Full-Look SR does not copy Item R2") is split by
 *        the realized body governance, per CEO order 2026-10-25 §4 and FL-SR-C1 (CEO 2026-10-17):
 *          SRB-2os  waist Defined (shaped by the garment itself) AND shoulder not Dropped → STRUCTURED (construction holds from the frame through the body;
 *                   Frozen Item admission: a Defined waist PRESERVES structure under release)
 *          SRB-2or  otherwise → RELAXED (strong release; not cancelled by cinching — FL-SR-C1; oversized + dropped shoulder → release dominates — Item CEO §3)
 * Unchanged from R3: (1) AVAILABLE_EVIDENCE_MANDATORY_SCORING / MS-1 · (2) CG-1 retired · every other row. Pins BY NAME and BY HASH (fail-closed).
 * (R3 header follows) R3 = V3_R2 with: (1) mandatory scoring (MS-1 + sensitivity diagnostic); (2) CG-1 retired; SRB-2g.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..') + path.sep;
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const PINS = Object.freeze({
  flv_freeze_seal: { path: '01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/FINAL_FREEZE_SEAL.json', sha256: 'a6803bfac096c8fc466dcc4a1a3e4891c73856b384df123525f11ff6d135cb6a' },
  flv_scoring_handover: { path: '01_ENGINES/STYLE_VISION_EXTRACTOR/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/05_DOCS/SCORING_ENGINE_HANDOVER.md', sha256: 'da91e002b7f3da8b6836e17f73b39828c55c6cfd134b9c00222f09f1b8a41234' },
  sr_upper_physics_contract: { path: '04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_SR_UPPER_PHYSICS_CONTRACT_V1.md', sha256: '222661a6f421663c94a5132645a4bf74d7cc32ff5ebc007ff2ace36b2be9ce16' },
  item_sr_production_authority: { path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_ENGINE_PRODUCTION_AUTHORITY_V1.json', sha256: '6a670aa417c9692364352303aa760a4a6ec7441f60dcac73c2316f7689c36db7' },
  item_sr_evidence_admission: { path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_DIRECTION_FIRST_ENGINE_V1_2/src/sr_evidence_admission_v1.js', sha256: '4bd774a883dd7de1760196b34badc1599b87b001c2b2e5b939b51171a77138b4' },
  item_sr_direction_resolver: { path: '01_ENGINES/ITEM_SCORING_ENGINE/STMX_SR_DIRECTION_FIRST_ENGINE_V1_2/src/sr_direction_resolver_v1.js', sha256: '909a8328b0a616fe28561b06f13725241ad48e07fce1ae434b2368981a55c07e' },   // [R4] Item CEO §3 strong-release anchor (oversized + dropped shoulder → release dominates)
  sr_v3_r3_candidate_manifest: { path: '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R3_FINAL_CANDIDATE/PACKAGE_MANIFEST.json', sha256: 'c94c565a229e5517ebb747988a3208c20c8b2203d079b3399ab56cfa42bf07fb' },   // [R4] base
  fl_sr_c1_ceo_clarification: { path: '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_STYLE_SCORING_ENGINE_ARCHITECTURE_BASELINE_V1/05_CEO_CLARIFICATION_INTEGRATION_RECORD.md', sha256: 'dd61189b1d81a33a4d0a904951dbf10147a9b08b147896a910954cad0f0d9c01' },   // [R4] FL-SR-C1 (CEO 2026-10-17) + SR-06 + SR-D1
  ceo_sr_final_freeze_order: { path: '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_FINAL_CORRECTION_FREEZE_AND_BACKUP_V1/AUTHORIZATION/SR_FINAL_FREEZE_CEO_ORDER_VERBATIM.md', sha256: 'c9dfe5d405a579829de6b2bcec03f9c79342aff4f4b057b697990508200a5520' },   // [R4] §4 correction mandate
  sr_v3_r2_candidate_manifest: { path: '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R2_CG1_FINAL_CANDIDATE/PACKAGE_MANIFEST.json', sha256: '0794ee0107855519daef0940275f22acc5e64da6745ca9f259c13bf30bc76eba' },
  sr_v2_candidate_manifest: { path: '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V2_CANDIDATE/PACKAGE_MANIFEST.json', sha256: 'e2e45e4950d4e50fbc17bdb89b1a352a60bddbdde27f0b2624ac084bce2a68cc' },
  cg1_live_validation_record: { path: '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_CG1_G53_LIVE_VALIDATION_EXECUTION_V1/PACKAGE_MANIFEST.json', sha256: 'b40378b48ddebde237e455a92b510a0b8bda94065dd02aa852fb730792221a63' },   // [R3] CG-1 NOT_VALIDATED
  ceo_mandatory_scoring_order: { path: '04_GOVERNANCE_AND_FINAL_DOCS/STMX_FULL_LOOK_SR_MANDATORY_SCORING_FINAL_CORRECTION_V1/AUTHORIZATION/SR_MANDATORY_SCORING_CEO_ORDER_VERBATIM.md', sha256: '485d3c4e689af60a6b8dc6ae442458446444565bf996b7ce5a1a5b001773bf17' },
});
class AuthorityError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; } }
const bound = {};
for (const [k, p] of Object.entries(PINS)) { const abs = ROOT + p.path; if (!fs.existsSync(abs)) throw new AuthorityError('AUTHORITY_MISSING', p.path); const h = sha(abs); if (h !== p.sha256) throw new AuthorityError('AUTHORITY_HASH_MISMATCH', p.path + ' ' + h); bound[k] = { path: p.path, sha256: h }; }
const V2DIR = ROOT + '01_ENGINES/STYLE_SCORING_ENGINE/STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V2_CANDIDATE/';
/* [R4] Lane A (SR V2 governed comparison) is verified and loaded LAZILY — only when a lane-A comparison is requested — so the lane-B production path never
 * loads V2 code or its research-script pins. The V2 manifest itself stays a load-time pin (PINS.sr_v2_candidate_manifest). Same check, same error as R3. */
function verifyLaneA() { for (const f of JSON.parse(fs.readFileSync(V2DIR + 'PACKAGE_MANIFEST.json', 'utf8')).files.filter((x) => /^src\//.test(x.path))) if (sha(V2DIR + f.path) !== f.sha256) throw new AuthorityError('LANE_A_SOURCE_CHANGED', f.path); }
const HANDOVER = fs.readFileSync(ROOT + PINS.flv_scoring_handover.path, 'utf8'); const srRow = HANDOVER.split('\n').find((l) => /^\| SR \|/.test(l)) || '';
if (!/SVP-123 surface/.test(srRow) || !/SVP-124 material/.test(srRow) || !/SVP-007 final_upper_relation/.test(srRow)) throw new AuthorityError('HANDOVER_SR_ROW_CHANGED');
const UPC = fs.readFileSync(ROOT + PINS.sr_upper_physics_contract.path, 'utf8'); if (!/NR-12/.test(UPC) || !/Fit/.test(UPC)) throw new AuthorityError('UPPER_PHYSICS_CONTRACT_CHANGED');
const ADM = fs.readFileSync(ROOT + PINS.item_sr_evidence_admission.path, 'utf8');
const listOf = (name) => { const m = ADM.match(new RegExp('const ' + name + ' = \\[([^\\]]*)\\]')); if (!m) throw new AuthorityError('ITEM_CLASS_LIST_NOT_FOUND', name); return Object.freeze(m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)); };
const FORM_RETAINING_MATERIAL = listOf('FORM_RETAINING_MATERIAL'), STRUCTURE_RELEVANT_SURFACE = listOf('STRUCTURE_RELEVANT_SURFACE');
// [R4] the SRB-2os / 2or semantics are read from the pinned sources (fail-closed if any changes):
//   Item admission: Oversized is a STRONG release fit; a Defined waist (WAIST_MILD) preserves structure under release · Item resolver: CEO §3 strong-release anchor ·
//   FL-SR-C1 record: realized silhouette decides; strong release not cancelled by cinching; SR-06 Full-Look SR does not copy Item R2.
if (!/const STRONG_RELEASE_FITS = \['Oversized', 'Voluminous'\]/.test(ADM)) throw new AuthorityError('ITEM_STRONG_RELEASE_CLASS_CHANGED');
if (!/preservesUnderRelease\.push\('WAIST_MILD'\)/.test(ADM)) throw new AuthorityError('ITEM_WAIST_PRESERVATION_CHANGED');
if (!/oversized \+ dropped shoulder \+ relaxed[\s\S]{0,40}whole fit → release dominates/.test(fs.readFileSync(ROOT + PINS.item_sr_direction_resolver.path, 'utf8'))) throw new AuthorityError('ITEM_CEO_S3_ANCHOR_CHANGED');
const FLC1 = fs.readFileSync(ROOT + PINS.fl_sr_c1_ceo_clarification.path, 'utf8'); if (!/Strong release is not cancelled by cinching/.test(FLC1) || !/SR-06 "Full-Look SR does not copy Item runtime rule R2"/.test(FLC1)) throw new AuthorityError('FL_SR_C1_NOT_FOUND');
const ORDER_R4 = fs.readFileSync(ROOT + PINS.ceo_sr_final_freeze_order.path, 'utf8'); if (!/Strong shoulder construction may contribute to Structure, but must not automatically defeat dominant realized release\./.test(ORDER_R4)) throw new AuthorityError('R4_CORRECTION_MANDATE_NOT_FOUND');
const ORDER = fs.readFileSync(ROOT + PINS.ceo_mandatory_scoring_order.path, 'utf8'); if (!/Incomplete parameters must not prevent scoring\./.test(ORDER)) throw new AuthorityError('MANDATORY_SCORING_DIRECTIVE_NOT_FOUND');
const REQUIREMENT = Object.freeze({ upper_priority: 'RETAINED', resolved_directions: ['STRUCTURED', 'RELAXED'], neutral_runtime_emission: 'PROHIBITED', mandatory_scoring: 'AVAILABLE_EVIDENCE_MANDATORY_SCORING (CEO 2026-10-24, all four axes) — every scorable input returns S or R', missingness: 'never a veto — MS-1 (unobserved = no contribution) + sensitivity diagnostic', technical_failure: 'input failure only (INPUT_CONTRACT · UPPER_NOT_VISIBLE · NO_UPPER_SR_EVIDENCE) — never a style class', frozen_item_sr: 'UNCHANGED' });
const DOMAINS = Object.freeze({ relation: ['Slim', 'Regular', 'Relaxed', 'Oversized'], shoulder: ['None', 'Mild', 'Strong', 'Extreme'], shape: ['Structured', 'Semi-Structured', 'Semi-Fluid', 'Fluid'], drop: ['None', 'Dropped'], waist: ['Undefined', 'Defined', 'Cinched'], constriction: [true, false], form_retention: [true, false] });
const RULES_B = Object.freeze({
  'SRB-1': { from: 'FA-SR-3 SR-1', direction: 'STRUCTURED', meaning: 'Slim governing upper (Item R2 FIT_SLIM)' },
  'SRB-2m': { from: 'FA-SR-3 SR-2m', direction: 'STRUCTURED', meaning: 'Relaxed + built shoulder + Structured shape' },
  'SRB-2os': { from: '[R4] CEO order 2026-10-25 §4.2 (a substantially governed structural silhouette is not defeated by volume) · Frozen Item admission (a Defined waist preserves structure under release) · Item CEO §3 (a dropped shoulder under oversized = release dominates)', direction: 'STRUCTURED', meaning: 'Oversized + built shoulder + Structured shape + waist Defined (shaped by the garment itself) + shoulder not Dropped: the construction governs from the frame through the body' },
  'SRB-2or': { from: '[R4] FL-SR-C1 (CEO 2026-10-17: realized silhouette decides; strong release not cancelled by cinching; belt ≠ silhouette control) · Item CEO §3 · SR-06 (Full-Look does not copy Item R2)', direction: 'RELAXED', meaning: 'Oversized + built shoulder + Structured shape WITHOUT body governance (waist Undefined / Cinched / not observed, or shoulder Dropped): the built frame and the shape-holding cloth hold the volume away from the body — the strong release governs' },
  'SRB-2f': { from: 'Item SR V1.2 R3d (CEO 2026-09-14 §4.2)', direction: 'STRUCTURED', meaning: 'Relaxed (not 2m) + OBSERVED form-retaining material / Quilted surface; never Oversized' },
  'SRB-2r': { from: 'SR-2r (governing)', direction: 'RELAXED', meaning: 'released upper (Relaxed / Oversized) without 2m / 2os / 2or / 2f support' },
  'SRB-3h': { from: 'FA-SR-3 SR-3s + SR-3m', direction: 'STRUCTURED', meaning: 'Regular + Structured' },
  'SRB-3s': { from: 'FA-SR-3 SR-3s', direction: 'STRUCTURED', meaning: 'Regular + Semi-Structured + no drop' },
  'SRB-3k': { from: 'SR-3d narrowed (Item R4c)', direction: 'STRUCTURED', meaning: 'Regular + Semi-Structured + drop + something holds' },
  'SRB-3d': { from: 'SR-3d narrowed (Item R4b)', direction: 'RELAXED', meaning: 'Regular + Semi-Structured + drop + nothing holds' },
  'SRB-3g': { from: 'FQ-SR-2 (Item R2)', direction: 'STRUCTURED', meaning: 'Regular + soft shape + governing force' },
  'SRB-3r': { from: 'FQ-SR-2', direction: 'RELAXED', meaning: 'Regular + soft shape + no governing force' },
});
const RETIRED = Object.freeze({ 'SRB-2xs': 'CG-1 torso return → S — live NOT_VALIDATED (M309 conflict; M320 never observed)', 'SRB-2xr': 'CG-1 torso Oversized → R as an independent switch — order 2026-10-24 §6.1', 'SRB-2x': 'CONTRACT_GAP_CG1 — mandatory scoring (no gap outcome)', 'SRB-2g': '[R4] Oversized + built shoulder + Structured → S imported from Item R2 — systematic CEO-anchor conflict; split into SRB-2os / SRB-2or (order 2026-10-25 §4.1)' });
/** MS-1 (R3; preserved by CEO order 2026-10-25 §5): the rule-table reading of an UNOBSERVED fact = "this fact gives no evidence". No value is written into the evidence record. */
const MS1 = Object.freeze({ relation: { reads_as: 'Regular', meaning: 'no fit force — the shape-governed rows decide' }, shape: { reads_as: 'Semi-Fluid', meaning: 'no observed shape retention — the soft-shape rows decide' }, shoulder: { reads_as: 'None', meaning: 'no observed shoulder governance' }, drop: { reads_as: 'None', meaning: 'no observed shoulder release' }, waist: { reads_as: 'Undefined', meaning: 'no observed waist definition' }, constriction: { reads_as: false, meaning: 'no observed constriction' }, form_retention: { reads_as: false, meaning: 'no observed form-retaining material / surface' } });
for (const r of Object.values(RULES_B)) if (r.direction === 'NEUTRAL') throw new AuthorityError('NEUTRAL_RULE_PROHIBITED');
const EXCEPTIONS = Object.freeze({
  UPPER_NOT_VISIBLE: 'INPUT FAILURE — the look frame is not observed or no governing upper exists; not a style result (verify the image)',
  NO_UPPER_SR_EVIDENCE: 'INPUT FAILURE — the governing upper carries no observed SR fact at all; not a style result',
  INPUT_CONTRACT: 'INPUT FAILURE — repair the input packet / run_record (contract, version, registry, out-of-domain value)',
});
module.exports = { ROOT, PINS, bound, REQUIREMENT, DOMAINS, RULES_B, RETIRED, MS1, EXCEPTIONS, AuthorityError, V2DIR, verifyLaneA, FORM_RETAINING_MATERIAL, STRUCTURE_RELEVANT_SURFACE, RESOLVER_ID: 'STMX_FULL_LOOK_SR_DIRECTION_RESOLVER_V3_R4_FINAL_CANDIDATE', CONSTITUTION_ID: 'STMX_FULL_LOOK_SR_DIRECTION_CONSTITUTION_V3_R4' };   /* [R4] outputs carry the constitution identity; release status lives in the production pointer / freeze seal, not in each output */
