'use strict';
/*
 * Shadow — Result Collector (Sprint 1 skeleton).
 * Aggregates comparator outcomes into a deterministic summary. No side effects.
 */

function collect(comparisons) {
  const summary = { total: 0, MATCH: 0, MISMATCH: 0, NOT_COMPARABLE: 0, RUNTIME_ERROR: 0, items: [] };
  (comparisons || []).forEach(function (c) {
    summary.total += 1;
    if (Object.prototype.hasOwnProperty.call(summary, c.status)) summary[c.status] += 1;
    summary.items.push(c);
  });
  return Object.freeze(summary);
}

module.exports = { collect };
