'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3 — PER-SYSTEM PROMINENCE DERIVATION (DERIVED relation · never an observation · never a number).
 * Direct executable realization of the sealed V2.3.53 lane derivation specification (bound input `lane_derivation_specification`):
 *   prominence_predicate.{BODY_FORM · CONSTRUCTION · MATERIAL_SURFACE · DECORATION} · prominence_predicate.UNKNOWN
 *   classic_organising_role.relation · transformative_organising_reading.relation · tie_rule (none)
 * Every clause below carries its specification text VERBATIM (`spec`); assertSpecTranscription() fails closed unless each text is present in the
 * bound specification, so the implementation cannot silently diverge from the preregistered rule.
 * Evaluation of PROMINENT(system) — one system at a time, never comparing systems, never summing:
 *   (a) UNKNOWN   if ANY required fact of the system is not settled (spec: "any required fact NOT_VISIBLE / UNKNOWN … → UNKNOWN") — literal reading:
 *                 UNKNOWN takes precedence over a satisfied clause; "not settled" = NOT_VISIBLE / UNKNOWN, and (reusing the V2 realizationState
 *                 convention) any EXCLUDED_* or non-canonical state; a missing Atomic block for the member is not settled either.
 *                 Also UNKNOWN if a present construction referent carries no governed prominence fact (spec: "not governed for its referent").
 *   (b) PROMINENT if at least one clause is satisfied by OBSERVED facts.
 *   (c) NOT_PROMINENT otherwise.
 * A fact whose key is lawfully not emitted (KEY_OMITTED) or observed ABSENT is settled and simply cannot satisfy a clause.
 * Colour contrast (colour_v1 contrast_with_body) is referenced by NO clause and is therefore not consumed.
 * ⛔ no score · no weight · no count · no ranking · no tier · no REF / key branching.
 */
const V = require('./tc_semantic_vocabulary_v3');

const LOWER_SILHOUETTE_CATEGORIES = Object.freeze(['Trouser', 'Skirt', 'Dress', 'Jumpsuit']); // categories whose silhouette is governed (Producer V1_3 silhouetteDomain ≠ null) — test-pinned
const CONSTRUCTION_LINEAGE = /^observations\.(collar|closure_type|cuff_type|pocket|attachment)$/;
const MS_FAMILIES = Object.freeze(['surface_pattern', 'surface_treatment']);
const DEC_FAMILIES = Object.freeze(['graphic', 'attached_detail', 'attached_hardware', 'decorative_construction', 'designed_color_contrast']);

const tokenState = (e) => { if (!e || e.state === 'KEY_OMITTED' || e.state === 'ABSENT') return 'NOT_EMITTED'; if (e.state === 'OBSERVED') return 'OBSERVED'; return 'NOT_SETTLED'; };
const tokenValues = (e) => (e ? [].concat(e.value !== undefined && e.value !== null ? [e.value] : [], Array.isArray(e.values) ? e.values : []) : []);
const coverages = (e) => (e && Array.isArray(e.values_detail) ? e.values_detail.map((d) => d.coverage).filter((c) => c !== undefined) : []);
const primSettled = (p) => p && p.state === 'OBSERVED';

// clause := { id, spec, facts(member) → [{fact, settled}] , fires(member) → [evidence] }
function tokenFact(m, p) { const e = m.tokens ? m.tokens[p] : undefined; return { fact: 'token:' + p, settled: m.tokens ? tokenState(e) !== 'NOT_SETTLED' : false, state: m.tokens ? (e ? e.state : 'KEY_OMITTED') : 'PROJECTION_MISSING' }; }
function tokenIn(m, p, set) { const e = m.tokens && m.tokens[p]; if (tokenState(e) !== 'OBSERVED') return []; return tokenValues(e).filter((v) => set.includes(v)).map((v) => ({ fact: 'token:' + p, value: v })); }
function coverageIn(m, params, set) { const out = []; for (const p of params) { const e = m.tokens && m.tokens[p]; if (tokenState(e) !== 'OBSERVED') continue; for (const c of coverages(e)) if (set.includes(c)) out.push({ fact: 'token:' + p + '.values_detail.coverage', value: c }); } return out; }
const dmMissing = (m) => !m.sa2 || !m.sa2.block_present;
function dmFacts(m, pred, prims) { if (dmMissing(m)) return [{ fact: 'SA-2 block', settled: false, state: 'BLOCK_MISSING' }];
  return m.sa2.evidence.filter(pred).flatMap((e) => prims.map((p) => ({ fact: 'SA-2:' + e.evidence_id + '.' + p, settled: primSettled(e[p]), state: e[p] ? e[p].state : 'MISSING' }))); }
