'use strict';
/**
 * STMX TC V2 — frozen TC V1 chain access (READ-ONLY).
 * corpusUnits(): runs the frozen chain (Step 2 successor V4 → shadow binding V3 → runtime V3.4, registry BOUND) in memory, once, and returns the 114 governed
 *   units with their frozen unit Direction, member records and the member INPUT token set the successor used.
 * memberInput(): the successor's member input = historical tokens + successor-changed observed fields (registry selection, delta V3) + projection-V5 regional
 *   fit for WG members + projection-V5 governed-correction fields (GRC). Verified in the design review: 120 / 126 members reproduce the frozen channel verdicts;
 *   the 6 that do not carry a frozen-ledger Construction verdict that is not recomputable from tokens (all V1-decided). reproduces() is the per-member guard.
 * ⛔ No GT / REF list / rationale is read; the chain itself deletes tier / GT fields at parse.
 */
const B = require('./tc_v2_binding');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const obsTok = (v) => ({ state: 'OBSERVED', value: v, values: null });
const tokenFromRecorded = (v) => { if (v === 'n/a') return undefined; const x = /^<(.+)>$/.exec(String(v)); return x ? { state: x[1], value: null, values: null } : obsTok(String(v)); };
const CHANNELS = ['silhouette', 'proportion', 'construction'];
let MEMO = null; let S = null;
const successor = () => (S = S || B.SUCC.createSuccessor({ registry: 'BOUND' }));
function load() {
  if (MEMO) return MEMO;
  const SH = B.SHADOW.runShadow({ registry: 'BOUND' }); const A = B.HIST.loadBound();
  const hist = new Map(A.step2Members.map((m) => [m.anchor_id + '|' + m.garment_ref, m])); const V5M = new Map(B.V5.members.map((m) => [m.anchor_id + '|' + m.garment_ref, m.observations]));
  const memberInput = (x) => { const m = x.record; const mk = m.anchor_id + '|' + m.garment_ref; const hm = hist.get(mk); const base = B.SUCC.historicalTokens(hm, A.tokensByMember.get(mk));
    for (const [f, v] of Object.entries(m.observed || {})) if (!hm.observed || hm.observed[f] !== v) { const t = tokenFromRecorded(v); if (t === undefined) delete base[f]; else base[f] = t; }
    const v5 = V5M.get(mk) || {}; if (((x.provenance || {}).input_contract_rules || []).includes('WG') && v5.fit) base.fit = clone(v5.fit);
    for (const f of B.GRC_FIELDS.get(mk) || []) if (v5[f]) base[f] = clone(v5[f]); return base; };
  const byA = new Map(); for (const x of SH.members) { const a = x.record.anchor_id; if (!byA.has(a)) byA.set(a, []); byA.get(a).push(x); }
  const up = new Map(SH.units.map((u) => [u.anchor_id, u.upstream]));
  const units = SH.output.units.map((u) => ({ anchor: u.anchor_id, scoring_unit_type: up.get(u.anchor_id).scoring_unit_type, v1_direction: u.direction, upstream: { valid_departure_set: clone(up.get(u.anchor_id).valid_departure_set || []), ownerless: !!up.get(u.anchor_id).ownerless },
    classic: clone(u.classic || null), members: (byA.get(u.anchor_id) || []).map((x) => ({ record: clone(x.record), input: memberInput(x), source: 'FROZEN_CHAIN' })) }));
  MEMO = { units, census: units.reduce((o, u) => { o[u.v1_direction] = (o[u.v1_direction] || 0) + 1; return o; }, {}) }; return MEMO; }
/** frozen predicates on one member input (no asymmetry evidence: asymmetry is carried by the member record) */
function evaluateTokens(tokens, key) { return successor().evaluateMember(clone(tokens), key, []); }
/** per-member reproduction guard: the member input re-produces the frozen channel verdicts (v + rule) */
function reproduces(member) { const o = evaluateTokens(member.input, member.record.archetype_key); return CHANNELS.every((c) => o[c].v === member.record[c].v && o[c].rule === member.record[c].rule); }
module.exports = { corpusUnits: () => load().units, census: () => load().census, evaluateTokens, reproduces, CHANNELS, clone };
