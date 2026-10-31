'use strict';
/* STMX ITEM EI V2 — CANDIDATE. ADMISSIBLE READINGS of one governed product, built ONLY from frozen exported functions.
   A reading = { start (frozen starting state), intrinsic (Base Character), pathways, evidence }. Enumerated: the categories the observations are valid for (when the
   category is not established) · every Colour V1 family (when colour is not established) · every value an UNOBSERVED Registry predicate field (material ·
   grammar · trouser_distinction) could take · each member base of a base-inconsistent pair. Never enumerated: the existence of an unobserved element. */
const { RT, COLOUR, RULES } = require('./ei_v2_frozen_bindings');
const CATS = RULES.CATEGORIES; const FAMILIES = COLOUR.FAMILIES.filter((f) => f !== 'uncertain');
const clone = (x) => JSON.parse(JSON.stringify(x));
const CO_NOT_ESTABLISHED = Object.freeze({ primary_color_family: 'uncertain', color_lightness: null, color_usage: null, additional_colors: [] });   // Colour V1's own "not established" token
const VALID_CO = { primary_color_family: 'black', color_lightness: null, color_usage: null, multi_color: false, color_effect: null, additional_colors: [] };
/* reader of the governed force context the frozen run() builds internally (closure context + material families + trouser distinction) — needed to call the exported Stage 6 */
const forceCtx = (obs) => { const mat = obs && obs.material; const td = obs && obs.trouser_distinction; return { closure_context: RT.closureContext(obs), material_families: mat && Array.isArray(mat.values) ? mat.values.map((v) => (v && typeof v === 'object' ? v.value : v)).filter(Boolean) : [], trouser_distinction: td && td.state === 'OBSERVED' && td.value ? td.value : 'NOT_GOVERNED' }; };
const catValid = (c, obs) => RT.validateInput({ category: c, observations: obs, color_observation: VALID_CO }).ok;
const PRED = { material: ['Leather', 'Suede', 'Denim', 'Wool'].map((v) => ({ state: 'OBSERVED', value: null, values: [{ value: v }] })), grammar: [{ state: 'OBSERVED', value: 'Tailored' }, { state: 'ABSENT', value: null }], trouser_distinction: ['Tailored', 'Jeans', 'Sport', 'Leggings'].map((v) => ({ state: 'OBSERVED', value: v })).concat([{ state: 'ABSENT', value: null }]) };
function predicateStarts(cat, obs, co) { let vs = [clone(obs)]; const unobserved = [];
  for (const f of ['material'].concat(cat === 'Jacket' ? ['grammar'] : [], cat === 'Trouser' ? ['trouser_distinction'] : [])) { if (obs[f] && obs[f].state === 'OBSERVED') continue; unobserved.push(f); vs = vs.flatMap((v) => PRED[f].map((x) => Object.assign(clone(v), { [f]: clone(x) }))); }
  const cb = RT.resolveColorBase(co); return { starts: [...new Set(vs.map((o) => RT.startingState(cb, RT.resolveContextualNeutral(cat, o, cb), RT.resolveMaterialColorContext(o, cb, cat))))].sort(), unobserved }; }
function pathwaysOf(cat, obs, co) { const col = RT.collectEvidence(cat, obs, co); const groups = RT.deduplicate(col.evidence); RT.resolveForces(col.evidence, co, forceCtx(obs)); return { pathways: RT.resolveIndependence(col.evidence, groups), evidence: col.evidence }; }
function garmentReadings(inp) { const obs = inp.observations, co = inp.color_observation; const cats = inp.category ? [inp.category] : CATS.filter((c) => catValid(c, obs)); const out = []; const seen = new Set();
  const push = (r) => { const k = r.c + '|' + r.start + '|' + r.intrinsic; if (!seen.has(k)) { seen.add(k); out.push(r); } };
  for (const c of cats) {
    if (co) { const tr = RT.run(clone({ category: c, observations: obs, color_observation: co }), {}); if (tr.final_direction === 'INVALID_INPUT') continue; const ps = predicateStarts(c, obs, co);
      for (const s of ps.unobserved.length ? ps.starts : [tr.transition_input_state]) push({ c, start: s, intrinsic: tr.color_base, pathways: tr.independent_pathways || [], evidence: tr.observed_evidence || [], registry_basis: tr.base_resolution_basis === 'DENIM_NEUTRAL_ELIGIBILITY' ? 'DENIM_NEUTRAL_ELIGIBILITY' : 'REGISTRY_V3', frozen_v1: tr.final_direction, unobserved_predicates: ps.unobserved }); }
    else { const pw = pathwaysOf(c, obs, CO_NOT_ESTABLISHED); for (const f of FAMILIES) { const cb = RT.resolveColorBase({ primary_color_family: f }); push({ c, start: RT.startingState(cb, RT.resolveContextualNeutral(c, obs, cb), RT.resolveMaterialColorContext(obs, cb, c)), intrinsic: cb.color_base, pathways: pw.pathways, evidence: pw.evidence }); } } }
  return { readings: out, categories: cats }; }
