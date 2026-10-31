'use strict';
/**
 * STMX TC V2 — Reason grounding verifier (port of the 2026-10-26 verifyTC + V2 checks). Returns the list of findings ([] = verified).
 * Checks: every clause value == the member's OBSERVED value · conformity only on a channel evaluated FALSE · Departure only from the governed frozen set ·
 *   an observed open Departure candidate must be cited for Classic · Direction label matches · no absence-of-transformation claim · no internal / GT / REF /
 *   numeric / Strength term · V2: missing inputs named on successor paths · no completion value leaked (no length phrase when length is missing, no fit phrase
 *   when fit is missing) · no subtype word when the subtype is unresolved · zero-evidence text carries no conformity claim and the default-classification
 *   wording appears only on that path · at most two sentences.
 * A failed Reason never changes the Direction.
 */
/* R4 (CEO 2026-10-28 §8 · R3-B2) additional checks: a CATEGORY_INDEPENDENT_DEPARTURE clause must carry the governed rule of the resolved path and cite only observed
 *   carrier values and their D-4 zones · a KEY_DOMAIN_CANDIDATE (category-dependent / role-not-observed construction candidate of an unresolved-key member) must be
 *   cited concessively in a Classic Reason · the zero-evidence Reason may carry opposing (never decisive) clauses and must not deny an observed feature · no
 *   product-type word when the type is unknown. */
