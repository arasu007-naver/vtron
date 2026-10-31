/**
 * STMX — 40-Param Vision Producer V1 · MODEL ADAPTER
 * ---------------------------------------------------------------------------
 * D7: MODEL-AGNOSTIC. No vendor/model name is frozen here. The actual model
 *   invocation is INJECTED as opts.visionFn(prompt, image) — same seam as the
 *   production sr_vision_adapter_v1 (reused pattern, NOT its SR semantics · U isolation).
 * D5/§16: ONE semantic call per image. Bounded retry for TECHNICAL failure ONLY
 *   (API/network/timeout/malformed/truncated/missing-envelope). NEVER retry for
 *   UNKNOWN, visual ambiguity, GT disagreement, or a suspect value. No majority
 *   voting / best-of-N.
 * The adapter does NOT govern frozen rules and does NOT score (Observation ≠ Consumption).
 */
'use strict';
const { buildPrompt } = require('./producer_prompt_v1');

const TECH = {
  NO_VISION_FN: 'NO_VISION_FN',
  TIMEOUT: 'VISION_TIMEOUT',
  CALL_FAILED: 'VISION_CALL_FAILED',
  UNPARSEABLE: 'UNPARSEABLE_RESPONSE',
  MISSING_ENVELOPE: 'MISSING_TARGETS_ENVELOPE',
};

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { const e = new Error('vision timeout'); e.__timeout = true; reject(e); }, timeoutMs);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

// Tolerant JSON extraction: accept an object, a raw JSON string, or a ```json fenced block.
function parsePackage(raw) {
  if (raw && typeof raw === 'object') return { ok: true, pkg: raw };
  if (typeof raw !== 'string') return { ok: false, code: TECH.UNPARSEABLE, raw };
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  else { const i = s.indexOf('{'), j = s.lastIndexOf('}'); if (i >= 0 && j > i) s = s.slice(i, j + 1); }
  try { return { ok: true, pkg: JSON.parse(s) }; }
  catch (e) { return { ok: false, code: TECH.UNPARSEABLE, raw }; }
}

/**
 * runOneCall — perform the single semantic vision call (with bounded technical retry).
 * @param {*} image  opaque image reference passed through to visionFn
 * @param {object} opts { visionFn:(prompt,image)=>Promise<raw>, timeoutMs=45000, maxTechnicalRetries=1, model? }
 * @returns {Promise<{ok:true, pkg, attempts, raw}|{ok:false, code, detail, attempts, raw}>}
 */
async function runOneCall(image, opts) {
  const options = opts || {};
  const visionFn = options.visionFn;
  const timeoutMs = options.timeoutMs || 45000;
  const maxRetries = Number.isInteger(options.maxTechnicalRetries) ? options.maxTechnicalRetries : 1; // conservative + configurable
  if (typeof visionFn !== 'function') {
    return { ok: false, code: TECH.NO_VISION_FN, detail: 'opts.visionFn not provided', attempts: 0, raw: null };
  }
  const prompt = buildPrompt();
  let attempts = 0, lastRaw = null, lastCode = null, lastDetail = null;

  while (attempts <= maxRetries) {
    attempts++;
    let raw;
    try {
      raw = await withTimeout(visionFn(prompt, image, { model: options.model }), timeoutMs);
    } catch (e) {
      lastCode = e && e.__timeout ? TECH.TIMEOUT : TECH.CALL_FAILED;
      lastDetail = String((e && e.message) || e);
      lastRaw = null;
      continue; // technical failure → bounded retry
    }
    lastRaw = raw;
    const parsed = parsePackage(raw);
    if (!parsed.ok) { lastCode = parsed.code; lastDetail = 'model output not parseable as JSON'; continue; }
    const pkg = parsed.pkg;
    if (!pkg || !Array.isArray(pkg.targets)) {
      lastCode = TECH.MISSING_ENVELOPE; lastDetail = 'parsed output lacks a targets[] array'; continue;
    }
    return { ok: true, pkg, attempts, raw };
  }
  return { ok: false, code: lastCode || TECH.CALL_FAILED, detail: lastDetail, attempts, raw: lastRaw };
}

module.exports = { runOneCall, parsePackage, withTimeout, TECH };
