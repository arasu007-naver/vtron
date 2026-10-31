'use strict';
/**
 * STMX — EI P3 GENERAL FORCE RESOLVER V1.1
 * =====================================================================================
 * V1.1 CORRECTION (supersedes ei_p3_general_force_resolver_v1.js for exactly two evidence rules):
 *   (A) pattern=Grid — the universal "contrasting Grid → MEANINGFUL" condition is removed; a contrasting Grid is
 *       UNRESOLVED · INPUT_REPRESENTATION_GAP · GAP-12 (extent / location of a Grid is not governed).
 *   (B) attachment=Metal Hardware — new realization input closure_accounting (canonical D01 exclusion clause):
 *       a contrast certified only by a carrier bound to the hardware itself, on a garment whose functional closure
 *       is present or not governed, at Localized / not-governed extent → UNRESOLVED · GAP-13 (GFR-D01-U5).
 *   closure_context (NONE | PRESENT | NOT_GOVERNED) is supplied by the runtime from the SAME governed observation set
 *   (front_opening_extent · closure_type). Every other rule and input is byte-identical to V1.
 * =====================================================================================
 * Resolves ANY governed EI evidence (known or novel realization) to WEAK / MEANINGFUL / STRONG /
 * UNRESOLVED from its governed realization evidence alone, by executing the machine contract
 * STMX_EI_P3_GENERAL_FORCE_RESOLUTION_CONTRACT_V1.json.
 *
 *   governed observation → realization inputs (contrast_grade · extent · composition ·
 *   contrast_family_count · absorbed · class_gate) → ordered, mutually-exclusive conditions → outcome
 *
 * ⛔ No calibration-case lookup, no reference-id branch, no image identity, no similarity, no
 *    nearest-neighbour, no numeric weights / points / thresholds. Conditions are predicates over
 *    enumerated inputs. Every outcome carries the condition id, the inputs evaluated and the authority.
 * ⛔ Direction only. Never emits a number.
 */
const fs = require('fs');
const path = require('path');

const RESOLVER_VERSION = 'STMX_EI_P3_GENERAL_FORCE_RESOLVER_V1_1';
// ── P3 CONTRACT BINDING (CEO 2026-09-06 §10 · §11 · §33) ──────────────────────────────────
//   Approval Anchor
//   CEO Decision: 2026-09-06
//   Reason:       A formal freeze cannot proceed with two contradictory ACTIVE contracts. The two
//                 files play DIFFERENT roles and the binding now says so explicitly instead of
//                 leaving it implicit:
//                   · V1.1 is the LEGACY EXECUTABLE RULE TABLE the first resolution stage reads.
//                     It is preserved verbatim and is NOT the current authority statement.
//                   · V1.2 is the CURRENT AUTHORITY. It classifies every clause as final general
//                     rule / final case authority / representation-dependent / unresolved CEO
//                     authority / superseded historical, and links each superseded clause.
//                 Exactly ONE file is marked current. ⛔ Neither was overwritten.
//   Affected Scope: ei_p3_general_force_resolver_v1_1.js → contract binding · module exports
const CONTRACT_FILE = 'STMX_EI_P3_GENERAL_FORCE_RESOLUTION_CONTRACT_V1_1.json';   // legacy executable rule table
const CONTRACT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contracts', CONTRACT_FILE), 'utf8'));
const CURRENT_CONTRACT_FILE = 'STMX_EI_P3_GENERAL_FORCE_RESOLUTION_CONTRACT_V1_6.json';   // CURRENT authority
const CURRENT_CONTRACT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contracts', CURRENT_CONTRACT_FILE), 'utf8'));
const CONTRACT_ROLES = {
  legacy_executable_rule_table: { file: CONTRACT_FILE, is_current_authority: false, status: CONTRACT.status },
  current_authority: { file: CURRENT_CONTRACT_FILE, is_current_authority: true, status: CURRENT_CONTRACT.status },
};

const HARD_OPTICAL_GATED = { surface: ['Transparent', 'Semi Transparent', 'Reflective'] };
const VALUE_GATE_EXTENT = { 'graphic=Localized': 'LOCALIZED', 'graphic=Dominant': 'DOMINANT', 'pattern=Repeat': 'DOMINANT' };
const COVERAGE_TO_EXTENT = { Localized: 'LOCALIZED', Partial: 'PARTIAL', Dominant: 'DOMINANT' };

