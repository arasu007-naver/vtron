'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3.3 — TRANSFORMATIVE EVALUATOR (Grammar Transformation process trace).
 * Versioned successor of the sealed V3.2 evaluator (V2.3.59). Order: STMX TC MAINLINE V2.3.61 (CEO D-60 APPROVED 2026-09-26; Option B;
 * implementation authority = V2.3.60 32_PREFERRED_DESIGN_CANDIDATE + the sealed V2.3.61 Reference successor).
 *
 * Carried from V3.2 without change of meaning: upstream firewall (ALLOWED_UPSTREAM) · P1 no Statement · P2 held class · P3 no criterion ·
 * P5 unresolved channel / ownerless departure · P6 STRONG magnitude / second whole-garment channel · S1 organising reading UNDETERMINED ·
 * S2 constitutive system UNRESOLVED · S3 INTERVENTION (≥1 system SUBORDINATED / DISPLACED ∧ MOST_PROMINENT; ≥2 Statements also COORDINATED) ·
 * S4 BASE (all RETAINED ∧ NOT ∧ positively evidenced — L-2) · S5-CEO BASE (CEO 2026-09-25) · S5 mixed evidence · positiveRetention (CEO 1-B) ·
 * closureSetMatch (L-1) · the frozen Tailored / shirt system reading (presence token outside the characteristic set → DISPLACED).
 *
 * V3.3 changes (and nothing else):
 *   P-1  CONSTITUTIVE COVERAGE — the system table of a key = the frozen D-7 characteristic construction systems (read exactly as V3.2) + the
 *        `added_systems` of the sealed Reference successor (`constitutive_systems`), on the silhouette or construction channel. An added system is
 *        DISPLACED only by a value in its Reference `departure` set; a value in neither `conventional` nor `departure` → UNRESOLVED (fail closed).
 *        P4 now means: a member of the unit has no constitutive system at all (REFERENCE_CONTENT_GAP).
 *   P-2  EVIDENCE OWNERSHIP (CEO D-60) — for a Statement with referent R, a competitor system X ≠ R counts PROMINENT only on clauses whose evidence
 *        facts are not consumed by a constitutive status of the same member: (a) the realization parameter of a SUBORDINATED system / the presence
 *        token of a DISPLACED system; (b) an SA-1 instance on that system's referent with relative_size = large (same meaning: scale) — contrast = high
 *        is a different meaning and survives. Consumed clauses stay in provenance (`consumed_by_constitutive_relation`). Never a tie-breaker: any
 *        unconsumed competitor clause still ties → UNDETERMINED. Referent clauses are never collapsed.
 *   P-3  WHOLE-UNIT COMPOSITION (CEO D-60; V2.3.60 S-1) — each member is read on every Statement it carries (Step 2 channel rule of that member);
 *        a Statement carried by no member falls back to the first member (V3.2 rule). A member carrying no Statement is read for positive constitutive
 *        retention only. Unit INTERVENTION_PRINCIPAL iff ≥1 member reads INTERVENTION_PRINCIPAL and every other member is positively read; unit
 *        BASE_GRAMMAR_PRINCIPAL iff every member reads BASE; otherwise UNRESOLVED naming the member(s). No cross-member COORDINATED is asserted
 *        (no governed authority — S-2 not approved). A single-member unit is its member reading.
 * No new carrier value, status, cause, count, weight, threshold, tier, REF branch or Grammar State input (G48 · G59 · G60 · G61). No degree is emitted.
 */
const { CHANNELS } = require('./tc_semantic_vocabulary_v3');
const PR = require('./tc_prominence_derivation_v3');

