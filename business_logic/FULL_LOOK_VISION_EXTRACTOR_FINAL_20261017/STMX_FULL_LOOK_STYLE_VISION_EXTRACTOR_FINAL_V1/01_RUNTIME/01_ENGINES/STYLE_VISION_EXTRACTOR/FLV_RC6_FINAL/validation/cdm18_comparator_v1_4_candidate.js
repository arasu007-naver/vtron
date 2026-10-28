'use strict';
/**
 * V1.4 — CDM-18 representation comparator (ISOLATED CANDIDATE; CDM-18 pending).
 * The sealed evaluator (validation/evaluate_run.js, via the sealed Phase-1 harness) compares normalised JSON, so a one-element array on a
 * MULTI fact (`["Leather"]`) never equals the scalar the reference stores (`"Leather"`). Item Vision V1_3 producer rules define exactly which
 * facts are MULTI (ITEM.MULTI = material · surface · decorative_detail · attachment [+ exposure_opening, not requestable here]); for those facts
 * a single present value and a one-element list are the same observation (one value present) — representation, not meaning. For every
 * other fact an array is a cardinality / type violation and is NOT normalised.
 *
 * This module never mutates a packet, a run record on disk, the reference or the sealed evaluator. It builds a normalised COPY of each
 * record, runs the SAME sealed evaluator on both, and returns the original verdicts, the candidate verdicts and a cell-by-cell
 * reconciliation with the reason and authority for every changed cell. The candidate number is a separately labelled view.
 */
const C = require('../src/contracts');
const RR = require('../src/run_record');
const MULTI_FACTS = new Set(C.ITEM.MULTI.filter((f) => C.REQUESTABLE_FACTS.includes(f)));
const MULTI_IDS = new Set([...MULTI_FACTS].map((f) => RR.ITEM_ID[f]));
const AUTHORITY = 'Item Vision V1_3 producer_rules_v1.js MULTI = ' + C.ITEM.MULTI.join(' · ') + ' (frozen; read-only). Equivalence claimed ONLY for one present value ⇔ one-element list on these facts.';

function expectedOf(reference, image_ref, key) { const im = (reference.images || []).find((i) => i.image_ref === image_ref); if (!im) return null; const p = (im.parameter_reference || []).find((q) => q.key === key); return p || null; }

/** Build a normalised copy of one aligned run record. Returns { record, changes[] }. */
function normalizeRecord(rec, reference) {
  const copy = JSON.parse(JSON.stringify(rec)); const changes = [];
  for (const [key, cell] of Object.entries(copy.parameters || {})) {
    const pid = key.split('@')[0]; if (!MULTI_IDS.has(pid)) continue;
    if (cell.observed_state !== 'OBSERVED' || cell.observed_value === undefined) continue;
    const exp = expectedOf(reference, rec.image_ref, key); if (!exp || exp.expected_state !== 'OBSERVED') continue;
    const ev = exp.expected_value, ov = cell.observed_value;
    if (Array.isArray(ov) && ov.length === 1 && !Array.isArray(ev)) { cell.observed_value = ov[0]; changes.push({ key, from: ov, to: ov[0], reason: 'MULTI fact: one-element list → scalar (reference stores a scalar)', authority: AUTHORITY, equivalence: 'SEMANTICALLY_EQUIVALENT (one value present)' }); }
    else if (!Array.isArray(ov) && Array.isArray(ev) && ev.length === 1) { cell.observed_value = [ov]; changes.push({ key, from: ov, to: [ov], reason: 'MULTI fact: scalar → one-element list (reference stores a one-element list)', authority: AUTHORITY, equivalence: 'SEMANTICALLY_EQUIVALENT (one value present)' }); }
    else if (Array.isArray(ov) && ov.length > 1 && !Array.isArray(ev)) changes.push({ key, from: ov, to: ov, reason: 'MULTI fact: several values vs one expected — cardinality difference, NOT normalised', authority: AUTHORITY, equivalence: 'NOT_EQUIVALENT (cardinality)' });
  }
  return { record: copy, changes };
}

/**
 * compare({ records, reference, evaluate, criticality }) → { original, candidate, matrix[], summary }
 *   records    aligned run records (as fed to the sealed evaluator)      evaluate   the SEALED harness evaluate(records, reference, opts)
 */
function compare({ records, reference, evaluate, criticality }) {
  const original = evaluate(records, reference, { criticality });
  const norm = records.map((r) => normalizeRecord(r, reference)); const candidate = evaluate(norm.map((n) => n.record), reference, { criticality });
  const key = (r) => r.image_ref + '|' + r.key; const oBy = new Map(original.rows.map((r) => [key(r), r])); const cBy = new Map(candidate.rows.map((r) => [key(r), r]));
  const CORRECT = new Set(['OBSERVED_CORRECT', 'STATE_CORRECT_NON_OBSERVED']); const matrix = [];
  const changeBy = new Map(); norm.forEach((n, i) => n.changes.forEach((ch) => changeBy.set(records[i].image_ref + '|' + ch.key, ch)));
  for (const [k, o] of oBy) { const c = cBy.get(k); const ch = changeBy.get(k); if (!c) continue; if (o.outcome === c.outcome && !ch) continue;
    const rec = records.find((r) => r.image_ref === o.image_ref); const raw = rec && rec.parameters[o.key] ? rec.parameters[o.key].observed_value : undefined; const exp = expectedOf(reference, o.image_ref, o.key);
    matrix.push({ case_id: k, image_ref: o.image_ref, key: o.key, parameter_id: o.parameter_id, fact: Object.entries(RR.ITEM_ID).find(([, id]) => id === o.parameter_id)?.[0] || null, expected_representation: exp ? (Array.isArray(exp.expected_value) ? 'array[' + exp.expected_value.length + ']' : typeof exp.expected_value) + ' ' + JSON.stringify(exp.expected_value) : null, actual_representation: (Array.isArray(raw) ? 'array[' + raw.length + ']' : typeof raw) + ' ' + JSON.stringify(raw), schema_authority: ch ? ch.authority : AUTHORITY, semantic_equivalence: ch ? ch.equivalence : 'NO_CHANGE', original_verdict: o.outcome, candidate_verdict: c.outcome, worsened: CORRECT.has(o.outcome) && !CORRECT.has(c.outcome), ceo_cdm18_approval_still_required: true, note: ch ? ch.reason : 'outcome changed without a normalisation (unexpected — report)' }); }
  const tally = (rows) => rows.reduce((m, r) => { m[r.outcome] = (m[r.outcome] || 0) + 1; return m; }, {});
  return { authority: AUTHORITY, multi_facts: [...MULTI_FACTS], original: { tally: tally(original.rows), rows: original.rows }, candidate: { tally: tally(candidate.rows), rows: candidate.rows, label: 'CANDIDATE VIEW — not the sealed score; CDM-18 approval required for adoption' }, normalisations: norm.flatMap((n, i) => n.changes.map((ch) => ({ image_ref: records[i].image_ref, ...ch }))), matrix, summary: { cells_changed: matrix.filter((m) => m.original_verdict !== m.candidate_verdict).length, cells_improved: matrix.filter((m) => !CORRECT.has(m.original_verdict) && CORRECT.has(m.candidate_verdict)).length, cells_worsened: matrix.filter((m) => m.worsened).length, cardinality_not_normalised: norm.flatMap((n) => n.changes).filter((ch) => /NOT_EQUIVALENT/.test(ch.equivalence)).length } };
}
module.exports = { compare, normalizeRecord, MULTI_FACTS: [...MULTI_FACTS], AUTHORITY };