// ── realization inputs — derived deterministically from the governed observation ─────────
function closureAccounting(e, extent, carriers, ctx) {
  if (!(e.source_parameter === 'attachment' && e.source_value === 'Metal Hardware')) return 'NOT_APPLICABLE';
  const cc = ctx && ctx.closure_context ? ctx.closure_context : 'NOT_GOVERNED';
  if (extent === 'PARTIAL' || extent === 'DOMINANT') return 'INDEPENDENT';                                   // canonical D01: multiple / repeated / oversized hardware ≠ one closure
  const selfBound = carriers.length > 0 && carriers.every(c => c.carrier_kind === 'attachment' && c.carrier_ref === e.source_value);
  if (carriers.length > 0 && !selfBound) return 'INDEPENDENT';                                               // contrast bound to another attachment carrier (e.g. Belt buckle plate)
  if (cc === 'NONE') return 'INDEPENDENT';                                                                    // no functional closure exists on the garment
  return 'CLOSURE_ACCOUNTABLE';                                                                               // closure PRESENT or NOT_GOVERNED — the hardware may be the closure itself
}
// V1.2 — the governed realization metadata carried by the observation (COVERAGE / density / count).
//   ⛔ Existing governed vocabulary only: coverage ∈ {Localized, Partial, Dominant}; density ∈ {sparse, dense}.
function realizationOf(e) {
  const d = e.value_detail || {};
  const o = e.observation || {};
  const coverage = d.coverage || e.coverage || o.coverage || null;
  const density = d.density || o.density || null;
  const count = typeof d.count === 'number' ? d.count : (typeof o.count === 'number' ? o.count : null);
  const locations = Array.isArray(d.locations) ? d.locations : (Array.isArray(o.locations) ? o.locations : []);
  // §5 — motif complexity is a governed OBSERVATION on the pattern carrier. Absent ⇒ NOT_GOVERNED,
  //   never defaulted to Simple: "we did not observe complexity" is not "the motif is simple".
  const motif_complexity = d.motif_complexity || o.motif_complexity || null;
  // §6 — Pattern dominance is its OWN carrier. ⛔ pattern.coverage no longer exists, so a
  //   "Localized Pattern" is unrepresentable rather than merely discouraged.
  const visual_dominance = d.visual_dominance || o.visual_dominance || null;
  // §10 — the finish realization of a surface evidence (Baseline / Enhanced / Pronounced).
  const finish_realization = d.finish_realization || o.finish_realization || null;
  // §16 RESUME-1C — the treated-surface realization of a surface evidence (Baseline / Distressed).
  //   ⛔ PROJECTION ONLY. It is read and exposed so the runtime can SEE it; ⛔ no ladder rule
  //   consumes it and ⛔ no force is derived from it in this version.
  //   ⛔ Absent ⇒ NOT_GOVERNED. It is NEVER defaulted to Baseline: "we did not observe the
  //   realization" is not "the realization is ordinary" (§13 · §20 backward compatibility).
  const treated_surface_realization = d.treated_surface_realization || o.treated_surface_realization || null;
  return { coverage: coverage || 'NOT_GOVERNED', density: density || 'NOT_GOVERNED', count, locations,
    motif_complexity: motif_complexity || 'NOT_GOVERNED',
    visual_dominance: visual_dominance || 'NOT_GOVERNED',
    finish_realization: finish_realization || 'NOT_GOVERNED',
    treated_surface_realization: treated_surface_realization || 'NOT_GOVERNED' };
}
function realizationInputs(e, co, ctx) {
  const key = e.source_parameter + '=' + e.source_value;
  const carriers = (e.colour_context && e.colour_context.contrast_carriers) || [];
  const families = new Set(carriers.map(c => c.color_family));
  const usage = co && co.color_usage ? co.color_usage : 'NOT_GOVERNED';
  const contrast_grade = families.size === 0 ? 'TONAL' : (usage === 'subtle' ? 'SUBTLE' : 'DISTINCT');
  let extent = 'NOT_GOVERNED', extent_source = 'none';
  if (e.pathway_family === 'P3_SURFACE_DECORATIVE') { if (e.coverage && COVERAGE_TO_EXTENT[e.coverage]) { extent = COVERAGE_TO_EXTENT[e.coverage]; extent_source = 'coverage'; } }
  else if (VALUE_GATE_EXTENT[key]) { extent = VALUE_GATE_EXTENT[key]; extent_source = 'value_gate'; }
  const class_gate = (HARD_OPTICAL_GATED[e.source_parameter] || []).includes(e.source_value) ? 'HARD_OPTICAL' : 'NONE';
  const closure_accounting = closureAccounting(e, extent, carriers, ctx);
  const rz = realizationOf(e);
  // ── §6 RELATIONAL BASE↔CARRIER CONTRAST (CEO 2026-09-05) ─────────────────────────────────
  //   The governed relation, read from additional_colors[].contrast_with_body on the carriers
  //   attributed to THIS evidence. ⛔ It is NOT the presence of a contrast carrier, and it is NOT
  //   color_usage: same-family suppression already guarantees the families differ, so presence
  //   carries no information about how strongly the colour separates from the body.
  //   The STRONGEST governed relation among this evidence's own carriers wins; absent ⇒ NOT_GOVERNED.
  const RANK = { Tonal: 1, Subtle: 2, Distinct: 3 };
  const rel = carriers.map(c => c.contrast_with_body).filter(v => RANK[v]);
  const base_contrast_relation = rel.length ? rel.sort((a, b) => RANK[b] - RANK[a])[0] : 'NOT_GOVERNED';
  const own = (e.value_detail && e.value_detail.contrast_with_body) || (e.observation && e.observation.contrast_with_body) || null;
  // ── GOVERNED GARMENT CONTEXT for the D03A / D03B case scopes (CEO 2026-09-06 §6) ────────
  //   Carried on ctx exactly as closure_context is. ⛔ Never EI evidence — these values only
  //   decide whether a CEO CASE authority applies; they never create or strengthen a force.
  const material_families = (ctx && Array.isArray(ctx.material_families)) ? ctx.material_families : [];
  const trouser_distinction = (ctx && ctx.trouser_distinction) || 'NOT_GOVERNED';
  return { contrast_grade, extent, extent_source, composition: usage, contrast_family_count: families.size, absorbed: !!e.dedup_absorbed, class_gate, closure_accounting,
    material_families, trouser_distinction,
    base_contrast_relation, own_contrast_relation: RANK[own] ? own : 'NOT_GOVERNED', motif_complexity: rz.motif_complexity,
    visual_dominance: rz.visual_dominance, finish_realization: rz.finish_realization,
    // §16 RESUME-1C — exposed to the runtime for observability. ⛔ No gate reads it, ⛔ no force.
    treated_surface_realization: rz.treated_surface_realization,
    coverage: rz.coverage, density: rz.density, instance_count: rz.count, location_count: rz.locations.length,
    carrier_bound_to_other_attachment: carriers.some(c => c.carrier_kind === 'attachment' && c.carrier_ref !== e.source_value),
    closure_context: closure_accounting === 'NOT_APPLICABLE' ? null : ((ctx && ctx.closure_context) || 'NOT_GOVERNED'),
    contrast_families: [...families].sort(), extent_not_governed: extent === 'NOT_GOVERNED' && e.pathway_family !== 'P2_EXPOSURE' };
}

// ── predicate evaluation (no arithmetic beyond an integer comparison on a count) ─────────
function holds(p, inputs) {
  const v = inputs[p.input];
  switch (p.op) {
    case 'eq': return v === p.value;
    case 'neq': return v !== p.value;
    case 'in': return Array.isArray(p.value) && p.value.includes(v);
    case 'gte': return typeof v === 'number' && v >= p.value;
    case 'lte': return typeof v === 'number' && v <= p.value;
    default: throw new Error('unknown predicate op ' + p.op);
  }
}

function ruleFor(e) {
  if (e.pathway_family === 'P2_EXPOSURE') return CONTRACT.rules.find(r => r.evidence_rule_id === 'GFR-P2-EXPOSURE');
  return CONTRACT.rules.find(r => r.source_parameter === e.source_parameter && r.source_value === e.source_value) || null;
}

/**
 * Resolve one evidence record in place. Requires dedup to have run (e.dedup_absorbed known) and carrier
 * attribution to have run (e.colour_context.contrast_carriers). Mutates e and returns it.
 */