const ALLOWED_UPSTREAM = new Set(['anchor_id', 'direction', 'valid_departure_set', 'statement_set', 'statement_set_size', 'magnitude', 'ownerless']);
const PRESENCE_TOKEN = Object.freeze({ lapel_system: 'collar', closure_system: 'closure_type', sleeve_system: 'sleeve', front_opening_extent: 'front_opening_extent' });
const REALIZATION_PARAMETER = Object.freeze({ lapel_system: 'collar_scale', closure_system: null, sleeve_system: 'sleeve_volume', front_opening_extent: null });
const RE_PROPORTIONED = Object.freeze({ collar_scale: 'Enlarged', sleeve_volume: 'Voluminous' });
const INTERVENTION_REFERENT = Object.freeze({ silhouette: 'BODY_FORM', proportion: 'BODY_FORM', construction: 'CONSTRUCTION' });
const SYSTEMS = Object.freeze(['lapel_system', 'closure_system', 'sleeve_system', 'front_opening_extent']);
const REALIZATION_EVIDENCE_KEYS = Object.freeze(['collar_scale', 'cuff_scale', 'sleeve_volume']); // bound realization evidence; any other parameter is read from the projection
const COMPOSITION_RULE = 'P-3/S-1 member composition (CEO D-60 APPROVED 2026-09-26)';

class DependencyDirectionError extends Error { constructor(m) { super(m); this.name = 'DependencyDirectionError'; } }

const present = (v) => v !== undefined && v !== null && v !== 'n/a' && v !== '<ABSENT>';
const channelOf = (statement) => statement.split(':')[0].toLowerCase();
const classOf = (statement) => statement.split(':')[1];

function assertUpstreamOnly(upstream) { for (const k of Object.keys(upstream)) if (!ALLOWED_UPSTREAM.has(k)) throw new DependencyDirectionError('NON_UPSTREAM_INPUT ' + k); }
function closureSetMatch(set, value) { return set.includes('Button') && set.length === 1 ? /Button/.test(String(value)) : set.includes(value); }

function characteristicConstruction(authority, key, obs) { // V3.2 verbatim
  const row = authority.baselineByKey.get(key);
  if (!row || row.characteristic_realization.status === 'NOT_AUTHORED') return { authored: false };
  const cr = row.characteristic_realization.construction;
  if (!cr || cr.status === 'NOT_AUTHORED') return { authored: false };
  const checks = [];
  if (cr.lapel_system) checks.push(['collar', obs.collar, cr.lapel_system]);
  if (cr.closure_system) checks.push(['closure_type', obs.closure_type, cr.closure_system, true]);
  if (cr.sleeve_system) checks.push(['sleeve', obs.sleeve, cr.sleeve_system]);
  if (cr.front_opening_extent) checks.push(['front_opening_extent', obs.front_opening_extent, cr.front_opening_extent]);
  const tokens = {}; let retained = true; let missing = false;
  for (const [carrier, value, set, isClosure] of checks) { tokens[carrier] = value; if (!present(value)) { missing = true; continue; } const ok = isClosure ? closureSetMatch(set, value) : set.includes(value); if (!ok) retained = false; }
  return { authored: true, retained: retained && !missing, missing, tokens };
}
function tokenState(v) { if (v === '<ABSENT>') return 'ABSENT'; if (v === undefined || v === null || v === 'n/a' || (typeof v === 'string' && v.startsWith('<'))) return 'NOT_OBSERVED'; return 'OBSERVED'; }
function realizationState(e) { if (!e || e.state === 'KEY_OMITTED' || e.state === 'ABSENT') return 'NOT_EMITTED'; if (e.state === 'OBSERVED') return 'OBSERVED'; return 'NOT_SETTLED'; }

// ---- P-1 system table ----
function systemTable(authority, key) {
  const out = [];
  const row = authority.baselineByKey.get(key);
  const cr = row && row.characteristic_realization && row.characteristic_realization.status !== 'NOT_AUTHORED' ? row.characteristic_realization.construction : null;
  if (cr && cr.status !== 'NOT_AUTHORED') for (const sys of SYSTEMS) if (cr[sys]) {
    const param = REALIZATION_PARAMETER[sys];
    out.push({ system: sys, origin: 'D7_BASELINE_FROZEN', channel: 'construction', presence_token: PRESENCE_TOKEN[sys], conventional: cr[sys], departure: null, realization_parameter: param, re_proportioned: param ? [RE_PROPORTIONED[param]] : [], closure_family: sys === 'closure_system' });
  }
  const cs = authority.constitutiveByKey ? authority.constitutiveByKey.get(key) : null;
  if (cs && cs.added_systems) for (const [name, s] of Object.entries(cs.added_systems)) {
    if (out.some((o) => o.system === name)) throw new Error('P1_SYSTEM_NAME_COLLISION ' + key + ' ' + name);
    out.push({ system: name, origin: 'REFERENCE_SUCCESSOR_V1', channel: s.channel, presence_token: s.presence_token, conventional: s.conventional, departure: s.departure, realization_parameter: s.realization_parameter, re_proportioned: s.re_proportioned || [], closure_family: false, reference_lines: (s.basis || []).map((b) => 'L' + b.reference_line) });
  }
  return out;
}
function presenceValue(m, p) { const o = m.observed || {}; if (Object.prototype.hasOwnProperty.call(o, p)) return o[p]; const t = m.tokens && m.tokens[p]; if (!t) return undefined; if (t.state === 'OBSERVED') return t.value; if (t.state === 'ABSENT') return '<ABSENT>'; return '<' + t.state + '>'; }
function realizationOf(m, p) { if (REALIZATION_EVIDENCE_KEYS.includes(p)) return m.realization ? m.realization[p] : null; const t = m.tokens && m.tokens[p]; return t ? { state: t.state, value: t.value === undefined ? null : t.value } : null; }