function dmFires(m, pred, test) { if (dmMissing(m)) return []; return m.sa2.evidence.filter(pred).filter(test).map((e) => ({ fact: 'SA-2:' + e.evidence_id, family: e.evidence_family, relative_size: e.relative_size.value, contrast: e.contrast.value, spatial_position: e.spatial_position.value, lineage: e.source_observation_refs })); }
const isConstructionLineage = (e) => (e.source_observation_refs || []).some((r) => CONSTRUCTION_LINEAGE.test(r));

const CLAUSES = Object.freeze({
  BODY_FORM: [
    { id: 'BF-1', spec: 'fit ∈ {Oversized, Voluminous}', facts: (m) => [tokenFact(m, 'fit')], fires: (m) => tokenIn(m, 'fit', ['Oversized', 'Voluminous']) },
    { id: 'BF-2', spec: 'sleeve_volume = Voluminous', facts: (m) => [tokenFact(m, 'sleeve_volume')], fires: (m) => tokenIn(m, 'sleeve_volume', ['Voluminous']) },
    { id: 'BF-3', spec: 'shoulder_structure ∈ {Strong, Extreme}', facts: (m) => [tokenFact(m, 'shoulder_structure')], fires: (m) => tokenIn(m, 'shoulder_structure', ['Strong', 'Extreme']) },
    { id: 'BF-4', spec: 'silhouette ∈ {Flared, Widening, Wide, Voluminous} (lower garments)',
      facts: (m) => (LOWER_SILHOUETTE_CATEGORIES.includes(m.category) ? [tokenFact(m, 'silhouette')] : []),
      fires: (m) => (LOWER_SILHOUETTE_CATEGORIES.includes(m.category) ? tokenIn(m, 'silhouette', ['Flared', 'Widening', 'Wide', 'Voluminous']) : []) },
  ],
  CONSTRUCTION: [
    { id: 'CON-1', spec: 'collar_scale = Enlarged', facts: (m) => [tokenFact(m, 'collar_scale')], fires: (m) => tokenIn(m, 'collar_scale', ['Enlarged']) },
    { id: 'CON-2', spec: 'cuff_scale = Enlarged', facts: (m) => [tokenFact(m, 'cuff_scale')], fires: (m) => tokenIn(m, 'cuff_scale', ['Enlarged']) },
    { id: 'CON-3', spec: 'pocket_projection = Volumetric', facts: (m) => [tokenFact(m, 'pocket_projection')], fires: (m) => tokenIn(m, 'pocket_projection', ['Volumetric']) },
    { id: 'CON-4', spec: 'axis-neutral primitive instance on a constitutive construction referent (collar/lapel · closure/placket · cuff · pocket system · shoulder · waist construction): relative_size = large ∨ contrast = high  [REQUIRES SCOPE AMENDMENT SA-1]',
      facts: (m) => (m.sa1 === null ? [{ fact: 'SA-1 block', settled: false, state: 'BLOCK_MISSING' }] : m.sa1.flatMap((i) => ['relative_size', 'contrast'].map((p) => ({ fact: 'SA-1:' + i.referent + '.' + p, settled: primSettled(i[p]), state: i[p] ? i[p].state : 'MISSING' })))),
      fires: (m) => (m.sa1 === null ? [] : m.sa1.filter((i) => (primSettled(i.relative_size) && i.relative_size.value === 'large') || (primSettled(i.contrast) && i.contrast.value === 'high')).map((i) => ({ fact: 'SA-1:' + i.referent, relative_size: i.relative_size.value, contrast: i.contrast.value }))) },
    { id: 'CON-5', spec: 'DM designed-detail evidence whose source_observation_refs name a construction parameter (collar · closure_type · cuff_type · pocket · attachment) with relative_size = large ∨ contrast = high  [REQUIRES CONSUMPTION AMENDMENT SA-2]',
      facts: (m) => dmFacts(m, isConstructionLineage, ['relative_size', 'contrast']),
      fires: (m) => dmFires(m, isConstructionLineage, (e) => (primSettled(e.relative_size) && e.relative_size.value === 'large') || (primSettled(e.contrast) && e.contrast.value === 'high')) },
  ],
  MATERIAL_SURFACE: [
    { id: 'MS-1', spec: 'DM evidence family surface_pattern / surface_treatment with relative_size = large ∨ spatial_position = whole_garment  [SA-2]',
      facts: (m) => dmFacts(m, (e) => MS_FAMILIES.includes(e.evidence_family), ['relative_size', 'spatial_position']),
      fires: (m) => dmFires(m, (e) => MS_FAMILIES.includes(e.evidence_family), (e) => (primSettled(e.relative_size) && e.relative_size.value === 'large') || (primSettled(e.spatial_position) && e.spatial_position.value === 'whole_garment')) },
    { id: 'MS-2', spec: 'surface / material value with coverage = Dominant (coverage read as Derived from size + position when the triple exists; the stored adjudicated coverage token is admissible as the same fact)',
      facts: (m) => [tokenFact(m, 'surface'), tokenFact(m, 'material')], fires: (m) => coverageIn(m, ['surface', 'material'], ['Dominant']) },
  ],
  DECORATION: [
    { id: 'DEC-1', spec: 'graphic = Dominant', facts: (m) => [tokenFact(m, 'graphic')], fires: (m) => tokenIn(m, 'graphic', ['Dominant']) },
    { id: 'DEC-2', spec: 'DM evidence family graphic / attached_detail / attached_hardware / decorative_construction / designed_color_contrast with relative_size = large ∨ spatial_position ∈ {distributed, whole_garment}  [SA-2]',
      facts: (m) => dmFacts(m, (e) => DEC_FAMILIES.includes(e.evidence_family), ['relative_size', 'spatial_position']),
      fires: (m) => dmFires(m, (e) => DEC_FAMILIES.includes(e.evidence_family), (e) => (primSettled(e.relative_size) && e.relative_size.value === 'large') || (primSettled(e.spatial_position) && ['distributed', 'whole_garment'].includes(e.spatial_position.value))) },
    { id: 'DEC-3', spec: 'decorative_detail / attachment value with coverage ∈ {Partial, Dominant}', facts: (m) => [tokenFact(m, 'decorative_detail'), tokenFact(m, 'attachment')], fires: (m) => coverageIn(m, ['decorative_detail', 'attachment'], ['Partial', 'Dominant']) },
  ],
});
const UNKNOWN_SPEC = 'any required fact NOT_VISIBLE / UNKNOWN, or the system\'s prominence fact not governed for its referent (today: structural construction apparatus without SA-1) → UNKNOWN';
const SA1_APPLICABLE = Object.freeze({ collar: (e) => tokenState(e) === 'OBSERVED' && e.value !== 'None', closure_type: (e) => tokenState(e) === 'OBSERVED', cuff_type: (e) => tokenState(e) === 'OBSERVED' && e.value !== 'None', pocket: (e) => tokenState(e) === 'OBSERVED' && e.value === 'Present' });

