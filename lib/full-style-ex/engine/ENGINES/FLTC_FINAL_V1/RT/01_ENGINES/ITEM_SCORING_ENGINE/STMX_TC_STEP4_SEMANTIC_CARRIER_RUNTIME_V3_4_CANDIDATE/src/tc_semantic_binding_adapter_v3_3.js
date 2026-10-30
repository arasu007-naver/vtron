'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3.3 — INPUT / BINDING ADAPTER. Versioned successor of the sealed V3 adapter (carried byte-for-byte in V3.1 / V3.2);
 * V3 text carried verbatim except three additions (order STMX TC MAINLINE V2.3.61 §5 / §20 / §27):
 *   (1) bound role `constitutive_reference_successor` (+ seal) — the V2.3.61 Reference successor (P-1). Its rows must equal the bound D-7 baseline rows
 *       in every field except the added `constitutive_systems` block (fail-closed REFERENCE_SUCCESSOR_DIVERGES); the block is audited for stored answers
 *       (G61). Classic keeps reading the unchanged D-7 baseline (`baselineByKey`); the Transformative evaluator reads `constitutiveByKey` in addition.
 *   (2) bound role `length_token_compatibility` (+ seal) — OSF-7: for exactly the listed members, the Step 2 proportion channel verdict is replaced by the
 *       verdict of the FROZEN Step 2 `prop` rule re-applied to the frozen envelope spelling of the same zone; the member row must still carry the frozen
 *       PRO-TOKEN-UNKNOWN verdict and the raw Producer length, else fail closed. The raw value and the frozen verdict stay in provenance.
 *   (3) `upstream_token_projection` now points to the sealed projection V4 (V3 + V2.3.61 trouser fit observation successor). Shape unchanged.
 *
 * V3 header (carried):
 * STMX TC Step 4 semantic carrier runtime V3 — INPUT / BINDING ADAPTER (R1-free · GT-free).
 * Carried from V1 / V2: hash-pinned bound inputs (fail-closed on drift) · G61 answer audit · upstream / downstream split.
 * V3 input surfaces (V2.3.54 39_ + V2.3.55 §10 — the only ones):
 *   upstream_token_projection   GT-FREE projection of 18 governed Vision parameters per member (sealed separately; verified against its seal)
 *   sa1 / sa2 corpora           sealed V2.3.54 Atomic corpora (post-conformance output; verified against the atomic seal rows)
 *   sa2_consumption_record      G44 record — its not_consumed[] list is enforced on the projected DM evidence
 *   sa1_referent_contract       closed referent family (collar · closure_type · cuff_type · pocket)
 *   lane_derivation_specification  sealed V2.3.53 PROMINENT(system) predicates + lane relations (rule authority)
 *   constitutive_realization_evidence · criteria_successors  inherited from V2 (criteria successors = provenance for D7-S1 steps (1)–(2) and S2 – S5 only)
 * Physical removal at parse: tier / historical fields of the Step 2 and Step 3 ledgers are DELETED from the parsed objects before any use,
 * then the whole authority is audited for tier tokens.
 * Never bound (path guard): CEO GT source · R1 corpus · raw observation batches · Descriptors · Vector · images.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const V = require('./tc_semantic_vocabulary_v3');

const PKG = path.resolve(__dirname, '..');
const ROOT = path.resolve(PKG, '..', '..', '..');

