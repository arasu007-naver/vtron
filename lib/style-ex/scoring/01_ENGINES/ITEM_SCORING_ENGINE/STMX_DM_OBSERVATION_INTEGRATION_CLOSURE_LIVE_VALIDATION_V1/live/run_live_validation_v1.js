'use strict';
/**
 * STMX DM — BOUNDED LIVE VISION VALIDATION RUNNER V1
 *
 * ★ Uses the REAL V1_2 candidate chain (order §24):
 *     V1_2 buildPrompt → model → V1_2 parsePackage → V1_2 governEnvelope → V1_2 validation
 *   ⛔ It does NOT hand model output to a validator by itself; it asserts the validation the
 *      pipeline actually returns.
 * ⛔ The API key is read from the environment and is NEVER printed, logged or written to any file.
 * ⛔ HARD BUDGET (order §20): 8 primary calls + at most 4 technical retries = 12 invocations.
 *    A retry is permitted ONLY for a transport/model-service failure — never because the CONTENT
 *    of a result was disliked. There is no cherry-picking path in this file.
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
const MODELS = (process.argv[2] || 'claude-opus-5,claude-sonnet-5,claude-opus-4-8').split(',');
const MAX_CALLS = 12;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

let calls = 0;
const log = [];
const visionFn = makeAnthropicVisionFn({});

/** one invocation, budget-counted. ⛔ Never called to "improve" a result. */
async function invoke(prompt, image, model, why) {
  if (calls >= MAX_CALLS) throw new Error('API_BUDGET_EXHAUSTED: ' + MAX_CALLS + ' invocations used');
  calls++;
  const started = new Date().toISOString();
  try {
    const text = await visionFn(prompt, image, { model });
    log.push({ n: calls, model, why, started, ok: true, chars: text.length });
    return { ok: true, text };
  } catch (e) {
    const msg = String((e && e.message) || e).slice(0, 300);
    log.push({ n: calls, model, why, started, ok: false, error: msg });
    return { ok: false, error: msg, http: e && e.__http };
  }
}

(async () => {
  const prompt = buildPrompt();
  const promptHash = sha(prompt);
  fs.writeFileSync(path.join(HERE, 'PROMPT_USED.txt'), prompt, 'utf8');

  let model = null;
  const results = [];

  for (const img of SEL.images) {
    const abs = path.join(ROOT, img.path.split('/').join(path.sep));
    const buf = fs.readFileSync(abs);
    const image = { data: buf.toString('base64'), media_type: img.media_type };
    const rec = { case: img.case, ref_id: img.ref_id, nickname: img.nickname, image_sha256: img.sha256,
      image_path: img.path, prompt_sha256: promptHash, attempts: [] };

    // resolve the model once, on the first image, using the allowed technical retry
    let res = null;
    if (model === null) {
      for (const m of MODELS) {
        res = await invoke(prompt, image, m, 'model resolution on first image');
        rec.attempts.push({ model: m, ok: res.ok, error: res.ok ? null : res.error });
        if (res.ok) { model = m; break; }
        if (!/model|404|400|not_found/i.test(res.error || '')) break;   // not a model problem → stop
      }
    } else {
      res = await invoke(prompt, image, model, 'primary');
      rec.attempts.push({ model, ok: res.ok, error: res.ok ? null : res.error });
      if (!res.ok && calls < MAX_CALLS) {                    // ⛔ transport retry only
        res = await invoke(prompt, image, model, 'technical retry');
        rec.attempts.push({ model, ok: res.ok, error: res.ok ? null : res.error, retry: true });
      }
    }

    rec.model = model;
    if (!res || !res.ok) {
      rec.status = 'TECHNICAL_FAILURE'; rec.error = res ? res.error : 'no attempt';
      results.push(rec); continue;
    }

    // ── raw preservation ──
    fs.writeFileSync(path.join(HERE, 'raw_' + img.case + '_' + img.nickname + '.txt'), res.text, 'utf8');
    rec.raw_sha256 = sha(res.text);
    rec.raw_file = 'raw_' + img.case + '_' + img.nickname + '.txt';

    // ── REAL V1_2 PATH ──
    const parsed = parsePackage(res.text);
    if (!parsed.ok) { rec.status = 'UNPARSEABLE'; results.push(rec); continue; }
    const env = governEnvelope(parsed.pkg, { imageId: img.ref_id, model, visionCalls: 1 });
    rec.status = 'GOVERNED';
    rec.contract_valid = env.contract_valid;
    rec.image_validation_status = env.envelope.image_validation_status;
    rec.targets = env.envelope.targets.map(t => ({
      target_id: t.target_id, eligible: t.eligible,
      validation_ok: t.validation ? t.validation.ok : null,
      error_codes: t.validation ? (t.validation.errors || []).map(e => e.code) : [],
      dm_block_present: !!(t.record && t.record.dm_designed_detail_evidence),
      dm: t.record && t.record.dm_designed_detail_evidence ? t.record.dm_designed_detail_evidence : null,
    }));
    fs.writeFileSync(path.join(HERE, 'governed_' + img.case + '_' + img.nickname + '.json'),
      JSON.stringify(env.envelope, null, 2), 'utf8');
    rec.governed_file = 'governed_' + img.case + '_' + img.nickname + '.json';
    results.push(rec);
    console.log(img.case + ' ' + (img.nickname + '').padEnd(15) + ' calls=' + calls +
      ' contract_valid=' + String(rec.contract_valid).padEnd(6) +
      ' targets=' + rec.targets.length +
      ' dm=' + rec.targets.map(t => t.dm_block_present ? (t.dm.evidence ? t.dm.evidence.length : '?') + 'ev' : 'NONE').join('/'));
  }

  const manifest = {
    document: '09_STMX_DM_LIVE_RAW_RESULT_MANIFEST_V1', date: '2026-09-09',
    '⛔_no_credentials': '⛔ No API key, token or credential appears in this file, in any raw artifact, or anywhere in the review package.',
    '★_budget': '★ Order §20 — 8 images, 1 primary call each, technical retries only. No result was re-requested because its CONTENT was disliked; this runner has no such path.',
    model_used: model, models_attempted: MODELS,
    api_invocations_used: calls, api_invocation_budget: MAX_CALLS,
    prompt_sha256: promptHash, prompt_file: 'PROMPT_USED.txt',
    preregistration_seal: JSON.parse(fs.readFileSync(path.join(HERE, 'PREREGISTRATION_SEAL.json'), 'utf8')),
    invocation_log: log, results,
  };
  fs.writeFileSync(path.join(OUT, '09_STMX_DM_LIVE_RAW_RESULT_MANIFEST_V1.json'), JSON.stringify(manifest, null, 2));
  console.log('\nLIVE DONE — invocations ' + calls + '/' + MAX_CALLS + ' · model ' + model +
    ' · governed ' + results.filter(r => r.status === 'GOVERNED').length + '/' + SEL.images.length);
})().catch(e => { console.error('RUNNER ABORTED: ' + e.message); process.exit(1); });
