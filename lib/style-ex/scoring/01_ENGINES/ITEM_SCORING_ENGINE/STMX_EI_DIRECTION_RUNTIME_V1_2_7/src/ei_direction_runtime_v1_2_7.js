'use strict';
/**
 * STMX — EI DIRECTION-FIRST RUNTIME V1.1.2
 * =====================================================================================
 * V1.1.2 CORRECTION (this file supersedes ei_direction_runtime_v1_1_1.js for exactly two blocker corrections —
 * CLAUDE CODE TARGETED BLOCKER-RESOLUTION ORDER, EI 114 DIRECTION REGRESSION BLOCKER CORRECTION V1.1):
 *   (A) Grid general force rule: contrasting pattern=Grid → UNRESOLVED · INPUT_REPRESENTATION_GAP · GAP-12 (no
 *       universal "Grid + contrast → MEANINGFUL"; no "Grid = Weak" token rule) — contract V1.1 / resolver V1.1.
 *   (B) Metal Hardware admission / attribution: Stage 6 now receives the garment's governed closure context
 *       (closureContext(): front_opening_extent · closure_type) so the general resolver can apply the canonical D01
 *       exclusion clause through the closure_accounting realization input (GFR-D01-U5 · GAP-13).
 * D7 · D8 · state machine · Neutral Registry · Colour Base · P2 · coverage · dedup · independence · materiality are
 * byte-for-byte the V1.1.1 code. State machine contract: contracts/STMX_EI_DIRECTION_RUNTIME_STATE_MACHINE_V1_1_1.json (unchanged).
 * =====================================================================================
 * V1.1.1 CORRECTION (this file supersedes ei_direction_runtime_v1_1.js): ONLY the direction transition layer
 * changed, per the CEO architecture correction of 2026-09-04 (EI-X-D8 corrected · EI-X-D7 confirmed deterministic):
 *   CONTEXTUAL_NEUTRAL + exactly one independent MEANINGFUL → E   (prior rule → CONTEXTUAL_NEUTRAL is SUPERSEDED)
 *   I_BASE + exactly one independent MEANINGFUL → CROSSOVER_NEUTRAL (deterministic; no qualifier, no blocker)
 * The general force resolver, its contract, Color Base, Registry, P2, dedup, independence, materiality and trace are
 * byte-for-byte the V1.1 code. State machine contract: contracts/STMX_EI_DIRECTION_RUNTIME_STATE_MACHINE_V1_1_1.json.
 *
 * Deterministic execution of the FROZEN EI direction architecture (EI-X-D1 … D12) over the
 * current governed Item Vision output (37 Parameters + Colour V1).
 *
 * V1.1 CORRECTION (this file supersedes ei_direction_runtime_v1.js):
 *   P3 force resolution is now a GENERAL, realization-based rule set executed from the machine
 *   contract STMX_EI_P3_GENERAL_FORCE_RESOLUTION_CONTRACT_V1.json (src/ei_p3_general_force_resolver_v1.js).
 *   The V1 production path compared each observation to CEO calibration realizations and returned
 *   UNRESOLVED when none matched; that path and its data file are removed. Calibration cases are now
 *   test oracles only. Nothing else in the pipeline changed except: (a) Colour carrier attribution no
 *   longer attaches structural-component colours (generic_descriptor) to P3 evidence, and (b) the
 *   I_BASE + ONE_MEANINGFUL transition is reported as CEO-decision-required instead of being executed
 *   (V1.1 state; superseded by the V1.1.1 transition layer described above).
 *
 *   Stage 1  Input Contract Validation
 *   Stage 2  Intrinsic Color Base Resolution          (Neutral Registry V2 §1 · EI-X-D1 · D9)
 *   Stage 3  Contextual Neutral Resolution            (Neutral Registry V2 §3/§4 · EI-X-D7 ①)
 *   Stage 4  EI-owned Evidence Collection             (P2 exposure · P3 canonical S/D + pattern/graphic · carrier attribution)
 *   Stage 5  Physical Pathway Deduplication           (Dedup Contract V1 — pathway normalization BEFORE force)
 *   Stage 6  General Force Resolution                 (P2: EI-X-D4 · P3: general realization rules)
 *   Stage 7  Independence Resolution                  (Independence Contract V1)
 *   Stage 8  Direction State Transition               (STATE_MACHINE_V1_1_1 — no arithmetic · deterministic)
 *   Stage 9  D11 Root-Cause / Unresolved Handling     (materiality by admissible-force enumeration)
 *   Stage 10 Explainable Trace
 *
 * ⛔ DIRECTION ONLY. No EI1–EI9, no weights, no coefficients, no sums, no thresholds.
 * ⛔ GREENFIELD. Imports nothing from the retired scorer. The only reused modules are the two
 *    Vision-side CONTRACT modules (producer_rules_v1 · color_contract_v1), used as read-only
 *    vocabulary/domain authority — never as scoring logic.
 * ⛔ NOT WIRED into any live production path. Offline, independently callable.
 * ⛔ No record projection: a legacy-generation record is rejected by Stage 1, never adapted here.
 */
const fs = require('fs');
const path = require('path');

const RUNTIME_VERSION = 'STMX_EI_DIRECTION_RUNTIME_V1_2_7';
const INPUT_CONTRACT_VERSION = 'STMX_EI_DIRECTION_RUNTIME_INPUT_CONTRACT_V1';

// ── reused Vision-side contract modules (semantically neutral: vocabulary + domains only) ──
const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const IVE = path.join(REPO, '01_ENGINES', 'ITEM_VISION_EXTRACTOR');
const PRODUCER = require(path.join(__dirname, 'producer_contract_binding_v1.js')); // ⛔ explicit Producer version binding — never 'latest'
const RULES = PRODUCER.rules;
const COLOUR = require(path.join(IVE, 'run', 'color_recovery', 'color_contract_v1.js'));
const GFR = require(path.join(__dirname, 'ei_p3_general_force_resolver_v1_1.js'));

// ── authority DATA contracts (transcribed from frozen authority; every row cites its source) ──
const CON = path.join(__dirname, '..', 'contracts');
const J = f => JSON.parse(fs.readFileSync(path.join(CON, f), 'utf8'));
const REGISTRY = J('STMX_EI_DIRECTION_RUNTIME_NEUTRAL_REGISTRY_V3_TABLE.json');   // CURRENT — gender-independent (CEO 2026-09-06)
const DENIM = J('STMX_EI_DENIM_NEUTRAL_ELIGIBILITY_AUTHORITY_V1.json');
const OWNERSHIP = J('STMX_EI_TC_PARAMETER_OWNERSHIP_GUARD_V1.json');
const SM = J('STMX_EI_DIRECTION_RUNTIME_STATE_MACHINE_V1_1_1.json');

