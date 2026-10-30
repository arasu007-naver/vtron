'use strict';
/**
 * STMX Full-Look Four-Axis Integrated Scoring Runtime V1 — engine bindings (read-only).
 * Locates the directory that holds the four Final Frozen releases (the nearest ancestor of this file that contains FLEI_FINAL_V1, or env FL4AX_ENGINES_ROOT),
 * verifies each release against src/fl4ax_pins_v1.json (FINAL_FREEZE_SEAL.json sha256 · RELEASE_MANIFEST.json sha256 · runtime fingerprint recomputed from the
 * manifest's runtime files) and only then loads its entry. Any mismatch or missing file → BindingError (fail-closed; no fallback engine, no partial binding).
 * The engines keep their own internal pin checks; this layer never copies, edits or re-implements their scoring.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const PINS = require('./fl4ax_pins_v1.json');
class BindingError extends Error { constructor(code, detail) { super(code + ': ' + detail); this.code = code; this.detail = detail; } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function enginesRoot() {
  if (process.env.FL4AX_ENGINES_ROOT) return path.resolve(process.env.FL4AX_ENGINES_ROOT);
  let d = __dirname; for (let i = 0; i < 6; i++) { d = path.dirname(d); if (fs.existsSync(path.join(d, PINS.engines.EI.release_dir, 'FINAL_FREEZE_SEAL.json'))) return d; }
  throw new BindingError('RUNTIME_DEPENDENCY_MISSING', 'no ancestor directory holds ' + PINS.engines.EI.release_dir);
}
function verifyRelease(root, axis) {
  const p = PINS.engines[axis]; const d = path.join(root, p.release_dir);
  for (const f of ['FINAL_FREEZE_SEAL.json', 'RELEASE_MANIFEST.json', p.entry]) if (!fs.existsSync(path.join(d, f))) throw new BindingError('RUNTIME_DEPENDENCY_MISSING', axis + ' ' + p.release_dir + '/' + f);
  if (sha(path.join(d, 'FINAL_FREEZE_SEAL.json')) !== p.seal_sha256) throw new BindingError('BINDING_VERIFICATION_FAILED', axis + ' seal sha256');
  if (sha(path.join(d, 'RELEASE_MANIFEST.json')) !== p.release_manifest_sha256) throw new BindingError('BINDING_VERIFICATION_FAILED', axis + ' release manifest sha256');
  const M = JSON.parse(fs.readFileSync(path.join(d, 'RELEASE_MANIFEST.json'), 'utf8')); const h = crypto.createHash('sha256');
  for (const f of M.runtime.files) { const fp = path.join(d, f); if (!fs.existsSync(fp)) throw new BindingError('RUNTIME_DEPENDENCY_MISSING', axis + ' runtime file ' + f); h.update(f); h.update(sha(fp)); }
  if (h.digest('hex') !== p.runtime_fingerprint) throw new BindingError('BINDING_VERIFICATION_FAILED', axis + ' runtime fingerprint');
  return d;
}
let cache = null;
/** bind() → { root, engines: { EI|TC|SR|DM: { release_id, seal_id, call, score } } } — verified once per process. */
function bind() {
  if (cache) return cache; const root = enginesRoot(); const engines = {};
  for (const axis of PINS.axis_order) { const d = verifyRelease(root, axis); const p = PINS.engines[axis]; const mod = require(path.join(d, p.entry)); if (typeof mod.score !== 'function') throw new BindingError('BINDING_VERIFICATION_FAILED', axis + ' entry has no score()');
    engines[axis] = { release_id: p.release_id, seal_id: p.seal_id, release_dir: p.release_dir, call: p.call, score: mod.score }; }
  cache = { root, engines }; return cache;
}
module.exports = { bind, BindingError, PINS };