const UPSTREAM_FIELDS = Object.freeze(['anchor_id', 'direction', 'valid_departure_set', 'statement_set', 'statement_set_size', 'magnitude', 'ownerless']);
const DOWNSTREAM_FIELDS = Object.freeze(['grammar_state', 'resolution_status', 'unresolved_category']);
const MEMBER_FIELDS = Object.freeze(['anchor_id', 'garment_ref', 'archetype_key', 'category', 'observed', 'silhouette', 'proportion', 'construction', 'asymmetry']);
const REQUIRED_ROLES = Object.freeze(['step2_member_ledger', 'step2_relational_ruleset', 'step3_unit_ledger', 'transformative_criteria', 'classic_reference_baseline',
  'constitutive_realization_evidence', 'criteria_successors', 'lane_derivation_specification', 'upstream_token_projection', 'upstream_token_projection_seal',
  'sa1_construction_observation_corpus', 'sa2_designed_detail_observation_corpus', 'sa2_consumption_record', 'sa1_referent_contract', 'atomic_corpus_seal',
  'constitutive_reference_successor', 'constitutive_reference_successor_seal', 'length_token_compatibility', 'length_token_compatibility_seal']);
const REALIZATION_KEYS = Object.freeze(['collar_scale', 'cuff_scale', 'sleeve_volume']);
const FORBIDDEN_SOURCE = /CANONICAL_FINAL_REPRESENTATION|R1_CANONICAL_OBSERVATION_CORPUS|R1_OBSERVATION_CONTRACT|observation_batches|02_DATABASE_AND_CORPUS\/DESCRIPTORS|VECTOR_DB|REFERENCE_IMAGES|STMX_CEO_CALIBRATION_CORPUS\/MASTER|REOBSERVATION_BATCH|member_map|CEO_REVIEW|_BLIND_REOBSERVATION/;
const TIER_FIELDS_DELETED_AT_PARSE = Object.freeze(['historical_tc', 'historical_side', 'historical_direction_correction', 'vs_historical', 'tier_evidence']);
const SA2_PROJECTED_FIELDS = Object.freeze(['evidence_id', 'evidence_family', 'relative_size', 'contrast', 'spatial_position', 'source_observation_refs']);
const SA1_PROJECTED_FIELDS = Object.freeze(['referent', 'relative_size', 'contrast', 'spatial_position']);

// G61: reference / class authority may hold conditions, never an answer.
const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze(['expected_result', 'principal_result', 'default_reading', 'canonical_reading', 'carrier_value', 'tier', 'score', 'identity_participation', 'classic_strength', 'intensity']);
const POSITIVE_CARRIER_VALUES = new Set([].concat(V.WHOLE_GARMENT_READING, V.STATEMENT_RELATION, V.REALIZATION_RELATION, V.IDENTITY_PARTICIPATION).filter((v) => v !== 'UNRESOLVED' && v !== 'NOT_APPLICABLE'));
const TIER_TOKEN = /^TC\d$/;

class BoundInputError extends Error { constructor(m) { super(m); this.name = 'BoundInputError'; } }
class AuthorityAnswerLeakError extends Error { constructor(m) { super(m); this.name = 'AuthorityAnswerLeakError'; } }
class ObservationContractError extends Error { constructor(m) { super(m); this.name = 'ObservationContractError'; } }

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const memberKey = (anchor, ref) => anchor + '|' + ref;

function auditNoStoredAnswer(obj, label, opts = {}) {
  const walk = (o, at) => {
    if (o === null || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (FORBIDDEN_AUTHORITY_FIELDS.includes(k)) throw new AuthorityAnswerLeakError(label + ': forbidden field ' + at + k);
      if (typeof v === 'string' && (POSITIVE_CARRIER_VALUES.has(v) || (opts.tier && TIER_TOKEN.test(v)))) throw new AuthorityAnswerLeakError(label + ': carrier / tier value stored at ' + at + k);
      walk(v, at + k + '.');
    }
  };
  walk(obj, '');
}
function auditNoTier(obj, label) {
  const walk = (o, at) => { if (o === null || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) { if (TIER_FIELDS_DELETED_AT_PARSE.includes(k)) throw new AuthorityAnswerLeakError(label + ': tier field survived at ' + at + k);
      if (typeof v === 'string' && TIER_TOKEN.test(v)) throw new AuthorityAnswerLeakError(label + ': tier token at ' + at + k); walk(v, at + k + '.'); } };
  walk(obj, '');
}
function deleteTierFields(rows) { for (const r of rows) for (const k of TIER_FIELDS_DELETED_AT_PARSE) delete r[k]; return rows; }

