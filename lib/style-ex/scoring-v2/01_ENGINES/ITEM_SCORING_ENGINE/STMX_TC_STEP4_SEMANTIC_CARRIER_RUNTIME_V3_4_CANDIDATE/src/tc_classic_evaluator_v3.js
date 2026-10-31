'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3 — CLASSIC EVALUATOR (Reference ↔ Realization Reading, carrier C) · R1-FREE D-7 SUCCESSOR.
 *   A Reference Knowledge  = bound D-7 partial baseline V1.1 rows (consumed, never scored)
 *   B Actual Realization   = the member's observed D1 tokens (Step 2)
 *   C Reading              = per-channel realization_relation + identity_participation (this module's only output)
 * readChannel is carried from V1 / V2 verbatim. readIdentity:
 *   (1) reference characteristic_realization not authored            → UNRESOLVED / REFERENCE_CONTENT_GAP   (Atomic evidence never repairs A)
 *   (2) construction realization_relation UNRESOLVED                  → UNRESOLVED / ITEM_OBSERVATION_RESOLUTION_GAP
 *       construction realization decidable, not CHARACTERISTIC        → UNRESOLVED / SEMANTIC_AUTHORITY_GAP
 *       ((1) – (2) verbatim from TC_CRITERIA_SUCCESSORS_V1 :: classic_d7_identity_participation)
 *   (3) R1 REPLACED by the sealed V2.3.53 classic_organising_role relation over the four per-system prominence predicates:
 *       MOST_PROMINENT                  → MATERIAL
 *       ANOTHER_SYSTEM_MORE_PROMINENT   → INCIDENTAL
 *       UNDETERMINED (UNKNOWN / tie)    → UNRESOLVED / ITEM_OBSERVATION_RESOLUTION_GAP
 * No primitive → carrier shortcut: a large or contrasted construction referent alone never yields MATERIAL — steps (1) and (2) must hold
 * and every competitor system must be evaluated.
 */
const { CHANNELS } = require('./tc_semantic_vocabulary_v3');
const PR = require('./tc_prominence_derivation_v3');

const RULE_ID = 'D7-S1(1)(2)+LANE-CLASSIC(3)';
const present = (v) => v !== undefined && v !== null && v !== 'n/a' && v !== '<ABSENT>';

function readChannel(authority, key, channel, obs) {
  const row = authority.baselineByKey.get(key);
  if (!row || row.characteristic_realization.status === 'NOT_AUTHORED') return { value: 'UNRESOLVED', cause: 'REFERENCE_CONTENT_GAP' };
  const cr = row.characteristic_realization[channel];
  if (!cr || cr.status === 'NOT_AUTHORED') return { value: 'UNRESOLVED', cause: 'REFERENCE_CONTENT_GAP' };
  const checks = [];
  if (channel === 'silhouette') {
    checks.push(['shoulder_structure', obs.shoulder_structure, cr.shoulder_structure]);
  } else if (channel === 'proportion') {
    checks.push(['length', obs.length, cr.length]);
  } else {
    if (cr.lapel_system) checks.push(['collar', obs.collar, cr.lapel_system]);
    if (cr.closure_system) checks.push(['closure_type', obs.closure_type, cr.closure_system.includes('Button') && cr.closure_system.length === 1 ? 'BUTTON_FAMILY' : cr.closure_system]);
    if (cr.sleeve_system) checks.push(['sleeve', obs.sleeve, cr.sleeve_system]);
    if (cr.front_opening_extent && (present(obs.front_opening_extent) || !cr.lapel_system)) checks.push(['front_opening_extent', obs.front_opening_extent, cr.front_opening_extent]);
  }
  if (checks.some(([, v]) => !present(v))) return { value: 'UNRESOLVED', cause: 'ITEM_OBSERVATION_RESOLUTION_GAP' };
  const all = checks.every(([, v, set]) => (set === 'BUTTON_FAMILY' ? /Button/.test(String(v)) : set.includes(v)));
  return { value: all ? 'CHARACTERISTIC' : 'WITHIN_RANGE', provenance: { reference_row: key, tokens: Object.fromEntries(checks.map(([c, v]) => [c, v])) } };
}

function readIdentity(authority, key, realization, member) {
  const row = authority.baselineByKey.get(key);
  const referenceAuthored = !!(row && row.characteristic_realization.status !== 'NOT_AUTHORED'
    && row.characteristic_realization.construction && row.characteristic_realization.construction.status !== 'NOT_AUTHORED');
  if (!referenceAuthored) return { value: 'UNRESOLVED', cause: 'REFERENCE_CONTENT_GAP', rule: RULE_ID, failed: '(1) reference characteristic construction not authored' };
  const con = realization.construction;
  if (con.value === 'UNRESOLVED') return { value: 'UNRESOLVED', cause: 'ITEM_OBSERVATION_RESOLUTION_GAP', rule: RULE_ID, failed: '(2) construction realization undecidable' };
  if (con.value !== 'CHARACTERISTIC') return { value: 'UNRESOLVED', cause: 'SEMANTIC_AUTHORITY_GAP', rule: RULE_ID, failed: '(2) characteristic construction system not realised — criteria define no reading' };
  const prom = PR.allProminence(member);
  const rel = PR.classicRelation(prom);
  const predicates = Object.fromEntries(Object.entries(prom).map(([s, p]) => [s, { value: p.value, fired_clauses: p.fired_clauses, unsettled_facts: p.unsettled_facts, not_governed: p.not_governed }]));
  if (rel.value === 'UNDETERMINED') return { value: 'UNRESOLVED', cause: 'ITEM_OBSERVATION_RESOLUTION_GAP', rule: RULE_ID, failed: '(3) organising-role UNDETERMINED — ' + rel.basis, relation: rel, prominence: predicates };
  const provenance = {
    rule: RULE_ID,
    reference_row: key,
    construction_realization: { value: con.value, tokens: con.provenance.tokens },
    organising_role: rel,
    prominence: predicates,
    atomic_inputs: { sa1_referents: (member.sa1 || []).map((i) => i.referent), sa2_evidence: (member.sa2 ? member.sa2.evidence : []).map((e) => e.evidence_id + ':' + e.evidence_family), token_facts_read: [...new Set(Object.values(prom).flatMap((p) => p.facts_read).filter((f) => f.startsWith('token:')))] },
    colour_contrast: 'NOT_CONSUMED (no clause of the preregistered specification references it)',
    evidence_completeness: 'all four prominence predicates evaluable (no UNKNOWN)',
  };
  if (rel.value === 'MOST_PROMINENT') return { value: 'MATERIAL', cause: null, provenance };
  return { value: 'INCIDENTAL', cause: null, provenance };
}

function evaluateClassic(upstream, members, authority) {
  const readings = members.map((m) => {
    const obs = m.observed || {};
    const realization = {};
    for (const ch of CHANNELS) realization[ch] = readChannel(authority, m.archetype_key, ch, obs);
    const characteristicOnItem = Object.values(realization).some((v) => v.value === 'CHARACTERISTIC');
    return { key: m.archetype_key, garment_ref: m.garment_ref === undefined ? null : m.garment_ref, realization_relation: realization,
      characteristic_realized_any_channel: characteristicOnItem, identity_participation: readIdentity(authority, m.archetype_key, realization, m) };
  });
  const decidableAny = readings.length > 0 && readings.every((x) => Object.values(x.realization_relation).some((v) => v.value !== 'UNRESOLVED'));
  const decidableAll = readings.every((x) => Object.values(x.realization_relation).every((v) => v.value !== 'UNRESOLVED'));
  return { anchor_id: upstream.anchor_id, keys: readings.map((x) => x.key), members: readings, unit: { relationally_decidable_any_channel: decidableAny, all_channels_decidable: decidableAll } };
}

module.exports = { evaluateClassic, readChannel, readIdentity, RULE_ID };
