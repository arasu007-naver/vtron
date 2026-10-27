'use strict';
/**
 * Offline validation evaluator (Phase-1 preparation, order §41–§46). It NEVER calls a model: it takes a stored run record
 * (src/run_record.js schema — later filled from live output) and the model-blind reference master, and classifies every
 * (image, component, parameter) into exactly one outcome:
 *   OBSERVED_CORRECT · STATE_CORRECT_NON_OBSERVED · MISSING · WRONG_VALUE · HALLUCINATION · STATE_ERROR ·
 *   APPLICABILITY_ERROR · OWNERSHIP_DEDUP_ERROR · NOT_EVALUATED (UNRESOLVED reference / not required)
 * Root cause (CONTRACT_DEFECT · IMPLEMENTATION_DEFECT · MODEL_PERCEPTION_LIMITATION · IMAGE_LIMITATION · UNRESOLVED) is NEVER
 * inferred from the mismatch: it is merged from an adjudication file written after the error is seen. No score / direction anywhere.
 */
const OUTCOMES = ['OBSERVED_CORRECT', 'STATE_CORRECT_NON_OBSERVED', 'MISSING', 'WRONG_VALUE', 'HALLUCINATION', 'STATE_ERROR', 'APPLICABILITY_ERROR', 'OWNERSHIP_DEDUP_ERROR', 'NOT_EVALUATED'];
const ERRORS = ['MISSING', 'WRONG_VALUE', 'HALLUCINATION', 'STATE_ERROR', 'APPLICABILITY_ERROR', 'OWNERSHIP_DEDUP_ERROR'];
const ROOT_CAUSES = ['CONTRACT_DEFECT', 'IMPLEMENTATION_DEFECT', 'MODEL_PERCEPTION_LIMITATION', 'IMAGE_LIMITATION', 'UNRESOLVED'];
const STYLE_SCOPED = /^SVP-0(0[2-6])$/;                                               // identity · refinement · front state · colour · standing are per component; 011 per securing component
const norm = (v) => { if (Array.isArray(v)) return v.map(norm).map((x) => JSON.stringify(x)).sort(); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = norm(v[k]); return o; } return v; };
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
const elems = (v) => (Array.isArray(v) ? v.map((x) => JSON.stringify(norm(x))) : null);
const compRef = (key) => (key.includes('@') ? key.split('@')[1] : null);
const paramId = (key) => key.split('@')[0];

