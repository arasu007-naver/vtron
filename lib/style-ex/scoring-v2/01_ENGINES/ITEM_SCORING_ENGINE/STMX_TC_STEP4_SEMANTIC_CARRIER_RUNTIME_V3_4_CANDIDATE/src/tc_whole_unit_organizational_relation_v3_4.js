'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3.4 — GRAMMAR TRANSFORMATION PROCESS: whole-unit organizational relation (CANDIDATE / SHADOW).
 * Order: STMX TC MAINLINE V2.3.66 (CEO D-65 APPROVED — Option C). Implements the V2.3.64 D1 relational facts as a process-level relation of the
 * Grammar Transformation process, computed PARALLEL after whole_garment_reading (which it consumes) and BEFORE Grammar State successor resolution.
 *
 * Data-driven and category-general: every archetype / organization fact comes from the bound Reference V2 candidate organization blocks, read only
 * through the generic roles TRACEABILITY_BEARING · ORGANIZING · IDENTITY_CONSTITUENT and the block's separability. No garment key, category,
 * grammar or organization name appears in this code. Only the primary constituent reading of an ORGANIZING relation is read (CEO R-A: soft =
 * soft / non-tailored CONSTRUCTION); no alternative reading and no cloth / material evidence is ever consumed.
 * P-2: each member's organizing-relation status is consumed once; its organising reading once; both recorded in p2_consumption.
 * P-3: the unit relation is composed from every member; one member never decides the unit.
 * G60: this module never reads Grammar State (it receives only the transformative process output and the unit members).
 * Emits no tier, number, count, weight or score.
 */
const CHANNEL_OF_REFERENT = Object.freeze({ BODY_FORM: Object.freeze(['silhouette', 'proportion']), CONSTRUCTION: Object.freeze(['construction']) });
const P3_RULE = 'unit ORIGINAL_ORGANIZATION_PRINCIPAL if any member principal · UNRESOLVED if any member unresolved · ORGANIZATIONAL_PRIMACY_SHIFT only if every member shifted · one member never decides';
const PRESENT = (s) => s === 'RETAINED' || s === 'SUBORDINATED';

function evidenceStatus(ev, v) {
  if (ev.kind === 'NOT_EXECUTABLE') return { status: 'NOT_EXECUTABLE', fact: String(ev.token), channel: null };
  if (ev.kind === 'constitutive_system') { const s = v.systems.find((x) => x.system === ev.system); return { status: s ? s.status : 'UNRESOLVED', fact: 'system:' + ev.system + (s ? ' (' + s.basis + ')' : ' (absent)'), channel: s ? s.channel : null }; }
  if (ev.kind === 'channel_conventionality') { const c = v.channels[ev.channel]; return { status: c === 'FALSE' ? 'RETAINED' : c === 'TRUE' ? 'DISPLACED' : 'UNRESOLVED', fact: 'channel:' + ev.channel + '=' + c, channel: ev.channel }; }
  if (ev.kind === 'channel_body') { const c = v.channels[ev.channel]; return { status: c === 'FALSE' ? 'RETAINED' : c === 'TRUE' ? 'SUBORDINATED' : 'UNRESOLVED', fact: 'body-channel:' + ev.channel + '=' + c, channel: ev.channel }; }
  if (ev.kind === 'projected_token') { const t = v.tokens && v.tokens[ev.token]; const val = t && t.state === 'OBSERVED' ? t.value : null; return { status: val === null ? 'UNRESOLVED' : ev.conventional.includes(val) ? 'RETAINED' : ev.departure.includes(val) ? 'DISPLACED' : 'UNRESOLVED', fact: 'token:' + ev.token + '=' + (val === null ? (t ? t.state : 'MISSING') : val), channel: ev.channel || null }; }
  return { status: 'UNRESOLVED', fact: 'unknown evidence kind', channel: null };
}
function relationStatus(evs) { const ex = evs.filter((e) => e.status !== 'NOT_EXECUTABLE'); if (!ex.length || ex.some((e) => e.status === 'UNRESOLVED')) return 'UNRESOLVED'; if (ex.some((e) => e.status === 'DISPLACED')) return 'DISPLACED'; if (ex.some((e) => e.status === 'SUBORDINATED')) return 'SUBORDINATED'; return 'RETAINED'; }

