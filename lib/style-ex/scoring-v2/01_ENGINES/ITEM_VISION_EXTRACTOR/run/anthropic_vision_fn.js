/**
 * STMX — P2 Diagnostic · Caller-side Live Vision Adapter (CEO-run)
 * ---------------------------------------------------------------------------
 * This is the INJECTED visionFn (G11 · caller-side) — NOT producer semantics.
 * It wires Producer V1 to the Anthropic Messages API following the existing live-runner
 * pattern (image[base64] + text prompt, one call). Model is CONFIGURABLE (D7); the API
 * KEY is read from the environment (ANTHROPIC_API_KEY) and is NEVER written to a file or
 * embedded. Nothing here scores or governs (Observation ≠ Consumption).
 *
 * Usage (CEO):
 *   $env:ANTHROPIC_API_KEY = "<your key>"   # PowerShell — key stays in your env only
 *   node p2_diagnostic_driver.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ══ D5 · ROOT MEDIA-TYPE RESOLUTION (CEO Decision 2026-08-23) ═══════════════════════════════
// ROOT DEFECT (Batch 003): media type was derived from the FILENAME EXTENSION and fell back to
// `image/jpeg` for anything unrecognised. Several reference-corpus artifacts have NO extension, so
// real PNG bytes were declared image/jpeg and the API rejected the call. The batch harness worked
// around it caller-side; CEO ruled it must be fixed AT ROOT.
//
// AUTHORITY ORDER: actual file BYTES win. Extension is advisory only.
// ⛔ NO silent image/jpeg fallback — unidentifiable bytes now FAIL EXPLICITLY.
const MEDIA = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Magic-signature sniffer — the authoritative media-type source. Returns null if unidentifiable. */
function sniffMediaType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
    && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return 'image/png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (buf.slice(0, 6).toString('latin1') === 'GIF87a' || buf.slice(0, 6).toString('latin1') === 'GIF89a') return 'image/gif';
  return null;
}

function imageToBlock(image) {
  // Form 1 — governed direct form { data, media_type } (already base64). Preserved for compatibility.
  // ⛔ The silent 'image/jpeg' default is removed: an explicit caller must supply a SUPPORTED type.
  if (image && typeof image === 'object' && image.data) {
    const mt = image.media_type;
    if (!mt) throw new Error('media_type required with {data}: explicit callers must declare a supported image media type (' + SUPPORTED.join(', ') + ')');
    if (!SUPPORTED.includes(mt)) throw new Error(`unsupported media_type '${mt}' (supported: ${SUPPORTED.join(', ')})`);
    return { type: 'image', source: { type: 'base64', media_type: mt, data: image.data } };
  }
  // Form 2 — filesystem path. Bytes are authoritative; extension never overrides them.
  if (typeof image === 'string') {
    const buf = fs.readFileSync(image);
    const sniffed = sniffMediaType(buf);
    if (!sniffed) {
      const ext = path.extname(image).toLowerCase();
      throw new Error(`unrecognised image bytes for '${path.basename(image)}'`
        + (MEDIA[ext] ? ` (extension suggested ${MEDIA[ext]}, but the bytes do not match any supported format)` : '')
        + ` — supported: ${SUPPORTED.join(', ')}. Refusing to guess a media type.`);
    }
    return { type: 'image', source: { type: 'base64', media_type: sniffed, data: buf.toString('base64') } };
  }
  throw new Error('unsupported image input (expected {data,media_type} or a file path)');
}

/**
 * makeAnthropicVisionFn — returns a visionFn(prompt, image, opts) for injection into runProducer.
 * @param {object} cfg { apiKey?=env.ANTHROPIC_API_KEY, model?='claude-opus-4-8'(precision-first, configurable), maxTokens?=8192, baseUrl?, version?='2023-06-01' }
 */
function makeAnthropicVisionFn(cfg) {
  const c = cfg || {};
  const apiKey = c.apiKey || process.env.ANTHROPIC_API_KEY;
  const baseUrl = c.baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const version = c.version || '2023-06-01';
  const maxTokens = c.maxTokens || 8192;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set — provide it in the environment (never in a file).');

  return async function visionFn(prompt, image, opts) {
    const model = (opts && opts.model) || c.model || 'claude-opus-4-8'; // precision-first default; fully configurable (D7)
    const body = { model, max_tokens: maxTokens, messages: [{ role: 'user', content: [imageToBlock(image), { type: 'text', text: prompt }] }] };
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': version },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const t = await res.text().catch(() => ''); const e = new Error(`anthropic ${res.status}: ${t.slice(0, 300)}`); e.__http = res.status; throw e; }
    const json = await res.json();
    // Return the model's text output; producer_model_adapter parses JSON from it.
    const text = (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return text;
  };
}

module.exports = { makeAnthropicVisionFn, imageToBlock };