function projectSa1(inst, referents) {
  if (!referents.includes(inst.referent)) throw new ObservationContractError('SA1_REFERENT_ILLEGAL ' + inst.referent);
  const o = {}; for (const f of SA1_PROJECTED_FIELDS) o[f] = clone(inst[f]); return Object.freeze(o);
}
function projectSa2(ev, notConsumed) {
  const o = {}; for (const f of SA2_PROJECTED_FIELDS) if (ev[f] !== undefined) o[f] = clone(ev[f]);
  for (const k of Object.keys(o)) if (notConsumed.some((n) => n.startsWith(k))) throw new ObservationContractError('SA2_NOT_CONSUMED_FIELD ' + k);
  return Object.freeze(o);
}

function prepareAuthority(raw) {
  for (const r of REQUIRED_ROLES) if (!raw[r]) throw new BoundInputError('BOUND_INPUT_MISSING ' + r);
  const criteriaAsset = raw.transformative_criteria;
  const baselineAsset = raw.classic_reference_baseline;
  for (const c of criteriaAsset.criteria) auditNoStoredAnswer(c, 'criterion ' + c.relation_class);
  for (const r of baselineAsset.rows) auditNoStoredAnswer(r, 'reference row ' + r.key);
  if (/REF_\d{6}/.test(JSON.stringify(raw.criteria_successors)) || /REF_\d{6}/.test(JSON.stringify(raw.lane_derivation_specification))) throw new AuthorityAnswerLeakError('criteria name a REF — per-item answer forbidden (G61)');
  const heldClasses = new Set(criteriaAsset.scope_withheld_untouched);
  const criteriaByClass = new Map();
  for (const c of criteriaAsset.criteria) {
    if (heldClasses.has(c.relation_class)) throw new BoundInputError('SCOPE_LOCK_VIOLATION held class carries a criterion: ' + c.relation_class);
    criteriaByClass.set(c.relation_class, c);
  }
  const baselineByKey = new Map(baselineAsset.rows.map((r) => [r.key, r]));
  // (1) V3.3 · P-1 Reference successor: predecessor rows unchanged, one added `constitutive_systems` block per key (criteria only)
  const succ = raw.constitutive_reference_successor;
  if (!Array.isArray(succ.rows) || succ.rows.length !== baselineAsset.rows.length) throw new BoundInputError('REFERENCE_SUCCESSOR_DIVERGES row count');
  const constitutiveByKey = new Map();
  for (const r of succ.rows) {
    const base = baselineByKey.get(r.key); const copy = clone(r); delete copy.constitutive_systems;
    if (!base || JSON.stringify(copy) !== JSON.stringify(base)) throw new BoundInputError('REFERENCE_SUCCESSOR_DIVERGES ' + r.key);
    if (!r.constitutive_systems) throw new BoundInputError('REFERENCE_SUCCESSOR_BLOCK_MISSING ' + r.key);
    auditNoStoredAnswer(r.constitutive_systems, 'constitutive_systems ' + r.key, { tier: true });
    if (/REF_\d{6}/.test(JSON.stringify(r.constitutive_systems))) throw new AuthorityAnswerLeakError('constitutive_systems names a REF (G61) ' + r.key);
    constitutiveByKey.set(r.key, Object.freeze(clone(r.constitutive_systems)));
  }
  // physical removal of tier / historical fields, then audit
  const step2Members = deleteTierFields(raw.step2_member_ledger.member_rows);
  const step3Rows = deleteTierFields(raw.step3_unit_ledger.rows);
  auditNoTier(step2Members, 'step2 member ledger'); auditNoTier(step3Rows, 'step3 unit ledger');
  // (2) V3.3 · OSF-7 length-token compatibility overlay (exact rows only; fail closed on any mismatch)
  const compat = raw.length_token_compatibility; let overlays = 0;
  for (const c of compat.rows) {
    const m = step2Members.find((x) => x.anchor_id === c.anchor_id && x.garment_ref === c.garment_ref);
    if (!m || !m.proportion || m.proportion.rule !== c.frozen_step2_proportion.rule || m.observed.length !== c.raw_producer_length || m.archetype_key !== c.archetype_key || compat.mapping[c.raw_producer_length] !== c.envelope_spelling) throw new BoundInputError('OSF7_OVERLAY_MISMATCH ' + c.anchor_id + '|' + c.garment_ref);
    m.proportion = Object.assign({}, c.compatibility_proportion, { compatibility: { osf: 'OSF-7', frozen_step2_verdict: c.frozen_step2_proportion, raw_producer_length: c.raw_producer_length, envelope_spelling: c.envelope_spelling, authority: compat.authority.spelling_note } });
    overlays++;
  }
  if (overlays !== compat.rows.length) throw new BoundInputError('OSF7_OVERLAY_COUNT');
  // realization evidence (inherited, constitutive status only)
  const realizationByMember = new Map();
  for (const row of raw.constitutive_realization_evidence.rows) {
    auditNoStoredAnswer(row.evidence, 'realization ' + row.anchor_id, { tier: true });
    const k = memberKey(row.anchor_id, row.garment_ref);
    if (realizationByMember.has(k)) throw new ObservationContractError('REALIZATION_DUPLICATE ' + k);
    const ev = {};
    for (const key of REALIZATION_KEYS) { const e = row.evidence[key]; ev[key] = Object.freeze({ state: e ? e.state : 'KEY_OMITTED', value: e && e.value !== undefined ? e.value : null }); }
    realizationByMember.set(k, Object.freeze(ev));
  }
  // GT-free token projection + Atomic corpora
  const tokensByMember = new Map();
  for (const m of raw.upstream_token_projection.members) { auditNoStoredAnswer(m.observations, 'projection ' + m.anchor_id, { tier: true }); tokensByMember.set(memberKey(m.anchor_id, m.garment_ref), Object.freeze(clone(m.observations))); }
  const referents = Object.keys(raw.sa1_referent_contract.referents);
  const sa1ByMember = new Map();
  for (const m of raw.sa1_construction_observation_corpus.members) sa1ByMember.set(memberKey(m.anchor_id, m.garment_ref), Object.freeze((m.construction_referent_evidence.instances || []).map((i) => projectSa1(i, referents))));
  const notConsumed = raw.sa2_consumption_record.not_consumed;
  const sa2ByMember = new Map();
  for (const m of raw.sa2_designed_detail_observation_corpus.members) { const b = m.dm_designed_detail_evidence;
    sa2ByMember.set(memberKey(m.anchor_id, m.garment_ref), Object.freeze({ block_present: !!b && Array.isArray(b.evidence), evidence: Object.freeze((b && b.evidence ? b.evidence : []).map((e) => projectSa2(e, notConsumed))) })); }
  return Object.freeze({
    criteriaByClass, heldClasses, baselineByKey, constitutiveByKey, osf7Overlays: overlays, realizationByMember, tokensByMember, sa1ByMember, sa2ByMember, referents,
    laneSpec: raw.lane_derivation_specification,
    rules: raw.step2_relational_ruleset.rules,
    step2Members, step3Rows,
  });
}