function memberViews(t, unitMembers) {
  const w = t.whole_garment_reading; const pt = w.process_trace || []; const mr = w.provenance && w.provenance.member_readings ? w.provenance.member_readings : null;
  return [...new Set(pt.map((e) => e.garment_ref))].map((ref) => { const es = pt.filter((e) => e.garment_ref === ref); const m = unitMembers.find((x) => x.garment_ref === ref);
    return { garment_ref: ref, key: es[0].key, systems: es[0].constitutive_system_status || [], statements: es.filter((e) => e.statement).map((e) => ({ statement: e.statement, referent: e.referent, organising: e.organising_reading })), member_reading: mr ? (mr.find((x) => x.garment_ref === ref) || {}).value : es[0].member_reading || null,
      channels: Object.fromEntries(['silhouette', 'proportion', 'construction'].map((c) => [c, m && m[c] ? m[c].v : null])), tokens: m ? m.tokens : null }; });
}

function memberRelations(v, REF) {
  const K = REF.keys[v.key]; if (!K || !K.A_identity_bearing) return null;
  const out = [];
  for (const [name, r] of Object.entries(K.A_identity_bearing)) {
    if (r.status) continue; // REFERENCE_AUTHORITY_INSUFFICIENT relations are never evaluated (fail closed by absence of authority)
    if (r.role === 'ORGANIZING') {
      const cons = Object.entries(r.constituents).map(([cn, c]) => { const evs = c.evidence.map((e) => evidenceStatus(e, v)); return { constituent: cn, status: relationStatus(evs), executable: evs.some((e) => e.status !== 'NOT_EXECUTABLE'), channels: [...new Set(evs.map((e) => e.channel).filter(Boolean))], evidence: evs.map((e) => e.fact) }; });
      const ex = cons.filter((c) => c.executable); let status;
      if (ex.some((c) => PRESENT(c.status))) status = 'PRESENT'; else if (cons.length && cons.every((c) => c.executable && c.status === 'DISPLACED')) status = 'DISPLACED'; else status = 'UNRESOLVED';
      out.push({ relation: name, role: 'ORGANIZING', status, channels: [...new Set(cons.flatMap((c) => c.channels))], constituents: cons, fail_closed_reason: status === 'UNRESOLVED' && ex.length && ex.every((c) => c.status === 'DISPLACED') ? 'every executable constituent DISPLACED but a NOT_EXECUTABLE constituent remains' : null });
    } else { const evs = r.evidence.map((e) => evidenceStatus(e, v)); out.push({ relation: name, role: r.role, status: relationStatus(evs), channels: [...new Set(evs.map((e) => e.channel).filter(Boolean))], evidence: evs.map((e) => e.fact) }); }
  }
  return out;
}

