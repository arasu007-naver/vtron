'use strict';
/* STEP 2 SUCCESSOR V4 → STEP 3 SUCCESSOR V2 → RUNTIME V3.4 · SHADOW BINDING V3 — CANDIDATE · SHADOW ONLY (V2.3.86; derived verbatim from binding V2 —
 * changes: successor V4 module + manifest; the frozen-Step-3 reproduction proof uses the historical unit aggregation; a SOR unit's magnitude / conformity use its recorded members only). Not a runtime version, not production.
 * 1. historical authority read through the sealed V3.3 adapter (bound input; tier / GT fields deleted at parse);
 * 2. every member materialized by the Step 2 successor (registry 'BOUND' or 'EMPTY' only — never a fixture registry);
 * 3. unit upstream = successor unit aggregation; a unit whose upstream equals the frozen Step 3 row keeps that row VERBATIM;
 * 4. a unit whose upstream changed gets a predecessor echo re-derived from FROZEN Step 3 authority only — (a) an exact frozen signature witness
 *    (direction · Statement Set · ownerless), else (b) the frozen rule class proven to reproduce all frozen rows (reproduceFrozenStep3), with the
 *    outcome copied from the frozen rows of that class, else HARD STOP (ShadowBindingError). Magnitude per the frozen magnitude contract (V2.3.27 11_);
 * 5. the sealed V3.4 orchestrator runs unmodified on the injected authority + predecessor ledger. Step 3 successor V2 / V3.4 code is never written. */
const path = require('path');
const SUCC = require('../src/step2_semantic_successor_v4.js');
const PKG = path.resolve(__dirname, '..'); const ROOT = path.resolve(PKG, '..', '..', '..');
const BOUND = require(path.join(PKG, 'BOUND_INPUTS_STEP2_SUCCESSOR_V4.json')); const role = (r) => BOUND.inputs.find((b) => b.role === r).path; // hashes verified when SUCC loaded
const AD = require(path.join(ROOT, role('historical_materialization_reader'))); const RT = require(path.join(ROOT, role('downstream_runtime_v3_4')));
class ShadowBindingError extends Error {}
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const UPSTREAM = ['direction', 'valid_departure_set', 'statement_set', 'statement_set_size', 'ownerless'];
const OUTCOME = ['grammar_state', 'grammar_rule', 'grammar_reason', 'resolution_status', 'unresolved_category', 'authority_provenance'];
const LEDGER_FIELDS = UPSTREAM.concat(['magnitude', 'magnitude_resolution_status', 'classic_conformity_profile'], OUTCOME);
const sameUpstream = (u, row) => UPSTREAM.every((k) => JSON.stringify(u[k] === undefined ? null : u[k]) === JSON.stringify(row[k] === undefined ? null : row[k]) || (k === 'ownerless' && !!u[k] === !!row[k]));
const signature = (r) => JSON.stringify([r.direction || null, [...(r.statement_set || [])].sort(), !!r.ownerless]);
// frozen rule class: the rule text of 13_GRAMMAR_STATE_FROZEN_CONTRACT (rules_frozen) read by Statement identity; used only after reproduceFrozenStep3 passes
function frozenRuleClass(u) { if (u.direction !== 'TRANSFORMATIVE') return u.direction === 'CLASSIC' ? 'R-GS-1' : null; const ids = u.valid_departure_set.map((d) => d.rule); const chs = new Set(u.valid_departure_set.map((d) => d.channel));
  if (ids.some((i) => /R1-|CON-TRUE-CONSTITUTIVE/.test(i))) return 'R-GS-7'; if (ids.some((i) => /ARCHETYPAL-HYBRID/.test(i))) return 'R-GS-8'; if (ids.some((i) => /C3-BODY-ZONE/.test(i))) return 'R-GS-4'; if (u.ownerless) return 'R-GS-9';
  if (ids.length && [...chs].every((c) => c === 'SILHOUETTE' || c === 'PROPORTION')) return 'R-GS-5'; return 'NO_FROZEN_RULE'; }