const L = require('./tc_v2_reason_lexicon'); const { okVal } = L; const CI_RULES = require('./tc_v2_category_independence').CATEGORY_INDEPENDENT_RULES;
const sleeveMorph = (m) => !!(m.silhouette && m.silhouette.v === 'UNRESOLVED' && /SIL-MORPH/.test(m.silhouette.rule) && /sleeve_volume/.test(String(m.silhouette.why || m.silhouette.carrier || '')) && okVal(m.observed.sleeve_volume));   /* same rule as the composer */
const ZE_DENIAL = '핏과 기장, 구성처럼 판단에 쓸 수 있는 특징이 확인되지 않아';
const CHAN = { SILHOUETTE: 'silhouette', PROPORTION: 'proportion', CONSTRUCTION: 'construction' };
const INTERNAL = /REF_|\bGT\b|TC[1-9]\b|Strength|STRONG|WEAK|점수|단계|UNRESOLVED|NOT_SCORABLE|TC-|DM-|SR-|EI-|\bSIL-|\bPRO-|\bCON-|\d/;
const ABSENCE = /변형\s?(이|요소가?)\s?(없|관측되지)|전혀 없|모든 구성이 전통|변형된 실루엣이 관측|특수한 구조가 적용/;
function verify(x, reason) { const f = []; if (!['CLASSIC', 'TRANSFORMATIVE'].includes(x.direction)) f.push('DIRECTION_MISSING_OR_PROHIBITED'); if (!reason || !reason.text) return f.concat(['NO_REASON']);
  const ms = x.members; const up = x.upstream || { valid_departure_set: [], ownerless: false }; const deps = up.valid_departure_set || []; const t = reason.text;
  for (const c of reason.clauses) { const m = ms[c.member]; if (!m) { f.push('UNKNOWN_MEMBER'); continue; } const fields = c.field ? String(c.field).split('+') : [];
    if (fields.some((k) => !(k in L.TCF))) { f.push('CROSS_AXIS_FIELD ' + c.field); continue; }
    if (c.kind === 'INVARIANT_FINDING') { if (x.direction !== 'TRANSFORMATIVE' || x.path !== 'DOMAIN_INVARIANT' || CHAN[c.channel] !== x.invariant_channel) f.push('INVARIANT_FINDING_NOT_GOVERNED'); if (!t.includes(c.phrase.replace(/어$/, ''))) f.push('CLAIM_NOT_IN_TEXT invariant'); continue; }
    if (c.kind === 'CATEGORY_INDEPENDENT_DEPARTURE') { const ci = x.category_independent; const obsVals = String(m.observed[c.field] || '').split('+'); const vals = String(c.value || '').split('+');
      if (x.direction !== 'TRANSFORMATIVE' || x.path !== 'CATEGORY_INDEPENDENT_DEPARTURE' || !ci || ci.rule !== c.rule || !CI_RULES.includes(c.rule)) f.push('CATEGORY_INDEPENDENT_DEPARTURE_NOT_GOVERNED ' + c.rule);
      if (!ci || !ci.evidence || c.field !== ci.evidence.field || !vals.every((v) => ci.evidence.values.includes(v) && obsVals.includes(v))) f.push('VALUE_OR_STATE_MISMATCH ' + c.field);
      if (!ci || !ci.evidence || !Array.isArray(c.zone) || !c.zone.length || !c.zone.every((z) => ci.evidence.zone.includes(z))) f.push('DEPARTURE_ZONE_NOT_OBSERVED');
      if (!t.includes(c.phrase.replace(/(어|나|라)$/, ''))) f.push('CLAIM_NOT_IN_TEXT ' + c.field); continue; }
    if (c.kind === 'DEPARTURE_FINDING') { const ch = CHAN[c.channel]; if (x.direction !== 'TRANSFORMATIVE') f.push('DECISIVE_CONTRADICTS_DIRECTION departure'); if (!m[ch] || m[ch].v !== 'TRUE' || m[ch].rule !== c.rule || !deps.some((d) => d.channel === c.channel && d.rule === c.rule)) f.push('DEPARTURE_NOT_IN_GOVERNED_SET ' + c.rule); if (!t.includes(c.phrase.replace(/어$/, ''))) f.push('CLAIM_NOT_IN_TEXT ' + c.field); continue; }
    const vals = fields.map((k) => m.observed[k]); if (!vals.every(okVal) || vals.join('+') !== c.value) f.push('VALUE_OR_STATE_MISMATCH ' + c.field);
    if (c.phrase && !t.includes(c.phrase.replace(/(어|나|라)$/, ''))) f.push('CLAIM_NOT_IN_TEXT ' + c.field);
    if (c.kind === 'DEPARTURE' && c.channel === 'ASYMMETRY') { if (x.direction !== 'TRANSFORMATIVE') f.push('DECISIVE_CONTRADICTS_DIRECTION departure'); if (!up.ownerless || !m.asymmetry || !m.asymmetry.departure_exists) f.push('DEPARTURE_NOT_IN_GOVERNED_SET asymmetry'); continue; }
    if (c.kind === 'OPEN_CANDIDATE') { if (c.role !== 'opposing' || !sleeveMorph(m)) f.push('OPEN_CANDIDATE_NOT_GOVERNED ' + c.field); continue; }
    if (c.kind === 'OPEN_CONSTRUCTION_CANDIDATE') { if (c.role !== 'opposing' || x.direction !== 'CLASSIC' || !(m.construction.v === 'UNRESOLVED' && /^CON-UNRES-/.test(m.construction.rule) && m.construction.carrier === c.field)) f.push('OPEN_CONSTRUCTION_CANDIDATE_NOT_GOVERNED ' + c.field); continue; }
    if (c.kind === 'KEY_DOMAIN_CANDIDATE') { const k = (x.key_domain_candidates || []).find((y) => y.member === c.member && y.kind === c.candidate); if (c.role !== 'opposing' || x.direction !== 'CLASSIC' || !k || !fields.every((q) => String(k.carrier).split('+').includes(q))) f.push('KEY_DOMAIN_CANDIDATE_NOT_GOVERNED ' + c.field); continue; }
    if (c.kind === 'CONFORMITY') { if (x.direction !== 'CLASSIC') f.push('DECISIVE_CONTRADICTS_DIRECTION conformity'); if (!m[c.channel] || m[c.channel].v !== 'FALSE') f.push('CONFORMITY_CLAIMED_ON_UNEVALUATED_CHANNEL ' + c.channel); }
    else if (c.kind === 'DEPARTURE') { if (x.direction !== 'TRANSFORMATIVE') f.push('DECISIVE_CONTRADICTS_DIRECTION departure'); if (!deps.some((d) => d.channel === c.channel && d.rule === c.rule && d.carrier === c.field)) f.push('DEPARTURE_NOT_IN_GOVERNED_SET ' + c.rule); }
    else f.push('UNKNOWN_CLAUSE_KIND'); }
  if (x.path === 'ZERO_EVIDENCE') { if (reason.clauses.some((c) => c.role !== 'opposing')) f.push('ZERO_EVIDENCE_CLAIMS_EVIDENCE'); if (!/제한된 정보/.test(t)) f.push('ZERO_EVIDENCE_LIMITATION_MISSING');
    if (t.includes(ZE_DENIAL) && ms.some((m) => L.FEATURE_FIELDS.some((q) => okVal(m.observed[q])))) f.push('ZERO_EVIDENCE_DENIES_OBSERVED_FEATURE'); }
  else if (!reason.clauses.some((c) => c.role === 'decisive')) f.push('GENERIC_NO_PHYSICAL_CLAIM');
  if (/기본 분류/.test(t) !== (x.path === 'ZERO_EVIDENCE')) f.push('DEFAULT_WORDING_MISMATCH');
  if (x.direction === 'CLASSIC' && ms.some(sleeveMorph) && !reason.clauses.some((c) => c.kind === 'OPEN_CANDIDATE')) f.push('OPPOSING_EVIDENCE_OMITTED');   /* R4: only a sleeve-caused SIL-MORPH (as named by the frozen evidence) */
  if (x.direction === 'CLASSIC' && x.path !== 'ZERO_EVIDENCE' && ms.some((m) => m.construction && m.construction.v === 'UNRESOLVED' && /^CON-UNRES-/.test(m.construction.rule) && okVal(m.observed[m.construction.carrier])) && !reason.clauses.some((c) => c.kind === 'OPEN_CONSTRUCTION_CANDIDATE')) f.push('OPPOSING_CONSTRUCTION_EVIDENCE_OMITTED');
  if (x.direction === 'CLASSIC' && (x.key_domain_candidates || []).some((k) => ms[k.member] && String(k.carrier || '').split('+').some((q) => q in L.TCF && okVal(ms[k.member].observed[q]))) && !reason.clauses.some((c) => c.kind === 'KEY_DOMAIN_CANDIDATE')) f.push('KEY_DOMAIN_CANDIDATE_OMITTED');
  if (ms.some((m) => !m.category) && L.TYPE_WORDS.test(t)) f.push('UNKNOWN_TYPE_NAMED');
  if (x.direction === 'CLASSIC' && !/Classic 방향/.test(t)) f.push('LABEL_MISMATCH'); if (x.direction === 'TRANSFORMATIVE' && !/Transformative 방향/.test(t)) f.push('LABEL_MISMATCH');
  if (/Classic/.test(t) && /Transformative/.test(t)) f.push('BOTH_LABELS');
  if (ABSENCE.test(t)) f.push('ABSENCE_OF_TRANSFORMATION_CLAIMED'); if (INTERNAL.test(t)) f.push('INTERNAL_GT_OR_NUMERIC_TERM_IN_TEXT');
  const missing = x.missing_fields || [];
  if (x.path !== 'FROZEN_V1' && x.path !== 'ZERO_EVIDENCE') for (const k of missing) if (!t.includes(L.MISSING_LABEL[k])) f.push('MISSING_INPUT_NOT_NAMED ' + k);
  if (missing.includes('length') && Object.values(L.TCV.length).some((p) => t.includes(p))) f.push('COMPLETION_OR_UNSEEN_LENGTH_STATED');
  if (missing.includes('fit') && Object.values(L.TCV.fit).some((p) => t.includes(p))) f.push('COMPLETION_OR_UNSEEN_FIT_STATED');
  if (missing.includes('subtype') && L.SUBTYPE_WORDS.some((w) => t.includes(w))) f.push('UNRESOLVED_SUBTYPE_STATED');
  if ((t.match(/다\./g) || []).length > 2) f.push('TOO_LONG');
  return f; }
module.exports = { verify, INTERNAL, ABSENCE };