function crossCheckSeals(raw, manifest) {
  const byRole = new Map(manifest.inputs.map((b) => [b.role, b]));
  const pSeal = raw.upstream_token_projection_seal; const pRow = pSeal.files.find((f) => f.file === byRole.get('upstream_token_projection').path);
  if (!pRow || pRow.sha256 !== byRole.get('upstream_token_projection').sha256) throw new BoundInputError('PROJECTION_SEAL_MISMATCH');
  for (const role of ['sa1_construction_observation_corpus', 'sa2_designed_detail_observation_corpus', 'sa2_consumption_record', 'sa1_referent_contract']) {
    const row = raw.atomic_corpus_seal.files.find((f) => f.file === byRole.get(role).path);
    if (!row || row.sha256 !== byRole.get(role).sha256) throw new BoundInputError('ATOMIC_SEAL_MISMATCH ' + role);
  }
  // V3.3: the two new successor inputs must match their own seals
  if (raw.constitutive_reference_successor_seal.sha256 !== byRole.get('constitutive_reference_successor').sha256) throw new BoundInputError('REFERENCE_SUCCESSOR_SEAL_MISMATCH');
  const cRow = raw.length_token_compatibility_seal.files.find((f) => f.file === byRole.get('length_token_compatibility').path);
  if (!cRow || cRow.sha256 !== byRole.get('length_token_compatibility').sha256) throw new BoundInputError('OSF7_SEAL_MISMATCH');
}

