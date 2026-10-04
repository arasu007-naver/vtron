'use strict';
/*
 * Deterministic deep equality (no dependencies) — shared by L1 validator (dual-source conflict)
 * and Shadow observation comparator. Pure function, no side effects, no canonicalization.
 * Rules: primitives by strict === (so 1 !== '1'); arrays order-sensitive; objects key-order-insensitive.
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;          // 1 (number) vs '1' (string) -> false
  if (typeof a !== 'object') return a === b;        // primitives
  var aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) { if (!deepEqual(a[i], b[i])) return false; } // order-sensitive
    return true;
  }
  var ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (var j = 0; j < ak.length; j++) {
    var k = ak[j];
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true; // key order irrelevant
}
module.exports = { deepEqual };
