'use strict';
/* STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V2_CANDIDATE · SUPERSESSION REGISTRY LOADER V1 — CANDIDATE · SHADOW · NOT FROZEN (V2.3.68, CEO D-67 A).
 * A successor observation is selected ONLY for an explicitly listed member × field of a validated entry. Never by timestamp, version number,
 * confidence or GT fit. Every entry is validated at load (fail closed, RegistryError):
 *   delta_class must be O1 · semantic_contract_delta must be 0 · no predicate / rule / semantic override key · field inside the verified
 *   re-execution map · successor record hash = entry = blind seal listing · protocol hash = seal listing = record · batch hash listed in the seal
 *   (the blind batch bytes are never opened) · every listed member present in the successor record with its history preserved. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
class RegistryError extends Error {}
const FORBIDDEN_ENTRY_KEYS = Object.freeze(['predicate', 'predicates', 'rule_override', 'semantic_override', 'semantics_override', 'value_map', 'reinterpretation', 'threshold', 'weight', 'score', 'tier', 'expected_result']);
const REQUIRED = Object.freeze(['entry_id', 'field', 'delta_class', 'semantic_contract_delta', 'applicable_key_domain', 'member_domain', 'predecessor_observation_version', 'successor_observation_version', 'authority_source', 'blind_protocol_seal', 'binding_decision', 'history_preservation_rule', 'conditions']);
function scanKeys(o, at, hit) { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (FORBIDDEN_ENTRY_KEYS.includes(k)) hit.push(at + k); scanKeys(v, at + k + '.', hit); } }
function validate(root, R, reexecutionMap) {
  if (!R || !Array.isArray(R.entries)) throw new RegistryError('registry has no entries array');
  const index = new Map();
  for (const e of R.entries) {
    for (const k of REQUIRED) if (e[k] === undefined) throw new RegistryError('entry ' + e.entry_id + ': missing ' + k);
    const hit = []; scanKeys(e, '', hit); if (hit.length) throw new RegistryError('entry ' + e.entry_id + ': semantic override key refused (' + hit.join(', ') + ')');
    if (e.delta_class !== 'O1') throw new RegistryError('entry ' + e.entry_id + ': delta_class ' + e.delta_class + ' refused — only O1 observation corrections are executable (O3 never; O2 is decided per value)');
    if (e.semantic_contract_delta !== 0) throw new RegistryError('entry ' + e.entry_id + ': semantic_contract_delta must be 0');
    if (!Array.isArray(reexecutionMap[e.field])) throw new RegistryError('entry ' + e.entry_id + ': field ' + e.field + ' outside the verified re-execution map');
    if (!Array.isArray(e.applicable_key_domain) || !e.applicable_key_domain.length || !Array.isArray(e.member_domain) || !e.member_domain.length) throw new RegistryError('entry ' + e.entry_id + ': explicit key and member domains required');
    const sv = e.successor_observation_version, bs = e.blind_protocol_seal;
    const sbuf = fs.readFileSync(path.join(root, sv.file)); if (sha(sbuf) !== sv.sha256) throw new RegistryError('entry ' + e.entry_id + ': successor record hash ≠ entry');
    const seb = fs.readFileSync(path.join(root, bs.seal_file)); if (sha(seb) !== bs.seal_sha256) throw new RegistryError('entry ' + e.entry_id + ': blind seal hash ≠ entry'); const SEAL = JSON.parse(seb.toString('utf8'));
    const listed = (f) => (SEAL.files.find((x) => x.file === f) || {}).sha256;
    if (listed(sv.file) !== sv.sha256) throw new RegistryError('entry ' + e.entry_id + ': successor record not listed in the blind seal');
    if (sha(fs.readFileSync(path.join(root, bs.protocol_file))) !== bs.protocol_sha256 || listed(bs.protocol_file) !== bs.protocol_sha256) throw new RegistryError('entry ' + e.entry_id + ': protocol ≠ blind seal');
    if (!SEAL.files.some((x) => x.sha256 === bs.batch_sha256)) throw new RegistryError('entry ' + e.entry_id + ': batch hash not listed in the blind seal');
    const T = JSON.parse(sbuf.toString('utf8')); if (T.protocol_sha256 !== bs.protocol_sha256 || T.batch_sha256 !== bs.batch_sha256) throw new RegistryError('entry ' + e.entry_id + ': successor record ≠ seal protocol / batch');
    const rec = new Map((T.members || []).map((m) => [m.anchor_id + '|' + m.garment_ref, m]));
    for (const mk of e.member_domain) { const m = rec.get(mk);
      if (!m) throw new RegistryError('entry ' + e.entry_id + ': member ' + mk + ' absent from the successor record');
      if (!m.history || m.history.raw_prior_governed_extraction === undefined) throw new RegistryError('entry ' + e.entry_id + ': member ' + mk + ' history not preserved');
      if (!m[e.field] || typeof m[e.field].state !== 'string') throw new RegistryError('entry ' + e.entry_id + ': member ' + mk + ' has no ' + e.field + ' observation');
      const k = mk + '|' + e.field; if (index.has(k)) throw new RegistryError('member × field ' + k + ' claimed by two entries');
      index.set(k, { entry_id: e.entry_id, keys: e.applicable_key_domain.slice(), token: clone(m[e.field]), history: clone(m.history), source_sha256: m.source_sha256 || null }); }
  }
  return Object.freeze({ document: R.document || null, entries: R.entries.map((e) => e.entry_id), size: index.size,
    selectionsFor(anchor, ref, key) { const out = []; for (const [k, v] of index) { const p = k.split('|'); if (p[0] === anchor && p[1] === ref && v.keys.includes(key)) out.push({ field: p[2], entry_id: v.entry_id, token: clone(v.token), history: clone(v.history), source_sha256: v.source_sha256 }); } return out; } });
}
function load(root, relPath, expectedSha256, reexecutionMap) { const buf = fs.readFileSync(path.join(root, relPath)); if (sha(buf) !== expectedSha256) throw new RegistryError('registry hash ≠ bound input'); return validate(root, JSON.parse(buf.toString('utf8')), reexecutionMap); }
module.exports = { load, validate, RegistryError, FORBIDDEN_ENTRY_KEYS, REQUIRED };