function resolveEvidence(e, co, ctx) {
  const inputs = realizationInputs(e, co, ctx);
  e.realization_inputs = inputs;
  e.resolver_version = RESOLVER_VERSION;
  if (inputs.absorbed) {
    e.force = null; e.force_resolution = 'ABSORBED'; e.root_cause = null; e.gap_id = null; e.rule_id = e.dedup_rule ? e.dedup_rule.split(' ')[0] : 'DEDUP';
    e.reason = 'absorbed into ' + e.absorbed_into + ' — ' + e.dedup_rule + ' (contract dedup_policy: an absorbed observation never receives a force of its own)';
    e.rules_evaluated = []; e.rule_selected = null; return e;
  }
  const rule = ruleFor(e);
  if (!rule) {
    // An admitted EI evidence with no contract row is a contract-completeness defect, not a force outcome.
    e.force = null; e.force_resolution = 'UNRESOLVED'; e.root_cause = 'SCORING_PHYSICS_ERROR'; e.gap_id = null; e.rule_id = null;
    e.reason = 'no general-resolution rule exists for ' + e.source_parameter + '=' + e.source_value + ' — contract completeness defect (must be fixed in the contract, never by a default)';
    e.rules_evaluated = []; e.rule_selected = null; return e;
  }
  e.evidence_rule_id = rule.evidence_rule_id; e.resolution_mode = rule.resolution_mode; e.canonical_id = e.canonical_id || rule.canonical_evidence_id;
  const evaluated = [];
  let selected = null;
  for (const cid of rule.rule_precedence) {
    const c = rule.conditions.find(x => x.condition_id === cid);
    const match = c.when.every(p => holds(p, inputs));
    evaluated.push({ condition_id: cid, when: c.when, matched: match });
    if (match && !selected) selected = c;
  }
  e.rules_evaluated = evaluated;
  if (!selected) {
    e.force = null; e.force_resolution = 'UNRESOLVED'; e.root_cause = 'SCORING_PHYSICS_ERROR'; e.gap_id = null; e.rule_id = rule.evidence_rule_id; e.rule_selected = null;
    e.reason = 'no condition of ' + rule.evidence_rule_id + ' covers realization ' + JSON.stringify(inputs) + ' — contract coverage defect (never defaulted)';
    return e;
  }
  e.rule_id = selected.condition_id; e.rule_selected = selected.condition_id; e.authority = selected.authority;
  if (selected.outcome === 'RESOLVED') { e.force = selected.force; e.force_resolution = 'RESOLVED'; e.root_cause = null; e.gap_id = null; e.reason = selected.why; }
  else { e.force = null; e.force_resolution = 'UNRESOLVED'; e.root_cause = selected.root_cause; e.gap_id = selected.gap_id; e.reason = selected.why; }
  e.force_mode_taxonomy = ['pattern', 'graphic'].includes(e.source_parameter) ? 'NOT_APPLICABLE (S/D matrix taxonomy; evidence is still EI evidence — Formal Closure §3)' : (e.pathway_family === 'P2_EXPOSURE' ? 'P2 (EI-X-D4)' : 'FM2 realization-conditional / FM4 per the frozen Force Resolution Matrix row');
  return e;
}

