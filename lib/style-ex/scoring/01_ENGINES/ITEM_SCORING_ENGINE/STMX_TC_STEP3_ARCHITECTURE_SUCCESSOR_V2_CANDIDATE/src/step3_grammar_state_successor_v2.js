'use strict';
/**
 * STMX_TC_STEP3_ARCHITECTURE_SUCCESSOR_V2_CANDIDATE — Grammar State SUCCESSOR RESOLVER · CANDIDATE / SHADOW · NOT FROZEN · NOT PRODUCTION.
 * Order: STMX TC MAINLINE V2.3.66 (CEO D-65 APPROVED — Option C). Contract: ../STEP3_SUCCESSOR_V2_CONTRACT.json.
 * Predecessor STMX_TC_STEP3_ARCHITECTURE_FROZEN_BASELINE_V1 is untouched; it has no executable, so its rules R-GS-1…9 are carried by their frozen
 * per-unit evaluation (grammar_rule + grammar_state). The successor adds ONE precedence insertion: the candidate rule R-GS-OP, evaluated on the
 * COMPLETED Grammar Transformation process record, immediately before the rules it precedes (R-GS-6 · R-GS-5). R-GS-5 text is not reopened.
 *
 * CATEGORY-GENERAL: this module never inspects a garment key, archetype, grammar, category, organizing-relation identity, channel literal or
 * scoring-unit identity. It asks one general question of the completed process record: has a governed whole-unit organizational primacy shift
 * been established, with archetype traceability, complete P-3 composition, provenance and single (P-2) consumption? Every condition is read from
 * the record; no flag or diagnostic label is consumed. It emits no tier, number or score, and it never feeds Grammar Transformation (G60).
 */
const SUCCESSOR_ID = 'STMX_TC_STEP3_ARCHITECTURE_SUCCESSOR_V2_CANDIDATE';
const PREDECESSOR_ID = 'STMX_TC_STEP3_ARCHITECTURE_FROZEN_BASELINE_V1';
const RULE_OP = 'R-GS-OP';
const PRECEDED_BY_OP = Object.freeze(['R-GS-6', 'R-GS-5']);
const READINGS = Object.freeze(['BASE_GRAMMAR_PRINCIPAL', 'INTERVENTION_PRINCIPAL', 'UNRESOLVED']);
const RELATION_VALUES = Object.freeze(['ORIGINAL_ORGANIZATION_PRINCIPAL', 'ORGANIZATIONAL_PRIMACY_SHIFT', 'ORGANIZATION_DISPLACED_PRIMACY_NOT_SHIFTED', 'UNRESOLVED', 'NOT_AUTHORED']);
const TRACEABILITY = Object.freeze(['TRACEABLE', 'UNRESOLVED', 'NOT_TRACEABLE', 'ORGANIZATION_TRACEABILITY_NOT_SEPARABLE', 'NO_ORGANIZATION_BLOCK']);
const SHIFT = 'ORGANIZATIONAL_PRIMACY_SHIFT';
const P2_KIND = 'organizing_relation_status';

function validateCompletedProcess(p) {
  const defects = [];
  if (!p || typeof p !== 'object') return { valid: false, defects: ['no completed process record'] };
  if (!READINGS.includes(p.whole_garment_reading)) defects.push('whole_garment_reading outside its frozen contract');
  if (!RELATION_VALUES.includes(p.organizational_relation)) defects.push('organizational_relation outside the registered values');
  if (!TRACEABILITY.includes(p.traceability)) defects.push('traceability outside the registered values');
  if (!Array.isArray(p.members) || !p.members.length) defects.push('no member record');
  for (const m of p.members || []) {
    if (!RELATION_VALUES.includes(m.status)) defects.push('member status outside the registered values');
    if (!TRACEABILITY.includes(m.traceability)) defects.push('member traceability outside the registered values');
    if (!Array.isArray(m.organising_statements)) defects.push('member organising_statements missing');
    if (!Array.isArray(m.p2_consumption)) defects.push('member p2_consumption missing');
  }
  if (!p.provenance || !Array.isArray(p.provenance.statement_ids) || !p.provenance.reference_sha256 || !p.provenance.p3_rule) defects.push('process provenance incomplete');
  return { valid: !defects.length, defects };
}

