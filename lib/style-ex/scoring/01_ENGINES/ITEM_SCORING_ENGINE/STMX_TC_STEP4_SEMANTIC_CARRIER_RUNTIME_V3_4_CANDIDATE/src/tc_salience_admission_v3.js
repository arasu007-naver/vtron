'use strict';
/**
 * STMX TC Step 4 semantic carrier runtime V3 — SALIENCE / STATEMENT ADMISSION (V2.3.42 S-A, implemented exactly — carried unchanged from V1 / V2; reads no Atomic evidence, no prominence, no realization evidence).
 * The Salience gate IS the frozen per-channel Step 2 TRUE / FALSE rule (Step 3 freeze §G6: no second executable Salience layer).
 *   TRUE                → admitted Statement "CHANNEL:rule" with its rule · why · carrier · strong provenance
 *   FALSE               → rejected, rule · why · carrier retained
 *   any other status    → not evaluable, status + rule retained
 *   garment-wide asymmetry departure without a channel owner → ownerless departure retained (no Statement)
 * The frozen Step 3 Statement Set is consumed as the canonical Statement Set; admission must reproduce it exactly or the
 * unit fails closed (MaterializationError). No Salience field, no Salience score, no count is produced.
 */
const { CHANNELS } = require('./tc_semantic_vocabulary_v3');

class MaterializationError extends Error { constructor(m) { super(m); this.name = 'MaterializationError'; } }

function admit(members) {
  const admitted = [];
  const rejected = [];
  const notEvaluable = [];
  const ownerlessDepartures = [];
  for (const m of members) {
    for (const ch of CHANNELS) {
      const c = m[ch];
      if (!c) continue;
      const base = { key: m.archetype_key, channel: ch, rule: c.rule === undefined ? null : c.rule };
      if (c.v === 'TRUE') {
        admitted.push(Object.assign({ statement: ch.toUpperCase() + ':' + c.rule }, base, { why: c.why === undefined ? null : c.why, carrier: c.carrier === undefined ? null : c.carrier, strong: c.strong === true }));
      } else if (c.v === 'FALSE') {
        rejected.push(Object.assign({}, base, { why: c.why === undefined ? null : c.why, carrier: c.carrier === undefined ? null : c.carrier }));
      } else {
        notEvaluable.push(Object.assign({}, base, { status: c.v === undefined ? null : c.v, why: c.why === undefined ? null : c.why }));
      }
    }
    if (m.asymmetry && m.asymmetry.departure_exists === true) {
      ownerlessDepartures.push({ key: m.archetype_key, axis_owner: m.asymmetry.axis_owner === undefined ? null : m.asymmetry.axis_owner, source: m.asymmetry.source === undefined ? null : m.asymmetry.source });
    }
  }
  return { admitted, rejected, not_evaluable: notEvaluable, ownerless_departures: ownerlessDepartures };
}

function verifyMaterialization(salience, frozenStatementSet, anchorId) {
  const admittedSet = new Set(salience.admitted.map((a) => a.statement));
  const frozen = new Set(frozenStatementSet || []);
  const equal = admittedSet.size === frozen.size && [...admittedSet].every((s) => frozen.has(s));
  if (!equal) {
    throw new MaterializationError('STATEMENT_ADMISSION_MISMATCH ' + anchorId + ' admitted=' + JSON.stringify([...admittedSet]) + ' frozen=' + JSON.stringify([...frozen]));
  }
  return true;
}

module.exports = { admit, verifyMaterialization, MaterializationError };