const FORCES = ['WEAK', 'MEANINGFUL', 'STRONG'];
// ── ROOT CAUSE VOCABULARY ─────────────────────────────────────────────────────────────────
//   Approval Anchor
//   CEO Decision: 2026-09-06
//   Reason:       §21 requires a CONTROLLED missing-scoring-context reason, and §22 names the
//                 concept: a unit blocked because the CALLER did not supply user context is
//                 "missing test/scoring context" — ⛔ NOT "garment gender unknown" and ⛔ NOT an
//                 architecture decision. The existing five root causes were audited first and none
//                 fits: INPUT_REPRESENTATION_GAP asserts the VISION RECORD under-represents the
//                 garment, which is false here — the record is complete; the caller's context is
//                 absent. MSC is added rather than overloading a token with a false meaning.
//   Affected Scope: ei_direction_runtime_v1_2_7.js → ROOT · DISPLAY · resolveContextualNeutral
const ROOT = { IRG: 'INPUT_REPRESENTATION_GAP', VEE: 'VISION_EXTRACTION_ERROR', SPE: 'SCORING_PHYSICS_ERROR', GTR: 'GT_AUTHORITY_REVIEW', CAG: 'CEO_AUTHORITY_GAP' }   // ⛔ MSC removed (§13) — it existed solely for the gender question;
const DISPLAY = { INPUT_REPRESENTATION_GAP: 'INPUT REPRESENTATION GAP', VISION_EXTRACTION_ERROR: 'VISION EXTRACTION ERROR', SCORING_PHYSICS_ERROR: 'SCORING PHYSICS ERROR', GT_AUTHORITY_REVIEW: 'GT / AUTHORITY REVIEW', CEO_AUTHORITY_GAP: 'CEO AUTHORITY GAP' };
const NON_EI_MATERIAL_NOTE = 'Phase 2 §5 No-Effect / §10 REJECTED — ordinary material identity is not P3 evidence';

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 1 — INPUT CONTRACT VALIDATION  (unchanged from V1)
// ═══════════════════════════════════════════════════════════════════════════════════════
function validateInput(input) {
  const errors = [];
  const E = (code, msg, p) => errors.push({ code, message: msg, parameter: p || null });
  if (!input || typeof input !== 'object') { E('INPUT_NOT_OBJECT', 'input must be an object'); return { ok: false, errors }; }
  const cat = input.category;
  if (!RULES.CATEGORIES.includes(cat)) E('CATEGORY_NOT_CANONICAL', `category '${cat}' is not one of the 10 canonical categories`, 'category');
  const obs = input.observations;
  if (!obs || typeof obs !== 'object') { E('OBSERVATIONS_MISSING', 'observations{} missing'); return { ok: false, errors }; }
  for (const k of Object.keys(obs)) if (!RULES.ALL_PARAMS.includes(k)) E('UNKNOWN_PARAMETER', `'${k}' is not one of the 37 parameters (no 38th parameter is accepted)`, k);
  const STATES = ['OBSERVED', 'ABSENT', 'UNKNOWN', 'NOT_VISIBLE'];
  for (const [p, o] of Object.entries(obs)) {
    if (!RULES.ALL_PARAMS.includes(p)) continue;
    if (!o || typeof o !== 'object') { E('OBSERVATION_SHAPE', `'${p}' must be an object`, p); continue; }
    if (!STATES.includes(o.state)) E('STATE_INVALID', `'${p}' state '${o.state}' invalid`, p);
    const dom = RULES.domainFor(p, cat);
    if (RULES.MULTI.includes(p)) {
      if (o.state === 'OBSERVED') {
        if (!Array.isArray(o.values)) { E('MULTI_VALUES_MISSING', `'${p}' OBSERVED but values[] missing`, p); continue; }
        for (const v of o.values) {
          if (Array.isArray(dom) && dom.length && !dom.includes(v.value)) E('VALUE_NOT_IN_DOMAIN', `'${p}' = '${v.value}' not in domain — ⛔ not normalized`, p);
          if (v.coverage !== undefined && !RULES.COVERAGE.includes(v.coverage)) E('COVERAGE_NOT_IN_DOMAIN', `'${p}' = '${v.value}' coverage '${v.coverage}' invalid`, p);
          if (v.coverage !== undefined && !RULES.isCoverageEligible(p, v.value)) E('COVERAGE_NOT_APPLICABLE_TO_VALUE', `'${p}' = '${v.value}' is not a canonical evidence candidate`, p);
          if (v.locations !== undefined && !Array.isArray(v.locations)) E('LOCATIONS_SHAPE', `'${p}' locations must be an array`, p);
        }
      }
    } else if (o.state === 'OBSERVED' && o.value != null && Array.isArray(dom) && dom.length && !dom.includes(o.value)) {
      E('VALUE_NOT_IN_DOMAIN', `'${p}' = '${o.value}' not in domain — ⛔ not normalized`, p);
    }
  }
  const co = input.color_observation;
  if (!co || typeof co !== 'object') E('COLOUR_V1_MISSING', 'color_observation{} missing (Colour V1 is part of the governed input)');
  else {
    const cv = COLOUR.validateColorObservation(co);
    for (const e of (cv.contract_errors || [])) E('COLOUR_V1_CONTRACT', String(e), 'color_observation');
    if (!COLOUR.FAMILIES.includes(co.primary_color_family)) E('COLOUR_FAMILY_INVALID', `primary_color_family '${co.primary_color_family}' invalid`, 'color_observation');
  }
  // ── LEGACY GENDER COMPATIBILITY VALIDATION (CEO 2026-09-06) ─────────────────────────────
  //   Both the legacy field and its superseded alias are checked against the same legacy domain.
  //   This is a backward-compatible REQUEST-VALIDATION guard, ⛔ not a scoring input.
  const ug = readUserGender(input);
  if (ug.raw !== undefined && !['MEN', 'WOMEN', null].includes(ug.raw))
    E('USER_GENDER_TOKEN_INVALID', `scoring_context.user_gender must be MEN | WOMEN | null`, ug.path);   // an invalid legacy token still fails compatibility validation; a VALID value has zero scoring effect
  return { ok: errors.length === 0, errors };
}

