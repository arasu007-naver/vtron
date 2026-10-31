'use strict';
/**
 * STMX DM V2 — Reason grounding verifier (blocking for the Reason, never for the Direction).
 * Re-reads the RECEIVED block (not the composer's copy) and checks every clause:
 *   path shape (DM Primitive paths only — no cross-axis field) · node exists · a cited reading is OBSERVED and equals the recorded value / range ·
 *   the phrase is a lexicon form of exactly that reading and appears in the text · a LIMITATION names a Primitive that is really unread ·
 *   EVIDENCE_EMPTY only for a complete empty block · D cites a qualifying system, M cites none · label matches the Direction ·
 *   Z0 limitation wording only on the Z0 rule · no internal / GT / REF / tier term · at most two sentences.
 */
const L = require('./dm_v2_reason_lexicon');
const R = require('./dm_v2_direction_resolver');
const { admission } = require('./dm_v2_binding');
const PATH = /^dm_designed_detail_evidence\.evidence\.(\d+)\.(relative_size|contrast|spatial_position)$/;
const DOM = { relative_size: admission.RELATIVE_SIZE, contrast: admission.CONTRAST, spatial_position: admission.SPATIAL_POSITION };
function verify(block, d, reason) {
  const f = []; if (!d || !['D', 'M'].includes(d.direction)) f.push('DIRECTION_MISSING_OR_PROHIBITED');
  if (!reason || typeof reason.text !== 'string' || !reason.text.trim()) return f.concat(['NO_REASON']);
  const text = reason.text; const ev = (block && Array.isArray(block.evidence)) ? block.evidence : null; const cited = new Set();
  for (const c of reason.clauses || []) {
    if (c.kind === 'EVIDENCE_EMPTY') { if (!(ev && ev.length === 0)) f.push('EMPTY_CLAIM_WITHOUT_COMPLETE_EMPTY_BLOCK'); if (d.rule !== 'DM-V2-M0') f.push('EMPTY_CLAIM_OUTSIDE_M0'); continue; }
    const m = PATH.exec(c.provenance && c.provenance.path); if (!m) { f.push('CROSS_AXIS_OR_UNKNOWN_PATH ' + (c.provenance && c.provenance.path)); continue; }
    const i = Number(m[1]), p = m[2]; if (c.param !== p) { f.push('PARAM_PATH_MISMATCH ' + c.provenance.path); continue; }
    const raw = ev && ev[i]; if (!raw) { f.push('NO_SUCH_SYSTEM ' + c.provenance.path); continue; } cited.add(i);
    const rd = admission.reading(raw[p], DOM[p]);
    if (c.kind === 'LIMITATION') { if (rd.resolved) f.push('LIMITATION_ON_OBSERVED_READING ' + c.provenance.path); if (c.phrase !== L.LIMIT[p] || !text.includes(c.phrase)) f.push('LIMITATION_NOT_STATED ' + c.provenance.path); continue; }
    const node = raw[p]; if (!node || !rd.resolved) { f.push('UNOBSERVED_FIELD ' + c.provenance.path); continue; }
    const v = c.provenance.value; const isRange = v && typeof v === 'object'; const same = isRange ? node.min === v.min && node.max === v.max : node.value === v;
    if (node.state !== 'OBSERVED' || c.provenance.state !== 'OBSERVED' || !same) f.push('VALUE_OR_STATE_MISMATCH ' + c.provenance.path);
    if (!L.allowed(p, rd).includes(c.phrase)) f.push('PHRASE_NOT_LEXICON_FORM_OF_READING ' + c.provenance.path);
    if (!c.phrase || !text.includes(c.phrase)) f.push('CLAIM_NOT_IN_TEXT ' + c.provenance.path); }
  const adm = admission.admit(block); const sysQ = [...cited].map((i) => adm.ok && adm.evidence[i] ? R.qualifies(adm.evidence[i]) : false);
  if (d.direction === 'D') { if (!sysQ.some(Boolean)) f.push('D_REASON_CITES_NO_QUALIFYING_SYSTEM'); if (!/Detail 방향/.test(text) || /Minimal 방향/.test(text)) f.push('LABEL_MISMATCH'); }
  if (d.direction === 'M') { if (sysQ.some(Boolean)) f.push('M_REASON_CITES_QUALIFYING_SYSTEM'); if (!/Minimal 방향/.test(text) || /Detail 방향/.test(text)) f.push('LABEL_MISMATCH'); }
  if (/기본 분류/.test(text) !== (d.rule === 'DM-V2-Z0')) f.push('PROVISIONAL_WORDING_MISMATCH');
  if (L.INTERNAL.test(text)) f.push('INTERNAL_OR_GT_TERM_IN_TEXT');
  if ((text.match(/다\./g) || []).length > 2) f.push('MORE_THAN_TWO_SENTENCES');
  if (d.rule !== 'DM-V2-M0' && d.rule !== 'DM-V2-Z0' && !(reason.clauses || []).some((c) => c.kind === 'QUALIFYING_SYSTEM' || c.kind === 'NON_QUALIFYING_SYSTEM')) f.push('NO_OBSERVED_EVIDENCE_CITED');
  return f;
}
module.exports = { verify, PATH };