function constitutiveSystemStatus(authority, key, m) {
  return systemTable(authority, key).map((sys) => {
    const token = presenceValue(m, sys.presence_token); const param = sys.realization_parameter; const ev = param ? realizationOf(m, param) : null;
    const entry = { system: sys.system, origin: sys.origin, channel: sys.channel, reference_set: sys.conventional, departure_set: sys.departure === null ? 'OUTSIDE_CHARACTERISTIC_SET' : sys.departure, presence_token: sys.presence_token, token_value: token === undefined ? null : token,
      realization_parameter: param, realization_state: param ? (ev ? ev.state : 'KEY_OMITTED') : null, realization_value: param && ev ? ev.value : null, consumes: [] };
    if (sys.reference_lines) entry.reference_lines = sys.reference_lines;
    const ts = tokenState(token);
    const inConv = sys.closure_family ? closureSetMatch(sys.conventional, token) : sys.conventional.includes(token);
    const displacedBy = ts === 'ABSENT' || (sys.departure === null ? !inConv : sys.departure.includes(token));
    if (ts === 'NOT_OBSERVED') { entry.status = 'UNRESOLVED'; entry.basis = 'presence token not observed'; }
    else if (displacedBy) { entry.status = 'DISPLACED'; entry.basis = ts === 'ABSENT' ? 'presence token <ABSENT>' : (sys.departure === null ? 'presence token outside the characteristic set' : 'presence token in the Reference departure set (' + token + ')'); entry.consumes.push('token:' + sys.presence_token); }
    else if (!inConv) { entry.status = 'UNRESOLVED'; entry.basis = 'presence token neither in the conventional set nor in the Reference departure set (' + token + ') — fail closed'; }
    else if (param && realizationState(ev) === 'NOT_SETTLED') { entry.status = 'UNRESOLVED'; entry.basis = 'realization parameter ' + (ev ? ev.state : 'n/a'); }
    else if (param && realizationState(ev) === 'OBSERVED' && sys.re_proportioned.includes(ev.value)) { entry.status = 'SUBORDINATED'; entry.basis = 'present · realization re-proportioned (' + param + ' ' + ev.value + ')'; entry.consumes.push('token:' + param, 'SA-1:' + sys.presence_token + '#relative_size'); }
    else { entry.status = 'RETAINED'; entry.basis = !param ? 'present · system has no realization parameter (token-presence reading)' : (realizationState(ev) === 'NOT_EMITTED' ? 'present · realization parameter not emitted (token-presence reading)' : 'present · conventional realization (' + param + ' ' + ev.value + ')'); }
    return entry;
  });
}
function positiveRetention(entry) { // V3.2 verbatim
  if (entry.status !== 'RETAINED') return { positive: false, basis: entry.system + ' ' + entry.status };
  if (!entry.realization_parameter) return { positive: true, basis: entry.system + ' presence token OBSERVED in the characteristic set (no realization parameter)' };
  if (entry.realization_state === 'OBSERVED') return { positive: true, basis: entry.system + ' ' + entry.realization_parameter + ' OBSERVED ' + entry.realization_value };
  return { positive: false, basis: entry.system + ' realization parameter ' + entry.realization_parameter + ' ' + entry.realization_state + ' — retention not positively evidenced' };
}
function ceoS5Pattern(p) { return p.referent === 'BODY_FORM' && p.relation.value === 'MOST_PROMINENT' && Array.isArray(p.systems) && p.systems.length > 0 && p.systems.every((x) => x.status === 'RETAINED'); }
function bindingRules(authority, statementSet) { const ids = statementSet.map(classOf); return authority.rules.filter((r) => ids.every((id) => String(r.text + ' ' + r.id).includes(id))).map((r) => r.id); }