// ══════════════════════════════════════════════════════════════════════════════════════
// V1.2 FINAL REALIZATION RESOLUTION (CEO 2026-09-05)
//   Applied AFTER the V1.1 general rules; it overrides only the families the CEO finalized.
//   Every decision reads governed realization evidence. ⛔ No token→force shortcut.
// ══════════════════════════════════════════════════════════════════════════════════════
// Each family is a DECLARATIVE CONDITION LADDER in precedence order, exactly like the V1.1 contract
// rows: every condition is evaluated and recorded, and the FIRST match is selected. That keeps the
// trace explainable — realization inputs · every condition evaluated · the condition selected ·
// outcome · authority — and makes "same token, different force" auditable rather than asserted.
//   ⛔ No condition may read a REF id, a case id, a file name or any free text.
// REFINE_ONLY. A spec marked `refine_only` may only CHANGE an outcome the V1.1 rules already
// produced, and only when the newly governed realization evidence (coverage · density) is actually
// present. If no refinement condition matches, the V1.1 outcome stands untouched — the frozen CEO
// force anchors that the V1.1 realization rules already reproduce are never discarded, and no
// UNRESOLVED is manufactured for a record that simply predates the new representation.
//   Hardware / Pocket / Additional Color / surface FM4 are NOT refine_only: §7 · §9 · §12 · D03A
//   are explicit CEO re-legislations of admission, with their own case authorities.
const T = (id, when, out, why, extra) => Object.assign({ condition_id: id, when, why }, out, extra || {});
const RES = f => ({ outcome: 'RESOLVED', force: f });
const NOT = { outcome: 'NOT_ADMITTED', force: null };
const appliedVolumetric = e => (e.pocket_morphology || []).filter(p => {
  const c = p && p.construction, pr = p && p.projection;
  const cv = c && typeof c === 'object' ? c.value : c, pv = pr && typeof pr === 'object' ? pr.value : pr;
  return cv === 'Applied' && pv === 'Volumetric';
});
const AUTH = {
  hardware: 'CEO 2026-09-05 §9 Metal Hardware final admission architecture',
  pocket: 'CEO 2026-09-05 §7 Pocket Morphology final EI ownership · CA#29',
  pattern: 'CEO 2026-09-05 §11 Pattern force final realization architecture',
  graphic: 'CEO 2026-09-05 §10 Graphic prominence final architecture',
  addcol: 'CEO 2026-09-05 §12 Additional Color final EI admission architecture',
  surface: 'CEO 2026-09-05 D03A / D03B Treated Surface · Pleated realization',
};
const V12 = {
  // ── §9 METAL HARDWARE ────────────────────────────────────────────────────────────────────
  //   Ordinary functional hardware with low visual salience is NOT EI evidence. Design presence
  //   must come from governed realization evidence: extent, repeated placement, a non-closure
  //   carrier, or the absence of any functional closure the hardware could merely be.
  //   ⛔ Prohibited: Zipper = Meaningful · Button = Meaningful · Metal Hardware = Meaningful.
  // ── §9 METAL HARDWARE (CEO 2026-09-05 · Independent Review §8) ──────────────────────────
  //   Ordinary functional hardware with no meaningful design presence is NO EFFECT.
  //   ⛔ The V1.2 branch that resolved WEAK for hardware with NO design presence and NO contrast —
  //      i.e. WEAK merely because the hardware exists — is REMOVED. Weak is reserved for hardware
  //      that DOES have governed design presence but carries no contrast.
  //   ⛔ Prohibited: Zipper = Meaningful · Button = Meaningful · Metal Hardware = Meaningful.
  hardware: { family: 'attachment=Metal Hardware', authority: AUTH.hardware, ladder: [
    T('GFR-D01-V121-M1', ['design_presence', 'has_contrast_carrier'], RES('MEANINGFUL'),
      'deliberately exposed hardware with governed design presence and a contrasting carrier — it reads as a design feature, not a closure mechanism'),
    T('GFR-D01-V121-W1', ['design_presence'], RES('WEAK'),
      'hardware with governed design presence but no contrast carrier — visually present, direction-invariant'),
    T('GFR-D01-V121-N1', ['!design_presence'], NOT,
      'ordinary functional hardware with no governed design presence (no extent · no repeated placement · no non-closure carrier) — NO EFFECT. Existing is not a force.'),
  ] },
  // ── §7 POCKET MORPHOLOGY ─────────────────────────────────────────────────────────────────
  //   EI-owned only when the realized construction produces substantial visible expressive presence.
  //   ⛔ Prohibited: Pocket / Cargo Pocket / Applied / Volumetric = Meaningful.
  //   ⛔ Prominence is NEVER inferred from Volumetric alone — governed multiplicity or extent is required.
  pocket: { family: 'pocket', authority: AUTH.pocket, ladder: [
    T('GFR-POCKET-V12-M1', ['applied_volumetric_morphology', 'multiplicity'], RES('MEANINGFUL'),
      'multiple large Applied/Volumetric pockets with governed multiplicity or extent — substantial visible expressive presence'),
    T('GFR-POCKET-V12-N2', ['applied_volumetric_morphology'], NOT,
      'a single Applied/Volumetric pocket group with no governed multiplicity or extent — prominence is not inferred from the Volumetric token alone; NO EFFECT',
      { representation_note: 'POCKET_PROMINENCE_NOT_GOVERNED' }),
    T('GFR-POCKET-V12-N1', ['!applied_volumetric_morphology'], NOT,
      'ordinary pocket construction (no Applied/Volumetric morphology in the governed pockets[] carrier) — NO EFFECT'),
  ] },
  // ── §11 PATTERN FORCE ────────────────────────────────────────────────────────────────────
  //   Force = relative Base↔Pattern contrast × governed dominance × governed density.
  //   ⛔ Prohibited: Linear = Strong · Repeat = Strong · Grid = Meaningful · Multi-color = Strong.
  // ── §11 PATTERN FORCE — ALL FOUR CEO FACTORS (CEO 2026-09-05 · Independent Review §4/§6) ──
  //   1. relative Base↔Pattern contrast  → base_contrast_relation (the governed RELATION)
  //   2. motif complexity                → motif_complexity
  //   3. density / repetition intensity  → density
  //   4. visual dominance / coverage     → coverage
  //   ⛔ These are combined by DETERMINISTIC SEMANTIC CONDITIONS. There is deliberately NO
  //      "contrast × density × dominance" arithmetic anywhere (§6.1).
  //   ⛔ Prohibited: Linear = Strong · Repeat = Strong · Grid = Meaningful · multicolor = Strong.
  //   REFINE_ONLY — the ladder speaks only when the governed RELATION exists. Where the corpus has
  //   no governed relation the prior realization outcome stands, so no frozen anchor is discarded
  //   and no UNRESOLVED is manufactured for a record that predates the representation.
  // ── §11 PATTERN FORCE — FOUR FACTORS, NO STALE GAPS (CEO 2026-09-05 · §4 · §5 · §6) ──────
  //   1 relative Base↔Pattern contrast · 2 motif complexity · 3 density · 4 visual dominance
  //   ⛔ NOT refine_only any more. §5.1: when the architecture requires a governed factor and that
  //      factor is unavailable, the honest answer is a REPRESENTATION INSUFFICIENCY — not a fallback
  //      to old generic token physics merely to preserve an old output, and not a CEO-authority gap.
  //   ⛔ GAP-01 / GAP-02 are retired here: the Pattern force architecture IS decided.
  //   ⛔ GAP-12 is retired: the exterior/all-over question is answered at ADMISSION (§4), so an
  //      admitted Pattern already satisfies the exterior all-over semantics and no Grid branch may
  //      re-ask it. A localized motif is a GRAPHIC and never reaches this ladder.
  pattern: { family: 'pattern', authority: AUTH.pattern, ladder: [
    T('GFR-PAT-V122-U1', ['!relational_contrast_governed'], { outcome: 'UNRESOLVED', force: null, root_cause: 'INPUT_REPRESENTATION_GAP', gap_id: 'GAP-PAT-CONTRAST' },
      'the relative Base↔Pattern contrast is not governed on this record. §11 makes contrast the gating factor, so the force cannot be resolved — representation insufficiency, ⛔ never a token fallback'),
    T('GFR-PAT-V123-W1', ['pattern_reads_as_body'], RES('WEAK'),
      'the pattern reads as the same TONAL family as the body — it does not separate at all. ⛔ This fires on Tonal ONLY, under the separately frozen P3-D-1 definition "tonal ⇒ Weak"; a Subtle relation is contrasting and continues into the four-factor evaluation below'),
    T('GFR-PAT-V122-S1', ['pattern_separates_from_base', 'pattern_visually_dominant', 'governed_density_dense'], RES('STRONG'),
      'a separating pattern that is both visually dominant and dense — the realization carries the garment'),
    T('GFR-PAT-V122-S2', ['pattern_separates_from_base', 'compound_motif', 'pattern_visually_dominant'], RES('STRONG'),
      'a separating COMPOUND motif that is visually dominant — motif complexity carries what a single-element motif at the same dominance would not'),
    T('GFR-PAT-V122-M1', ['pattern_separates_from_base', 'pattern_dominance_governed'], RES('MEANINGFUL'),
      'a separating pattern whose governed dominance is present but reaches neither the dominant-and-dense nor the compound-and-dominant threshold'),
    T('GFR-PAT-V122-U2', ['pattern_separates_from_base', '!pattern_dominance_governed'], { outcome: 'UNRESOLVED', force: null, root_cause: 'INPUT_REPRESENTATION_GAP', gap_id: 'GAP-PAT-DOMINANCE' },
      'the pattern separates from the base but its visual dominance is not governed. §11 factor 4 is required and no governed value exists — representation insufficiency'),
  ] },
  // ── §10 GRAPHIC PROMINENCE ───────────────────────────────────────────────────────────────
  //   ⛔ Prohibited: Localized = Weak · Dominant = Strong, or any token mapped directly to a force.
  graphic: { family: 'graphic', authority: AUTH.graphic, refine_only: true, ladder: [
    T('GFR-GR-V12-M1', ['has_contrast_carrier', 'governed_extent_substantial'], RES('MEANINGFUL'),
      'a clearly visible graphic composition with governed prominence — more than an incidental placed motif'),
  ] },
  // ── §9 GLOSSY FINISH REALIZATION — surface = Glossy ONLY (CEO 2026-09-05 · scoped 2026-09-06) ─
  //   ⛔ This ladder is NOT the generic Surface ladder. It answers ONE question: is this gloss the
  //      material/category baseline, an intentionally enhanced finish, or a pronounced one?
  //      Treated Surface · Pleated · Reflective · Textured Knit and every other Surface token keep
  //      their own governed meanings and never enter here.
  //   The Glossy OBSERVATION alone never determines force. What determines it is whether the finish
  //   is the ordinary baseline of this material and category, or something deliberately added.
  //   ⛔ Prohibited: Glossy = Meaningful · Partial Glossy = Meaningful · Leather Glossy = Meaningful ·
  //      Puffer Glossy = No Effect · Satin = Weak. None of those is a rule; all five CEO cases are
  //      separated by the governed finish realization and its governed extent.
  // ── EI-FINAL-D03A / D03B TREATED SURFACE · PLEATED (CEO 2026-09-05, restored 2026-09-06) ──
  //   Approval Anchor
  //   CEO Decision: 2026-09-06
  //   Reason:       V1.2.2 deleted this ladder and redirected Treated Surface and Pleated into the
  //                 Glossy finish-realization ladder. That was an unauthorized scope expansion: it
  //                 turned the DECIDED EI-FINAL-D03A (338 · 520 · 521 · 525 · 598) and D03B
  //                 (REF_000541#SU2) case authorities into false GAP-SURFACE-FINISH gaps.
  //                 The ladder is restored verbatim from V1.2.1; its semantics are unchanged.
  //   Affected Scope: ei_p3_general_force_resolver_v1_1.js → V12.surfaceFM4 · registry routing
  //   ⛔ NOT a universal "Treated Surface = Meaningful" or "Pleated = No Effect" token rule —
  //      governed extent is what separates the decided cases.
  // ── TREATED SURFACE · PLEATED (CEO 2026-09-06 §5 · §6 · §7 · §15) ────────────────────────
  //   Approval Anchor
  //   CEO Decision: 2026-09-06
  //   Reason:       V1.2.3 restored this ladder as a UNIVERSAL extent→force rule:
  //                   governed substantial extent → MEANINGFUL, otherwise → NO EFFECT.
  //                 That was an over-generalization. EI-FINAL-D03A and D03B are CASE authorities,
  //                 not universal token physics, and the old negative branch could not tell a
  //                 governed-but-small extent from an ABSENT one — so "unknown" was silently read
  //                 as "ordinary" and answered NO EFFECT. §7 forbids exactly that.
  //   Affected Scope: ei_p3_general_force_resolver_v1_1.js → V12.surfaceFM4
  //
  // ── D03A / D03B CASE-AUTHORITY DECONTAMINATION (CEO 2026-09-06 §3 · §4 · §13) ────────────
  //   Approval Anchor
  //   CEO Decision: 2026-09-06
  //   Reason:       V1.2.4/V1.2.5 carried three generalizations that were never CEO-approved as
  //                 universal production physics. All three are REMOVED here:
  //                   (A-1) GFR-S-FM4-V12-M1  governed substantial extent → MEANINGFUL
  //                   (A-2) GFR-S-FM4-V124-N1 Treated Surface + material Denim → NO EFFECT
  //                   (A-3) GFR-S-FM4-V124-N2 Pleated + Tailored trouser → NO EFFECT
  //   Affected Scope: ei_p3_general_force_resolver_v1_1.js → V12.surfaceFM4 · predicates
  //
  //   ⛔ Coverage ≠ Force. Coverage ≠ Prominence. Token name alone ≠ force. Material alone cannot
  //      judge the expressive force of a realization, and neither can a category or trouser
  //      distinction. What the CEO decided in EI-FINAL-D03A (338 · 520 · 521 · 525 · 598) and
  //      D03B (REF_000541#SU2) is CALIBRATION CASE AUTHORITY, not universal token physics, and
  //      §4 forbids manufacturing a proxy rule whose only purpose is to reproduce a case answer.
  //
  //   §13 — no genuine CEO-approved GENERAL physics currently exists that can judge Treated
  //   Surface / Pleated force from the governed representation, so the honest answer is a
  //   representation gap. ⛔ An empty general rule is NOT invented to fill the space.
  //   The gap is GAP-08, the repository's existing controlled input-representation gap; ⛔ no new
  //   gap vocabulary is created. Under the §5 SCORE-ALWAYS principle this evidence contributes no
  //   state transition yet never suppresses the unit's final Direction, and it is ⛔ NEVER
  //   relabelled NO EFFECT — see materiality() in the runtime.
  // ── TREATED SURFACE FORCE AUTHORITY (CEO 2026-09-07) ───────────────────────────────────────
  //   Approval Anchor
  //   CEO Decision:   2026-09-07 · Order: EI DIRECTION — FINAL RESIDUAL CLOSURE V1 §2
  //   Reason:         The governed realization observation `treated_surface_realization` now
  //                   exists on the scored population (live governed run, 2026-09-07), so the
  //                   representation gap that GFR-S-FM4-V126-U1 recorded is answered for those
  //                   targets. The CEO assigned the force directly:
  //                     Baseline   → NO EFFECT   (ordinary wash / fade / whiskering / abrasion
  //                                  does not independently create expressive force)
  //                     Distressed → MEANINGFUL  (deliberate fraying, distress patching,
  //                                  shredding, tearing, fabric-plane disruption)
  //   Affected Scope: ei_p3_general_force_resolver_v1_1.js → V12.surfaceFM4 · predicates
  //
  //   ⛔ This is NOT a token rule. `surface = Treated Surface` alone still decides nothing — the
  //      GOVERNED REALIZATION decides, exactly as the gloss ladder is decided by finish_realization.
  //   ⛔ NOT a severity ladder. V1 is deterministic and binary; `Structural` does not exist.
  //   ⛔ Coverage / extent is still NOT force: all three Baseline targets are coverage=Dominant.
  //   ⛔ Material, category and trouser distinction remain forbidden proxies (D03A/D03B §3).
  //   ⛔ PLEATED IS UNAFFECTED. It shares this ladder but carries no realization observation, so
  //      neither rule below can match it and it still falls through to GFR-S-FM4-V126-U1.
  //   ⛔ MISSING REALIZATION IS UNAFFECTED — it also falls through, and is ⛔ NEVER read as Baseline.
  surfaceFM4: { family: 'surface FM4', authority: AUTH.surface, ladder: [
    T('GFR-S-FM4-V127-N1', ['treated_surface_baseline'], NOT,
      'the governed realization of this treated surface is Baseline — ordinary wash, fade, whiskering or abrasion, with the fabric plane continuous and undamaged. An ordinary finishing treatment that this material routinely carries is not self-expression, so it carries no expressive force: NO EFFECT'),
    T('GFR-S-FM4-V127-M1', ['treated_surface_distressed'], RES('MEANINGFUL'),
      'the governed realization of this treated surface is Distressed — a deliberate disruption of the fabric plane (intentional fraying, distress patching, shredding, tearing). A chosen visible act of destruction materially changes how expressive the item reads: MEANINGFUL'),
    T('GFR-S-FM4-V126-U1', [], { outcome: 'UNRESOLVED', force: null, root_cause: 'INPUT_REPRESENTATION_GAP', gap_id: 'GAP-08' },
      'the realization information needed to judge this surface treatment\'s expressive force is not established by the governed representation. ⛔ Extent / coverage is not force, the material is not force, and the trouser distinction is not force — none of them may stand in for the missing judgement. The force stays UNRESOLVED as an input-representation gap: ⛔ this is NOT a finding of NO EFFECT'),
  ] },
  surfaceFinish: { family: 'surface finish', authority: AUTH.surface, ladder: [
    T('GFR-SFIN-V122-N1', ['finish_baseline'], NOT,
      'ordinary sheen inherent to this material and category — the finish is the baseline, nothing was added, so it carries no expressive information: NO EFFECT'),
    T('GFR-SFIN-V122-M2', ['finish_pronounced'], RES('MEANINGFUL'),
      'an extreme, dominant high-gloss realization — materially changes the visual impression'),
    T('GFR-SFIN-V122-M1', ['finish_enhanced', 'governed_extent_substantial'], RES('MEANINGFUL'),
      'a deliberately treated finish beyond the material baseline, at governed extent — it materially affects the visual impression'),
    T('GFR-SFIN-V122-W1', ['finish_enhanced'], RES('WEAK'),
      'a treated finish that is perceptible but conventional or localized — visible, yet it does not materially change how expressive the item reads'),
    T('GFR-SFIN-V122-U1', ['!finish_governed'], { outcome: 'UNRESOLVED', force: null, root_cause: 'INPUT_REPRESENTATION_GAP', gap_id: 'GAP-SURFACE-FINISH' },
      'the finish realization is not governed on this record, so the runtime cannot tell ordinary material sheen from an intentionally enhanced finish. ⛔ Coverage alone cannot answer it — representation insufficiency'),
  ] },
  // ── §12 ADDITIONAL COLOR ─────────────────────────────────────────────────────────────────
  //   ⛔ Prohibited: Additional Color / Camel / Belt / Contrast Belt = Meaningful.
  // ── §7 ADDITIONAL COLOR — CONTRAST **AND** PROMINENCE (CEO 2026-09-05) ──────────────────
  //   A Meaningful additional-colour pathway requires BOTH a governed relative body↔colour contrast
  //   AND governed visual prominence. Either alone is not enough.
  //   ⛔ Prohibited: Additional Color = Meaningful · Camel = Meaningful · Belt = Meaningful ·
  //      Partial coverage = Meaningful.
  additionalColour: { family: 'additional_color', authority: AUTH.addcol, ladder: [
    T('GFR-ADDCOL-V121-M1', ['differentiated_from_body', 'governed_extent_substantial'], RES('MEANINGFUL'),
      'a visually salient additional-colour carrier that is BOTH meaningfully differentiated from the body colour AND governed as prominent'),
    T('GFR-ADDCOL-V121-N1', ['own_contrast_governed', '!differentiated_from_body'], NOT,
      'the additional colour reads as the same tonal family as the body — no relative contrast, so prominence alone cannot make it expressive'),
    T('GFR-ADDCOL-V121-N2', ['!governed_extent_substantial'], NOT,
      'minor / incidental additional-colour detail with no governed prominence — NO EFFECT'),
    T('GFR-ADDCOL-V121-N3', ['!own_contrast_governed'], NOT,
      'the colour is prominent but its RELATION to the body colour is not governed. §7 requires contrast as well as prominence, so this cannot be admitted — NO EFFECT, and the missing relation is recorded',
      { representation_note: 'ADDITIONAL_COLOUR_CONTRAST_NOT_GOVERNED' }),
  ] },
};
// PREDICATES};
// PREDICATES — every name is a question asked ONLY of governed realization evidence.
function predicate(name, ri, e) {
  switch (name) {
    case 'design_presence':
      return ri.coverage === 'Partial' || ri.coverage === 'Dominant'   // governed extent
        || ri.location_count >= 2                                       // governed repeated placement
        || !!ri.carrier_bound_to_other_attachment                        // contrast carried by another attachment
        || (ri.closure_accounting === 'INDEPENDENT' && ri.closure_context === 'NONE'); // no closure to be
    case 'has_contrast_carrier': return ri.contrast_grade !== 'TONAL';
    case 'separates_from_base': return ri.contrast_grade !== 'TONAL' && ri.contrast_grade !== 'SUBTLE';
    case 'governed_extent_substantial': return ri.coverage === 'Partial' || ri.coverage === 'Dominant';
    case 'governed_extent_dominant': return ri.coverage === 'Dominant';
    case 'governed_density_dense': return ri.density === 'dense';
    case 'governed_realization_present': return ri.coverage != null && ri.coverage !== 'NOT_GOVERNED';
    case 'governed_prominence_localized': return ri.coverage === 'Localized';
    // ── §6 · §7 RELATIONAL CONTRAST predicates (CEO 2026-09-05) ────────────────────────────
    //   Answered ONLY from the governed contrast_with_body relation. ⛔ Never from presence,
    //   never from color_usage, never from family difference.
    case 'relational_contrast_governed': return ri.base_contrast_relation !== 'NOT_GOVERNED';
    // ── §8 · §9 PATTERN CONTRAST (CEO 2026-09-06) ─────────────────────────────────────────
    //   Approval Anchor
    //   CEO Decision: 2026-09-06
    //   Reason:       V1.2.2 hard-capped a SUBTLE relation to WEAK, which short-circuited the
    //                 CEO-final four-factor Pattern architecture — motif complexity, density and
    //                 visual dominance could never be reached once contrast was Subtle. The CEO
    //                 ruled that "Subtle contrast ≠ universal Weak force". The cap is removed.
    //   Affected Scope: ei_p3_general_force_resolver_v1_1.js → pattern predicates
    //
    //   TONAL keeps its WEAK answer, and only because a SEPARATELY FROZEN rule explicitly requires
    //   it: the frozen P3 force definitions (P3-D-1) state "tonal ⇒ Weak and contrasting ⇒
    //   Meaningful". §8 permits exactly that exception and no other.
    //   Under those same frozen definitions SUBTLE is a *contrasting* relation, not a tonal one, so
    //   it separates from the base and proceeds into the four-factor evaluation.
    //   ⚠ Openly recorded: the V1.1.2-era bullet "Tonal / subtle Grid → WEAK" is SUPERSEDED for the
    //     subtle half by this CEO decision. It is superseded, not hidden.
    //   ⚠ Openly recorded: no CEO case authority for a SUBTLE pattern exists in the corpus — all
    //     four backfilled records carry Distinct. The Subtle branch is therefore derived from the
    //     frozen contrast definitions, not case-validated. Reported in the CEO Word.
    case 'pattern_separates_from_base': return ri.base_contrast_relation === 'Distinct' || ri.base_contrast_relation === 'Subtle';
    case 'pattern_reads_as_body': return ri.base_contrast_relation === 'Tonal';
    case 'own_contrast_governed': return ri.own_contrast_relation !== 'NOT_GOVERNED';
    case 'differentiated_from_body': return ri.own_contrast_relation === 'Subtle' || ri.own_contrast_relation === 'Distinct';
    // ── §5 MOTIF COMPLEXITY predicate ───────────────────────────────────────────────────
    case 'compound_motif': return ri.motif_complexity === 'Compound';
    // ── §6 PATTERN VISUAL DOMINANCE ─────────────────────────────────────────────────────
    case 'pattern_dominance_governed': return ri.visual_dominance !== 'NOT_GOVERNED';
    case 'pattern_visually_dominant': return ri.visual_dominance === 'Dominant';
    // ── D03A / D03B CASE-AUTHORITY SCOPES — ⛔ REMOVED (CEO 2026-09-06 §3 A-2 · A-3) ─────
    //   `treated_surface_on_denim` and `pleat_on_tailored_trouser` existed ONLY to reproduce the
    //   REF_000520 / REF_000521 and REF_000541#SU2 case answers through a material / distinction
    //   proxy. §4 forbids a proxy created solely to reproduce a case answer, so both predicates
    //   are deleted rather than left unreferenced. The case authorities themselves are PRESERVED
    //   as calibration truth in the CEO case-authority audit — ⛔ not as production physics.
    // ── §9 / §10 GLOSSY & SURFACE FINISH REALIZATION ────────────────────────────────────
    // ── TREATED SURFACE REALIZATION FORCE (CEO 2026-09-07 · FINAL RESIDUAL CLOSURE §2) ──────
    //   ⛔ Every predicate re-asserts source_value === 'Treated Surface' INDEPENDENTLY. Pleated
    //      shares this ladder, so a predicate that relied on ladder order alone would leak onto
    //      Pleated the moment a rule is reordered. ⛔ It must be impossible, not merely unlikely.
    case 'treated_surface_realization_governed':
      return e.source_value === 'Treated Surface' && ri.treated_surface_realization !== 'NOT_GOVERNED';
    case 'treated_surface_baseline':
      return e.source_value === 'Treated Surface' && ri.treated_surface_realization === 'Baseline';
    case 'treated_surface_distressed':
      return e.source_value === 'Treated Surface' && ri.treated_surface_realization === 'Distressed';
    case 'finish_governed': return ri.finish_realization !== 'NOT_GOVERNED';
    case 'finish_baseline': return ri.finish_realization === 'Baseline';
    case 'finish_enhanced': return ri.finish_realization === 'Enhanced';
    case 'finish_pronounced': return ri.finish_realization === 'Pronounced';
    case 'applied_volumetric_morphology': return appliedVolumetric(e).length > 0;
    case 'multiplicity':
      return ri.density === 'dense' || ri.coverage === 'Partial' || ri.coverage === 'Dominant'
        || (ri.instance_count != null && ri.instance_count >= 2) || appliedVolumetric(e).length >= 2;
    default: throw new Error('unknown V1.2 realization predicate: ' + name);
  }
}
const holdsV12 = (token, ri, e) => token[0] === '!' ? !predicate(token.slice(1), ri, e) : predicate(token, ri, e);
function runLadder(spec, e, ri) {
  const evaluated = [];
  let selected = null;
  for (const c of spec.ladder) {
    const matched = c.when.every(t => holdsV12(t, ri, e));
    evaluated.push({ condition_id: c.condition_id, when: c.when, matched });
    if (matched && !selected) selected = c;
  }
  return { evaluated, selected, authority: spec.authority };
}

