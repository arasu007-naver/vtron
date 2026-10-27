'use strict';
/**
 * RC4 — Full-Look DM Vision EVIDENCE TRANSPORT V2 (CEO 2026-10-15 scoped successor of the V1 transport requirement).
 * Authority: 04_GOVERNANCE_AND_FINAL_DOCS/CURRENT_CONSTITUTION/STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md (hash-pinned below).
 *
 *   dm_evidence = { transport_contract, look_components (DMP-1), look_detail_systems (DMP-2, OBSERVED-ONLY), dm_evidence_visibility (DMP-3) }
 *     DMP-3 = { state: 'OBSERVED', value: <V1 token> } when derived from the look-level record, else { state: 'UNKNOWN' } (never invented).
 *     look_detail_systems [] = "no qualifying system observed" — NEVER the V1 positive "no designed detail" (that exists only in a V1 record).
 *   dm_transport = { authority: { v1_freeze, v2_transport }, output_fingerprint }   (V1 fingerprint function over the whole record)
 *
 * The frozen adapter (dm_adapter.js) is unchanged. toFrozenV1Block() hands a V2 record to it: with DMP-3 OBSERVED it returns the V1 record
 * (RC3-equal); with DMP-3 UNKNOWN it passes no visibility and the frozen adapter refuses exactly as V1 requires (DM_OUTPUT_SHAPE_ILLEGAL).
 * No DM semantics live here: families, primitives, admission rules and G65 are the V1 ones (dm_projection.checkSystems + dm_adapter).
 */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const C = require('./contracts');
const V1 = require('./dm_adapter');

const TRANSPORT_CONTRACT = 'STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2';
const AUTHORITY_V2 = Object.freeze({
  path: path.join('04_GOVERNANCE_AND_FINAL_DOCS', 'CURRENT_CONSTITUTION', 'STMX_FULL_LOOK_DM_VISION_EVIDENCE_TRANSPORT_V2.md'),
  sha256: '2e6bd0c7391c44254318055f0e04923e6e7ca72f9ccd2e7db375763da86229b2',      // pinned 2026-10-15 (read-only)
});
const EVIDENCE_KEYS = Object.freeze(['transport_contract', 'look_components', 'look_detail_systems', 'dm_evidence_visibility']);
const VISIBILITY_STATES = Object.freeze(['OBSERVED', 'UNKNOWN']);                // frozen Item DM states (V1 §3); NOT_VISIBLE is never a look-level DMP-3 state here

function verifyAuthorities() {
  const v1 = V1.verifyAuthority();
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(C.ROOT, AUTHORITY_V2.path))).digest('hex');
  if (h !== AUTHORITY_V2.sha256) throw new Error('DM_TRANSPORT_V2_AUTHORITY_HASH_MISMATCH: ' + h);
  return { v1_freeze: v1, v2_transport: { path: AUTHORITY_V2.path, sha256: h } };
}
const deepFreeze = (o) => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };

/** Builds the V2 record from ADMITTED inputs (the caller has already applied the frozen admission rules). visibilityValue = mapped V1 token or null. */
function buildEvidence({ look_components, look_detail_systems, visibilityValue }) {
  const authority = verifyAuthorities();
  const record = { transport_contract: TRANSPORT_CONTRACT, look_components: JSON.parse(JSON.stringify(look_components)), look_detail_systems: JSON.parse(JSON.stringify(look_detail_systems)), dm_evidence_visibility: visibilityValue ? { state: 'OBSERVED', value: visibilityValue } : { state: 'UNKNOWN' } };
  const dm_evidence = deepFreeze(record);
  return { dm_evidence, dm_transport: { authority, output_fingerprint: V1.fingerprint(dm_evidence) } };
}

/** V1 compatibility projection through the UNCHANGED frozen adapter. Throws (frozen DM_OUTPUT_SHAPE_ILLEGAL) when DMP-3 is not OBSERVED. */
function toFrozenV1Block(dm_evidence, registry) {
  const v = dm_evidence && dm_evidence.dm_evidence_visibility;
  const block = { look_components: dm_evidence.look_components, look_detail_systems: dm_evidence.look_detail_systems };
  if (v && v.state === 'OBSERVED') block.dm_evidence_visibility = v.value;
  return V1.adaptFrozenDM(JSON.parse(JSON.stringify(block)), registry);
}

module.exports = { TRANSPORT_CONTRACT, AUTHORITY_V2, EVIDENCE_KEYS, VISIBILITY_STATES, verifyAuthorities, buildEvidence, toFrozenV1Block, fingerprint: V1.fingerprint };