function evaluateImage(run, ref, opts) {
  const o = opts || {}; const crit = o.criticality || {}; const adj = (o.adjudication || {})[ref.image_ref] || {};
  const rows = []; const row = (key, outcome, extra) => { const pid = paramId(key); const r = { image_ref: ref.image_ref, key, parameter_id: pid, component_ref: compRef(key), outcome, root_cause: adj[key] && ROOT_CAUSES.includes(adj[key]) ? adj[key] : null, ...(extra || {}) }; r.critical_miss = ERRORS.includes(outcome) && crit[pid] === 'CRITICAL_DIRECTION'; rows.push(r); return r; };
  if (run.image_ref !== ref.image_ref || (run.image_hash && ref.image_hash && run.image_hash !== ref.image_hash)) throw new Error('EVAL_IMAGE_IDENTITY_MISMATCH: ' + run.image_ref);
  // ---- admission (routing): component-level outcomes
  const expParts = new Set(ref.admission.expected_participants.map((p) => p.ref)); const runParts = new Set(run.admission || []);
  const unresParts = new Set((ref.admission.unresolved || []).map((p) => p.ref));                 // admission pending CEO → NOT_EVALUATED, never an error
  const missedParts = [...expParts].filter((r) => !runParts.has(r)); const extraParts = [...runParts].filter((r) => !expParts.has(r) && !unresParts.has(r));
  for (const r of missedParts) row('ADMISSION@' + r, 'MISSING', { note: 'expected participant not admitted' });
  for (const r of extraParts) row('ADMISSION@' + r, 'HALLUCINATION', { note: 'non-participant admitted' });
  for (const r of unresParts) row('ADMISSION@' + r, 'NOT_EVALUATED', { note: 'admission UNRESOLVED in the reference' });
  const params = run.parameters || {}; const refByKey = Object.fromEntries(ref.parameter_reference.map((e) => [e.key, e]));
  // ---- reference-driven evaluation
  for (const e of ref.parameter_reference) {
    const c = compRef(e.key);
    if (c && missedParts.includes(c)) { if (e.applicability === 'APPLICABLE') row(e.key, 'MISSING', { note: 'component not admitted' }); continue; }
    if (e.reference_status === 'UNRESOLVED') { row(e.key, 'NOT_EVALUATED', { note: 'reference UNRESOLVED' }); continue; }
    const got = params[e.key];
    if (e.applicability === 'NOT_APPLICABLE') { if (got) row(e.key, 'APPLICABILITY_ERROR', { note: 'emitted where not applicable' }); continue; }
    if (e.required_emission === false && !got) { row(e.key, 'NOT_EVALUATED', { note: 'not required' }); continue; }
    if (!got) { row(e.key, 'MISSING'); continue; }
    const es = e.expected_state, gs = got.observed_state;
    if (es === 'OBSERVED') {
      if (gs === 'OBSERVED') {
        const ee = elems(e.expected_value), ge = elems(got.observed_value);
        if (ee && ge) { const dup = ge.length !== new Set(ge).size; const missing = ee.filter((x) => !ge.includes(x)), extra = ge.filter((x) => !ee.includes(x)); if (dup) row(e.key, 'OWNERSHIP_DEDUP_ERROR', { note: 'duplicate element (one phenomenon twice)' }); else if (!missing.length && !extra.length) row(e.key, 'OBSERVED_CORRECT'); else if (missing.length && !extra.length) row(e.key, 'MISSING', { note: 'elements missing: ' + missing.length }); else if (extra.length && !missing.length) row(e.key, 'HALLUCINATION', { note: 'extra elements: ' + extra.length }); else row(e.key, 'WRONG_VALUE'); }
        else row(e.key, same(e.expected_value, got.observed_value) ? 'OBSERVED_CORRECT' : 'WRONG_VALUE', same(e.expected_value, got.observed_value) ? {} : { expected: e.expected_value, observed: got.observed_value });
      } else if (gs === 'UNKNOWN') row(e.key, 'STATE_ERROR', { subtype: 'UNKNOWN_WHEN_READABLE' });
      else if (gs === 'NOT_VISIBLE') row(e.key, 'STATE_ERROR', { subtype: 'NOT_VISIBLE_WHEN_VISIBLE' });
      else row(e.key, 'STATE_ERROR', { subtype: 'ABSENT_WHEN_OBSERVED' });
    } else if (es === 'ABSENT') {
      if (gs === 'ABSENT') row(e.key, 'STATE_CORRECT_NON_OBSERVED'); else if (gs === 'OBSERVED') row(e.key, 'HALLUCINATION', { note: 'value emitted for a visibly absent feature' }); else row(e.key, 'STATE_ERROR', { subtype: gs + '_WHEN_READABLE' });
    } else if (es === 'NOT_VISIBLE') {
      if (gs === 'NOT_VISIBLE') row(e.key, 'STATE_CORRECT_NON_OBSERVED'); else if (gs === 'OBSERVED') row(e.key, 'STATE_ERROR', { subtype: 'OBSERVED_WHEN_UNREADABLE' }); else if (gs === 'ABSENT') row(e.key, 'STATE_ERROR', { subtype: 'ABSENT_WHEN_NOT_VISIBLE' }); else row(e.key, 'STATE_ERROR', { subtype: 'UNKNOWN_WHEN_NOT_VISIBLE' });
    } else if (es === 'UNKNOWN') {
      if (gs === 'UNKNOWN') row(e.key, 'STATE_CORRECT_NON_OBSERVED'); else if (gs === 'OBSERVED') row(e.key, 'STATE_ERROR', { subtype: 'OBSERVED_WHEN_UNREADABLE' }); else row(e.key, 'STATE_ERROR', { subtype: gs + '_WHEN_UNKNOWN' });
    }
  }
  // ---- run keys absent from the reference
  for (const key of Object.keys(params)) {
    if (refByKey[key]) continue; const c = compRef(key);
    if (c && (extraParts.includes(c) || unresParts.has(c))) continue;                          // counted once at component level / admission unresolved
    if (c && expParts.has(c)) row(key, 'APPLICABILITY_ERROR', { note: 'parameter not applicable to this component (not in reference)' });
    else row(key, 'HALLUCINATION', { note: 'fact not in reference' });
  }
  // ---- ownership pairs (one physical object = one record)
  for (const pair of ref.ownership_pairs || []) { const host = params['SVP-126@' + pair.host_ref]; if (host && host.observed_state === 'OBSERVED' && [].concat(host.observed_value).includes(pair.token) && runParts.has(pair.object_ref)) row('OWNERSHIP@' + pair.object_ref, 'OWNERSHIP_DEDUP_ERROR', { note: pair.token + ' on host ' + pair.host_ref + ' while ' + pair.object_ref + ' is a component' }); }
  return rows;
}

