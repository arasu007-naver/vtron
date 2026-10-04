'use strict';
/**
 * BOUNDED RE-VALIDATION AFTER IN-ORDER CORRECTION (order §27)
 *
 * ★ Budget continues from the first run: 8 invocations were used, 4 remain of the 12 ceiling.
 *   Exactly 4 cases are re-run and the runner refuses to exceed the ceiling.
 * ★ Cases chosen by DIAGNOSTIC VALUE, not by result quality:
 *     L5 — never produced a usable result (response truncated)
 *     L7 — the uniform-dense control was never exercised (family misread)
 *     L6 — the one critical control that FAILED
 *     L4 — the strongest passing control, re-run to prove the correction broke nothing
 *   ⛔ No case is re-run because its content was disliked; L6 is re-run and its result is reported
 *      whatever it is.
 * ⛔ The API key is read from the environment and never printed or written.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HERE = __dirname;
const OUT = path.resolve(HERE, '..');
const ROOT = path.resolve(OUT, '..', '..', '..');
const IVE = path.join(ROOT, '01_ENGINES', 'ITEM_VISION_EXTRACTOR');
const V12 = path.join(IVE, 'STMX_VISION_PRODUCER_V1_2');

const { buildPrompt } = require(path.join(V12, 'producer_prompt_v1.js'));
const { parsePackage } = require(path.join(V12, 'producer_model_adapter_v1.js'));
const { governEnvelope } = require(path.join(V12, 'producer_controller_v1.js'));
const { makeAnthropicVisionFn } = require(path.join(IVE, 'run', 'anthropic_vision_fn.js'));

const SEL = JSON.parse(fs.readFileSync(path.join(OUT, '07_STMX_DM_LIVE_IMAGE_SELECTION_V1.json'), 'utf8'));
const FIRST = JSON.parse(fs.readFileSync(path.join(OUT, '09_STMX_DM_LIVE_RAW_RESULT_MANIFEST_V1.json'), 'utf8'));

const CASES = ['L5', 'L7', 'L6', 'L4'];
const CEILING = 12;
const already = FIRST.api_invocations_used;
const REMAINING = CEILING - already;
const MODEL = FIRST.model_used;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
/** ★ raised only to stop truncation — a transport parameter, not producer semantics. */
const visionFn = makeAnthropicVisionFn({ maxTokens: 16000 });

let calls = 0;
const log = [];

(async () => {
  const prompt = buildPrompt();
  const promptHash = sha(prompt);
  fs.writeFileSync(path.join(HERE, 'PROMPT_USED_AFTER_CORRECTION.txt'), prompt, 'utf8');
  console.log('budget: ' + already + ' used, ' + REMAINING + ' remaining of ' + CEILING +
    ' · re-running ' + CASES.length + ' cases');

  const results = [];
  for (const c of CASES) {
    if (calls >= REMAINING) { console.log('BUDGET REACHED — stopping'); break; }
    const img = SEL.images.find(x => x.case === c);
    const abs = path.join(ROOT, img.path.split('/').join(path.sep));
    const buf = fs.readFileSync(abs);
    const rec = { case: c, ref_id: img.ref_id, nickname: img.nickname, image_sha256: img.sha256,
      prompt_sha256: promptHash, model: MODEL };

    calls++;
    const started = new Date().toISOString();
    let text = null;
    try { text = await visionFn(prompt, { data: buf.toString('base64'), media_type: img.media_type }, { model: MODEL }); }
    catch (e) {
      rec.status = 'TECHNICAL_FAILURE'; rec.error = String((e && e.message) || e).slice(0, 300);
      log.push({ n: calls, case: c, started, ok: false, error: rec.error });
      results.push(rec); continue;
    }
    log.push({ n: calls, case: c, started, ok: true, chars: text.length });

    fs.writeFileSync(path.join(HERE, 'rerun_raw_' + c + '_' + img.nickname + '.txt'), text, 'utf8');
    rec.raw_file = 'rerun_raw_' + c + '_' + img.nickname + '.txt';
    rec.raw_sha256 = sha(text);

    const parsed = parsePackage(text);
    if (!parsed.ok) { rec.status = 'UNPARSEABLE'; results.push(rec); continue; }
    const env = governEnvelope(parsed.pkg, { imageId: img.ref_id, model: MODEL, visionCalls: 1 });
    rec.status = 'GOVERNED';
    rec.contract_valid = env.contract_valid;
    rec.image_validation_status = env.envelope.image_validation_status;
    rec.targets = env.envelope.targets.filter(t => t.eligible).map(t => ({
      validation_ok: t.validation ? t.validation.ok : null,
      error_codes: t.validation ? [...new Set((t.validation.errors || []).map(e => e.code))] : [],
      dm_block_present: !!(t.record && t.record.dm_designed_detail_evidence),
      evidence: ((t.record && t.record.dm_designed_detail_evidence
        && t.record.dm_designed_detail_evidence.evidence) || []).map(e => ({
          family: e.evidence_family,
          relative_size: e.relative_size && e.relative_size.value,
          contrast: e.contrast && e.contrast.value,
          spatial_position: e.spatial_position && e.spatial_position.value,
          m1: e.m1_supporting_realization || null,
        })),
    }));
    fs.writeFileSync(path.join(HERE, 'rerun_governed_' + c + '_' + img.nickname + '.json'),
      JSON.stringify(env.envelope, null, 2), 'utf8');
    rec.governed_file = 'rerun_governed_' + c + '_' + img.nickname + '.json';
    results.push(rec);
    const t0 = rec.targets[0] || {};
    console.log(c + ' ' + img.nickname.padEnd(14) + ' contract_valid=' + String(rec.contract_valid).padEnd(6) +
      ' errors=' + ((t0.error_codes || []).join(',') || 'none') +
      ' ev=' + (t0.evidence || []).length);
    (t0.evidence || []).forEach(e => console.log('     ' + e.family + ' ' + e.relative_size + '/' + e.contrast +
      '/' + e.spatial_position + '  m1=' + JSON.stringify(e.m1)));
  }

  fs.writeFileSync(path.join(OUT, '09B_STMX_DM_LIVE_RERUN_MANIFEST_V1.json'), JSON.stringify({
    document: '09B_STMX_DM_LIVE_RERUN_MANIFEST_V1', date: '2026-09-09',
    '⛔_no_credentials': '⛔ No key, token or credential appears here or in any artifact.',
    '★_budget_accounting': { ceiling: CEILING, used_first_run: already, used_this_run: calls,
      total_used: already + calls, remaining: CEILING - already - calls },
    '★_case_selection_rationale': 'L5 never produced a usable result · L7 control never exercised · L6 control failed · L4 regression check. ⛔ Not selected by result quality.',
    model_used: MODEL, prompt_sha256: promptHash,
    corrections_applied_before_this_run: [
      'prompt: m1_supporting_realization now states the {state,value} envelope explicitly with a worked example',
      'prompt: frozen Evidence Registry family examples added as descriptor identification aids',
      'caller maxTokens raised 8192 → 16000 (transport only; no producer semantics touched)',
    ],
    invocation_log: log, results,
  }, null, 2));
  console.log('\nRE-RUN DONE — total invocations ' + (already + calls) + '/' + CEILING);
})().catch(e => { console.error('RERUN ABORTED: ' + e.message); process.exit(1); });
