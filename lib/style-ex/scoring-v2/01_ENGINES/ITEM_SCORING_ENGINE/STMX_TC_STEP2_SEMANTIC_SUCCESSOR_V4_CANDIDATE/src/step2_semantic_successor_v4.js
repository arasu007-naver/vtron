'use strict';
/* STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V4_CANDIDATE — CANDIDATE · SHADOW · NOT FROZEN · NOT PRODUCTION (V2.3.86 · CEO D-85-1 · D-85-3).
 * Derived verbatim from successor V3 (V2.3.84: GRC · WG · MC1 unchanged) plus two contract rules (STEP2_SUCCESSOR_V4_CONTRACT.json):
 * SHC — D-85-1 Strong-shoulder clarification (tailored keys: Strong withheld from morphology eligibility) · SOR — D-85-3 scoring-object membership.
 * The frozen Step 2 predicates are required verbatim (hash-pinned); nothing here defines a Departure. No REF id, no GT, no label, no tier. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const PKG = path.resolve(__dirname, '..'); const ROOT = path.resolve(PKG, '..', '..', '..');
const SUCCESSOR_ID = 'STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V4_CANDIDATE'; const STATUS = 'CANDIDATE · SHADOW · NOT FROZEN · NOT PRODUCTION';
class BoundInputError extends Error {} class ReproductionError extends Error {} class TierEmissionError extends Error {} class ContractError extends Error {}
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, q) => { o[q] = v[q]; return o; }, {}) : v));
const BOUND = JSON.parse(fs.readFileSync(path.join(PKG, 'BOUND_INPUTS_STEP2_SUCCESSOR_V4.json'), 'utf8'));
const ROLE = {}; for (const b of BOUND.inputs) { if (sha(fs.readFileSync(path.join(ROOT, b.path))) !== b.sha256) throw new BoundInputError('bound input changed: ' + b.role); ROLE[b.role] = b; }
const rj = (role) => JSON.parse(fs.readFileSync(path.join(ROOT, ROLE[role].path), 'utf8'));
const CONTRACT = rj('successor_v3_contract'); const CONTRACT_V2 = rj('successor_v2_contract'); const CONTRACT4 = rj('successor_v4_contract');
const SHC = Object.freeze({ keys: CONTRACT4.rules.SHC.keys.slice(), values: CONTRACT4.rules.SHC.values.slice() });
const SO = new Map(rj('scoring_object_correction').entries.map((e) => [e.anchor_id, e.member_garment_refs.after.slice()]));
const REG = require(path.join(ROOT, ROLE['supersession_registry_loader_v1'].path));
const FROZEN = require(path.join(ROOT, ROLE['frozen_step2_predicates:evaluator_v2_3_2.js'].path));
const FROZEN_B221 = require(path.join(ROOT, ROLE['frozen_step2_predicates:evaluator_v2_2_1.js'].path));
const PRED = Object.freeze({ f: FROZEN.f, V: FROZEN.V, silh: FROZEN.silh, prop: FROZEN.prop, constr: FROZEN.constr, asymmetry: FROZEN.asymmetry, direction: FROZEN.direction, pairDirection: FROZEN.pairDirection, ladder: FROZEN_B221.silh, EVALUATOR_VERSION: FROZEN.EVALUATOR_VERSION });
const DOMAIN = CONTRACT_V2.frozen_observation_domain; const REEXEC_V2 = Object.freeze(Object.fromEntries(Object.entries(CONTRACT_V2.reexecution_map).filter(([, v]) => Array.isArray(v))));
const WG = CONTRACT.rules.WG; const REGIONAL_KEYS = Object.freeze(WG.regional_keys.slice()); const REQUIRED_REGIONS = Object.freeze(WG.required_regions.slice());
const MC1_SRC = rj('mc1_length_token_compatibility'); const MC1 = Object.freeze({ mapping: Object.freeze(Object.assign({}, MC1_SRC.mapping)), keys: Object.freeze(MC1_SRC.keys.slice()) });
const V5 = rj('projection_v5'); const V5_BY_MEMBER = new Map(V5.members.map((m) => [m.anchor_id + '|' + m.garment_ref, m.observations]));
// governed representation corrections (sealed records): member|field → projected after-token, verified against projection V5
const GRC = new Map(); for (const b of BOUND.inputs.filter((x) => x.role.startsWith('governed_correction:'))) { const R = JSON.parse(fs.readFileSync(path.join(ROOT, b.path), 'utf8'));
  for (const field of Object.keys(R.after)) { if (!CONTRACT.rules.GRC.fields[field]) throw new ContractError('governed correction field outside the contract: ' + field); const k = R.identity.anchor_id + '|' + R.identity.garment_ref;
    const v5 = V5_BY_MEMBER.get(k); if (!v5 || !v5[field]) throw new ContractError('projection V5 does not carry the corrected ' + field + ' for ' + k);
    const projected = { state: R.after[field].state, value: R.after[field].value, values: R.after[field].values, values_detail: R.after[field].values_detail.map((d) => { const o = { value: d.value }; if (d.coverage) o.coverage = d.coverage; if (d.locations) o.locations = d.locations.map((l) => Object.assign({ component: l.component }, l.descriptor ? { descriptor: l.descriptor } : {})); return o; }) };
    if (canon(projected) !== canon(v5[field])) throw new ContractError('projection V5 ≠ governed correction record for ' + k + ' ' + field);
    GRC.set(k + '|' + field, { record: b.path, record_sha256: b.sha256, authority: R.approval_anchor['CEO Decision'], token: clone(v5[field]) }); } }
const SILHOUETTE_FIELDS = Object.freeze(['fit', 'sleeve_volume', 'shoulder_structure', 'shoulder_span', 'silhouette']);
const MEMBER_OUT = Object.freeze(CONTRACT_V2.output_member.fields.concat(['direction_path']));
const FORBIDDEN_OUT_KEYS = Object.freeze(['tier_evidence', 'unit_tier_evidence', 'historical_tc', 'historical_side', 'historical_direction_correction', 'vs_historical']);
const NUMERIC_TIER = /^TC\d$/; const ALL_RULES = Object.freeze(['GRC', 'WG', 'MC1', 'SHC', 'SOR']);
const KEY_UNRESOLVED = { v: 'UNRESOLVED', rule: 'U-KEY', why: 'key unresolved', carrier: null };
function auditNoTier(obj, label) { (function walk(o, at) { if (!o || typeof o !== 'object') { if (typeof o === 'string' && NUMERIC_TIER.test(o)) throw new TierEmissionError(label + ': numeric tier value at ' + at); return; }
  for (const [k, v] of Object.entries(o)) { if (FORBIDDEN_OUT_KEYS.includes(k) || /tier/i.test(k)) throw new TierEmissionError(label + ': tier field at ' + at + k); walk(v, at + k + '.'); } })(obj, ''); return true; }
function inFrozenDomain(key, field, value) { const d = DOMAIN[field]; if (!d || !d.default) return true; return (d.by_key[key] || d.default).includes(value); }
function tokenFromRecorded(v) { if (v === 'n/a') return undefined; if (v === null) return { state: 'OBSERVED', value: null, values: null }; const m = /^<(.+)>$/.exec(String(v)); return m ? { state: m[1], value: null, values: null } : { state: 'OBSERVED', value: String(v), values: null }; }
function historicalTokens(member, baseTokens) { const t = clone(baseTokens || {}) || {};
  for (const fld of SILHOUETTE_FIELDS) if (member.observed && Object.prototype.hasOwnProperty.call(member.observed, fld)) { const tok = tokenFromRecorded(member.observed[fld]); if (tok === undefined) delete t[fld]; else t[fld] = tok; }
  return t; }
function withheld() { return { state: 'OBSERVED', value: null, values: null }; }
const stepVerdict = (o) => (o && o.compatibility && o.compatibility.frozen_step2_verdict ? o.compatibility.frozen_step2_verdict : o);
const bare = (v) => { const o = clone(v); if (o) { delete o.relational; } return o; };

// WG — whole-garment reading of every observed fit value of ONE garment through the frozen silhouette predicate (contract rules.WG)
function wholeGarmentSilhouette(tokens, fitToken, key, diagnostics) {
  const values = []; if (fitToken && fitToken.state === 'OBSERVED' && fitToken.value != null) values.push({ region: 'whole_garment', value: String(fitToken.value) });
  const br = (fitToken && fitToken.byRegion) || {}; for (const r of REQUIRED_REGIONS) values.push({ region: r, value: typeof br[r] === 'string' ? br[r] : (br[r] && br[r].state === 'OBSERVED' && br[r].value != null ? String(br[r].value) : null) });
  const ev = values.map((x) => { const t = clone(tokens); let fit;
    if (x.value === null) fit = withheld();                                                    // missing / unobserved region → frozen SIL-STATE path
    else if (!inFrozenDomain(key, 'fit', x.value)) { fit = withheld(); diagnostics.push({ authority_gap: 'STEP2_DOMAIN_SEMANTICS_MISSING', field: 'fit', region: x.region, key, observed_value: x.value, noncanonical: true, non_scoring: true, consumed_downstream: false }); }
    else fit = { state: 'OBSERVED', value: x.value, values: null };
    t.fit = fit; let v = PRED.silh(t, key);
    if (x.region === 'upper' && v.rule === 'SIL-TRUE-FLARE-CONTRAST') v = PRED.ladder(t, key);   // flare statement reads the leg fit (lower region) — contract rules.WG.flare_contrast_scope
    return { region: x.region, value: x.value, verdict: v }; });
  const rules = (xs) => [...new Set(xs.map((e) => e.verdict.rule))].join('+'); const whys = (xs) => xs.map((e) => e.region + ': ' + e.verdict.why).join(' · ');
  const meta = ev.map((e) => ({ region: e.region, value: e.value, v: e.verdict.v, rule: e.verdict.rule }));
  const T = ev.filter((e) => e.verdict.v === 'TRUE');
  if (T.length) return { v: 'TRUE', rule: rules(T), why: 'whole-garment reading (WG-3): valid departure located in ' + T.map((e) => e.region).join(' + ') + ' — ' + whys(T), carrier: 'fit', strong: T.some((e) => e.verdict.strong), regional_evidence: meta };
  if (ev.every((e) => e.verdict.v === 'FALSE')) return { v: 'FALSE', rule: rules(ev), why: 'whole-garment reading (WG-4): every required fit value observed and conventional — ' + whys(ev), carrier: 'fit', regional_evidence: meta };
  const U = ev.filter((e) => e.verdict.v !== 'FALSE'); return { v: 'UNRESOLVED', rule: rules(U), why: 'whole-garment reading (WG-4): ' + whys(U), carrier: U[0].verdict.carrier == null ? 'fit' : U[0].verdict.carrier, regional_evidence: meta };
}
const isRegional = (tok, key) => REGIONAL_KEYS.includes(key) && !!(tok && tok.byRegion && typeof tok.byRegion === 'object');

function createSuccessor(options = {}) {
  const active = new Set(options.rules === undefined ? ALL_RULES : options.rules); for (const r of active) if (!ALL_RULES.includes(r)) throw new ContractError('unknown rule ' + r);
  let registry; if (options.registry === 'EMPTY') registry = REG.validate(ROOT, { document: 'EMPTY_REGISTRY', entries: [] }, REEXEC_V2);
  else registry = REG.load(ROOT, ROLE.supersession_registry.path, ROLE.supersession_registry.sha256, REEXEC_V2);

  function materializeMember(m, baseTokens) {
    const key = m.archetype_key; const mk = m.anchor_id + '|' + m.garment_ref; const out = {}; for (const k of MEMBER_OUT) if (m[k] !== undefined) out[k] = clone(m[k]); out.observed = clone(m.observed || {});
    const prov = { successor: SUCCESSOR_ID, contract: CONTRACT.document, active_rules: [...active],
      historical_step2_result_ref: { ledger: 'frozen Step 2 member ledger (V2.3.2 clean run) via the sealed V3.3 adapter', row: mk, silhouette: m.silhouette.rule + '/' + m.silhouette.v, direction: m.direction },
      observation_selection: [], input_contract_rules: [], channels_reexecuted: [], diagnostics: [] };
    const hist = historicalTokens(m, baseTokens); const input = clone(hist); const channels = new Set(); let fitRegional = null; const v5 = V5_BY_MEMBER.get(mk) || {};
    // V2 rule — registry selections (O1 / O2), unchanged
    for (const s of registry.selectionsFor(m.anchor_id, m.garment_ref, key)) { const hv = PRED.V(hist, s.field), sv = PRED.V({ [s.field]: s.token }, s.field); let cls = hv === sv ? null : 'O1';
      if (s.token.state === 'OBSERVED' && !inFrozenDomain(key, s.field, String(s.token.value))) { cls = 'O2'; input[s.field] = withheld(); prov.diagnostics.push({ authority_gap: 'STEP2_DOMAIN_SEMANTICS_MISSING', field: s.field, key, observed_value: sv, noncanonical: true, non_scoring: true, consumed_downstream: false }); } else input[s.field] = clone(s.token);
      prov.observation_selection.push({ field: s.field, source: 'SUCCESSOR_REGISTRY', entry_id: s.entry_id, historical_observation: hv, successor_observation: sv, value_changed: hv !== sv, delta_class: cls }); out.observed[s.field] = sv; for (const ch of REEXEC_V2[s.field]) channels.add(ch); }
    const registryFit = prov.observation_selection.some((s) => s.field === 'fit');
    // GRC — governed representation correction (sealed record, carried by projection V5)
    if (active.has('GRC')) for (const field of Object.keys(CONTRACT.rules.GRC.fields)) { const g = GRC.get(mk + '|' + field); if (!g) continue; input[field] = clone(g.token); for (const ch of CONTRACT.rules.GRC.fields[field]) channels.add(ch);
      prov.observation_selection.push({ field, source: 'GOVERNED_CORRECTION', record: g.record, record_sha256: g.record_sha256, authority: g.authority, historical_observation: PRED.V(hist, field), successor_observation: PRED.V(input, field) }); prov.input_contract_rules.push('GRC'); out.observed[field] = PRED.V(input, field); }
    // WG — whole-garment regional fit (projection V5 carries byRegion)
    if (active.has('WG') && !registryFit && isRegional(v5.fit, key)) { fitRegional = clone(v5.fit); channels.add('silhouette'); prov.input_contract_rules.push('WG');
      prov.observation_selection.push({ field: 'fit', source: 'PROJECTION_V5_REGIONAL_FORM', historical_observation: PRED.V(hist, 'fit'), successor_observation: { scalar: fitRegional.value, byRegion: fitRegional.byRegion } }); }
    // MC1 — approved Calf / Ankle spelling on the Direction path
    if (active.has('MC1') && MC1.keys.includes(key)) { const L = PRED.f(hist, 'length'); if (L.observed && Object.prototype.hasOwnProperty.call(MC1.mapping, L.value)) { input.length = { state: 'OBSERVED', value: MC1.mapping[L.value], values: null }; channels.add('proportion'); prov.input_contract_rules.push('MC1');
      prov.observation_selection.push({ field: 'length', source: 'MC1_APPROVED_SPELLING_MAP', historical_observation: L.value, successor_observation: MC1.mapping[L.value], authority: MC1_SRC.approval_anchor['CEO Decision'] + ' · MC-1 (V2.3.84 §3)' }); } }
    // SHC — D-85-1: a Strong shoulder on a tailored key is conventional structure; it is withheld from the frozen silhouette predicate's morphology eligibility
    let shc = false; if (active.has('SHC') && SHC.keys.includes(key)) { const sh = PRED.f(hist, 'shoulder_structure'); if (sh.observed && SHC.values.includes(sh.value)) { shc = true; channels.add('silhouette'); prov.input_contract_rules.push('SHC'); prov.observation_selection.push({ field: 'shoulder_structure', source: 'D-85-1 CLARIFICATION', historical_observation: sh.value, successor_observation: sh.value + ' (conventional tailored structure — withheld from morphology eligibility)' }); } }
    if (!channels.size) { auditNoTier(out, 'member ' + mk); return { record: out, provenance: prov, delta_class: null }; }
    // reproduction guard (every channel to be re-executed must first reproduce its frozen verdict from the historical token set)
    const FN = { silhouette: PRED.silh, proportion: PRED.prop, construction: PRED.constr };
    // every field RECORDED in the frozen verdict must be reproduced exactly (the OSF-7 overlay records the frozen proportion verdict as v · rule · why)
    const reproduces = (repro, rec) => !!rec && Object.keys(rec).every((k) => canon(repro[k]) === canon(rec[k])) && Object.keys(repro).filter((k) => !(k in rec)).every((k) => k === 'carrier' && ch0 === 'proportion');
    let ch0 = null; for (const ch of channels) { ch0 = ch; const repro = FN[ch](hist, key); if (!reproduces(repro, stepVerdict(m[ch]))) throw new ReproductionError('historical ' + ch + ' not reproducible for ' + mk + ': ' + repro.rule + ' vs ' + stepVerdict(m[ch]).rule); }
    if (PRED.direction(stepVerdict(m.silhouette), stepVerdict(m.proportion), stepVerdict(m.construction), m.asymmetry) !== m.direction) throw new ReproductionError('historical direction not reproducible for ' + mk);
    const dp = {};
    const sIn = shc ? clone(input) : input; if (shc) delete sIn.shoulder_structure;
    if (channels.has('silhouette')) out.silhouette = fitRegional ? wholeGarmentSilhouette(sIn, fitRegional, key, prov.diagnostics) : PRED.silh(sIn, key);
    if (channels.has('construction')) out.construction = PRED.constr(input, key);
    if (channels.has('proportion')) { const P = PRED.prop(input, key); if (m.proportion && m.proportion.compatibility && canon(bare(Object.assign({}, m.proportion, { compatibility: undefined }))) === canon(Object.assign({}, P, { compatibility: undefined }))) dp.proportion = P; else out.proportion = P; }
    if (Object.keys(dp).length) out.direction_path = dp;
    prov.channels_reexecuted = [...channels];
    out.direction = PRED.direction(dp.silhouette || stepVerdict(out.silhouette), dp.proportion || stepVerdict(out.proportion), stepVerdict(out.construction), out.asymmetry);
    auditNoTier(out, 'member ' + mk); auditNoTier(prov, 'provenance ' + mk); return { record: out, provenance: prov, delta_class: 'V3' };
  }
  // full-channel evaluation of a synthetic / live-shaped token set (fixtures): frozen predicates + O2 guard + WG + MC1 (GRC is member data, not a rule)
  function evaluateMember(tokens, key, asymmetryEvidence) {
    const input = clone(tokens || {}) || {}; const diagnostics = []; const applied = [];
    for (const field of Object.keys(DOMAIN)) { const t = input[field]; if (t && t.state === 'OBSERVED' && t.value != null && !inFrozenDomain(key, field, String(t.value))) { input[field] = withheld(); diagnostics.push({ authority_gap: 'STEP2_DOMAIN_SEMANTICS_MISSING', field, key, observed_value: String(t.value), noncanonical: true, non_scoring: true, consumed_downstream: false }); } }
    if (active.has('MC1') && MC1.keys.includes(key)) { const L = PRED.f(input, 'length'); if (L.observed && Object.prototype.hasOwnProperty.call(MC1.mapping, L.value)) { input.length = { state: 'OBSERVED', value: MC1.mapping[L.value], values: null }; applied.push('MC1'); } }
    const keyResolved = !/[<]|UNMAPPED/.test(key); const regional = active.has('WG') && isRegional(tokens && tokens.fit, key); if (regional) applied.push('WG');
    const sIn = clone(input); if (active.has('SHC') && SHC.keys.includes(key)) { const sh = PRED.f(input, 'shoulder_structure'); if (sh.observed && SHC.values.includes(sh.value)) { delete sIn.shoulder_structure; applied.push('SHC'); } }
    const S = regional ? wholeGarmentSilhouette(sIn, tokens.fit, key, diagnostics) : PRED.silh(sIn, key); const P = keyResolved ? PRED.prop(input, key) : clone(KEY_UNRESOLVED), C = keyResolved ? PRED.constr(input, key) : clone(KEY_UNRESOLVED);
    const ASY = PRED.asymmetry(input, asymmetryEvidence || []); const direction = PRED.direction(S, P, C, ASY);
    const out = { archetype_key: key, silhouette: S, proportion: P, construction: C, asymmetry: ASY, direction, provenance: { successor: SUCCESSOR_ID, input_contract_rules: applied, diagnostics } }; auditNoTier(out, 'evaluateMember ' + key); return out;
  }
  // SOR — D-85-3: for an anchor in the sealed scoring-object record the unit is formed from the recorded member(s) only (context garments stay member records)
  function materializeUnit(anchorId, scoringUnitType, records) {
    if (active.has('SOR') && SO.has(anchorId)) { const want = SO.get(anchorId); const kept = records.filter((m) => want.includes(m.garment_ref)); if (kept.length !== want.length) throw new ContractError('scoring-object member missing for ' + anchorId); const u = materializeUnitHistorical(anchorId, scoringUnitType, kept); u.scoring_object_members = want.slice(); return u; }
    return materializeUnitHistorical(anchorId, scoringUnitType, records);
  }
  function materializeUnitHistorical(anchorId, scoringUnitType, records) {
    const isPair = scoringUnitType === 'MATCHING_PAIR'; const direction = isPair ? PRED.pairDirection(records) : records.length === 1 ? records[0].direction : null;
    const vds = []; for (const m of records) for (const [ch, o] of [['SILHOUETTE', (m.direction_path && m.direction_path.silhouette) || stepVerdict(m.silhouette)], ['PROPORTION', (m.direction_path && m.direction_path.proportion) || stepVerdict(m.proportion)], ['CONSTRUCTION', stepVerdict(m.construction)]]) if (o && o.v === 'TRUE') vds.push({ channel: ch, rule: o.rule, carrier: o.carrier == null ? null : o.carrier });
    const ss = [...new Set(vds.map((d) => d.channel + ':' + d.rule))];
    const u = { anchor_id: anchorId, scoring_unit_type: scoringUnitType, direction, valid_departure_set: vds, statement_set: ss, statement_set_size: ss.length, ownerless: records.some((m) => m.asymmetry && m.asymmetry.departure_exists && m.asymmetry.axis_owner === 'UNRESOLVED') };
    auditNoTier(u, 'unit ' + anchorId); return u;
  }
  return Object.freeze({ materializeMember, evaluateMember, materializeUnit, materializeUnitHistorical, registry, active_rules: [...active] });
}
module.exports = { SHC, SCORING_OBJECT_ANCHORS: [...SO.keys()], createSuccessor, wholeGarmentSilhouette, auditNoTier, inFrozenDomain, historicalTokens, SUCCESSOR_ID, STATUS, CONTRACT_DOCUMENT: CONTRACT.document, REGIONAL_KEYS, REQUIRED_REGIONS, MC1, ALL_RULES, GRC_MEMBERS: [...GRC.keys()], BoundInputError, ReproductionError, TierEmissionError, ContractError, RegistryError: REG.RegistryError };