function organisingOnRelation(m, statementIds) {
  return (m.organising_statements || []).filter((s) => s.organising === 'MOST_PROMINENT' && s.on_organizing_channel === true && statementIds.includes(s.statement));
}

function consumedOnce(m) {
  const [first, ...duplicates] = (m.p2_consumption || []).filter((e) => e.kind === P2_KIND);
  return !!first && duplicates.length === 0;
}

function evaluateRGSOP(ctx, p) {
  const v = validateCompletedProcess(p); const members = v.valid ? p.members : []; const ids = v.valid ? p.provenance.statement_ids : [];
  const conditions = [
    { id: 'OP-0', text: 'valid Transformative context', met: !!ctx && ctx.direction === 'TRANSFORMATIVE' },
    { id: 'OP-1', text: 'whole_garment_reading = INTERVENTION_PRINCIPAL', met: v.valid && p.whole_garment_reading === 'INTERVENTION_PRINCIPAL' },
    { id: 'OP-2', text: 'whole-unit archetype traceability = TRACEABLE', met: v.valid && p.traceability === 'TRACEABLE' },
    { id: 'OP-3', text: 'P-3 whole-unit organizational relation = ORGANIZATIONAL_PRIMACY_SHIFT', met: v.valid && p.organizational_relation === SHIFT },
    { id: 'OP-4', text: 'P-3 completion: every member traceable and itself shifted', met: v.valid && members.every((m) => m.status === SHIFT && m.traceability === 'TRACEABLE') },
    { id: 'OP-5', text: 'provenance: every member organizing relation DISPLACED and organised by a MOST_PROMINENT Statement of the unit on that relation', met: v.valid && members.every((m) => !!m.organizing_relation && m.organizing_relation.status === 'DISPLACED' && organisingOnRelation(m, ids).length > 0) },
    { id: 'OP-6', text: 'P-2: organizing-relation status consumed once per member', met: v.valid && members.every(consumedOnce) },
    { id: 'OP-7', text: 'completed-process record structurally valid', met: v.valid, defects: v.defects },
  ];
  return { rule: RULE_OP, holds: conditions.every((c) => c.met), conditions };
}

function resolve(predecessor, ctx, completedProcess) {
  const base = { successor: SUCCESSOR_ID, predecessor: PREDECESSOR_ID, predecessor_rule: predecessor.grammar_rule || null, predecessor_grammar_state: predecessor.grammar_state, status: 'CANDIDATE / SHADOW' };
  if (predecessor.grammar_state === 'NOT_EVALUATED' || !PRECEDED_BY_OP.includes(predecessor.grammar_rule)) {
    return Object.assign(base, { successor_rule: predecessor.grammar_rule || null, successor_grammar_state: predecessor.grammar_state, resolution_status: predecessor.resolution_status || null, unresolved_category: predecessor.unresolved_category || null, changed: false, trail: ['carried: frozen resolution precedes the R-GS-OP insertion point'] });
  }
  const op = evaluateRGSOP(ctx, completedProcess);
  if (op.holds) return Object.assign(base, { successor_rule: RULE_OP, successor_grammar_state: 'CONTEMPORARY_REWRITTEN', resolution_status: 'RESOLVED', unresolved_category: null, changed: true, r_gs_op: op, trail: ['R-GS-OP holds on the completed process record'] });
  return Object.assign(base, { successor_rule: predecessor.grammar_rule, successor_grammar_state: predecessor.grammar_state, resolution_status: predecessor.resolution_status || null, unresolved_category: predecessor.unresolved_category || null, changed: false, r_gs_op: op, trail: ['R-GS-OP does not hold (' + op.conditions.filter((c) => !c.met).map((c) => c.id).join(', ') + ') → frozen resolution carried (residual, text unchanged)'] });
}

module.exports = { resolve, evaluateRGSOP, validateCompletedProcess, SUCCESSOR_ID, PREDECESSOR_ID, RULE_OP, PRECEDED_BY_OP, RELATION_VALUES };
