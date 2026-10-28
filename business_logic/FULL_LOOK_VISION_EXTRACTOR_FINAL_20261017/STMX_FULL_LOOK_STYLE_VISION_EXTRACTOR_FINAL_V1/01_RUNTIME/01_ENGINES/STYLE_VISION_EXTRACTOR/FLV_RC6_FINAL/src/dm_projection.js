'use strict';
/**
 * INTEGRATED V1 — frozen-DM output ASSEMBLY (A1). No image reading, no DM component detection, no DM-only parameter.
 *
 *   DMP-2 look_detail_systems   taken from the shared observation (the model records the systems in the same pass, on the appearance /
 *                               relation facts it already observed — prompt §9); validated with the frozen rules (family · carriers ⊆
 *                               registry · primitives · relational form); exact duplicates of one phenomenon are rejected (§11 firewall).
 *   DMP-1 look_components       ASSEMBLED = ∪ look_detail_systems[].carrier_refs (first-appearance order) + registry lineage. The frozen
 *                               adapter's A-1 / A-2 hold by construction. A model-emitted list is dropped and only compared (diagnostic).
 *   DMP-3 dm_evidence_visibility MAPPED from the look-level common record (G1 SVP-001) ONLY where deterministic (RC2 — see mapVisibility):
 *                               every token of one frozen class → that class; `occlusion` (both classes), mixed classes or NO token →
 *                               MAPPING_UNRESOLVED (AVG-1 · precedence NOT_VERIFIED · AVG-4). adjudicable is never emitted from absence.
 *                               A model-emitted value is dropped and only compared.
 *   RESULT (RC4 · DM Evidence Transport V2, CEO 2026-10-15)  the admitted DMP-1 / DMP-2 are ALWAYS delivered in packet.dm_evidence
 *                               (dm_transport_v2.js); DMP-3 travels beside them as { state: OBSERVED, value } when mapped, else { state: UNKNOWN }.
 *                               DMP-3 is no longer a delivery gate. (RC1–RC3: unresolved DMP-3 withheld the block — superseded transport rule.)
 *   G65                         no number, no count key, no score / verdict word inside the block (checked here before anything else).
 */
const C = require('./contracts');
const I = require('./integrated');
const R = require('./registry');
const T2 = require('./dm_transport_v2');                                  // RC4: V2 transport record (the frozen adapter is reached through T2.toFrozenV1Block for V1 compatibility)

const FAMILIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SIZE = ['small', 'medium', 'large'], CONTR = ['low', 'medium', 'high'], POS = ['localized', 'distributed', 'whole_look'];
const COUNT_KEY_RE = /(count|number|total|coverage|distribution|density|proxy|score|weight|ratio|percent)/i;

function checkSystems(lds, registry) {
  if (!Array.isArray(lds)) throw new Error('DM_SYSTEMS_SHAPE (look_detail_systems must be an array; [] = positive no-detail record)');
  const seen = new Set(); const carriers = [];
  for (const s of lds) {
    if (!s || typeof s !== 'object') throw new Error('DM_SYSTEM_SHAPE');
    for (const k of Object.keys(s)) if (COUNT_KEY_RE.test(k)) throw new Error('DM_G65_COUNT_OR_SCORE_KEY: ' + k);
    if (!FAMILIES.includes(s.look_detail_family)) throw new Error('DM_FAMILY_ILLEGAL: ' + s.look_detail_family);
    if (!Array.isArray(s.carrier_refs) || !s.carrier_refs.length) throw new Error('DM_SYSTEM_WITHOUT_CARRIER');
    for (const r of s.carrier_refs) { if (!R.has(registry, r)) throw new Error('DM_SYSTEM_CARRIER_NOT_IN_REGISTRY: ' + r); if (!carriers.includes(r)) carriers.push(r); }
    if (s.relational_form !== undefined && (s.look_detail_family !== 'H' || !['accent', 'composition'].includes(s.relational_form))) throw new Error('DM_RELATIONAL_FORM_ILLEGAL');
    for (const [k, dom] of [['size_in_look', SIZE], ['contrast_in_look', CONTR], ['position_in_look', POS]]) { const x = s[k]; if (!x || !['OBSERVED', 'NOT_VISIBLE', 'UNKNOWN'].includes(x.state)) throw new Error('DM_STATE_ILLEGAL: ' + k); if (x.state === 'OBSERVED' && !dom.includes(x.value)) throw new Error('DM_VALUE_ILLEGAL: ' + k + '=' + x.value); if (x.state !== 'OBSERVED' && x.value !== undefined && x.value !== null) throw new Error('DM_NON_OBSERVED_VALUE: ' + k); }
    if (!['yes', 'no'].includes(s.repeated_units)) throw new Error('DM_REPEATED_UNITS_ILLEGAL');
    const key = JSON.stringify({ c: s.carrier_refs.slice().sort(), f: s.look_detail_family, r: s.relational_form || null, s: s.size_in_look, k: s.contrast_in_look, p: s.position_in_look, u: s.repeated_units });
    if (seen.has(key)) throw new Error('DM_DUPLICATE_PHENOMENON (one visual phenomenon = one system; an identical system repeated): ' + s.carrier_refs.join('+') + '/' + s.look_detail_family);
    seen.add(key);
  }
  if (/\d/.test(JSON.stringify(lds).replace(/"c\d+"|"u:c\d+"|"x\d+"/g, ''))) throw new Error('DM_G65_NUMERIC_VALUE (no number inside the DM block)');
  return carriers;
}