function summarize(rows, opts) {
  const crit = (opts && opts.criticality) || {}; const route = (opts && opts.route_group) || {};
  const byParam = {}; const byImage = {}; const critical = [];
  for (const r of rows) {
    const pid = r.parameter_id; const p = byParam[pid] = byParam[pid] || { parameter_id: pid, criticality: crit[pid] || null, route_group: route[pid] || null, applicable: 0, correct: 0, correct_non_observed: 0, missing: 0, wrong_value: 0, hallucination: 0, state_error: 0, applicability_error: 0, ownership_error: 0, not_evaluated: 0 };
    const im = byImage[r.image_ref] = byImage[r.image_ref] || { image_ref: r.image_ref, applicable_params: 0, correct: 0, critical_misses: 0, hallucinations: 0, state_errors: 0, unknown_issues: 0, admission_errors: 0, notes: [] };
    if (r.outcome === 'NOT_EVALUATED') { p.not_evaluated++; continue; }
    // "applicable" counts reference-driven (image, component, parameter) cases only: not admission / ownership rows, not emissions
    // outside the reference (unexpected facts, applicability errors) — those are counted in their own error columns
    const referenceDriven = !/^(ADMISSION|OWNERSHIP)@/.test(r.key) && r.outcome !== 'APPLICABILITY_ERROR' && !(r.outcome === 'HALLUCINATION' && r.note === 'fact not in reference');
    if (referenceDriven) { p.applicable++; im.applicable_params++; }
    if (r.outcome === 'OBSERVED_CORRECT') { p.correct++; im.correct++; } if (r.outcome === 'STATE_CORRECT_NON_OBSERVED') { p.correct_non_observed++; im.correct++; }
    if (r.outcome === 'MISSING') p.missing++; if (r.outcome === 'WRONG_VALUE') p.wrong_value++; if (r.outcome === 'HALLUCINATION') { p.hallucination++; im.hallucinations++; }
    if (r.outcome === 'STATE_ERROR') { p.state_error++; im.state_errors++; if (/UNKNOWN_WHEN_READABLE|OBSERVED_WHEN_UNREADABLE/.test(r.subtype || '')) im.unknown_issues++; }
    if (r.outcome === 'APPLICABILITY_ERROR') p.applicability_error++; if (r.outcome === 'OWNERSHIP_DEDUP_ERROR') p.ownership_error++;
    if (/^ADMISSION@/.test(r.key)) im.admission_errors++;
    if (r.critical_miss) { im.critical_misses++; critical.push({ image_ref: r.image_ref, parameter_id: pid, component_ref: r.component_ref, outcome: r.outcome, subtype: r.subtype || null, root_cause: r.root_cause, note: r.note || null }); }
  }
  for (const p of Object.values(byParam)) { const d = p.applicable || 0; p.rates = d ? { correct: (p.correct + p.correct_non_observed) / d, missing: p.missing / d, wrong_value: p.wrong_value / d, state_error: p.state_error / d } : null; }
  return { parameter_report: Object.values(byParam).sort((a, b) => a.parameter_id.localeCompare(b.parameter_id)), image_report: Object.values(byImage), critical_miss_register: critical };
}

function evaluateRuns(runs, reference, opts) {
  const refs = Object.fromEntries(reference.images.map((i) => [i.image_ref, i])); const rows = [];
  for (const run of runs) { const ref = refs[run.image_ref]; if (!ref) throw new Error('EVAL_NO_REFERENCE: ' + run.image_ref); rows.push(...evaluateImage(run, ref, opts)); }
  const out = summarize(rows, opts); out.rows = rows; out.evaluator = 'STMX_FULL_LOOK_STYLE_VISION_PHASE1_EVALUATOR_V1'; out.reference_version = reference.document; out.runs_formally_valid = runs.filter((r) => r.formal_comparison_valid).length; out.runs_total = runs.length;
  if (/"(score|direction|verdict|style_id)"\s*:/i.test(JSON.stringify(out))) throw new Error('EVAL_FORBIDDEN_KEY');
  return out;
}

module.exports = { evaluateImage, evaluateRuns, summarize, OUTCOMES, ERRORS, ROOT_CAUSES };