class SpecTranscriptionError extends Error { constructor(m) { super(m); this.name = 'SpecTranscriptionError'; } }
function assertSpecTranscription(spec) {
  const pp = spec && spec.prominence_predicate; if (!pp) throw new SpecTranscriptionError('lane spec prominence_predicate missing');
  for (const sys of V.PROMINENCE_SYSTEMS) for (const c of CLAUSES[sys]) if (!Array.isArray(pp[sys]) || !pp[sys].includes(c.spec)) throw new SpecTranscriptionError('clause ' + c.id + ' not found verbatim in the bound spec');
  for (const sys of V.PROMINENCE_SYSTEMS) if (pp[sys].length !== CLAUSES[sys].length) throw new SpecTranscriptionError('spec clause count differs for ' + sys);
  if (pp.UNKNOWN !== UNKNOWN_SPEC) throw new SpecTranscriptionError('UNKNOWN clause differs');
  if (!/none preregistered/.test(spec.tie_rule)) throw new SpecTranscriptionError('tie rule no longer "none"');
  return true;
}

function ungoverned(m) { if (!m.tokens || m.sa1 === null) return []; const have = new Set(m.sa1.map((i) => i.referent));
  return Object.keys(SA1_APPLICABLE).filter((r) => SA1_APPLICABLE[r](m.tokens[r]) && !have.has(r)).map((r) => 'referent ' + r + ' present without governed prominence fact'); }

