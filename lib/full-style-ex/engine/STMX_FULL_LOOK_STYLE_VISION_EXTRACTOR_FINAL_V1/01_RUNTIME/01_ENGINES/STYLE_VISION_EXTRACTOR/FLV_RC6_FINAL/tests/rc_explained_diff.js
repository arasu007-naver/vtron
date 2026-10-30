'use strict';
/**
 * RC1 — STRICT explained-difference check for predecessor comparisons (replaces the INTEGRATED V1 blanket exclusion `INT_EXPLAINED`,
 * which removed whole facts from the byte comparison). Every pool difference between a predecessor packet and an RC1 packet built from the
 * SAME input must carry one of the documented explanations below, proven from the RC1 packet's own K-2 ledger; anything else is reported
 * as unexplained. Values present in both packets must be equal (observation_group / pockets[] provenance aside).
 *
 *   K1 DM_A1_READABILITY_READ   present only in RC1 · the ledger shows requester DM-A1 storing it · fact ∈ the readability set (cache reuse of G2)
 *   K2 TRIGGER_NOT_APPLICABLE   present only in the predecessor · the RC1 ledger lists it in not_applicable_by_trigger (frozen Item trigger)
 *   K3 GATE_PARENT_READ         present only in RC1 · the RC1 ledger lists it in parent_gate_reads (input of a frozen trigger / Two-Gate)
 *   K4 CA29_LEGACY_POCKET       pocket: predecessor OBSERVED Present (scalar form) · RC1 UNKNOWN (UNCONVERTIBLE, nothing invented) or OBSERVED
 *                               Present WITH pockets[] bridged by the fixture overlay (provider note POCKET_LEGACY_SCALAR_READING_BRIDGED_BY_OVERLAY)
 *   K5 CA29_NESTED_SCALAR       pocket_construction / pocket_projection present only in the predecessor · the RC1 ledger lists it nested / N/A
 *   K0 PREDECESSOR_EXTENSION    present only in RC1 · named by the caller as an earlier documented extension (e.g. V1.2 D-2 shoulder_drop)
 */
const I = require('../src/integrated');
const norm = (f) => JSON.stringify((({ observation_group, pockets, ...x }) => x)(f));
function explainPoolDiff(oldP, newP, opts) {
  const o = opts || {}; const inRefs = (r) => !o.refs || o.refs.includes(r);
  const led = (newP.request_trace && newP.request_trace.k2_ledger) || []; const notes = (newP.request_trace && newP.request_trace.provider_notes) || [];
  const A = new Map(oldP.component_fact_pool.filter((f) => inRefs(f.component_ref)).map((f) => [f.component_ref + '.' + f.fact, f]));
  const B = new Map(newP.component_fact_pool.filter((f) => inRefs(f.component_ref)).map((f) => [f.component_ref + '.' + f.fact, f]));
  const explained = [], unexplained = [];
  const ledFor = (ref) => led.filter((l) => l.component_ref === ref);
  for (const [k, a] of A) {
    const b = B.get(k); const [ref, fact] = [a.component_ref, a.fact];
    if (b) {
      if (norm(a) === norm(b)) continue;
      if (fact === 'pocket' && a.state === 'OBSERVED' && a.value === 'Present' && !a.pockets && (b.state === 'UNKNOWN' || (b.state === 'OBSERVED' && b.value === 'Present' && Array.isArray(b.pockets) && notes.some((n) => n.ref === ref && n.note === 'POCKET_LEGACY_SCALAR_READING_BRIDGED_BY_OVERLAY')))) explained.push({ key: k, kind: 'K4 CA29_LEGACY_POCKET', detail: b.state + (b.pockets ? ' + ' + b.pockets.length + ' instance(s) from the overlay' : '') });
      else unexplained.push({ key: k, kind: 'VALUE_CHANGED', old: norm(a), new: norm(b) });
      continue;
    }
    if (I.NESTED_FACTS[fact] && ledFor(ref).some((l) => (l.nested || []).includes(fact) || (l.not_applicable || []).includes(fact))) { explained.push({ key: k, kind: 'K5 CA29_NESTED_SCALAR' }); continue; }
    const trig = ledFor(ref).find((l) => l.not_applicable_by_trigger && l.not_applicable_by_trigger[fact]);
    if (trig) { explained.push({ key: k, kind: 'K2 TRIGGER_NOT_APPLICABLE', detail: trig.not_applicable_by_trigger[fact] }); continue; }
    unexplained.push({ key: k, kind: 'REMOVED', old: norm(a) });
  }
  for (const [k, b] of B) {
    if (A.has(k)) continue; const [ref, fact] = [b.component_ref, b.fact];
    if (ledFor(ref).some((l) => l.requester === 'DM-A1' && (l.stored || []).includes(fact)) && (I.DM_READABILITY_FACTS || []).includes(fact)) { explained.push({ key: k, kind: 'K1 DM_A1_READABILITY_READ' }); continue; }   // RC2: never hit (DM-A1 withdrawn)
    if (ledFor(ref).some((l) => (l.parent_gate_reads || []).includes(fact))) { explained.push({ key: k, kind: 'K3 GATE_PARENT_READ' }); continue; }
    if ((o.allowNew || []).includes(fact)) { explained.push({ key: k, kind: 'K0 PREDECESSOR_EXTENSION' }); continue; }
    unexplained.push({ key: k, kind: 'ADDED', new: norm(b) });
  }
  return { explained, unexplained };
}
/** Strip the RC1 / integrated provenance carriers that have no predecessor counterpart (the pool is compared by explainPoolDiff, never stripped). */
function stripCarriers(p, extra) {
  const q = JSON.parse(JSON.stringify(p)); delete q.packet_version; delete q.common_visibility; delete q.dm_adapter; delete q.dm_transport; delete q.dm_acquisition; delete q.request_trace; delete q.component_fact_pool;
  if (q.upper_realization && q.upper_realization.shoulder) delete q.upper_realization.shoulder.observation_group;
  q.dm_systems = q.dm_subsystem ? q.dm_subsystem.look_detail_systems : q.dm_block_withheld ? q.dm_block_withheld.look_detail_systems : q.dm_evidence ? q.dm_evidence.look_detail_systems : null; delete q.dm_subsystem; delete q.dm_block_withheld; delete q.dm_evidence;   // RC4 (Transport V2): the systems of the V2 record are compared exactly like the V1 / withheld systems; dm_transport is provenance (like dm_adapter)
  if (extra) extra(q); return JSON.stringify(q);
}
module.exports = { explainPoolDiff, stripCarriers };