function magnitude(u, members) { if (u.direction === 'TRANSFORMATIVE') { if (!u.valid_departure_set.length) return [null, 'UNRESOLVED']; const strong = members.some((m) => [m.silhouette, m.proportion, m.construction].some((o) => o && o.v === 'TRUE' && o.strong)); return [strong ? 'STRONG' : 'MEANINGFUL', 'RESOLVED']; } return u.direction === 'CLASSIC' ? [null, 'NOT_APPLICABLE'] : [null, 'UNRESOLVED']; }
function conformity(members) { return members.map((m) => ({ key: m.archetype_key, silhouette: { rule: m.silhouette.rule, carrier: m.silhouette.carrier == null ? null : m.silhouette.carrier }, proportion: { rule: m.proportion.rule, carrier: m.proportion.carrier == null ? null : m.proportion.carrier }, construction: { rule: m.construction.rule, carrier: m.construction.carrier == null ? null : m.construction.carrier } })); }
function classRows(frozenRows, cls, dir) { return frozenRows.filter((r) => (cls === null ? r.grammar_rule == null && (r.direction || null) === (dir || null) : r.grammar_rule === cls)); }
function rederive(frozenRow, u, members, frozenRows) {
  const next = clone(frozenRow); for (const k of UPSTREAM) next[k] = clone(u[k]); const [mag, magStatus] = magnitude(u, members); next.magnitude = mag; next.magnitude_resolution_status = magStatus;
  const wit = frozenRows.filter((r) => signature(r) === signature(u)); let method, detail;
  if (wit.length) { const outs = new Set(wit.map((r) => JSON.stringify(OUTCOME.map((k) => r[k])))); if (outs.size !== 1) throw new ShadowBindingError('frozen signature witnesses disagree for ' + u.anchor_id); for (const k of OUTCOME) next[k] = clone(wit[0][k]); method = 'EXACT_FROZEN_SIGNATURE_WITNESS'; detail = { witnesses: wit.map((r) => r.anchor_id) }; }
  else { const cls = frozenRuleClass(u); if (cls === 'NO_FROZEN_RULE') throw new ShadowBindingError('HARD STOP: no frozen rule reaches ' + u.anchor_id); const rows = classRows(frozenRows, cls, u.direction); if (!rows.length) throw new ShadowBindingError('HARD STOP: frozen class ' + cls + ' has no witness for ' + u.anchor_id);
    const outs = new Set(rows.map((r) => JSON.stringify(OUTCOME.map((k) => r[k])))); if (outs.size !== 1) throw new ShadowBindingError('frozen class ' + cls + ' outcome not unique'); for (const k of OUTCOME) next[k] = clone(rows[0][k]); method = 'FROZEN_RULE_CLASS'; detail = { rule_class: cls, class_witnesses: rows.map((r) => r.anchor_id) }; }
  next.classic_conformity_profile = next.grammar_state === 'CLASSIC' ? conformity(members) : null;
  next.step2_successor_rederivation = Object.assign({ binding: 'STEP2_SUCCESSOR_SHADOW_BINDING_V3 (V2.3.86)', method, predecessor_row_carried_otherwise: true, step3_code_changed: false }, detail);
  return next; }
