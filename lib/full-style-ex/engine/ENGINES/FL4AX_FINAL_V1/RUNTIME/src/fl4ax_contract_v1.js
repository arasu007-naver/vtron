'use strict';
/**
 * STMX Full-Look Four-Axis — per-axis output contract validation + Direction normalization. Reads ONLY the engine's own record; never changes a Direction.
 * Each frozen engine returns one of: a resolved binary Direction · a governed input failure (not a style result) · anything else = CONTRACT_VIOLATION.
 */
const SPEC = Object.freeze({
  EI: { axisField: 'EI', ok: (r) => r.status === 'RESOLVED', dir: { EXPRESSIVE: 'E', INTROVERT: 'I' }, fail: (r) => r.status === 'TECHNICAL_EXCEPTION' && r.direction === null, failInfo: (r) => ({ code: (r.exception || {}).code || null, class: (r.exception || {}).class || null }) },
  TC: { axisField: 'TC', ok: (r) => r.status === 'RESOLVED', dir: { TRANSFORMATIVE: 'T', CLASSIC: 'C' }, fail: (r) => r.status === 'TECHNICAL_EXCEPTION' && r.direction === null, failInfo: (r) => ({ code: (r.exception || {}).code || null, class: (r.exception || {}).class || null }) },
  SR: { axisField: 'SR', ok: (r) => r.status === 'RESOLVED', dir: { STRUCTURED: 'S', RELAXED: 'R' }, fail: (r) => r.status === 'TECHNICAL_EXCEPTION' && r.direction === null, failInfo: (r) => ({ code: (r.exception || {}).code || null, class: (r.exception || {}).class || null }) },
  DM: { axisField: null, ok: (r) => r.status === 'SCORED', dir: { D: 'D', M: 'M' }, fail: (r) => r.status === 'INPUT_FAILURE' && r.direction === null, failInfo: (r) => ({ code: r.input_failure || null, class: 'INPUT_FAILURE' }) } });
const LABEL = Object.freeze({ E: 'Expressive', I: 'Introvert', T: 'Transformative', C: 'Classic', S: 'Structured', R: 'Relaxed', D: 'Detail', M: 'Minimal' });
/** normalize(axis, record) → { kind: 'DIRECTION', letter, label, rule } | { kind: 'INPUT_FAILURE', code, class } | { kind: 'CONTRACT_VIOLATION', detail } */
function normalize(axis, r) {
  const s = SPEC[axis]; if (!s) return { kind: 'CONTRACT_VIOLATION', detail: 'unknown axis ' + axis };
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { kind: 'CONTRACT_VIOLATION', detail: axis + ' engine returned no record' };
  if (s.axisField && r.axis !== s.axisField) return { kind: 'CONTRACT_VIOLATION', detail: axis + ' record axis = ' + JSON.stringify(r.axis) };
  if (s.ok(r)) { const letter = s.dir[r.direction]; if (!letter) return { kind: 'CONTRACT_VIOLATION', detail: axis + ' resolved with a non-binary direction ' + JSON.stringify(r.direction) }; return { kind: 'DIRECTION', letter, label: LABEL[letter], rule: axis === 'DM' ? (r.rule_trace || []).filter((x) => x !== 'DM3-MS1').join('+') : r.rule || null }; }
  if (s.fail(r)) return Object.assign({ kind: 'INPUT_FAILURE' }, s.failInfo(r));
  return { kind: 'CONTRACT_VIOLATION', detail: axis + ' status ' + JSON.stringify(r.status) + ' / direction ' + JSON.stringify(r.direction) + ' outside the frozen output contract' };
}
module.exports = { normalize, LABEL, SPEC };
