'use strict';
/**
 * STMX TC V2 — customer output serializer. The ONLY customer-facing shape: { direction: 'CLASSIC' | 'TRANSFORMATIVE', reason: <Korean text> | null }.
 * ⛔ Never serializes a contract error as a product result. ⛔ Never emits TC1–TC9, a score, Strength, ordinal, Neutral, UNRESOLVED, rule / path id, policy flag,
 *   REF id, GT label or debug field — the whitelist below is the contract.
 */
const KEYS = ['direction', 'reason'];
const DIRECTIONS = ['CLASSIC', 'TRANSFORMATIVE'];
function toCustomerOutput(result) {
  if (!result || result.ok !== true) throw new Error('TC V2 SERIALIZER: a contract error is not a product result and has no customer Direction');
  const c = result.customer || {};
  if (!DIRECTIONS.includes(c.direction)) throw new Error('TC V2 SERIALIZER: customer Direction must be CLASSIC or TRANSFORMATIVE');
  if (c.reason !== null && typeof c.reason !== 'string') throw new Error('TC V2 SERIALIZER: reason must be text or null (withheld)');
  const extra = Object.keys(c).filter((k) => !KEYS.includes(k)); if (extra.length) throw new Error('TC V2 SERIALIZER: forbidden customer field(s) ' + extra.join(', '));
  return { direction: c.direction, reason: c.reason };
}
module.exports = { toCustomerOutput, KEYS, DIRECTIONS };