/**
 * RC2 (CEO 2026-10-15 "Observable Evidence First") — DMP-3 is derived from the LOOK-LEVEL common record only: the G1 look_observability
 * reading (SVP-001 state + limits). Crosswalk V2.1 names SVP-001 (+ SVP-002) as DM's common inputs; SVP-121…126 (appearance facts) have
 * EI / TC / SR consumers only, and frozen DM §10 keeps an unresolvable VALUE at the value level ("Unresolvable values are NOT_VISIBLE /
 * UNKNOWN. Unadjudicable looks are recorded in dm_evidence_visibility"). RC1's readability rule (every appearance value of every participant
 * had to be resolved) made a peripheral value — a watch dial, a bracelet surface — decide the look-level token: removed (implementation
 * overreach; the function survives only as a NON-CANONICAL proof in src/candidate_proofs/dmp3_d1_proof.js).
 *   exactly ONE not_adjudicable-class reason (crop · image_failure · not_a_worn_look)     → not_adjudicable:{…}            deterministic
 *   SEVERAL not_adjudicable reasons (two of them, or one of them + occlusion)            → unresolved (RC3): the frozen adapter's grammar admits
 *       exactly one not_adjudicable reason (dm_adapter.js VISIBILITY_RE) and the freeze text gives no precedence; RC2 emitted a multi-reason
 *       token, the adapter refused it, and the whole DM block of the look was lost (11 of the 64 frame-limit sets). RC3: unresolved, systems kept · RC4: DMP-3 UNKNOWN, systems delivered.
 *   partially_observable-class tokens (feet_not_visible · lower_body_cropped) only       → partially_observable:{…}       deterministic
 *   tokens of both classes                                                               → unresolved (no precedence rule in the freeze text)
 *   occlusion without a not_adjudicable token                                            → unresolved AVG-1 (occlusion is in both frozen classes)
 *   OBSERVED record with NO token                                                        → unresolved D-1: the frozen enum offers adjudicable and
 *       partially_observable:{small_detail_unresolvable}; the G1 limit vocabulary cannot record small_detail_unresolvable, so the record
 *       cannot tell them apart. Never defaulted. RC4 (Transport V2): DMP-3 stays UNKNOWN and is no longer a delivery gate.
 *   frame not OBSERVED / token without a frozen class                                    → unresolved
 * "unresolved" = value null here = dm_evidence_visibility { state: UNKNOWN } in the V2 record (dm_transport_v2.js).
 */