// ---- P-2 evidence ownership ----
function ownership(prom, systems, referent) {
  const consumed = new Set(systems.flatMap((s) => s.consumes)); const out = {}; const consumedLog = [];
  for (const [system, p] of Object.entries(prom)) {
    if (system === referent || p.value === 'UNKNOWN') { out[system] = { value: p.value, fired_clauses: p.fired_clauses, unsettled_facts: p.unsettled_facts, not_governed: p.not_governed }; continue; }
    const kept = [];
    for (const c of p.fired_clauses) {
      const keep = [], drop = [];
      for (const e of c.evidence) {
        const f = String(e.fact).replace(/\.values_detail.*/, '');
        let isConsumed = consumed.has(f);
        if (!isConsumed && /^SA-1:/.test(f)) isConsumed = consumed.has(f + '#relative_size') && e.relative_size === 'large' && e.contrast !== 'high';
        (isConsumed ? drop : keep).push(e);
      }
      if (drop.length) consumedLog.push({ system, clause: c.clause, facts: drop.map((e) => e.fact), consumed_by_constitutive_relation: systems.filter((s) => s.consumes.some((x) => drop.some((e) => x === String(e.fact) || x === String(e.fact) + '#relative_size'))).map((s) => s.system + ':' + s.status) });
      if (keep.length) kept.push(Object.assign({}, c, { evidence: keep }));
    }
    out[system] = { value: kept.length ? 'PROMINENT' : 'NOT_PROMINENT', fired_clauses: kept, unsettled_facts: p.unsettled_facts, not_governed: p.not_governed };
  }
  return { prominence: out, consumed_by_constitutive_relation: consumedLog };
}