function applyV12(evidence, ctx) {
  for (const e of evidence) {
    if (e.dedup_absorbed) continue;
    const ri = e.realization_inputs || {};
    let spec = null;
    if (e.source_parameter === 'attachment' && e.source_value === 'Metal Hardware') spec = V12.hardware;
    else if (e.source_parameter === 'pocket') spec = V12.pocket;
    else if (e.source_parameter === 'pattern') spec = V12.pattern;
    else if (e.source_parameter === 'graphic') spec = V12.graphic;
    else if (e.source_parameter === 'additional_color') spec = V12.additionalColour;
    // ── §3 · §4 SURFACE OWNERSHIP (CEO 2026-09-06) ─────────────────────────────────────────
    //   ⛔ There is NO generic "all Surface tokens require finish_realization" rule. Each Surface
    //      phenomenon keeps its own governed EI meaning and its own finalized case authorities.
    //   Glossy         → the §9/§10 Glossy finish-realization ladder (CEO 2026-09-05).
    //   Treated Surface / Pleated → EI-FINAL-D03A / D03B, which are separately DECIDED
    //      (338 · 520 · 521 · 525 · 598 / REF_000541#SU2). Routing them through Glossy semantics
    //      destroyed those authorities — the V1.2.2 scope-expansion defect this order repairs.
    //   Reflective     → NOT routed here. It is HARD_OPTICAL_GATED and its tier is a separate
    //      open CEO question; it may not enter the Glossy ladder merely for living under `surface`.
    else if (e.source_parameter === 'surface' && e.source_value === 'Glossy') spec = V12.surfaceFinish;
    else if (e.source_parameter === 'surface' && ['Treated Surface', 'Pleated'].includes(e.source_value)) spec = V12.surfaceFM4;
    if (!spec) continue;
    const r = runLadder(spec, e, ri);
    if (spec.refine_only && !r.selected) {
      // No governed realization to refine with — the V1.1 realization outcome stands, and the
      // refinement ladder is still recorded so the trace shows it was evaluated and did not fire.
      e.v12_applied = false;
      e.v12_refinement_evaluated = r.evaluated;
      e.v12_refinement_result = 'NOT_APPLIED — no governed realization (coverage / density) on this record; the V1.1 realization outcome is preserved';
      continue;
    }
    e.v12_applied = true;
    e.v12_superseded_v1_1 = spec.refine_only ? { rule_selected: e.rule_selected, force: e.force, force_resolution: e.force_resolution } : null;
    e.rules_evaluated = (spec.refine_only ? (e.rules_evaluated || []) : []).concat(r.evaluated); // V1.1 ladder + V1.2 refinement
    e.authority = [r.authority];
    if (!r.selected) {
      // A ladder that covers nothing is a contract-completeness defect, never a default force.
      e.force = null; e.force_resolution = 'UNRESOLVED'; e.root_cause = 'SCORING_PHYSICS_ERROR'; e.gap_id = null;
      e.rule_selected = null; e.rule_id = null;
      e.reason = 'no V1.2 condition of ' + spec.family + ' covers realization ' + JSON.stringify(ri) + ' — contract coverage defect (never defaulted)';
      continue;
    }
    const s = r.selected;
    e.rule_selected = s.condition_id; e.rule_id = s.condition_id;
    e.reason = s.why; e.why = s.why;
    e.representation_note = s.representation_note || null;
    if (s.outcome === 'RESOLVED') { e.force = s.force; e.force_resolution = 'RESOLVED'; e.root_cause = null; e.gap_id = null; }
    else if (s.outcome === 'NOT_ADMITTED') { e.force = null; e.force_resolution = 'NOT_ADMITTED'; e.root_cause = null; e.gap_id = null; e.not_admitted_reason = s.why; }
    else { e.force = null; e.force_resolution = 'UNRESOLVED'; e.root_cause = s.root_cause; e.gap_id = s.gap_id; }
  }
  return evidence;
}
function resolveAll(evidence, co, ctx) { for (const e of evidence) resolveEvidence(e, co, ctx); applyV12(evidence, ctx); return evidence; }
function _legacyResolveAll(evidence, co, ctx) { for (const e of evidence) resolveEvidence(e, co, ctx); return evidence; }

