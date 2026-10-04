'use strict';
/**
 * STMX DM — LIVE 8 DIRECTION-FIRST REPLAY FIXTURES V1
 *
 * ★ REPLAY, NOT RE-EXTRACTION (order §35 / §36).
 *   Every observation here is READ FROM DISK — the governed envelopes preserved by
 *   STMX_DM_OBSERVATION_INTEGRATION_CLOSURE_LIVE_VALIDATION_V1/live/. ⛔ No API call, no image,
 *   no prompt, no model. NEW API CALLS = 0.
 *
 * ★ WHICH RUN IS USED, AND WHY.
 *   The live order made 12 invocations: 8 first-run + 4 re-runs after an in-order prompt/transport
 *   correction. Where a re-run exists it is used, because it is the observation the CORRECTED
 *   production prompt produces (L4 · L5 · L6 · L7). Where none exists the first run is used
 *   (L1 · L2 · L3 · L8) and the row says so.
 *
 * ⛔ L2 · L3 · L8 first-run DM blocks carry the LF-1 defect: m1_supporting_realization was emitted
 *    as a BARE STRING instead of the {state,value} envelope, because the prompt at that time
 *    specified the envelope for the three primitives but listed only values for the M1 fields.
 *    The blocks are replayed EXACTLY AS PRESERVED — ⛔ not repaired, not reshaped, not re-typed.
 *    The frozen M1 predicate reads a bare string as UNRESOLVED, so the engine fails closed on
 *    those rows. That is the correct behaviour and it is reported as such, not hidden.
 */

const fs = require('fs');
const path = require('path');

const LIVE_DIR = path.resolve(__dirname, '..', '..',
  'STMX_DM_OBSERVATION_INTEGRATION_CLOSURE_LIVE_VALIDATION_V1', 'live');

/** case → the CEO reference the live order recorded, and what the case was selected to test */
const META = {
  L1: { nickname: 'basicvnkwt1', ref_id: 'REF_000353', ceo_reference: null,
        ceo_reference_note: '★ NO CEO GT. Selected as a PHENOMENON representative only (a plain V-neck tee from the ACTIVE corpus). ⛔ It is deliberately NOT basicwt1, which has no ACTIVE corpus record.',
        phenomenon: 'Minimal / no admitted designed detail',
        expected_direction: 'M', expected_strength: 'STRONG',
        expectation_basis: 'A garment with no admitted designed detail is the deepest Minimal reading. This follows from the phenomenon, not from a tier.' },
  L2: { nickname: 'logotee5', ref_id: 'REF_000342', ceo_reference: 'DM6',
        phenomenon: 'Large + localized (size/position independence)',
        expected_direction: 'D', expected_strength: 'WEAK',
        expectation_basis: 'CEO GT DM6 → order §7 evaluation band → D / WEAK.' },
  L3: { nickname: 'mono2', ref_id: 'REF_000367', ceo_reference: 'DM7',
        phenomenon: 'All-over repeat · Option A individuation',
        expected_direction: 'D', expected_strength: 'STRONG',
        expectation_basis: 'CEO GT DM7 → D / STRONG.' },
  L4: { nickname: 'techybrid4', ref_id: 'REF_000018', ceo_reference: 'DM5',
        phenomenon: 'Tonal same-family detail → Contrast low, not absent',
        expected_direction: 'NEUTRAL', expected_strength: 'N/A',
        expectation_basis: 'CEO GT DM5 → NEUTRAL / N-A.' },
  L5: { nickname: 'grp1', ref_id: 'REF_000323', ceo_reference: 'DM7',
        ceo_reference_note: '★ NOT one of the 47. grp1 is a frozen Score Physics M1 exemplar; its DM7 comes from the ratified Score Physics Architecture (base DM6 + M1), not from the CEO GT table.',
        phenomenon: 'Rich multi-colour localized graphic — M1 positive',
        expected_direction: 'D', expected_strength: 'STRONG',
        expectation_basis: 'Frozen Score Physics DM7 → D / STRONG.' },
  L6: { nickname: 'shirtsprint1', ref_id: 'REF_000193', ceo_reference: 'DM7',
        phenomenon: 'All-over multi-colour print — frozen M1 NON-trigger',
        expected_direction: 'D', expected_strength: 'STRONG',
        expectation_basis: 'CEO GT DM7 → D / STRONG.' },
  L7: { nickname: 'mtdr1', ref_id: 'REF_000680', ceo_reference: 'DM7',
        phenomenon: '★ Dense sequin field — the CEO re-adjudication case (order §14)',
        expected_direction: 'D', expected_strength: 'STRONG',
        expectation_basis: '★ Order §14 — the CEO examined the image directly: "mtdr1 = dense sequin field = clearly D-side / strong detail". CEO GT DM7 → D / STRONG. The DM7↔DM8 split is explicitly SECONDARY.' },
  L8: { nickname: 'mtdr3', ref_id: 'REF_000774', ceo_reference: 'DM8',
        ceo_reference_note: '★ NOT one of the 47. mtdr3 is a frozen Score Physics M1 exemplar (DM8 via M1).',
        phenomenon: '★ Geometric patterned sequin field — the other half of the §14 pair',
        expected_direction: 'D', expected_strength: 'STRONG',
        expectation_basis: '★ Order §14 — "mtdr3 = geometric patterned sequin field = clearly D-side / strong detail". Frozen DM8 → D / STRONG.' },
};

function readEnvelope(file) {
  const p = path.join(LIVE_DIR, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** the DM block of the first ELIGIBLE target, verbatim */
function firstEligibleDm(env) {
  const t = (env && Array.isArray(env.targets) ? env.targets : []).find(x => x && x.eligible);
  if (!t) return { found: false, dm: undefined, validation_ok: null, target_id: null };
  return {
    found: true,
    dm: t.record && t.record.dm_designed_detail_evidence,
    validation_ok: t.validation ? t.validation.ok : null,
    validation_codes: t.validation ? [...new Set((t.validation.errors || []).map(e => e.code))] : [],
    target_id: t.target_id || null,
  };
}

function load() {
  const files = fs.readdirSync(LIVE_DIR);
  return Object.keys(META).sort().map(c => {
    const meta = META[c];
    const rerun = files.find(f => f.startsWith('rerun_governed_' + c + '_') && f.endsWith('.json'));
    const first = files.find(f => f.startsWith('governed_' + c + '_') && f.endsWith('.json'));
    const use = rerun || first;
    const env = use ? readEnvelope(use) : null;
    const picked = env ? firstEligibleDm(env) : { found: false, dm: undefined, validation_ok: null, validation_codes: [], target_id: null };
    return Object.assign({ case: c }, meta, {
      source_file: use || null,
      run: rerun ? 'RE-RUN after the in-order prompt/transport correction' : (first ? 'FIRST RUN (no re-run exists — the live budget was 12 invocations)' : 'NO GOVERNED ENVELOPE PRESERVED'),
      governed_envelope_found: !!env,
      image_validation_status: env ? env.image_validation_status : null,
      producer_validation_ok: picked.validation_ok,
      producer_validation_codes: picked.validation_codes,
      dm_block: picked.dm,
      /** ⛔ the LF-1 shape defect, detected, reported — and NOT repaired */
      m1_field_shape_defect: (() => {
        const ev = (picked.dm && Array.isArray(picked.dm.evidence)) ? picked.dm.evidence : [];
        return ev.some(e => e && e.m1_supporting_realization &&
          Object.values(e.m1_supporting_realization).some(v => typeof v === 'string'));
      })(),
    });
  });
}

module.exports = { load, META, LIVE_DIR };