// ---- member reading (V3.2 S1 – S5 on the member's own Statements) ----
function readMember(m, owned, unit, authority, relation) {
  const key = m.archetype_key; const obs = m.observed || {};
  const systems = constitutiveSystemStatus(authority, key, m);
  const base = { garment_ref: m.garment_ref === undefined ? null : m.garment_ref, key };
  if (!systems.length) return Object.assign(base, { value: 'UNRESOLVED', cause: 'REFERENCE_CONTENT_GAP', branch: 'P4 reference constitutive content not authored for ' + key, systems: [], statements: [] });
  const cc = characteristicConstruction(authority, key, obs);
  const baseRetained = cc.authored ? cc.retained : true; // keys without frozen characteristic construction: retention = the added systems' own positive retention
  const prom0 = PR.allProminence(m);
  if (!owned.length) {
    const ret = systems.map(positiveRetention); const nonRet = systems.filter((s) => s.status !== 'RETAINED'); const gaps = ret.filter((r) => !r.positive).map((r) => r.basis);
    if (nonRet.length) return Object.assign(base, { value: 'UNRESOLVED', cause: 'ITEM_OBSERVATION_RESOLUTION_GAP', branch: 'P-3 member without a Statement but a constitutive system is not RETAINED (' + nonRet.map((s) => s.system + ':' + s.status).join(', ') + ') — fail closed', systems, statements: [] });
    if (gaps.length) return Object.assign(base, { value: 'UNRESOLVED', cause: 'ITEM_OBSERVATION_RESOLUTION_GAP', branch: 'P-3 member without a Statement — constitutive retention not positively evidenced (' + gaps.join(' | ') + ')', systems, statements: [] });
    return Object.assign(base, { value: 'BASE_GRAMMAR_PRINCIPAL', cause: null, branch: 'P-3 member without a Statement · every constitutive system positively RETAINED', systems, statements: [], positive_retention: ret.map((r) => r.basis) });
  }
  const per = owned.map((s) => {
    const ich = channelOf(s); const referent = INTERVENTION_REFERENT[ich]; const own = ownership(prom0, systems, referent);
    const others = CHANNELS.filter((ch) => ch !== ich).map((ch) => ({ ch, v: m[ch] && m[ch].v, rule: m[ch] && m[ch].rule, why: m[ch] && m[ch].why }));
    return { statement: s, channel: ich, criterion: authority.criteriaByClass.get(classOf(s)).relation_class, referent, relation: PR.transformativeRelation(own.prominence, referent), prominence: own.prominence,
      consumed_by_constitutive_relation: own.consumed_by_constitutive_relation, others, others_all_false: others.every((o) => o.v === 'FALSE'), systems, base_tokens: cc.tokens || {},
      atomic_inputs: { sa1_referents: (m.sa1 || []).map((i) => i.referent), sa2_evidence: (m.sa2 ? m.sa2.evidence : []).map((e) => e.evidence_id + ':' + e.evidence_family) } };
  });
  const r = Object.assign(base, { statements: per, systems });
  const fail = (cause, branch) => Object.assign(r, { value: 'UNRESOLVED', cause, branch });
  if (unit.upstream.magnitude === 'STRONG' || per.some((p) => !p.others_all_false)) return fail('SEMANTIC_AUTHORITY_GAP', 'P6 STRONG magnitude / second whole-garment channel');
  if (per.some((p) => p.relation.value === 'UNDETERMINED')) return fail('ITEM_OBSERVATION_RESOLUTION_GAP', 'S1 organising-reading UNDETERMINED (' + per.filter((p) => p.relation.value === 'UNDETERMINED').map((p) => p.relation.basis).join(' | ') + ')');
  if (systems.some((x) => x.status === 'UNRESOLVED')) return fail('ITEM_OBSERVATION_RESOLUTION_GAP', 'S2 constitutive system UNRESOLVED (' + systems.filter((x) => x.status === 'UNRESOLVED').map((x) => x.system + ': ' + x.basis).join(' | ') + ')');
  if (per.every((p) => p.systems.some((x) => x.status === 'SUBORDINATED' || x.status === 'DISPLACED') && p.relation.value === 'MOST_PROMINENT')) {
    if (per.length >= 2 && relation.value !== 'COORDINATED') return fail('RELATIONAL_EVIDENCE_GAP', 'S3 intervention evidence without COORDINATED relation');
    return Object.assign(r, { value: 'INTERVENTION_PRINCIPAL', cause: null, branch: 'S3 INTERVENTION_PRINCIPAL', rule: 'D-FWD-2-S3/ATOMIC' });
  }
  if (per.every((p) => p.systems.every((x) => x.status === 'RETAINED') && p.relation.value === 'NOT' && baseRetained && p.others_all_false)) {
    const ret = systems.map(positiveRetention); const gaps = ret.filter((x) => !x.positive).map((x) => x.basis);
    if (gaps.length) return fail('ITEM_OBSERVATION_RESOLUTION_GAP', 'S4 not applicable — constitutive retention not positively evidenced (' + gaps.join(' | ') + ')');
    return Object.assign(r, { value: 'BASE_GRAMMAR_PRINCIPAL', cause: null, branch: 'S4 BASE_GRAMMAR_PRINCIPAL', rule: 'D-FWD-2-S4/ATOMIC', positive_retention: ret.map((x) => x.basis) });
  }
  if (per.every(ceoS5Pattern)) {
    const ret = systems.map(positiveRetention); const gaps = ret.filter((x) => !x.positive).map((x) => x.basis);
    if (gaps.length || !baseRetained || per.some((p) => !p.others_all_false)) return fail('ITEM_OBSERVATION_RESOLUTION_GAP', 'S5-CEO not applicable — constitutive retention not positively evidenced (' + (gaps.length ? gaps.join(' | ') : 'characteristic construction tokens not retained') + ')');
    return Object.assign(r, { value: 'BASE_GRAMMAR_PRINCIPAL', cause: null, branch: 'S5-CEO BASE_GRAMMAR_PRINCIPAL', rule: 'D-FWD-2-S5/CEO-2026-09-25', positive_retention: ret.map((x) => x.basis) });
  }
  return fail('SEMANTIC_AUTHORITY_GAP', 'S5 mixed evidence');
}