// ── LEGACY GENDER COMPATIBILITY FIELD — READER (CEO 2026-09-06) ───────────────────────────
//   Approval Anchor
//   CEO Decision: 2026-09-06
//   Reason:       Gender is removed from the EI Neutral Registry architecture and from Item
//                 Scoring entirely. Item Scoring does NOT use Gender for Neutral Registry
//                 resolution or for any EI / TC / SR / DM scoring physics.
//                 ⛔ SUPERSEDED (CEO 2026-09-06): the earlier framing in which the Registry's
//                 gender meant the STMX user account / profile gender, in which
//                 `gender_or_provenance` was consumed by the Neutral Registry, and in which
//                 `scoring_context.user_gender` was the governed gender source, is HISTORICAL.
//                 There is no governed gender source in the scoring engine, because the engine
//                 consumes no gender at all.
//   Affected Scope: ei_direction_runtime_v1_2_7.js → readUserGender · validate · run · runPair
//
//   `scoring_context.user_gender` and the older `gender_or_provenance` alias are both PRESERVED
//   — ⛔ not erased — solely so an existing integration keeps working. This reader exists only to
//   locate whichever legacy field a caller supplied so the request can still be validated and the
//   supply recorded in the trace. A valid legacy value has ZERO scoring effect and the value is
//   never interpreted by the scorer; an invalid legacy token may still fail compatibility
//   validation under the current interface contract.
//   ⛔ This is NOT a gender resolver, NOT Vision evidence, is not among the 37 parameters, is
//      never inferred from the image, the model, the silhouette or any product taxonomy, and is
//      never defaulted.
function readUserGender(input) {
  const sc = input && input.scoring_context;
  if (sc && Object.prototype.hasOwnProperty.call(sc, 'user_gender'))
    return { raw: sc.user_gender, path: 'scoring_context.user_gender', provenance: 'SCORING_CONTEXT_USER_GENDER' };
  if (input && Object.prototype.hasOwnProperty.call(input, 'gender_or_provenance'))
    return { raw: input.gender_or_provenance, path: 'gender_or_provenance', provenance: 'SUPERSEDED_ALIAS_gender_or_provenance' };
  return { raw: undefined, path: 'scoring_context.user_gender', provenance: 'ABSENT' };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 2 — INTRINSIC COLOR BASE  (Registry V2 §1 · EI-X-D1 · D9)  (unchanged from V1)
// ═══════════════════════════════════════════════════════════════════════════════════════
function resolveColorBase(co) {
  const fam = co.primary_color_family;
  const B = REGISTRY.base_character;
  let semantic = null, base = null, finding = null;
  if (B.NON_EXPRESSIVE.includes(fam)) { semantic = 'NON_EXPRESSIVE'; base = 'I_BASE'; }
  else if (B.EXPRESSIVE.includes(fam)) { semantic = 'EXPRESSIVE'; base = 'E_BASE'; }
  else { semantic = 'UNRESOLVED'; base = null; finding = { stage: 'COLOR_BASE', root_cause: ROOT.IRG, reason: `primary_color_family '${fam}' is not a Base-Character family (Colour V1 'uncertain') — base cannot be resolved`, affected: 'color_observation.primary_color_family' }; }
  return { intrinsic_color_family: fam, intrinsic_color_semantic: semantic, color_base: base,
    lightness_ignored: { color_lightness: co.color_lightness || null, rule: 'EI-X-D9 — lightness never changes base or side' },
    authority: REGISTRY.authority.file + ' §1', finding };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 3 — CONTEXTUAL NEUTRAL  (Registry V2 §3 / §4 · EI-X-D7 ①)  (unchanged from V1)
// ═══════════════════════════════════════════════════════════════════════════════════════
function materialIncludes(obs, list) {
  const m = obs.material; if (!m || m.state !== 'OBSERVED' || !Array.isArray(m.values)) return false;
  return m.values.some(v => list.includes(v.value));
}
function registryRow(cat, obs) {
  // ── §12 ACTIVEWEAR PRODUCT CONTEXT ROUTING (CEO 2026-09-05) ──────────────────────────
  //   A governed Activewear/Performance product context selects that row for its structural
  //   category BEFORE the generic rows. ⛔ It never changes the category itself, and it is never
  //   EI evidence — its only job is Registry context resolution.
  {
    const pc = obs && obs.category && obs.category.product_context;
    if (pc === 'Activewear-Performance') {
      const r = (REGISTRY.rows || []).find(x => x.category === cat && x.context === 'Activewear / Performance');
      if (r) return r;
    }
  }
  const rows = REGISTRY.rows.filter(r => r.category === cat);
  if (!rows.length) return null;
  if (cat === 'Jacket') {
    const g = obs.grammar && obs.grammar.state === 'OBSERVED' ? obs.grammar.value : null;
    if (g === 'Tailored') return rows.find(r => r.context === 'Tailored');
    if (materialIncludes(obs, ['Leather', 'Suede'])) return rows.find(r => r.context === 'Leather / Suede');
    if (materialIncludes(obs, ['Denim'])) return rows.find(r => r.context === 'Denim');
    return rows.find(r => r.predicate === 'else');
  }
  if (cat === 'Trouser') {
    const td = obs.trouser_distinction && obs.trouser_distinction.state === 'OBSERVED' ? obs.trouser_distinction.value : null;
    if (td === 'Tailored') return rows.find(r => r.context === 'Tailored');
    if (td === 'Jeans') return rows.find(r => r.context === 'Jeans');
    if (td === 'Sport') return rows.find(r => r.context === 'Sweatpants / Jogger');
    // §13 — Leggings is already a governed trouser_distinction; this is what makes it reach the Registry.
    if (td === 'Leggings') { const r = rows.find(x => x.context === 'Leggings'); if (r) return r; }
    return rows.find(r => r.predicate === 'else');
  }
  // ⛔ The Activewear/Performance row is reachable ONLY through a governed product context. A garment
  //    without that context must never fall into it just because the row sits first in the table.
  return rows.find(r => r.context !== 'Activewear / Performance') || null;
}
// ── NEUTRAL REGISTRY RESOLUTION — GENDER-INDEPENDENT (CEO 2026-09-06) ─────────────────────
//   Approval Anchor
//   CEO Decision: 2026-09-06
//   Reason:       Gender is removed from the EI Neutral Registry architecture. Neutral is an ITEM
//                 property within the governed garment context. The lookup is now
//                   Category × governed Product Context / Distinction × Colour → Neutral | Miss.
//                 ⛔ No MEN/WOMEN selector, no WOMEN_ONLY applicability, no user-gender selector,
//                 and therefore no gender hypothesis and no missing-gender fail-closed path.
//   Affected Scope: ei_direction_runtime_v1_2_7.js → resolveContextualNeutral · run · runPair
//   ⛔ This changes EI P1 Base resolution ONLY. No P2, P3, TC, SR or DM behaviour is touched.
function resolveContextualNeutral(cat, obs, colorBase) {
  const row = registryRow(cat, obs);
  const fam = colorBase.intrinsic_color_family;
  // ── §12 PRODUCT CONTEXT RESOLUTION (CEO 2026-09-05, retained) ──────────────────────────
  //   The garment's governed product context, read from category.product_context (uppers) or from
  //   trouser_distinction (lowers, already governed). It qualifies the Registry row; it is NEVER
  //   EI evidence and never changes the structural category.
  const out = { category: cat, product_context: row ? row.context : null, predicate: row ? row.predicate : null,
    primary_color_family: fam,
    registry_row_matched: row ? `${row.category} · ${row.context}` : null, registry_section: row ? row.section : null,
    authority_reference: REGISTRY.authority.file + ' ' + (row ? row.section : '§3'),
    neutral_colors: row ? row.neutral_colors : null,
    gender_dependency: 'NONE — removed from the Neutral Registry architecture (CEO 2026-09-06)',
    registry_result: null, finding: null };
  if (!row || !colorBase.color_base) { out.registry_result = 'NOT_EVALUATED'; return out; }
  out.registry_result = Array.isArray(row.neutral_colors) && row.neutral_colors.includes(fam) ? 'NEUTRAL' : 'MISS';
  return out;
}
function startingState(colorBase, neutral, materialContext) {
  if (!colorBase.color_base) return null;
  // Denim Neutral Eligibility decides first — ⛔ no downgrade after this.
  if (materialContext && materialContext.resolved_state) return materialContext.resolved_state;
  // An ineligible Denim category bypasses the Category×Color Neutral Registry entirely.
  if (materialContext && materialContext.registry_bypass) return colorBase.color_base;
  if (neutral.registry_result === 'NEUTRAL') return 'CONTEXTUAL_NEUTRAL';
  return colorBase.color_base;
}


// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 2.5 — DENIM NEUTRAL ELIGIBILITY  (Denim Neutral Eligibility Authority V1 · CEO 2026-09-05)
// ═══════════════════════════════════════════════════════════════════════════════════════
//   Supersedes the V1.1.3 material-ONLY Denim rule, which was category-independent.
//   Denim Neutral eligibility ≠ all Denim garments.
//
//     material includes Denim ∧ category ∈ eligible {Trouser · Jacket · Skirt}
//         primary_color_family ∈ {black · gray · blue · navy} → CONTEXTUAL_NEUTRAL
//         any other Base-Character family                     → E_BASE
//
//     material includes Denim ∧ category ∉ eligible
//         → no Denim Neutral
//         → BYPASS the Category×Color Neutral Registry (an ineligible Denim category may not
//           regain Neutral through a row it would otherwise hit)
//         → resolve from the intrinsic Base-Character semantics
//
//   ⛔ Denim material is never itself EI evidence — this stage governs routing only.
//   ⛔ color_lightness is never consulted (EI-X-D9 preserved).
//   ⛔ Eligibility reads the governed category + material observations only — no name guessing.
//   ⛔ 'uncertain' colour stays UNRESOLVED in every branch (fail-closed, EI-X-D2).
function denimNeutralEligible(cat) {
  return DENIM.eligible_categories.includes(cat);
}
function resolveMaterialColorContext(obs, colorBase, category) {
  const out = { material_context: null, applies: false, category: category || null, eligible: null,
    eligibility_reason: null, resolved_state: null, registry_bypass: false,
    authority: DENIM.document + ' · CEO Decision ' + DENIM.ceo_decision_date,
    basic_set: DENIM.basic_neutral_color_families, eligible_categories: DENIM.eligible_categories,
    jeans_product_context: null, reason: null };
  if (!materialIncludes(obs, DENIM.material_scope)) { out.reason = 'no governed material-specific colour authority applies'; return out; }
  out.material_context = 'Denim'; out.applies = true;
  if (category === 'Trouser') out.jeans_product_context = (obs.trouser_distinction && obs.trouser_distinction.state === 'OBSERVED') ? obs.trouser_distinction.value : null;
  const fam = colorBase.intrinsic_color_family;
  out.eligible = denimNeutralEligible(category);
  out.eligibility_reason = out.eligible
    ? `category '${category}' is a conventional Denim product context (eligible: ${DENIM.eligible_categories.join(' · ')})`
    : `category '${category}' is NOT a conventional Denim product context — Denim Neutral and the Category×Color Registry are both bypassed`;
  if (!out.eligible) {
    out.registry_bypass = true;
    out.reason = `material = Denim ∧ ineligible category '${category}' → no Denim Neutral · Registry bypassed · base from intrinsic '${fam}' semantics (${colorBase.color_base || 'UNRESOLVED'})`;
    return out;
  }
  out.registry_bypass = true;   // an eligible Denim garment is decided here; the generic row is not consulted
  if (!colorBase.color_base) { out.reason = `material = Denim but primary_color_family '${fam}' is not a Base-Character family — base stays UNRESOLVED (⛔ never promoted to Expressive)`; return out; }
  if (DENIM.basic_neutral_color_families.includes(fam)) {
    out.resolved_state = 'CONTEXTUAL_NEUTRAL';
    out.reason = `eligible Denim '${category}' ∧ primary_color_family '${fam}' ∈ basic Denim palette → CONTEXTUAL_NEUTRAL`;
  } else {
    out.resolved_state = 'E_BASE';
    out.reason = `eligible Denim '${category}' ∧ primary_color_family '${fam}' ∉ basic Denim palette → EXPRESSIVE (⛔ generic Non-Expressive family semantics must not downgrade this)`;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 4 — EI-OWNED EVIDENCE COLLECTION + Colour carrier attribution (P3-D-1 fact identity)
// ═══════════════════════════════════════════════════════════════════════════════════════
const P3_CARRIERS = ['surface', 'material', 'decorative_detail', 'attachment'];
// ⛔ EI/TC OWNERSHIP GUARD (CEO 2026-09-05) — cuff_scale and sleeve_volume are TC-owned proportion /
//    construction-silhouette observations. EI must never consume them as expressive evidence.
//    They remain in the governed representation for TC. Enforced below and asserted in the tests.
const TC_OWNED_NEVER_EI = OWNERSHIP.tc_owned_never_ei;
function assertEiOwnership(parameters) {
  const leak = parameters.filter(p => TC_OWNED_NEVER_EI.includes(p));
  if (leak.length) throw new Error('EI/TC OWNERSHIP VIOLATION: EI attempted to consume TC-owned parameter(s) ' + leak.join(', '));
  return true;
}
const DEFERRED = { surface: ['Gathered'], decorative_detail: ['Piping'] };
const REJECTED = { decorative_detail: ['Embroidery'] };

function attributeCarriers(co, evidence) {
  // Colour V1 additional_colors → attributed to at most ONE EI evidence (contract colour_context_policy)
  const primary = co.primary_color_family;
  const adds = Array.isArray(co.additional_colors) ? co.additional_colors : [];
  const attributions = [];
  const first = p => evidence.find(e => e.source_parameter === p) || null;
  for (const a of adds) {
    const contrast = a.color_family !== primary && a.color_family !== 'uncertain';
    let target = null, why = null;
    if (a.carrier_kind === 'attachment') { target = evidence.find(e => e.source_parameter === 'attachment' && e.source_value === a.carrier_ref) || first('attachment'); why = 'carrier_kind attachment → attachment evidence (belt-buckle hardware colour attaches to the Metal Hardware evidence)'; }
    else if (a.carrier_kind === 'graphic') { target = first('graphic'); why = 'carrier_kind graphic → graphic evidence'; }
    else if (a.carrier_kind === 'pattern') { target = first('pattern'); why = 'carrier_kind pattern → pattern evidence'; }
    else if (a.carrier_kind === 'material_component') {
      const deco = first('decorative_detail');
      if (deco && ['accent', 'multi'].includes(co.color_usage)) { target = deco; why = 'material_component under accent/multi composition → co-observed decorative evidence (canonical §4 D02: the applied embellishment carries the contrasting colour)'; }
      else { target = first('surface') || first('material'); why = target ? 'material_component → surface/material evidence' : 'material_component with no P3 evidence to carry it — unattributed'; }
    }
    else if (a.carrier_kind === 'generic_descriptor') { target = null; why = 'generic_descriptor (structural component colour: ' + a.carrier_ref + ') has no canonical P3 owner — unattributed (informs composition through color_usage only)'; }
    else { target = null; why = a.carrier_kind + ' carriers are not EI P3 evidence — unattributed'; }
    attributions.push({ color_family: a.color_family, carrier_kind: a.carrier_kind, carrier_ref: a.carrier_ref, contrast, attributed_to: target ? target.evidence_id : null, rule: why });
    // CEO 2026-09-05 §6 — the governed RELATION travels with the carrier, so the force resolver can ask
    //   how strongly this colour separates from the body instead of merely that it exists.
    if (target && contrast) target.colour_context.contrast_carriers.push({ color_family: a.color_family, carrier_kind: a.carrier_kind, carrier_ref: a.carrier_ref, contrast_with_body: a.contrast_with_body || null });
  }
  return attributions;
}

function collectEvidence(cat, obs, co) {
  const evidence = [], excluded = [];
  let n = 0;
  const push = (family, p, v, extra) => { const e = Object.assign({ evidence_id: `EV${String(++n).padStart(2, '0')}`, pathway_family: family, source_parameter: p, source_value: v, state: 'OBSERVED', coverage: null, locations: null, canonical_id: null, colour_context: { contrast_carriers: [], color_usage: co.color_usage || null }, dedup_group: null, authority: null }, extra || {}); evidence.push(e); return e; };
  const x = obs.exposure_opening;
  if (x && x.state === 'OBSERVED' && Array.isArray(x.values)) {
    for (const v of x.values) {
      const cls = RULES.exposureClassOf(v.value);
      if (cls === 'REGION') push('P2_EXPOSURE', 'exposure_opening', v.value, { canonical_id: RULES.EXPOSURE_EI_MAP[v.value] || null, locations: v.locations || null, dedup_group: 'P2_' + (RULES.EXPOSURE_EI_MAP[v.value] || v.value), authority: 'EI-X-D4 · Exposure Canonical (Class A region = Valid Canonical Exposure)' });
      else excluded.push({ source_parameter: 'exposure_opening', source_value: v.value, reason: 'Class B designed opening — no EI mapping (⛔ never auto-derives Class A)', authority: 'Exposure freeze 2026-08-21 · Frozen Decisions L2656' });
    }
  }
  for (const p of P3_CARRIERS) {
    const o = obs[p]; if (!o || o.state !== 'OBSERVED' || !Array.isArray(o.values)) continue;
    for (const v of o.values) {
      const cls = RULES.coverageEvidenceClass(p, v.value);
      const detail = (Array.isArray(o.values_detail) ? o.values_detail.find(z => z && z.value === v.value) : null) || (typeof v === 'object' ? v : null);
      if (cls) push('P3_SURFACE_DECORATIVE', p, v.value, { canonical_id: cls, coverage: v.coverage === undefined ? null : v.coverage, locations: v.locations || null, value_detail: detail, observation: o, dedup_group: cls.split('/')[0].replace(/_.*/, ''), authority: 'EI P3 Canonical §3/§4 · COVERAGE_EVIDENCE_MAP' });
      else if ((DEFERRED[p] || []).includes(v.value)) excluded.push({ source_parameter: p, source_value: v.value, reason: 'DEFERRED_OPEN_NOT_USED — not EI evidence under current authority', authority: 'Semantic Status V1.2.1' });
      else if ((REJECTED[p] || []).includes(v.value)) excluded.push({ source_parameter: p, source_value: v.value, reason: 'standalone Embroidery REJECTED (canonical D5)', authority: 'EI P3 Canonical §4 D5' });
      else excluded.push({ source_parameter: p, source_value: v.value, reason: NON_EI_MATERIAL_NOTE, authority: 'EI P3 Canonical §5 / §10' });
    }
  }
  const pat = obs.pattern;
  // §8 PATTERN ADMISSION BOUNDARY — Pattern is a garment-EXTERIOR all-over textile pattern.
  //   A localized motif belongs to the GRAPHIC domain; an internal / lining-only motif is not admitted.
  //   The boundary is applied at the observation (a CEO-reviewed canonical correction sets such a record
  //   to ABSENT); this runtime therefore admits every OBSERVED pattern and never guesses a location.
  if (pat && pat.state === 'OBSERVED' && pat.value && pat.value !== 'None') push('P3_PATTERN', 'pattern', pat.value, { observation: pat, dedup_group: 'P3_PATTERN', authority: 'Formal Closure §3 · V1.2 §8 Pattern admission boundary (exterior all-over)' });
  const gr = obs.graphic;
  if (gr && gr.state === 'OBSERVED' && gr.value && gr.value !== 'None') push('P3_GRAPHIC', 'graphic', gr.value, { observation: gr, dedup_group: 'P3_GRAPHIC', authority: 'Formal Closure §3 · V1.2 §10 Graphic prominence' });
  // ── §7 POCKET MORPHOLOGY (V1.2) — EI-owned evidence when the realization has substantial presence ──
  //   ⛔ Ordinary pockets are NO EFFECT. ⛔ Prominence is never inferred from the Volumetric token alone.
  const pk = obs.pocket;
  if (pk && pk.state === 'OBSERVED' && pk.value === 'Present' && Array.isArray(pk.pockets) && pk.pockets.length) {
    push('P3_POCKET', 'pocket', 'Present', { observation: pk, pocket_morphology: pk.pockets,
      dedup_group: 'P3_POCKET', authority: 'V1.2 §7 Pocket Morphology EI ownership (CEO 2026-09-05) · CA#29 pocket.pockets[] single canonical carrier' });
  }
  // ── §12 ADDITIONAL COLOR (V1.2) — a salient contrasting additional-colour carrier is its own pathway ──
  //   ⛔ Never automatic. Admission requires governed prominence; a colour already attributed to an
  //      admitted evidence is absorbed there and must NOT also form a second pathway.
  for (const a of (Array.isArray(co.additional_colors) ? co.additional_colors : [])) {
    if (!a || !a.color_family || a.color_family === co.primary_color_family || a.color_family === 'uncertain') continue;
    push('P3_ADDITIONAL_COLOR', 'additional_color', a.color_family, { observation: a, value_detail: a,
      carrier_kind: a.carrier_kind || null, carrier_ref: a.carrier_ref || null,
      dedup_group: 'P3_ADDCOL_' + (a.carrier_kind || 'none') + '_' + (a.carrier_ref || 'none'),
      authority: 'V1.2 §12 Additional Color EI admission (CEO 2026-09-05)' });
  }
  const uncertain = [];
  assertEiOwnership([...P3_CARRIERS, 'pattern', 'graphic', 'exposure_opening']);
  for (const p of [...P3_CARRIERS, 'pattern', 'graphic', 'exposure_opening']) {
    const o = obs[p]; if (o && (o.state === 'UNKNOWN' || o.state === 'NOT_VISIBLE')) uncertain.push({ source_parameter: p, state: o.state, rule: 'EI-X-D2 — not confirmed absence', evidence: o.evidence || null });
  }
  const carrier_attributions = attributeCarriers(co, evidence);
  return { evidence, excluded, uncertain, carrier_attributions };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 5 — PHYSICAL PATHWAY DEDUPLICATION  (pathway normalization BEFORE force — contract dedup_policy)
// ═══════════════════════════════════════════════════════════════════════════════════════
function deduplicate(evidence) {
  const groups = [];
  const seeThrough = evidence.filter(e => e.source_parameter === 'surface' && ['Semi Transparent', 'Transparent'].includes(e.source_value));
  const byGroup = {};
  for (const e of evidence) {
    let g = e.dedup_group, rule = 'DD-1 same dedup_group', absorbed_into = null;
    if (e.source_parameter === 'surface' && e.source_value === 'Mesh' && seeThrough.length) { g = 'S08'; rule = 'DD-2 Mesh absorbed into S08 (mesh_rule)'; absorbed_into = seeThrough[0].evidence_id; }
    else if (e.source_parameter === 'surface' && e.source_value === 'Pleated' && seeThrough.length) { g = 'S08'; rule = 'DD-3 Pleated re-describing a see-through cloth = one physical pathway by default (Dedup Contract pair Semi Transparent × Pleated)'; absorbed_into = seeThrough[0].evidence_id; }
    else if (e.source_parameter === 'pattern' && e.source_value === 'Linear' && seeThrough.length && e.colour_context.contrast_carriers.length === 0) { g = 'S08'; rule = 'DD-4 tonal Linear produced by the pleat/sheer structure — absorbed (Dedup Contract pair Semi Transparent × Linear); a contrast-carrying stripe stays independent'; absorbed_into = seeThrough[0].evidence_id; }
    else if (e.source_parameter === 'decorative_detail' && e.source_value === 'Sequin-Beading' && evidence.some(x => x.source_parameter === 'surface' && x.source_value === 'Reflective')) { g = 'S03'; rule = 'DD-5 Sequin-Beading + Reflective = one pathway (canonical D02 note)'; absorbed_into = evidence.find(x => x.source_value === 'Reflective').evidence_id; }
    // DD-6 (V1.2 §15) — an additional-colour pathway whose carrier is itself an admitted EI evidence is the
    //   SAME physical phenomenon as that evidence and is absorbed into it. Two semantic labels are not two pathways.
    if (e.source_parameter === 'additional_color') {
      const host = evidence.find(x => x !== e && x.source_parameter !== 'additional_color' &&
        ((e.carrier_kind === 'attachment' && x.source_parameter === 'attachment' && x.source_value === e.carrier_ref) ||
         (e.carrier_kind === 'pattern' && x.source_parameter === 'pattern') ||
         (e.carrier_kind === 'graphic' && x.source_parameter === 'graphic') ||
         (e.carrier_kind === 'material_component' && (x.source_parameter === 'surface' || x.source_parameter === 'decorative_detail'))));
      if (host) { g = host.dedup_group; rule = 'DD-6 additional colour carried by an admitted EI evidence — one physical phenomenon'; absorbed_into = host.evidence_id; }
    }
    e.dedup_group = g; e.dedup_rule = rule; e.dedup_absorbed = !!absorbed_into; e.absorbed_into = absorbed_into;
    (byGroup[g] = byGroup[g] || []).push(e.evidence_id);
  }
  for (const [g, members] of Object.entries(byGroup)) groups.push({ dedup_group: g, member_observations: members, one_pathway: true, authority: 'Dedup Contract V1 · Semantic Status dedup_key' });
  return groups;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 6 — GENERAL FORCE RESOLUTION  (contract-executed; see ei_p3_general_force_resolver_v1.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
function resolveForces(evidence, co, ctx) { return GFR.resolveAll(evidence, co, ctx); }
/** governed closure context of the garment — read from the same observation set; never from prose, image or identity */
// ── GOVERNED FORCE CONTEXT (CEO 2026-09-06 §6) ────────────────────────────────────────────
//   The governed material families and trouser distinction, passed to the P3 resolver so the
//   EI-FINAL-D03A / D03B CASE authorities can be scoped by GOVERNED CONTEXT rather than by REF
//   identity. ⛔ These are never EI evidence: they cannot create, strengthen or admit a force —
//   they only decide whether a CEO case authority applies to an already-admitted observation.
function governedForceContext(obs) {
  const mat = obs && obs.material;
  const material_families = mat && Array.isArray(mat.values)
    ? mat.values.map(v => (v && typeof v === 'object' ? v.value : v)).filter(Boolean) : [];
  const td = obs && obs.trouser_distinction;
  const trouser_distinction = td && td.state === 'OBSERVED' && td.value ? td.value : 'NOT_GOVERNED';
  return { material_families, trouser_distinction };
}
function closureContext(obs) {
  const fo = obs.front_opening_extent;
  if (fo && fo.state === 'OBSERVED' && fo.value === 'None') return 'NONE';
  const ct = obs.closure_type;
  if (ct && ct.state === 'OBSERVED' && ct.value != null) return (ct.value === 'None' || ct.value === 'Open') ? 'NONE' : 'PRESENT';
  return 'NOT_GOVERNED';
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 7 — INDEPENDENCE  (one surviving dedup group = one pathway)  (unchanged from V1)
// ═══════════════════════════════════════════════════════════════════════════════════════
function resolveIndependence(evidence, groups) {
  const pathways = [];
  let n = 0;
  for (const g of groups) {
    const members = evidence.filter(e => g.member_observations.includes(e.evidence_id));
    const head = members.find(e => !e.dedup_absorbed) || members[0];
    const force = head.force_resolution === 'RESOLVED' ? head.force : null;
    const unresolvedMembers = members.filter(e => e.force_resolution === 'UNRESOLVED');
    pathways.push({ independent_pathway_id: `PW${String(++n).padStart(2, '0')}`, dedup_group: g.dedup_group, member_observations: g.member_observations,
      head_evidence: head.evidence_id, force, resolution_status: force ? 'RESOLVED' : (unresolvedMembers.length ? 'UNRESOLVED' : 'NO_FORCE'),
      root_cause: force ? null : (head.root_cause || null), gap_id: force ? null : (head.gap_id || null),
      // the SELECTING rule id — carried so Score-Always can be scoped to exactly one governed rule
      // rather than to a gap token that several unrelated authorities share.
      rule_selected: head.rule_selected || head.rule_id || null,
      authority: 'Independence Contract V1 — a different physical/design phenomenon; parameter count is never pathway count',
      reason: force ? `${head.source_parameter}=${head.source_value} → ${force} via ${head.rule_id}` : (head.reason || 'unresolved') });
  }
  return pathways;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 8 — DETERMINISTIC STATE TRANSITION  (no arithmetic; counts are of INDEPENDENT pathways)
// ═══════════════════════════════════════════════════════════════════════════════════════
function evidenceCondition(pathways) {
  const r = pathways.filter(p => p.resolution_status === 'RESOLVED');
  if (r.some(p => p.force === 'STRONG')) return 'ANY_STRONG';
  const m = r.filter(p => p.force === 'MEANINGFUL').length;
  if (m >= 2) return 'MULTI_MEANINGFUL';
  if (m === 1) return 'ONE_MEANINGFUL';
  if (r.length && r.every(p => p.force === 'WEAK')) return 'WEAK_ONLY';
  return 'NONE';
}
function transition(from, condition) {
  // every (starting_base × evidence_condition) cell of STATE_MACHINE_V1_1_1 has exactly one final_state — deterministic
  const t = SM.transitions.find(x => x.starting_base === from && (x.evidence_condition === condition || x.evidence_condition === 'ANY'));
  if (!t) return null;
  return { transition_rule_id: t.rule_id, from, condition, to: t.final_state, independence_requirement: t.independence_requirement, authority: t.authority, group: SM.states.groups[t.final_state] };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Stage 9 — UNRESOLVED HANDLING / MATERIALITY (admissible-force enumeration, no numbers)
// ═══════════════════════════════════════════════════════════════════════════════════════
// ── EI-P3 SCORE CONTINUITY PRINCIPLE (CEO 2026-09-06 §5 · §6 · §7 · §8) ────────────────────
//   Approval Anchor
//   CEO Decision: 2026-09-06
//   Reason:       A P3 INPUT-REPRESENTATION gap does not by itself invalidate an otherwise
//                 runnable scoring unit. The unresolved evidence contributes NO state transition
//                 but stays explicitly unresolved in the audit trace, and the final Direction is
//                 calculated from the valid Base and all remaining RESOLVED evidence.
//                 ⛔ Unresolved is NEVER relabelled NO EFFECT — the force is unknown, not absent.
//   Affected Scope: ei_direction_runtime_v1_2_7.js → materiality · run · runPair
//
//   §8 — this is deliberately NARROW. Score-Always applies ONLY to the D03A/D03B representation
//   gap on Treated Surface / Pleated. Every other fail-closed architecture keeps its existing
//   behaviour: invalid input, unrunnable unit, Base derivation failure, unknown primary colour,
//   MATCHING_PAIR Base conflict, GAP-PAIR-COORDINATION, Reflective GAP-05, the Pattern contrast
//   architecture, GAP-06 and every other CEO authority gap still suppress the Direction.
//   ⛔ "Score Always" is not a licence to disable validation or architecture firewalls.
//
//   ⛔ SCOPED BY RULE ID, NOT BY GAP TOKEN. `GAP-08` is shared vocabulary: the frozen V1.1 S02 row
//   (surface = Exotic-Skin) fails closed on the SAME gap id under a different, untouched authority.
//   Scoping by gap id would silently have converted that Exotic-Skin fail-closed row into a scored
//   Direction — precisely the overgeneralization §8 forbids. The scope is therefore the single
//   governed D03A/D03B representation-gap rule. This is a RULE identity, ⛔ not a REF/case identity.
const SCORE_ALWAYS_RULES = new Set(['GFR-S-FM4-V126-U1']);
function materiality(from, pathways) {
  const base = transition(from, evidenceCondition(pathways));
  const unresolved = pathways.filter(p => p.resolution_status === 'UNRESOLVED');
  const findings = [];
  for (const u of unresolved) {
    const outcomes = new Set();
    for (const f of FORCES) {
      const hyp = pathways.map(p => p === u ? Object.assign({}, p, { resolution_status: 'RESOLVED', force: f }) : p);
      const t = transition(from, evidenceCondition(hyp));
      outcomes.add(t ? t.group : 'UNRESOLVED');
    }
    outcomes.add(base ? base.group : 'UNRESOLVED');
    const wouldHaveChangedTheAnswer = outcomes.size > 1;
    const scoreAlways = SCORE_ALWAYS_RULES.has(u.rule_selected);
    findings.push({ pathway_id: u.independent_pathway_id, affected_evidence: u.member_observations, root_cause: u.root_cause, root_cause_display: DISPLAY[u.root_cause] || u.root_cause, gap_id: u.gap_id || null,
      // ⛔ SEMANTIC DISTINCTION (§6): this is an UNRESOLVED REPRESENTATION GAP — the force could not
      //    be judged. It is NOT a finding of NO EFFECT, which would mean the phenomenon was judged
      //    to make no EI transition. The two are never merged and never share a rule id.
      evidence_force_semantics: 'UNRESOLVED_REPRESENTATION_GAP',
      is_no_effect: false,
      force_known: false,
      used_in_transition: false,
      material_to_direction: wouldHaveChangedTheAnswer,
      score_always_exempt: scoreAlways,
      score_always_scope_rule: scoreAlways ? u.rule_selected : null,
      suppresses_final_direction: wouldHaveChangedTheAnswer && !scoreAlways,
      score_always_note: scoreAlways
        ? 'CEO 2026-09-06 §5 — a D03A/D03B input-representation gap does not suppress the Direction. This evidence is omitted from the transition and the unit is scored from the Base and the remaining resolved evidence; the gap stays recorded here.'
        : null,
      admissible_outcomes: [...outcomes].sort(), reason: u.reason,
      method: 'deterministic enumeration of admissible forces {WEAK, MEANINGFUL, STRONG} — no probability' });
  }
  return { base, findings, material: findings.some(f => f.suppresses_final_direction) };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════════════
function run(input, opts) {
  const options = opts || {};
  const trace = { runtime_version: RUNTIME_VERSION, resolver_version: GFR.RESOLVER_VERSION, input_contract_version: INPUT_CONTRACT_VERSION, authority_versions: options.authority_versions || null };
  const v = validateInput(input);
  trace.input_validation = v;
  if (!v.ok) return Object.assign(trace, { final_direction: 'INVALID_INPUT', resolution_status: 'INVALID_INPUT', unresolved_findings: [{ stage: 'INPUT', classification: 'INPUT_CONTRACT_VIOLATION', root_cause: null, reason: 'governed input failed the current 37-parameter + Colour V1 contract — ⛔ not normalized to pass', errors: v.errors }], numeric_score: null });

  const cat = input.category, obs = input.observations, co = input.color_observation;
  // ── LEGACY GENDER COMPATIBILITY FIELD (CEO 2026-09-06) ──────────────────────────────────
  //   A legacy caller may still pass scoring_context.user_gender or gender_or_provenance. Item
  //   Scoring neither requires nor consumes either for Neutral Registry resolution or for any
  //   EI / TC / SR / DM scoring physics. They are read ONLY so the supply can be recorded and the
  //   request can still be validated for backward compatibility, so an existing integration does
  //   not break. A valid legacy value has ZERO scoring effect and is never interpreted.
  const ug = readUserGender(input);
  trace.category = cat;
  trace.deprecated_gender_input = { supplied: ug.raw !== undefined, value: ug.raw === undefined ? null : ug.raw,
    source_path: ug.raw === undefined ? null : ug.path,
    // ── §18 · §19 ACCURATE LEGACY POLICY (CEO 2026-09-06) ────────────────────────────────
    //   "IGNORED" alone was inaccurate: the token is still VALIDATED, so a malformed legacy
    //   payload still fails the input contract. The validation is retained deliberately — dropping
    //   it would let a malformed request pass silently, which is an interface-safety regression.
    //   What is true is that the VALUE is never scored or interpreted.
    status: 'DEPRECATED COMPATIBILITY FIELD — accepted only in its legacy valid form (MEN | WOMEN | null); the value itself is never scored or interpreted',
    effect_on_scoring: 'NONE',
    token_still_validated: true,
    invalid_value_behaviour: 'an out-of-domain value still fails the input contract with USER_GENDER_TOKEN_INVALID — the request is rejected, ⛔ not silently accepted. This is a compatibility guard, not a scoring behaviour.',
    reason: 'CEO 2026-09-06 — Gender is removed from the EI Neutral Registry architecture and from Item Scoring entirely. The STMX application may keep account gender for product purposes; the scoring engine does not consume it.' };

  const cb = resolveColorBase(co);
  Object.assign(trace, { intrinsic_color_family: cb.intrinsic_color_family, intrinsic_color_semantic: cb.intrinsic_color_semantic, color_base: cb.color_base, color_base_authority: cb.authority, lightness_ignored: cb.lightness_ignored });
  const neutral = resolveContextualNeutral(cat, obs, cb);
  trace.neutral_registry_match = neutral.registry_row_matched;
  trace.neutral_registry_result = neutral.registry_result;
  trace.neutral_registry = neutral;

  // Stage 2.5 — governed material-specific colour authority (takes precedence over the generic row outcome)
  const matCtx = resolveMaterialColorContext(obs, cb, cat);
  trace.material_color_context = matCtx;

  const col = collectEvidence(cat, obs, co);
  const groups = deduplicate(col.evidence);        // pathway normalization first (contract dedup_policy)
  const closure_context = closureContext(obs);
  resolveForces(col.evidence, co, Object.assign({ closure_context }, governedForceContext(obs)));   // then general force resolution on surviving heads (V1.1: with the governed closure context)
  const pathways = resolveIndependence(col.evidence, groups);
  trace.observed_evidence = col.evidence;
  trace.excluded_observations = col.excluded;
  trace.uncertain_observations = col.uncertain;
  trace.carrier_attributions = col.carrier_attributions;
  trace.closure_context = { value: closure_context, source: 'front_opening_extent · closure_type (governed observations)', used_by: 'GFR-D01 closure_accounting only' };
  trace.dedup_groups = groups;
  trace.independent_pathways = pathways;
  trace.weak_count_firewall = { weak_pathways: pathways.filter(p => p.force === 'WEAK').length, rule: 'Weak pathways never aggregate into Meaningful or Strong (EI-X-D3 · DR-7)' };

  const findings = [];
  if (cb.finding) findings.push(Object.assign({ material_to_direction: true, root_cause_display: DISPLAY[cb.finding.root_cause] }, cb.finding));

  // ── BASE RESOLUTION — SINGLE PATH (CEO 2026-09-06) ──────────────────────────────────────
  //   The gender hypothesis machinery is REMOVED. With no MEN/WOMEN selector there is exactly one
  //   Registry answer, so there is exactly one starting state. ⛔ No dual-gender evaluation, no
  //   gender fail-closed path. The Denim material-colour authority still collapses ahead of the
  //   Registry exactly as before — that authority is separately frozen and is NOT reopened here.
  let hypotheses = [{ basis: 'NEUTRAL_REGISTRY_V3_GENDER_INDEPENDENT', from: startingState(cb, neutral, matCtx) }];
  if (matCtx.resolved_state) hypotheses = [{ basis: 'DENIM_NEUTRAL_ELIGIBILITY', from: matCtx.resolved_state }];
  else if (matCtx.registry_bypass) hypotheses = [{ basis: 'DENIM_INELIGIBLE_REGISTRY_BYPASS', from: cb.color_base }];

  const results = hypotheses.map(h => { const m = h.from ? materiality(h.from, pathways) : { base: null, findings: [], material: true }; return { hypothesis: h.basis, from: h.from, base: m.base, unresolved: m.findings, material: m.material }; });
  for (const f of results[0].unresolved) findings.push(f);

  let final, subtype = null, status, ruleId = null, inputState = null;
  const dirs = new Set(results.map(r => (r.base ? r.base.group : 'UNRESOLVED')));
  if (!cb.color_base) { final = 'UNRESOLVED'; status = 'UNRESOLVED'; }
  // ⛔ the dual-gender divergence branch is REMOVED — one Registry answer means one starting state.
  else {
    const r = results[0];
    if (r.material) { final = 'UNRESOLVED'; status = 'UNRESOLVED'; }
    else { final = r.base.group; subtype = r.base.to === 'CROSSOVER_NEUTRAL' || r.base.to === 'CONTEXTUAL_NEUTRAL' ? r.base.to : null; status = 'RESOLVED'; }
    ruleId = r.base ? r.base.transition_rule_id : null; inputState = r.from;
    trace.direction_if_unresolved_evidence_were_absent = r.base ? r.base.group : null;
  }
  Object.assign(trace, { transition_input_state: inputState, transition_condition: results[0].base ? results[0].base.condition : null, transition_rule_id: ruleId, transition_authority: results[0].base ? results[0].base.authority : null,
    final_state: results[0].base && status === 'RESOLVED' ? results[0].base.to : null,
    final_direction: final, neutral_subtype_if_any: subtype, resolution_status: status, unresolved_findings: findings,
    base_resolution_basis: results[0].hypothesis, gender_hypotheses_evaluated: null,   // ⛔ gender hypotheses removed (CEO 2026-09-06)
    numeric_score: null, numeric_score_rule: '⛔ no EI1–EI9, no weights, no sums — direction only' });
  return trace;
}


// ═══════════════════════════════════════════════════════════════════════════════════════
// V1.2 PAIR-LEVEL EVALUATION  (MATCHING_PAIR · CEO 2026-09-05 · §6)
// ═══════════════════════════════════════════════════════════════════════════════════════
//   A MATCHING_PAIR is ONE scoring unit. Member Directions are NEVER finalized separately and
//   never averaged, majority-voted, or proxied through target_1.
//     one shared pair-level Base → evidence collected across BOTH members → physical dedup →
//     independence → force → the normal state machine ONCE → one final pair Direction.
//   ⛔ Inconsistent member Bases are NOT fused: a valid set is one intentional same-colour /
//      same-material design, so an opposite-Base pair is a classification/extraction inconsistency
//      and is dispositioned for review (fail closed).
// ── §9 governed cross-member coordination ────────────────────────────────────────────────
//   The ONLY admissible proof that two member observations are one realization is a governed
//   cross-target visual relation on the record. Nothing is inferred from tokens, order or identity.
function pairRelations(input) {
  const r = input && (input.cross_target_visual_relations || input.relations);
  return Array.isArray(r) ? r : [];
}
// When the INDEPENDENT reading is evaluated, the previously-absorbed evidence must become its own
//   dedup group so that resolveIndependence really counts it as a second pathway.
function regroupIndependent(evidence, groups, ambiguous) {
  const out = groups.map(g => ({ dedup_group: g.dedup_group, member_observations: g.member_observations.slice(), rule: g.rule }));
  for (const amb of ambiguous) {
    for (const g of out) {
      const i = g.member_observations.indexOf(amb.other);
      if (i >= 0) g.member_observations.splice(i, 1);
    }
    out.push({ dedup_group: 'PAIR_INDEPENDENT_' + amb.other, member_observations: [amb.other],
      rule: 'hypothesis INDEPENDENT — the second member realization counted as its own pathway' });
  }
  return out.filter(g => g.member_observations.length);
}
function coordinated(a, b, relations) {
  if (!relations.length) return false;
  return relations.some(rel => {
    if (!rel || typeof rel !== 'object') return false;
    const params = [].concat(rel.parameter || rel.parameters || []);
    const members = [].concat(rel.member_garment_refs || rel.targets || rel.members || []);
    const paramOk = !params.length || params.includes(a.source_parameter);
    const valueOk = rel.value == null || rel.value === a.source_value;
    const memberOk = !members.length || (members.includes(a.member_id) && members.includes(b.member_id));
    return paramOk && valueOk && memberOk;
  });
}
function runPair(input) {
  const members = Array.isArray(input.members) ? input.members : [];
  const trace = { runtime_version: RUNTIME_VERSION, input_contract_version: INPUT_CONTRACT_VERSION,
    scoring_unit_type: 'MATCHING_PAIR', member_count: members.length,
    members: members.map(m => ({ member_id: m.member_id, category: m.category })),
    pair_evaluation: true, proxy_used: false };
  if (members.length < 2) return Object.assign(trace, { resolution_status: 'INVALID_INPUT', errors: [{ code: 'PAIR_MEMBERS_MISSING', message: 'a MATCHING_PAIR requires at least two members' }] });
  // member order must never change the result
  const ordered = members.slice().sort((a, b) => String(a.member_id).localeCompare(String(b.member_id)));
  // ── shared pair Base ──
  const bases = ordered.map(m => {
    const cb = resolveColorBase(m.color_observation);
    const neutral = resolveContextualNeutral(m.category, m.observations, cb);   // §18 — pair members use the SAME gender-independent Registry as single garments
    const matCtx = resolveMaterialColorContext(m.observations, cb, m.category);
    return { member_id: m.member_id, category: m.category, color_base: cb.color_base,
      intrinsic_color_family: cb.intrinsic_color_family, registry_result: neutral.registry_result,
      material_color_context: matCtx, start: startingState(cb, neutral, matCtx) };
  });
  trace.member_bases = bases;
  const distinct = [...new Set(bases.map(b => b.start))];
  if (distinct.some(x => x == null)) return Object.assign(trace, { resolution_status: 'UNRESOLVED', final_direction: 'UNRESOLVED',
    unresolved_findings: [{ root_cause: ROOT.IRG, material_to_direction: true, reason: 'a pair member could not resolve a colour base', affected: 'color_observation.primary_color_family' }] });
  if (distinct.length > 1) return Object.assign(trace, { resolution_status: 'PAIR_BASE_INCONSISTENT', final_direction: 'UNRESOLVED',
    pair_base_candidates: distinct,
    unresolved_findings: [{ root_cause: ROOT.IRG, material_to_direction: true,
      reason: 'the members of this MATCHING_PAIR resolve to different starting bases (' + distinct.join(' vs ') + '). A valid set is one intentional same-colour / same-material design, so this is a scoring-unit classification or extraction inconsistency, not a normal fusion condition. ⛔ Not fused · not averaged · not proxied to one member.',
      affected: 'scoring unit membership / member extraction' }] });
  const pairBase = distinct[0];
  trace.pair_base = pairBase;
  trace.pair_base_derivation = 'every member independently resolves ' + pairBase + ' under the current Base architecture (Base Character · Denim Neutral Eligibility · Neutral Registry V2); the shared value is the pair Base.';
  // ── evidence across both members ──
  let all = [], excluded = [], uncertain = [], attributions = [];
  for (const m of ordered) {
    const col = collectEvidence(m.category, m.observations, m.color_observation);
    for (const e of col.evidence) { e.member_id = m.member_id; e.evidence_id = m.member_id + ':' + e.evidence_id; }
    for (const x of col.excluded) x.member_id = m.member_id;
    all = all.concat(col.evidence); excluded = excluded.concat(col.excluded); uncertain = uncertain.concat(col.uncertain);
    attributions = attributions.concat((col.carrier_attributions || []).map(a => Object.assign({ member_id: m.member_id }, a)));
  }
  // ── cross-member physical dedup: the same physical phenomenon on a matched set is ONE pathway ──
  const groups = deduplicate(all);
  const seen = new Map();
  const relations = pairRelations(input);
  const ambiguous = [];
  for (const e of all) {
    if (e.dedup_absorbed) continue;
    const key = e.source_parameter + '=' + e.source_value + '|' + (e.canonical_id || e.dedup_group);
    if (seen.has(key)) {
      const host = seen.get(key);
      // ── DD-PAIR-1b (CEO 2026-09-05 · Independent Review §9) ────────────────────────────────
      //   ⛔ SEMANTIC EQUALITY IS NOT PHYSICAL IDENTITY. The V1.2 rule concluded that the same
      //      source_parameter and source_value on two members had to be one phenomenon. Two members
      //      of a set can legitimately carry the same token as two SEPARATE realizations.
      //   Cross-member evidence is merged ONLY when the governed representation actually says the
      //   two belong to one coordinated physical/visual realization. Otherwise we do NOT guess:
      //   the group is marked AMBIGUOUS and both hypotheses are evaluated downstream, so an
      //   ambiguity that could change the Direction fails closed instead of being silently merged.
      //   ⛔ No member order. ⛔ No REF identity. ⛔ No target_1 preference.
      if (coordinated(host, e, relations)) {
        e.dedup_absorbed = true; e.absorbed_into = host.evidence_id;
        e.dedup_rule = 'DD-PAIR-1b governed cross-target visual relation declares these one coordinated realization';
        e.cross_member_absorbed = true; e.cross_member_coordination = 'GOVERNED';
      } else {
        e.cross_member_coordination = 'NOT_GOVERNED';
        host.cross_member_coordination = 'NOT_GOVERNED';
        ambiguous.push({ host: host.evidence_id, other: e.evidence_id, token: e.source_parameter + '=' + e.source_value,
          members: [host.member_id, e.member_id],
          gap: 'CROSS_MEMBER_COORDINATION_NOT_GOVERNED',
          reason: 'both members carry ' + e.source_parameter + '=' + e.source_value + ', but the governed representation does not say whether that is ONE coordinated realization across the set or TWO independent realizations. ⛔ Not merged and not counted twice by assumption — both readings are evaluated.' });
      }
    }
    else seen.set(key, e);
  }
  for (const m of ordered) {
    const ctx = Object.assign({ closure_context: closureContext(m.observations) }, governedForceContext(m.observations));
    resolveForces(all.filter(e => e.member_id === m.member_id), m.color_observation, ctx);
  }
  const pathways = resolveIndependence(all, groups);
  // ── §9.2 FAIL CLOSED ON UNGOVERNED CROSS-MEMBER COORDINATION ──────────────────────────
  //   For every ambiguous pair the two readings are enumerated deterministically:
  //     MERGED      — the two member observations are one coordinated realization (one pathway)
  //     INDEPENDENT — they are two separate realizations (two pathways)
  //   If both readings yield the SAME final Direction the ambiguity is immaterial and the unit
  //   resolves, with the ambiguity still recorded. If they differ, the unit FAILS CLOSED as
  //   UNRESOLVED and names the exact representation gap. ⛔ We never pick one to get an answer.
  trace.cross_member_ambiguities = ambiguous;
  if (ambiguous.length) {
    const outcomes = new Set();
    for (const hyp of ['MERGED', 'INDEPENDENT']) {
      const cloned = JSON.parse(JSON.stringify(all));
      for (const amb of ambiguous) {
        const other = cloned.find(x => x.evidence_id === amb.other);
        if (!other) continue;
        if (hyp === 'MERGED') { other.dedup_absorbed = true; other.absorbed_into = amb.host; }
        else { other.dedup_absorbed = false; other.absorbed_into = null; }
      }
      const gs = JSON.parse(JSON.stringify(groups)).map(gr => Object.assign({}, gr));
      const pw = resolveIndependence(cloned, hyp === 'MERGED' ? gs : regroupIndependent(cloned, gs, ambiguous));
      const m = materiality(pairBase, pw);
      outcomes.add(m.base ? m.base.group : 'UNRESOLVED');
    }
    // ── §3.1 (CEO 2026-09-05) — OUTCOME EQUIVALENCE MAY NOT ERASE UNCERTAINTY ────────────────
    //   V1.2.1 enumerated both readings and RESOLVED the unit whenever they happened to agree.
    //   That is not the CEO rule. The physical relation between the two member observations is
    //   genuinely ungoverned; the fact that two guesses coincide is not evidence that the question
    //   is answered. An ungoverned cross-member physical relation ALWAYS fails closed.
    //   `outcomes` is still computed and reported, because the reviewer should see whether the
    //   ambiguity would have changed the Direction — but it never decides the disposition.
    const outcome_equivalent = outcomes.size === 1;
    const material = true;
    trace.cross_member_ambiguity_material = true;
    trace.cross_member_outcome_equivalent = outcome_equivalent;
    trace.unresolved_findings = (trace.unresolved_findings || []).concat(ambiguous.map(a => Object.assign({}, a, {
      root_cause: 'INPUT_REPRESENTATION_GAP', gap_id: 'GAP-PAIR-COORDINATION',
      root_cause_display: 'CROSS_MEMBER_PHYSICAL_RELATION_NOT_GOVERNED',
      material_to_direction: true, outcome_equivalent_across_readings: outcome_equivalent,
      admissible_outcomes: [...outcomes].sort(),
      why_not_resolved: outcome_equivalent
        ? 'both readings happen to yield the same Direction, but the physical relation is still ungoverned. ⛔ Outcome equivalence is NOT evidence of physical identity and may not erase the uncertainty.'
        : 'the two readings yield different Directions, so the ambiguity is directly material.',
      method: 'deterministic enumeration of the MERGED and INDEPENDENT readings — no probability, no member order, no default' })));
    if (material) {
      trace.transition_input_state = pairBase;
      trace.final_direction = 'UNRESOLVED'; trace.final_state = null; trace.neutral_subtype_if_any = null;
      trace.resolution_status = 'UNRESOLVED'; trace.numeric_score = null;
      trace.observed_evidence = all; trace.excluded_observations = excluded; trace.uncertain_observations = uncertain;
      trace.carrier_attributions = attributions; trace.dedup_groups = groups; trace.independent_pathways = pathways;
      trace.evidence_by_member = ordered.map(m => ({ member_id: m.member_id, evidence: all.filter(e => e.member_id === m.member_id).map(e => e.source_parameter + '=' + e.source_value + ' → ' + (e.force || e.force_resolution) + (e.dedup_absorbed ? ' (absorbed)' : '')) }));
      return trace;
    }
  }
  trace.observed_evidence = all; trace.excluded_observations = excluded; trace.uncertain_observations = uncertain;
  trace.carrier_attributions = attributions; trace.dedup_groups = groups; trace.independent_pathways = pathways;
  trace.evidence_by_member = ordered.map(m => ({ member_id: m.member_id, evidence: all.filter(e => e.member_id === m.member_id).map(e => e.source_parameter + '=' + e.source_value + ' → ' + (e.force || e.force_resolution) + (e.dedup_absorbed ? ' (absorbed)' : '')) }));
  // ── one state machine pass ──
  const m2 = materiality(pairBase, pathways);
  const findings = m2.findings.slice();
  trace.transition_input_state = pairBase;
  if (!m2.base) { trace.resolution_status = 'UNRESOLVED'; trace.final_direction = 'UNRESOLVED'; trace.unresolved_findings = findings; return trace; }
  // ⚠ IMPLEMENTATION DEFECT FIXED (CEO 2026-09-05 · §22 execution defect, reported separately).
  //   The pair path read `m2.base.rule_id` and `m2.base.final_state`; `transition()` returns
  //   `transition_rule_id` and `to`. Both were therefore undefined on EVERY pair trace, which also
  //   made the regression's member-order-invariance check compare undefined to undefined — vacuous.
  //   It also returned RESOLVED unconditionally, ignoring a MATERIAL unresolved pathway, which the
  //   single-garment path correctly treats as UNRESOLVED. The pair path now mirrors `run()` exactly.
  trace.transition_condition = m2.base.condition; trace.transition_rule_id = m2.base.transition_rule_id;
  trace.transition_authority = m2.base.authority;
  trace.direction_if_unresolved_evidence_were_absent = m2.base.group;
  if (m2.material) {
    trace.final_state = null; trace.final_direction = 'UNRESOLVED'; trace.neutral_subtype_if_any = null;
    trace.resolution_status = 'UNRESOLVED';
  } else {
    trace.final_state = m2.base.to; trace.final_direction = m2.base.group;
    trace.neutral_subtype_if_any = m2.base.to === 'CROSSOVER_NEUTRAL' || m2.base.to === 'CONTEXTUAL_NEUTRAL' ? m2.base.to : null;
    trace.resolution_status = 'RESOLVED';
  }
  trace.unresolved_findings = findings;
  trace.numeric_score = null;
  return trace;
}

module.exports = { runPair, run, validateInput, resolveColorBase, resolveContextualNeutral, resolveMaterialColorContext, denimNeutralEligible, assertEiOwnership, startingState, DENIM, OWNERSHIP, collectEvidence, deduplicate, resolveForces, closureContext, resolveIndependence, evidenceCondition, transition, materiality, RUNTIME_VERSION, INPUT_CONTRACT_VERSION, ROOT, DISPLAY, FORCES, GFR };