// faithfulness proof over EVERY frozen row: (1) successor unit aggregation reproduces the frozen upstream; (2) the frozen rule class equals the
// frozen grammar_rule; (3) every class carries exactly one outcome (null class keyed by direction); (4) magnitude and Classic conformity reproduce.
function reproduceFrozenStep3(A, S) { const byA = new Map(); for (const m of A.step2Members) { if (!byA.has(m.anchor_id)) byA.set(m.anchor_id, []); byA.get(m.anchor_id).push(m); } const bad = []; const outcomes = new Map();
  for (const row of A.step3Rows) { const ms = byA.get(row.anchor_id) || []; const u = S.materializeUnitHistorical(row.anchor_id, row.scoring_unit_type, ms);
    if (!sameUpstream(u, row)) bad.push(row.anchor_id + ' upstream');
    const cls = frozenRuleClass(u); if ((cls === null ? null : cls) !== (row.grammar_rule == null ? null : row.grammar_rule)) bad.push(row.anchor_id + ' class ' + cls + ' vs ' + row.grammar_rule);
    const ok = (row.grammar_rule == null ? 'null|' + (row.direction || null) : row.grammar_rule); if (!outcomes.has(ok)) outcomes.set(ok, new Set()); outcomes.get(ok).add(JSON.stringify(OUTCOME.map((k) => row[k])));
    const [mag, st] = magnitude(u, ms); if (mag !== (row.magnitude == null ? null : row.magnitude) || st !== row.magnitude_resolution_status) bad.push(row.anchor_id + ' magnitude');
    const prof = row.grammar_state === 'CLASSIC' ? conformity(ms) : null; if (JSON.stringify(prof) !== JSON.stringify(row.classic_conformity_profile == null ? null : row.classic_conformity_profile)) bad.push(row.anchor_id + ' conformity'); }
  for (const [k, s] of outcomes) if (s.size !== 1) bad.push('class ' + k + ' has ' + s.size + ' outcomes');
  const sigs = new Map(); for (const r of A.step3Rows) { const k = signature(r); if (!sigs.has(k)) sigs.set(k, new Set()); sigs.get(k).add(JSON.stringify(OUTCOME.map((q) => r[q]))); } for (const [k, s] of sigs) if (s.size !== 1) bad.push('signature ' + k + ' has ' + s.size + ' outcomes');
  return { rows: A.step3Rows.length, classes: outcomes.size, signatures: sigs.size, mismatches: bad, ok: bad.length === 0 }; }

function buildShadow(options = {}) {
  const regMode = options.registry === 'EMPTY' ? 'EMPTY' : 'BOUND'; const S = SUCC.createSuccessor({ registry: regMode, rules: options.rules });
  const A = AD.loadBound(); const proof = reproduceFrozenStep3(A, S); if (!proof.ok) throw new ShadowBindingError('frozen Step 3 not reproducible: ' + proof.mismatches.slice(0, 5).join('; '));
  const mats = A.step2Members.map((m) => Object.assign({ key: m.anchor_id + '|' + m.garment_ref }, S.materializeMember(m, A.tokensByMember.get(m.anchor_id + '|' + m.garment_ref))));
  const byA = new Map(); for (const x of mats) { const a = x.record.anchor_id; if (!byA.has(a)) byA.set(a, []); byA.get(a).push(x.record); }
  const units = A.step3Rows.map((row) => { const recs = byA.get(row.anchor_id) || []; const u = S.materializeUnit(row.anchor_id, row.scoring_unit_type, recs); if (sameUpstream(u, row)) return { anchor_id: row.anchor_id, changed: false, upstream: u, row };
    const used = u.scoring_object_members ? recs.filter((m) => u.scoring_object_members.includes(m.garment_ref)) : recs; return { anchor_id: row.anchor_id, changed: true, upstream: u, row: rederive(row, u, used, A.step3Rows), frozen_row: row }; });
  const authority = Object.assign({}, A, { step2Members: Object.freeze(mats.map((x) => x.record)), step3Rows: Object.freeze(units.map((x) => x.row)) });
  const B = RT.loadBoundV34(); const LEDGER = new Map(B.LEDGER); for (const x of units) if (x.changed) { const base = Object.assign({}, B.LEDGER.get(x.anchor_id) || {}); for (const k of LEDGER_FIELDS) base[k] = clone(x.row[k]); base.step2_successor_rederivation = clone(x.row.step2_successor_rederivation); LEDGER.set(x.anchor_id, base); }
  return { registry: regMode, active_rules: S.active_rules, registry_entries: S.registry.entries, frozen_step3_reproduction: proof, members: mats, units, authority, boundV34: Object.assign({}, B, { LEDGER }) };
}
function runShadow(options = {}) { const sh = buildShadow(options); const output = RT.runCorpus({ authority: sh.authority, boundV34: sh.boundV34 }); return Object.assign(sh, { output }); }
module.exports = { buildShadow, runShadow, reproduceFrozenStep3, frozenRuleClass, ShadowBindingError, BINDING_ID: 'STEP2_SUCCESSOR_SHADOW_BINDING_V3' };
