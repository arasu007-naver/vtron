'use strict';
/**
 * STMX SR V2 — PRODUCT-LEVEL EVIDENCE (read-only over the frozen adapter + admission)
 *
 * One product = one evidence object made of REGIONS: a one-piece (Dress / Jumpsuit) is read twice through the frozen adapter
 * (UPPER then LOWER, byRegion), a bottom once (LOWER), everything else once (UPPER). Each region carries the frozen governed
 * classes. Nothing here interprets a raw token; that is the frozen admission's job.
 *
 * SR-V2-X0 — the frozen contradictory pair (shoulder_structure Extreme + shoulder_drop Dropped, SCORE_PHYSICS_FROZEN §6) is
 * set aside on BOTH sides: neither carrier is read, the product is decided on its remaining evidence (never an unresolved result).
 */
const B = require('./sr_v2_binding');
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
class SRV2TransportError extends Error { constructor(code, msg) { super(code + ': ' + msg); this.name = 'SRV2TransportError'; this.code = code; } }
/** the received packet must be a governed Item Vision target record { category, observations } of an SR-governed category */
function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new SRV2TransportError('SR_INPUT_NOT_A_RECORD', 'a Producer V1_3 target record { category, observations } is required');
  if (!record.observations || typeof record.observations !== 'object') throw new SRV2TransportError('SR_INPUT_OBSERVATIONS_MISSING', 'observations block missing — transport defect, not a product');
  const cat = B.adapter.categoryOf(record); const reg = B.adapter.region(cat);
  if (!reg) throw new SRV2TransportError('SR_INPUT_CATEGORY_NOT_GOVERNED', 'category ' + JSON.stringify(cat) + ' is not an SR-governed product category');
  return { category: cat, region: reg };
}
function fix(e) { if (e.contradictions.length) { e.governance = e.governance.filter((t) => t !== 'SHOULDER_EXTREME'); e.release_support = e.release_support.filter((t) => t !== 'SHOULDER_DROPPED'); e.x0 = true; } return e; }
/* R3 (CEO R3 order 2026-10-27 §4.B / §4.C · V2 candidate only) — RELEASE CORROBORATION read from EXISTING Vision observations, additive to
   the frozen admission (which is not changed). Values are canonical V1_3 values; no new parameter, no new value.
     SLEEVE_VOLUMINOUS_SOFT   sleeve_volume Voluminous in a region whose cloth is Semi-Fluid / Fluid — soft volume that falls away from the body
     SLEEVE_VOLUMINOUS_HELD   sleeve_volume Voluminous in Structured / Semi-Structured cloth — structural volume (diagnostic only; never release)
     SURFACE_LACE · SURFACE_MESH   openwork construction (surface Lace / Mesh) in a Semi-Fluid / Fluid region — the cloth body is perforated
   Semi Transparent / Transparent are optical (see-through), not openwork, and stay inert. Nothing here decides a Direction: the resolver
   consults release_corroboration only in the Regular-fit drape-cloth branch (SR-V2-P5r). Cloth unobserved → nothing is corroborated. */
const DRAPE = ['Semi-Fluid', 'Fluid'], HOLDING = ['Structured', 'Semi-Structured'], OPENWORK_SURFACE = ['Lace', 'Mesh'];
function corroborate(record, pe) { const o = record.observations || {};
  const sv = o.sleeve_volume && o.sleeve_volume.state === 'OBSERVED' ? o.sleeve_volume.value : null;
  const surf = o.surface && o.surface.state === 'OBSERVED' ? (o.surface.values || []).map((v) => v.value) : [];
  pe.regions.forEach((e) => { const sleeveRegion = e.rg === 'upper' || (e.rg === null && pe.region !== 'BOTTOM');
    const drape = e.fabric_observed && DRAPE.includes(e.fabric), holding = e.fabric_observed && HOLDING.includes(e.fabric);
    e.release_corroboration = []; e.volume_held = [];
    if (sleeveRegion && sv === 'Voluminous' && drape) e.release_corroboration.push('SLEEVE_VOLUMINOUS_SOFT');
    if (sleeveRegion && sv === 'Voluminous' && holding) e.volume_held.push('SLEEVE_VOLUMINOUS_HELD');
    if (drape) surf.filter((v) => OPENWORK_SURFACE.includes(v)).forEach((v) => e.release_corroboration.push('SURFACE_' + v.toUpperCase())); });
  return pe; }
/** @returns {{ category, region, regions: [{ rg, ...admitted, release_corroboration, volume_held }] }} */
function productEvidence(record) { return corroborate(record, productEvidenceFrozen(record)); }
function productEvidenceFrozen(record) {
  const id = validateRecord(record);
  const up = B.adapter.adapt(clone(record), 'UPPER'); const reg = up.region;
  if (reg === 'ONE_PIECE') return { category: id.category, region: reg, regions: [fix(Object.assign({ rg: 'upper' }, B.admission.admit(up, 'UPPER'))), fix(Object.assign({ rg: 'lower' }, B.admission.admit(B.adapter.adapt(clone(record), 'LOWER'), 'LOWER')))] };
  if (reg === 'BOTTOM') return { category: id.category, region: reg, regions: [fix(Object.assign({ rg: null }, B.admission.admit(B.adapter.adapt(clone(record), 'LOWER'), 'LOWER')))] };
  return { category: id.category, region: reg, regions: [fix(Object.assign({ rg: null }, B.admission.admit(up, 'UPPER')))] };
}
/** read one observed carrier from the record, region-aware (provenance for the Reason) */
function obsAt(record, param, region) { const o = (record.observations || {})[param]; if (!o) return { path: 'observations.' + param, state: 'MISSING', value: null };
  if (region && o.byRegion && o.byRegion[region]) return { path: 'observations.' + param + '.byRegion.' + region, state: o.byRegion[region].state, value: o.byRegion[region].value };
  if (param === 'material' || param === 'surface') return { path: 'observations.' + param + '.values', state: o.state, value: (o.values || []).map((v) => v.value) };
  return { path: 'observations.' + param, state: o.state, value: o.value }; }
module.exports = { productEvidence, productEvidenceFrozen, validateRecord, obsAt, SRV2TransportError, clone, DRAPE, OPENWORK_SURFACE };