function readMember(v, REF) {
  const K = REF.keys[v.key]; const rels = memberRelations(v, REF);
  const stm = v.statements.map((s) => ({ statement: s.statement, organising: s.organising && s.organising.value, referent: s.referent, channels: CHANNEL_OF_REFERENT[s.referent] || [] }));
  if (!rels) return { garment_ref: v.garment_ref, key: v.key, separability: null, status: 'NOT_AUTHORED', traceability: 'NO_ORGANIZATION_BLOCK', organizing_relation: null, traceability_bearing: [], identity_constituents: [], organising_statements: stm.map((s) => Object.assign(s, { on_organizing_channel: false })), p2_consumption: [], member_reading: v.member_reading };
  const separable = K.separability === 'SEPARABLE'; const org = rels.find((r) => r.role === 'ORGANIZING'); const trace = rels.filter((r) => r.role === 'TRACEABILITY_BEARING'); const idc = rels.filter((r) => r.role === 'IDENTITY_CONSTITUENT');
  for (const s of stm) s.on_organizing_channel = !!org && s.channels.some((c) => org.channels.includes(c));
  const p2 = []; let traceability, status;
  if (separable) {
    traceability = trace.some((r) => r.status === 'UNRESOLVED') ? 'UNRESOLVED' : trace.some((r) => r.status === 'DISPLACED') ? 'NOT_TRACEABLE' : 'TRACEABLE';
    p2.push({ kind: 'traceability_status', fact: trace.map((r) => r.relation + '=' + r.status).join(',') });
    if (!org) status = 'UNRESOLVED';
    else { p2.push({ kind: 'organizing_relation_status', fact: org.relation + '=' + org.status });
      if (org.status === 'PRESENT') status = 'ORIGINAL_ORGANIZATION_PRINCIPAL';
      else if (org.status === 'DISPLACED') { const organisers = stm.filter((s) => s.organising === 'MOST_PROMINENT' && s.on_organizing_channel); p2.push({ kind: 'organising_reading', fact: organisers.map((s) => s.statement + '→' + s.organising).join(',') || 'none on the organizing relation' }); status = organisers.length ? 'ORGANIZATIONAL_PRIMACY_SHIFT' : 'ORGANIZATION_DISPLACED_PRIMACY_NOT_SHIFTED'; }
      else status = 'UNRESOLVED'; }
  } else {
    p2.push({ kind: 'identity_constituent_status', fact: idc.map((r) => r.relation + '=' + r.status).join(',') });
    if (idc.some((r) => r.status === 'UNRESOLVED')) { traceability = 'UNRESOLVED'; status = 'UNRESOLVED'; } else if (idc.some((r) => r.status === 'DISPLACED')) { traceability = 'ORGANIZATION_TRACEABILITY_NOT_SEPARABLE'; status = 'UNRESOLVED'; } else { traceability = 'TRACEABLE'; status = 'ORIGINAL_ORGANIZATION_PRINCIPAL'; }
  }
  return { garment_ref: v.garment_ref, key: v.key, separability: K.separability, status, traceability, organizing_relation: org ? { relation: org.relation, status: org.status, channels: org.channels, constituents: org.constituents.map((c) => ({ constituent: c.constituent, status: c.status, executable: c.executable, evidence: c.evidence })), fail_closed_reason: org.fail_closed_reason } : null,
    traceability_bearing: trace.map((r) => ({ relation: r.relation, status: r.status, evidence: r.evidence })), identity_constituents: idc.map((r) => ({ relation: r.relation, status: r.status, evidence: r.evidence })), organising_statements: stm, p2_consumption: p2, member_reading: v.member_reading };
}

function composeUnit(members) {
  const st = members.map((m) => m.status);
  if (!members.length || st.includes('NOT_AUTHORED')) return 'NOT_AUTHORED';
  if (st.includes('ORIGINAL_ORGANIZATION_PRINCIPAL')) return 'ORIGINAL_ORGANIZATION_PRINCIPAL';
  if (st.includes('UNRESOLVED')) return 'UNRESOLVED';
  if (st.every((x) => x === 'ORGANIZATIONAL_PRIMACY_SHIFT')) return 'ORGANIZATIONAL_PRIMACY_SHIFT';
  return 'ORGANIZATION_DISPLACED_PRIMACY_NOT_SHIFTED';
}

function computeRelation(t, unitMembers, REF, referenceSha256) {
  const views = memberViews(t, unitMembers); const members = views.map((v) => readMember(v, REF));
  const traceability = members.some((m) => m.traceability === 'NOT_TRACEABLE') ? 'NOT_TRACEABLE' : members.length && members.every((m) => m.traceability === 'TRACEABLE') ? 'TRACEABLE' : 'UNRESOLVED';
  return { process: 'GRAMMAR_TRANSFORMATION_WHOLE_UNIT_ORGANIZATIONAL_RELATION', position: 'after whole_garment_reading · before Grammar State successor resolution', whole_garment_reading: t.whole_garment_reading.value, statement_relation: t.statement_relation.value, organizational_relation: composeUnit(members), traceability, members,
    provenance: { statement_ids: (t.statement_set || []).slice(), channels: [...new Set((t.statement_set || []).map((s) => s.split(':')[0].toLowerCase()))], reference_sha256: referenceSha256, constitutive_statuses: members.flatMap((m) => (m.organizing_relation ? m.organizing_relation.constituents.map((c) => m.garment_ref + ':' + c.constituent + '=' + c.status) : m.identity_constituents.map((c) => m.garment_ref + ':' + c.relation + '=' + c.status))), p3_rule: P3_RULE } };
}

module.exports = { computeRelation, readMember, memberRelations, memberViews, evidenceStatus, composeUnit, CHANNEL_OF_REFERENT, P3_RULE };
