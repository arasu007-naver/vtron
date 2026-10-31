'use strict';
/**
 * STMX DM V2 — customer output serializer. The ONLY customer-facing shape: { direction: 'D' | 'M', reason: <Korean text> | null }.
 * ⛔ Never serializes a transport error as a product result. ⛔ Never emits a score, DM1–DM9, Strength, ordinal / tier, Neutral, Unresolved,
 *   rule ID, policy flag, CEO-decision code or debug field — the whitelist below is the contract.
 */
const KEYS = ['direction', 'reason'];
const FORBIDDEN_VALUE = /^(N|NEUTRAL|UNKNOWN|UNRESOLVED|NOT_SCORABLE|EVIDENCE_REPAIR_REQUIRED)$/;
function toCustomerOutput(result) {
  if (!result || result.ok !== true) throw new Error('DM V2 SERIALIZER: a transport error is not a product result and has no customer Direction');
  const c = result.customer || {};
  if (!['D', 'M'].includes(c.direction) || FORBIDDEN_VALUE.test(String(c.direction))) throw new Error('DM V2 SERIALIZER: customer Direction must be D or M');
  if (c.reason !== null && typeof c.reason !== 'string') throw new Error('DM V2 SERIALIZER: reason must be text or null (withheld)');
  const extra = Object.keys(c).filter((k) => !KEYS.includes(k)); if (extra.length) throw new Error('DM V2 SERIALIZER: forbidden customer field(s) ' + extra.join(', '));
  return { direction: c.direction, reason: c.reason };
}
module.exports = { toCustomerOutput, KEYS };
