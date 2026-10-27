'use strict';
/**
 * V1.3 transport — stage 1: model text → ONE JSON object. Strict, deterministic, no repair.
 *   parseModelText(text)      → { obj, fences_stripped }           throws TRANSPORT_* on anything that is not exactly one JSON object
 *   textFromRawResponse(raw)  → { text, stop_reason, model }        reads ONLY the assistant text blocks of a stored Messages response
 * G53: these functions read strings / objects already on disk. They never open a network module and never read a credential.
 * CDM-15 (structured-output transport) is PENDING: this parser does not enforce a transport schema; it only establishes that a single
 * JSON object was returned so that the structural converter (convert.js) can account for every key it carries.
 */
class TransportError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; this.detail = detail; } }

function parseModelText(text) {
  if (typeof text !== 'string') throw new TransportError('TRANSPORT_TEXT_NOT_STRING');
  let t = text.trim(); let stripped = false;
  if (!t.length) throw new TransportError('TRANSPORT_EMPTY_RESPONSE');
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/); if (m) { t = m[1].trim(); stripped = true; }
  if (!t.startsWith('{')) throw new TransportError('TRANSPORT_NOT_A_JSON_OBJECT', 'response does not start with "{" (prose or array)');
  let obj;
  try { obj = JSON.parse(t); } catch (e) { throw new TransportError('TRANSPORT_INVALID_JSON', e.message.slice(0, 160)); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new TransportError('TRANSPORT_NOT_A_JSON_OBJECT');
  return { obj, fences_stripped: stripped };
}

/**
 * V1.4 — STRICT NATIVE parse (order §6): judges the text exactly as emitted. No fence stripping, no trimming beyond outer whitespace,
 * no repair. Returns a report, never throws:
 *   { ok, obj|null, fenced, prose_before, prose_after, multiple_objects, invalid_json, empty }
 * ok === true only when the whole text is ONE JSON object (Prompt V1.2 §8 "ONE JSON object and nothing else"). parseModelText (above)
 * keeps the SAFE behaviour for stored historical outputs (fence stripped, logged as fences_stripped) — the two verdicts are reported separately.
 */
function parseStrictNative(text) {
  const r = { ok: false, obj: null, fenced: false, prose_before: false, prose_after: false, multiple_objects: false, invalid_json: false, empty: false };
  if (typeof text !== 'string') { r.invalid_json = true; return r; }
  const t = text.trim(); if (!t.length) { r.empty = true; return r; }
  if (/^```/.test(t) || /```\s*$/.test(t)) r.fenced = true;
  const first = t.indexOf('{'); if (first < 0) { r.prose_before = true; r.invalid_json = true; return r; }
  if (first > 0 && t.slice(0, first).replace(/^```(?:json)?\s*/i, '').trim().length) r.prose_before = true;   // a fence opener is counted once, as `fenced`, not as prose
  // walk to the matching closing brace of the first object (string-aware)
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = first; i < t.length; i++) { const ch = t[i]; if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; } if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } } }
  if (end < 0) { r.invalid_json = true; return r; }
  const tail = t.slice(end + 1).trim(); if (tail.length) { if (/^\{/.test(tail)) r.multiple_objects = true; else if (!/^```\s*$/.test(tail)) r.prose_after = true; }
  try { const obj = JSON.parse(t.slice(first, end + 1)); if (obj && typeof obj === 'object' && !Array.isArray(obj)) r.obj = obj; else r.invalid_json = true; } catch (e) { r.invalid_json = true; }
  r.ok = !!r.obj && !r.fenced && !r.prose_before && !r.prose_after && !r.multiple_objects && !r.invalid_json;
  return r;
}

/** A stored provider response (Anthropic Messages shape) → the concatenated assistant text. Thinking / signatures / usage are never read as evidence. */
function textFromRawResponse(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.content)) throw new TransportError('TRANSPORT_RAW_SHAPE', 'no content[]');
  const texts = raw.content.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text);
  if (!texts.length) throw new TransportError('TRANSPORT_RAW_NO_TEXT_BLOCK');
  if (raw.stop_reason && raw.stop_reason !== 'end_turn' && raw.stop_reason !== 'stop_sequence') throw new TransportError('TRANSPORT_INCOMPLETE_RESPONSE', 'stop_reason = ' + raw.stop_reason);
  return { text: texts.join('\n'), stop_reason: raw.stop_reason || null, model: raw.model || null };
}

module.exports = { parseModelText, parseStrictNative, textFromRawResponse, TransportError };
