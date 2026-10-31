'use strict';
/* STMX ITEM EI V2 — CANDIDATE. UNDERLYING EI RESOLVER — binary {E, I}; no Neutral exists in this layer.
   Evidence condition = the frozen evidenceCondition() over the RESOLVED pathways (an UNRESOLVED pathway contributes no transition and is never given a force —
   CEO EI-Q1 option B · EI-Q5A candidate). The V2 decision table below REPLACES the frozen transition() for the direction decision:
     I_BASE              NONE · WEAK_ONLY → I        ONE_MEANINGFUL · MULTI_MEANINGFUL · ANY_STRONG → E      (CEO FINAL RULE 2026-10-28: one qualified independent
                                                                                                    MEANINGFUL is sufficient for E; R1 "ONE_MEANINGFUL → I" REJECTED / SUPERSEDED)
     E_BASE              any → E                                                                            (frozen T-E-ANY)
     Registry / Denim    ONE_MEANINGFUL · MULTI_MEANINGFUL · ANY_STRONG → E                                 (frozen D8 CN rule, CEO order §4.3 — preserved)
     contextual start    NONE · WEAK_ONLY → the product's INTRINSIC Base Character row above                (Registry V3: "Miss → retain Base Character")
   Several admissible readings (category / colour family / pair member / unobserved Registry predicate) → E only when EVERY reading is E; otherwise I, recorded as an
   operating default (never as an observed colour). No evidence at all in a non-invariant case → ZERO_EVIDENCE_OPERATIONAL_DEFAULT. */
const { RT } = require('./ei_v2_frozen_bindings');
const CONDITIONS = ['NONE', 'WEAK_ONLY', 'ONE_MEANINGFUL', 'MULTI_MEANINGFUL', 'ANY_STRONG'];
const TABLE = {
  I_BASE: { NONE: 'I', WEAK_ONLY: 'I', ONE_MEANINGFUL: 'E', MULTI_MEANINGFUL: 'E', ANY_STRONG: 'E' },
  E_BASE: { NONE: 'E', WEAK_ONLY: 'E', ONE_MEANINGFUL: 'E', MULTI_MEANINGFUL: 'E', ANY_STRONG: 'E' },
  CONTEXTUAL_START: { NONE: 'INTRINSIC', WEAK_ONLY: 'INTRINSIC', ONE_MEANINGFUL: 'E', MULTI_MEANINGFUL: 'E', ANY_STRONG: 'E' },
};
const CONTEXTUAL = 'CONTEXTUAL_NEUTRAL';   // the frozen starting-state token of a Registry / Denim hit (a START, not an output)
function condition(pathways) { const c = RT.evidenceCondition(pathways || []); if (!CONDITIONS.includes(c)) throw new Error('EI V2: ungoverned evidence condition ' + c); return c; }
/* one reading: { start, intrinsic, pathways } */
function readingDirection(r) { const cond = condition(r.pathways);
  if (r.start === CONTEXTUAL) { const v = TABLE.CONTEXTUAL_START[cond]; return { direction: v === 'INTRINSIC' ? TABLE[r.intrinsic][cond] : v, cond, rule: v === 'INTRINSIC' ? 'CONTEXTUAL_START → INTRINSIC ' + r.intrinsic + ' · ' + cond : 'CONTEXTUAL_START · ' + cond + ' → E' }; }
  if (!TABLE[r.start]) throw new Error('EI V2: ungoverned start ' + r.start); return { direction: TABLE[r.start][cond], cond, rule: r.start + ' · ' + cond }; }
const hasEvidence = (pws) => (pws || []).some((p) => ['WEAK', 'MEANINGFUL', 'STRONG'].includes(p.force) || p.resolution_status === 'UNRESOLVED');
function resolveUnderlying(readings) {
  const per = readings.map(readingDirection); const dirs = [...new Set(per.map((x) => x.direction))];
  if (dirs.length === 1) return { direction: dirs[0], basis: readings.length > 1 ? 'INVARIANT_OVER_' + readings.length + '_READINGS' : 'V2_TABLE', rule: per[0].rule, cond: per[0].cond, readings: per };
  const anyEv = readings.some((r) => hasEvidence(r.pathways));
  return { direction: 'I', basis: anyEv ? 'NON_INVARIANT_READINGS_OPERATIONAL_DEFAULT' : 'ZERO_EVIDENCE_OPERATIONAL_DEFAULT', rule: 'readings disagree (' + dirs.sort().join('/') + ') → I', cond: null, readings: per };
}
module.exports = { TABLE, CONDITIONS, CONTEXTUAL, condition, readingDirection, resolveUnderlying, hasEvidence };