function prominence(m, system) {
  const clauses = CLAUSES[system];
  const facts = clauses.flatMap((c) => c.facts(m).map((f) => Object.assign({ clause: c.id }, f)));
  const unsettled = facts.filter((f) => !f.settled).map((f) => ({ clause: f.clause, fact: f.fact, state: f.state }));
  const notGoverned = system === 'CONSTRUCTION' ? ungoverned(m) : [];
  const fired = clauses.map((c) => ({ clause: c.id, evidence: c.fires(m) })).filter((x) => x.evidence.length);
  let value;
  if (unsettled.length || notGoverned.length) value = 'UNKNOWN'; else if (fired.length) value = 'PROMINENT'; else value = 'NOT_PROMINENT';
  return Object.freeze({ system, value, fired_clauses: fired, unsettled_facts: unsettled, not_governed: notGoverned, facts_read: facts.map((f) => f.fact) });
}
function allProminence(m) { const out = {}; for (const s of V.PROMINENCE_SYSTEMS) out[s] = prominence(m, s); return Object.freeze(out); }

// classic_organising_role.relation (verbatim structure; the spec's plain-tailored case is the all-NOT_PROMINENT branch)
function classicRelation(p) {
  const unknown = V.PROMINENCE_SYSTEMS.filter((s) => p[s].value === 'UNKNOWN');
  const prom = V.PROMINENCE_SYSTEMS.filter((s) => p[s].value === 'PROMINENT');
  if (unknown.length) return { value: 'UNDETERMINED', basis: 'UNKNOWN predicate: ' + unknown.join(', ') };
  if (prom.length === 1 && prom[0] === 'CONSTRUCTION') return { value: 'MOST_PROMINENT', basis: 'PROMINENT(CONSTRUCTION) ∧ no competitor PROMINENT' };
  if (prom.length === 0) return { value: 'MOST_PROMINENT', basis: '¬PROMINENT for every system · competitors OBSERVED-absent (plain case)' };
  if (!prom.includes('CONSTRUCTION') && prom.length === 1) return { value: 'ANOTHER_SYSTEM_MORE_PROMINENT', basis: '¬PROMINENT(CONSTRUCTION) ∧ exactly one other system PROMINENT (' + prom[0] + ')' };
  return { value: 'UNDETERMINED', basis: 'two or more PROMINENT systems (' + prom.join(' + ') + ') — tie · no tie rule' };
}
// transformative_organising_reading.relation
function transformativeRelation(p, referent) {
  const unknown = V.PROMINENCE_SYSTEMS.filter((s) => p[s].value === 'UNKNOWN');
  const prom = V.PROMINENCE_SYSTEMS.filter((s) => p[s].value === 'PROMINENT');
  if (unknown.length) return { value: 'UNDETERMINED', referent, basis: 'UNKNOWN predicate: ' + unknown.join(', ') };
  if (prom.includes(referent) && prom.length === 1) return { value: 'MOST_PROMINENT', referent, basis: 'PROMINENT(' + referent + ') ∧ no other system PROMINENT' };
  if (!prom.includes(referent)) return { value: 'NOT', referent, basis: '¬PROMINENT(' + referent + ') ∧ all four predicates evaluable' };
  return { value: 'UNDETERMINED', referent, basis: 'PROMINENT(' + referent + ') tied with ' + prom.filter((s) => s !== referent).join(' + ') + ' — no tie rule' };
}

module.exports = { prominence, allProminence, classicRelation, transformativeRelation, assertSpecTranscription, CLAUSES, UNKNOWN_SPEC, LOWER_SILHOUETTE_CATEGORIES, SpecTranscriptionError, tokenState };