function loadBound(options = {}) {
  const root = options.root || ROOT;
  const manifestPath = options.manifestPath || path.join(PKG, 'BOUND_INPUTS.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const raw = {};
  for (const b of manifest.inputs) {
    if (FORBIDDEN_SOURCE.test(b.path)) throw new BoundInputError('FORBIDDEN_SOURCE ' + b.role + ' ' + b.path);
    const buf = fs.readFileSync(path.join(root, b.path));
    if (sha256(buf) !== b.sha256) throw new BoundInputError('BOUND_INPUT_HASH_MISMATCH ' + b.role);
    raw[b.role] = JSON.parse(buf.toString('utf8'));
  }
  crossCheckSeals(raw, manifest);
  return prepareAuthority(raw);
}

function projectUpstream(row) { const o = {}; for (const k of UPSTREAM_FIELDS) o[k] = clone(row[k]); return Object.freeze(o); }
function projectDownstream(row) { const o = {}; for (const k of DOWNSTREAM_FIELDS) o[k] = row[k] === undefined ? null : clone(row[k]); return Object.freeze(o); }
function projectMember(m, authority) {
  const o = {};
  for (const k of MEMBER_FIELDS) if (m[k] !== undefined) o[k] = clone(m[k]);
  const k = memberKey(m.anchor_id, m.garment_ref);
  o.realization = authority.realizationByMember.get(k) || null;
  o.tokens = authority.tokensByMember.get(k) || null;        // missing → null → UNKNOWN prominence (never a default)
  o.sa1 = authority.sa1ByMember.has(k) ? authority.sa1ByMember.get(k) : null;
  o.sa2 = authority.sa2ByMember.get(k) || null;
  return Object.freeze(o);
}

function buildUnits(authority) {
  const byAnchor = new Map();
  for (const m of authority.step2Members) {
    if (!byAnchor.has(m.anchor_id)) byAnchor.set(m.anchor_id, []);
    byAnchor.get(m.anchor_id).push(projectMember(m, authority));
  }
  return authority.step3Rows.map((row) => Object.freeze({
    upstream: projectUpstream(row),
    members: Object.freeze(byAnchor.get(row.anchor_id) || []),
    downstream: projectDownstream(row),
  }));
}

module.exports = {
  loadBound, prepareAuthority, buildUnits, projectUpstream, projectDownstream, projectMember, projectSa1, projectSa2, auditNoStoredAnswer, auditNoTier, crossCheckSeals,
  UPSTREAM_FIELDS, DOWNSTREAM_FIELDS, MEMBER_FIELDS, REQUIRED_ROLES, REALIZATION_KEYS, FORBIDDEN_AUTHORITY_FIELDS, FORBIDDEN_SOURCE, TIER_FIELDS_DELETED_AT_PARSE,
  SA1_PROJECTED_FIELDS, SA2_PROJECTED_FIELDS, BoundInputError, AuthorityAnswerLeakError, ObservationContractError, PKG, ROOT,
};