function pairPathways(members) { const ordered = members.slice().sort((a, b) => String(a.member_id).localeCompare(String(b.member_id))); let all = [];
  for (const m of ordered) { const col = RT.collectEvidence(m.category, m.observations, m.color_observation || CO_NOT_ESTABLISHED); for (const e of col.evidence) { e.member_id = m.member_id; e.evidence_id = m.member_id + ':' + e.evidence_id; } all = all.concat(col.evidence); }
  const groups = RT.deduplicate(all); for (const m of ordered) RT.resolveForces(all.filter((e) => e.member_id === m.member_id), m.color_observation || CO_NOT_ESTABLISHED, forceCtx(m.observations)); return { pathways: RT.resolveIndependence(all, groups), evidence: all }; }
function pairReadings(members, rest) { const ms = members.map((m) => ({ member_id: m.member_id, category: m.input.category, observations: m.input.observations, color_observation: m.input.color_observation }));
  if (ms.every((m) => m.category && m.color_observation)) { const tr = RT.runPair(clone(Object.assign({}, rest, { members: ms })));
    if (tr.resolution_status !== 'INVALID_INPUT') { const mb = tr.member_bases || [];
      if (tr.resolution_status === 'PAIR_BASE_INCONSISTENT') { const pp = pairPathways(ms); return { readings: mb.map((b) => ({ start: b.start, intrinsic: b.color_base, pathways: pp.pathways, evidence: pp.evidence, member: b.member_id })), eligibleAllowed: false, note: 'PAIR_BASE_INCONSISTENT', frozen_v1: tr.final_direction }; }
      const intr = [...new Set(mb.map((b) => b.color_base))]; const readings = intr.map((b) => ({ start: tr.pair_base, intrinsic: b, pathways: tr.independent_pathways || [], evidence: tr.observed_evidence || [], registry_basis: mb.some((x) => x.material_color_context && x.material_color_context.resolved_state) ? 'DENIM_NEUTRAL_ELIGIBILITY' : 'REGISTRY_V3 (every member)' }));
      const coord = (tr.unresolved_findings || []).filter((f) => f.gap_id === 'GAP-PAIR-COORDINATION');
      return { readings, coordination: coord.length ? { groups: [...new Set(coord.flatMap((f) => f.admissible_outcomes || []))].sort() } : null, frozen_v1: tr.final_direction }; } }
  /* incomplete pair (a member category or colour not established): every member choice is a reading; no shared Registry base can be established */
  const choices = ms.map((m) => { const cats = m.category ? [m.category] : CATS.filter((c) => catValid(c, m.observations)); return cats.map((c) => ({ c, starts: m.color_observation ? [{ s: RT.startingState(RT.resolveColorBase(m.color_observation), RT.resolveContextualNeutral(c, m.observations, RT.resolveColorBase(m.color_observation)), RT.resolveMaterialColorContext(m.observations, RT.resolveColorBase(m.color_observation), c)), i: RT.resolveColorBase(m.color_observation).color_base }] : FAMILIES.map((f) => { const cb = RT.resolveColorBase({ primary_color_family: f }); return { s: RT.startingState(cb, RT.resolveContextualNeutral(c, m.observations, cb), RT.resolveMaterialColorContext(m.observations, cb, c)), i: cb.color_base }; }) })); });
  const readings = []; const combos = choices.reduce((acc, ch) => acc.flatMap((a) => ch.map((x) => a.concat([x]))), [[]]).slice(0, 400);
  for (const combo of combos) { const pp = pairPathways(ms.map((m, k) => Object.assign({}, m, { category: combo[k].c }))); for (const x of combo) for (const st of x.starts) readings.push({ start: st.s, intrinsic: st.i, pathways: pp.pathways, evidence: pp.evidence }); }
  return { readings, eligibleAllowed: false, note: 'PAIR_MEMBER_NOT_ESTABLISHED' }; }
module.exports = { garmentReadings, pairReadings, predicateStarts, pathwaysOf, pairPathways, CO_NOT_ESTABLISHED };