/**
 * Contract self-check used by tests and QA: for every rule, the conditions must be mutually exclusive
 * and jointly exhaustive over the finite realization-input space, so evaluation order is never physics.
 */
function contractExclusivityReport() {
  const CG = ['TONAL', 'SUBTLE', 'DISTINCT'], EX = ['LOCALIZED', 'PARTIAL', 'DOMINANT', 'NOT_GOVERNED'], CO = ['single', 'subtle', 'accent', 'multi', 'NOT_GOVERNED'], CNT = [0, 1, 2, 3], GATE = ['HARD_OPTICAL', 'NONE'];
  const report = [];
  for (const r of CONTRACT.rules) {
    let overlaps = 0, uncovered = 0, cells = 0;
    // class_gate is token-implied, so only the gate value this token can actually carry is enumerated
    const gateOf = (HARD_OPTICAL_GATED[r.source_parameter] || []).includes(r.source_value) ? 'HARD_OPTICAL' : 'NONE';
    // closure_accounting is a D01-only input; other tokens carry NOT_APPLICABLE and never reference it
    const CA = (r.source_parameter === 'attachment' && r.source_value === 'Metal Hardware') ? ['INDEPENDENT', 'CLOSURE_ACCOUNTABLE'] : ['NOT_APPLICABLE'];
    for (const contrast_grade of CG) for (const extent of EX) for (const composition of CO) for (const contrast_family_count of CNT) for (const class_gate of GATE.filter(g => g === gateOf)) for (const closure_accounting of CA) {
      // consistency constraints of the derivation: TONAL ⇔ count 0 ; SUBTLE ⇔ composition subtle & count ≥1 ; DISTINCT ⇒ count ≥1 & composition ≠ subtle ; PARTIAL/DOMINANT ⇒ INDEPENDENT
      if ((contrast_grade === 'TONAL') !== (contrast_family_count === 0)) continue;
      if (contrast_grade === 'SUBTLE' && composition !== 'subtle') continue;
      if (contrast_grade === 'DISTINCT' && composition === 'subtle') continue;
      if ((extent === 'PARTIAL' || extent === 'DOMINANT') && closure_accounting === 'CLOSURE_ACCOUNTABLE') continue;
      const inputs = { contrast_grade, extent, composition, contrast_family_count, absorbed: false, class_gate, closure_accounting };
      cells++;
      const m = r.conditions.filter(c => c.when.every(p => holds(p, inputs))).length;
      if (m > 1) overlaps++; if (m === 0) uncovered++;
    }
    report.push({ evidence_rule_id: r.evidence_rule_id, cells, overlapping_cells: overlaps, uncovered_cells: uncovered, mutually_exclusive: overlaps === 0, exhaustive: uncovered === 0 });
  }
  return report;
}

module.exports = { applyV12, V12, realizationOf, runLadder, predicate, RESOLVER_VERSION, CONTRACT_FILE, CONTRACT, CURRENT_CONTRACT_FILE, CURRENT_CONTRACT, CONTRACT_ROLES, realizationInputs, closureAccounting, holds, ruleFor, resolveEvidence, resolveAll, contractExclusivityReport };
