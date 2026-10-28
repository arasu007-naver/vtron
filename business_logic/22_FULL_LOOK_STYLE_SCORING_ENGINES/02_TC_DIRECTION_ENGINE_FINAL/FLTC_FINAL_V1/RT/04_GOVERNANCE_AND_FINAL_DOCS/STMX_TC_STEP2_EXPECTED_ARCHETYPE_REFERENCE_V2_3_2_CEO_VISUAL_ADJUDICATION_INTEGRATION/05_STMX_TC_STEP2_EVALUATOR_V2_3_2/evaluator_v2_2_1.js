'use strict';
// STMX_TC_STEP2_EVALUATOR_V2_2_1 — additive revision of the sealed V2.2 evaluator (4cdc88f5…).
// ONLY the asymmetry evidence-ownership logic changes (Clause A + Clause B of the CEO asymmetry authority). Everything else is byte-equivalent in behaviour.
const BASE = require('./evaluator_v2_2_base.js');
const EVALUATOR_VERSION = 'STMX_TC_STEP2_EVALUATOR_V2_2_1 · r1 (asymmetry / slit firewall)';
const { f, V, silh, prop, constr, tierEvidence, pairDirection, pairTier } = BASE;

// Terms that name an asymmetry source independent of slit morphology. Ownership vocabulary only — never a departure rule.
const INDEPENDENT_TERMS = new RegExp(['hem','high-low','high low','drape','draped','ruch','wrap','overlay','panel','tail','shoulder','sleeve','closure','zip','strap','pocket','collar','lapel','\btie\b','badge','patch','neckline','cascad','uneven','diagonal','surplice','crossover','left and right','left/right','differ'].join('|'), 'i');
// ⛔ Slit-descriptor vocabulary (slit · on one side · one leg · asymmetric front · exposing leg) is deliberately NOT in the independent set.
const SLIT_TERMS = /slit/i;

// asymmetrySource — evidence-ownership classification (§3 CASE 1/2/3). `evidence` = governed evidence strings of the asymmetry observation, joined from the record by the driver.
function asymmetrySource(o, evidence) {
  const a = f(o, 'asymmetry');
  if (!(a.observed && a.value === 'Present')) return { source: 'NOT_APPLICABLE', why: 'asymmetry not Present' };
  const slit = f(o, 'slit'); const slitPresent = slit.observed && slit.value === 'Present';
  const ev = (Array.isArray(evidence) ? evidence : (evidence ? [evidence] : [])).map((x) => String(x)).filter(Boolean);
  if (!slitPresent) return { source: 'INDEPENDENT', why: 'no one-sided slit observed on this garment (slit ' + (slit.observed ? slit.value : (slit.present ? slit.state : 'n/a')) + '); slit-derived contamination impossible', evidence: ev };
  if (!ev.length) return { source: 'UNRESOLVED', why: 'slit Present and the asymmetry observation carries no evidence text — ownership cannot be determined (CASE 3)', evidence: ev };
  const independent = INDEPENDENT_TERMS.test(ev.join(' '));   // tested on the evidence itself; slit descriptors are excluded from the term set, so a slit-only sentence cannot match
  const mentionsSlit = ev.some((x) => SLIT_TERMS.test(x));
  if (independent) return { source: 'INDEPENDENT', why: 'slit Present, but the asymmetry evidence names a source beyond the slit: "' + ev.join(' / ') + '" (CASE 2)', evidence: ev };
  if (mentionsSlit) return { source: 'SLIT_DERIVED', why: 'slit Present and the asymmetry evidence describes the slit itself only: "' + ev.join(' / ') + '" (CASE 1) — generic asymmetry trigger SUPPRESSED', evidence: ev };
  return { source: 'UNRESOLVED', why: 'slit Present; asymmetry evidence names neither the slit nor an independent source: "' + ev.join(' / ') + '" (CASE 3)', evidence: ev };
}
// asymmetry — Clause A fires ONLY when source = INDEPENDENT
function asymmetry(o, evidence) {
  const src = asymmetrySource(o, evidence);
  if (src.source === 'INDEPENDENT') return { departure_exists: true, axis_owner: 'UNRESOLVED', source: 'INDEPENDENT', rule: 'ASYM-DEPARTURE-INDEPENDENT', why: src.why, evidence: src.evidence, carrier: 'asymmetry', strong: false };
  if (src.source === 'SLIT_DERIVED') return { departure_exists: false, axis_owner: null, source: 'SLIT_DERIVED', rule: 'ASYM-SUPPRESSED-SLIT-DERIVED', why: src.why, evidence: src.evidence };
  if (src.source === 'UNRESOLVED') return { departure_exists: false, axis_owner: null, source: 'UNRESOLVED', rule: 'ASYM-SOURCE-UNRESOLVED', why: src.why + ' — not promoted to T from the generic token', evidence: src.evidence };
  return { departure_exists: false, axis_owner: null, source: 'NOT_APPLICABLE', rule: null };
}
function direction(S, P, C, ASY) { const t = [S.v, P.v, C.v]; if (t.includes('TRUE') || (ASY && ASY.departure_exists)) return 'TRANSFORMATIVE'; if (ASY && ASY.source === 'UNRESOLVED') return 'DIRECTION_UNRESOLVED';   // CASE 3: ownership unresolved is unresolved evidence — never coerced to Classic
  if (t.every((x) => x === 'FALSE')) return 'CLASSIC'; return 'DIRECTION_UNRESOLVED'; }
module.exports = { EVALUATOR_VERSION, f, V, silh, prop, constr, asymmetry, asymmetrySource, direction, tierEvidence, pairDirection, pairTier, INDEPENDENT_TERMS, SLIT_TERMS, ENVELOPE: BASE.ENVELOPE, TAILORED: BASE.TAILORED };