function mapVisibility(frame) {
  const diag = []; const tokens = (frame && frame.limits) || [];
  if (!frame || frame.state !== 'OBSERVED') { diag.push({ code: 'FRAME_NOT_OBSERVED', detail: 'frame state ' + (frame && frame.state) + ' — no positive G1 record; unresolved' }); return { value: null, diagnostics: diag }; }
  const na = [], po = []; let occ = false;
  for (const t of tokens) {
    const cls = I.DM_VISIBILITY_TOKEN_CLASS[t];
    if (!cls) { diag.push({ code: 'MAPPING_UNRESOLVED', gap: 'IX-2', detail: 'frame token without a frozen DM class: ' + t }); return { value: null, diagnostics: diag }; }
    if (cls === 'AMBIGUOUS') occ = true; else if (cls === 'not_adjudicable') na.push(t); else po.push(t);
  }
  const ordered = (cls, set) => I.DM_REASON_ORDER[cls].filter((r) => set.includes(r));
  if (na.length && po.length) { diag.push({ code: 'MAPPING_UNRESOLVED', gap: 'CLASS_PRECEDENCE_NOT_VERIFIED', detail: 'tokens of both frozen classes present (' + tokens.join(' · ') + '); no precedence rule in the freeze text — not claimed' }); return { value: null, diagnostics: diag }; }
  if (na.length) { const reasons = ordered('not_adjudicable', [...na, ...(occ ? ['occlusion'] : [])]);
    if (reasons.length > 1) { diag.push({ code: 'MAPPING_UNRESOLVED', gap: 'REASON_PRECEDENCE_NOT_VERIFIED', detail: 'several not_adjudicable reasons (' + reasons.join(' · ') + '); the frozen adapter admits exactly one not_adjudicable reason and the freeze text gives no precedence among them — not chosen' }); return { value: null, diagnostics: diag }; }   // RC3: a multi-reason token was refused by the frozen adapter and the whole DM block was lost
    const value = 'not_adjudicable:{' + reasons[0] + '}'; diag.push({ code: 'MAPPED_DETERMINISTIC', basis: 'G1 not_adjudicable-class tokens', detail: tokens.join(' · ') + ' → ' + value }); return { value, diagnostics: diag }; }
  if (occ) { diag.push({ code: 'MAPPING_UNRESOLVED', gap: 'AVG-1', detail: I.DM_VISIBILITY_GAPS.AVG_1 }); return { value: null, diagnostics: diag }; }
  if (po.length) { const value = 'partially_observable:{' + ordered('partially_observable', po).join('|') + '}'; diag.push({ code: 'MAPPED_DETERMINISTIC', basis: 'G1 partially_observable-class tokens (class established by the recorded limit; value-level unknowns stay value-level, frozen §10)', detail: tokens.join(' · ') + ' → ' + value }); return { value, diagnostics: diag }; }
  diag.push({ code: 'MAPPING_UNRESOLVED', gap: 'D-1', detail: I.DM_VISIBILITY_GAPS.D_1 });
  return { value: null, diagnostics: diag };
}

function projectDMEvidence({ dmInput, registry, frame }) {
  const diagnostics = [];
  if (!dmInput) return { dm_evidence: null, dm_transport: null, dm_acquisition: null, diagnostics };
  if (typeof dmInput !== 'object' || Array.isArray(dmInput)) throw new Error('DM_INPUT_SHAPE');
  for (const k of Object.keys(dmInput)) if (!['look_components', 'look_detail_systems', 'dm_evidence_visibility'].includes(k)) throw new Error('DM_OUTPUT_UNEXPECTED_KEY: ' + k);
  if (dmInput.look_detail_systems === undefined) throw new Error('DM_SYSTEMS_MISSING (look_detail_systems is the only DM field the shared observation records)');
  const carriers = checkSystems(dmInput.look_detail_systems, registry);                     // frozen admission rules (+ G65 / duplicate) — an inadmissible system refuses the block (V1 atomicity)
  // DMP-1 assembled (no detection); a model-emitted list is compared, never used
  const look_components = carriers.map((r) => { const e = R.byRef(registry, r); return e.item_record_ref ? { component_ref: r, item_record_ref: e.item_record_ref } : { component_ref: r }; });
  if (dmInput.look_components !== undefined) { const emitted = Array.isArray(dmInput.look_components) ? dmInput.look_components.map((c) => c && c.component_ref).filter(Boolean).sort() : null; const same = emitted && emitted.join(',') === carriers.slice().sort().join(','); diagnostics.push({ code: 'LOOK_COMPONENTS_EMITTED_DROPPED', detail: 'DMP-1 is assembled from carrier_refs (A1); the emitted list was ' + (same ? 'identical' : 'different: ' + JSON.stringify(dmInput.look_components)) }); }
  // DMP-3 mapped from the look-level common record (INT-02) — metadata, not a gate (Transport V2 §4)
  const vis = mapVisibility(frame); diagnostics.push(...vis.diagnostics.map((d) => ({ ...d, where: 'dm_evidence_visibility' })));
  if (dmInput.dm_evidence_visibility !== undefined) diagnostics.push({ code: 'DM_VISIBILITY_EMITTED_DROPPED', detail: 'a DM-only visibility judgement is not read (INT-02); emitted value kept for comparison only: ' + JSON.stringify(dmInput.dm_evidence_visibility) + (vis.value ? (vis.value === dmInput.dm_evidence_visibility ? ' (equal to the mapped value)' : ' (differs from the mapped value ' + vis.value + ')') : ' (DMP-3 not established: UNKNOWN)') });
  const t = T2.buildEvidence({ look_components, look_detail_systems: dmInput.look_detail_systems, visibilityValue: vis.value });
  return { dm_evidence: t.dm_evidence, dm_transport: t.dm_transport, dm_acquisition: null, diagnostics };
}

module.exports = { projectDMEvidence, mapVisibility, checkSystems };
