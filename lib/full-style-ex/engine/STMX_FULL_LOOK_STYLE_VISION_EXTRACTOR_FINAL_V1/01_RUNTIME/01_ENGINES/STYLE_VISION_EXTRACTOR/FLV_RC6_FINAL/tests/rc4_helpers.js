'use strict';
/**
 * RC4 test helpers — DM Evidence Transport V2 (CEO 2026-10-15). Version-scoped views used by inherited tests whose expectation was written
 * for the V1 / RC1–RC3 DM interface (every such test line carries an "RC4 (Transport V2)" note):
 *   ev(p)  the V2 record (packet.dm_evidence) or null
 *   tok(p) the V2 DMP-3 as text: the V1 token when OBSERVED · 'UNKNOWN' when not established · 'NO_BLOCK' when no record was delivered
 *   v1(p)  the V1 frozen record obtained through the UNCHANGED frozen adapter (dm_transport_v2.toFrozenV1Block) — only when DMP-3 is OBSERVED,
 *          else null (the frozen adapter refuses a record without DMP-3). Lets a V1-era assertion keep testing V1 semantics.
 *   noDM(p) the packet without its DM record / provenance (for scans that exclude DM vocabulary, as RC1–RC3 excluded dm_subsystem)
 */
const X = require('../src');
const ev = (p) => p.dm_evidence || null;
const tok = (p) => p.dm_evidence ? (p.dm_evidence.dm_evidence_visibility.state === 'OBSERVED' ? p.dm_evidence.dm_evidence_visibility.value : 'UNKNOWN') : 'NO_BLOCK';
const v1 = (p) => (p.dm_evidence && p.dm_evidence.dm_evidence_visibility.state === 'OBSERVED') ? X.dm_transport.toFrozenV1Block(p.dm_evidence, p.component_registry).dm_subsystem : null;
const noDM = (p) => { const q = { ...p }; delete q.dm_evidence; delete q.dm_transport; return q; };
module.exports = { ev, tok, v1, noDM };
