'use strict';
/**
 * G-3 frozen Full-Look DM Vision adapter (FROZEN_ADAPTER). DM is NOT reimplemented.
 *   · the frozen authority document is pinned by SHA-256 and read at load (read-only); a mismatch fails the adapter;
 *   · the DM output (look_components · look_detail_systems · dm_evidence_visibility) is carried VERBATIM and deep-frozen;
 *   · adapters: A-1 shared component_ref id space (carriers ⊆ registry) · A-2 item_record_ref lineage check · A-3 the frame
 *     supplies facts only, DM's verdict stays DM's. DM never reads G-1 (Colour V1 not used by frozen DM). EI never reads this block.
 */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const C = require('./contracts');
const R = require('./registry');

const AUTHORITY = Object.freeze({
  path: path.join('04_GOVERNANCE_AND_FINAL_DOCS', 'CURRENT_CONSTITUTION', 'STMX_FULL_LOOK_DM_VISION_EXTRACTION_FINAL_FREEZE_V1.md'),
  sha256: '49e513ea1c2ad036cc7ca15ae5014eceff601e60c0578e2064909f57fa6c6763',      // pinned 2026-10-06 (read-only)
});
const FAMILIES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
const VISIBILITY_RE = /^(adjudicable|partially_observable:\{(feet_not_visible|lower_body_cropped|small_detail_unresolvable|occlusion)(\|(feet_not_visible|lower_body_cropped|small_detail_unresolvable|occlusion))*\}|not_adjudicable:\{(crop|occlusion|image_failure|not_a_worn_look)\})$/;
const SIZE = ['small', 'medium', 'large'], CONTR = ['low', 'medium', 'high'], POS = ['localized', 'distributed', 'whole_look'];

function verifyAuthority() {
  const p = path.join(C.ROOT, AUTHORITY.path);
  const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  if (h !== AUTHORITY.sha256) throw new Error('DM_AUTHORITY_HASH_MISMATCH: ' + h);
  return { path: AUTHORITY.path, sha256: h };
}
const deepFreeze = (o) => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
const fingerprint = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');

function adaptFrozenDM(dm, registry) {
  const authority = verifyAuthority();
  if (!dm) return { dm_subsystem: null, dm_adapter: { authority, output_fingerprint: null } };
  const lc = dm.look_components, lds = dm.look_detail_systems, vis = dm.dm_evidence_visibility;
  if (!Array.isArray(lc) || !Array.isArray(lds) || typeof vis !== 'string') throw new Error('DM_OUTPUT_SHAPE_ILLEGAL');
  for (const k of Object.keys(dm)) if (!['look_components', 'look_detail_systems', 'dm_evidence_visibility'].includes(k)) throw new Error('DM_OUTPUT_UNEXPECTED_KEY (no duplicate / extra DM field): ' + k);
  if (!VISIBILITY_RE.test(vis)) throw new Error('DM_VISIBILITY_TOKEN_ILLEGAL: ' + vis);
  const carrierRefs = new Set();
  for (const c of lc) {
    if (!R.has(registry, c.component_ref)) throw new Error('DM_CARRIER_NOT_IN_REGISTRY: ' + c.component_ref);     // A-1
    const e = R.byRef(registry, c.component_ref);
    if (c.item_record_ref && e.item_record_ref && c.item_record_ref !== e.item_record_ref) throw new Error('DM_LINEAGE_MISMATCH: ' + c.component_ref);   // A-2
    carrierRefs.add(c.component_ref);
  }
  for (const s of lds) {
    if (!FAMILIES.includes(s.look_detail_family)) throw new Error('DM_FAMILY_ILLEGAL: ' + s.look_detail_family);
    if (!Array.isArray(s.carrier_refs) || !s.carrier_refs.length || s.carrier_refs.some((r) => !carrierRefs.has(r))) throw new Error('DM_SYSTEM_CARRIER_NOT_IN_LOOK_COMPONENTS');
    if (s.relational_form !== undefined && (s.look_detail_family !== 'H' || !['accent', 'composition'].includes(s.relational_form))) throw new Error('DM_RELATIONAL_FORM_ILLEGAL');
    chk(s.size_in_look, SIZE); chk(s.contrast_in_look, CONTR); chk(s.position_in_look, POS);
    if (!['yes', 'no'].includes(s.repeated_units)) throw new Error('DM_REPEATED_UNITS_ILLEGAL');
  }
  const copy = deepFreeze(JSON.parse(JSON.stringify(dm)));                           // verbatim, immutable
  return { dm_subsystem: copy, dm_adapter: { authority, output_fingerprint: fingerprint(copy) } };
}
function chk(x, dom) { if (!x || !['OBSERVED', 'NOT_VISIBLE', 'UNKNOWN'].includes(x.state)) throw new Error('DM_STATE_ILLEGAL'); if (x.state === 'OBSERVED' && !dom.includes(x.value)) throw new Error('DM_VALUE_ILLEGAL: ' + x.value); }

module.exports = { adaptFrozenDM, verifyAuthority, AUTHORITY, fingerprint };
