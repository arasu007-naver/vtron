'use strict';
/** Common fact envelope (G-2 / K-4 shared mechanism). One shape for every evidence value in the packet. */
const C = require('./contracts');

/**
 * @param {object} f
 * @param {string} f.state        OBSERVED · ABSENT · NOT_VISIBLE · UNKNOWN
 * @param {*}      [f.value]      present only when state = OBSERVED
 * @param {string[]} [f.limitation] Item V1_3 limitation tokens
 * @param {string} [f.route]      derived | observed
 * @param {string} [f.source]     fixture | item_record
 * @param {string} [f.component_ref]
 * @param {object} [f.lineage]    { item_record_ref } — lineage only, never evidence
 */
function fact(f) {
  if (!C.STATES.includes(f.state)) throw new Error('ENVELOPE_STATE_ILLEGAL: ' + f.state);
  if (f.state === C.NOT_APPLICABLE) throw new Error('ENVELOPE_NOT_APPLICABLE_NEVER_STORED');
  const out = { state: f.state };
  if (f.state === 'OBSERVED') { if (f.value === undefined || f.value === null) throw new Error('ENVELOPE_OBSERVED_WITHOUT_VALUE'); out.value = f.value; }
  else if (f.value !== undefined && f.value !== null) throw new Error('ENVELOPE_VALUE_ON_NON_OBSERVED: ' + f.state);
  const lim = f.limitation || [];
  if (lim.some((l) => !C.LIMITATIONS.includes(l))) throw new Error('ENVELOPE_LIMITATION_ILLEGAL: ' + lim.join(','));
  if (lim.length) out.limitation = lim.slice();
  const route = f.route || 'observed';
  if (!C.ROUTES.includes(route)) throw new Error('ENVELOPE_ROUTE_ILLEGAL: ' + route);
  out.route = route;
  if (f.source !== undefined) { if (!C.SOURCES.includes(f.source)) throw new Error('ENVELOPE_SOURCE_ILLEGAL: ' + f.source); out.source = f.source; }
  if (f.component_ref !== undefined) out.component_ref = f.component_ref;
  if (f.lineage !== undefined) { if (typeof f.lineage !== 'object' || Object.keys(f.lineage).some((k) => k !== 'item_record_ref')) throw new Error('ENVELOPE_LINEAGE_ILLEGAL'); out.lineage = { item_record_ref: f.lineage.item_record_ref }; }
  // INTEGRATED V1 (CA#29): the pocket fact may carry its instance array. It is child metadata ON the pocket observation (not a parameter);
  // legal only when the pocket is OBSERVED Present. Shape validated by integrated_pocket.checkInstances (frozen producer shape).
  if (f.pockets !== undefined) { if (!(out.state === 'OBSERVED' && out.value === 'Present')) throw new Error('ENVELOPE_POCKETS_REQUIRE_PRESENT (CA#29: pockets[] only under pocket OBSERVED Present)'); out.pockets = require('./integrated_pocket').checkInstances(f.pockets, 'envelope'); }
  return out;
}

/** Validate an envelope-shaped object and, optionally, that an OBSERVED value lies in a domain. */
function check(e, domain, where) {
  const w = where || 'fact';
  if (!e || typeof e !== 'object') throw new Error(w + ': not an envelope');
  fact(e);                                                                           // re-run the structural checks
  if (domain && e.state === 'OBSERVED' && !domain.includes(e.value)) throw new Error(w + ': value outside domain: ' + e.value);
  return true;
}

module.exports = { fact, check };