const sysBrief = (x) => ({ system: x.system, status: x.status, basis: x.basis, origin: x.origin, channel: x.channel });
function memberProvenance(mr) {
  const p = { garment_ref: mr.garment_ref, key: mr.key, value: mr.value, cause: mr.cause, branch: mr.branch, rule: mr.rule || null,
    statements: mr.statements.map((s) => s.statement), organising_reading: mr.statements.map((s) => s.relation), consumed_by_constitutive_relation: mr.statements.map((s) => s.consumed_by_constitutive_relation),
    constitutive_system_status: mr.systems.map(sysBrief) };
  if (mr.positive_retention) p.positive_retention = mr.positive_retention;
  return p;
}

function evaluateTransformative(upstream, members, authority) {
  assertUpstreamOnly(upstream);
  const st = upstream.statement_set || [];
  const classes = st.map(classOf);
  const anyUnresolved = members.some((m) => CHANNELS.some((ch) => m[ch] && !['TRUE', 'FALSE'].includes(m[ch].v))) || !!upstream.ownerless;
  let relation;
  if (st.length >= 2) { const b = bindingRules(authority, st); relation = b.length ? { value: 'COORDINATED', cause: null, provenance: { binding_rules: b, statements: st } } : { value: 'UNRESOLVED', cause: 'RELATIONAL_EVIDENCE_GAP' }; }
  else relation = { value: 'NOT_APPLICABLE', cause: null };
  const done = (value, cause, branch, provenance, trace) => ({ anchor_id: upstream.anchor_id, statement_set: st, keys: [...new Set(members.map((m) => m.archetype_key))],
    whole_garment_reading: { value, provenance: provenance || null, primary_cause: cause, branch, process_trace: trace || null }, statement_relation: relation });
  if (!st.length) return done('UNRESOLVED', 'ITEM_OBSERVATION_RESOLUTION_GAP', 'P1 no Statement');
  if (classes.some((c) => authority.heldClasses.has(c))) return done('UNRESOLVED', 'GOVERNED_SCOPE_BOUNDARY', 'P2 held class');
  if (classes.some((c) => !authority.criteriaByClass.get(c))) return done('UNRESOLVED', 'SEMANTIC_AUTHORITY_GAP', 'P3 no criterion');
  // P-3 ownership: every member carrying the Statement's Step 2 rule; V3.2 fallback to the first member
  const carriers = (s) => { const c = members.filter((m) => m[channelOf(s)] && m[channelOf(s)].rule === classOf(s)); return c.length ? c : [members[0]]; };
  const owned = new Map(members.map((m) => [m, []])); for (const s of st) for (const m of carriers(s)) owned.get(m).push(s);
  const reads = members.map((m) => readMember(m, owned.get(m), { upstream }, authority, relation));
  const trace = reads.flatMap((mr) => mr.statements.map((p) => ({ statement: p.statement, key: mr.key, garment_ref: mr.garment_ref, referent: p.referent, organising_reading: p.relation, prominence: p.prominence,
    consumed_by_constitutive_relation: p.consumed_by_constitutive_relation, atomic_inputs: p.atomic_inputs, constitutive_system_status: mr.systems })))
    .concat(reads.filter((mr) => !mr.statements.length).map((mr) => ({ statement: null, key: mr.key, garment_ref: mr.garment_ref, referent: null, organising_reading: null, prominence: null, consumed_by_constitutive_relation: [], atomic_inputs: null, constitutive_system_status: mr.systems, member_reading: mr.value })));
  const multi = members.length > 1; const member_readings = reads.map(memberProvenance);
  const p4 = reads.filter((x) => x.cause === 'REFERENCE_CONTENT_GAP');
  if (p4.length) return done('UNRESOLVED', 'REFERENCE_CONTENT_GAP', multi ? 'P4 (P-3 member ' + p4.map((x) => x.garment_ref + ' ' + x.key).join(' ; ') + ') reference constitutive content not authored' : p4[0].branch);
  if (anyUnresolved) return done('UNRESOLVED', 'ITEM_OBSERVATION_RESOLUTION_GAP', 'P5 unresolved channel / ownerless departure', null, trace);
  const unres = reads.filter((x) => x.value === 'UNRESOLVED');
  if (unres.length) return done('UNRESOLVED', unres[0].cause, multi ? 'P-3 member ' + unres.map((x) => x.garment_ref + ' (' + x.branch + ')').join(' ; ') : unres[0].branch, null, trace);
  const owners = reads.filter((x) => x.statements.length);
  const common = { criteria: owners.flatMap((x) => x.statements.map((p) => p.criterion)), reference_rows: reads.map((x) => x.key), atomic_inputs: owners.flatMap((x) => x.statements.map((p) => p.atomic_inputs)),
    non_intervened_channels: owners.flatMap((x) => x.statements.map((p) => p.others.map((o) => o.ch + ':' + o.rule))), colour_contrast: 'NOT_CONSUMED (no clause of the preregistered specification references it)' };
  if (reads.some((x) => x.value === 'INTERVENTION_PRINCIPAL')) {
    const iv = reads.filter((x) => x.value === 'INTERVENTION_PRINCIPAL'); const ps = iv.flatMap((x) => x.statements);
    return done('INTERVENTION_PRINCIPAL', null, multi ? 'P-3 member ' + iv.map((x) => x.garment_ref).join('+') + ' INTERVENTION_PRINCIPAL · every other member positively read' : iv[0].branch,
      Object.assign({ rule: 'D-FWD-2-S3/ATOMIC', composition: multi ? COMPOSITION_RULE : null, statements: ps.map((p) => p.statement), criteria: ps.map((p) => p.criterion), organising_reading: ps.map((p) => p.relation), prominence: ps.map((p) => p.prominence),
        consumed_by_constitutive_relation: ps.map((p) => p.consumed_by_constitutive_relation), intervened_systems: iv.map((x) => x.systems.filter((s) => s.status === 'SUBORDINATED' || s.status === 'DISPLACED').map(sysBrief)),
        member_readings, evidence_completeness: 'no UNRESOLVED channel · no ownerless departure · all four prominence predicates evaluable after evidence ownership · no UNRESOLVED constitutive system · every other member positively read' }, common, { criteria: ps.map((p) => p.criterion) }), trace);
  }
  const single = !multi ? reads[0] : null;
  const ps = owners.flatMap((x) => x.statements);
  return done('BASE_GRAMMAR_PRINCIPAL', null, multi ? 'P-3 every member BASE_GRAMMAR_PRINCIPAL' : single.branch,
    Object.assign({ rule: multi ? COMPOSITION_RULE : single.rule, statements: ps.map((p) => p.statement), organising_reading: ps.map((p) => p.relation), prominence: ps.map((p) => p.prominence),
      consumed_by_constitutive_relation: ps.map((p) => p.consumed_by_constitutive_relation), retained_characteristic_tokens: ps.map((p) => p.base_tokens), retained_systems: owners.flatMap((x) => x.statements.map(() => x.systems.map(sysBrief))),
      positive_retention: owners.flatMap((x) => x.statements.map(() => x.positive_retention)), member_readings,
      authority: (multi ? owners : [single]).some((x) => x.rule === 'D-FWD-2-S5/CEO-2026-09-25') ? 'CEO decision 2026-09-25 (STMX TC MAINLINE V2.3.56 §3): Transformative body-form departure with every constitutive grammar system positively RETAINED → BASE_GRAMMAR_PRINCIPAL; transformation magnitude alone ≠ grammar reconstruction' : null,
      evidence_completeness: 'no UNRESOLVED channel · no ownerless departure · all four prominence predicates evaluable after evidence ownership · every constitutive system RETAINED and positively evidenced on every member' }, common), trace);
}

module.exports = {
  evaluateTransformative, readMember, systemTable, constitutiveSystemStatus, ownership, characteristicConstruction, tokenState, realizationState, bindingRules, assertUpstreamOnly, positiveRetention, ceoS5Pattern, closureSetMatch,
  DependencyDirectionError, PRESENCE_TOKEN, REALIZATION_PARAMETER, RE_PROPORTIONED, INTERVENTION_REFERENT, COMPOSITION_RULE,
};
